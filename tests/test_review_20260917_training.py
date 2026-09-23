"""Gegenlesen der Trainings-Aenderungen vom 2026-09-17: Null-Regel in `run_train`, Loader-Tests."""
from __future__ import annotations

import inspect
import re

import pytest

torch = pytest.importorskip("torch")

from chesslab.cell_rule import coverage_of  # noqa: E402
from chesslab.training import train_recipe as train_mod  # noqa: E402
from chesslab.training.occlusion import PIECE_VISIBLE_MAX  # noqa: E402

NULL_ROW = {"label": "wP", "path": "p0", "coverage": None, "brightness": None}


def test_the_class_weight_count_survives_a_null_coverage():
    """Vierte Stelle derselben Null-Regel — und die einzige im REZEPT-Pfad.

    Die Gewichte landen in `split.json`; ein ausgeschriebenes `null` warf hier `TypeError` kurz
    vor dem Training. Seit 2026-09-22 zaehlt `visible_class_counts` ueber
    `classification_eligible` statt inline ueber `coverage_of` — also ueber GENAU die Zellmenge,
    die der Verlust gewichtet. Die Regel wurde damit strenger, nicht loser, und die Pruefung
    fragt jetzt das Verhalten statt den Quelltext von `run_train`.
    """
    raw = re.search(r'r\.get\("coverage"[^)]*\) <= PIECE_VISIBLE_MAX',
                    inspect.getsource(train_mod))
    assert raw is None, f"roher Zugriff zurueck: {raw.group(0)}"

    assert coverage_of(NULL_ROW) <= PIECE_VISIBLE_MAX
    # Eine `null`-Zeile darf die Zaehlung nicht kippen und zaehlt als sichtbar mit.
    assert train_mod.visible_class_counts([NULL_ROW]) == {"wP": 1}


def test_the_packed_square_loader_itself_reads_a_null_row(monkeypatch):
    """Diskriminierend, anders als `test_the_packed_loaders_build_their_columns_from_a_null_row`:
    der Loader wird GEBAUT. Mit dem alten `float(r.get(...))` stirbt genau das hier.
    """
    import numpy as np

    from chesslab.training import torch_data as td

    monkeypatch.setattr(td, "_pack_index",
                        lambda rows, packed: ([("f", (1, 1, 1, 3))],
                                              np.zeros((len(rows), 2), dtype=np.int64)))
    ds = td.PackedSquareDataset([NULL_ROW], ["wP", "empty"], None, packed=object())

    assert float(ds.cover[0]) == 0.0
    assert float(ds.bright[0]) == 255.0


def test_the_packed_board_loader_itself_reads_a_null_row(monkeypatch):
    import numpy as np

    from chesslab.training import torch_data as td

    rows = [dict(NULL_ROW, session_id="s", frame="1", square=f"{f}{r}")
            for r in range(1, 9) for f in "abcdefgh"]
    monkeypatch.setattr(td, "_pack_index",
                        lambda r, packed: ([("f", (1, 1, 1, 3))],
                                           np.zeros((len(r), 2), dtype=np.int64)))
    ds = td.PackedBoardDataset(rows, ["wP", "empty"], None, packed=object())

    assert float(ds.cover.flat[0]) == 0.0
    assert float(ds.bright.flat[0]) == 255.0
