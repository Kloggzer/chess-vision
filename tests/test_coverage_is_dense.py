"""Eine `coverage` traegt IMMER alle 64 Felder — ein fehlendes Feld heisst nie "ungemessen".

`coverage_of` zippt `all_squares()` mit den Masken unter `strict=True`, kann also gar nichts
auslassen. Ohne diese Zusage muesste jeder Leser raten, was ein fehlendes Feld bedeutet, und
`scripts/occlusion_gate.py` filtert seine Wahrheit genau darueber (`.get(square) is None`).
Nachgezaehlt am Korpus 2026-09-16: 9 386 Zeilen, jede mit 64 Feldern.
"""

from __future__ import annotations

import numpy as np

from chesslab.labeling import all_squares
from chesslab.matte import coverage_of


def test_every_square_gets_a_number_even_on_an_empty_alpha(small_profile) -> None:
    size = small_profile.board_size
    alpha = np.zeros((size, size), np.float32)
    entry = {"corners": [[0.0, 0.0], [float(size), 0.0],
                         [float(size), float(size)], [0.0, float(size)]]}

    cov = coverage_of(alpha, entry, small_profile)

    assert sorted(cov) == sorted(all_squares())
    assert set(cov.values()) == {0.0}, "leeres Alpha heisst gemessen und frei, nicht ungemessen"
