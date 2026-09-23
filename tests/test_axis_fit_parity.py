"""Parity of the grid fit: `alignment._fit_axis` against `AxisFit.kt::fitAxis`
(fixture from `scripts/emit_axis_fit_parity.py`)."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from chesslab.alignment import MIN_BAND_SAMPLES, _fit_axis

FIXTURE = (Path(__file__).resolve().parents[1] / "android" / "core-engine" / "src" / "test"
           / "resources" / "parity" / "_geometry" / "axis_fit.json")

SLOPE_A, SLOPE_B = 0.002, 0.0001


def cases():
    rows = json.loads(FIXTURE.read_text(encoding="utf-8"))["cases"]
    return [pytest.param(r, id=r["name"]) for r in rows]


def run(case) -> dict[int, tuple[float, float]]:
    """Dasselbe Vorspiel wie `_fit_families` — die Naht liegt in Kotlin eine Ebene tiefer."""
    by_line: dict[int, list[list[float]]] = {}
    for k, coord, pos in case["samples"]:
        by_line.setdefault(int(k), []).append([coord, pos])
    present = [k for k in sorted(by_line) if len(by_line[k]) >= MIN_BAND_SAMPLES]
    if not present:
        return {}
    ks = np.array([k for k in present for _ in by_line[k]], np.float64)
    lev = np.array([v[0] for k in present for v in by_line[k]]) - case["centre"]
    pos = np.array([v[1] for k in present for v in by_line[k]])
    return _fit_axis(ks, lev, pos, present, MIN_BAND_SAMPLES)


@pytest.mark.parametrize("case", cases())
def test_python_matches_the_shared_case(case):
    got = run(case)

    assert sorted(got) == sorted(int(k) for k in case["expect"]), "andere Linien ueberlebt"
    for k, (slope, intercept) in case["expect"].items():
        assert got[int(k)][0] == pytest.approx(slope, abs=1e-9)
        assert got[int(k)][1] == pytest.approx(intercept, abs=1e-6)


def test_the_clean_case_is_the_analytic_truth_not_a_snapshot():
    # Sonst waere die Fixture zirkulaer: sie kommt aus dieser Seite.
    got = run(next(c for c in cases() if c.values[0]["name"] == "clean").values[0])

    for k, (slope, intercept) in got.items():
        assert slope == pytest.approx(SLOPE_A + SLOPE_B * k, abs=1e-9)
        assert intercept == pytest.approx(50.0 + 100.0 * k, abs=1e-6)
