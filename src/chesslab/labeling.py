"""Stage 3 — slicing & labeling: rectify each logged frame, cut 64 crops, label them from the FEN.

The geometry comes from `calibration.py`, so slice and inference crop identically.
"""

from __future__ import annotations

import copy
import json
import os
import time
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import cv2

from . import config, locks, provenance
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
from .cell_rule import PIECE_VISIBLE_MAX
from .imgops import resize_keep_aspect
from .ioutil import mtime_size, read_jsonl
from .session_store.log import read_log_rows
from .session_store.matte import read_matte
from .session_store.matte import read_rows as read_matte_rows
from .session_store.names import (
    CORRECTIONS_FILE,
    corrections_path,
    log_path,
    matte_path,
    unusable_cells_path,
)
from .session_store.paths import read_session_meta
from .state import GameState
from .work_audit import current as current_work_audit
from .work_audit import measure

_FILES = "abcdefgh"

#: The label ledger, keyed like `judgedKeys` in `platform/app/lib/corrections.ts`.
Corrections = dict[tuple[str, str, str], str]



def _profile_for_session(meta: dict, profile: str | None):
    return load_profile(profile or meta["profile"])

def label_to_fen_char(label: str) -> str | None:
    """Class label -> FEN piece letter ('wP'->'P', 'bN'->'n'); empty/occluded -> None."""
    if not label or label in ("empty", "occluded") or len(label) != 2:
        return None
    return label[1].upper() if label[0] == "w" else label[1].lower()


def labels_to_fen(labels: dict) -> str:
    """64 per-square labels -> FEN placement field (occluded counts as empty)."""
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


#: PNG cost 23.8 KB per crop, WebP q95 2.1 KB; over 400 crops it moved the softmax by 0.00055 and
#: flipped no argmax. The source is H.264 anyway.
CROP_SUFFIX = ".webp"
CROP_ENCODE = [cv2.IMWRITE_WEBP_QUALITY, 95]

# OpenCV's WebP encoder releases the GIL: 1 worker 1.07 s, 8 workers 0.23 s per 768 crops; more did
# not help.
SLICE_WRITE_WORKERS = 8

#: How far a cell may sit from its interval's settled board and still be trusted. 15 dropped 2 999
#: ordinary cells; above 45, 24 of 24 samples were hands. A human correction outranks it.
SETTLE_LIMIT = 45.0

#: How much of a cell the alpha must call BOARD before its deviation means anything; below it the
#: cell is unseen, not unchanged.
SETTLE_SEEN_MIN = 0.5


def parse_out_size(s: str) -> tuple[int, int]:
    """'96x128' -> (96, 128) = (W, H)."""
    try:
        w, h = s.lower().split("x")
        return int(w), int(h)
    except Exception as e:  # noqa: BLE001
        raise ValueError(f"invalid out-size {s!r}, expected WxH (e.g. 96x128).") from e


def square_color(square: str) -> str:
    """Deterministic square color: a1=dark."""
    sq = square.strip().lower()
    file_idx = _FILES.index(sq[0])
    rank_idx = int(sq[1]) - 1
    return "dark" if (file_idx + rank_idx) % 2 == 0 else "light"


def all_squares() -> list[str]:
    return [f"{f}{r}" for r in range(1, 9) for f in _FILES]


def usable_board(entry: dict, profile: CalibrationProfile) -> bool:
    """Whether this row's stored board is the raster [profile] would cut from; a `--pad-side`
    override would cut it at a border it was never warped with. Otherwise the frame is the
    source.
    """
    if not entry.get("board"):
        return False
    return (entry.get("board_size") == int(profile.board_size)
            and entry.get("board_border") == crop_border_px(profile))


def board_source(entry: dict, profile: CalibrationProfile) -> tuple[str, bool]:
    """Welche Datei die Crops liefert, und ob sie schon das fertige Brett ist. Ein Frame ist kein
    entzerrtes Brett — zwei Skripte hatten ihn als `board=` durchgereicht.
    """
    stored = usable_board(entry, profile)
    return (entry["board"] if stored else entry["frame"]), stored


def crop_square(board_warped, square: str, profile: CalibrationProfile, out_size: tuple[int, int]):
    """Extract one square crop from the bordered board (`warp_board_for_crops`), box shifted by +B.

    Overhang is filled black, then scaled to out_size. A plain rectangle: the board was
    straightened once.
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
    if pad_t or pad_b or pad_l or pad_r:
        region = cv2.copyMakeBorder(region, pad_t, pad_b, pad_l, pad_r,
                                    cv2.BORDER_CONSTANT, value=(0, 0, 0))
    return resize_keep_aspect(region, out_size)


def crops_for_frame(frame, corners, profile: CalibrationProfile, *,
                    out_size: tuple[int, int] | None = None,
                    mesh: GridMesh | None = None,
                    board=None,
                    flat_cells=None,
                    squares=None):
    """64 crops (order `all_squares()`) for ONE frame — IDENTICAL to the training slice.

    `mesh` straightens the warp once; a stored `board` is already straight and must get no mesh.
    `flat_cells` wird VOR dem Zuschnitt herausgerechnet.
    """
    out = tuple(out_size) if out_size else tuple(profile.crop.out_size)
    warped = board if board is not None else warp_board_for_crops(frame, profile, corners)
    if mesh is not None:
        warped = straighten_board(warped, mesh, profile.board_size, crop_border_px(profile))
    if flat_cells is not None:
        from .imgops import flat_field

        warped = flat_field(warped, int(profile.board_size), crop_border_px(profile), flat_cells)
    return [crop_square(warped, square, profile, out)
            for square in (all_squares() if squares is None else squares)]


def effective_profile(profile: CalibrationProfile, pad_side) -> CalibrationProfile:
    """A COPY of `profile` with the pad overridden, for when the pad belongs to the MODEL
    (specs/45).
    """
    prof = copy.deepcopy(profile)
    if pad_side is not None:
        prof.crop.pad_side = float(pad_side)
    return prof


def _replace_sessions_in_manifest(manifest_path: Path, replacements: dict[str, list[str]],
                                  field: str = "session_id") -> None:
    """Atomically replace several sessions with one streaming manifest transaction. `field`:
    composites share a `split_group` across pseudo-sessions.
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
                # Dieselbe Politik wie `read_jsonl`: `utf-8-sig` gegen PowerShells BOM, halbe letzte
                # Zeile faellt weg.
                with manifest_path.open(encoding="utf-8-sig") as src:
                    for line in src:
                        if not line.strip():
                            continue
                        try:
                            keep = json.loads(line).get(field) not in replacements
                        except ValueError:
                            if line.endswith("\n"):
                                raise
                            break
                        if keep:
                            dst.write(line if line.endswith("\n") else line + "\n")
            for lines in replacements.values():
                for line in lines:
                    dst.write(line + "\n")
        os.replace(tmp, manifest_path)


def _replace_session_in_manifest(manifest_path: Path, session_id: str, new_lines: list[str],
                                 field: str = "session_id") -> None:
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
        version = mtime_size(path)
        key = (path.resolve(), *version)
        size = version[1]
    except OSError:
        key, size = path.resolve(), 0
    with measure("slice image decodes", key, processed_bytes=size):
        return cv2.imread(str(path))


def _write_crop(path: Path, crop) -> tuple[bool, float]:
    started = time.perf_counter()
    ok = bool(cv2.imwrite(str(path), crop, CROP_ENCODE))
    return ok, time.perf_counter() - started


def load_corrections(path: Path, into: Corrections | None = None) -> Corrections:
    """The human verdict per `(session_id, frame, square)`, last line winning; `retract: true`
    reopens the cell. `into` folds several ledgers in order.
    """
    out = {} if into is None else into
    p = Path(path)
    if not p.exists():
        return out
    for row in read_jsonl(p):
        key = (row["session_id"], str(row["frame"]), row["square"])
        if row.get("retract") is True:
            out.pop(key, None)
        else:
            out[key] = row["label"]
    return out


#: A square this covered is no longer a piece example, so its frame is dirty whatever the log says.
MATTE_DIRTY = PIECE_VISIBLE_MAX


def frame_dirty(entry: dict, cover: dict[str, float]) -> bool:
    """Ob der Slice von diesem Frame nur die korrigierten Zellen nimmt; `cover` ist seine Matte.

    Ein geliehenes Mesh (`carried`) zaehlt als Hand. Mit `settle_dev` entscheidet die ZELLE, nicht
    die Frame-Klasse; ohne rettet die Matte ein `occluded`-Frame ganz. Die Web-Lane fragt dasselbe.
    """
    if (entry.get("settle_dev") or ()) and cover:
        return False
    if entry.get("dirty_reason") == "occluded" and cover:
        return False
    if any(v > MATTE_DIRTY for v in cover.values()):
        return True
    return bool(entry.get("dirty")) or entry.get("grid_lines_source") == "carried"


def ledger_paths(name: str = CORRECTIONS_FILE, paths=None) -> list[Path]:
    """Jedes Ledger dieses Namens, auch das einer GEPARKTEN Aufnahme: ihre Zeilen stecken weiter in
    gebauten Datensaetzen.
    """
    from . import config

    paths = paths or config.DATA
    out = []
    for root in (paths.recordings, paths.sessions, paths.sessions_archive):
        if root.exists():
            out += sorted(root.glob(f"*/{name}"))
    return out


def read_corrections(session_dir: Path) -> dict[tuple[str, str, str], str]:
    """The recording's own hand corrections, empty when it has none. Every row is an identity."""
    return load_corrections(corrections_path(session_dir))


def read_unusable_cells(session_dir: Path) -> set[tuple[str, str, str]]:
    """`unusable-cells.jsonl`: Zellen ohne holbares Label (Glanz, Schmier). Eigenes Ledger, gelesen
    wie jedes: letzte Zeile gewinnt, `unusable: false` nimmt zurueck.
    """
    path = unusable_cells_path(session_dir)
    if not path.exists():
        return set()
    out: set[tuple[str, str, str]] = set()
    for row in read_jsonl(path):
        key = (row["session_id"], str(row["frame"]), row["square"])
        if row.get("unusable") is False:
            out.discard(key)
        else:
            out.add(key)
    return out


def clean_frames(session_dir: Path) -> set[str]:
    """Die Stems, deren Coverage GEMESSEN null ist. SAMs Absage ist eine Luecke, kein Null; `dirty`
    und ein geliehenes Mesh (`carried`, zu 94,5 % eine Hand) ebenso.
    """
    from .ioutil import read_jsonl

    log = log_path(session_dir)
    if not log.is_file():
        return set()
    hat_zeile = {str(row.get("frame")) for row in read_matte_rows(session_dir)}
    return {Path(str(row.get("frame"))).stem for row in read_jsonl(log)
            if not row.get("dirty_reason") and not row.get("dirty")
            and row.get("grid_lines_source") != "carried"
            and Path(str(row.get("frame"))).stem not in hat_zeile}


def _session_flat_cells(session_dir: Path, log: list[dict], prof: CalibrationProfile,
                        n: int = 24):
    """EINE Beleuchtungskarte je Session, Median ueber saubere Frames: je Frame schwankte sie mit
    der Stellung um bis zu 79 %.
    """
    import numpy as np

    from .imgops import cell_illumination

    clean = [e for e in log
             if not e.get("unusable") and not e.get("dirty") and usable_board(e, prof)]
    if not clean:
        return None
    maps = []
    for entry in clean[:: max(1, len(clean) // n)][:n]:
        board = _read_slice_image(session_dir / entry["board"])
        if board is not None:
            maps.append(cell_illumination(board, int(prof.board_size), crop_border_px(prof)))
    return np.median(np.stack(maps), axis=0) if maps else None


def iter_session_crops(
    session_dir: Path,
    *,
    profile: CalibrationProfile,
    pad_side: float | None = None,
    out_size: tuple[int, int] | None = None,
    flat_field: bool = False,
    stats: dict | None = None,
) -> Iterator[tuple[Any, dict]]:
    """Every crop a slice of this session holds, as `(crop BGR uint8, manifest row)`; the consumer
    names `row["path"]`. `corrections.jsonl` overrides the FEN label and is the only way into a
    dirty frame.
    """
    session_dir = Path(session_dir)
    meta = read_session_meta(session_dir)
    session_id = meta["session_id"]
    log = read_log_rows(session_dir)

    matte = read_matte(session_dir)
    # Gemessen NULL ist nicht ungemessen: sonst las `classification_eligible` auch SAMs Absage ueber
    # `or 0.0` als sichtbar.
    clean = clean_frames(session_dir)
    label_overrides = read_corrections(session_dir)
    unlabelable = read_unusable_cells(session_dir)
    prof = effective_profile(profile, pad_side)
    out = tuple(out_size) if out_size else tuple(prof.crop.out_size)

    n_crops = 0
    n_overrides = 0
    n_skipped = 0
    #: Cells dropped because the FEN lags there and no human ruled on them (`unknown_squares`).
    n_unknown = 0
    #: Cells dropped because a hand was in the frame and no human ruled on them (`dirty`).
    n_dirty = 0
    #: Cells whose pixels left the position they are labelled with (`realgames.position.departures`).
    n_unsettled = 0
    n_unusable = 0
    #: Cells a human called unlabelable (`unusable-cells.jsonl`) — never a manifest row.
    n_unusable_cells = 0
    n_mesh = 0       # frames straightened HERE, i.e. warped from a frame rather than a store
    n_bowed = 0      # stored boards nobody pulled straight — the barrel goes into these crops
    tracker = make_tracker(prof)
    squares = tuple(all_squares())
    fen_cache: dict[str, tuple[str, ...]] = {}
    flat_cells = _session_flat_cells(session_dir, log, prof) if flat_field else None
    for entry in log:
        if entry.get("unusable"):
            n_unusable += 1
            continue
        # Cutting from the stored board is the same operation minus the warp, and it is what the
        # label view shows. The source frame is only read without one.
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
        if not corners and board is None:
            # Fallback for sessions without saved corners: per frame from the markers.
            corners = board_corners_for_frame(frame, prof, tracker)
            if corners is None:
                n_skipped += 1
                continue

        # A stored board arrives straight; only a frame-warped session carries its lines here.
        mesh = None if board is not None else mesh_from_lines(entry.get("grid_lines"))
        n_mesh += mesh is not None
        n_bowed += board is not None and not entry.get("board_straightened")
        with measure("slice board crop batches", (session_id, Path(entry["frame"]).stem),
                     processed_bytes=(board.nbytes if board is not None else frame.nbytes)):
            crops = crops_for_frame(frame, corners, prof, out_size=out, mesh=mesh,
                                    board=board, flat_cells=flat_cells)

        explicit = entry.get("labels")
        labels = None if explicit else _fen_labels(entry["fen"], squares, fen_cache)
        # Vom Renderer/Ingest verdeckte Felder -> `occluded`, ueber dem FEN-Label.
        occluded_set = set(entry.get("occluded_squares") or ())
        # Neither label is true for these, so no crop is written at all.
        ambiguous_set = set(entry.get("ambiguous_squares") or ())
        # The FEN LAGS on these (the piece visibly moved up to 4.6 s before its commit): always the
        # same wrong label on the same square, which a model learns. A HUMAN correction outranks the
        # doubt.
        unknown_set = set(entry.get("unknown_squares") or ())
        # A hand in the frame means a move is being made, so every cell is suspect: a dirty frame
        # yields only what a human named. `carried` counts as dirty (94.5 % hands).
        #: The squares whose pixels LEFT that position and stayed away — the interval's time axis
        #: decides.
        left = set(entry.get("settle_left") or ())
        frame_stem = Path(entry["frame"]).stem
        cover = matte.get(frame_stem, {})
        dirty = frame_dirty(entry, cover)
        for i, square in enumerate(squares):
            if square in ambiguous_set:
                continue
            # Vor jeder anderen Regel: das BILD gibt kein Label her. Nur eine spaetere `unusable:
            # false`-Zeile nimmt das zurueck, keine Korrektur.
            if (session_id, frame_stem, square) in unlabelable:
                n_unusable_cells += 1
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
            row = {
                "path": "",
                "label": label,
                "session_id": session_id,
                "frame": frame_stem,
                "ply": entry.get("ply"),
                "square": square,
                "square_color": square_color(square),
                "fen": entry["fen"],
                "out_size": [out[0], out[1]],
                # WHAT IS IN THE PICTURE: only the pad says whether 128 px hold 1.10 or 1.20 of a
                # cell. The profile is mutable and stamped nowhere else (specs/45).
                "pad_side": float(prof.crop.pad_side),
                "ts": datetime.now(UTC).isoformat(),
                # Mittlere Luma: unter `config.CELL_DARK_MIN` traegt die Zelle kein Signal mehr, das
                # Label bleibt richtig.
                "brightness": round(float(cv2.cvtColor(crops[i], cv2.COLOR_BGR2GRAY).mean()), 2),
            }
            # Nur wo DIESER Frame gemessen wurde: ein von SAM uebersprungenes Brett ist das
            # verdeckteste des Korpus, nicht das freieste.
            if frame_stem in matte:
                row["coverage"] = matte[frame_stem].get(square, 0.0)
            elif frame_stem in clean:
                row["coverage"] = 0.0
            n_crops += 1
            yield crops[i], row

    if stats is not None:
        stats.update({"session_id": session_id, "frames": len(log), "crops": n_crops,
                      "overrides": n_overrides, "skipped": n_skipped, "unusable": n_unusable,
                      "unusable_cells_dropped": n_unusable_cells,
                      "unknown_dropped": n_unknown, "dirty_dropped": n_dirty,
                      "unsettled_dropped": n_unsettled, "mesh_frames": n_mesh,
                      "bowed_boards": n_bowed})


def _write_crop_batch(session_id: str, frame_stem: str, jobs: list[tuple], started: float) -> None:
    """Await one frame's WebP writes and book them; a failed write names the frame it came from."""
    results = [(future.result(), size) for future, size in jobs]
    if not all(ok for (ok, _seconds), _size in results):
        raise OSError(f"OpenCV failed to write one or more crops for {session_id}/{frame_stem}")
    audit = current_work_audit()
    if audit is None:
        return
    key = (session_id, frame_stem)
    write_bytes = sum(size for _result, size in results)
    audit.record_work("WebP crop batches", key, seconds=time.perf_counter() - started,
                      processed_bytes=write_bytes)
    audit.record_work("WebP encoding CPU", key,
                      seconds=sum(seconds for (_ok, seconds), _size in results),
                      processed_bytes=write_bytes)


def _slice_session(
    session_dir: Path,
    *,
    profile: CalibrationProfile,
    manifest_path: Path,
    squares_root: Path,
    write_pool: ThreadPoolExecutor,
    pad_side: float | None = None,
    out_size: tuple[int, int] | None = None,
    flat_field: bool = False,
    manifest_batch: dict[str, list[str]] | None = None,
) -> dict:
    """Write `iter_session_crops` into the crop pool, awaited per frame: one frame's encodes in
    flight, and a failure names its frame.
    """
    stats: dict = {}
    new_lines: list[str] = []
    out_dirs: dict[str, Path] = {}
    session_id, frame_stem, started = "", "", 0.0
    jobs: list[tuple] = []
    for crop, row in iter_session_crops(session_dir, profile=profile,
                                        pad_side=pad_side, out_size=out_size,
                                        flat_field=flat_field, stats=stats):
        if row["frame"] != frame_stem:
            if jobs:
                _write_crop_batch(session_id, frame_stem, jobs, started)
            frame_stem, jobs, started = row["frame"], [], time.perf_counter()
        session_id = row["session_id"]
        out_dir = out_dirs.get(row["label"])
        if out_dir is None:
            out_dir = out_dirs[row["label"]] = squares_root / row["label"]
            out_dir.mkdir(parents=True, exist_ok=True)
        crop_path = out_dir / f"{session_id}_{frame_stem}_{row['square']}{CROP_SUFFIX}"
        row["path"] = str(crop_path.as_posix())
        jobs.append((write_pool.submit(_write_crop, crop_path, crop), crop.nbytes))
        new_lines.append(json.dumps(row, ensure_ascii=False))
    if jobs:
        _write_crop_batch(session_id, frame_stem, jobs, started)

    if manifest_batch is None:
        _replace_session_in_manifest(manifest_path, stats["session_id"], new_lines)
    else:
        manifest_batch[stats["session_id"]] = new_lines
    return stats


def slice_session(
    session_dir: Path,
    *,
    profile: CalibrationProfile,
    manifest_path: Path,
    squares_root: Path,
    pad_side: float | None = None,
    out_size: tuple[int, int] | None = None,
    flat_field: bool = False,
    manifest_batch: dict[str, list[str]] | None = None,
    write_pool: ThreadPoolExecutor | None = None,
) -> dict:
    """Slice one session, owning the WebP worker pool unless a run-scoped pool is supplied."""
    if write_pool is not None:
        return _slice_session(
            session_dir, profile=profile, manifest_path=manifest_path,
            squares_root=squares_root, write_pool=write_pool,
            pad_side=pad_side, out_size=out_size, manifest_batch=manifest_batch,
            flat_field=flat_field,
        )
    with ThreadPoolExecutor(
        max_workers=SLICE_WRITE_WORKERS, thread_name_prefix="slice-webp"
    ) as owned_pool:
        return _slice_session(
            session_dir, profile=profile, manifest_path=manifest_path,
            squares_root=squares_root, write_pool=owned_pool,
            pad_side=pad_side, out_size=out_size, manifest_batch=manifest_batch,
            flat_field=flat_field,
        )


def _session_ids_with_logs() -> list[str]:
    """Aktive Sessions mit Log; ein `archived_at` in der Meta zaehlt wie ein Umzug ins Archiv."""
    from .session_store.paths import all_sessions

    out = []
    for sid, d in all_sessions():
        try:
            retired = bool(read_session_meta(d).get("archived_at"))
        except (FileNotFoundError, OSError):
            retired = False
        if not retired:
            out.append(sid)
    return out


def variant_paths(variant_tag: str | None) -> tuple[Path, Path]:
    """(manifest_path, crop_pool) for a variant; `None` = default, otherwise `data/crops/<tag>/`."""
    if not variant_tag:
        return config.DATA.crop_pool / "manifest.jsonl", config.DATA.crop_pool
    pool = config.DATA.crops / variant_tag
    return pool / "manifest.jsonl", pool


def run_slice(
    session: str | None = None,
    slice_all: bool = False,
    profile: str | None = None,
    pad_side: float | None = None,
    out_size: str | None = None,
    preview: str | None = None,
    variant_tag: str | None = None,
    flat_field: bool = False,
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
    from .session_store.paths import session_dir as _resolve

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
                            # Die Kette VERGLEICHT den Stempel; ohne diesen Check truege ein
                            # direktes `slice` die Coverage eines aelteren Schnitts ins Manifest.
                            provenance.check(session_dir, matte_path(session_dir))
                            meta = read_session_meta(session_dir)
                            prof = _profile_for_session(meta, profile)
                            stats = slice_session(
                                session_dir, profile=prof, manifest_path=manifest_path,
                                squares_root=squares_root, pad_side=pad_side,
                                out_size=out_size_t, manifest_batch=manifest_batch,
                                write_pool=write_pool, flat_field=flat_field,
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
                # KeyboardInterrupt is a BaseException and bypasses the per-session handler: publish
                # completed sessions first.
                _replace_sessions_in_manifest(manifest_path, manifest_batch)
    except RuntimeError as e:
        print(f"[FAIL] {e}")
        return 1
    return rc


def _preview_session(session_id: str, profile: str | None) -> int:
    """Debug: slice the first position and show label vs. visible crop side by side."""
    from .session_store.paths import session_dir as _resolve

    session_dir, _ = _resolve(session_id)
    try:
        meta = read_session_meta(session_dir)
        prof = _profile_for_session(meta, profile)
        log = read_log_rows(session_dir)
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
