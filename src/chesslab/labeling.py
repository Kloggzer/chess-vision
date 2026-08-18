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
from datetime import UTC, datetime
from pathlib import Path

import cv2

from . import config, geometry3d, photometric
from .calibration import (
    CalibrationProfile,
    GridMesh,
    board_corners_for_frame,
    crop_border_px,
    load_profile,
    make_tracker,
    mesh_cell_quad,
    mesh_from_lines,
    square_to_crop_box,
    square_to_mesh_box,
    warp_board_for_crops,
)
from .imgops import resize_keep_aspect
from .state import GameState

_FILES = "abcdefgh"



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

#: How far a cell may sit from its ply interval's settled board and still be trusted
#: (`realgames.settle_for_ply`). At 15 the montage above it holds fingers on squares labelled
#: `empty`, PIECES on squares labelled `empty`, and hands closed around the piece they name; the
#: band just below holds ordinary cells. Measured over the 858 363 cells that reach the corpus: 15
#: costs 5.3 % of them and catches 96.4 % of what the groove sensor independently accuses, where 40
#: costs 1.0 % and catches only 79 %. A human correction outranks it, exactly as with `dirty` — the
#: gate is a doubt, not a verdict.
SETTLE_LIMIT = 15.0


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


# Transition alias: `resize_keep_aspect` now lives in `imgops` (resolves the
# import cycle with `geometry3d`). No longer referenced by anyone; can be
# removed in the next cleanup pass.
_resize_keep_aspect = resize_keep_aspect


def _crop_square_mesh(board_warped, square: str, profile: CalibrationProfile,
                      out_size: tuple[int, int], mesh: GridMesh):
    """The per-cell PERSPECTIVE cut: the padded cell quad warped onto the letterboxed content
    rectangle, so a line the mesh knows as tilted or bowed comes out straight. Aspect from the
    scalar box, bars black — the composition `resize_keep_aspect` builds. Twin: `cropSquareTilted`.
    """
    import numpy as np

    x0, y0, x1, y1 = square_to_mesh_box(square, profile, mesh)
    w, h = x1 - x0, y1 - y0
    if w <= 0 or h <= 0:
        return None
    ow, oh = int(out_size[0]), int(out_size[1])
    s = min(ow / w, oh / h)
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    b = crop_border_px(profile)
    src = np.array([(x + b, y + b) for x, y in mesh_cell_quad(square, profile, mesh)], np.float32)
    dst = np.array([(0, 0), (nw, 0), (nw, nh), (0, nh)], np.float32)
    content = cv2.warpPerspective(board_warped, cv2.getPerspectiveTransform(src, dst), (nw, nh))
    canvas = np.zeros((oh, ow, 3), dtype=np.uint8)
    x, y = (ow - nw) // 2, (oh - nh) // 2
    canvas[y:y + nh, x:x + nw] = content
    return canvas


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


def crop_square(board_warped, square: str, profile: CalibrationProfile, out_size: tuple[int, int],
                mesh: GridMesh | None = None):
    """Extract one square-crop from the **bordered** board (`warp_board_for_crops`).

    `square_to_crop_box` returns the box in board coordinates [0, board_size]; since the data warp
    is offset by `B = crop_border_px(profile)`, the box is shifted by +B into the canvas.
    This ensures edge squares have actual content for their pad_side/pad_up extension. Overhang is
    filled with black (constant geometry across all 64 squares), then scaled losslessly to out_size.

    A `mesh` cuts at the board's OWN measured lines instead of the nominal eighth — perspectively
    per cell once it carries tilts, so the lens' barrel never reaches the training crop.
    """
    if mesh is not None and mesh.tilted:
        crop = _crop_square_mesh(board_warped, square, profile, out_size, mesh)
        if crop is not None:
            return crop
    x0, y0, x1, y1 = (square_to_crop_box(square, profile, clamp=False) if mesh is None
                      else tuple(round(v) for v in square_to_mesh_box(square, profile, mesh)))
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


def crops_for_frame(frame, corners, profile: CalibrationProfile, *, geometry: str = "warp",
                    photometry: str = "none",
                    piece_height_cells: float = config.EXP_PIECE_HEIGHT_CELLS,
                    out_size: tuple[int, int] | None = None,
                    mesh: GridMesh | None = None,
                    board=None,
                    with_meta: bool = False):
    """64 Crops (order `all_squares()`) for ONE frame — IDENTICAL to the training slice:
    bordered warp OR box3d, then `preprocess_crop`. Single Source for live inference so
    the model sees exactly the same crop live as during training.

    `with_meta=True`: also returns {"used_box3d": list[bool]} per square, which `slice_session`
    writes as the manifest's `pose_ok` (de-duplication, Rework 01).
    `mesh`: the frame's measured grid lines, cutting each cell at the board's own boundaries
    instead of the nominal eighth — warp path only, box3d has its own geometry.
    `board`: the stored warp (`realgames.write_board`) instead of warping [frame], which may then
    be None — box3d is the exception, it reprojects from the source frame.
    """
    out = tuple(out_size) if out_size else tuple(profile.crop.out_size)
    box3d = geometry == "box3d"
    if box3d and frame is None:
        raise ValueError("box3d needs the source frame — a stored board is already rectified.")
    cell = profile.board_size / 8.0
    pose = None
    up = 1.0
    K = dist = None
    if box3d:
        fh, fw = frame.shape[:2]
        K, dist = geometry3d.intrinsics(profile, (fw, fh))
        pose = geometry3d.estimate_pose(corners, K, dist, profile.board_size, profile.margin)
        if pose is not None:
            up = geometry3d.up_sign(pose[0], pose[1])
    ph_units = float(piece_height_cells) * cell
    ps_units = config.EXP_BOX3D_PAD_SIDE_CELLS * cell
    warped = board if board is not None else warp_board_for_crops(frame, profile, corners)
    crops = []
    used_box3d = []
    for square in all_squares():
        crop = None
        is_box3d = False
        if box3d and pose is not None:
            crop = geometry3d.crop_square_3d(frame, square, K, dist, pose[0], pose[1], profile,
                                             piece_height_units=ph_units, pad_side_units=ps_units,
                                             up=up, out_size=out)
            is_box3d = crop is not None
        if crop is None:
            crop = crop_square(warped, square, profile, out, mesh)
        if photometry != "none":
            crop = photometric.preprocess_crop(crop, photometry)
        crops.append(crop)
        used_box3d.append(is_box3d)
    return (crops, {"used_box3d": used_box3d}) if with_meta else crops


def variant_of_run(run_dir: Path) -> tuple[str, str, float]:
    """(geometry, photometry, piece_height_cells) of a model run — from its dataset manifest
    (the crops carry their preprocessing tags). This tells live inference how to crop.
    Default (warp, none) for untagged legacy manifests."""
    cfg_p = run_dir / "config.json"
    cfg = json.loads(cfg_p.read_text(encoding="utf-8")) if cfg_p.exists() else {}
    ds = cfg.get("dataset")
    if ds:
        from .dataset_build import dataset_dir
        man = dataset_dir(ds) / "manifest.jsonl"
    else:
        man = config.DATA.manifests / "squares.jsonl"
    if man.exists():
        for line in man.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                return (r.get("geometry", "warp"), r.get("photometry", "none"),
                        float(r.get("piece_height_cells", config.EXP_PIECE_HEIGHT_CELLS)))
    return ("warp", "none", config.EXP_PIECE_HEIGHT_CELLS)


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


def _replace_session_in_manifest(manifest_path: Path, session_id: str, new_lines: list[str]) -> None:
    """Remove previous lines of this session, then append new ones (idempotent re-slice)."""
    kept: list[str] = []
    if manifest_path.exists():
        for line in manifest_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            if json.loads(line).get("session_id") != session_id:
                kept.append(line)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with manifest_path.open("w", encoding="utf-8") as fh:
        for ln in kept + new_lines:
            fh.write(ln + "\n")


def load_corrections(path: Path) -> dict[tuple[str, str, str], str]:
    """Load human label corrections: {(session_id, frame, square): label}. Last wins."""
    out: dict[tuple[str, str, str], str] = {}
    p = Path(path)
    if not p.exists():
        return out
    for line in p.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        c = json.loads(line)
        out[(c["session_id"], str(c["frame"]), c["square"])] = c["label"]
    return out


def upsert_corrections(items: list[dict], path: Path) -> int:
    """Merge corrections (session_id, frame, square, label) and rewrite. Returns total count."""
    merged = load_corrections(path)
    for it in items:
        merged[(it["session_id"], str(it["frame"]), it["square"])] = it["label"]
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for (sid, frame, square), label in merged.items():
            fh.write(json.dumps({"session_id": sid, "frame": frame, "square": square,
                                 "label": label, "ts": datetime.now(UTC).isoformat()},
                                ensure_ascii=False) + "\n")
    return len(merged)


#: A square this covered is no longer a piece example (`training/occlusion.PIECE_VISIBLE_MAX`),
#: so a frame carrying one is as dirty as one the tracker flagged — whatever the log says.
MATTE_DIRTY = 0.15


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


def slice_session(
    session_dir: Path,
    *,
    profile: CalibrationProfile,
    manifest_path: Path,
    squares_root: Path,
    pad_up: float | None = None,
    pad_side: float | None = None,
    out_size: tuple[int, int] | None = None,
    label_overrides: dict[tuple[str, str, str], str] | None = None,
    geometry_mode: str = "warp",
    photometry: str = "none",
    piece_height_cells: float = config.EXP_PIECE_HEIGHT_CELLS,
) -> dict:
    """Slice one session: 64 crops per logged position + manifest lines. Pure I/O.

    `label_overrides` replaces the FEN-derived label per (session, frame, square) with
    a human correction (web relabel). Returns the number of applied overrides. It is also the
    only way a cell of a `dirty` frame reaches the pool at all — see the loop below.

    `geometry_mode`: "warp" (top-down crop, baseline) or "box3d" (3D box from the original frame
    via per-frame pose). `photometry`: deterministic filter (none/clahe/grayworld/gamma), baked
    INTO the crops (train/inference parity). `piece_height_cells`: extrusion height for box3d.
    """
    session_dir = Path(session_dir)
    meta = read_session_meta(session_dir)
    session_id = meta["session_id"]
    log = read_log(session_dir)

    matte = read_matte(session_dir)
    prof = effective_profile(profile, pad_up, pad_side)
    out = tuple(out_size) if out_size else tuple(prof.crop.out_size)
    box3d = geometry_mode == "box3d"

    new_lines: list[str] = []
    n_crops = 0
    n_overrides = 0
    n_skipped = 0
    #: Cells dropped because the FEN lags there and no human ruled on them (`unknown_squares`).
    n_unknown = 0
    #: Cells dropped because a hand was in the frame and no human ruled on them (`dirty`).
    n_dirty = 0
    #: Cells whose pixels left the position they are labelled with (`SETTLE_LIMIT`).
    n_unsettled = 0
    n_unusable = 0
    n_fallback = 0   # box3d: squares that fell back to warp (pose/projection failed)
    n_mesh = 0       # frames cut at their own measured grid lines instead of the nominal eighth
    tracker = make_tracker(prof)   # per session: seeded from profile, markers held per frame
    for entry in log:
        if entry.get("unusable"):
            n_unusable += 1
            continue
        # The stored board is the rectified frame under this row's own quad, so cutting from it is
        # the same operation minus the warp — and it is what the label view shows, which is the
        # point. The source frame is only read when there is no board (or for box3d, which
        # reprojects from it); it is no longer kept on disk for sessions that carry one.
        board = cv2.imread(str(session_dir / entry["board"])) if usable_board(entry, prof) else None
        frame = None
        if board is None or box3d:
            frame_path = session_dir / entry["frame"]
            frame = cv2.imread(str(frame_path))
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

        # The row's own 18 lines, when the fit could read them: without them the crop keeps the
        # lens' barrel, and a curved training set is exactly what this pipeline must not produce.
        mesh = mesh_from_lines(entry.get("grid_lines"))
        n_mesh += mesh is not None
        # crops_for_frame as single source (Rework 01: de-duplication).
        crops, meta = crops_for_frame(
            frame, corners, prof, geometry=geometry_mode, photometry=photometry,
            piece_height_cells=piece_height_cells, out_size=out, mesh=mesh, board=board,
            with_meta=True)
        used_box3d_list = meta["used_box3d"]
        if box3d:
            n_fallback += sum(1 for v in used_box3d_list if not v)

        explicit = entry.get("labels")          # Inference/Active-Learning: explicit 64 labels
        gs = None if explicit else GameState(entry["fen"])
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
        # How far each cell sits from its own ply interval's settled board (`session settle-scan`).
        # A row from too short an interval has none, and then this gate does not fire — see
        # `SETTLE_LIMIT`. Absent on every session that predates the scan, which is the same thing.
        settle = entry.get("settle_dev") or ()
        frame_stem = Path(entry["frame"]).stem  # '0007'
        cover = matte.get(frame_stem, {})
        # An `occluded` frame is a hand over a position the commit still vouches for, and its
        # matte says how much of each square is hidden. That makes its cells labelable: the FEN
        # gives the class, the coverage takes the hidden ones out of the loss. Only WITH the
        # measurement — coverage 0.0 under a hand would be a lie (`docs/frame-scan.md`).
        if entry.get("dirty_reason") == "occluded" and cover:
            dirty = False
        elif any(v > MATTE_DIRTY for v in cover.values()):
            dirty = True
        squares = all_squares()
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
            if i < len(settle) and settle[i] >= SETTLE_LIMIT and corrected is None:
                n_unsettled += 1
                continue
            label = explicit.get(square, "empty") if explicit else gs.label_for(square)
            if square in occluded_set:
                label = "occluded"
            if corrected is not None and corrected != label:
                label = corrected
                n_overrides += 1
            crop = crops[i]
            out_dir = squares_root / label
            out_dir.mkdir(parents=True, exist_ok=True)
            fname = f"{session_id}_{frame_stem}_{square}{CROP_SUFFIX}"
            cv2.imwrite(str(out_dir / fname), crop, CROP_ENCODE)
            row = {
                "path": str((out_dir / fname).as_posix()),
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
                "geometry": geometry_mode,
                "photometry": photometry,
                "ts": datetime.now(UTC).isoformat(),
            }
            if matte:
                # The second training target, from a real hand instead of a composited one. Only
                # written where mattes exist, so no manifest changes shape behind anyone's back.
                row["coverage"] = matte.get(frame_stem, {}).get(square, 0.0)
            if box3d:
                row["piece_height_cells"] = float(piece_height_cells)
                row["pose_ok"] = used_box3d_list[i]
            new_lines.append(json.dumps(row, ensure_ascii=False))
            n_crops += 1

    _replace_session_in_manifest(manifest_path, session_id, new_lines)
    return {"session_id": session_id, "frames": len(log), "crops": n_crops,
            "overrides": n_overrides, "skipped": n_skipped, "unusable": n_unusable,
            "unknown_dropped": n_unknown, "dirty_dropped": n_dirty,
            "unsettled_dropped": n_unsettled, "mesh_frames": n_mesh,
            "fallback": n_fallback}


# --- CLI layer (resolves defaults from config) ---------------------------------------------

def _session_ids_with_logs() -> list[str]:
    root = config.DATA.sessions
    if not root.exists():
        return []
    return sorted(p.name for p in root.iterdir() if (p / "log.jsonl").exists())


def variant_paths(variant_tag: str | None) -> tuple[Path, Path]:
    """(manifest_path, squares_root) for a variant. `None` = current default paths; otherwise
    `data/manifests/squares__<tag>.jsonl` + `data/squares__<tag>/`, so variants coexist."""
    if not variant_tag:
        return config.DATA.manifests / "squares.jsonl", config.DATA.squares
    suffix = f"__{variant_tag}"
    return config.DATA.manifests / f"squares{suffix}.jsonl", config.DATA.root / f"squares{suffix}"


def run_slice(
    session: str | None = None,
    slice_all: bool = False,
    profile: str | None = None,
    pad_up: float | None = None,
    pad_side: float | None = None,
    out_size: str | None = None,
    preview: str | None = None,
    geometry_mode: str = "warp",
    photometry: str = "none",
    piece_height_cells: float = config.EXP_PIECE_HEIGHT_CELLS,
    variant_tag: str | None = None,
) -> int:
    out_size_t = parse_out_size(out_size) if out_size else None

    if preview:
        return _preview_session(preview, profile)

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
    corrections = load_corrections(config.DATA.corrections)  # apply human relabels
    rc = 0
    for sid in sids:
        session_dir = config.DATA.sessions / sid
        try:
            meta = read_session_meta(session_dir)
            prof = _profile_for_session(meta, profile)
            stats = slice_session(
                session_dir, profile=prof, manifest_path=manifest_path, squares_root=squares_root,
                pad_up=pad_up, pad_side=pad_side, out_size=out_size_t, label_overrides=corrections,
                geometry_mode=geometry_mode, photometry=photometry, piece_height_cells=piece_height_cells,
            )
            extra = f" ({stats['overrides']} corrections)" if stats.get("overrides") else ""
            if stats.get("skipped"):
                extra += f" [{stats['skipped']} frames without markers skipped]"
            if stats.get("fallback"):
                extra += f" [{stats['fallback']} box3d->warp fallbacks]"
            extra += f" [mesh cut on {stats.get('mesh_frames', 0)}/{stats['frames']} frames]"
            if stats.get("dirty_dropped"):
                extra += f" [{stats['dirty_dropped']} cells held back on dirty frames]"
            if stats.get("unsettled_dropped"):
                extra += f" [{stats['unsettled_dropped']} cells held back as unsettled]"
            print(f"[OK] {sid}: {stats['frames']} Frames -> {stats['crops']} Crops{extra}.")
        except Exception as e:  # noqa: BLE001
            print(f"[FAIL] {sid}: {e}")
            rc = 1
    return rc


def _preview_session(session_id: str, profile: str | None) -> int:
    """Debug: slice the first position and show label vs. visible crop side by side."""
    session_dir = config.DATA.sessions / session_id
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
