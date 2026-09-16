"""Ein Lauf ohne Occlusion-Kopf traegt keine `coverage` — das ist nicht "nichts verdeckt".

`or 0.0` machte daraus eine gemessene Null, und `coverage_arms.py` zeichnete die Vergleichskurve
des CNN-Arms auf lauter Nullen: perfekte Precision bei null Recall, als waere es gemessen. Das
Geschwister-Skript `occlusion_gate.py` verweigert denselben Fall seit jeher laut.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

_SPEC = importlib.util.spec_from_file_location(
    "coverage_arms", Path(__file__).resolve().parents[1] / "scripts" / "coverage_arms.py")
coverage_arms = importlib.util.module_from_spec(_SPEC)
sys.modules["coverage_arms"] = coverage_arms
_SPEC.loader.exec_module(coverage_arms)


def test_a_run_without_the_head_is_refused() -> None:
    with pytest.raises(SystemExit, match="Occlusion-Kopf"):
        coverage_arms.cnn_coverage([{"probs": {"wP": 0.9}}, {"probs": {"empty": 1.0}}])


def test_a_run_with_the_head_comes_through_including_real_zeros() -> None:
    reads = [{"coverage": 0.0}, {"coverage": 0.4}]

    assert coverage_arms.cnn_coverage(reads) == [0.0, 0.4]
