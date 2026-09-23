"""Ingest corner-annotated datasets (currently synthetic renders) as synthetic sessions, so the
existing slice -> build -> train chain runs unchanged.

Frames point at the original images (absolute paths, no copying); crops land in a variant pool.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from . import config, locks
from .ioutil import write_rows
from .session_store.names import log_path, meta_path
from .work_audit import measure, span

_FILES = "abcdefgh"


@dataclass
class ImportItem:
    """An external image in our terms: `corners` in `[a8, h8, h1, a1]` order (White's view, image
    px), `fen` at least the placement field, `group` becomes the session.
    """

    image_path: Path
    corners: list[list[float]]
    fen: str
    group: str
    meta: dict = field(default_factory=dict)


def to_full_fen(placement_or_fen: str) -> str:
    """Complete a placement field to a full FEN; a full FEN stays unchanged."""
    s = placement_or_fen.strip()
    return s if " " in s else f"{s} w - - 0 1"


def ingestion_profile(tag: str, board_size: int, out_size: tuple[int, int] | None = None):
    """Minimal profile, `margin=0`: external corners are the board corners, not ArUco markers
    outside.
    """
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
    """One synthetic session per `group`, frames pointing at the original paths. Returns the session
    IDs.
    """
    import yaml

    groups: dict[str, list[ImportItem]] = {}
    for it in items:
        groups.setdefault(str(it.group), []).append(it)

    session_ids: list[str] = []
    used_groups: set[str] = set()
    for group, its in sorted(groups.items()):
        safe_group = _safe_group(group)
        unique_group = safe_group
        suffix = 2
        while unique_group in used_groups:
            unique_group = f"{safe_group}-{suffix}"
            suffix += 1
        used_groups.add(unique_group)
        sid = f"{tag}__{unique_group}"
        sdir = paths.sessions / sid
        sdir.mkdir(parents=True, exist_ok=True)
        meta = {
            "session_id": sid, "profile": profile_name, "mode": "ingested",
            "created_at": _now_iso(), "camera_index": -1, "frame_size": [0, 0],
            "notes": f"ingested:{tag}",
        }
        meta_path(sdir).write_text(
            yaml.safe_dump(meta, sort_keys=False, allow_unicode=True), encoding="utf-8")
        lines = []
        for i, it in enumerate(its):
            entry = {
                "frame": Path(it.image_path).resolve().as_posix(),
                "ply": i,
                "fen": to_full_fen(it.fen),
                "ts": _now_iso(),
                "corners": [[float(x), float(y)] for x, y in it.corners],
            }
            # Occluder-verdeckte Felder aus dem Renderer ueberschreiben die FEN-Labels dieser
            # Felder.
            occ = it.meta.get("occluded_squares") if it.meta else None
            if occ:
                entry["occluded_squares"] = [str(s) for s in occ]
            # Partly covered squares carry no true label: passed on so the slice DROPS them.
            amb = it.meta.get("ambiguous_squares") if it.meta else None
            if amb:
                entry["ambiguous_squares"] = [str(s) for s in amb]
            lines.append(entry)
        write_rows(log_path(sdir), lines)
        session_ids.append(sid)
    return session_ids


def _variant_paths(variant_tag: str | None, paths: config.Paths) -> tuple[Path, Path]:
    """Like `labeling.variant_paths`, but bound to `paths` (test isolation)."""
    if not variant_tag:
        return paths.crop_pool / "manifest.jsonl", paths.crop_pool
    return paths.crops / variant_tag / "manifest.jsonl", paths.crops / variant_tag


def slice_imported(session_ids: list[str], *, profile, out_size: tuple[int, int] | None = None,
                   variant_tag: str, paths: config.Paths = config.DATA) -> dict:
    """Slice each synthetic session into the variant pool `crops/<variant_tag>/`."""
    from . import labeling

    manifest_path, squares_root = _variant_paths(variant_tag, paths)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    tot = {"sessions": 0, "frames": 0, "crops": 0, "skipped": 0}
    n = len(session_ids)
    with locks.pool_lock(squares_root, f"ingest {n} session(s)"):
        manifest_batch: dict[str, list[str]] = {}
        try:
            with ThreadPoolExecutor(
                max_workers=labeling.SLICE_WRITE_WORKERS, thread_name_prefix="slice-webp"
            ) as write_pool:
                for sid in session_ids:
                    with span("Ingest.slice"):
                        res = labeling.slice_session(
                            paths.sessions / sid, profile=profile, manifest_path=manifest_path,
                            squares_root=squares_root, out_size=out_size,
                            manifest_batch=manifest_batch, write_pool=write_pool)
                    tot["sessions"] += 1
                    tot["frames"] += res["frames"]
                    tot["crops"] += res["crops"]
                    tot["skipped"] += res.get("skipped", 0)
                    print(f"[slice] {tot['sessions']}/{n} sessions · {tot['crops']} crops "
                          f"(last {sid}: {res['frames']} frames)", flush=True)
        finally:
            # Sessions completed before a later failure stay published.
            labeling._replace_sessions_in_manifest(manifest_path, manifest_batch)
    tot["manifest"] = str(manifest_path)
    tot["squares_root"] = str(squares_root)
    return tot


def debug_overlay(session_id: str, n: int, out_dir: Path, *, profile,
                  paths: config.Paths = config.DATA) -> list[Path]:
    """Warp the first `n` frames and overlay FEN labels -> PNGs: a wrong corner order mirrors all
    labels.
    """
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
        # `cv2.imwrite` wirft nicht, es gibt False zurueck.
        if not cv2.imwrite(str(dst), warped):
            raise RuntimeError(f"debug overlay not written: {dst}")
        written.append(dst)
    return written


def _load_adapter(name: str) -> Callable[[Path], Iterable[ImportItem]]:
    name = name.lower()
    if name in ("synthetic", "synth"):
        from .ingest_adapters.synthetic import iter_items
        return iter_items
    raise ValueError(f"unbekannter Adapter {name!r} (synthetic).")


def run_ingest(adapter: str, root: str | Path, *, tag: str, board_size: int = 900,
               out_size: tuple[int, int] | None = None, limit: int | None = None,
               debug_overlay_n: int = 0, build: bool = True,
               paths: config.Paths = config.DATA) -> dict:
    """Adapter -> synthetic sessions -> slice (variant manifest) -> optional `build_dataset`; a
    summary.
    """
    iter_items = _load_adapter(adapter)
    items: list[ImportItem] = []
    skipped = 0
    with span("Ingest.adapter"):
        with measure("adapter scans", (adapter, Path(root).resolve(), limit)):
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
    # Unter `paths`, nicht `profile_path(tag)`: das haengt an `config.DATA` und landete in der
    # echten Datenwurzel.
    out_prof = paths.calibration / f"{tag}.yaml"
    out_prof.parent.mkdir(parents=True, exist_ok=True)
    prof.save(out_prof)
    with span("Ingest.sessions"):
        with measure("ingest session synthesis", (tag, len(items))):
            session_ids = synthesize_sessions(items, tag=tag, profile_name=tag, paths=paths)

    overlays: list[Path] = []
    if debug_overlay_n and session_ids:
        with measure("ingest debug overlays", (tag, session_ids[0], debug_overlay_n)):
            overlays = debug_overlay(session_ids[0], debug_overlay_n,
                                     paths.root / f"ingest_debug__{tag}", profile=prof, paths=paths)

    with measure("ingest slicing", (tag, tuple(session_ids))):
        sliced = slice_imported(session_ids, profile=prof,
                                out_size=out_size, variant_tag=tag, paths=paths)

    summary = {"adapter": adapter, "tag": tag, "items": len(items), "skipped_items": skipped,
               "sessions": len(session_ids), "session_ids": session_ids,
               "overlays": [str(p) for p in overlays], **sliced}

    if build:
        from . import dataset_build
        manifest_path, _ = _variant_paths(tag, paths)
        # Pretrain: NO rotation (fixed camera) and NO aggressive dedup — external frames are diverse
        # anyway.
        with span("Ingest.dataset_build"):
            with measure("ingest dataset builds", (tag, tuple(session_ids))):
                res = dataset_build.build_dataset(
                    tag, session_ids, source_manifest=manifest_path, paths=paths,
                    rotations=(0,), per_cell_cap=10**9, phash_enabled=False)
        summary["dataset"] = tag
        summary["dataset_counts"] = res.get("counts")
    return summary
