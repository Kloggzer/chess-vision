"""Datensatz-Router: /api/stats, /api/class/{cls}, /api/datasets*"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..schemas import DatasetCreateRequest
from ..util import _img_url, _manifest

router = APIRouter()


def _dataset_manifest(name: str | None) -> list[dict]:
    from ... import dataset_build as dataset_build_mod
    from ... import dataset as dataset_mod

    if not name:
        return _manifest()
    mp = dataset_build_mod.dataset_dir(name) / "manifest.jsonl"
    try:
        return dataset_mod.load_manifest(mp)
    except FileNotFoundError:
        return []


@router.get("/api/stats")
def stats(dataset: str | None = Query(None)):
    from ... import config
    from ... import dataset as dataset_mod

    rows = _dataset_manifest(dataset)
    s = dataset_mod.compute_stats(rows)
    s["classes"] = list(config.CLASSES)
    s["min_samples"] = config.MIN_CLASS_SAMPLES
    return s


@router.get("/api/class/{cls}")
def class_crops(cls: str, offset: int = 0, limit: int = 60, dataset: str | None = Query(None)):
    from ... import config

    if cls not in config.CLASSES:
        raise HTTPException(404, f"unbekannte Klasse {cls}")
    # `dataset` gesetzt -> die echten Crops DIESES Datensatzes; sonst der globale Pool.
    rows = [r for r in _dataset_manifest(dataset) if r["label"] == cls]
    page = rows[offset: offset + limit]
    return {"label": cls, "total": len(rows), "dataset": dataset,
            "crops": [{"url": _img_url(r["path"]), "session_id": r["session_id"],
                       "frame": r["frame"], "square": r["square"]} for r in page]}


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
            rotations=(config.DEDUP.rotations if req.rotate else (0,)),
            max_empty_ratio=req.max_empty_ratio, seed=req.seed,
            allow_degenerate=req.allow_degenerate)
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
    d, sp = cfg.get("dedup", {}), cfg.get("split", {})
    res = dataset_build_mod.build_dataset(
        name, cfg.get("session_ids", []), per_cell_cap=d.get("per_cell_cap"),
        phash_enabled=d.get("phash_enabled"), phash_hamming=d.get("phash_hamming"),
        rotations=tuple(cfg.get("rotations", (0,))),
        max_empty_ratio=sp.get("max_empty_ratio"),
        allow_degenerate=True,   # rebuild: original split war bereits akzeptiert
        seed=sp.get("seed", config.SEED))
    return res


@router.delete("/api/datasets/{name}")
def dataset_delete(name: str):
    from ... import dataset_build as dataset_build_mod

    try:
        return dataset_build_mod.delete_dataset(name)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(404, str(e))
