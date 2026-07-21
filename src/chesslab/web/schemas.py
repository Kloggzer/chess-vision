"""Pydantic request models for the web API.

Only endpoints whose ``Body(...)`` parameter already forms a single JSON object
get a schema — field names and defaults are copied 1:1 from the current signatures.
Endpoints with ``Body(..., embed=True)`` remain unchanged (embed shape would change).
"""

from __future__ import annotations

from pydantic import BaseModel

from .. import config


class TrainRequest(BaseModel):
    """Fields 1:1 from the existing ``/api/train`` signature; defaults from config
    (config before code — no duplicated literals)."""
    backbone: str = "smallcnn"
    epochs: int = config.DEFAULT_EPOCHS
    batch_size: int = 32
    no_amp: bool = True
    lr: float = config.DEFAULT_LR
    dataset: str | None = None
    resume: str | None = None
    patience: int = config.DEFAULT_PATIENCE
    head: str = "combined"


class SplitRequest(BaseModel):
    """Fields 1:1 from the existing ``/api/split`` signature."""
    max_empty_ratio: float = config.DEFAULT_MAX_EMPTY_RATIO
    max_class_ratio: float | None = None
    seed: int = config.SEED
    allow_degenerate: bool = False


class DatasetCreateRequest(BaseModel):
    """Fields 1:1 from the existing ``POST /api/datasets`` signature."""
    name: str
    session_ids: list[str]
    per_cell_cap: int = config.DEDUP.per_cell_cap
    phash_enabled: bool = config.DEDUP.phash_enabled
    phash_hamming: int = config.DEDUP.phash_hamming
    # ON by default since 2026-07-21: the no-rotate real-all2 build starved the small-model
    # finetune (4x less train data) and rotation demonstrably rescued rare classes (bK
    # recall 0 -> 0.28 on real-all4). Costs 4x train crops on disk; val/test stay rot-0.
    rotate: bool = True
    max_empty_ratio: float = config.DEFAULT_MAX_EMPTY_RATIO
    seed: int = config.SEED
    allow_degenerate: bool = False
    # Sessions pinned to the TRAIN split — fixed-position captures (e.g. the all-empty
    # lighting sessions) would distort board metrics if they landed in val/test.
    force_train: list[str] = []
