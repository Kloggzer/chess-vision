"""The store is where the board is pulled straight — once, and never by a hand's own measurement.

`straighten_boards` is the only straightening left in the pipeline: `crop_square` cuts plain
rectangles afterwards. Two things therefore have to hold, and both were bugs waiting to happen —
it must not correct a board twice, and it must not use the mesh of a frame whose grooves a hand
was lying across (measured 2026-08-21: such a mesh leaves the board at 15.6 px against 16.1 raw,
i.e. worse than doing nothing).

The boards here are drawn with their grid lines TILTED by a known amount, so the check is
structural — where the lines end up — rather than a pixel comparison the store's lossy WebP could
never satisfy.
"""
from __future__ import annotations

import json

import cv2
import numpy as np
import pytest

from chesslab.calibration import GridMesh
from chesslab.realgames import MATTE_DIR, meshes_for_boards, straighten_boards

BS, BORDER, TILT = 400, 20, 0.04
EIGHTHS = [k / 8.0 for k in range(9)]


def _mesh(tilt: float) -> GridMesh:
    return GridMesh(list(EIGHTHS), list(EIGHTHS), [tilt] * 9, [0.0] * 9)


def _lines(tilt: float) -> dict:
    return {"x": list(EIGHTHS), "y": list(EIGHTHS), "tx": [tilt] * 9, "ty": [0.0] * 9}


def _drawn(tilt: float):
    """A board whose nine vertical grid lines really are tilted by `tilt` — what `_mesh` describes."""
    canvas = np.zeros((BS + 2 * BORDER, BS + 2 * BORDER, 3), np.uint8)
    for y in range(canvas.shape[0]):
        t = (y - BORDER) / BS - 0.5
        for k in range(9):
            x = BORDER + int(round((EIGHTHS[k] + tilt * t) * BS))
            canvas[y, max(0, x - 1):x + 2] = 255
    return canvas


def line_spread(image) -> float:
    """How far the middle grid line wanders across the board — 0 when it is upright."""
    rows = range(BORDER + 4, BORDER + BS - 4)
    mid = [np.argmax(image[y, BORDER + BS // 2 - 40:BORDER + BS // 2 + 40, 0] > 128) for y in rows]
    return float(max(mid) - min(mid))


def _session(tmp_path, rows: list[dict], mattes: tuple[str, ...] = ()):
    sdir = tmp_path / "rec"
    (sdir / "boards").mkdir(parents=True)
    (sdir / MATTE_DIR).mkdir(parents=True)
    board = _drawn(TILT)
    for row in rows:
        cv2.imwrite(str(sdir / row["board"]), board)
    for stem in mattes:
        cv2.imwrite(str(sdir / MATTE_DIR / f"{stem}.webp"), board)
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    return sdir, board


def _row(idx: int, tilt: float | None, hand: bool = False) -> dict:
    row = {"frame": f"frames/{idx:06d}.png", "board": f"boards/{idx:06d}.webp",
           "board_size": BS, "board_border": BORDER}
    if tilt is not None:
        row["grid_lines"] = _lines(tilt)
    if hand:
        row["hand_squares"] = ["e4"]
    return row


def _read(sdir, row):
    return cv2.imread(str(sdir / row["board"]))


def test_a_stored_board_is_pulled_straight_exactly_once(tmp_path):
    rows = [_row(0, TILT)]
    sdir, board = _session(tmp_path, rows)
    assert line_spread(board) > 15, "the drawn board must SHOW the tilt, or this proves nothing"

    assert straighten_boards(sdir, rows)["straightened"] == 1
    assert rows[0]["board_straightened"] is True
    once = _read(sdir, rows[0])
    assert line_spread(once) <= 2

    # The trap this guards: a second pass would correct an already-corrected board.
    assert straighten_boards(sdir, rows) == {"straightened": 0, "already": 1, "no_mesh": 0,
                                             "no_board": 0, "mattes": 0}
    assert np.array_equal(_read(sdir, rows[0]), once)


def test_a_hand_frame_takes_its_neighbours_mesh_and_not_its_own(tmp_path):
    """Its own would be the one a hand across the grooves produced — worse than no mesh at all."""
    rows = [_row(0, TILT), _row(3, TILT), _row(6, 0.9, hand=True), _row(9, TILT), _row(12, TILT)]
    sdir, _board = _session(tmp_path, rows)
    assert meshes_for_boards(rows)[6].tx == pytest.approx([TILT] * 9)

    straighten_boards(sdir, rows)
    assert line_spread(_read(sdir, rows[2])) <= 2


def test_a_frame_with_no_mesh_anywhere_is_left_alone_and_counted(tmp_path):
    rows = [_row(0, None)]
    sdir, board = _session(tmp_path, rows)
    assert straighten_boards(sdir, rows)["no_mesh"] == 1
    assert np.array_equal(_read(sdir, rows[0]), board)
    assert "board_straightened" not in rows[0], "a bowed board must not claim to be straight"


def test_the_matte_follows_its_board(tmp_path):
    """`coverage_of` cuts the alpha with the crop's geometry, so a bowed matte would mismeasure."""
    rows = [_row(0, TILT)]
    sdir, _board = _session(tmp_path, rows, mattes=("000000", "000000.fixed"))
    assert straighten_boards(sdir, rows)["mattes"] == 2
    for stem in ("000000", "000000.fixed"):
        assert line_spread(cv2.imread(str(sdir / MATTE_DIR / f"{stem}.webp"))) <= 2
