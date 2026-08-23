"""Stage 3 (Part 2) — Slicing & Labeling.

Pure, repeatable step: reads session logs, rectifies each frame, extracts the 64
square-crops and labels each crop **from the logged FEN** (Stage 2). Simply re-run
when crop parameters change — without re-recording.

The central geometry (`square_to_crop_box`, `warp_board`) is reused from `calibration.py`,
so that Stage 1/3 and the later inference app crop identically.
"""

from __future__ import annotations

import copy
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path

import cv2

from . import config, locks
from .calibration import (
    CalibrationProfile,
    GridMesh,
    board_corners_for_frame,
    crop_border_px,
    load_profile,
    make_tracker,
    mesh_from_lines,
    square_to_crop_box,
    straighten_board,
    warp_board_for_crops,
)
from .imgops import resize_keep_aspect
from .state import GameState
from .work_audit import current as current_work_audit
from .work_audit import measure

_FILES = "abcdefgh"

#: The label ledger, keyed like `judgedKeys` in `platform/app/lib/corrections.ts`.
Corrections = dict[tuple[str, str, str], str]



def _profile_for_session(meta: dict, profile: str | None):
    """Resolve the calibration profile for a session; reconstruct for legacy ingests.

    Older `chesslab ingest` runs built their placeholder profile only in memory and
    never saved it — re-slicing such a session would fail. The warp uses the per-frame
    `corners` from the log anyway, so a reconstructed placeholder is equivalent up to
    the rectified resolution (ingest default board_size=900)."""
    name = profile or meta["profile"]
    try:
        return load_profile(name)
    except FileNotFoundError:
        if meta.get("mode") != "ingested":
            raise
        from .ingest import ingestion_profile

        print(f"[WARN] profile '{name}' missing — reconstructing the ingest placeholder "
              "profile (board_size=900; warp uses per-frame corners).")
        return ingestion_profile(name, board_size=900)

def label_to_fen_char(label: str) -> str | None:
    """Class label -> FEN piece letter ('wP'->'P', 'bN'->'n'); empty/occluded/empty -> None."""
    if not label or label in ("empty", "occluded") or len(label) != 2:
        return None
    return label[1].upper() if label[0] == "w" else label[1].lower()


def labels_to_fen(labels: dict) -> str:
    """64 Per-Square Labels -> FEN Position Part (occluded counts as empty).

    Counterpart to ``config.label_from_piece`` (Piece → Label); here Label → FEN string.
    """
    rows = []
    for rank in range(8, 0, -1):
        run_empty, row = 0, ""
        for f in "abcdefgh":
            ch = label_to_fen_char(labels.get(f"{f}{rank}", "empty"))
            if ch is None:
                run_empty += 1
            else:
                if run_empty:
                    row += str(run_empty); run_empty = 0
                row += ch
        if run_empty:
            row += str(run_empty)
        rows.append(row)
    return "/".join(rows)


#: The crop store's format. PNG cost 23.8 KB per 128 px crop and 12 GB for the corpus; WebP q95
#: costs 2.1 KB, and over 400 crops through `xval-f0-bn80` it moved the softmax by 0.00055 on
#: average and flipped no argmax at all (q92 flipped one, on a crop already at p=0.67). The source
#: is H.264, so this is not the first lossy stage — it is the first cheap one.
CROP_SUFFIX = ".webp"
CROP_ENCODE = [cv2.IMWRITE_WEBP_QUALITY, 95]

# OpenCV's WebP encoder releases the GIL. Measured on 768 real 128 px crops: 1 worker 1.07 s,
# 4 workers 0.36 s, 8 workers 0.23 s; 12/16 no longer improved. Keep the bound explicit so a
# high-core machine does not turn one slice into an unbounded small-file write storm.
SLICE_WRITE_WORKERS = 8

#: How far a cell may sit from its ply interval's settled board and still be trusted
#: (`realgames.settle_for_ply`). At 15 the montage above it holds fingers on squares labelled
#: `empty`, PIECES on squares labelled `empty`, and hands closed around the piece they name; the
#: band just below holds ordinary cells. Measured over the 858 363 cells that reach the corpus: 15
#: costs 5.3 % of them and catches 96.4 % of what the groove sensor independently accuses, where 40
#: costs 1.0 % and catches only 79 %. A human correction outranks it, exactly as with `dirty` — the
#: gate is a doubt, not a verdict.
SETTLE_LIMIT = 15.0

#: How much of a cell the alpha must call BOARD before its deviation means anything. Under it the
#: cell is not "unchanged", it is unseen — and an unseen cell that the coverage does not take out
#: of the loss either is exactly the one a human has to look at.
SETTLE_SEEN_MIN = 0.5


def parse_out_size(s: str) -> tuple[int, int]:
    """'96x128' -> (96, 128) = (W, H)."""
    try:
        w, h = s.lower().split("x")
        return int(w), int(h)
    except Exception as e:  # noqa: BLE001
        raise ValueError(f"invalid out-size {s!r}, expected WxH (e.g. 96x128).") from e


def square_color(square: str) -> str:
    """Deterministic square color: a1=dark. (file_idx + rank_idx) % 2."""
    sq = square.strip().lower()
    file_idx = _FILES.index(sq[0])
    rank_idx = int(sq[1]) - 1
    return "dark" if (file_idx + rank_idx) % 2 == 0 else "light"


def all_squares() -> list[str]:
    return [f"{f}{r}" for r in range(1, 9) for f in _FILES]


def usable_board(entry: dict, profile: CalibrationProfile) -> bool:
    """Whether this row's stored board is the raster [profile] would cut from.

    `crop_square` derives the border from the profile it is HANDED, so a `--pad-side` override cuts
    the stored board at an offset it was never warped with — a silent half-cell error. The row
    carries the two numbers the board was written with, so the mismatch is answerable instead of
    assumed; the frame is then the source, as it was before the store existed.
    """
    if not entry.get("board"):
        return False
    return (entry.get("board_size") == int(profile.board_size)
            and entry.get("board_border") == crop_border_px(profile))


def crop_square(board_warped, square: str, profile: CalibrationProfile, out_size: tuple[int, int]):
    """Extract one square-crop from the **bordered** board (`warp_board_for_crops`).

    `square_to_crop_box` returns the box in board coordinates [0, board_size]; since the data warp
    is offset by `B = crop_border_px(profile)`, the box is shifted by +B into the canvas.
    This ensures edge squares have actual content for their pad_side/pad_up extension. Overhang is
    filled with black (constant geometry across all 64 squares), then scaled losslessly to out_size.

    A plain rectangle, always. The board's own lines are put straight ONCE, on the whole raster
    (`calibration.straighten_board`), so there is nothing left here for a mesh to correct.
    """
    x0, y0, x1, y1 = square_to_crop_box(square, profile, clamp=False)
    b = crop_border_px(profile)
    x0, y0, x1, y1 = x0 + b, y0 + b, x1 + b, y1 + b
    if x1 <= x0:
        x1 = x0 + 1
    if y1 <= y0:
        y1 = y0 + 1
    H, W = board_warped.shape[:2]
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
    region = board_warped[ya:yb, xa:xb]
    pad_t, pad_b, pad_l, pad_r = ya - y0, y1 - yb, xa - x0, x1 - xb
    if pad_t or pad_b or pad_l or pad_r:       # fill overhanging areas with black
        region = cv2.copyMakeBorder(region, pad_t, pad_b, pad_l, pad_r,
                                    cv2.BORDER_CONSTANT, value=(0, 0, 0))
    return resize_keep_aspect(region, out_size)


def crops_for_frame(frame, corners, profile: CalibrationProfile, *,
                    out_size: tuple[int, int] | None = None,
                    mesh: GridMesh | None = None,
                    board=None):
    """64 Crops (order `all_squares()`) for ONE frame — IDENTICAL to the training slice.
    Single Source for live inference so the model sees exactly the same crop live as during
    training.

    `mesh`: the frame's measured grid lines. The warp is pulled straight through them ONCE, as a
    whole raster — the cut itself stays a plain rectangle. A stored board arrives straight already
    (`realgames.straighten_boards`) and must be handed no mesh, or it would be corrected twice.
    `board`: the stored warp (`realgames.write_board`) instead of warping [frame], which may
    then be None.
    """
    out = tuple(out_size) if out_size else tuple(profile.crop.out_size)
    warped = board if board is not None else warp_board_for_crops(frame, profile, corners)
    if mesh is not None:
        warped = straighten_board(warped, mesh, profile.board_size, crop_border_px(profile))
    return [crop_square(warped, square, profile, out) for square in all_squares()]


def read_session_meta(session_dir: Path) -> dict:
    import yaml

    p = session_dir / "session.yaml"
    if not p.exists():
        raise FileNotFoundError(f"session.yaml missing in {session_dir}")
    with p.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def read_log(session_dir: Path) -> list[dict]:
    from .ioutil import read_jsonl

    p = session_dir / "log.jsonl"
    if not p.exists():
        raise FileNotFoundError(f"log.jsonl missing in {session_dir}")
    return read_jsonl(p)


def effective_profile(profile: CalibrationProfile, pad_up, pad_side) -> CalibrationProfile:
    """A COPY of `profile` with the pads overridden — the one way to cut at a box the profile
    does not hold. Used by `slice --pad-side` and by serving, where the pads belong to the MODEL
    (`serving.crops_for_model`, specs/45)."""
    prof = copy.deepcopy(profile)
    if pad_up is not None:
        prof.crop.pad_up = float(pad_up)
    if pad_side is not None:
        prof.crop.pad_side = float(pad_side)
    return prof


def _replace_sessions_in_manifest(manifest_path: Path, replacements: dict[str, list[str]],
                                  field: str = "session_id") -> None:
    """Atomically replace several sessions with one streaming manifest transaction.

    `field` is what identifies "this session" in the manifest: the composite cuts one clip into
    several pseudo-sessions that share a `split_group`, and replacing by `session_id` would leave
    the clip's other blocks behind.
    """
    if not replacements:
        return
    before_bytes = manifest_path.stat().st_size if manifest_path.exists() else 0
    with measure("full manifest rewrites", (manifest_path.resolve(), field),
                 processed_bytes=before_bytes):
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = manifest_path.with_suffix(manifest_path.suffix + ".tmp")
        with tmp.open("w", encoding="utf-8", newline="\n") as dst:
            if manifest_path.exists():
                with manifest_path.open(encoding="utf-8") as src:
                    for line in src:
                        if line.strip() and json.loads(line).get(field) not in replacements:
                            dst.write(line if line.endswith("\n") else line + "\n")
            for lines in replacements.values():
                for line in lines:
                    dst.write(line + "\n")
        os.replace(tmp, manifest_path)


def _replace_session_in_manifest(manifest_path: Path, session_id: str, new_lines: list[str],
                                 field: str = "session_id") -> None:
    """Single-session compatibility wrapper around the batched transaction."""
    _replace_sessions_in_manifest(manifest_path, {session_id: new_lines}, field)


def _fen_labels(fen: str, squares: tuple[str, ...], cache: dict[str, tuple[str, ...]]) -> tuple[str, ...]:
    labels = cache.get(fen)
    if labels is not None:
        return labels
    with measure("FEN label expansions", fen):
        game = GameState(fen)
        labels = tuple(game.label_for(square) for square in squares)
    cache[fen] = labels
    return labels


def _read_slice_image(path: Path):
    try:
        st = path.stat()
        key = (path.resolve(), st.st_mtime_ns, st.st_size)
        size = st.st_size
    except OSError:
        key, size = path.resolve(), 0
    with measure("slice image decodes", key, processed_bytes=size):
        return cv2.imread(str(path))


def _write_crop(path: Path, crop) -> tuple[bool, float]:
    started = time.perf_counter()
    ok = bool(cv2.imwrite(str(path), crop, CROP_ENCODE))
    return ok, time.perf_counter() - started


def load_corrections(path: Path, into: Corrections | None = None) -> Corrections:
    """The human verdict per `(session_id, frame, square)`, last line winning. A `retract: true`
    row (CONCEPT.md 4.2.2) is a tombstone that reopens the cell instead of deciding it.

    `into` folds several ledgers in order, so a later file can retract an earlier file's verdict.
    """
    out = {} if into is None else into
    p = Path(path)
    if not p.exists():
        return out
    for line in p.read_text(encoding="utf-8-sig").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        key = (row["session_id"], str(row["frame"]), row["square"])
        if row.get("retract") is True:
            out.pop(key, None)
        else:
            out[key] = row["label"]
    return out


#: A square this covered is no longer a piece example (`training/occlusion.PIECE_VISIBLE_MAX`),
#: so a frame carrying one is as dirty as one the tracker flagged — whatever the log says.
MATTE_DIRTY = 0.15


def read_corrections(session_dir: Path) -> dict[tuple[str, str, str], str]:
    """The recording's own hand corrections, empty when it has none.

    Beside `matte.jsonl` and read the same way: a recording carries everything that is only about
    it. Every row here is an identity — `occluded` stopped being a label when the scheme went to
    13 + coverage, and the writer refuses it (`platform/app/lib/corrections.ts`).
    """
    return load_corrections(Path(session_dir) / "corrections.jsonl")


def read_matte(session_dir: Path) -> dict[str, dict[str, float]]:
    """`frame stem -> square -> coverage` from `matte.jsonl`, empty when the session has none.

    The mattes are written per frame (`chesslab occluders matte-session`); a quiet frame simply
    has no entry, and 0.0 is then the right answer rather than a missing one.
    """
    from .ioutil import read_jsonl

    path = Path(session_dir) / "matte.jsonl"
    if not path.exists():
        return {}
    return {r["frame"]: r["coverage"] for r in read_jsonl(path) if r.get("coverage")}


def _slice_session(
    session_dir: Path,
    *,
    profile: CalibrationProfile,
    manifest_path: Path,
    squares_root: Path,
    write_pool: ThreadPoolExecutor,
    pad_up: float | None = None,
    pad_side: float | None = None,
    out_size: tuple[int, int] | None = None,
    manifest_batch: dict[str, list[str]] | None = None,
) -> dict:
    """Slice one session: 64 crops per logged position + manifest lines. Pure I/O.

    The recording's own `corrections.jsonl` replaces the FEN-derived label per square. Returns the
    number applied. A correction is also the only way a cell of a `dirty` frame reaches the pool
    at all — see the loop below.
    """
    session_dir = Path(session_dir)
    meta = read_session_meta(session_dir)
    session_id = meta["session_id"]
    log = read_log(session_dir)

    matte = read_matte(session_dir)
    label_overrides = read_corrections(session_dir)
    prof = effective_profile(profile, pad_up, pad_side)
    out = tuple(out_size) if out_size else tuple(prof.crop.out_size)

    new_lines: list[str] = []
    n_crops = 0
    n_overrides = 0
    n_skipped = 0
    #: Cells dropped because the FEN lags there and no human ruled on them (`unknown_squares`).
    n_unknown = 0
    #: Cells dropped because a hand was in the frame and no human ruled on them (`dirty`).
    n_dirty = 0
    #: Cells whose pixels left the position they are labelled with (`realgames.departures`).
    n_unsettled = 0
    n_unusable = 0
    n_mesh = 0       # frames straightened HERE, i.e. warped from a frame rather than a store
    n_bowed = 0      # stored boards nobody pulled straight — the barrel goes into these crops
    tracker = make_tracker(prof)   # per session: seeded from profile, markers held per frame
    squares = tuple(all_squares())
    fen_cache: dict[str, tuple[str, ...]] = {}
    out_dirs: dict[str, Path] = {}
    for entry in log:
        if entry.get("unusable"):
            n_unusable += 1
            continue
        # The stored board is the rectified frame under this row's own quad, so cutting from it is
        # the same operation minus the warp — and it is what the label view shows, which is the
        # point. The source frame is only read when there is no board; it is no longer kept on
        # disk for sessions that carry one.
        board_path = session_dir / entry["board"] if usable_board(entry, prof) else None
        board = _read_slice_image(board_path) if board_path is not None else None
        frame = None
        if board is None:
            frame_path = session_dir / entry["frame"]
            frame = _read_slice_image(frame_path)
            if frame is None:
                raise FileNotFoundError(
                    f"Neither board nor frame readable: {frame_path}"
                    + ("" if entry.get("board") else " — run `chesslab session boards` for this session"))
        corners = entry.get("corners")
        if not corners:
            # Fallback (sessions without saved corners): per frame from the markers.
            corners = board_corners_for_frame(frame, prof, tracker)
            if corners is None:
                n_skipped += 1   # no markers in frame -> not usable, skip
                continue

        # A stored board arrives straight (`realgames.straighten_boards`); only a session that
        # still has to be warped from its frame carries its own lines here.
        mesh = None if board is not None else mesh_from_lines(entry.get("grid_lines"))
        n_mesh += mesh is not None
        n_bowed += board is not None and not entry.get("board_straightened")
        # crops_for_frame as single source (Rework 01: de-duplication).
        with measure("slice board crop batches", (session_id, Path(entry["frame"]).stem),
                     processed_bytes=(board.nbytes if board is not None else frame.nbytes)):
            crops = crops_for_frame(frame, corners, prof, out_size=out, mesh=mesh, board=board)

        explicit = entry.get("labels")          # Inference/Active-Learning: explicit 64 labels
        labels = None if explicit else _fen_labels(entry["fen"], squares, fen_cache)
        # Vom Renderer/Ingest verdeckte Felder → `occluded` (überschreibt das FEN-Figur-Label).
        occluded_set = set(entry.get("occluded_squares") or ())
        # Neither label is true for these, so no crop is written at all.
        ambiguous_set = set(entry.get("ambiguous_squares") or ())
        # The FEN LAGS on these: the exporter measured that the piece had visibly moved before its
        # commit, so this row's `fen` describes a position the pixels have already left (measured
        # 2026-08-09 on VID_20260726_233432: up to 4.6 s, a third of changed squares beyond the
        # quiet margin). Until 2026-08-09 nothing here read the field and every one of those crops
        # went into training under the stale label — silently, and always the same wrong label on
        # the same square, which is the shape a model learns rather than averages away.
        #
        # A HUMAN correction outranks the doubt: the between-commit window is exactly where the
        # hands are, so it is the richest `occluded` material there is, and a person saying
        # "occluded" (or naming the piece) knows something the FEN does not. Only the cells nobody
        # ruled on are dropped.
        unknown_set = set(entry.get("unknown_squares") or ())
        # A hand in the frame means a MOVE is being made, and the FEN only catches up at the
        # commit — so every cell of the frame is suspect, not just the ones under the hand.
        # A dirty frame therefore contributes exactly what a human named on it and nothing else.
        # `carried` counts as dirty: the mesh is a neighbour's because THIS frame's grooves were
        # unreadable, and measured over 2 228 frames that is a hand 94.5 % of the time.
        dirty = bool(entry.get("dirty")) or entry.get("grid_lines_source") == "carried"
        # `session settle-scan` measured this row against its own ply interval's settled board.
        # A row from too short an interval carries neither, and then no gate below fires — which
        # is the same state as a session that predates the scan.
        settle = entry.get("settle_dev") or ()
        #: The squares whose pixels LEFT that position and stayed away. The INTERVAL decided this,
        #: with the time axis one frame does not have — a shadow passes, a move stays.
        left = set(entry.get("settle_left") or ())
        frame_stem = Path(entry["frame"]).stem  # '0007'
        cover = matte.get(frame_stem, {})
        # With a settle measurement the frame's CLASS stops deciding and the cell does: a covered
        # cell is the occlusion target, every other one is read against the interval's settled
        # board. Without one, an `occluded` frame is still rescued whole — its matte says how much
        # of each square is hidden, and coverage 0.0 under a hand would be a lie.
        if settle and cover:
            dirty = False
        elif entry.get("dirty_reason") == "occluded" and cover:
            dirty = False
        elif any(v > MATTE_DIRTY for v in cover.values()):
            dirty = True
        write_started = time.perf_counter()
        write_jobs = []
        write_bytes = 0
        for i, square in enumerate(squares):
            if square in ambiguous_set:
                continue
            corrected = (
                label_overrides.get((session_id, frame_stem, square)) if label_overrides else None
            )
            if square in unknown_set and corrected is None:
                n_unknown += 1
                continue
            if dirty and corrected is None:
                n_dirty += 1
                continue
            if square in left and corrected is None:
                n_unsettled += 1
                continue
            label = explicit.get(square, "empty") if explicit else labels[i]
            if square in occluded_set:
                label = "occluded"
            if corrected is not None and corrected != label:
                label = corrected
                n_overrides += 1
            crop = crops[i]
            out_dir = out_dirs.get(label)
            if out_dir is None:
                out_dir = out_dirs[label] = squares_root / label
                out_dir.mkdir(parents=True, exist_ok=True)
            fname = f"{session_id}_{frame_stem}_{square}{CROP_SUFFIX}"
            crop_path = out_dir / fname
            future = write_pool.submit(_write_crop, crop_path, crop)
            write_jobs.append((future, crop_path, crop.nbytes))
            write_bytes += crop.nbytes
            row = {
                "path": str(crop_path.as_posix()),
                "label": label,
                "session_id": session_id,
                "frame": frame_stem,
                "ply": entry.get("ply"),
                "square": square,
                "square_color": square_color(square),
                "fen": entry["fen"],
                "out_size": [out[0], out[1]],
                # WHAT IS IN THE PICTURE, not just how large it is. `out_size` says the crop is
                # 128 px; only the pads say whether those 128 px hold 1.10 or 1.20 of a cell —
                # i.e. whether a model trained on this row may be served that box. A row that
                # does not carry them cannot be reconciled with anything later: the profile it
                # was cut with is mutable and is not stamped anywhere else (specs/45).
                "pad_side": float(prof.crop.pad_side),
                "pad_up": float(prof.crop.pad_up),
                "ts": datetime.now(UTC).isoformat(),
            }
            if matte:
                # The second training target, from a real hand instead of a composited one. Only
                # written where mattes exist, so no manifest changes shape behind anyone's back.
                row["coverage"] = matte.get(frame_stem, {}).get(square, 0.0)
            new_lines.append(json.dumps(row, ensure_ascii=False))
            n_crops += 1
        results = [(future.result(), path, size) for future, path, size in write_jobs]
        if not all(result[0] for result, _path, _size in results):
            raise OSError(f"OpenCV failed to write one or more crops for {session_id}/{frame_stem}")
        audit = current_work_audit()
        if audit is not None:
            key = (session_id, frame_stem)
            audit.record_work("WebP crop batches", key,
                              seconds=time.perf_counter() - write_started,
                              processed_bytes=write_bytes)
            audit.record_work("WebP encoding CPU", key,
                              seconds=sum(result[1] for result, _path, _size in results),
                              processed_bytes=write_bytes)

    if manifest_batch is None:
        _replace_session_in_manifest(manifest_path, session_id, new_lines)
    else:
        manifest_batch[session_id] = new_lines
    return {"session_id": session_id, "frames": len(log), "crops": n_crops,
            "overrides": n_overrides, "skipped": n_skipped, "unusable": n_unusable,
            "unknown_dropped": n_unknown, "dirty_dropped": n_dirty,
            "unsettled_dropped": n_unsettled, "mesh_frames": n_mesh, "bowed_boards": n_bowed}


def slice_session(
    session_dir: Path,
    *,
    profile: CalibrationProfile,
    manifest_path: Path,
    squares_root: Path,
    pad_up: float | None = None,
    pad_side: float | None = None,
    out_size: tuple[int, int] | None = None,
    manifest_batch: dict[str, list[str]] | None = None,
    write_pool: ThreadPoolExecutor | None = None,
) -> dict:
    """Slice one session, owning the WebP worker pool unless a run-scoped pool is supplied."""
    if write_pool is not None:
        return _slice_session(
            session_dir, profile=profile, manifest_path=manifest_path,
            squares_root=squares_root, write_pool=write_pool, pad_up=pad_up,
            pad_side=pad_side, out_size=out_size, manifest_batch=manifest_batch,
        )
    with ThreadPoolExecutor(
        max_workers=SLICE_WRITE_WORKERS, thread_name_prefix="slice-webp"
    ) as owned_pool:
        return _slice_session(
            session_dir, profile=profile, manifest_path=manifest_path,
            squares_root=squares_root, write_pool=owned_pool, pad_up=pad_up,
            pad_side=pad_side, out_size=out_size, manifest_batch=manifest_batch,
        )


# --- CLI layer (resolves defaults from config) ---------------------------------------------

def _session_ids_with_logs() -> list[str]:
    from .sessions import all_sessions

    return [sid for sid, _ in all_sessions()]


def variant_paths(variant_tag: str | None) -> tuple[Path, Path]:
    """(manifest_path, crop_pool) for a variant. `None` = current default paths; otherwise
    `data/crops/<tag>/manifest.jsonl` inside the pool it describes, so variants coexist."""
    if not variant_tag:
        return config.DATA.crop_pool / "manifest.jsonl", config.DATA.crop_pool
    pool = config.DATA.crops / variant_tag
    return pool / "manifest.jsonl", pool


def run_slice(
    session: str | None = None,
    slice_all: bool = False,
    profile: str | None = None,
    pad_up: float | None = None,
    pad_side: float | None = None,
    out_size: str | None = None,
    preview: str | None = None,
    variant_tag: str | None = None,
) -> int:
    try:
        out_size_t = parse_out_size(out_size) if out_size else None
    except ValueError as e:
        print(f"[FAIL] {e}")
        return 1

    if preview:
        try:
            return _preview_session(preview, profile)
        except Exception as e:  # noqa: BLE001
            print(f"[FAIL] {preview}: {e}")
            return 1

    if slice_all:
        sids = _session_ids_with_logs()
    elif session:
        sids = [session]
    else:
        print("[FAIL] specify --session <id> or --all.")
        return 1
    if not sids:
        print("No sessions with log.jsonl found.")
        return 0

    manifest_path, squares_root = variant_paths(variant_tag)
    rc = 0
    from .sessions import session_dir as _resolve

    try:
        with locks.pool_lock(squares_root, f"slice {len(sids)} session(s)"):
            manifest_batch: dict[str, list[str]] = {}
            try:
                with ThreadPoolExecutor(
                    max_workers=SLICE_WRITE_WORKERS, thread_name_prefix="slice-webp"
                ) as write_pool:
                    for sid in sids:
                        try:
                            session_dir, _ = _resolve(sid)
                            meta = read_session_meta(session_dir)
                            prof = _profile_for_session(meta, profile)
                            stats = slice_session(
                                session_dir, profile=prof, manifest_path=manifest_path,
                                squares_root=squares_root, pad_up=pad_up, pad_side=pad_side,
                                out_size=out_size_t, manifest_batch=manifest_batch,
                                write_pool=write_pool,
                            )
                            extra = (f" ({stats['overrides']} corrections)"
                                     if stats.get("overrides") else "")
                            if stats.get("skipped"):
                                extra += f" [{stats['skipped']} frames without markers skipped]"
                            if stats.get("mesh_frames"):
                                extra += (f" [{stats['mesh_frames']} frames straightened here, "
                                          "no stored board]")
                            # Loud, because nothing in a crop says whether its board was pulled straight.
                            if stats.get("bowed_boards"):
                                extra += (f" [WARNUNG: {stats['bowed_boards']} Bretter NICHT "
                                          f"geradegezogen — `chesslab session straighten {sid}`]")
                            if stats.get("dirty_dropped"):
                                extra += (f" [{stats['dirty_dropped']} cells held back on dirty "
                                          "frames]")
                            if stats.get("unsettled_dropped"):
                                extra += (f" [{stats['unsettled_dropped']} cells held back as "
                                          "unsettled]")
                            print(f"[OK] {sid}: {stats['frames']} Frames -> "
                                  f"{stats['crops']} Crops{extra}.")
                        except Exception as e:  # noqa: BLE001
                            print(f"[FAIL] {sid}: {e}")
                            rc = 1
            finally:
                # KeyboardInterrupt is a BaseException and bypasses the per-session handler.
                # Publish every fully completed session before propagating it to the CLI.
                _replace_sessions_in_manifest(manifest_path, manifest_batch)
    except RuntimeError as e:
        print(f"[FAIL] {e}")
        return 1
    return rc


def _preview_session(session_id: str, profile: str | None) -> int:
    """Debug: slice the first position and show label vs. visible crop side by side."""
    from .sessions import session_dir as _resolve

    session_dir, _ = _resolve(session_id)
    try:
        meta = read_session_meta(session_dir)
        prof = _profile_for_session(meta, profile)
        log = read_log(session_dir)
    except Exception as e:  # noqa: BLE001
        print(f"[FAIL] {e}")
        return 1
    if not log:
        print("[FAIL] empty log.")
        return 1
    frame = cv2.imread(str(session_dir / log[0]["frame"]))
    corners = log[0].get("corners") or board_corners_for_frame(frame, prof, make_tracker(prof))
    if corners is None:
        print("[FAIL] no markers detected in the frame.")
        return 1
    warped = warp_board_for_crops(frame, prof, corners)   # same bordered crop path as slice
    gs = GameState(log[0]["fen"])
    out = tuple(prof.crop.out_size)
    cols = []
    import numpy as np

    for square in ("a8", "e1", "d8", "h1"):
        crop = crop_square(warped, square, prof, out)
        canvas = np.zeros((out[1] + 24, out[0], 3), dtype=np.uint8)
        canvas[:out[1]] = crop
        cv2.putText(canvas, f"{square}:{gs.label_for(square)}", (2, out[1] + 16),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1, cv2.LINE_AA)
        cols.append(canvas)
    cv2.imshow("chesslab slice --preview (q closes)", np.hstack(cols))
    while (cv2.waitKey(20) & 0xFF) != ord("q"):
        pass
    cv2.destroyAllWindows()
    return 0
