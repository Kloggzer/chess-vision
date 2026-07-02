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

log = logging.getLogger("chesslab.move_tracker")

_FILES = "abcdefgh"
_ALL = [f"{f}{r}" for r in range(1, 9) for f in _FILES]


@dataclass(frozen=True)
class OccupancyObservation:
    """Kollabierte CNN-Sicht auf das Brett: je Feld p(besetzt), p(leer), p(verdeckt)."""

    p_occ: dict[str, float]
    p_empty: dict[str, float]
    p_occluded: dict[str, float]

    def occupied(self, sq: str) -> bool:
        return self.p_occ[sq] > self.p_empty[sq]

    def confident(self, thr: float) -> dict[str, bool]:
        """Felder, deren Occupancy-Aussage belastbar ist. WICHTIG: occluded-dominante Felder
        sind NIE confident und zählen NIE als besetzt — eine Hand über dem Brett darf weder
        Recovery auslösen noch Felder „besetzen"."""
        return {sq: (max(self.p_occ[sq], self.p_empty[sq]) >= thr
                     and self.p_occluded[sq] < (1.0 - thr))
                for sq in self.p_occ}


def observation_from_probs(per_square_probs: dict[str, list[float]],
                           classes: list[str]) -> OccupancyObservation:
    """Voller Softmax je Feld → binäre Occupancy. Klassenindizes IMMER aus der
    `classes`-Liste der Run-config ableiten (13- und 14-Klassen-Runs, nie Positionen raten)."""
    i_empty = classes.index("empty")
    i_occl = classes.index("occluded") if "occluded" in classes else None
    p_occ: dict[str, float] = {}
    p_empty: dict[str, float] = {}
    p_occluded: dict[str, float] = {}
    for sq, probs in per_square_probs.items():
        pe = float(probs[i_empty])
        po = float(probs[i_occl]) if i_occl is not None else 0.0
        p_empty[sq] = pe
        p_occluded[sq] = po
        p_occ[sq] = max(0.0, 1.0 - pe - po)     # Summe der 12 Figurenklassen
    return OccupancyObservation(p_occ=p_occ, p_empty=p_empty, p_occluded=p_occluded)


def expected_occupancy(board: chess.Board) -> dict[str, bool]:
    """Occupancy je Feld, wie sie laut Spielzustand sein müsste."""
    return {sq: board.piece_at(chess.parse_square(sq)) is not None for sq in _ALL}


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
        from .. import serving   # lazy: torch bleibt aus, solange nicht beobachtet wird

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
