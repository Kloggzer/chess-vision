"""Das Gewicht je Zelle folgt der GEMESSENEN Lesbarkeit, nicht einer harten Kante.

Gemessen 2026-09-16 auf `augval-eager-s42` gegen `real13-mix-v6-80` (val): die Figurengenauigkeit
faellt von 0,973 bei freier Sicht ueber 0,811 im Band 0,15-0,25 und 0,617 bei 0,25-0,40 auf 0,075
ab 0,6 — dort liegt sie UNTER Zufall. Die harte Kante bei 0,15 wirft also Signal weg, das noch da
ist, und die Kurve hat einen Boden, keinen Schwanz. `docs/coverage-weight-2026-09-16.md`.
"""
from __future__ import annotations

import pytest

torch = pytest.importorskip("torch")

from chesslab.training.occlusion import (  # noqa: E402
    PIECE_VISIBLE_MAX,
    OcclusionLoss,
    coverage_weight,
)


def test_hard_is_exactly_the_old_rule():
    for cov, want in [(0.0, 1.0), (0.14, 1.0), (PIECE_VISIBLE_MAX, 1.0), (0.16, 0.0), (0.9, 0.0)]:
        got = float(coverage_weight(torch.tensor([cov]), "hard")[0])
        assert got == want, f"hard bei {cov}: {got}"


def test_soft_never_gives_more_than_the_measurement_supports():
    # Die Messpunkte (Bandmitte, normierte piece_acc) aus `docs/coverage-weight-2026-09-16.md`.
    measured = [(0.010, 1.000), (0.035, 0.985), (0.075, 0.957), (0.125, 0.922),
                (0.200, 0.833), (0.325, 0.634), (0.500, 0.379)]
    for cov, acc in measured:
        w = float(coverage_weight(torch.tensor([cov]), "soft")[0])
        assert w <= acc + 1e-9, f"soft bei {cov}: {w:.3f} > gemessen {acc:.3f}"


def test_soft_is_zero_where_the_model_reads_below_chance():
    for cov in (0.60, 0.75, 0.95, 1.0):
        assert float(coverage_weight(torch.tensor([cov]), "soft")[0]) == 0.0, cov


def test_soft_keeps_what_hard_throws_away():
    # Das Band, um das es geht: bei 0,20 liest das Modell noch 83 % richtig.
    assert float(coverage_weight(torch.tensor([0.20]), "hard")[0]) == 0.0
    assert float(coverage_weight(torch.tensor([0.20]), "soft")[0]) > 0.5


def test_the_loss_takes_the_mode_and_hard_stays_bit_identical():
    torch.manual_seed(0)
    logits = torch.randn(6, 4)
    # (Klasse, Coverage, Helligkeit) — zwei Zellen ueber der Kante, eine knapp darunter.
    target = torch.tensor([[0.0, 0.00, 200.0], [1.0, 0.10, 200.0], [2.0, 0.20, 200.0],
                           [0.0, 0.35, 200.0], [1.0, 0.70, 200.0], [2.0, 0.95, 200.0]])
    weights = torch.ones(3)

    old = OcclusionLoss(weights)(logits, target)
    hard = OcclusionLoss(weights, coverage_weight_mode="hard")(logits, target)
    soft = OcclusionLoss(weights, coverage_weight_mode="soft")(logits, target)

    assert torch.allclose(old, hard), "die Vorgabe muss bitgleich zum alten Verhalten sein"
    assert not torch.allclose(soft, hard), "soft muss die Zellen ueber der Kante mitzaehlen"
