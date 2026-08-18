"""Measure first, pick after: what a frame is worth, and which eight of them the position keeps."""

from chesslab import framescan as fs

SEG = {"start": 0, "end": 120, "ply": 3}


def _scan(hands=(), skin=(), cells=None, stride=3, end=120):
    """One scan row per stride, clean unless an index falls into `hands` (person) or `skin`."""
    rows = []
    for idx in range(0, end, stride):
        rows.append({"idx": idx, "person": 0.9 if idx in hands else 0.11,
                     "skin": idx in skin, "grid": [],
                     "cells": list(cells(idx)) if cells else [10.0] * 64})
    return rows


def test_a_hand_over_an_unchanged_board_keeps_its_fen():
    """The withdrawal after a commit: a real hand over a KNOWN position, the material we want."""
    scan = _scan(hands=range(0, 30))
    out = fs.classify(SEG, scan)
    assert out[0] == "occluded" and out[27] == "occluded"
    assert out[60] == "clean", "the hand leaving changes nothing about the labels"


def test_the_next_move_appearing_early_makes_the_rest_stale():
    """The image leads the commit by up to 4.6 s — the board says so before any commit does."""
    seg = dict(SEG, next_touches=["a8", "b8"])
    scan = _scan(hands=range(75, 90),
                 cells=lambda idx: [10.0] * 64 if idx < 90 else [90.0] + [10.0] * 63)
    out = fs.classify(seg, scan)
    assert out[87] == "occluded", "still the committed position, just covered"
    assert out[90] == "stale" and out[117] == "stale"


def test_a_handshake_in_the_middle_stays_occluded():
    """No commit follows it and the board does not move, so the position still holds."""
    scan = _scan(hands=range(30, 48))
    out = fs.classify(SEG, scan)
    assert out[33] == "occluded", "a hand that leaves again does not invalidate the FEN"
    assert out[60] == "clean" and out[117] == "clean"


def test_a_fidgeting_hand_does_not_cost_the_whole_position():
    """Measured on ply 49 of 00-39-57: a hand in 35 of 50 frames used to blank all 50."""
    scan = _scan(hands=[i for i in range(0, 120, 3) if (i // 3) % 3])
    out = fs.classify(SEG, scan)
    assert sum(v == "clean" for v in out.values()) == 14, "every gap between reaches still counts"


def test_a_piece_that_falls_over_taints_the_rest_of_the_interval():
    """No hand touches it, and no sensor that looks for one can see it. The commit's board can."""
    scan = _scan(cells=lambda idx: [10.0] * 64 if idx < 60 else [90.0] + [10.0] * 63)
    out = fs.classify(SEG, scan)
    assert out[57] == "clean"
    assert out[60] == "changed" and out[117] == "changed"


def test_a_lamp_dimming_over_the_interval_is_not_a_moved_piece():
    """Lighting drift once flagged 877 k of 906 k pixels — the global shift comes off first."""
    scan = _scan(cells=lambda idx: [10.0 + idx // 3] * 64)
    assert set(fs.classify(SEG, scan).values()) == {"clean"}


def test_something_crossing_the_board_is_not_a_fallen_piece():
    """A deviation that comes back is a shadow or a sleeve; only a lasting one is a moved piece."""
    scan = _scan(cells=lambda idx: [90.0] + [10.0] * 63 if 30 <= idx < 45 else [10.0] * 64)
    assert "changed" not in fs.classify(SEG, scan).values()


def test_the_skin_read_alone_takes_a_frame_out():
    """58 frames in this corpus carry fingertips at the border that stay under the model's 0.20."""
    scan = _scan(skin={60})
    assert fs.classify(SEG, scan)[60] == "occluded"


def test_eight_clean_frames_come_out_spread_over_the_position():
    scan = _scan(hands=range(90, 120))
    clean, _ = fs.select(fs.classify(SEG, scan))
    assert len(clean) == 8
    assert clean == sorted(clean) and len(set(clean)) == 8
    assert max(clean) < 90, "nothing from the reach"


def test_a_position_without_eight_clean_frames_gives_what_it_has():
    """Fewer is fine (User, 2026-08-18) — inventing one would mean a hand in the clean pool."""
    scan = _scan(hands=range(12, 120))
    clean, _ = fs.select(fs.classify(SEG, scan))
    assert clean == [0, 3, 6, 9]


def test_the_dirty_pile_takes_the_withdrawal_before_the_stale_tail():
    """A hand over a KNOWN position is labelable; a board that has already moved on is not."""
    scan = _scan(hands=range(0, 30),
                 cells=lambda idx: [10.0] * 64 if idx < 90 else [90.0] + [10.0] * 63)
    reasons = fs.classify(SEG, scan)
    _, dirty = fs.select(reasons, dirty_per_position=4)
    assert all(reasons[i] == "occluded" for i in dirty), "the stale tail only fills what is left"
    assert max(dirty) < 90


def test_the_dirty_pile_falls_back_to_the_stale_tail_when_it_must():
    scan = _scan(cells=lambda idx: [10.0] * 64 if idx < 30 else [90.0] + [10.0] * 63)
    reasons = fs.classify(SEG, scan)
    _, dirty = fs.select(reasons, dirty_per_position=4)
    assert len(dirty) == 4
    assert all(reasons[i] == "changed" for i in dirty), "nothing explains it, so it is not stale"


def test_a_corrected_frame_wins_its_slot_while_it_stays_near():
    """The 8 725 identity corrections are keyed by frame index — picking that index keeps them."""
    from chesslab.realgames import pick_spread

    items = list(range(20))
    assert pick_spread(items, lambda i: True, 4, prefer={5}, tol=0) == [0, 6, 13, 19]
    assert pick_spread(items, lambda i: True, 4, prefer={5}, tol=2) == [0, 5, 13, 19]
    assert pick_spread(items, lambda i: True, 4, prefer={11}, tol=2) == [0, 6, 11, 19]
