"""`--balance-situations`: gleiche Ziehungsmasse je (Session, Feld, Klasse), nicht je Crop.

Der Korpus traegt 1 643 Situationen auf 184 735 Crops, Gruppen 13,6x ungleich. Ohne Balance
holen die groessten 10 % der Situationen 30 % aller Ziehungen — und `wK` kennt 22 Platzierungen,
die es 131-fach je Epoche sieht.
"""

from __future__ import annotations

import collections

import torch


def situation_weights(rows: list[dict]) -> list[float]:
    """Dieselbe Rechnung wie `run_train`, hier isoliert pruefbar."""
    groups = collections.Counter((r["session_id"], r["square"], r["label"]) for r in rows)
    return [1.0 / groups[(r["session_id"], r["square"], r["label"])] for r in rows]


def _rows(spec: dict[tuple[str, str, str], int]) -> list[dict]:
    return [{"session_id": s, "square": q, "label": lab}
            for (s, q, lab), n in spec.items() for _ in range(n)]


def test_every_situation_carries_the_same_mass_however_many_frames_it_has():
    rows = _rows({("s1", "a1", "wK"): 200, ("s1", "b2", "wQ"): 5, ("s2", "c3", "wP"): 45})
    w = situation_weights(rows)

    mass = collections.defaultdict(float)
    for r, x in zip(rows, w, strict=True):
        mass[(r["session_id"], r["square"], r["label"])] += x
    assert {round(v, 9) for v in mass.values()} == {1.0}


def test_a_frequent_situation_loses_exactly_its_surplus():
    rows = _rows({("s1", "a1", "wK"): 100, ("s1", "b2", "wK"): 1})
    w = situation_weights(rows)
    # 100 Frames derselben Situation ziehen zusammen so oft wie der eine Frame der anderen.
    assert w[0] == 0.01 and w[-1] == 1.0


def test_the_sampler_draws_the_rare_situation_about_half_the_time():
    rows = _rows({("s1", "a1", "wK"): 999, ("s1", "b2", "wQ"): 1})
    sampler = torch.utils.data.WeightedRandomSampler(
        torch.tensor(situation_weights(rows), dtype=torch.double), 2000,
        replacement=True, generator=torch.Generator().manual_seed(0))
    rare = sum(1 for i in sampler if i == len(rows) - 1)
    assert 0.4 < rare / 2000 < 0.6      # ohne Balance waeren es 0,1 %
