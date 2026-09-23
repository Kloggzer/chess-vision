"""`coverage_arms.py` verweigert einen Lauf ohne Occlusion-Kopf statt Nullen zu zeichnen."""

from __future__ import annotations

import pytest

from conftest import load_script

coverage_arms = load_script("coverage_arms", alias="coverage_arms")


def test_a_run_without_the_head_is_refused() -> None:
    with pytest.raises(SystemExit, match="Occlusion-Kopf"):
        coverage_arms.cnn_coverage([{"probs": {"wP": 0.9}}, {"probs": {"empty": 1.0}}])


def test_a_run_with_the_head_comes_through_including_real_zeros() -> None:
    reads = [{"coverage": 0.0}, {"coverage": 0.4}]

    assert coverage_arms.cnn_coverage(reads) == [0.0, 0.4]
