"""Zu dunkle Zellen: das Label stimmt, das Bild traegt nichts. Sie bleiben im Batch — sonst
verliert ein Brettmodell das ganze Brett — und fallen nur aus dem KLASSENverlust."""

import torch

from chesslab.cell_rule import CELL_DARK_MIN
from chesslab.training.occlusion import OcclusionLoss, split_targets


def _loss(dark_min=0.0):
    return OcclusionLoss(torch.ones(13), dark_min=dark_min)


def _target(cls, cov, bright):
    return torch.tensor([[float(cls), float(cov), float(bright)]])


def test_two_columns_still_mean_every_cell_is_bright():
    """Alte Packs ohne `brightness` muessen Zahl fuer Zahl dasselbe ergeben."""
    y, cov, bright = split_targets(torch.tensor([[3.0, 0.4]]))
    assert int(y) == 3 and round(float(cov), 4) == 0.4 and float(bright) == 255.0


def test_a_dark_cell_carries_no_class_gradient():
    logits = torch.zeros(1, 14, requires_grad=True)
    _loss(dark_min=25.0)(logits, _target(3, 0.0, 10.0)).backward()
    # Nur der Coverage-Ausgang (letzte Spalte) darf sich bewegen — die Klassen nicht.
    assert torch.equal(logits.grad[:, :-1], torch.zeros(1, 13))
    assert logits.grad[:, -1].abs().sum() > 0


def test_the_same_cell_trains_when_it_is_bright_enough():
    logits = torch.zeros(1, 14, requires_grad=True)
    _loss(dark_min=25.0)(logits, _target(3, 0.0, 90.0)).backward()
    assert logits.grad[:, :-1].abs().sum() > 0


def test_darkness_is_not_occlusion():
    """Dunkelheit in die Coverage zu falten waere bequem und wuerde die Hand-Sperre der App
    kaputtmachen — der Coverage-Kopf muss die dunkle Zelle als UNVERDECKT lernen."""
    logits = torch.zeros(1, 14, requires_grad=True)
    _loss(dark_min=25.0)(logits, _target(3, 0.0, 10.0)).backward()
    # Gradient positiv = der Schritt zieht das Coverage-Logit NACH UNTEN, also Richtung
    # "unverdeckt". Genau das soll eine dunkle, aber freie Zelle lehren.
    assert logits.grad[0, -1] > 0


def test_a_pack_without_brightness_keeps_training_every_cell():
    """Die Schwelle steht auf 25, wirkt aber erst mit einem Slice, der `brightness` schreibt —
    sonst haetten alle vorhandenen Packs still eine andere Trainingsmenge."""
    assert CELL_DARK_MIN == 25.0
    logits = torch.zeros(1, 14, requires_grad=True)
    OcclusionLoss(torch.ones(13))(logits, torch.tensor([[3.0, 0.0]])).backward()
    assert logits.grad[:, :-1].abs().sum() > 0
