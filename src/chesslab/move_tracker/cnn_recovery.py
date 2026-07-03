"""CNN-gestützte Occupancy-Recovery für den Move-Tracker (specs/rework/09-cnn-recovery.md).

Kein Voll-FEN-Resync: Das CNN liefert nur die **Occupancy** je Feld (leer / besetzt /
verdeckt) — die Figurenidentität kennt der Tracker aus der Zughistorie. Damit lässt sich
(a) bei festgefahrener Frame-Diff-Erkennung der Zug finden, dessen resultierende Occupancy
die Beobachtung am besten erklärt (deckt Schlag, Rochade, en passant strukturell ab), und
(b) periodisch kontrollieren, ob geglaubter Zustand und Brett noch übereinstimmen.

Läuft komplett über die Serving-Facade (`chesslab.serving`) — hier entsteht KEINE eigene
Crop-/Preprocessing-Logik. torch bleibt unimportiert, bis wirklich beobachtet wird.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import chess

from .. import config

log = logging.getLogger("chesslab.move_tracker")

_FILES = "abcdefgh"
_ALL = [f"{f}{r}" for r in range(1, 9) for f in _FILES]


@dataclass(frozen=True)
class OccupancyObservation:
    """CNN-Sicht auf das Brett. Trägt Occupancy (p_besetzt/leer/verdeckt) UND — soweit
    verfügbar — die volle Figuren-Identität je Feld (`label` = vorhergesagte Klasse,
    `conf` = Top-Klassen-Konfidenz). Occupancy ist aus der Identität abgeleitet; die
    Identität erlaubt es, Schläge/Umwandlungen/„welche Figur zog" zu unterscheiden und
    Schatten (Identität unverändert) zuverlässig von echten Zügen zu trennen."""

    p_occ: dict[str, float]
    p_empty: dict[str, float]
    p_occluded: dict[str, float]
    label: dict[str, str] | None = None       # vorhergesagte Klasse je Feld (z.B. 'wP','bK','empty')
    conf: dict[str, float] | None = None       # Konfidenz der Top-Klasse je Feld

    def occupied(self, sq: str) -> bool:
        return self.p_occ[sq] > self.p_empty[sq]

    def confident(self, thr: float) -> dict[str, bool]:
        """Felder, deren Occupancy-Aussage belastbar ist. WICHTIG: occluded-dominante Felder
        sind NIE confident und zählen NIE als besetzt — eine Hand über dem Brett darf weder
        Recovery auslösen noch Felder „besetzen"."""
        return {sq: (max(self.p_occ[sq], self.p_empty[sq]) >= thr
                     and self.p_occluded[sq] < (1.0 - thr))
                for sq in self.p_occ}

    def label_confident(self, thr: float) -> dict[str, bool]:
        """Felder, deren IDENTITÄTS-Aussage belastbar ist: Top-Konfidenz ≥ thr und nicht
        `occluded` (Hand/Verdeckung). Leer, wenn der Run keine Identität liefert."""
        if self.label is None or self.conf is None:
            return {sq: False for sq in self.p_occ}
        return {sq: (self.conf[sq] >= thr and self.label[sq] != "occluded")
                for sq in self.label}


def observation_from_probs(per_square_probs: dict[str, list[float]],
                           classes: list[str]) -> OccupancyObservation:
    """Voller Softmax je Feld → Occupancy + Identität. Klassenindizes IMMER aus der
    `classes`-Liste der Run-config ableiten (13- und 14-Klassen-Runs, nie Positionen raten)."""
    i_empty = classes.index("empty")
    i_occl = classes.index("occluded") if "occluded" in classes else None
    p_occ: dict[str, float] = {}
    p_empty: dict[str, float] = {}
    p_occluded: dict[str, float] = {}
    label: dict[str, str] = {}
    conf: dict[str, float] = {}
    for sq, probs in per_square_probs.items():
        pe = float(probs[i_empty])
        po = float(probs[i_occl]) if i_occl is not None else 0.0
        p_empty[sq] = pe
        p_occluded[sq] = po
        p_occ[sq] = max(0.0, 1.0 - pe - po)     # Summe der 12 Figurenklassen
        top = max(range(len(probs)), key=lambda i: probs[i])   # Identität = argmax-Klasse
        label[sq] = classes[top]
        conf[sq] = float(probs[top])
    return OccupancyObservation(p_occ=p_occ, p_empty=p_empty, p_occluded=p_occluded,
                                label=label, conf=conf)


def _move_touched_squares(board: chess.Board, move: chess.Move) -> set[str]:
    """Felder, die ein Zug physisch verändert: from, to, + Turm bei Rochade, + geschlagener
    Bauer bei en passant. (Spiegelt tracker.move_touched_squares, ohne Zirkularimport.)"""
    sqs = {chess.square_name(move.from_square), chess.square_name(move.to_square)}
    if board.is_castling(move):
        rank = chess.square_rank(move.from_square)
        if chess.square_file(move.to_square) > chess.square_file(move.from_square):
            sqs |= {chess.square_name(chess.square(7, rank)), chess.square_name(chess.square(5, rank))}
        else:
            sqs |= {chess.square_name(chess.square(0, rank)), chess.square_name(chess.square(3, rank))}
    if board.is_en_passant(move):
        sqs.add(chess.square_name(chess.square(chess.square_file(move.to_square),
                                               chess.square_rank(move.from_square))))
    return sqs


def expected_occupancy(board: chess.Board) -> dict[str, bool]:
    """Occupancy je Feld, wie sie laut Spielzustand sein müsste."""
    return {sq: board.piece_at(chess.parse_square(sq)) is not None for sq in _ALL}


def expected_labels(board: chess.Board) -> dict[str, str]:
    """Erwartete Figuren-Klasse je Feld laut Spielzustand ('wP','bK','empty', …) im
    Modell-Vokabular (nutzt `config.label_from_piece`)."""
    out: dict[str, str] = {}
    for sq in _ALL:
        piece = board.piece_at(chess.parse_square(sq))
        out[sq] = config.label_from_piece(piece.symbol() if piece else None)
    return out


class CnnRecovery:
    """Beobachtet das Brett per CNN (Occupancy) und schlägt Züge bzw. Konflikte vor.

    `observe` ist der teure Schritt (~100–300 ms CPU) und darf NIE unter dem Tracker-Lock
    laufen. `score_moves`/`resync_check` sind pure Auswertungen auf der Beobachtung.
    """

    def __init__(self, run_dir: Path, profile, device: str = "cpu",
                 conf_thr: float = 0.85, min_agreement: float = 0.97,
                 margin_squares: int = 1, min_confident: int = 8) -> None:
        self.run_dir = Path(run_dir)
        self.profile = profile
        self.device = device
        self.conf_thr = conf_thr
        self.min_agreement = min_agreement       # bester Zug muss so viel der confident-Felder erklären
        # Margin in FELDERN, nicht als Anteil: ein Schlag unterscheidet sich vom Nicht-Schlag
        # auf Occupancy-Ebene um genau EIN Feld (nur das from-Feld leert sich; das Zielfeld war
        # schon besetzt) — ein Bruchteil-Margin würde Schläge fälschlich als mehrdeutig verwerfen.
        # margin_squares=1: strikt besser reicht; 0 Felder Unterschied (Promotion-Varianten) ⇒ None.
        self.margin_squares = margin_squares
        self.min_confident = min_confident       # unter so vielen confident-Feldern: keine Aussage
        self._classes: list[str] | None = None   # lazy aus run_spec (einmal, nicht je observe)
        if not (self.run_dir / "config.json").exists():
            raise FileNotFoundError(f"Modell-Run nicht gefunden: {self.run_dir}")

    # -- Beobachtung (torch, teuer — nie unter Lock) --
    def observe(self, frame, corners) -> OccupancyObservation:
        from .. import serving  # lazy: torch bleibt aus, solange nicht beobachtet wird

        preds = serving.predict_frame(self.run_dir, frame, corners, self.profile,
                                      device=self.device, return_probs=True)
        if self._classes is None:
            self._classes = serving.run_spec(self.run_dir).classes
        return observation_from_probs({p["square"]: p["probs"] for p in preds}, self._classes)

    # -- Pure Auswertung --
    def score_moves(self, board: chess.Board,
                    obs: OccupancyObservation) -> tuple[chess.Move | None, float, float]:
        """Für jeden legalen Zug: Board-Kopie pushen → erwartete Occupancy → Übereinstimmung
        mit der Beobachtung über die confident-Felder. (None, best, second) wenn nichts
        eindeutig genug ist (min_agreement / margin / zu wenige confident-Felder)."""
        conf = obs.confident(self.conf_thr)
        conf_squares = [sq for sq, ok in conf.items() if ok]
        n = len(conf_squares)
        if n < self.min_confident:
            return None, 0.0, 0.0
        best_mv, best_hits, second_hits = None, -1, -1
        for mv in board.legal_moves:
            b2 = board.copy(stack=False)
            b2.push(mv)
            hits = sum(1 for sq in conf_squares
                       if obs.occupied(sq) == (b2.piece_at(chess.parse_square(sq)) is not None))
            if hits > best_hits:
                best_hits, second_hits, best_mv = hits, best_hits, mv
            elif hits > second_hits:
                second_hits = hits
        best = best_hits / n if best_hits >= 0 else 0.0
        second = second_hits / n if second_hits >= 0 else 0.0
        if best_mv is None or best < self.min_agreement \
           or (best_hits - second_hits) < self.margin_squares:
            # margin in Feldern: Promotion-Varianten (e7e8q vs. e7e8r) sind occupancy-identisch
            # (0 Felder Unterschied) → bewusst None (Nutzer-Hinweis statt Raten).
            return None, best, second
        return best_mv, best, second

    def verify_move(self, board: chess.Board, move: chess.Move,
                    obs: OccupancyObservation) -> tuple[float, int]:
        """Pre-Commit-Check eines konkreten Kandidatenzugs — LOKAL statt Ganzbrett:
        Es zählt nur die Occupancy der Felder, die der Zug physisch verändert (from wird leer,
        to wird besetzt; + Turm bei Rochade, + geschlagener Bauer bei en passant). Das ist genau
        die Definition eines Zuges und robust gegen Schatten/Verdeckung auf dem restlichen Brett.

        Rückgabe (agreement, n): Anteil der berührten & belastbaren Felder, deren beobachtete
        Occupancy zur Stellung NACH dem Zug passt. Beide Endpunkte müssen belastbar (confident)
        sein — ist z.B. das Zielfeld noch von einer Hand verdeckt, gilt der Zug (noch) als
        unbestätigt (agreement 0.0), und die Mehr-Frame-Prüfung wartet auf einen freien Blick."""
        conf = obs.confident(self.conf_thr)
        touched = _move_touched_squares(board, move)
        b2 = board.copy(stack=False)
        b2.push(move)
        checked = [sq for sq in touched if conf.get(sq)]
        if len(checked) < 2:                      # mind. Start- UND Zielfeld müssen belastbar sein
            return 0.0, len(checked)
        hits = sum(1 for sq in checked
                   if obs.occupied(sq) == (b2.piece_at(chess.parse_square(sq)) is not None))
        return hits / len(checked), len(checked)

    # -- Identitäts-basierte Auswertung (nutzt pro-Feld pred_label, nicht nur besetzt/leer) --
    @staticmethod
    def _label_at(board: chess.Board, sq: str) -> str:
        piece = board.piece_at(chess.parse_square(sq))
        return config.label_from_piece(piece.symbol() if piece else None)

    def board_matches_identity(self, board: chess.Board, obs: OccupancyObservation) -> dict:
        """Liegen laut CNN auf allen belastbaren Feldern DIESELBEN Figuren wie geglaubt?
        Der zuverlässige „kein Zug / Schatten"-Detektor: ein Schatten ändert keine Identität.
        {match, conflicts, n, inconclusive}. Zu wenige belastbare Felder → inconclusive."""
        lc = obs.label_confident(self.conf_thr)
        exp = expected_labels(board)
        checked = [sq for sq in _ALL if lc.get(sq)]
        if len(checked) < self.min_confident:
            return {"match": False, "conflicts": [], "n": len(checked), "inconclusive": True}
        conflicts = [sq for sq in checked if obs.label[sq] != exp[sq]]
        return {"match": not conflicts, "conflicts": conflicts,
                "n": len(checked), "inconclusive": False}

    def derive_move_identity(self, board: chess.Board,
                             obs: OccupancyObservation) -> tuple[chess.Move | None, float, float]:
        """Den legalen Zug wählen, dessen Ergebnis-Identitäten am besten zur CNN-Beobachtung
        passen (über die belastbaren Felder). Löst Schlag (Zielfeld-Identität), „welche Figur"
        und Umwandlung (Promo-Figur aus dem Zielfeld-Label). (None, best, second) wenn nicht
        eindeutig genug."""
        lc = obs.label_confident(self.conf_thr)
        conf_squares = [sq for sq, ok in lc.items() if ok]
        n = len(conf_squares)
        if n < self.min_confident:
            return None, 0.0, 0.0
        best_mv, best_hits, second_hits = None, -1, -1
        for mv in board.legal_moves:
            b2 = board.copy(stack=False)
            b2.push(mv)
            hits = sum(1 for sq in conf_squares if obs.label[sq] == self._label_at(b2, sq))
            if hits > best_hits:
                best_hits, second_hits, best_mv = hits, best_hits, mv
            elif hits > second_hits:
                second_hits = hits
        best = best_hits / n if best_hits >= 0 else 0.0
        second = second_hits / n if second_hits >= 0 else 0.0
        if best_mv is None or best < self.min_agreement \
           or (best_hits - second_hits) < self.margin_squares:
            return None, best, second
        return best_mv, best, second

    def verify_move_identity(self, board: chess.Board, move: chess.Move,
                             obs: OccupancyObservation) -> tuple[float, int]:
        """Pre-Commit-Check eines Kandidatenzugs über die IDENTITÄT der berührten Felder
        (from wird geräumt/leer, to trägt die erwartete Figur; + Turm/en-passant). Beide
        Endpunkte müssen belastbar sein, sonst (noch) unbestätigt (0.0)."""
        lc = obs.label_confident(self.conf_thr)
        touched = _move_touched_squares(board, move)
        b2 = board.copy(stack=False)
        b2.push(move)
        checked = [sq for sq in touched if lc.get(sq)]
        if len(checked) < 2:
            return 0.0, len(checked)
        hits = sum(1 for sq in checked if obs.label[sq] == self._label_at(b2, sq))
        return hits / len(checked), len(checked)

    def resync_check(self, board: chess.Board, obs: OccupancyObservation) -> dict:
        """Geglaubte vs. beobachtete Occupancy diffen (nur confident-Felder).

        {"match": bool, "conflicts": [felder], "move": uci|None, "agreement": float}
        — `move` nur, wenn genau ein legaler Zug die Beobachtung hinreichend erklärt."""
        conf = obs.confident(self.conf_thr)
        believed = expected_occupancy(board)
        conflicts = [sq for sq in _ALL if conf.get(sq) and obs.occupied(sq) != believed[sq]]
        if not conflicts:
            return {"match": True, "conflicts": [], "move": None, "agreement": 1.0}
        mv, best, _second = self.score_moves(board, obs)
        return {"match": False, "conflicts": conflicts,
                "move": mv.uci() if mv else None, "agreement": max(best, 0.0)}
