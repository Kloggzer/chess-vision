"""Square geometry at PRODUCTION scale, against the fixture Kotlin and TS read too.

`_geometry/meta.json` already pins `cropBoxes`, but every one of its geometries has `pad_side *
cell` land on a whole pixel, so the rounding was never exercised — and the rounding is where a
port slips (`int(round(...))` is half-to-EVEN, `Math.round` in Kotlin and JS is half-up).
`square_geometry_parity.json` carries 928/1080/720/576 and an 80 that puts the endpoint on
exactly .5. Twins: `SquareGeometryParityTest.kt`, `SquareRegionParityTest.kt`,
`lib/square-geometry-parity.test.ts`.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from chesslab.calibration import crop_border_px, square_center, square_to_crop_box
from conftest import make_profile

FIXTURE = (Path(__file__).resolve().parents[1]
           / "android/core-engine/src/test/resources/parity/_geometry/square_geometry_parity.json")


@pytest.fixture(scope="module")
def cases() -> list[dict]:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))["cases"]


def test_the_fixture_covers_fractional_and_tied_endpoints(cases):
    """Without these two the file would only repeat what `meta.json` already says."""
    assert any(c["boxExact"][0] % 1 not in (0.0, 0.5) for c in cases)
    assert any(abs(c["boxExact"][2] % 1) == 0.5 for c in cases)


def test_the_crop_box_matches_the_shared_fixture(cases):
    for c in cases:
        p = make_profile(c["boardSize"], pad_side=c["padSide"], white_pov=c["whitePov"])
        where = f"{c['square']}@{c['boardSize']}/{c['padSide']}/pov={c['whitePov']}"
        assert list(square_to_crop_box(c["square"], p, clamp=True)) == c["box"], where
        assert list(square_to_crop_box(c["square"], p, clamp=False)) == c["boxUnclamped"], where
        assert list(square_center(c["square"], p)) == c["center"], where


def test_the_crop_border_matches_the_shared_fixture(cases):
    for c in cases:
        p = make_profile(c["boardSize"], pad_side=c["padSide"], white_pov=c["whitePov"])
        assert crop_border_px(p) == c["cropBorderPx"], f"{c['boardSize']}/{c['padSide']}"


def test_rounding_is_half_to_even_not_half_up(cases):
    """The 80 px board: `50.5` rounds DOWN to 50, so the box is 10 wide, not 11."""
    tied = [c for c in cases if c["boxExact"][2] % 1 == 0.5]
    assert tied, "no tied endpoint in the fixture"
    for c in tied:
        assert c["boxUnclamped"][2] % 2 == 0, f"{c['square']}: {c['boxExact'][2]} -> odd"
