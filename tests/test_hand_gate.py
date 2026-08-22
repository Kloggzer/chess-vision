"""Der Hand-Gate: SAM 3 destilliert auf den eigenen Aufbau — Lehrer-Urteil, Raster, Schwellen."""

import numpy as np
import pytest

from chesslab.hand_gate import (
    GATE_AREA_MIN,
    coverage_report,
    gate_label,
    grid_to_squares,
    pick_threshold,
    sweep_thresholds,
)
from chesslab.labeling import all_squares


def _row(concepts: dict, coverage: dict) -> dict:
    return {"frame": "000007", "concepts": concepts, "coverage": coverage}


def test_the_teacher_says_hand_only_with_a_concept_AND_area():
    """Ein Konzept ohne Fläche ist eine verworfene Box, Fläche ohne Konzept ein Maskenrand."""
    assert gate_label(_row({"person": 0.9}, {"e4": 0.8, "e5": 0.4})) is True
    assert gate_label(_row({}, {})) is False
    assert gate_label(_row({"person": 0.9}, {})) is None
    assert gate_label(_row({}, {"h1": 0.4})) is None


def test_the_uncertain_strip_is_no_teacher():
    """Knapp unter der Flächenschwelle wird nicht geraten, sondern ausgelassen."""
    assert gate_label(_row({"person": 0.9}, {"a1": GATE_AREA_MIN - 0.01})) is None
    assert gate_label(_row({"person": 0.9}, {"a1": GATE_AREA_MIN + 0.01})) is True


def test_the_grid_lands_on_the_right_squares():
    """Die riskanteste Stelle: Bildzeile 0 ist Reihe 8, `all_squares()` beginnt bei a1.

    Ein Kippfehler verschiebt jede Coverage um bis zu sieben Reihen und fiele nie auf — die Zahlen
    blieben plausibel, nur auf den falschen Feldern.
    """
    torch = pytest.importorskip("torch")
    grid = torch.zeros(1, 1, 8, 8)
    grid[0, 0, 0, 0] = 1.0                      # oben links im Bild = a8
    grid[0, 0, 7, 7] = 2.0                      # unten rechts = h1

    flat = grid_to_squares(grid)[0]

    assert float(flat[all_squares().index("a8")]) == 1.0
    assert float(flat[all_squares().index("h1")]) == 2.0
    assert float(flat.sum()) == 3.0, "und sonst nichts"


def test_the_veto_threshold_is_picked_for_recall_not_for_balance():
    """Ein Fehlalarm kostet ein Brett von zwölf, eine verpasste Hand einen Frame im Datensatz."""
    rows = [{"thr": 0.2, "recall": 1.0, "false_pos": 40, "clean_lost": 0.04},
            {"thr": 0.6, "recall": 1.0, "false_pos": 4, "clean_lost": 0.004},
            {"thr": 0.9, "recall": 0.97, "false_pos": 1, "clean_lost": 0.001}]
    assert pick_threshold(rows, 1.0)["thr"] == 0.6, "die HÖCHSTE Schwelle, die den Recall hält"
    assert pick_threshold(rows, 0.95)["thr"] == 0.9
    assert pick_threshold(rows, 1.01)["thr"] == 0.2, "unerfüllbar -> die mildeste, nicht keine"


def test_a_perfect_student_and_a_blind_one():
    """`sweep_thresholds` zählt gegen die Hand, `coverage_report` gegen `PIECE_VISIBLE_MAX`."""
    table = sweep_thresholds([0.9, 0.1, 0.8], [True, False, True], steps=11)
    assert next(r for r in table if r["thr"] == 0.5) == {
        "thr": 0.5, "recall": 1.0, "false_pos": 0, "clean_lost": 0.0}

    said = np.zeros((2, 65), np.float32)
    truth = np.zeros((2, 65), np.float32)
    truth[0, 1 + all_squares().index("e4")] = 0.9
    said[0, 1 + all_squares().index("e4")] = 0.8
    said[1, 1 + all_squares().index("a1")] = 0.7          # eine erfundene Verdeckung
    report = coverage_report(said.tolist(), truth.tolist())
    assert report["cells_over"] == 1
    assert report["recall"] == 1.0
    assert report["precision"] == 0.5
