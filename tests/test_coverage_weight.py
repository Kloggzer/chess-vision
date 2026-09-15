"""Das Gewicht je Zelle folgt der GEMESSENEN Lesbarkeit, nicht einer harten Kante.

Gemessen 2026-09-16 auf `augval-eager-s42` gegen `real13-mix-v6-80`, val+test, 84 608 Zellen:
die Figurengenauigkeit faellt von 0,930 bei freier Sicht ueber 0,742 im Band 0,15-0,25 und 0,667
bei 0,25-0,40 auf 0,038 ab 0,6 — dort liegt sie UNTER Zufall. Zahlen, Vorbehalte und warum diese
Kurve und keine strengere: `docs/coverage-weight-2026-09-16.md`.
"""
from __future__ import annotations

import pytest

torch = pytest.importorskip("torch")

from chesslab.training.occlusion import (  # noqa: E402
    PIECE_VISIBLE_MAX,
    OcclusionLoss,
    coverage_weight,
)

#: (Bandmitte, normierte piece_acc, Wilson-Obergrenze, besetzte Zellen) aus der Messung.
MEASURED = [
    (0.010, 1.000, 1.003, 31929),
    (0.035, 0.934, 0.989, 106),
    (0.075, 0.900, 0.955, 147),
    (0.125, 0.909, 0.968, 116),
    (0.200, 0.799, 0.864, 163),
    (0.325, 0.717, 0.774, 273),
    (0.500, 0.335, 0.393, 302),
    (0.700, 0.041, 0.074, 262),
    (0.900, 0.008, 0.015, 1195),
]
#: Darunter ist ein Band Rauschen: die Intervalle dort sind ueber 10 Punkte breit.
ENOUGH_CELLS = 160


def _w(cov: float) -> float:
    return float(coverage_weight(torch.tensor([cov]), "soft")[0])


def test_hard_is_exactly_the_old_rule():
    for cov, want in [(0.0, 1.0), (0.14, 1.0), (PIECE_VISIBLE_MAX, 1.0), (0.16, 0.0), (0.9, 0.0)]:
        assert _w_hard(cov) == want, f"hard bei {cov}"


def _w_hard(cov: float) -> float:
    return float(coverage_weight(torch.tensor([cov]), "hard")[0])


def test_soft_stays_under_every_band_that_carries_enough_cells():
    for cov, acc, _upper, n in MEASURED:
        if n < ENOUGH_CELLS:
            continue
        assert _w(cov) <= acc + 1e-9, f"soft bei {cov}: {_w(cov):.3f} > gemessen {acc:.3f} (n={n})"


def test_on_the_thin_bands_it_stays_inside_the_confidence_interval():
    # 0,02-0,10 traegt 106 bzw. 147 besetzte Zellen. Unter den PUNKTSCHAETZER dort zu wollen hiesse,
    # gegen einen Messfehler zu optimieren: die Kurve bricht dann schon bei 0,42 ein und wirft das
    # gut gemessene Mittelfeld weg (siehe Doc, Variante B — sie liegt in der Summe UNTER `hard`).
    thin = [(cov, acc, upper) for cov, acc, upper, n in MEASURED if n < ENOUGH_CELLS]
    assert thin, "die duennen Baender sind aus der Tabelle verschwunden"
    for cov, _acc, upper in thin:
        assert _w(cov) <= upper + 1e-9, f"soft bei {cov}: {_w(cov):.3f} ueber der Obergrenze {upper:.3f}"


def test_soft_is_zero_where_the_model_reads_below_chance():
    for cov in (0.60, 0.75, 0.95, 1.0):
        assert _w(cov) == 0.0, cov


def test_soft_keeps_what_hard_throws_away():
    # Das Band, um das es geht: bei 0,20 liest das Modell noch 74 % richtig.
    assert _w_hard(0.20) == 0.0
    assert _w(0.20) > 0.5


def test_soft_gives_more_total_weight_than_hard_not_less():
    # Die Probe, an der Variante B gescheitert ist: eine Kurve, die auch unterhalb der Kante
    # Gewicht wegnimmt, ist keine Aufweichung, sondern eine Verschaerfung.
    cov = torch.linspace(0.0, 1.0, 1001)
    assert float(coverage_weight(cov, "soft").sum()) > float(coverage_weight(cov, "hard").sum())


def test_the_loss_takes_the_mode_and_hard_stays_bit_identical():
    torch.manual_seed(0)
    logits = torch.randn(6, 4)
    target = torch.tensor([[0.0, 0.00, 200.0], [1.0, 0.10, 200.0], [2.0, 0.20, 200.0],
                           [0.0, 0.35, 200.0], [1.0, 0.70, 200.0], [2.0, 0.95, 200.0]])
    weights = torch.ones(3)

    old = OcclusionLoss(weights)(logits, target)
    hard = OcclusionLoss(weights, coverage_weight_mode="hard")(logits, target)
    soft = OcclusionLoss(weights, coverage_weight_mode="soft")(logits, target)

    assert torch.allclose(old, hard), "die Vorgabe muss bitgleich zum alten Verhalten sein"
    assert not torch.allclose(soft, hard), "soft muss die Zellen ueber der Kante mitzaehlen"
