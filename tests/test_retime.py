import numpy as np

from chesslab.retime import ADVANCE_COST, refused, retime_plies, viterbi, windows


def _emissions(truth: list[int], K: int, strength: float = 10.0) -> np.ndarray:
    """Frame t agrees with position truth[t] by `strength`, with every other one by nothing."""
    out = np.zeros((len(truth), K))
    for t, k in enumerate(truth):
        out[t, k] = strength
    return out


def test_the_path_is_monotone_and_follows_the_board():
    truth = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2]
    path = viterbi(_emissions(truth, 3), np.ones((10, 3), dtype=bool))
    assert path.tolist() == truth


def test_a_single_misread_frame_does_not_open_a_position():
    truth = [0, 0, 2, 0, 0, 1, 1, 1, 2, 2]
    path = viterbi(_emissions(truth, 3, strength=ADVANCE_COST * 0.8), np.ones((10, 3), dtype=bool))
    assert path.tolist() == [0, 0, 0, 0, 0, 1, 1, 1, 2, 2]


def test_a_position_the_camera_never_saw_collapses_into_the_next_one():
    """16-20-19, plies 7-9: the board went straight from after 6 to after 9."""
    frames = [300, 303, 306, 309, 312, 315]
    path = np.array([6, 6, 9, 9, 9, 9])
    plies = retime_plies(frames, path, phone=[100, 120, 140, 160, 180, 200, 291, 295, 295], stride=3)
    by = {p.ply: p for p in plies}
    assert (by[7].frame, by[7].held) == (306, 0)
    assert (by[8].frame, by[8].held) == (306, 0)
    assert (by[9].frame, by[9].held) == (306, 12)
    assert by[6].frame == 300 and by[6].held == 6
    assert by[1].frame == 300 and by[1].held == 0, "never seen: it collapses into the first position seen"


def test_windows_let_a_position_start_before_its_commit_and_end_after_the_next():
    win = windows([100, 400], fps=10.0, back_s=5.0, fwd_s=2.0)
    assert win[0] == (-1, 120)
    assert win[1] == (50, 420)
    assert win[2][0] == 350 and win[2][1] > 10**8


def test_a_few_weak_plies_do_not_refuse_a_game_but_many_do():
    assert not refused(weak=[39, 62, 64], entered=99)
    assert refused(weak=list(range(25)), entered=99)
    assert refused(weak=[], entered=0)
