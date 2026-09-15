"""Die Eckenreihenfolge `[a8, h8, h1, a1]` ueber die Naht gepinnt, nicht nur behauptet.

`parity/_geometry/resolve_corners.jsonl` deckt die Marker-Leiter 4/3/2 samt Ablehnung ab und lag
seit seiner Entstehung im Baum, gelesen NUR von Kotlin (`HomographyTest`). Damit war jede Seite
gegen ihre eigene Wahrheit getestet und die gemeinsame gegen nichts.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from chesslab.calibration import resolve_board_corners

FIXTURE = (Path(__file__).resolve().parents[1] / "android" / "core-engine" / "src" / "test"
           / "resources" / "parity" / "_geometry" / "resolve_corners.jsonl")


def cases():
    rows = [json.loads(line) for line in FIXTURE.read_text(encoding="utf-8").splitlines() if line.strip()]
    return [pytest.param(r, id=r["name"]) for r in rows]


@pytest.mark.parametrize("case", cases())
def test_python_resolves_the_corners_kotlin_was_pinned_to(case):
    points = {int(k): tuple(v) for k, v in case["pointsById"].items()}

    got = resolve_board_corners(points, board_size=case["boardSize"])

    if case["nUsed"] is None:
        assert got is None, "unter zwei Markern gibt es keine Ecken"
        return
    assert got is not None
    corners, n_used = got
    assert n_used == case["nUsed"]
    for mine, theirs in zip(corners, case["corners"], strict=True):
        assert mine[0] == pytest.approx(theirs[0], abs=1e-6)
        assert mine[1] == pytest.approx(theirs[1], abs=1e-6)
