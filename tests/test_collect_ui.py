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
    sweep_plan,
)
from chesslab.labeling import all_squares
from chesslab.state import GameState

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
    counts = dict.fromkeys(config.CLASSES, 0)
    light = dict.fromkeys(config.CLASSES, 0)
    dark = dict.fromkeys(config.CLASSES, 0)
    counts["wK"] = 5
    dark["wK"] = 5
    cov = {"counts": counts, "light": light, "dark": dark}
    rec = recommend(cov, target_per_class=200)
    assert rec is not None
    # first ✗ in canonical piece order is wP (0 on both colours) -> recommended
    assert rec["class"] == "wP"
    assert rec["fen"] and chess.Board(rec["fen"]).is_valid()


def test_recommend_none_when_all_covered():
    counts = dict.fromkeys(config.CLASSES, 500)
    light = dict.fromkeys(config.CLASSES, 250)
    dark = dict.fromkeys(config.CLASSES, 250)
    cov = {"counts": counts, "light": light, "dark": dark}
    assert recommend(cov, target_per_class=200) is None


def test_build_coverage_fen_respects_inventory_and_prefers_deficit_colour():
    # alles voll AUSSER bQ auf dunklen Feldern -> der eine schwarze Damen-Slot muss dorthin
    light = dict.fromkeys(config.CLASSES, 999)
    dark = dict.fromkeys(config.CLASSES, 999)
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
    zero = dict.fromkeys(config.CLASSES, 0)
    plan = coverage_plan(dict(zero), dict(zero), target=4, count=50)
    assert plan and all(p["fen"] for p in plan)
    # erster Aufbau ist dicht (viele Ziel-Crops), nicht 1-2 wie beim Partie-Replay
    assert plan[0]["gains"] >= 20
    # converges: at target=4 with a full inventory, all targets are met after a few setups
    assert len(plan) < 50


def test_sweep_plan_separate_covers_each_special_down_the_files():
    """sweep (special, passes=1, separate): 16 photos; each special piece runs down a file,
    jedes Feld bekommt eine Sonderfigur, K/Q je 8x (eine Linie über 8 Ränge)."""
    plan = sweep_plan(passes=1, together=False)
    assert len(plan) == 16                         # 8 Weiß + 8 Schwarz
    cov = {}
    for pos in plan:
        gs = GameState(pos["fen"])
        for sq in all_squares():
            lab = gs.label_for(sq)
            if lab != "empty":
                cov[lab] = cov.get(lab, 0) + 1
    assert cov["wK"] == 8 and cov["bK"] == 8       # König: 1 Linie x 8 Ränge je Farbe
    assert cov["wQ"] == 8 and cov["bQ"] == 8
    assert cov["wR"] == 16 and cov["wN"] == 16     # 2 Linien je 8 Ränge


def test_sweep_plan_together_halves_frames_and_covers_both_colors():
    """sweep together=True: only 8 photos, but EACH square sees a white AND a black piece."""
    plan = sweep_plan(passes=1, together=True)
    assert len(plan) == 8                          # halbe Fotozahl
    seen = {sq: set() for sq in all_squares()}
    for pos in plan:
        gs = GameState(pos["fen"])
        for sq in all_squares():
            lab = gs.label_for(sq)
            if lab != "empty":
                seen[sq].add(lab[0])               # 'w' / 'b'
    assert all(s == {"w", "b"} for s in seen.values())   # alle 64 Felder beide Farben


def test_sweep_plan_all_is_block_with_pawns_and_specials_each_frame():
    """pieces='all' (together): Specials + Bauern als BLOCK -> nur 8 Fotos, und JEDES Foto zeigt
    Specials UND Bauern (der Overlay-Bug: vorher kamen Bauern erst in späteren Frames)."""
    plan = sweep_plan(pieces="all", passes=1, together=True)
    assert len(plan) == 8                          # Block -> halbe Fotozahl
    cov = {}
    for pos in plan:
        gs = GameState(pos["fen"])
        labs = [gs.label_for(sq) for sq in all_squares()]
        kinds = {lab[1] for lab in labs if lab != "empty"}
        assert "P" in kinds and ({"K", "Q", "R", "B", "N"} & kinds)   # beide je Frame
        for lab in labs:
            if lab != "empty":
                cov[lab] = cov.get(lab, 0) + 1
    assert cov["wP"] == 64 and cov["bP"] == 64     # Bauern voll abgedeckt
    assert cov["wK"] == 8 and cov["bQ"] == 8       # Specials voll abgedeckt
