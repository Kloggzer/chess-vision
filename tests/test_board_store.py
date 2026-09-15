"""The stored board: one raster for the label view and the training crop, and the guard on it."""


import json

import cv2
import numpy as np

from chesslab.calibration import CalibrationProfile, crop_border_px
from chesslab.labeling import crop_square, usable_board
from chesslab.realgames import write_board
from conftest import START_FEN, make_profile


def _profile(bs: int = 800, pad_side: float = 0.05) -> CalibrationProfile:
    return make_profile(bs, pad_side=pad_side, profile="t")


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


def test_a_stored_board_is_cut_without_asking_the_markers(slice_fixture, tmp_path):
    """A row whose board is on disk but whose corners are not crashed on `frame.ndim`: the marker
    fallback ran on the frame the board made it skip reading. Its answer was never used — a board
    is already under its own quad."""
    from chesslab.labeling import slice_session

    sdir, prof, _ = slice_fixture([{"frame": "frames/000001.png", "fen": START_FEN, "ply": 1}])
    rows = [json.loads(x) for x in (sdir / "log.jsonl").read_text(encoding="utf-8").splitlines()]
    for row in rows:
        row.pop("corners", None)
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")

    stats = slice_session(sdir, profile=prof, manifest_path=tmp_path / "m.jsonl",
                          squares_root=tmp_path / "sq", out_size=(32, 32))

    assert stats["crops"] == 64 and stats["skipped"] == 0


def test_a_session_without_a_board_store_is_still_cut_from_its_frame(slice_fixture, tmp_path):
    """The pre-2026-08-17 shape. No exporter writes it any more, so nothing else covers the
    branch — and it is the only thing standing between an old session and a crash."""
    from chesslab.labeling import slice_session

    sdir, prof, _ = slice_fixture([{"frame": "frames/000001.png", "fen": START_FEN, "ply": 1}],
                                  boards=False)

    assert not (sdir / "boards").exists() and (sdir / "frames" / "000001.png").exists()
    stats = slice_session(sdir, profile=prof, manifest_path=tmp_path / "m.jsonl",
                          squares_root=tmp_path / "sq", out_size=(32, 32))
    assert stats["crops"] == 64 and stats["skipped"] == 0
