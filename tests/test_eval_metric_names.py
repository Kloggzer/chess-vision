"""Die unqualifizierten Namen in `eval_*.json` muessen korpusweit sein — sonst luegen sie.

`board_acc` im selben Dict IST korpusweit, `piece_acc` und `occupied_acc` waren bitgleich mit
ihren `visible_*`-Zwillingen. Und `eval_test.json` geht woertlich in `model_card.json["metrics"]`:
wer `piece_acc` als korpusweit liest, liegt falsch — genau der Fehler, den CLAUDE.md 2026-08-26
schon einmal korrigiert hat.
"""
from __future__ import annotations

import json

import pytest

torch = pytest.importorskip("torch")


def test_the_corpus_wide_names_differ_from_the_visible_only_twins(tmp_path, monkeypatch):
    from chesslab.training import evaluate

    # Zwei Zeilen: eine sichtbar und richtig, eine VERDECKT und falsch. Korpusweit muss das
    # schlechter aussehen als sichtbar-gemessen — sonst rechnen beide Namen dasselbe.
    classes = ["wP", "empty"]
    rows = [{"label": "wP", "coverage": 0.0, "session_id": "s", "square": "e4"},
            {"label": "wP", "coverage": 0.9, "session_id": "s", "square": "d4"}]
    res = {"trues": [0, 0], "preds": [0, 1], "conf": [0.9, 0.9],
           "classification_eligible": [True, False],
           "board_acc": 0.5, "square_acc": 0.5, "rows": rows, "classes": classes}

    bd = {"piece_acc": 1.0, "occupied_acc": 1.0, "type_err": 0.0, "color_err": 0.0}
    summary = evaluate.eval_summary(res, classes, [1.0, 1.0], bd, 0.5, {}, {},
                                    split_name="test", ds_name="d")

    assert summary["visible_piece_acc"] == pytest.approx(1.0)
    assert summary["piece_acc"] < summary["visible_piece_acc"], (
        f"korpusweit muss die verdeckte Fehlzeile zaehlen: {summary['piece_acc']} "
        f"gegen {summary['visible_piece_acc']}")
    json.dumps(summary)
