"""Stufe 2 — Spielzustand.

Kennt den exakten Brettzustand (FEN) zu jedem Aufnahmezeitpunkt — die Quelle der Labels.
`GameState` ist rein logisch (kennt keine Kamera); Orientierung (`white_pov`) lebt im
Kalibrierungsprofil und wird erst in Stufe 3 mit der Geometrie verbunden.

Label-Mapping (FEN-Buchstabe -> Klasse) liegt zentral in `config.label_from_piece`, damit
es exakt der kanonischen Klassenliste entspricht.
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
    """Zustands-Engine für PGN-Replay (Stufe 3 Modus A) und freies Spiel (Modus B)."""

    def __init__(self, fen: str | None = None) -> None:
        self.board = chess.Board(fen) if fen else chess.Board()

    # -- Abfragen --
    def fen(self) -> str:
        return self.board.fen()

    def piece_map(self) -> dict[str, str]:
        """{'e1': 'K', 'e8': 'k', ...} — nur besetzte Felder, FEN-Buchstaben."""
        return {chess.square_name(sq): piece.symbol() for sq, piece in self.board.piece_map().items()}

    def label_for(self, square: str) -> str:
        """Label-Klasse für ein Feld: 'empty' oder z.B. 'wK', 'bP'."""
        sq = self._parse_square(square)
        piece = self.board.piece_at(sq)
        return config.label_from_piece(piece.symbol() if piece else None)

    def labels(self) -> dict[str, str]:
        """Alle 64 Felder -> Label (besetzt + 'empty'). Basis fürs Auto-Labeling."""
        return {chess.square_name(sq): self.label_for(chess.square_name(sq)) for sq in chess.SQUARES}

    def legal_moves_san(self) -> list[str]:
        return [self.board.san(m) for m in self.board.legal_moves]

    def is_game_over(self) -> bool:
        return self.board.is_game_over()

    def ply(self) -> int:
        """Halbzug-Index ab 0."""
        return self.board.ply()

    # -- Zustandsänderungen --
    def push_san(self, san: str) -> None:
        """Wirft bei illegalem/mehrdeutigem/malformiertem Zug (chess.*Error <: ValueError)."""
        self.board.push_san(san)

    def push_uci(self, uci: str) -> None:
        move = chess.Move.from_uci(uci)  # InvalidMoveError bei Syntaxfehler
        if move not in self.board.legal_moves:
            raise chess.IllegalMoveError(f"illegaler Zug: {uci}")
        self.board.push(move)

    def undo(self) -> chess.Move:
        """Letzten Halbzug zurücknehmen (live `undo`). Wirft IndexError, wenn leer."""
        return self.board.pop()

    def set_fen(self, fen: str) -> None:
        """Stellung setzen (live `fen <FEN>`). Wirft ValueError bei Syntaxfehler."""
        self.board.set_fen(fen)

    # -- intern --
    @staticmethod
    def _parse_square(square: str) -> chess.Square:
        try:
            return chess.parse_square(square.strip().lower())
        except ValueError as e:
            raise ValueError(f"ungültiges Feld: {square!r}") from e


# --- PGN-Helfer (Modus A) -------------------------------------------------------------

def load_pgn_game(source: str | Path) -> chess.pgn.Game:
    """PGN aus Dateipfad ODER PGN-Text laden; gibt die erste Partie zurück."""
    if isinstance(source, (str, Path)) and os.path.exists(source):
        with open(source, "r", encoding="utf-8") as fh:
            game = chess.pgn.read_game(fh)
    else:
        game = chess.pgn.read_game(io.StringIO(str(source)))
    if game is None:
        raise ValueError("keine gültige Partie in der PGN-Quelle gefunden.")
    return game


def castling_rook_squares(board: chess.Board, move: chess.Move) -> tuple[int, int] | None:
    """(rook_from, rook_to) für einen Rochadezug auf dem gegebenen Brett, sonst None."""
    if not board.is_castling(move):
        return None
    rank = chess.square_rank(move.from_square)
    if board.is_kingside_castling(move):
        return chess.square(7, rank), chess.square(5, rank)   # h-Turm -> f
    return chess.square(0, rank), chess.square(3, rank)        # a-Turm -> d


def en_passant_captured_square(board: chess.Board, move: chess.Move) -> int | None:
    """Feld des bei en passant geschlagenen Bauern (anders als das Zielfeld!), sonst None."""
    if not board.is_en_passant(move):
        return None
    return chess.square(chess.square_file(move.to_square), chess.square_rank(move.from_square))


def _steps_from_board_play(play_move, board: chess.Board, max_plies: int) -> list[dict]:
    """Eine Partie spielen lassen: `play_move(board) -> chess.Move`. Gibt {ply,san,fen} je Halbzug."""
    steps: list[dict] = []
    for _ in range(max_plies):
        if board.is_game_over():
            break
        move = play_move(board)
        san = board.san(move)
        board.push(move)
        steps.append({"ply": board.ply(), "san": san, "fen": board.fen()})
    return steps


def random_game_positions(max_plies: int = 40, seed: int = 42, start_fen: str | None = None) -> list[dict]:
    """Zufällige legale Züge — maximale Stellungsvielfalt für die Datensammlung."""
    rng = random.Random(seed)
    board = chess.Board(start_fen) if start_fen else chess.Board()
    return _steps_from_board_play(lambda b: rng.choice(list(b.legal_moves)), board, max_plies)


def stockfish_game_positions(stockfish_path: str, max_plies: int = 40,
                             think_time: float = 0.05, start_fen: str | None = None) -> list[dict]:
    """Engine vs. Engine über UCI (Stockfish o.ä.). Braucht ein installiertes Engine-Binary."""
    import shutil

    import chess.engine

    if os.path.isfile(stockfish_path):
        resolved = os.path.abspath(stockfish_path)   # relative Pfade für CreateProcess auflösen
    elif shutil.which(stockfish_path):
        resolved = shutil.which(stockfish_path)       # im PATH gefunden
    else:
        raise FileNotFoundError(f"Engine-Binary nicht gefunden: {stockfish_path!r}")

    board = chess.Board(start_fen) if start_fen else chess.Board()
    with chess.engine.SimpleEngine.popen_uci(resolved) as engine:
        def play(b: chess.Board) -> chess.Move:
            return engine.play(b, chess.engine.Limit(time=think_time)).move

        return _steps_from_board_play(play, board, max_plies)


def pgn_positions(source: str | Path, every: int = 1) -> list[dict]:
    """Replay-Schritte: je Halbzug {'ply', 'san', 'fen'}.

    `every`: nur jeden N-ten Halbzug zurückgeben (überspringt Zwischenstellungen). Die
    Startstellung wird nicht ausgegeben — pro Eintrag ist der Zug bereits ausgeführt.
    """
    game = load_pgn_game(source)
    board = game.board()  # respektiert eine evtl. FEN-Kopfzeile
    steps: list[dict] = []
    idx = 0
    for move in game.mainline_moves():
        san = board.san(move)
        board.push(move)
        idx += 1
        if every <= 1 or idx % every == 0:
            steps.append({"ply": board.ply(), "san": san, "fen": board.fen()})
    return steps
