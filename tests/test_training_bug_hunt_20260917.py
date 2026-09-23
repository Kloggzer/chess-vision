"""Funde in `src/chesslab/training/`: `coverage-weight` in `config.json`, `null`-Coverage
in den gepackten Loadern, Zufallsfolge des Spender-Pools."""
from __future__ import annotations

import pytest

torch = pytest.importorskip("torch")

from chesslab.cell_rule import brightness_of, coverage_of  # noqa: E402
from chesslab.training.occlusion import (  # noqa: E402
    PIECE_VISIBLE_MAX,
    classification_eligible,
    coverage_weight,
)
from chesslab.training.torch_data import _target  # noqa: E402
from chesslab.training.train_recipe import _occlusion_provenance  # noqa: E402

# --- Fund 1: die Provenienz nannte den Verlust nicht ---------------------------------------

def test_config_tells_hard_from_soft():
    hard = _occlusion_provenance(True, 0.15, 25.0, "hard")
    soft = _occlusion_provenance(True, 0.15, 25.0, "soft")
    assert hard != soft, ("hard und soft sind zwei verschiedene Verluste und sahen in der "
                          "config.json gleich aus — Laeufe waren nicht auseinanderzuhalten")
    assert hard["coverage_weight"] == "hard" and soft["coverage_weight"] == "soft"


def test_soft_does_not_claim_a_visible_max_it_never_applied():
    # Der Beweis, dass die Zahl unter `soft` nichts tut: zwei verschiedene Kanten, ein Gewicht.
    cov = torch.linspace(0.0, 1.0, 101)
    assert torch.equal(coverage_weight(cov, "soft", 0.15), coverage_weight(cov, "soft", 0.40))
    assert _occlusion_provenance(True, 0.40, 25.0, "soft")["visible_max"] is None
    assert _occlusion_provenance(True, 0.40, 25.0, "hard")["visible_max"] == 0.40


def test_a_run_without_the_occlusion_head_carries_none():
    assert _occlusion_provenance(False, None, None, "hard") == {
        "visible_max": None, "dark_min": None, "coverage_weight": None}


# --- Fund 2: EINE Lesart fuer `null` ------------------------------------------------------

NULL_ROW = {"label": "wP", "coverage": None, "brightness": None}


def test_null_reads_the_same_everywhere():
    # `None` ist UNGEMESSEN; die gepackten Loader riefen `float(r.get(..., default))` und starben
    # daran.
    assert coverage_of(NULL_ROW) == 0.0
    assert brightness_of(NULL_ROW) == 255.0
    assert classification_eligible(NULL_ROW) is True
    t = _target(0, NULL_ROW)
    assert (float(t[1]), float(t[2])) == (0.0, 255.0)


def test_the_packed_loaders_build_their_columns_from_a_null_row():
    import numpy as np

    # Genau der Ausdruck, an dem beide gepackten Datensaetze standen — er warf einen TypeError,
    # waehrend der Datei-Loader daneben 0,0/255,0 lieferte.
    cover = np.array([coverage_of(NULL_ROW)], dtype=np.float32)
    bright = np.array([brightness_of(NULL_ROW)], dtype=np.float32)
    assert not np.isnan(cover).any() and not np.isnan(bright).any()
    assert float(bright[0]) >= 25.0, "eine ungemessene Zelle darf nicht als zu dunkel gelten"


def test_absent_and_null_agree():
    absent = {"label": "wP"}
    assert (coverage_of(absent), brightness_of(absent)) == (coverage_of(NULL_ROW),
                                                            brightness_of(NULL_ROW))


def test_measured_values_still_win_over_the_default():
    # Die Gegenprobe zur Null-Regel: eine gemessene 0,0 bzw. 0,0-Helligkeit bleibt gemessen.
    assert brightness_of({"brightness": 0.0}) == 0.0
    assert classification_eligible({"brightness": 0.0, "coverage": 0.0}) is False
    assert coverage_of({"coverage": 0.9}) == 0.9
    assert classification_eligible({"coverage": 0.9, "brightness": 200.0}) is False
    assert classification_eligible({"coverage": PIECE_VISIBLE_MAX, "brightness": 200.0}) is True


# --- Fund 3: der Spender-Pool zieht immer -------------------------------------------------

@pytest.mark.xfail(strict=True, reason=(
    "PackedSquareDataset zieht seinen Spender-Pool mit `random.sample` auch bei "
    "neighbour_p == 0 — jeder Val-Datensatz verschiebt damit die Zufallsfolge des Laufs. "
    "Der Fix (Ziehung hinter `neighbour_p > 0`) AENDERT genau diese Folge und macht Laeufe "
    "mit dem Archiv unvergleichbar: Rezept-Entscheidung, kein Fix."))
def test_building_a_dataset_without_neighbour_paste_draws_no_randomness():
    import inspect
    import random

    from chesslab.training.torch_data import PackedSquareDataset

    src = inspect.getsource(PackedSquareDataset.__init__)
    assert "random.sample" in src, "der Pool wird nicht mehr gezogen — Test anpassen"
    random.seed(7)
    before = random.getstate()
    random.sample([(0, i) for i in range(1000)], 512)
    assert random.getstate() == before, ("der Aufbau des Pools verbraucht Zufall, obwohl "
                                         "neighbour_p == 0 ihn nie liest")
