"""Stufe 6 — Collection-UI: Trainingsdaten-Assistent.

Zweites OpenCV-Fenster neben dem Kamerafenster. Zeigt live Klassenabdeckung,
Hell/Dunkel-Matrix, Session-Fortschritt und eine FEN-Empfehlung für die schwächste Klasse.

**Datenquelle: Session-Logs, nicht das Manifest.** `collect` schreibt nur Frames + FEN;
das Manifest entsteht erst beim `slice`. Die Abdeckung wird daher direkt aus den geloggten
FEN abgeleitet (FEN -> 64 Labels via Stufe 2, square_color deterministisch) — das ergibt
exakt die späteren slice-Zahlen, ist aber sofort beim Aufnehmen verfügbar.

Reine Aggregation/Empfehlung sind headless testbar; das Rendering braucht ein Display.
"""

from __future__ import annotations

import json
from pathlib import Path

import chess
import cv2
import numpy as np

from . import config
from .labeling import square_color
from .state import GameState

CLASSES = config.CLASSES
_PIECES = [c for c in CLASSES if c != "empty"]
_WIN = "chesslab dashboard"
_TYPEMAP = {"P": chess.PAWN, "N": chess.KNIGHT, "B": chess.BISHOP,
            "R": chess.ROOK, "Q": chess.QUEEN, "K": chess.KING}


# --- Aggregation (headless, getestet) -------------------------------------------------

def aggregate_fens(fens: list[str]) -> tuple[dict, dict, dict]:
    counts = {c: 0 for c in CLASSES}
    light = {c: 0 for c in CLASSES}
    dark = {c: 0 for c in CLASSES}
    for fen in fens:
        for square, label in GameState(fen).labels().items():
            counts[label] += 1
            if square_color(square) == "light":
                light[label] += 1
            else:
                dark[label] += 1
    return counts, light, dark


def coverage_from_sessions(sessions_dir: Path) -> dict:
    sessions_dir = Path(sessions_dir)
    fens: list[str] = []
    n_sessions = 0
    if sessions_dir.exists():
        for sdir in sorted(sessions_dir.iterdir()):
            log = sdir / "log.jsonl"
            if not log.exists():
                continue
            n_sessions += 1
            for line in log.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    fens.append(json.loads(line)["fen"])
    counts, light, dark = aggregate_fens(fens)
    return {
        "frames": len(fens),
        "sessions": n_sessions,
        "total_crops": len(fens) * 64,
        "counts": counts,
        "light": light,
        "dark": dark,
    }


# --- FEN-Empfehlung (headless, getestet) ----------------------------------------------

def _chess_sq_color(sq: int) -> str:
    return "dark" if (chess.square_file(sq) + chess.square_rank(sq)) % 2 == 0 else "light"


def build_recommendation_fen(label: str, color: str) -> str | None:
    """Gültige FEN, die `label` auf einem Feld der Farbe `color` platziert (beide Könige da)."""
    if label == "empty" or len(label) != 2:
        return None
    is_white = label[0] == "w"
    ptype = _TYPEMAP[label[1]]
    piece_color = chess.WHITE if is_white else chess.BLACK
    targets = [sq for sq in chess.SQUARES if _chess_sq_color(sq) == color]

    for tsq in targets:
        if ptype == chess.PAWN and chess.square_rank(tsq) in (0, 7):
            continue
        board = chess.Board(None)
        board.turn = chess.WHITE
        if ptype == chess.KING:
            board.set_piece_at(tsq, chess.Piece(chess.KING, piece_color))
            placed = False
            for osq in (chess.A1, chess.A8, chess.H1, chess.H8, chess.D4, chess.E5):
                if osq != tsq and chess.square_distance(osq, tsq) > 1:
                    board.set_piece_at(osq, chess.Piece(chess.KING, not piece_color))
                    placed = True
                    break
            if not placed:
                continue
        else:
            if tsq in (chess.E1, chess.E8):
                continue
            board.set_piece_at(chess.E1, chess.Piece(chess.KING, chess.WHITE))
            board.set_piece_at(chess.E8, chess.Piece(chess.KING, chess.BLACK))
            board.set_piece_at(tsq, chess.Piece(ptype, piece_color))
        if board.is_valid():
            return board.fen()
    return None


# --- Coverage-Generator: dichte Aufbauten statt Partie-Replay (headless, getestet) ----
#
# Kernidee: Der per-Feld-Klassifikator braucht keine LEGALE Stellung — die FEN ist nur
# Label-Quelle. Statt eine Stockfish-Partie nachzustellen (viele Bauern/leere Felder, je
# 1 Dame/König), packen wir pro physischem Aufbau so viele UNTERREPRÄSENTIERTE
# (Figur × Feldfarbe)-Kombis aufs Brett wie das Inventar erlaubt. Über mehrere Aufbauten
# rotiert der Generator automatisch zu den verbleibenden Defiziten (greedy auf das größte
# Defizit). Ergebnis: drastisch weniger Umbauten je gewonnenem seltenem Trainingsbeispiel.


def _color_squares(color: str) -> list[int]:
    return [sq for sq in chess.SQUARES if _chess_sq_color(sq) == color]


def build_coverage_fen(light: dict, dark: dict, target: int,
                       inventory: dict[str, int] | None = None) -> tuple[str, dict[int, str]]:
    """Eine FEN, die das physische Inventar greedy auf die größten (Figur×Feldfarbe)-Defizite
    verteilt. `light`/`dark`: aktuelle Crop-Zahl je Klasse pro Feldfarbe. Rückgabe: (FEN,
    {square: label}). Bauern landen nie auf Grundreihe (Rang 1/8). Keine Legalitätsprüfung."""
    inv = inventory or config.DEFAULT_INVENTORY
    cov = {"light": dict(light), "dark": dict(dark)}
    avail = {label: inv.get(label[1], 0) for label in _PIECES}
    free = {"light": _color_squares("light"), "dark": _color_squares("dark")}
    placements: dict[int, str] = {}
    blocked: set[tuple[str, str]] = set()   # (label, color) ohne nutzbares Feld -> nicht erneut wählen

    while True:
        best, best_def = None, 0
        for label in _PIECES:
            if avail[label] <= 0:
                continue
            for color in ("light", "dark"):
                if (label, color) in blocked or not free[color]:
                    continue
                deficit = target - cov[color][label]
                if deficit > best_def:
                    best_def, best = deficit, (label, color)
        if best is None or best_def <= 0:
            break
        label, color = best
        is_pawn = label[1] == "P"
        sq = next((s for s in free[color] if not (is_pawn and chess.square_rank(s) in (0, 7))), None)
        if sq is None:                       # nur Grundreihen-Felder dieser Farbe frei -> Bauer geht nicht
            blocked.add((label, color))
            continue
        free[color].remove(sq)
        placements[sq] = label
        avail[label] -= 1
        cov[color][label] += 1

    board = chess.Board(None)
    for sq, label in placements.items():
        pc = chess.WHITE if label[0] == "w" else chess.BLACK
        board.set_piece_at(sq, chess.Piece(_TYPEMAP[label[1]], pc))
    return board.fen(), placements


def coverage_plan(light: dict, dark: dict, target: int, count: int,
                  inventory: dict[str, int] | None = None) -> list[dict]:
    """`count` dichte Aufbauten als Positionsliste (wie pgn/play-Schritte: {'ply','san','fen'}),
    fertig für den Aufnahme-Loop. Nach jedem Aufbau wird die Abdeckung simuliert (1 Frame je
    Aufbau angenommen), sodass spätere Aufbauten zu den noch offenen Defiziten weiterrücken.
    Bricht früh ab, sobald alle Ziele erreicht sind."""
    cov_l, cov_d = dict(light), dict(dark)
    out: list[dict] = []
    for i in range(count):
        fen, placements = build_coverage_fen(cov_l, cov_d, target, inventory)
        if not placements:
            break
        for sq, label in placements.items():
            (cov_l if _chess_sq_color(sq) == "light" else cov_d)[label] += 1
        out.append({"ply": i + 1, "san": None, "fen": fen, "gains": len(placements)})
    return out


def recommend(coverage: dict, target_per_class: int = config.UI_TARGET_PER_CLASS,
              warn_frac: float = config.UI_WARN_FRAC) -> dict | None:
    counts, light, dark = coverage["counts"], coverage["light"], coverage["dark"]

    # Priorität 1: fehlende Feldfarben-Abdeckung (✗).
    for c in _PIECES:
        for color, have in (("dark", dark[c]), ("light", light[c])):
            if have == 0:
                fen = build_recommendation_fen(c, color)
                if fen:
                    return {"class": c, "color": color,
                            "reason": f"{c} fehlt auf {color}en Feldern", "fen": fen}

    # Priorität 2/3: unter warn_frac bzw. unter 100 % des Ziels.
    pool = [c for c in _PIECES if counts[c] < warn_frac * target_per_class]
    if not pool:
        pool = [c for c in _PIECES if counts[c] < target_per_class]
    if not pool:
        return None
    c = min(pool, key=lambda c: counts[c])
    color = "dark" if dark[c] <= light[c] else "light"
    pct = int(100 * counts[c] / max(target_per_class, 1))
    return {"class": c, "color": color, "reason": f"{c} bei {pct}% des Ziels",
            "fen": build_recommendation_fen(c, color)}


def copy_to_clipboard(text: str) -> bool:
    try:
        import pyperclip

        pyperclip.copy(text)
        return True
    except Exception:  # noqa: BLE001 - pyperclip optional / kein Clipboard
        return False


# --- Dashboard (Rendering braucht Display) --------------------------------------------

_GREEN = (80, 200, 80)
_YELLOW = (60, 200, 230)
_RED = (60, 60, 230)
_EMPTY_BLUE = (220, 170, 80)
_FG = (230, 230, 230)


class CollectDashboard:
    """Render-only Fenster. Tasten besitzt der collect-Loop (ein globaler waitKey-Stream)."""

    def __init__(self, sessions_dir: Path, target_per_class: int = config.UI_TARGET_PER_CLASS,
                 mode_label: str = "", session_id: str = "") -> None:
        self.sessions_dir = Path(sessions_dir)
        self.target = target_per_class
        self.mode_label = mode_label
        self.session_id = session_id
        self.coverage: dict | None = None
        self._rec: dict | None = None
        self._window = False
        self._last_img = None

    def update(self) -> None:
        self.coverage = coverage_from_sessions(self.sessions_dir)
        self._rec = recommend(self.coverage, self.target)
        img = self._render()
        self._last_img = img
        if not self._window:
            cv2.namedWindow(_WIN, cv2.WINDOW_NORMAL)
            cv2.resizeWindow(_WIN, 900, 700)
            self._window = True
        cv2.imshow(_WIN, img)
        cv2.waitKey(1)

    def image(self):
        return self._last_img

    def recommended_fen(self) -> str | None:
        return self._rec["fen"] if self._rec else None

    def close(self) -> None:
        if self._window:
            cv2.destroyWindow(_WIN)
            self._window = False

    def _bar_color(self, count: int, target: int):
        if count >= target:
            return _GREEN
        if count >= self.target * config.UI_WARN_FRAC:
            return _YELLOW
        return _RED

    def _render(self):
        cov = self.coverage or {"frames": 0, "sessions": 0, "total_crops": 0,
                                 "counts": {c: 0 for c in CLASSES}, "light": {c: 0 for c in CLASSES},
                                 "dark": {c: 0 for c in CLASSES}}
        W, H = 900, 700
        img = np.full((H, W, 3), 30, dtype=np.uint8)

        def text(s, x, y, scale=0.5, color=_FG, thick=1):
            cv2.putText(img, s, (x, y), cv2.FONT_HERSHEY_SIMPLEX, scale, color, thick, cv2.LINE_AA)

        # A) Fortschritt
        text(f"Sessions: {cov['sessions']}  |  Frames: {cov['frames']}  |  Crops: {cov['total_crops']}"
             f"  |  {self.mode_label} {self.session_id}", 14, 28, 0.55)
        prog = min(1.0, cov["total_crops"] / max(config.UI_TOTAL_TARGET, 1))
        cv2.rectangle(img, (14, 40), (W - 14, 54), (70, 70, 70), -1)
        cv2.rectangle(img, (14, 40), (14 + int((W - 28) * prog), 54), _GREEN, -1)

        # B) Klassenabdeckung (Balken)
        piece_counts = [cov["counts"][c] for c in _PIECES]
        empty_target = int(config.UI_EMPTY_TARGET_RATIO * max(piece_counts + [1]))
        text("Klassenabdeckung", 14, 84, 0.55)
        y = 100
        bar_x, bar_max = 70, 320
        for c in CLASSES:
            cnt = cov["counts"][c]
            tgt = empty_target if c == "empty" else self.target
            frac = min(1.0, cnt / max(tgt, 1))
            color = _EMPTY_BLUE if c == "empty" else self._bar_color(cnt, tgt)
            text(c, 14, y + 11, 0.45)
            cv2.rectangle(img, (bar_x, y), (bar_x + int(bar_max * frac), y + 14), color, -1)
            text(str(cnt), bar_x + bar_max + 8, y + 12, 0.42)
            y += 22

        # C) Hell/Dunkel-Matrix
        mx = 470
        text("Hell / Dunkel", mx, 84, 0.55)
        text("hell  dunkel", mx + 70, 100, 0.42)
        y = 116
        for c in CLASSES:
            text(c, mx, y + 10, 0.45)
            for k, (cnt) in enumerate((cov["light"][c], cov["dark"][c])):
                ok = cnt > 0
                cv2.putText(img, "OK" if ok else "X", (mx + 76 + k * 52, y + 11),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, _GREEN if ok else _RED, 1, cv2.LINE_AA)
            y += 22

        # D) Empfehlung
        cv2.rectangle(img, (14, H - 96), (W - 14, H - 14), (45, 45, 45), -1)
        if self._rec:
            text(f"Empfehlung: {self._rec['reason']}", 24, H - 70, 0.55, _YELLOW)
            text(f"FEN: {self._rec['fen']}", 24, H - 46, 0.42)
            text("Taste g im Aufnahmefenster: FEN kopieren", 24, H - 24, 0.42, _GREEN)
        else:
            text("Alle Klassen ausreichend abgedeckt.", 24, H - 50, 0.6, _GREEN)
        return img


def run_ui(sessions_dir: str | None = None, manifest: str | None = None,
           target_per_class: int = config.UI_TARGET_PER_CLASS) -> int:
    """Standalone-Dashboard auf dem aktuellen Stand (ohne laufende Aufnahme)."""
    sdir = Path(sessions_dir) if sessions_dir else config.DATA.sessions
    dash = CollectDashboard(sdir, target_per_class=target_per_class, mode_label="(standalone)")
    dash.update()
    cov = dash.coverage
    print(f"Sessions: {cov['sessions']} | Frames: {cov['frames']} | Crops: {cov['total_crops']}")
    print("q = schließen, g = empfohlene FEN kopieren")
    while True:
        key = cv2.waitKey(50) & 0xFF
        if key == ord("q"):
            break
        if key == ord("g"):
            fen = dash.recommended_fen()
            if fen:
                print(("kopiert: " if copy_to_clipboard(fen) else "FEN: ") + fen)
    dash.close()
    return 0
