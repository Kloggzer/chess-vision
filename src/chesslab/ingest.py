"""Ingestion of external chess datasets (e.g. chesscog, ChessReD2K) into our crop format —
for transfer learning (pretrain on diverse foreign boards → `train --resume` finetune on
own fixed-camera sessions).

**Core idea — NO pipeline changes:** external images bring their own 4 board corners
(`[a8,h8,h1,a1]` in image pixels) + FEN. We write them as **synthetic sessions** (exactly the
`session.yaml`+`log.jsonl` schema from `collect.SessionWriter`) and let the existing
`labeling.slice_session → dataset_build.build_dataset → training.train` chain run.

- Per frame `corners` are present → **no ArUco markers** needed (slice uses stored corners).
- `geometry="warp"` needs **no camera intrinsics** (homography from the 4 corners only).
- The `frame` field points to the **original image** (absolute path) → no re-encoding/copying (saves
  GBs). `slice_session` resolves `session_dir / entry["frame"]`; an absolute path wins.
- One session **per game/group** → the existing session-based split logic applies unchanged
  (clean train/val without leakage).
- Crops land in a **variant manifest** (`squares__<tag>.jsonl`) → the real `data/squares` pool
  remains untouched.
"""

from __future__ import annotations

import json
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from . import config

_FILES = "abcdefgh"


@dataclass
class ImportItem:
    """An external image, translated into our terms.

    `corners`: the 4 board corners **in the order `[a8, h8, h1, a1]`** (= top-left, top-right,
    bottom-right, bottom-left from White's perspective), in image pixels. `fen`: full FEN (at least the
    placement field; `to_full_fen` fills in the rest). `group`: game/group ID → becomes the session.
    """

    image_path: Path
    corners: list[list[float]]
    fen: str
    group: str
    meta: dict = field(default_factory=dict)


# --- FEN helpers for adapters that only have square→piece lists (e.g. ChessReD) ------------

def to_full_fen(placement_or_fen: str) -> str:
    """Completes a placement field to a full FEN (python-chess-parseable).
    Already a full FEN (>=2 fields), it stays unchanged."""
    s = placement_or_fen.strip()
    return s if " " in s else f"{s} w - - 0 1"


def fen_from_squares(occupied: dict[str, str]) -> str:
    """`{'e1':'K','e8':'k','e4':'P', ...}` (Feld→FEN-Buchstabe) → volle FEN.
    Uppercase = White, lowercase = Black (FEN-conform)."""
    ranks = []
    for rank in range(8, 0, -1):
        row, empty = "", 0
        for file in _FILES:
            sym = occupied.get(f"{file}{rank}")
            if sym:
                if empty:
                    row += str(empty)
                    empty = 0
                row += sym
            else:
                empty += 1
        if empty:
            row += str(empty)
        ranks.append(row)
    return to_full_fen("/".join(ranks))


# --- synthetic profile (margin=0: corners lie DIRECTLY on the board edge) ---------

def ingestion_profile(tag: str, board_size: int, out_size: tuple[int, int] | None = None):
    """Minimal profile for warping external images. `margin=0`, because the external corners are the
    **board corners** themselves (not ArUco markers outside). Homography/`image_corners` are just
    placeholders — the warp computes from the stored `corners` per frame."""
    from .calibration import CalibrationProfile, CropParams, compute_homography

    bs = int(board_size)
    corners = [[0.0, 0.0], [float(bs), 0.0], [float(bs), float(bs)], [0.0, float(bs)]]
    crop = CropParams.default(bs)
    if out_size is not None:
        crop.out_size = (int(out_size[0]), int(out_size[1]))
    return CalibrationProfile(
        profile=tag, camera_index=-1, frame_size=(bs, bs), board_size=bs,
        image_corners=corners, homography=compute_homography(corners, bs, 0.0),
        white_pov=True, crop=crop, margin=0.0,
    )


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _safe_group(group: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "-" for c in str(group))


def synthesize_sessions(items: Iterable[ImportItem], *, tag: str, profile_name: str,
                        paths: config.Paths = config.DATA) -> list[str]:
    """Writes per `group` a synthetic session (`session.yaml` + `log.jsonl`), whose frames point to
    the **original image paths** (no copying). Returns the created session IDs."""
    import yaml

    groups: dict[str, list[ImportItem]] = {}
    for it in items:
        groups.setdefault(_safe_group(it.group), []).append(it)

    session_ids: list[str] = []
    for group, its in sorted(groups.items()):
        sid = f"{tag}__{group}"
        sdir = paths.sessions / sid
        sdir.mkdir(parents=True, exist_ok=True)
        meta = {
            "session_id": sid, "profile": profile_name, "mode": "ingested",
            "created_at": _now_iso(), "camera_index": -1, "frame_size": [0, 0],
            "notes": f"ingested:{tag}",
        }
        (sdir / "session.yaml").write_text(
            yaml.safe_dump(meta, sort_keys=False, allow_unicode=True), encoding="utf-8")
        lines = []
        for i, it in enumerate(its):
            entry = {
                "frame": Path(it.image_path).resolve().as_posix(),   # absolute original path
                "ply": i,
                "fen": to_full_fen(it.fen),
                "ts": _now_iso(),
                "corners": [[float(x), float(y)] for x, y in it.corners],
            }
            # Occluder-verdeckte Felder (aus dem Renderer) → als explizite `occluded`-Labels in den
            # Log-Eintrag; slice_session überschreibt damit die FEN-abgeleiteten Labels dieser Felder.
            occ = it.meta.get("occluded_squares") if it.meta else None
            if occ:
                entry["occluded_squares"] = [str(s) for s in occ]
            lines.append(json.dumps(entry, ensure_ascii=False))
        (sdir / "log.jsonl").write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
        session_ids.append(sid)
    return session_ids


def _variant_paths(variant_tag: str | None, paths: config.Paths) -> tuple[Path, Path]:
    """Like `labeling.variant_paths`, but bound to `paths` (test isolation): `squares__<tag>.jsonl`
    + `squares__<tag>/` under the given data root."""
    if not variant_tag:
        return paths.manifests / "squares.jsonl", paths.squares
    return paths.manifests / f"squares__{variant_tag}.jsonl", paths.root / f"squares__{variant_tag}"


def slice_imported(session_ids: list[str], *, profile, geometry: str = "warp",
                   photometry: str = "none", out_size: tuple[int, int] | None = None,
                   variant_tag: str, paths: config.Paths = config.DATA) -> dict:
    """Slice each synthetic session into the variant manifest `squares__<variant_tag>.jsonl`
    (via the existing `labeling.slice_session`)."""
    from . import labeling

    manifest_path, squares_root = _variant_paths(variant_tag, paths)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    tot = {"sessions": 0, "frames": 0, "crops": 0, "skipped": 0}
    n = len(session_ids)
    for sid in session_ids:
        res = labeling.slice_session(
            paths.sessions / sid, profile=profile, manifest_path=manifest_path,
            squares_root=squares_root, out_size=out_size, geometry_mode=geometry, photometry=photometry)
        tot["sessions"] += 1
        tot["frames"] += res["frames"]
        tot["crops"] += res["crops"]
        tot["skipped"] += res.get("skipped", 0)
        print(f"[slice] {tot['sessions']}/{n} sessions · {tot['crops']} crops "
              f"(last {sid}: {res['frames']} frames)", flush=True)
    tot["manifest"] = str(manifest_path)
    tot["squares_root"] = str(squares_root)
    return tot


def debug_overlay(session_id: str, n: int, out_dir: Path, *, profile,
                  paths: config.Paths = config.DATA) -> list[Path]:
    """Warp the first `n` frames of a session and overlay FEN labels per square → PNGs for
    **visual check against silent label swapping** (wrong corner order mirrors all labels)."""
    import cv2

    from .calibration import square_center, warp_from_corners
    from .labeling import read_log
    from .state import GameState

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    log = read_log(paths.sessions / session_id)
    written: list[Path] = []
    for entry in log[:n]:
        frame = cv2.imread(str(Path(entry["frame"])))
        if frame is None or not entry.get("corners"):
            continue
        warped = warp_from_corners(frame, profile, entry["corners"])
        gs = GameState(entry["fen"])
        for file in _FILES:
            for rank in range(1, 9):
                sq = f"{file}{rank}"
                label = gs.label_for(sq)
                if label == "empty":
                    continue
                cx, cy = square_center(sq, profile)
                txt = label[1] if label[0] == "w" else label[1].lower()
                cv2.putText(warped, txt, (int(cx) - 8, int(cy) + 8), cv2.FONT_HERSHEY_SIMPLEX,
                            0.8, (0, 0, 255), 2, cv2.LINE_AA)
        dst = out_dir / f"{session_id}_{Path(entry['frame']).stem}.png"
        cv2.imwrite(str(dst), warped)
        written.append(dst)
    return written


# --- Adapter-Registry + Orchestrator -----------------------------------------------------

def _load_adapter(name: str) -> Callable[[Path], Iterable[ImportItem]]:
    name = name.lower()
    if name == "chesscog":
        from .ingest_adapters.chesscog import iter_items
        return iter_items
    if name in ("chessred", "chessred2k"):
        from .ingest_adapters.chessred import iter_items
        return iter_items
    if name in ("synthetic", "synth"):
        from .ingest_adapters.synthetic import iter_items
        return iter_items
    raise ValueError(f"unbekannter Adapter {name!r} (chesscog | chessred | synthetic).")


def run_ingest(adapter: str, root: str | Path, *, tag: str, geometry: str = "warp",
               photometry: str = "none", board_size: int = 900,
               out_size: tuple[int, int] | None = None, limit: int | None = None,
               debug_overlay_n: int = 0, build: bool = True,
               paths: config.Paths = config.DATA) -> dict:
    """Full pipeline: adapter → synthetic sessions → slice (variant manifest) → optional
    `build_dataset`. Returns a summary (sessions, crops, class distribution, paths)."""
    iter_items = _load_adapter(adapter)
    items: list[ImportItem] = []
    skipped = 0
    for it in iter_items(Path(root)):
        if it is None:
            skipped += 1
            continue
        items.append(it)
        if limit and len(items) >= limit:
            break
    if not items:
        raise ValueError(f"Adapter {adapter!r} found no usable images under {root} "
                         f"(skipped: {skipped}). Check path/annotation file.")

    prof = ingestion_profile(tag, board_size, out_size)
    # Persist the profile so later re-slices (CLI/web) can load it like any other profile.
    from .calibration import profile_path

    out_prof = profile_path(tag)
    out_prof.parent.mkdir(parents=True, exist_ok=True)
    prof.save(out_prof)
    session_ids = synthesize_sessions(items, tag=tag, profile_name=tag, paths=paths)

    overlays: list[Path] = []
    if debug_overlay_n and session_ids:
        overlays = debug_overlay(session_ids[0], debug_overlay_n,
                                 paths.root / f"ingest_debug__{tag}", profile=prof, paths=paths)

    sliced = slice_imported(session_ids, profile=prof, geometry=geometry, photometry=photometry,
                            out_size=out_size, variant_tag=tag, paths=paths)

    summary = {"adapter": adapter, "tag": tag, "items": len(items), "skipped_items": skipped,
               "sessions": len(session_ids), "session_ids": session_ids,
               "overlays": [str(p) for p in overlays], **sliced}

    if build:
        from . import dataset_build
        manifest_path, _ = _variant_paths(tag, paths)
        # Pretrain: NO rotation (fixed-camera rule) and NO aggressive dedup (external frames are
        # diverse anyway — we want maximum variety for pretraining).
        res = dataset_build.build_dataset(
            tag, session_ids, source_manifest=manifest_path, paths=paths,
            rotations=(0,), per_cell_cap=10**9, phash_enabled=False)
        summary["dataset"] = tag
        summary["dataset_counts"] = res.get("counts")
    return summary