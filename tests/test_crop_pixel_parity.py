"""Python cuts the SAME PIXELS as Kotlin from a raw warp; fixture is Kotlin's own output.
Covers crop construction only, not the straightened store. Regenerate: `scripts/crop_parity.py`."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, labeling
from conftest import make_profile

FIXTURES = (Path(__file__).resolve().parents[1]
            / "android/core-engine/src/test/resources/parity/_pixels")
#: One frame per hard geometry. `turntable` is the one a fisheye case cannot stand in for: its quad
#: is rotated far off the median, so a corner-ordering or homography slip shows there first.
CASES = sorted(p.name for p in FIXTURES.iterdir() if p.is_dir())


def _receipt(case: str) -> dict:
    return json.loads((FIXTURES / case / "receipt.json").read_text(encoding="utf-8"))


def _profile(case: str, receipt: dict, margin: float) -> tuple:
    """(rectified board, profile) for one fixture, cut under Kotlin's own quad."""
    frame = cv2.imread(str(FIXTURES / case / "frame.webp"))
    assert frame is not None, f"fixture frame missing: {case}/frame.webp"
    q = receipt["quad"]
    quad = [[float(q[i]), float(q[i + 1])] for i in range(0, 8, 2)]
    bs = int(receipt["boardSize"])
    prof = make_profile(
        bs, corners=quad, margin=margin, profile=f"__parity_{case}__", camera_index=-1,
        frame_size=(frame.shape[1], frame.shape[0]), pad_side=float(receipt["padSide"]),
        out_size=(int(receipt["outW"]), int(receipt["outH"])))
    return calibration.warp_board_for_crops(frame, prof, quad), prof


@pytest.mark.parametrize("case", CASES)
def test_every_fixture_square_is_byte_identical_to_kotlins_crop(case):
    receipt = _receipt(case)
    warped, prof = _profile(case, receipt, config.DEFAULT_MARKER_MARGIN)
    out = (int(receipt["outW"]), int(receipt["outH"]))
    differing = []
    for square in receipt["squares"]:
        want = cv2.imread(str(FIXTURES / case / f"kotlin_{square}.png"))
        assert want is not None, f"fixture crop missing: {case}/kotlin_{square}.png"
        got = labeling.crop_square(warped, square, prof, out)
        assert got.shape == want.shape, f"{case}/{square}: {got.shape} != {want.shape}"
        if not np.array_equal(got, want):
            d = cv2.absdiff(got, want)
            differing.append(f"{square}: mean {d.mean():.2f}, max {d.max():.0f}")
    assert not differing, f"{case}: Python and Kotlin cut different pixels\n  " + "\n  ".join(differing)


@pytest.mark.parametrize("case", CASES)
def test_the_margin_is_what_makes_it_match(case):
    """The guard on the trap: at margin 0 the crops move by a third of a cell, and it looks fine.

    Without this, a change that dropped the margin would leave the test above green as soon as
    someone re-cut the fixture with the same mistake.
    """
    receipt = _receipt(case)
    warped, prof = _profile(case, receipt, 0.0)
    got = labeling.crop_square(warped, "d4", prof,
                               (int(receipt["outW"]), int(receipt["outH"])))
    want = cv2.imread(str(FIXTURES / case / "kotlin_d4.png"))
    assert not np.array_equal(got, want), f"{case}: margin 0 must NOT match — the trap is gone"
