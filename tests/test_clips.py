"""Replay-Regressionstests gegen lokale Videoclips (Spec 11, Teil 3).

Nur lokal sinnvoll: `uv run pytest -m clips`. Ohne `data/testclips/` (Clips sind nicht
committet) oder ohne `erwartete_zugliste` im Manifest wird sauber geskippt. Die Clips
laufen ohne CNN (deterministisch, keine Modellabhängigkeit) und unbeschleunigt gedrosselt
nur durch die Tracker-Loop selbst.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

_ROOT = Path(__file__).resolve().parents[1]
_CLIPS = _ROOT / "data" / "testclips"
_MANIFEST = _CLIPS / "manifest.yaml"

pytestmark = pytest.mark.clips


def _entries() -> list[dict]:
    if not _MANIFEST.exists():
        return []
    data = yaml.safe_load(_MANIFEST.read_text(encoding="utf-8")) or {}
    return [e for e in data.get("clips", []) if (_CLIPS / e["file"]).exists()]


def _replay(entry: dict) -> dict:
    sys.path.insert(0, str(_ROOT / "scripts"))
    from replay_clip import replay  # noqa: PLC0415

    return replay(str(_CLIPS / entry["file"]), cnn_run=None,
                  start_fen=entry.get("start_fen"))


@pytest.mark.parametrize("entry", _entries() or [None],
                         ids=lambda e: e["file"] if e else "keine-clips")
def test_clip_erwartete_zugliste(entry):
    """Clips mit `erwartete_zugliste` im Manifest müssen exakt diese SAN-Folge liefern."""
    if entry is None:
        pytest.skip("data/testclips fehlt (Clips sind lokal, nicht committet)")
    expected = entry.get("erwartete_zugliste")
    if not expected:
        pytest.skip(f"{entry['file']}: keine erwartete_zugliste im Manifest")
    res = _replay(entry)
    assert res["history"] == list(expected), \
        f"{entry['file']}: erkannt {res['history']}, erwartet {expected}\nletzte Note: {res['note']}"
