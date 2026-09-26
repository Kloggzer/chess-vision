"""Stage 2 — game state: the exact FEN at each capture time, the source of the labels. Purely
logical; orientation lives in the calibration profile.
"""

from __future__ import annotations

import chess
import chess.pgn

from . import config
from .work_audit import measure


class GameState:
    """State engine for PGN replay (Stage 3 mode A) and free play (mode B)."""

    def __init__(self, fen: str | None = None) -> None:
        self.board = chess.Board(fen) if fen else chess.Board()
        # Cheap semantic identity for the work auditor; hashing the board would do the work being
        # measured.
        self._revision = 0
        self._fen_cache: tuple[int, str] | None = None

    def fen(self) -> str:
        if self._fen_cache is not None and self._fen_cache[0] == self._revision:
            return self._fen_cache[1]
        with measure("FEN serializations", (id(self), self._revision)):
            value = self.board.fen()
        self._fen_cache = (self._revision, value)
        return value

    def piece_map(self) -> dict[str, str]:
        """{'e1': 'K', 'e8': 'k', ...}, occupied squares only."""
        return {chess.square_name(sq): piece.symbol() for sq, piece in self.board.piece_map().items()}

    def label_for(self, square: str) -> str:
        """Label class for a square: 'empty' or e.g. 'wK', 'bP'."""
        sq = self._parse_square(square)
        piece = self.board.piece_at(sq)
        return config.label_from_piece(piece.symbol() if piece else None)

    def labels(self) -> dict[str, str]:
        """All 64 squares -> label (occupied + 'empty')."""
        return {chess.square_name(sq): self.label_for(chess.square_name(sq)) for sq in chess.SQUARES}

    def is_game_over(self) -> bool:
        return self.board.is_game_over()

    def ply(self) -> int:
        """Ply index starting at 0."""
        return self.board.ply()

    def push_san(self, san: str) -> None:
        """Raises on illegal/ambiguous/malformed move (chess.*Error <: ValueError)."""
        self.board.push_san(san)
        self._revision += 1

    def undo(self) -> chess.Move:
        """Take back the last half-move (live `undo`). Raises IndexError if empty."""
        move = self.board.pop()
        self._revision += 1
        return move

    def set_fen(self, fen: str) -> None:
        """Set position (live `fen <FEN>`). Raises ValueError on syntax error."""
        self.board.set_fen(fen)
        self._revision += 1

    @staticmethod
    def _parse_square(square: str) -> chess.Square:
        try:
            return chess.parse_square(square.strip().lower())
        except ValueError as e:
            raise ValueError(f"invalid square: {square!r}") from e



def possible_labels(board: chess.Board, plies: int = 1) -> dict[str, set[str]]:
    """Per square, every label reachable within `plies` half-moves, the CURRENT placement included —
    most frames sit between moves. Kotlin twin: `Expected.kt possibleLabels`.
    """
    out: dict[str, set[str]] = {chess.square_name(sq): set() for sq in chess.SQUARES}
    seen: set[str] = set()
    level = [board]
    for depth in range(plies + 1):
        kept = []
        for b in level:
            key = b.board_fen()
            if key in seen:
                continue
            seen.add(key)
            for sq in chess.SQUARES:
                piece = b.piece_at(sq)
                out[chess.square_name(sq)].add(config.label_from_piece(piece.symbol() if piece else None))
            kept.append(b)
        if depth == plies or not kept:
            break
        level = [_child(b, mv) for b in kept for mv in b.legal_moves]
    return out


def _child(board: chess.Board, move: chess.Move) -> chess.Board:
    nxt = board.copy(stack=False)
    nxt.push(move)
    return nxt
