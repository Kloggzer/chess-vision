"""The stored board: one raster for the label view and the training crop, and the guard on it."""

from dataclasses import replace

import cv2
import numpy as np

from chesslab.calibration import CalibrationProfile, CropParams, compute_homography, crop_border_px
from chesslab.labeling import crop_square, usable_board
from chesslab.realgames import write_board


def _profile(bs: int = 800, pad_side: float = 0.05) -> CalibrationProfile:
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    crop = replace(CropParams.default(bs), pad_side=pad_side)
    return CalibrationProfile(
        profile="t", camera_index=0, frame_size=(bs, bs), board_size=bs,
        image_corners=corners, homography=compute_homography(corners, bs),
        white_pov=True, crop=crop,
    )


def _frame(bs: int = 800) -> np.ndarray:
    """A board whose every cell is its own shade — a shifted cut shows up as a wrong value."""
    img = np.zeros((bs, bs, 3), np.uint8)
    cell = bs // 8
    for r in range(8):
        for c in range(8):
            img[r * cell:(r + 1) * cell, c * cell:(c + 1) * cell] = 4 * (r * 8 + c) + 3
    return img


def test_the_row_says_which_scale_its_board_is_in(tmp_path):
    """A homography lets board coordinates cancel against it, a stored raster does not: the UI read
    1008 where the profile said 928 and cut every cell 8 % off until the row carried the number."""
    prof = _profile()
    keys = write_board(tmp_path, "000001", _frame(), prof.image_corners, prof)

    assert keys == {"board": "boards/000001.webp", "board_size": 800, "board_border": crop_border_px(prof)}
    stored = cv2.imread(str(tmp_path / keys["board"]))
    assert stored.shape[:2] == (800 + 2 * keys["board_border"],) * 2


def test_a_board_cut_matches_the_frame_cut(tmp_path):
    """The store is the crop's raster: cutting from it is the same operation minus the warp."""
    prof = _profile()
    frame = _frame()
    write_board(tmp_path, "000001", frame, prof.image_corners, prof)
    stored = cv2.imread(str(tmp_path / "boards" / "000001.webp"))

    from chesslab.calibration import warp_board_for_crops
    warped = warp_board_for_crops(frame, prof, prof.image_corners)
    for square in ("a1", "e4", "h8"):
        live = crop_square(warped, square, prof, (64, 64))
        off = crop_square(stored, square, prof, (64, 64))
        # Every cell is its own shade and neighbours differ by 4, so a cut landing one cell over
        # reads a different median. The codec moves it by well under one step.
        assert abs(int(np.median(off)) - int(np.median(live))) <= 1, square


def test_a_pad_override_refuses_the_stored_board():
    """`crop_square` derives the border from the profile it is handed, so a board warped with a
    different one would be cut at an offset it never had — half a cell, silently."""
    row = {"board": "boards/000001.webp", "board_size": 800, "board_border": crop_border_px(_profile())}

    assert usable_board(row, _profile())
    assert not usable_board(row, _profile(pad_side=0.30))
    assert not usable_board(row, _profile(bs=928))
    assert not usable_board({"board": "boards/000001.webp"}, _profile()), "a row without the scale"
