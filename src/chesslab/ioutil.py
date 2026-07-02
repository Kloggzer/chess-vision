"""Ein einziger JSONL-Reader für alle Konsumenten im Projekt.

``read_jsonl(path) -> list[dict]`` ist das kanonische Gegenstück zu den verstreuten
``[json.loads(l) for l in ...splitlines() if l.strip()]``-Loops in labeling.py,
dataset.py, training/data.py und web/app.py. Semantik: fehlende Datei → [], leere
Zeilen werden übergangen, jede nicht-leere Zeile muss gültiges JSON sein.

Konsumenten, die bei fehlender Datei eine Exception werfen müssen (z.B.
``dataset.load_manifest``), behalten einen dünnen Wrapper.
"""

from __future__ import annotations

import json
from pathlib import Path


def read_jsonl(path: Path) -> list[dict]:
    """JSONL-Datei einlesen, fehlende Datei → [], leere Zeilen überspringen."""
    p = Path(path)
    if not p.exists():
        return []
    return [json.loads(line) for line in p.read_text(encoding="utf-8").splitlines() if line.strip()]
