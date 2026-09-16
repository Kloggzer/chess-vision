"""Ein nicht lesbares Brett ist KEIN schwarzes Brett.

`BoardSet.__getitem__` ersetzte es durch Nullen und behielt Label und Coverage — der Schueler
lernte damit "schwarz heisst Hand" auf Bildern, die es nie gab. Dieselbe Klasse wie SAMs Absage,
die als sauberes Brett gelesen wurde. Gemessen 2026-09-16: 0 von 11 647 Brettern fehlen, das
Abweisen kostet also nichts und schliesst die Falle.
"""

from __future__ import annotations

import numpy as np
import pytest

from chesslab import config
from chesslab.hand_gate import BoardSet


def test_a_board_that_cannot_be_read_is_refused(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    rows = [{"board": "r1/boards/000001.webp", "hand": 1, "coverage": [0.0] * 64}]

    with pytest.raises(FileNotFoundError, match="000001"):
        BoardSet(rows, size=64, train=True)[0]


def test_a_readable_board_still_comes_through(tmp_path, monkeypatch) -> None:
    import cv2

    paths = config.Paths(root=tmp_path / "data")
    monkeypatch.setattr(config, "DATA", paths)
    board = paths.recordings / "r1" / "boards"
    board.mkdir(parents=True)
    cv2.imwrite(str(board / "000001.webp"), np.full((80, 80, 3), 120, np.uint8))

    x, target = BoardSet([{"board": "r1/boards/000001.webp", "hand": 1, "coverage": [0.0] * 64}],
                         size=64, train=False)[0]

    assert tuple(x.shape) == (3, 64, 64)
    assert float(target[0]) == 1.0
