"""The settle score: a cell that stops matching its own interval's settled board.

The alpha is the second half of it — it says WHERE the board was visible, and only there does a
deviation mean the position changed rather than that a hand is in the way.
"""


import cv2
import numpy as np

from chesslab.calibration import CalibrationProfile, crop_border_px
from chesslab.labeling import SETTLE_LIMIT, all_squares
from chesslab.realgames import (
    SETTLE_CELL_PX,
    cell_deviations,
    departures,
    settle_for_ply,
)
from conftest import make_profile

SIDE = 320
CELL = SIDE // 8
PX = SETTLE_CELL_PX


def _profile() -> CalibrationProfile:
    corners = [[0, 0], [SIDE, 0], [SIDE, SIDE], [0, SIDE]]
    return make_profile(SIDE, corners=corners, profile="t", out_size=(PX, PX))


def _board(shade: int = 90) -> np.ndarray:
    """64 cells of one flat shade — the settled board nobody has touched."""
    return np.full((64, PX, PX, 3), shade, np.float32)


def _all_visible() -> np.ndarray:
    return np.ones((64, PX, PX), bool)


def test_a_still_board_scores_zero():
    """The reference IS the board when nothing moved, so nothing may look suspicious."""
    dev, seen = cell_deviations(_board(), _board(), _all_visible())

    assert dev.max() == 0.0
    assert seen.min() == 1.0


def test_a_shadow_moves_nothing_and_a_piece_moves_everything():
    """The one property the raw difference did not have: a player leaning in shifts a cell's
    BRIGHTNESS, and that flagged a2, b3 and b5 on a board nobody had touched (2026-08-22)."""
    cells = _board()
    cells[3] += 30                            # the whole cell darkens: a shadow
    cells[27, :PX // 4] = 200                 # a quarter of it turns: a piece arriving

    dev, _ = cell_deviations(cells, _board(), _all_visible())

    assert dev[3] == 0.0
    assert dev[27] > SETTLE_CELL_PX, dev[27]
    assert dev[np.arange(64) != 27].max() == 0.0


def test_a_cell_under_the_hand_is_not_measured_at_all():
    """A covered cell is not "unchanged", it is unseen — `settle_seen` is what says which."""
    cells = _board()
    cells[27] = 200                           # the hand lies over e4, whatever is under it
    visible = _all_visible()
    visible[27] = False
    visible[9, :, PX // 2:] = False           # and half of another cell

    dev, seen = cell_deviations(cells, _board(), visible)

    assert dev[27] == 0.0 and seen[27] == 0.0
    assert dev[9] == 0.0 and seen[9] == 0.5


def _write(path, image, params=None):
    assert cv2.imwrite(str(path), image, params or [])


def test_the_reference_is_built_from_the_clear_frames_only(tmp_path):
    """A hand lying over the same square in the MINORITY of frames used to be caught by the median;
    with an alpha per frame it is not even offered to it, so the reference stays the board."""
    prof = _profile()
    pad = crop_border_px(prof)
    side = SIDE + 2 * pad
    (tmp_path / "boards").mkdir()
    (tmp_path / "mattes").mkdir()
    rows = []
    for i in range(7):
        board = np.full((side, side, 3), 90, np.uint8)
        if i >= 5:                            # the last two carry a hand over a8
            board[pad:pad + CELL, pad:pad + CELL] = 200
            alpha = np.zeros((side, side), np.uint8)
            alpha[pad:pad + CELL, pad:pad + CELL] = 255
            _write(tmp_path / "mattes" / f"{i:06d}.webp", alpha, [cv2.IMWRITE_WEBP_QUALITY, 101])
        _write(tmp_path / "boards" / f"{i:06d}.png", board)
        rows.append({"frame": f"frames/{i:06d}.png", "board": f"boards/{i:06d}.png"})

    mattes = {f"{i:06d}": ({"a8": 1.0} if i >= 5 else {}) for i in range(7)}
    got = settle_for_ply((tmp_path, rows, prof, mattes))

    a8, h1 = all_squares().index("a8"), all_squares().index("h1")
    assert got["scores"]["000000"]["dev"][a8] == 0.0
    # Not 0.0: the crop reaches past its own square by `pad_side`, and that rim is still board.
    assert got["scores"]["000005"]["seen"][a8] < 0.2, "almost nothing of the hand's cell was seen"
    assert got["scores"]["000005"]["dev"][a8] < SETTLE_LIMIT, "and the rim still matches the board"
    assert got["scores"]["000005"]["seen"][h1] == 1.0


def _states(frames: int, cell: int = 0):
    """Drei Reihen fuer `departures`: Abweichung, Sichtbarkeit, Coverage — je (Frames, 64)."""
    dev = np.zeros((frames, 64), np.float32)
    seen = np.ones((frames, 64), np.float32)
    cover = np.zeros((frames, 64), np.float32)
    return dev, seen, cover, cell


def _left(dev, seen, cover):
    return departures(dev, seen, cover, limit=SETTLE_LIMIT, seen_min=0.5, covered_max=0.15)


def test_a_shadow_passes_and_a_move_stays():
    """Die ganze Regel in einem Test: dieselbe Abweichung, einmal voruebergehend, einmal bleibend.

    Ohne die Zeitachse sind beide identisch — und 63 % der Treffer korpusweit waren die erste Art.
    """
    dev, seen, cover, c = _states(8)
    dev[2:4, c] = SETTLE_LIMIT + 10          # Schatten: ab f4 stimmt das Feld wieder
    dev[2:, c + 1] = SETTLE_LIMIT + 10       # Zug: ab f2 nie wieder

    left = _left(dev, seen, cover)

    assert not left[:, c].any(), "was zurueckkommt, ist ein Aermel"
    assert not left[:2, c + 1].any()
    assert left[2:, c + 1].all(), "und was bleibt, ist der Zug"


def test_the_next_moves_squares_survive_the_block_rule():
    """Castling with the hand still on it is a block of six — the block rule read it as a shadow
    and let e1/f1/g1 into training with the king still on e1 (VID_20260824_153751, ply 12)."""
    dev, seen, cover, _c = _states(6)
    block = [3, 4, 5, 6, 12, 13]                  # d1 e1 f1 g1 e2 f2
    for c in block:
        dev[2:, c] = SETTLE_LIMIT + 10

    plain = _left(dev, seen, cover)
    kept = departures(dev, seen, cover, limit=SETTLE_LIMIT, seen_min=0.5, covered_max=0.15,
                      keep=[4, 5, 6, 7])          # e1 f1 g1 h1: what O-O touches

    assert not plain[2:].any(), "six in a row is a shadow to the plain rule"
    assert kept[2:, [4, 5, 6]].all(), "the move's own squares are never a shadow"
    assert not kept[2:, [3, 12, 13]].any(), "the rest of the block still is"
    assert not kept[:, 7].any(), "h1 never deviated, keep does not invent a departure"


def test_a_hand_at_the_end_does_not_break_the_run():
    """Die Falle: verdeckt heisst nicht "stimmt wieder". Sonst rutscht genau der Fall durch, bei
    dem die Hand nach dem Zug liegen bleibt."""
    dev, seen, cover, c = _states(6)
    dev[2:, c] = SETTLE_LIMIT + 10
    cover[4:, c] = 0.9                        # ab f4 liegt die Hand drauf

    left = _left(dev, seen, cover)

    assert left[2:4, c].all(), "solange man es sieht, ist es verlassen"
    assert not left[4:, c].any(), "verdeckt gehoert der Coverage, nicht dieser Liste"


def test_a_cell_the_alpha_barely_saw_is_flagged_on_its_own():
    """Zu wenig Brett gesehen ist weder "unveraendert" noch vom Loss ausgenommen."""
    dev, seen, cover, c = _states(4)
    seen[1, c] = 0.2

    left = _left(dev, seen, cover)

    assert left[1, c] and not left[0, c] and not left[2, c]


def test_a_shadow_block_is_dropped_and_a_move_survives():
    """Form statt Menge: ein Zug beruehrt ZWEI Felder — benachbart beim Bauernschritt, sonst zwei
    Bloecke zu eins. Drei am Stueck kann kein Zug erzeugen, das ist der vorgebeugte Spieler."""
    sq = all_squares()
    dev, seen, cover, _c = _states(4)
    for name in ("a2", "a3"):                      # der laufende Bauer: ein Block zu zwei
        dev[1:, sq.index(name)] = SETTLE_LIMIT + 10
    for name in ("e2", "e4"):                      # der weite Zug: zwei Bloecke zu eins
        dev[1:, sq.index(name)] = SETTLE_LIMIT + 10
    for name in ("f1", "g1", "h1", "g2"):          # der Schatten auf der Grundreihe
        dev[1:, sq.index(name)] = SETTLE_LIMIT + 10

    left = _left(dev, seen, cover)

    kept = {s for i, s in enumerate(sq) if left[3, i]}
    assert kept == {"a2", "a3", "e2", "e4"}, kept


def test_the_block_rule_counts_per_frame_not_per_interval():
    """Ein Schatten, der wandert, darf nicht durch die Summe ueber das Intervall gross werden."""
    sq = all_squares()
    dev, seen, cover, _c = _states(4)
    dev[1:, sq.index("d4")] = SETTLE_LIMIT + 10
    dev[1:, sq.index("h8")] = SETTLE_LIMIT + 10    # weit weg, eigener Block

    left = _left(dev, seen, cover)

    assert left[3, sq.index("d4")] and left[3, sq.index("h8")]
