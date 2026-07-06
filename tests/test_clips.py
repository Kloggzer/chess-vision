"""Replay regression tests against local video clips (Spec 11, part 3).

Only useful locally: `uv run pytest -m clips`. Without `data/testclips/` (clips are not
committed) or without `erwartete_zugliste` in the manifest it is cleanly skipped. The clips
run without CNN (deterministic, no model dependency) and throttled without acceleration
only by the tracker loop itself.
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

    # Optional per-clip threshold overrides (`tracker:` dict in the manifest): the clips
    # were shot on a different board than the live setup the defaults are tuned for.
    # realtime: hold/recency parameters are WALL-CLOCK — an unthrottled replay
    # compresses the quiet gaps and behaves nothing like the live tracker.
    return replay(str(_CLIPS / entry["file"]), cnn_run=None, realtime=True,
                  start_fen=entry.get("start_fen"),
                  tracker_kwargs=entry.get("tracker") or {})


@pytest.mark.parametrize("entry", _entries() or [None],
                         ids=lambda e: e["file"] if e else "no-clips")
def test_clip_erwartete_zugliste(entry):
    """Clips with `erwartete_zugliste` in the manifest must produce exactly this SAN sequence."""
    if entry is None:
        pytest.skip("data/testclips missing (clips are local, not committed)")
    expected = entry.get("erwartete_zugliste")
    if not expected:
        pytest.skip(f"{entry['file']}: no expected move list in manifest")
    if entry.get("marker") is False:
        pytest.skip(f"{entry['file']}: without ArUco markers — waiting for markerless "
                    f"board detection (specs/rework/11-markerless-board-detection.md)")
    res = _replay(entry)
    assert res["history"] == list(expected), \
        f"{entry['file']}: found {res['history']}, expected {expected}\nlast note: {res['note']}"
