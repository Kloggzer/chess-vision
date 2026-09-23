"""The sweep scores an identity model the way the tracker reads it: P(occupied) as in
`serving.observation_from_probs` (specs/29, phase 00)."""

from __future__ import annotations

import pytest

from chesslab import config
from chesslab.dataset_build import class_list_for, collapse_labels
from chesslab.serving import observation_from_probs
from conftest import load_script


@pytest.fixture(scope="module")
def sweep():
    return load_script("sweep_infer_size")


def _vector(classes: list[str], mass: dict[str, float]) -> list[float]:
    """A softmax row over `classes`; unnamed classes share what is left."""
    rest = [c for c in classes if c not in mass]
    fill = (1.0 - sum(mass.values())) / len(rest) if rest else 0.0
    return [mass.get(c, fill) for c in classes]


def test_pocc_matches_the_python_original(sweep):
    """P(occupied) is `cnn_recovery.observation_from_probs`'s, not a second opinion."""
    for classes in (config.IDENTITY_CLASSES, config.CLASSES):
        read = sweep.occupancy_reader({"classes": classes})
        for mass in ({"empty": 0.80, "wP": 0.11},
                     {"empty": 0.02, "bK": 0.93},
                     {"empty": 0.49, "wQ": 0.44},
                     {"empty": 0.0, "occluded": 0.97} if "occluded" in classes else {"empty": 0.5}):
            probs = _vector(classes, mass)
            obs = observation_from_probs({"a1": probs}, classes)
            p_occ, occupied = read(probs)
            assert p_occ == pytest.approx(obs.p_occ["a1"], abs=1e-9)
            assert occupied is obs.occupied("a1")


def test_unscoreable_run_is_refused(sweep):
    with pytest.raises(SystemExit):
        sweep.occupancy_reader({"classes": ["dark", "light"]})


def test_thirteen_class_list_is_derived():
    """The 13-class list is `config.CLASSES` minus `occluded` — an expression, not a copy."""
    # Spelled out, not restated as the comprehension in config.py: an assertion that repeats the
    # implementation holds for ANY value of CLASSES and so cannot catch the failure this pins —
    # a reorder of the canonical list, which silently relabels every crop and every model asset
    # (`Preprocess.requireExpectedClasses` refuses a model whose order differs).
    assert config.IDENTITY_CLASSES == [
        "empty",
        "wP", "wN", "wB", "wR", "wQ", "wK",
        "bP", "bN", "bB", "bR", "bQ", "bK",
    ]
    assert class_list_for("pieces13") is config.IDENTITY_CLASSES
    assert len(config.IDENTITY_CLASSES) == 13
    assert "occluded" not in config.IDENTITY_CLASSES
    # order preserved, and the canonical list untouched by the derivation
    assert config.CLASSES[:13] == config.IDENTITY_CLASSES
    assert class_list_for("pieces") is config.CLASSES


def test_pieces13_keeps_identity_and_drops_occluded():
    rows = [{"label": "wP"}, {"label": "empty"}, {"label": "occluded"}, {"label": "bK"}]
    out = collapse_labels(rows, "pieces13")
    assert [r["label"] for r in out] == ["wP", "empty", "bK"]
    assert collapse_labels(rows, "pieces") is rows      # the wide mode is a no-op, same objects
    with pytest.raises(ValueError, match="unknown class mode"):
        collapse_labels(rows, "occupancy")


def test_a_pool_without_occluded_says_nothing(capsys):
    """The drop is printed; NOT dropping must stay silent, or the line means nothing."""
    collapse_labels([{"label": "empty"}], "pieces13")
    assert capsys.readouterr().out == ""
