"""The store pulls the board straight once, never twice and never with a hand-covered mesh."""
from __future__ import annotations

import cv2
import numpy as np
import pytest

from chesslab.calibration import GridMesh
from chesslab.realgames.boards import STRAIGHTEN_CHECKPOINT, straighten_boards
from chesslab.realgames.mesh import meshes_for_boards
from chesslab.session_store.boards import BOARD_ENCODE, MATTE_ENCODE
from chesslab.session_store.names import MATTE_DIR
from conftest import write_jsonl

BS, BORDER, TILT = 400, 20, 0.04
EIGHTHS = [k / 8.0 for k in range(9)]


def _mesh(tilt: float) -> GridMesh:
    return GridMesh(list(EIGHTHS), list(EIGHTHS), [tilt] * 9, [0.0] * 9)


def _lines(tilt: float, curv: float | None = None) -> dict:
    out = {"x": list(EIGHTHS), "y": list(EIGHTHS), "tx": [tilt] * 9, "ty": [0.0] * 9}
    return out if curv is None else {**out, "cx": [curv] * 9, "cy": [0.0] * 9}


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
    write_jsonl(sdir / "log.jsonl", rows)
    return sdir, board


def _row(idx: int, tilt: float | None, hand: bool = False, curv: float | None = None) -> dict:
    row = {"frame": f"frames/{idx:06d}.png", "board": f"boards/{idx:06d}.webp",
           "board_size": BS, "board_border": BORDER}
    if tilt is not None:
        row["grid_lines"] = _lines(tilt, curv)
    if hand:
        row["hand_squares"] = ["e4"]
    return row


def _read(sdir, row):
    return cv2.imread(str(sdir / row["board"]))


def test_a_stored_board_is_pulled_straight_exactly_once(tmp_path):
    """`MESH_POOL_MIN` frames at least: the recording has ONE mesh, and a term nobody measured
    three times is not trusted — a single-row session is straightened by nothing at all."""
    rows = [_row(i, TILT) for i in (0, 3, 6)]
    sdir, board = _session(tmp_path, rows)
    assert line_spread(board) > 15, "the drawn board must SHOW the tilt, or this proves nothing"

    assert straighten_boards(sdir, rows)["straightened"] == len(rows)
    assert rows[0]["board_straightened"] is True
    once = _read(sdir, rows[0])
    assert line_spread(once) <= 2

    # The trap this guards: a second pass would correct an already-corrected board.
    assert straighten_boards(sdir, rows) == {"straightened": 0, "already": len(rows), "no_mesh": 0,
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
    rows = [_row(i, TILT) for i in (0, 3, 6)]
    sdir, _board = _session(tmp_path, rows, mattes=("000000", "000000.fixed"))
    assert straighten_boards(sdir, rows)["mattes"] == 2
    for stem in ("000000", "000000.fixed"):
        assert line_spread(cv2.imread(str(sdir / MATTE_DIR / f"{stem}.webp"))) <= 2


def test_a_frame_without_curvature_borrows_the_recordings():
    """A mesh with no `cx` cannot take a bow out at all, and most frames of a recording have none.

    Measured 2026-08-21: three recordings carry curvature on under 5 % of their frames and stayed
    at 5.3-6.4 px without this; where it was present the same rule reached 0.97.
    """
    curved = [_row(i, TILT, curv=0.03) for i in (0, 3, 6)]
    flat = [_row(i, TILT) for i in (9, 12)]
    meshes = meshes_for_boards(curved + flat)
    assert [m.cx for m in meshes.values()] == [[0.03] * 9] * 5
    assert meshes[9].tx == pytest.approx([TILT] * 9), "its own tilts stay its own"


def test_two_curved_frames_are_too_few_to_graft_from():
    """`MESH_POOL_MIN`: one frame's curvature could be noise, and grafting noise onto 500 boards
    is worse than leaving a measured bow in five."""
    meshes = meshes_for_boards([_row(0, TILT, curv=0.03), _row(3, TILT, curv=0.03),
                                _row(6, TILT), _row(9, TILT)])
    assert meshes[6].cx is None and meshes[9].cx is None


def test_a_matte_is_re_encoded_losslessly():
    """A matte carries hand-drawn edges. `matte-fix.ts` writes them lossless for that reason, and
    pulling one straight at the board's quality 95 would smear exactly what the human drew."""
    rng = np.random.default_rng(1)
    edges = (rng.integers(0, 2, (200, 200), dtype=np.uint8) * 255)

    def roundtrip(enc):
        back = cv2.imdecode(cv2.imencode(".webp", edges, enc)[1], cv2.IMREAD_UNCHANGED)
        return back if back.ndim == 2 else back[:, :, 0]

    assert not np.array_equal(roundtrip(BOARD_ENCODE), edges), "q95 must NOT be lossless here"
    assert np.array_equal(roundtrip(MATTE_ENCODE), edges)


def test_the_flags_are_persisted_while_the_boards_are_still_being_written(tmp_path):
    """The write is destructive and the flag is its only record. A run killed between them leaves
    straight boards that a later run would pull a SECOND time — measured the hard way on
    2026-08-21, when a stopped migration kept writing and one recording came out over-corrected."""
    rows = [_row(i * 3, TILT) for i in range(STRAIGHTEN_CHECKPOINT + 2)]
    sdir, _board = _session(tmp_path, rows)
    seen: list[int] = []
    straighten_boards(sdir, rows, checkpoint=lambda: seen.append(
        sum(1 for r in rows if r.get("board_straightened"))))
    assert seen == [STRAIGHTEN_CHECKPOINT], "one checkpoint, and it must see the flags already set"


def test_a_lens_receipt_is_read_into_the_model_and_a_missing_one_is_not(tmp_path):
    """The seam has to be reachable, or it is dead code with a docstring.

    `LensModel.from_receipt` is the only way optics enter the pipeline: `:desktop undistort` writes
    `lens.json`, `session rewarp` reads it. A receipt that predates the full model (k1/k2 only) is
    refused rather than filled with guessed intrinsics — the centre moves when the fit has evidence
    for it, and a guessed one puts the correction somewhere else.
    """
    from chesslab.calibration import LensModel, distort_points, undistort_points

    assert LensModel.from_receipt(None) is None
    assert LensModel.from_receipt({"k1": -0.25, "k2": 0.0}) is None, "no focal, no centre"
    lens = LensModel.from_receipt({"k1": -0.25, "k2": 0.0, "focal": 1920.0,
                                   "cx": 960.0, "cy": 540.0})
    assert (lens.k1, lens.focal) == (-0.25, 1920.0)

    # Round trip: a point pushed out by the model and pulled back lands where it started.
    x, y = 300.0, 200.0
    back = undistort_points([[x, y]], lens)[0]
    again = distort_points(np.array(back[0]), np.array(back[1]), lens)
    assert (float(again[0]), float(again[1])) == pytest.approx((x, y), abs=0.05)
    assert abs(back[0] - x) > 5, "a k1 of -0.25 must MOVE the point, or this proves nothing"
