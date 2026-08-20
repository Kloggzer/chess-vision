"""Python must cut the SAME PIXELS as Kotlin — the fixture is Kotlin's own output.

`mesh_crop_parity.json` pins the box COORDINATES across Python, Kotlin and TS to 1e-9, and that has
always been mistaken for parity. A box is not an image: the warp, the crop construction and the
resize all sit between the box and the bytes a model trains on, and none of them was ever compared.

The fixture is one frame plus the crops `android :desktop crops` cut from it, together with the
receipt naming the quad it used — so both sides run on the same corners and a disagreement is
attributable to the cut rather than to corner detection.

Measured when this was written (2026-08-21): **1 280 of 1 280 crops byte-identical** over two
recordings — a fisheye desktop capture and a portrait phone capture. So the bar is exact equality,
not a tolerance. Two things had to be right for that, and both are traps:

* the **margin** (`config.DEFAULT_MARKER_MARGIN`), which the receipt does NOT carry. The ArUco
  corners are not the playing field's corners — the printed rank/file border sits between them, and
  at 0.0 the warp keeps that border inside the 8x8 and every crop lands a third of a cell off.
* the **rotation**: a phone recording decodes portrait in OpenCV while Kotlin reads it landscape.

Regenerate with `scripts/crop_parity.py`; the fixture is 1.8 MB and lives beside the geometry one so
a Kotlin test can read it too.
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import config, labeling
from chesslab.calibration import CalibrationProfile, CropParams, compute_homography

FIXTURE = (Path(__file__).resolve().parents[1]
           / "android/core-engine/src/test/resources/parity/_pixels")


@pytest.fixture(scope="module")
def receipt() -> dict:
    return json.loads((FIXTURE / "receipt.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def board(receipt):
    """The rectified board Python makes of the fixture frame, under Kotlin's own quad."""
    frame = cv2.imread(str(FIXTURE / "frame.webp"))
    assert frame is not None, f"fixture frame missing: {FIXTURE / 'frame.webp'}"
    q = receipt["quad"]
    quad = [[float(q[i]), float(q[i + 1])] for i in range(0, 8, 2)]
    bs = int(receipt["boardSize"])
    prof = CalibrationProfile(
        profile="__parity__", camera_index=-1, frame_size=(frame.shape[1], frame.shape[0]),
        board_size=bs, image_corners=quad,
        homography=compute_homography(quad, bs, config.DEFAULT_MARKER_MARGIN), white_pov=True,
        crop=CropParams(cell=bs / 8.0, pad_up=float(receipt["padUp"]),
                        pad_side=float(receipt["padSide"]),
                        out_size=(int(receipt["outW"]), int(receipt["outH"]))),
        margin=config.DEFAULT_MARKER_MARGIN,
    )
    return labeling.warp_board_for_crops(frame, prof, quad), prof


def test_every_fixture_square_is_byte_identical_to_kotlins_crop(receipt, board):
    warped, prof = board
    out = (int(receipt["outW"]), int(receipt["outH"]))
    worst = []
    for square in receipt["squares"]:
        want = cv2.imread(str(FIXTURE / f"kotlin_{square}.png"))
        assert want is not None, f"fixture crop missing: kotlin_{square}.png"
        got = labeling.crop_square(warped, square, prof, out)
        assert got.shape == want.shape, f"{square}: {got.shape} != {want.shape}"
        if not np.array_equal(got, want):
            d = cv2.absdiff(got, want)
            worst.append(f"{square}: mean {d.mean():.2f}, max {d.max():.0f}")
    assert not worst, "Python and Kotlin cut different pixels:\n  " + "\n  ".join(worst)


def test_the_margin_is_what_makes_it_match(receipt):
    """The guard on the trap: at margin 0 the crops move by a third of a cell, and it looks fine.

    Without this, a future change that drops the margin would leave the parity test above passing
    only because someone re-cut the fixture with the same mistake.
    """
    frame = cv2.imread(str(FIXTURE / "frame.webp"))
    q = receipt["quad"]
    quad = [[float(q[i]), float(q[i + 1])] for i in range(0, 8, 2)]
    bs = int(receipt["boardSize"])
    prof = CalibrationProfile(
        profile="__no-margin__", camera_index=-1, frame_size=(frame.shape[1], frame.shape[0]),
        board_size=bs, image_corners=quad, homography=compute_homography(quad, bs, 0.0),
        white_pov=True,
        crop=CropParams(cell=bs / 8.0, pad_up=float(receipt["padUp"]),
                        pad_side=float(receipt["padSide"]),
                        out_size=(int(receipt["outW"]), int(receipt["outH"]))),
        margin=0.0,
    )
    warped = labeling.warp_board_for_crops(frame, prof, quad)
    got = labeling.crop_square(warped, "d4", prof, (int(receipt["outW"]), int(receipt["outH"])))
    want = cv2.imread(str(FIXTURE / "kotlin_d4.png"))
    assert not np.array_equal(got, want), "margin 0 must NOT match — the trap has stopped being one"
