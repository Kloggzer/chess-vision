"""Ein Frame ist kein entzerrtes Brett; die Quellenwahl liegt an EINER Stelle."""

from __future__ import annotations

from chesslab.labeling import board_source, crop_border_px


def _row(**extra) -> dict:
    return {"frame": "frames/000001.png", "board": "boards/000001.webp", **extra}


def test_a_board_at_the_profile_scale_is_the_source(small_profile) -> None:
    row = _row(board_size=int(small_profile.board_size),
               board_border=crop_border_px(small_profile))

    assert board_source(row, small_profile) == ("boards/000001.webp", True)


def test_a_board_at_another_scale_falls_back_to_the_frame(small_profile) -> None:
    row = _row(board_size=999, board_border=0)

    assert board_source(row, small_profile) == ("frames/000001.png", False), (
        "und der Frame darf dann NICHT als `board=` durchgereicht werden")


def test_a_row_without_a_board_falls_back_to_the_frame(small_profile) -> None:
    assert board_source({"frame": "frames/000001.png"}, small_profile) == (
        "frames/000001.png", False)
