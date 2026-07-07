"""Stage 2 — Game state.

Knows the exact board state (FEN) at each capture time — the source of the labels.
`GameState` is purely logical (knows no camera); orientation (`white_pov`) lives in the
calibration profile and is only connected to geometry in Stage 3.

Label mapping (FEN letter -> class) lives centrally in `config.label_from_piece`, so that
it matches the canonical class list exactly.
"""

from __future__ import annotations

import io
import os
import random
from pathlib import Path

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

def load_pgn_game(source: str | Path) -> chess.pgn.Game:
    """Load PGN from file path OR PGN text; returns the first game."""
    if isinstance(source, (str, Path)) and os.path.exists(source):
        with open(source, encoding="utf-8") as fh:
            game = chess.pgn.read_game(fh)
    else:
        game = chess.pgn.read_game(io.StringIO(str(source)))
    if game is None:
        raise ValueError("no valid game found in PGN source.")
    return game


def castling_rook_squares(board: chess.Board, move: chess.Move) -> tuple[int, int] | None:
    """(rook_from, rook_to) for a castling move on the given board, else None."""
    if not board.is_castling(move):
        return None
    rank = chess.square_rank(move.from_square)
    if board.is_kingside_castling(move):
        return chess.square(7, rank), chess.square(5, rank)   # h-rook -> f
    return chess.square(0, rank), chess.square(3, rank)        #     a-rook -> d


def en_passant_captured_square(board: chess.Board, move: chess.Move) -> int | None:
    """Square of the pawn captured in en passant (NOT the destination square!), else None."""
    if not board.is_en_passant(move):
        return None
    return chess.square(chess.square_file(move.to_square), chess.square_rank(move.from_square))


def _steps_from_board_play(play_move, board: chess.Board, max_plies: int) -> list[dict]:
    """Play a game: `play_move(board) -> chess.Move`. Returns {ply,san,fen} per half-move."""
    steps: list[dict] = []
    for _ in range(max_plies):
        if board.is_game_over():
            break
        move = play_move(board)
        san = board.san(move)
        board.push(move)
        steps.append({"ply": board.ply(), "san": san, "fen": board.fen()})
    return steps


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


def random_game_positions(max_plies: int = 40, seed: int = 42, start_fen: str | None = None) -> list[dict]:
    """Random legal moves — maximum position diversity for data collection."""
    rng = random.Random(seed)
    board = chess.Board(start_fen) if start_fen else chess.Board()
    return _steps_from_board_play(lambda b: rng.choice(list(b.legal_moves)), board, max_plies)


def stockfish_game_positions(stockfish_path: str, max_plies: int = 40,
                             think_time: float = 0.05, start_fen: str | None = None) -> list[dict]:
    """Engine vs. engine via UCI (Stockfish or similar). Needs an installed engine binary."""
    import shutil

    import chess.engine

    if os.path.isfile(stockfish_path):
        resolved = os.path.abspath(stockfish_path)   # resolve relative paths for CreateProcess
    elif shutil.which(stockfish_path):
        resolved = shutil.which(stockfish_path)       # found in PATH
    else:
        raise FileNotFoundError(f"engine binary not found: {stockfish_path!r}")

    board = chess.Board(start_fen) if start_fen else chess.Board()
    with chess.engine.SimpleEngine.popen_uci(resolved) as engine:
        def play(b: chess.Board) -> chess.Move:
            return engine.play(b, chess.engine.Limit(time=think_time)).move

        return _steps_from_board_play(play, board, max_plies)


def pgn_positions(source: str | Path, every: int = 1) -> list[dict]:
    """Replay steps: per half-move {'ply', 'san', 'fen'}.

    `every`: only return every N-th half-move (skip intermediate positions). The
    starting position is not emitted — each entry's move has already been played.
    """
    game = load_pgn_game(source)
    board = game.board()  # respects any FEN header
    steps: list[dict] = []
    idx = 0
    for move in game.mainline_moves():
        san = board.san(move)
        board.push(move)
        idx += 1
        if every <= 1 or idx % every == 0:
            steps.append({"ply": board.ply(), "san": san, "fen": board.fen()})
    return steps
