"""The label ledger checked against the rules of chess — the audit that proves instead of guessing.

`audit_flags` asks a model and skips every cell a human ruled on, so a wrong correction is invisible
to it. Humans miss things: 2026-08-16, 59 rows vouched for `d8=bQ` where the piece was a king.
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path

import chess

from . import config
from .ioutil import read_jsonl, write_rows
from .labeling import all_squares, load_corrections

#: Only the violations OCCLUSION CANNOT CAUSE. A hidden square lowers a count, never raises one, so
#: "too many" and "pawn on the back rank" stay sound while "no white king" would accuse the hand.
SOUND = (
    chess.STATUS_TOO_MANY_KINGS
    | chess.STATUS_TOO_MANY_WHITE_PAWNS
    | chess.STATUS_TOO_MANY_BLACK_PAWNS
    | chess.STATUS_TOO_MANY_WHITE_PIECES
    | chess.STATUS_TOO_MANY_BLACK_PIECES
    | chess.STATUS_PAWNS_ON_BACKRANK
)
SYMBOL = {"wP": "P", "wN": "N", "wB": "B", "wR": "R", "wQ": "Q", "wK": "K",
          "bP": "p", "bN": "n", "bB": "b", "bR": "r", "bQ": "q", "bK": "k"}


def board_of(labels: dict[str, str]) -> chess.Board:
    """The 64 labels as a position. `empty` and `occluded` both leave the square unset."""
    board = chess.Board(None)
    for square, label in labels.items():
        piece = SYMBOL.get(label)
        if piece:
            board.set_piece_at(chess.parse_square(square), chess.Piece.from_symbol(piece))
    return board


def violations(labels: dict[str, str]) -> list[str]:
    """The names of the sound status flags this position trips, empty when it is legal."""
    status = board_of(labels).status() & SOUND
    return [f.name for f in chess.Status if f.value & status] if status else []


def fen_labels(fen: str) -> dict[str, str]:
    from .state import GameState

    return GameState(fen).labels()


def audit_corrections(paths: config.Paths | None = None) -> dict:
    """Every frame whose CORRECTED board breaks a rule, with the corrections that touch it.

    The verdict is about the PAIR: a stale `fen` and a right correction trip the same wire as a
    right `fen` and a wrong correction. Which side fell is a look at the crop, not a rule.
    """
    paths = paths or config.DATA
    corrections = {}
    from .labeling import ledger_paths

    for ledger in ledger_paths("corrections.jsonl", paths):
        load_corrections(ledger, corrections)
    squares = all_squares()
    rows: list[dict] = []
    # Ueber BEIDE Wurzeln: `sessions/` ist seit dem Zusammenlegen 2026-08-20 leer, und die
    # Ledger sind auf `rg-<name>` gekeyt, nicht auf den Ordnernamen — der Audit fand nie etwas.
    from .session_store.paths import all_sessions

    for sid, session_dir in all_sessions(paths):
        log = session_dir / "log.jsonl"
        if not log.is_file():
            continue
        for entry in read_jsonl(log):
            stem = Path(entry["frame"]).stem
            applied = {sq: corrections[(sid, stem, sq)] for sq in squares
                       if (sid, stem, sq) in corrections}
            if not applied:
                continue
            labels = {**fen_labels(entry["fen"]), **applied}
            broke = violations(labels)
            if broke:
                rows.append({"session_id": sid, "frame": stem, "ply": entry.get("ply"),
                             "violations": broke, "corrections": applied})
    per_session = Counter(r["session_id"] for r in rows)
    per_rule = Counter(v for r in rows for v in r["violations"])
    return {"frames": len(rows), "cells": sum(len(r["corrections"]) for r in rows),
            "corrections_total": len(corrections), "per_session": dict(per_session),
            "per_rule": dict(per_rule), "rows": rows}


def write_report(rows: list[dict], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    write_rows(path, rows)
    return path
