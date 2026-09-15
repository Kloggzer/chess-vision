"""Python must cut the SAME PIXELS as Kotlin — the fixture is Kotlin's own output.

`mesh_crop_parity.json` pins the box COORDINATES across Python, Kotlin and TS to 1e-9, and that has
always been mistaken for parity. A box is not an image: the warp, the crop construction and the
resize all sit between the box and the bytes a model trains on, and none of them was ever compared.

Each fixture is one frame plus the crops `android :desktop crops` cut from it, with the receipt
naming the quad it used — so both sides run on the same corners and a disagreement is attributable
to the cut rather than to corner detection.

Measured when this was written (2026-08-21): **1 920 of 1 920 crops byte-identical** over three
recordings — a fisheye desktop capture, a portrait phone capture, and a turntable whose board turns
through the whole circle (edge angles +159 deg to -77 deg, corners up to 860 px off the median
quad). The bar is exact equality, not a tolerance. Two things had to be right, and both are traps:

* the **margin** (`config.DEFAULT_MARKER_MARGIN`), which the receipt does NOT carry. The ArUco
  corners are not the playing field's corners — the printed rank/file border sits between them, and
  at 0.0 the warp keeps that border inside the 8x8 and every crop lands a third of a cell off.
* the **rotation**: a phone recording decodes portrait in OpenCV while Kotlin reads it landscape.

**What this does NOT cover.** Both sides cut a RAW warp here, because `:desktop crops` is a
diagnostic verb and warps the frame itself. The production path does not: the board is pulled
straight once when it is stored (`realgames.straighten_boards`, 2026-08-21) and both sides then cut
plain rectangles out of that same file. Byte equality on this fixture therefore proves the crop
CONSTRUCTION agrees, not that a training crop and a device crop agree — the straightening sits
before it. Do not read this test as covering more than it does; that mistake was made once already.

Regenerate with `scripts/crop_parity.py`. The fixtures live beside the geometry one so a Kotlin test
can read them too, and cost 3.5 MB.
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import config, labeling
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
    return labeling.warp_board_for_crops(frame, prof, quad), prof


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
