"""Pydantic-Request-Modelle für die Web-API.

Nur Endpoints, deren ``Body(...)``-Parameter ohnehin ein einzelnes JSON-Objekt bilden,
bekommen ein Schema — Feldnamen und Defaults sind 1:1 aus den heutigen Signaturen kopiert.
Endpoints mit ``Body(..., embed=True)`` bleiben unverändert (embed-Shape würde sich ändern).
"""

from __future__ import annotations

from pydantic import BaseModel

from .. import config


class TrainRequest(BaseModel):
    """Felder 1:1 aus der bisherigen ``/api/train``-Signatur; Defaults aus config
    (Konfig vor Code — keine duplizierten Literale)."""
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
    """Felder 1:1 aus der bisherigen ``/api/split``-Signatur."""
    max_empty_ratio: float = config.DEFAULT_MAX_EMPTY_RATIO
    max_class_ratio: float | None = None
    seed: int = config.SEED
    allow_degenerate: bool = False


class DatasetCreateRequest(BaseModel):
    """Felder 1:1 aus der bisherigen ``POST /api/datasets``-Signatur."""
    name: str
    session_ids: list[str]
    per_cell_cap: int = config.DEDUP.per_cell_cap
    phash_enabled: bool = config.DEDUP.phash_enabled
    phash_hamming: int = config.DEDUP.phash_hamming
    rotate: bool = True
    max_empty_ratio: float = config.DEFAULT_MAX_EMPTY_RATIO
    seed: int = config.SEED
    allow_degenerate: bool = False
