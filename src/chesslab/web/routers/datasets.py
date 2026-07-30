"""Dataset router: /api/stats, /api/class/{cls}, /api/datasets*"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..schemas import DatasetCreateRequest
from ..util import _img_url

router = APIRouter()


def _manifest_file(name: str | None):
    from ... import config
    from ... import dataset_build as dataset_build_mod

    if not name:
        return config.DATA.manifests / "squares.jsonl"
    return dataset_build_mod.dataset_dir(name) / "manifest.jsonl"


def _dataset_classes(name: str | None) -> list[str]:
    """Class list a dataset was BUILT with: `dataset.yaml`'s `class_mode` resolved through
    `dataset_build.class_list_for` (the single source for that mapping).

    Without it every set is scored against the 14 piece classes, so a 2-class occupancy
    dataset reports twelve "Class wP: 0 samples." warnings that mean nothing. The global
    pool (no dataset) and pre-`class_mode` builds are pieces."""
    from ... import config
    from ... import dataset_build as dataset_build_mod

    if not name:
        return list(config.CLASSES)
    try:
        cfg = dataset_build_mod.get_dataset(name)["config"]
        return list(dataset_build_mod.class_list_for(cfg.get("class_mode") or "pieces"))
    except (FileNotFoundError, ValueError, OSError):
        return list(config.CLASSES)


@router.get("/api/stats")
def stats(dataset: str | None = Query(None)):
    from ... import config
    from ... import dataset as dataset_mod
    from ...manifest_cache import stats_rows

    classes = _dataset_classes(dataset)
    s = dataset_mod.compute_stats(stats_rows(_manifest_file(dataset)), classes=classes)
    s["classes"] = classes
    s["min_samples"] = config.MIN_CLASS_SAMPLES
    return s


@router.get("/api/class/{cls}")
def class_crops(cls: str, offset: int = 0, limit: int = 60, dataset: str | None = Query(None)):
    from ... import config

    if cls not in config.CLASSES:
        raise HTTPException(404, f"unknown class {cls}")
    # `dataset` set -> the crops of THAT dataset; otherwise the global pool.
    from ...manifest_cache import rows_for_label

    rows = rows_for_label(_manifest_file(dataset), cls)
    page = rows[offset: offset + limit]
    # Fused datasets (mm:// rows) have no crop files — no URL instead of a dead /img/mm:/ link.
    return {"label": cls, "total": len(rows), "dataset": dataset,
            "crops": [{"url": (None if str(r["path"]).startswith("mm://") else _img_url(r["path"])),
                       "session_id": r["session_id"],
                       "frame": r["frame"], "square": r["square"]} for r in page]}


@router.get("/api/datasets/{name}/montage/{cls}")
def class_montage(name: str, cls: str, n: int = Query(64, le=256), tile: int = Query(64, le=128)):
    """One PNG montage (~8 cols) of `n` sample crops of a class — works for FUSED datasets too
    (mm:// rows have no files; pixels come straight from the packed memmap)."""
    import io
    import random as _random

    import numpy as np
    from fastapi import Response
    from PIL import Image

    from ... import config
    from ...manifest_cache import rows_for_label
    from ...training.pack import load_packed, open_packed_memmap

    if cls not in config.CLASSES:
        raise HTTPException(404, f"unknown class {cls}")
    rows = rows_for_label(_manifest_file(name), cls)
    if not rows:
        raise HTTPException(404, f"no '{cls}' crops in dataset '{name}'")
    sample = rows if len(rows) <= n else _random.Random(config.SEED).sample(rows, n)

    packed = load_packed(name)
    mm = open_packed_memmap(packed[0], packed[1]) if packed else None
    p2i = packed[2] if packed else {}

    tiles = []
    for r in sample:
        idx = p2i.get(str(r["path"]))
        if mm is not None and idx is not None:
            im = Image.fromarray(np.array(mm[idx]))
        else:
            p = str(r["path"])
            if p.startswith("mm://"):
                continue                          # fused row without a valid pack — skip
            try:
                im = Image.open(p).convert("RGB")
            except OSError:
                continue
        tiles.append(im.resize((tile, tile)))
    if not tiles:
        raise HTTPException(404, f"no readable crops for '{cls}' (missing packed memmap?)")

    cols = 8
    rows_n = (len(tiles) + cols - 1) // cols
    grid = Image.new("RGB", (cols * tile, rows_n * tile), (24, 24, 27))
    for i, t in enumerate(tiles):
        grid.paste(t, ((i % cols) * tile, (i // cols) * tile))
    buf = io.BytesIO()
    grid.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png",
                    headers={"Cache-Control": "max-age=300"})


@router.get("/api/datasets")
def datasets_list():
    from ... import dataset_build as dataset_build_mod

    return dataset_build_mod.list_datasets()


@router.get("/api/datasets/{name}")
def dataset_get(name: str):
    from ... import dataset_build as dataset_build_mod

    try:
        return dataset_build_mod.get_dataset(name)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.post("/api/datasets")
def dataset_create(req: DatasetCreateRequest):
    from ... import config
    from ... import dataset_build as dataset_build_mod

    try:
        return dataset_build_mod.build_dataset(
            req.name, req.session_ids, per_cell_cap=req.per_cell_cap,
            phash_enabled=req.phash_enabled, phash_hamming=req.phash_hamming,
            rotations=(config.DEDUP.rotations_augmented if req.rotate
                       else config.DEDUP.rotations),
            max_empty_ratio=req.max_empty_ratio, seed=req.seed,
            allow_degenerate=req.allow_degenerate,
            force_train=req.force_train or None)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(400, str(e))


@router.post("/api/datasets/{name}/rebuild")
def dataset_rebuild(name: str):
    from ... import config
    from ... import dataset_build as dataset_build_mod

    try:
        cfg = dataset_build_mod.get_dataset(name)["config"]
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    if cfg.get("fused_synth"):
        raise HTTPException(400, f"'{name}' is a fused synth build — rebuild it with "
                                 f"`chesslab dataset build-synth` (it has no crop-file pool).")
    d, sp = cfg.get("dedup", {}), cfg.get("split", {})
    try:
        res = dataset_build_mod.build_dataset(
            name, cfg.get("session_ids", []), per_cell_cap=d.get("per_cell_cap"),
            phash_enabled=d.get("phash_enabled"), phash_hamming=d.get("phash_hamming"),
            rotations=tuple(cfg.get("rotations", (0,))),
            max_empty_ratio=sp.get("max_empty_ratio"),
            allow_degenerate=True,   # rebuild: original split was already accepted
            seed=sp.get("seed", config.SEED),
            force_train=cfg.get("force_train") or None)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return res


@router.delete("/api/datasets/{name}")
def dataset_delete(name: str):
    from ... import dataset_build as dataset_build_mod

    try:
        return dataset_build_mod.delete_dataset(name)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(404, str(e))
