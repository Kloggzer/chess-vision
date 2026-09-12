"""Die Episoden-Segmentierung: sie entscheidet, was als EIN Beleg zaehlt."""

from __future__ import annotations

import importlib.util
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "episode_eval", Path(__file__).resolve().parents[1] / "scripts" / "episode_eval.py")
episode_eval = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(episode_eval)


def _row(sid: str, square: str, ply: int, label: str) -> dict:
    return {"session_id": sid, "square": square, "ply": ply, "frame": f"{ply:06d}", "label": label}


def test_a_piece_that_stands_for_many_plies_is_one_episode():
    rows = [_row("s", "d5", p, "wN") for p in range(6)]

    assert episode_eval.episodes(rows) == [[0, 1, 2, 3, 4, 5]]


def test_a_label_change_on_the_same_square_starts_a_new_episode():
    rows = [_row("s", "d5", 0, "wN"), _row("s", "d5", 1, "wN"),
            _row("s", "d5", 2, "empty"), _row("s", "d5", 3, "bQ")]

    assert episode_eval.episodes(rows) == [[0, 1], [2], [3]]


def test_squares_and_sessions_never_share_an_episode():
    rows = [_row("a", "d5", 0, "wN"), _row("b", "d5", 0, "wN"), _row("a", "e3", 0, "wN")]

    assert sorted(episode_eval.episodes(rows)) == [[0], [1], [2]]


def test_rows_out_of_ply_order_still_segment_by_ply():
    rows = [_row("s", "d5", 2, "bQ"), _row("s", "d5", 0, "wN"), _row("s", "d5", 1, "wN")]

    assert episode_eval.episodes(rows) == [[1, 2], [0]]


def test_one_long_wrong_episode_costs_a_slot_not_many():
    """Der Kern: sechs falsche Zellen aus EINER Platzierung sind ein Fehler, nicht sechs."""
    rows = [_row("s", "d5", p, "wN") for p in range(6)] + [_row("s", "e3", 9, "bP")]
    ok = [False] * 6 + [True]

    s = episode_eval.score(rows, ok)

    assert s["episodes"] == 2 and s["episodes_clean"] == 1
    assert s["episode_acc"] == 0.5
    assert s["cell_acc"] < 0.15
    assert s["share_top1"] == 1.0


def test_majority_rescues_an_episode_that_is_mostly_right():
    rows = [_row("s", "d5", p, "wN") for p in range(5)]
    ok = [True, True, True, False, False]

    s = episode_eval.score(rows, ok)

    assert s["episode_acc"] == 0.0 and s["majority_acc"] == 1.0
