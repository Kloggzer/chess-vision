"""`matte.jsonl` lesen — die EINE Stelle fuer die Historie-Regel (Punkt 28).

Die Datei ist eine Historie: je Frame gilt die juengste Zeile, und eine Zeile ohne `coverage` ist
SAMs Absage, keine Messung. Ohne cv2/numpy, damit `labeling` es ohne Importzyklus nutzen kann.
"""
from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path

from ..ioutil import read_jsonl
from .names import matte_path


def read_rows(session_dir: Path) -> list[dict]:
    """Die rohe Historie, leer ohne Datei."""
    return read_jsonl(matte_path(session_dir))


def effective_rows(rows: Iterable[dict]) -> dict[str, dict]:
    """Je Frame die WIRKSAME Zeile — die juengste. Punkt 28 gilt je FRAME, nicht je ZEILE.

    Eine Zeile ohne `frame` ist Schaden, keine Luecke: still uebersprungen hiesse ungemessen als erledigt.
    """
    out: dict[str, dict] = {}
    for row in rows:
        if not row.get("frame"):
            raise ValueError(f"matte.jsonl: Zeile ohne `frame`: {row!r}")
        out[row["frame"]] = row
    return out


def measured_coverage(rows: Iterable[dict]) -> dict[str, dict]:
    """Die wirksamen Zeilen, die wirklich eine Messung tragen — `coverage is None` ist SAMs Absage."""
    return {frame: row for frame, row in effective_rows(rows).items()
            if row.get("coverage") is not None}


def read_matte(session_dir: Path, *, skip_sources: tuple[str, ...] = ()) -> dict[str, dict[str, float]]:
    """`frame stem -> square -> coverage`; ein ungemessenes Frame hat keinen Eintrag.

    `skip_sources` nimmt Zeilen VOR der Historie heraus — so sieht `sam_matte` nur SAMs eigene.
    """
    rows = (row for row in read_rows(session_dir) if row.get("source") not in skip_sources)
    return {frame: row["coverage"] for frame, row in measured_coverage(rows).items()}
