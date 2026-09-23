"""Mutationsprobe auf Trainings- und Metrikweg: Funde und ungedeckte Wachen."""
from __future__ import annotations

import pytest


def test_focal_gamma_unter_null_wird_abgelehnt():
    """Die einzige Wache gegen ein negatives `--focal-gamma` — Typer prueft es nicht.

    Unter negativem Gamma dreht sich die Modulation um: der Verlust gewichtet die LEICHTEN
    Beispiele hoch, also genau das, wogegen Focal Loss hier steht. Der Lauf liefe durch und
    die Zahl stuende als Rezept in der `config.json`.
    """
    torch = pytest.importorskip("torch")
    from chesslab.training.losses import FocalLoss

    with pytest.raises(ValueError, match="gamma"):
        FocalLoss(weight=torch.ones(2), gamma=-1.0)
    FocalLoss(weight=torch.ones(2), gamma=0.0)                # 0 ist gewichtete CE, erlaubt


def test_ein_unbekannter_coverage_weight_modus_wird_abgelehnt():
    """`--coverage-weight` ist ein freier String — die einzige Pruefung steht hier.

    Faellt sie weg, rechnet ein Tippfehler die HARTE Kante, waehrend die `config.json` den
    Tippfehler als Rezept fuehrt. Dieselbe Provenienz-Luege, die `train.py` fuer `--loss`
    ausdruecklich laut abweist.
    """
    torch = pytest.importorskip("torch")
    from chesslab.training.occlusion import coverage_weight

    cov = torch.tensor([0.0, 0.5])
    with pytest.raises(ValueError, match="coverage weight mode"):
        coverage_weight(cov, "sof")
    assert coverage_weight(cov, "hard").tolist() == [1.0, 0.0]


def test_eval_summary_meldet_eine_unmessbare_sichtmenge_nicht_als_null():
    """`eval_<split>.json` trug zwei Konventionen nebeneinander.

    `per_session` daneben sagt korrekt `None`, wenn eine Aufnahme keine benotungsfaehige Zelle
    hat; die Korpuszeile schrieb fuer dieselbe leere Menge `0,0` — und die geht woertlich in
    `model_card.json["metrics"]`, wo `ModelCard.kt` sie als gemessene Null in die Schlagzeile
    nimmt. Nichts zu messen ist nicht dasselbe wie alles falsch.
    """
    from chesslab.training.data import occupancy_piece_breakdown
    from chesslab.training.evaluate import eval_summary

    classes = ["empty", "wP"]
    bd = occupancy_piece_breakdown(classes, [], [])          # keine sichtbare Zelle
    res = {"trues": [1], "preds": [0], "board_acc": 0.0, "square_acc": None}
    s = eval_summary(res, classes, [0.0, 0.0], bd, 0.0, {}, {}, split_name="test", ds_name="d")
    assert s["visible_piece_acc"] is None
    assert s["visible_occupied_acc"] is None
    assert s["visible_type_err"] is None
    assert s["occupied_board_acc"] is None
    assert s["visible_occupied_board_acc"] is None


def test_eine_gemessene_sichtmenge_behaelt_ihre_zahl():
    """Gegenprobe zum Test darueber: der Nenner ist die einzige Bedingung, nicht der Wert."""
    from chesslab.training.data import occupancy_piece_breakdown
    from chesslab.training.evaluate import eval_summary

    classes = ["empty", "wP"]
    bd = occupancy_piece_breakdown(classes, [1, 1], [0, 1])   # eine von zwei Figuren richtig
    res = {"trues": [1, 1], "preds": [0, 1], "board_acc": 0.0, "square_acc": 0.5}
    s = eval_summary(res, classes, [0.0, 0.5], bd, 0.25, {}, {}, split_name="test", ds_name="d")
    assert s["visible_piece_acc"] == pytest.approx(0.5)
    assert s["occupied_board_acc"] == pytest.approx(0.25)
