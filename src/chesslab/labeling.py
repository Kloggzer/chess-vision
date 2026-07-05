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
    board_corners_for_frame,
    crop_border_px,
    load_profile,
    make_tracker,
    square_to_crop_box,
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


def crop_square(board_warped, square: str, profile: CalibrationProfile, out_size: tuple[int, int]):
    """Extract one square-crop from the **bordered** board (`warp_board_for_crops`).

    `square_to_crop_box` returns the box in board coordinates [0, board_size]; since the data warp
    is offset by `B = crop_border_px(profile)`, the box is shifted by +B into the canvas.
    This ensures edge squares have actual content for their pad_side/pad_up extension. Overhang is
    filled with black (constant geometry across all 64 squares), then scaled losslessly to out_size.
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


def crops_for_frame(frame, corners, profile: CalibrationProfile, *, geometry: str = "warp",
                    photometry: str = "none",
                    piece_height_cells: float = config.EXP_PIECE_HEIGHT_CELLS,
                    out_size: tuple[int, int] | None = None,
                    with_meta: bool = False):
    """64 Crops (order `all_squares()`) for ONE frame — IDENTICAL to the training slice:
    bordered warp OR box3d, then `preprocess_crop`. Single Source for live inference so
    the model sees exactly the same crop live as during training.

    `with_meta=True`: returns (crops, meta) where meta = {"used_box3d": list[bool]} indicates per square
    whether the crop was produced via box3d (True) or warp (False). Used by `slice_session`
    for the `pose_ok` flag in the manifest (de-duplication, Rework 01).
    """
    out = tuple(out_size) if out_size else tuple(profile.crop.out_size)
    box3d = geometry == "box3d"
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
    warped = warp_board_for_crops(frame, profile, corners)   # warp-Crop + box3d-Fallback
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
            crop = crop_square(warped, square, profile, out)
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


def _effective_profile(profile: CalibrationProfile, pad_up, pad_side) -> CalibrationProfile:
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
    a human correction (web relabel). Returns the number of applied overrides.

    `geometry_mode`: "warp" (top-down crop, baseline) or "box3d" (3D box from the original frame
    via per-frame pose). `photometry`: deterministic filter (none/clahe/grayworld/gamma), baked
    INTO the PNGs (train/inference parity). `piece_height_cells`: extrusion height for box3d.
    """
    session_dir = Path(session_dir)
    meta = read_session_meta(session_dir)
    session_id = meta["session_id"]
    log = read_log(session_dir)

    prof = _effective_profile(profile, pad_up, pad_side)
    out = tuple(out_size) if out_size else tuple(prof.crop.out_size)
    box3d = geometry_mode == "box3d"

    new_lines: list[str] = []
    n_crops = 0
    n_overrides = 0
    n_skipped = 0
    n_fallback = 0   # box3d: squares that fell back to warp (pose/projection failed)
    tracker = make_tracker(prof)   # per session: seeded from profile, markers held per frame
    for entry in log:
        frame_path = session_dir / entry["frame"]
        frame = cv2.imread(str(frame_path))
        if frame is None:
            raise FileNotFoundError(f"Frame not readable: {frame_path}")
        corners = entry.get("corners")
        if not corners:
            # Fallback (sessions without saved corners): per frame from the markers.
            corners = board_corners_for_frame(frame, prof, tracker)
            if corners is None:
                n_skipped += 1   # no markers in frame -> not usable, skip
                continue

        # crops_for_frame as single source (Rework 01: de-duplication).
        crops, meta = crops_for_frame(
            frame, corners, prof, geometry=geometry_mode, photometry=photometry,
            piece_height_cells=piece_height_cells, out_size=out, with_meta=True)
        used_box3d_list = meta["used_box3d"]
        if box3d:
            n_fallback += sum(1 for v in used_box3d_list if not v)

        explicit = entry.get("labels")          # Inference/Active-Learning: explicit 64 labels
        gs = None if explicit else GameState(entry["fen"])
        frame_stem = Path(entry["frame"]).stem  # '0007'
        squares = all_squares()
        for i, square in enumerate(squares):
            label = explicit.get(square, "empty") if explicit else gs.label_for(square)
            if label_overrides:
                corrected = label_overrides.get((session_id, frame_stem, square))
                if corrected is not None and corrected != label:
                    label = corrected
                    n_overrides += 1
            crop = crops[i]
            out_dir = squares_root / label
            out_dir.mkdir(parents=True, exist_ok=True)
            fname = f"{session_id}_{frame_stem}_{square}.png"
            cv2.imwrite(str(out_dir / fname), crop)
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
                "geometry": geometry_mode,
                "photometry": photometry,
                "ts": datetime.now(UTC).isoformat(),
            }
            if box3d:
                row["piece_height_cells"] = float(piece_height_cells)
                row["pose_ok"] = used_box3d_list[i]
            new_lines.append(json.dumps(row, ensure_ascii=False))
            n_crops += 1

    _replace_session_in_manifest(manifest_path, session_id, new_lines)
    return {"session_id": session_id, "frames": len(log), "crops": n_crops,
            "overrides": n_overrides, "skipped": n_skipped, "fallback": n_fallback}


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
