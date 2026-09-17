"""Metrik-Jagd 2026-09-17: drei Zahlen, die ihren Namen nicht halten.

Gemessen an den echten Laeufen unter `data/models/` und am Manifest von
`real13-mix-v7-128` (979 363 Zeilen): 12,43 % der Zellen sind nicht benotungsfaehig
(`classification_eligible`), und 55,22 % der Bretter tragen mindestens eine solche Zelle.
Wo zwei Namen ueber verschiedene Zellmengen rechnen, ist das der Abstand.
"""
from __future__ import annotations

import pytest

from chesslab.training.data import board_accuracy, checkpoint_metrics, per_session_metrics
from chesslab.training.train import _checkpoint_rank

CLASSES = ["wP", "empty"]


def _rows():
    # Eine sichtbare Zelle (richtig) und eine verdeckte (falsch) auf DEMSELBEN Brett.
    return [{"session_id": "s", "frame": "1", "square": "e4", "label": "wP", "coverage": 0.0},
            {"session_id": "s", "frame": "1", "square": "d4", "label": "wP", "coverage": 0.9}]


@pytest.mark.xfail(strict=True, reason=(
    "`train.py` schreibt `val_checkpoint_score: score[0]`, und `score` ist `_checkpoint_rank`, "
    "also `visible_piece_acc` — nicht der gewichtete Score aus CHECKPOINT_WEIGHTS. Gemessen: "
    "30 Laeufe unter data/models/ tragen den Schluessel in 1290 Epochenzeilen, ALLE noch mit "
    "der ALTEN Bedeutung (gewichteter Score, Median 0,163 ueber visible_piece_acc auf "
    "real13-ms-s2-bn80-bs256-swa1e4). Ein Fix aendert entweder den Namen oder die Zahl — "
    "Entscheidung des Nutzers, darum nur benannt."))
def test_val_checkpoint_score_is_the_weighted_checkpoint_score():
    rows, trues, preds = _rows(), [0, 0], [0, 1]
    (score, _, _), bd = checkpoint_metrics(rows, CLASSES, trues, preds, auroc=0.8)
    written = _checkpoint_rank(bd, 0.8)[0]

    assert written == pytest.approx(score)


@pytest.mark.xfail(strict=True, reason=(
    "`eval_*.json` traegt `board_acc` KORPUSWEIT (jede Zelle, aus `evaluate_dataset`) und "
    "`per_session[<sid>]['board_acc']` nur ueber die benotungsfaehigen Zellen — derselbe Name, "
    "zwei Grundgesamtheiten in EINER Datei, und `session_spread` meldet die zweite unter "
    "demselben unqualifizierten Namen. Auf real13-mix-v7-128 tragen 55,22 % der Bretter "
    "mindestens eine verworfene Zelle. Ein Fix aendert die Zahl in jeder `eval_*.json`."))
def test_per_session_board_acc_is_the_same_population_as_the_corpus_number():
    rows, trues, preds = _rows(), [0, 0], [0, 1]
    corpus = board_accuracy([((r["session_id"], str(r["frame"])), t == p)
                             for r, t, p in zip(rows, trues, preds, strict=True)])
    per_session = per_session_metrics(rows, CLASSES, trues, preds)["s"]["board_acc"]

    assert per_session == pytest.approx(corpus)


def test_the_swa_line_is_measured_against_the_same_quantity_as_best_pt():
    """`best_score` ist `_checkpoint_rank`, der SWA-Vergleich nahm `checkpoint_metrics`.

    Zwei verschiedene Tupel unter einem Vergleich: auf real13-ms-s2-bn80-bs256-swa1e4 liegt
    der gewichtete Score im Median 0,163 ueber `visible_piece_acc` (Spanne 0,133 bis 0,231),
    swa.pt sah also konstruktionsbedingt besser aus als best.pt.
    """
    rows, trues, preds = _rows(), [0, 0], [0, 1]
    (weighted, _, _), bd = checkpoint_metrics(rows, CLASSES, trues, preds, auroc=0.8)
    rank = _checkpoint_rank(bd, 0.8)

    assert rank[0] != pytest.approx(weighted)
    assert rank[0] == pytest.approx(bd["visible_piece_acc"])
