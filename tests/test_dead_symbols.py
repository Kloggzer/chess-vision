"""Entfernte tote Symbole (`Recording._frame_counts`, `CaptureSession`) bleiben entfernt."""
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
