"""The sweep must score an identity model the way the TRACKER reads one (specs/29, phase 00).

`scripts/sweep_infer_size.py` is the measurement of record. It used to refuse any run whose
classes were not exactly `["empty", "occupied"]`, which made a 13-class candidate unmeasurable.
The extension is only allowed to be the definition that already exists twice — `cnn_recovery`
and its Kotlin port — because a metric that disagrees with the tracker measures a model nobody
runs. These tests pin that, and pin that the 2-class path did not move.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

from chesslab import config
from chesslab.dataset_build import class_list_for, collapse_labels
from chesslab.move_tracker.cnn_recovery import observation_from_probs

_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="module")
def sweep():
    spec = importlib.util.spec_from_file_location("sweep_infer_size",
                                                  _ROOT / "scripts" / "sweep_infer_size.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


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


def test_two_class_path_unchanged(sweep):
    """The occupancy branch reads the `occupied` column verbatim and its verdict is the argmax.

    This is what produced every row in `data/_perf/*.log`; the extension must not perturb it,
    not even by the 1e-6 of rounding that `1 - P(empty)` would introduce.
    """
    read = sweep.occupancy_reader({"classes": config.OCCUPANCY_CLASSES})
    for p_empty, p_occupied in ((0.9, 0.1), (0.316, 0.684), (0.5, 0.5), (1e-7, 1 - 1e-7)):
        p_occ, occupied = read([p_empty, p_occupied])
        assert p_occ == p_occupied              # exact, not approx: the column itself
        assert occupied is (p_occupied > p_empty)


def test_unscoreable_run_is_refused(sweep):
    with pytest.raises(SystemExit):
        sweep.occupancy_reader({"classes": ["dark", "light"]})


def test_thirteen_class_list_is_derived():
    """The 13-class list is `config.CLASSES` minus `occluded` — an expression, not a copy."""
    assert config.IDENTITY_CLASSES == [c for c in config.CLASSES if c != "occluded"]
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
    assert [r["label"] for r in collapse_labels(rows, "occupancy")] == ["occupied", "empty",
                                                                       "occupied"]
    assert collapse_labels(rows, "pieces") is rows
