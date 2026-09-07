import numpy as np

from chesslab.retime import ADVANCE_COST, refused, retime_plies, review_frames, viterbi, windows


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


def test_the_review_picture_is_the_cleanest_frame_of_the_hold_and_the_entry_frame_stays():
    frames = [0, 3, 6, 9, 12]
    path = np.array([0, 1, 1, 1, 2])
    covered = [0, 8, 2, 2, 5]
    review = review_frames(frames, path, covered)
    assert review == {0: (0, 0), 1: (9, 2), 2: (12, 5)}
    plies = retime_plies(frames, path, phone=[3, 12], review=review)
    assert (plies[0].frame, plies[0].frame_review, plies[0].review_covered) == (3, 9, 2)
    assert (plies[1].frame, plies[1].frame_review) == (12, 12)


def test_both_ends_of_a_hold_carry_a_hand_so_the_middle_of_the_clean_run_is_the_picture():
    frames = list(range(0, 30, 3))
    # The placing hand leaves after two frames, the next move's hand arrives before the last.
    covered = [6, 4, 0, 0, 0, 0, 0, 0, 3, 7]
    path = np.zeros(len(frames), dtype=int)
    assert review_frames(frames, path, covered) == {0: (15, 0)}


def test_a_collapsed_ply_borrows_the_next_entered_ply_s_picture():
    frames = [0, 3, 6]
    path = np.array([0, 2, 2])
    plies = retime_plies(frames, path, phone=[2, 5], review=review_frames(frames, path, [0, 3, 1]))
    assert (plies[0].held, plies[0].frame, plies[0].frame_review) == (0, 3, 6)
