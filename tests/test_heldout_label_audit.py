"""Der Label-Audit ueber jedes Feld jeder Partie, die drei Stufen einzeln."""

from __future__ import annotations

import pytest

from conftest import load_script

audit = load_script("heldout_label_audit")

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def _after(*sans: str) -> str:
    import chess

    board = chess.Board(START)
    for san in sans:
        board.push_san(san)
    return board.fen()


def test_move_between_two_positions_is_read_off_the_board():
    """Wir haben FENs je Ply, keine Zugliste — die Bewegung kommt aus dem Unterschied."""
    moved = audit.moves_between(START, _after("e4"))

    assert moved == [("wP", "e2", "e4")]


def test_a_capture_names_the_taker_not_the_taken():
    """Sonst folgt die Spur der geschlagenen Figur und endet sofort im Nichts."""
    fen = _after("e4", "d5")
    after = _after("e4", "d5", "exd5")

    assert audit.moves_between(fen, after) == [("wP", "e4", "d5")]


def test_the_path_follows_the_piece_through_its_stations():
    """Stufe 2: ein Fund auf einer Station fragt nach allen anderen derselben Figur."""
    fens = {
        1: _after("Nf3"),
        2: _after("Nf3", "d5"),
        3: _after("Nf3", "d5", "Ne5"),
        4: _after("Nf3", "d5", "Ne5", "e6"),
        5: _after("Nf3", "d5", "Ne5", "e6", "Nc6"),
    }

    stations = audit.trace_path(fens, at_ply=3, square="e5")

    assert [s.square for s in stations] == ["f3", "e5", "c6"]
    assert stations[1].first == 3 and stations[1].last == 4


def test_the_path_of_a_piece_that_never_moves_is_one_station():
    fens = {1: _after("e4"), 2: _after("e4", "e5")}

    assert [s.square for s in audit.trace_path(fens, at_ply=1, square="a1")] == ["a1"]


def test_the_inventory_names_a_piece_the_record_lost_but_the_board_keeps():
    """Stufe 3: das FEN fuehrt keinen `wN` mehr, das Modell liest einen — eine Schlagung zu viel."""
    gap = audit.inventory_gap(fen_counts={"wR": 2, "wP": 5}, read_counts={"wR": 1, "wN": 1, "wP": 5})

    assert gap == {"wN": 1}


def test_the_inventory_ignores_what_the_record_merely_has_more_of():
    """Eine verdeckte Figur fehlt in den Lesungen — das ist kein Befund, sondern eine Hand."""
    assert audit.inventory_gap(fen_counts={"wR": 2}, read_counts={"wR": 1}) == {}


@pytest.mark.parametrize("share", [0.0, 0.5])
def test_a_station_below_the_follow_up_threshold_is_not_reported(share: float):
    """Die Spur senkt die Schwelle, sie schafft sie nicht ab."""
    assert not audit.station_disagrees({"wN": share, "wR": 1 - share}, "wR", min_share=0.55)


def test_the_inventory_only_counts_squares_that_are_themselves_a_finding():
    """Sonst schlaegt Stufe 3 bei 18 von 22 Aufnahmen an: ein Bestand, der immer anschlaegt, sagt
    nichts.
    """
    from collections import Counter

    # Ein Feld mit klarem Widerspruch (wN, 9 von 10) und eines mit Rauschen (wN, 1 von 10).
    votes = {("c6", 1, 2, "wR"): Counter({"wN": 9, "wR": 1}),
             ("h7", 1, 2, "bP"): Counter({"wN": 1, "bP": 9})}

    counted = audit.phantom_reads(votes, min_reads=8, min_share=0.7)

    assert counted == {1: {"wN": 1}, 2: {"wN": 1}}, "nur das belegte Fenster zaehlt mit"


def test_the_coverage_comes_from_the_matte_not_from_the_read(tmp_path):
    """Die Lesungs-Zeile traegt KEINE Coverage, der Filter griff nie; die Zahl steht in
    `matte.jsonl`.
    """
    import json

    matte = tmp_path / "matte.jsonl"
    matte.write_text(
        json.dumps({"frame": "000100", "coverage": {"e4": 0.9, "d4": 0.01}}) + "\n"
        + json.dumps({"frame": "000103", "skipped": "zone too big", "coverage": None}) + "\n",
        encoding="utf-8")

    cov = audit.coverage_of(tmp_path)

    assert cov["000100"]["e4"] == 0.9
    assert audit.covered(cov, "000100", "e4") is True
    assert audit.covered(cov, "000100", "d4") is False
    # SAMs Absage traegt keine Zahl: nicht gemessen ist nicht verdeckt (CLAUDE.md).
    assert audit.covered(cov, "000103", "e4") is False
    # Ein Frame ohne Matte-Zeile auch nicht — sonst faellt jede ungemattete Aufnahme weg.
    assert audit.covered(cov, "999999", "e4") is False
