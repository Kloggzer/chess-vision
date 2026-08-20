"""Stage 2 — Game state.

Knows the exact board state (FEN) at each capture time — the source of the labels.
`GameState` is purely logical (knows no camera); orientation (`white_pov`) lives in the
calibration profile and is only connected to geometry in Stage 3.

Label mapping (FEN letter -> class) lives centrally in `config.label_from_piece`, so that
it matches the canonical class list exactly.
"""

from __future__ import annotations

import chess
import chess.pgn

from . import config


class GameState:
    """State engine for PGN replay (Stage 3 mode A) and free play (mode B)."""

    def __init__(self, fen: str | None = None) -> None:
        self.board = chess.Board(fen) if fen else chess.Board()

    # -- Queries --
    def fen(self) -> str:
        return self.board.fen()

    def piece_map(self) -> dict[str, str]:
        """{'e1': 'K', 'e8': 'k', ...} — only occupied squares, FEN letters."""
        return {chess.square_name(sq): piece.symbol() for sq, piece in self.board.piece_map().items()}

    def label_for(self, square: str) -> str:
        """Label class for a square: 'empty' or e.g. 'wK', 'bP'."""
        sq = self._parse_square(square)
        piece = self.board.piece_at(sq)
        return config.label_from_piece(piece.symbol() if piece else None)

    def labels(self) -> dict[str, str]:
        """All 64 squares -> label (occupied + 'empty'). Basis for auto-labeling."""
        return {chess.square_name(sq): self.label_for(chess.square_name(sq)) for sq in chess.SQUARES}

    def legal_moves_san(self) -> list[str]:
        return [self.board.san(m) for m in self.board.legal_moves]

    def is_game_over(self) -> bool:
        return self.board.is_game_over()

    def ply(self) -> int:
        """Ply index starting at 0."""
        return self.board.ply()

    # -- State changes --
    def push_san(self, san: str) -> None:
        """Raises on illegal/ambiguous/malformed move (chess.*Error <: ValueError)."""
        self.board.push_san(san)

    def push_uci(self, uci: str) -> None:
        move = chess.Move.from_uci(uci)  # InvalidMoveError on syntax error
        if move not in self.board.legal_moves:
            raise chess.IllegalMoveError(f"illegal move: {uci}")
        self.board.push(move)

    def undo(self) -> chess.Move:
        """Take back the last half-move (live `undo`). Raises IndexError if empty."""
        return self.board.pop()

    def set_fen(self, fen: str) -> None:
        """Set position (live `fen <FEN>`). Raises ValueError on syntax error."""
        self.board.set_fen(fen)

    # -- intern --
    @staticmethod
    def _parse_square(square: str) -> chess.Square:
        try:
            return chess.parse_square(square.strip().lower())
        except ValueError as e:
            raise ValueError(f"invalid square: {square!r}") from e


# --- PGN-Helfer (Modus A) -------------------------------------------------------------

def physical_inventory_violations(fen: str, inventory: dict[str, int] | None = None) -> list[str]:
    """Return labels that require more physical pieces than available per color.

    A standard set has one queen per color. Legal chess can create a second queen via
    promotion, but if the real board uses a chip/upside-down piece, auto-labeling that
    square as a queen would poison the training data.
    """
    inv = inventory or config.DEFAULT_INVENTORY
    board = chess.Board(fen)
    counts = {f"{color}{ptype}": 0 for color in ("w", "b") for ptype in inv}
    for piece in board.piece_map().values():
        color = "w" if piece.color == chess.WHITE else "b"
        label = f"{color}{piece.symbol().upper()}"
        counts[label] = counts.get(label, 0) + 1
    out: list[str] = []
    for label, count in sorted(counts.items()):
        limit = inv.get(label[1], 0)
        if count > limit:
            out.append(f"{label} {count}/{limit}")
    return out


