"""Stage 6 — collection-UI logic (headless): coverage from FEN + recommendations."""

import json

import chess

from chesslab import config
from chesslab.collect_ui import (
    aggregate_fens,
    build_coverage_fen,
    build_recommendation_fen,
    coverage_from_sessions,
    coverage_plan,
    recommend,
)

START_FEN = chess.Board().fen()


def test_aggregate_start_position():
    counts, light, dark = aggregate_fens([START_FEN])
    assert counts["empty"] == 32
    assert counts["wP"] == 8 and counts["bP"] == 8
    assert counts["wK"] == 1 and counts["bQ"] == 1
    # 8 white pawns split across both colors (rank 2 alternates)
    assert light["wP"] + dark["wP"] == 8
    assert light["wP"] == 4 and dark["wP"] == 4
    # totals add up to 64 per frame
    assert sum(counts.values()) == 64


def test_coverage_from_sessions(tmp_path):
    sdir = tmp_path / "s0"
    sdir.mkdir()
    (sdir / "log.jsonl").write_text(
        json.dumps({"frame": "frames/0000.png", "ply": 0, "fen": START_FEN}) + "\n", encoding="utf-8")
    cov = coverage_from_sessions(tmp_path)
    assert cov["sessions"] == 1
    assert cov["frames"] == 1
    assert cov["total_crops"] == 64
    assert cov["counts"]["empty"] == 32


def test_build_recommendation_fen_places_piece_on_requested_color():
    fen = build_recommendation_fen("wQ", "light")
    board = chess.Board(fen)            # must be parseable
    assert board.is_valid()
    # find the white queen; verify it sits on a light square
    sq = next(s for s in chess.SQUARES if board.piece_at(s) == chess.Piece(chess.QUEEN, chess.WHITE))
    assert (chess.square_file(sq) + chess.square_rank(sq)) % 2 == 1  # light

    # king on a specific colour works too (special-cased)
    fen_k = build_recommendation_fen("bK", "dark")
    bk = chess.Board(fen_k)
    assert bk.is_valid()


def test_recommend_prioritizes_missing_color_then_low_count():
    # only the white king has been seen, all on dark -> wK missing on light is a ✗
    counts = {c: 0 for c in config.CLASSES}
    light = {c: 0 for c in config.CLASSES}
    dark = {c: 0 for c in config.CLASSES}
    counts["wK"] = 5
    dark["wK"] = 5
    cov = {"counts": counts, "light": light, "dark": dark}
    rec = recommend(cov, target_per_class=200)
    assert rec is not None
    # first ✗ in canonical piece order is wP (0 on both colours) -> recommended
    assert rec["class"] == "wP"
    assert rec["fen"] and chess.Board(rec["fen"]).is_valid()


def test_recommend_none_when_all_covered():
    counts = {c: 500 for c in config.CLASSES}
    light = {c: 250 for c in config.CLASSES}
    dark = {c: 250 for c in config.CLASSES}
    cov = {"counts": counts, "light": light, "dark": dark}
    assert recommend(cov, target_per_class=200) is None


def test_build_coverage_fen_respects_inventory_and_prefers_deficit_colour():
    # alles voll AUSSER bQ auf dunklen Feldern -> der eine schwarze Damen-Slot muss dorthin
    light = {c: 999 for c in config.CLASSES}
    dark = {c: 999 for c in config.CLASSES}
    dark["bQ"] = 0
    fen, placements = build_coverage_fen(light, dark, target=200)
    board = chess.Board(fen)
    qsq = [s for s, lab in placements.items() if lab == "bQ"]
    assert len(qsq) == 1                                   # nur 1 Dame im Inventar
    assert (chess.square_file(qsq[0]) + chess.square_rank(qsq[0])) % 2 == 0   # dunkel
    # FEN ist parsebar und keine Bauern auf der Grundreihe
    for s in chess.SQUARES:
        p = board.piece_at(s)
        if p and p.piece_type == chess.PAWN:
            assert chess.square_rank(s) not in (0, 7)


def test_coverage_plan_packs_rare_classes_and_converges():
    zero = {c: 0 for c in config.CLASSES}
    plan = coverage_plan(dict(zero), dict(zero), target=4, count=50)
    assert plan and all(p["fen"] for p in plan)
    # erster Aufbau ist dicht (viele Ziel-Crops), nicht 1-2 wie beim Partie-Replay
    assert plan[0]["gains"] >= 20
    # konvergiert: bei target=4 und vollem Inventar sind nach wenigen Aufbauten alle Ziele erfüllt
    assert len(plan) < 50
