"""`_persistent` verlangt, dass DIESELBE Zelle weiter abweicht, nicht irgendeine."""
from __future__ import annotations

import numpy as np

from chesslab.framescan import _persistent

THR = 50.0


def _row(idx: int, hot: int | None):
    cells = [0.0] * 64
    if hot is not None:
        cells[hot] = 100.0
    return {"idx": idx, "cells": cells}


def test_a_flicker_on_changing_cells_is_not_a_persistent_change():
    """Der Vertrag: jede zurueckgegebene Zelle weicht von `hit` bis zum Ende in JEDEM Frame ab.

    `all(off[j] …)` prueft bei Mengen nur auf nicht-leer, also erfuellten zwei abwechselnd
    flackernde Zellen die Bedingung gemeinsam — und `classify` erklaerte den Rest des Intervalls
    zu `stale`/`changed`. Ein einzelner SCHLUSSFRAME haelt trivial durch und kostet einen Frame;
    das ist kein Fehler und war immer so.
    """
    # Frame 1 weicht auf Zelle 5 ab, Frame 2 auf Zelle 9, Frame 3 wieder auf 5.
    quiet = [_row(0, None), _row(1, 5), _row(2, 9), _row(3, 5)]

    hit, cells = _persistent(quiet, np.zeros(64, np.float32), THR, list(range(64)))

    assert hit != 1, (
        f"cells 5 and 9 take turns, so nothing deviates from frame 1 to the end — "
        f"_persistent still declared a persistent change there over {sorted(cells)}")
    if hit is not None:
        off = {r["idx"]: {c for c in range(64) if r["cells"][c] >= THR} for r in quiet}
        for i in [r["idx"] for r in quiet if r["idx"] >= hit]:
            assert cells <= off[i], f"{sorted(cells - off[i])} matches the board again at {i}"
