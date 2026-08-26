"""`--balance`: gleiche Ziehungsmasse je Situation — und wahlweise je Session.

Der Korpus traegt 1 643 Situationen auf 184 735 Crops, Gruppen 13,6x ungleich. Ohne Balance
holen die groessten 10 % der Situationen 30 % aller Ziehungen — und `wK` kennt 22 Platzierungen,
die es 131-fach je Epoche sieht.
"""

from __future__ import annotations

import collections

import torch


def situation_weights(rows: list[dict], mode: str = "situation") -> list[float]:
    """Dieselbe Rechnung wie `run_train`, hier isoliert pruefbar."""
    keys = [(r["session_id"], r["square"], r["label"]) for r in rows]
    groups = collections.Counter(keys)
    w = [1.0 / groups[k] for k in keys]
    if mode == "piece":
        per = collections.Counter()
        for _sid, _sq, lab in set(keys):
            if lab != "empty":
                per[lab] += 1
        w = [x if k[2] == "empty" else x / per[k[2]] for x, k in zip(w, keys, strict=True)]
        sh = sum(1 for k in keys if k[2] == "empty") / len(keys)
        we = sum(x for x, k in zip(w, keys, strict=True) if k[2] == "empty")
        wp = sum(x for x, k in zip(w, keys, strict=True) if k[2] != "empty")
        sc = (sh / (1 - sh)) * wp / max(we, 1e-12)
        w = [x * sc if k[2] == "empty" else x for x, k in zip(w, keys, strict=True)]
    if mode == "class":
        per = collections.Counter()
        for _sid, _sq, lab in set(keys):
            per[lab] += 1
        w = [x / per[k[2]] for x, k in zip(w, keys, strict=True)]
    if mode == "session":
        per = collections.Counter()
        for sid, _sq, _lab in set(keys):
            per[sid] += 1
        w = [x / per[k[0]] for x, k in zip(w, keys, strict=True)]
    return w


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


def test_session_mode_gives_every_recording_the_same_mass():
    """Val ist eine zurueckgehaltene SESSION — Licht und Kamera sind die Achse, auf der
    generalisiert werden muss. Im Trainingssplit streuen die Anteile heute 18,8x."""
    rows = _rows({("gross", "a1", "wP"): 500, ("gross", "b2", "wP"): 500,
                  ("gross", "c3", "wN"): 500, ("klein", "d4", "wK"): 3})
    w = situation_weights(rows, mode="session")

    mass = collections.defaultdict(float)
    for r, x in zip(rows, w, strict=True):
        mass[r["session_id"]] += x
    assert round(mass["gross"], 9) == round(mass["klein"], 9) == 1.0
    # Innerhalb der grossen Session bleiben die drei Situationen untereinander gleich.
    assert round(w[0] * 500, 9) == round(w[1000] * 500, 9)


def test_class_mode_puts_the_balancing_in_the_sampler_instead_of_the_loss():
    """Gewichtete CE skaliert Gradienten; ein Sampler aendert nur, was im Batch liegt.
    Gehoert deshalb mit `--weight-cap 1` zusammen, sonst gleicht man zweimal aus."""
    rows = _rows({("s1", "a1", "empty"): 900, ("s1", "b2", "empty"): 900,
                  ("s1", "c3", "wK"): 3})
    w = situation_weights(rows, mode="class")

    mass = collections.defaultdict(float)
    for r, x in zip(rows, w, strict=True):
        mass[r["label"]] += x
    assert round(mass["empty"], 9) == round(mass["wK"], 9) == 1.0


def test_piece_mode_equalises_the_pieces_and_leaves_empty_where_it_was():
    """`class` drueckt empty von 54 % auf 7,7 % — und empty ist der Hauptlieferant sauberer
    Negativbeispiele fuer den Verdeckungskopf, dessen Precision dabei von 0,944 auf 0,680 fiel."""
    rows = _rows({("s", "a1", "empty"): 540, ("s", "b1", "wP"): 400,
                  ("s", "c1", "wK"): 60})
    w = situation_weights(rows, mode="piece")

    mass = collections.defaultdict(float)
    for r, x in zip(rows, w, strict=True):
        mass[r["label"]] += x
    total = sum(mass.values())
    assert round(mass["empty"] / total, 3) == 0.54          # unveraendert
    assert round(mass["wP"], 9) == round(mass["wK"], 9)     # Figuren untereinander gleich
