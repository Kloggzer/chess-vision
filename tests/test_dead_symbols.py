"""Zwei Symbole, die am 2026-09-14 niemand las, bleiben entfernt.

`Recording._frame_counts` hatte null Aufrufer — `_locate` sondiert selbst lazy. `CaptureSession`
wurde nie gebaut und nie annotiert; `CaptureStep` lebte nur, weil `CaptureSession` es nannte, war
also transitiv mit tot. Die Autorität über die Form von `capture.json` ist ohnehin
`docs/capture-session.schema.json`, nicht ein TypedDict, das keiner benutzt.
"""
from __future__ import annotations

import pytest

#: (Modul, Name) — entfernt, weil kein Leser existierte.
REMOVED = [
    ("chesslab.recording", "Recording", "_frame_counts"),
    ("chesslab.capture_plan", None, "CaptureSession"),
    ("chesslab.capture_plan", None, "CaptureStep"),
]


@pytest.mark.parametrize(("module", "owner", "name"),
                         REMOVED, ids=[f"{o or m.split('.')[-1]}-{n}" for m, o, n in REMOVED])
def test_the_removed_symbol_stays_removed(module, owner, name):
    import importlib

    mod = importlib.import_module(module)
    holder = getattr(mod, owner) if owner else mod

    assert not hasattr(holder, name), (
        f"{name} ist zurück. Es hatte keinen Leser; wer es wiederbelebt, bringt den Leser mit.")
