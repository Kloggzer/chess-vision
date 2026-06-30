"""Kern des Move-Trackers: Warp -> Per-Feld-Differenz -> bester legaler Zug -> Spielzustand.

Zustandsmaschine pro Frame:
  - Motion-Gating: Frame-zu-Frame-Differenz hoch -> "Hand im Bild" (MOVING), nicht detektieren.
  - Wird es ruhig (STABLE) und unterscheidet sich vom Referenzbild (= Brett nach dem letzten Zug),
    dann: Per-Feld-Differenz -> unter allen LEGALEN Zügen den wählen, dessen berührte Felder die
    beobachtete Änderung am besten erklären -> Zug anwenden, Referenz aktualisieren.

Reuse aus chesslab: Profil/Geometrie (load_profile, _square_to_col_row, board_corners_for_frame,
make_tracker, warp_from_corners) und Kamera (web.camera._open_source: int|URL inkl. IP-Cam).
"""

from __future__ import annotations

import threading
import time
from collections import deque

import chess
import cv2
import numpy as np

from chesslab.calibration import (
    _square_to_col_row,
    board_corners_for_frame,
    draw_calibration_overlay,
    load_profile,
    make_tracker,
    warp_from_corners,
)
from chesslab.web.camera import _open_source

_FILES = "abcdefgh"
_ALL = [f"{f}{r}" for r in range(1, 9) for f in _FILES]


def square_region(square: str, board_size: int, white_pov: bool, inset: float = 0.16):
    """Pixel-Box (x0,y0,x1,y1) der Zelle im entzerrten board_size-Bild, leicht nach innen versetzt
    (gegen Grid-Linien-/Nachbar-Rauschen)."""
    col, row = _square_to_col_row(square, white_pov)
    cell = board_size / 8.0
    m = cell * inset
    return (int(col * cell + m), int(row * cell + m),
            int((col + 1) * cell - m), int((row + 1) * cell - m))


def square_center(square: str, board_size: int, white_pov: bool):
    col, row = _square_to_col_row(square, white_pov)
    cell = board_size / 8.0
    return int((col + 0.5) * cell), int((row + 0.5) * cell)


def per_square_diff(gray_a, gray_b, board_size: int, white_pov: bool) -> dict[str, float]:
    """Mittlere absolute Helligkeitsdifferenz je Feld zwischen zwei entzerrten Graustufenbildern."""
    d = cv2.absdiff(gray_a, gray_b)
    out: dict[str, float] = {}
    for sq in _ALL:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov)
        out[sq] = float(d[y0:y1, x0:x1].mean()) if (y1 > y0 and x1 > x0) else 0.0
    return out


def move_touched_squares(board: chess.Board, move: chess.Move) -> set[str]:
    """Felder, die ein Zug physisch verändert: from, to, + Turm bei Rochade, + geschlagener Bauer
    bei en passant."""
    sqs = {chess.square_name(move.from_square), chess.square_name(move.to_square)}
    if board.is_castling(move):
        rank = chess.square_rank(move.from_square)
        if chess.square_file(move.to_square) > chess.square_file(move.from_square):  # kurze Rochade
            sqs.add(chess.square_name(chess.square(7, rank)))
            sqs.add(chess.square_name(chess.square(5, rank)))
        else:
            sqs.add(chess.square_name(chess.square(0, rank)))
            sqs.add(chess.square_name(chess.square(3, rank)))
    if board.is_en_passant(move):
        cap_rank = chess.square_rank(move.from_square)
        sqs.add(chess.square_name(chess.square(chess.square_file(move.to_square), cap_rank)))
    return sqs


def normalize_diffs(diffs: dict[str, float]) -> dict[str, float]:
    """Globale Helligkeits-/Belichtungsdrift herausrechnen: pro-Feld-Diff minus dem robusten
    Grundrauschen (Median über alle 64 Felder). Bei einem echten Zug ändern sich nur ~2-4 Felder,
    der Median bleibt ~0 → harmlos. Schwankt dagegen die Handy-AutoExposure und das GANZE Brett wird
    heller/dunkler, hebt der Median diesen Sockel ab, statt 60+ Felder fälschlich als „geändert" zu
    melden. So überlebt die Erkennung Belichtungssprünge beim Hand-Reinhalten."""
    vals = sorted(diffs.values())
    n = len(vals)
    baseline = vals[n // 2] if n else 0.0           # Median (robust gegen die paar bewegten Felder)
    return {s: max(0.0, v - baseline) for s, v in diffs.items()}


def best_legal_move(board: chess.Board, diffs: dict[str, float], change_thr: float):
    """Den legalen Zug wählen, dessen berührte Felder die beobachtete Änderung am besten erklären.

    Score = Summe(diff über berührte Felder) − 0.6·Summe(diff über stark geänderte, NICHT erklärte
    Felder). So gewinnt der Zug, der die Änderung deckt, ohne unberührte Großänderungen zu ignorieren.
    Gibt (move|None, score, second_score, changed_set) zurück; `second_score` ist der zweitbeste Score
    (für eine Mehrdeutigkeits-Prüfung), None wenn nichts hinreichend passt.
    """
    changed = {s for s, v in diffs.items() if v >= change_thr}
    if not changed:
        return None, 0.0, -1e9, changed
    best, best_score, second_score = None, -1e9, -1e9
    for mv in board.legal_moves:
        touched = move_touched_squares(board, mv)
        covered = sum(diffs[s] for s in touched)
        unexplained = sum(diffs[s] for s in changed if s not in touched)
        score = covered - 0.6 * unexplained
        # Beide Endpunkte müssen sich spürbar geändert haben (sonst ist es nicht dieser Zug).
        if diffs[chess.square_name(mv.from_square)] < change_thr or \
           diffs[chess.square_name(mv.to_square)] < change_thr:
            score -= 1000
        if score > best_score:
            best_score, second_score, best = score, best_score, mv
        elif score > second_score:
            second_score = score
    return best, best_score, second_score, changed


class MoveTracker:
    """Liest die Kamera, hält den Spielzustand und das letzte Overlay-Bild (thread-sicher)."""

    def __init__(self, profile: str = "phone", source="0",
                 motion_thr: float = 3.0, settle_frames: int = 4, change_thr: float = 16.0,
                 confirm_frames: int = 2, ambiguity_margin: float | None = None,
                 live_align: bool = True, avg_frames: int = 3, max_changed: int = 6) -> None:
        self.profile = load_profile(profile)
        self.cap = _open_source(source if not str(source).isdigit() else int(source))
        self.marker_tracker = make_tracker(self.profile)
        self.board = chess.Board()
        self.motion_thr = motion_thr
        self.settle_frames = settle_frames
        self.change_thr = change_thr
        self.confirm_frames = confirm_frames          # gleicher Zug muss N ruhige Frames bestätigt sein
        # Zweitbester Zug muss mind. so viel schlechter sein, sonst gilt die Lage als mehrdeutig:
        self.ambiguity_margin = ambiguity_margin if ambiguity_margin is not None else change_thr
        self.live_align = live_align                  # True: Marker live nachführen; False: Kalib. einfrieren
        self.avg_frames = max(1, avg_frames)          # gleitendes Mittel über N ruhige Frames (Denoise)
        self.max_changed = max_changed                # mehr geänderte Felder => verdeckt/instabil, kein Zug
        self._cand = None                             # (uci, count) – laufender Bestätigungs-Kandidat
        self._gray_buf = deque(maxlen=self.avg_frames)  # Ring der letzten ruhigen Graubilder

        self.lock = threading.Lock()
        self.ref_gray = None          # entzerrtes (gemitteltes) Graubild der Stellung NACH dem letzten Zug
        self.prev_gray = None         # fürs Motion-Gating
        self.stable_count = 0
        self.state = "init"           # init | waiting | moving | move
        self.history: list[str] = []  # SAN
        self.last_move = None         # uci
        self.note = ""
        self._overlay_jpeg = None
        self._last_frame = None       # letztes Rohframe (für zuschaltbares Ausrichtungs-Bild)
        self._last_corners = None     # zuletzt benutzte Brett-Ecken (a8,h8,h1,a1) im Rohframe
        self._running = False
        self._thread = None

    # -- Geometrie --
    def _warp(self, frame):
        if self.live_align:
            # Marker live nachführen: der MarkerTracker glättet (Dead-Zone) und HÄLT verdeckte Ecken
            # auf ihrer letzten guten Lage (kein Sprung auf 2-3-Marker-Näherung bei Handabdeckung).
            # Geseedet aus der Kalibrierung -> startet sofort korrekt und korrigiert dann Kameradrift.
            corners = board_corners_for_frame(frame, self.profile, self.marker_tracker)
            if corners is not None:
                self._last_corners = corners
                return warp_from_corners(frame, self.profile, corners)
        # eingefroren bzw. Fallback, falls (noch) keine 4 Ecken bekannt sind: feste Kalibrier-Geometrie.
        corners = self.profile.image_corners
        if not corners or len(corners) < 4:
            return None
        self._last_corners = corners
        return warp_from_corners(frame, self.profile, corners)

    def _gray(self, warped):
        g = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        return cv2.GaussianBlur(g, (5, 5), 0)

    # -- Steuerung --
    def reset_to_start(self, fen: str | None = None):
        """Brett auf Start/FEN setzen und das aktuelle Kamerabild als Referenz nehmen
        (= „ich habe gerade diese Stellung aufgebaut")."""
        with self.lock:
            self.board = chess.Board(fen) if fen else chess.Board()
            self.history, self.last_move, self.note = [], None, "Referenz gesetzt"
            self.ref_gray = None
            self.state = "waiting"
            self._cand = None
            self._gray_buf.clear()

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    # -- Hauptschleife --
    def _loop(self):
        while self._running:
            ok, frame = self.cap.read() if hasattr(self.cap, "read") else (False, None)
            if not ok or frame is None:
                time.sleep(0.03)
                continue
            warped = self._warp(frame)
            if warped is None:
                with self.lock:
                    self.note = "warte auf Marker…"
                time.sleep(0.02)
                continue
            gray = self._gray(warped)

            with self.lock:
                self._last_frame = frame
                self.prev_gray = gray if self.prev_gray is None else self.prev_gray
                motion = float(cv2.absdiff(gray, self.prev_gray).mean())
                self.prev_gray = gray

                if motion > self.motion_thr:       # Hand/Kamera in Bewegung -> Puffer verwerfen
                    self.state, self.stable_count, self._cand = "moving", 0, None
                    self._gray_buf.clear()
                else:
                    self.stable_count += 1
                    self._gray_buf.append(gray)
                    if len(self._gray_buf) >= self.avg_frames:
                        cur = self._mean_gray()    # gleitendes Mittel über N ruhige Frames (denoised)
                        if self.ref_gray is None:  # erste ruhige Sicht -> (gemittelte) Referenz
                            self.ref_gray = cur
                        elif self.stable_count >= self.settle_frames and self.state != "move":
                            self._try_detect(cur)  # committet erst nach Mehr-Frame-Bestätigung
                    if self.state != "move":
                        self.state = "waiting"

                self._overlay_jpeg = self._encode_overlay(warped)
            time.sleep(0.02)

    def _mean_gray(self):
        """Gleitendes Mittel der gepufferten ruhigen Graubilder -> dämpft Sensor-/Lichtrauschen und
        Rest-Jitter der Marker-Nachführung, sodass die Per-Feld-Differenz nicht auf einem einzelnen
        verrauschten Frame beruht."""
        return np.mean(np.stack(list(self._gray_buf)), axis=0).astype(np.uint8)

    def _try_detect(self, cur):
        diffs = per_square_diff(self.ref_gray, cur, self.profile.board_size, self.profile.white_pov)
        diffs = normalize_diffs(diffs)              # Belichtungs-/Helligkeitsdrift abziehen
        changed = [s for s, v in diffs.items() if v >= self.change_thr]
        if not changed:
            self._cand = None
            self.ref_gray = cur                     # ruhig & unverändert -> Referenz nachziehen:
            return                                  # absorbiert Restdrift/abgeklungenes Wackeln
        # Verdeckungs-/Instabilitäts-Gate: ein echter Zug berührt höchstens 4 Felder (Rochade). Mehr
        # geänderte Felder => Hand über dem Brett oder Geometrie wackelt -> NUR melden, KEINEN Zug raten.
        if len(changed) > self.max_changed:
            self._cand = None
            self.note = f"viel Veränderung ({len(changed)} Felder) — verdeckt/instabil, kein Zug"
            return
        mv, score, second, _ = best_legal_move(self.board, diffs, self.change_thr)
        if mv is None or score < 0:
            self._cand = None
            self.note = f"Änderung auf {len(changed)} Feldern, aber kein legaler Zug passt — Resync nötig?"
            return
        if score - second < self.ambiguity_margin:  # zwei Züge erklären die Änderung fast gleich gut
            self._cand = None
            self.note = "mehrdeutige Änderung — bitte sauber ziehen / kurz warten"
            return

        # Mehr-Frame-Bestätigung: derselbe Zug muss über confirm_frames ruhige Frames stabil sein,
        # damit ein einzelner verrauschter Frame keinen Geisterzug committet.
        uci = mv.uci()
        cnt = (self._cand[1] + 1) if (self._cand and self._cand[0] == uci) else 1
        self._cand = (uci, cnt)
        if cnt < self.confirm_frames:
            self.note = f"erkenne {self.board.san(mv)}… ({cnt}/{self.confirm_frames})"
            return

        san = self.board.san(mv)
        self.board.push(mv)
        self.history.append(san)
        self.last_move = mv.uci()
        self.ref_gray = cur                         # neue (gemittelte) Referenz = Stellung nach dem Zug
        self.state = "move"
        self._cand = None
        self.note = f"Zug erkannt: {san}"
        if self.board.is_checkmate():
            self.note += " — Schachmatt!"

    # -- Overlay fürs Web (zeigt, was der Tracker GLAUBT) --
    def _encode_overlay(self, warped):
        img = warped.copy()
        bs = self.profile.board_size
        cell = bs / 8.0
        for i in range(9):
            p = int(i * cell)
            cv2.line(img, (p, 0), (bs, p) if False else (p, bs), (0, 180, 0), 1)
            cv2.line(img, (0, p), (bs, p), (0, 180, 0), 1)
        last = chess.Move.from_uci(self.last_move) if self.last_move else None
        for sq in _ALL:
            piece = self.board.piece_at(chess.parse_square(sq))
            cx, cy = square_center(sq, bs, self.profile.white_pov)
            if last and chess.parse_square(sq) in (last.from_square, last.to_square):
                x0, y0, x1, y1 = square_region(sq, bs, self.profile.white_pov, inset=0.02)
                cv2.rectangle(img, (x0, y0), (x1, y1), (0, 215, 255), 2)
            if piece:
                ch = piece.symbol()
                col = (245, 245, 245) if piece.color == chess.WHITE else (25, 25, 25)
                halo = (25, 25, 25) if piece.color == chess.WHITE else (235, 235, 235)
                cv2.putText(img, ch, (cx - 8, cy + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.8, halo, 4, cv2.LINE_AA)
                cv2.putText(img, ch, (cx - 8, cy + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.8, col, 2, cv2.LINE_AA)
        badge = {"moving": (0, 0, 255), "move": (0, 200, 0), "waiting": (0, 180, 0)}.get(self.state, (160, 160, 160))
        cv2.putText(img, f"{self.state}  {self.note}", (10, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.6, badge, 2, cv2.LINE_AA)
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return buf.tobytes() if ok else None

    # -- Abfragen --
    def status(self) -> dict:
        with self.lock:
            return {
                "fen": self.board.fen(),
                "turn": "white" if self.board.turn else "black",
                "state": self.state,
                "last_move": self.last_move,
                "history": list(self.history),
                "note": self.note,
                "in_check": self.board.is_check(),
                "game_over": self.board.is_game_over(),
                "result": self.board.result() if self.board.is_game_over() else None,
                "fullmove": self.board.fullmove_number,
            }

    def overlay_jpeg(self):
        with self.lock:
            return self._overlay_jpeg

    def calib_overlay_jpeg(self, width: int = 640):
        """Rohes Kamerabild mit Kalibrier-Overlay (grünes Raster/Spielfeld + orange Marker-Box) —
        zum Ausrichten/Schieben des Bretts in den Sichtbereich. Wird nur on-demand gebaut (Toggle im
        UI), daher kein Dauer-Stream. `width` skaliert das Ergebnis fürs kleine Vorschaubild."""
        with self.lock:
            frame = None if self._last_frame is None else self._last_frame.copy()
            corners = self._last_corners
        if frame is None or not corners:
            return None
        img = draw_calibration_overlay(frame, corners, self.profile, labels=False)
        h, w = img.shape[:2]
        if w > width:
            img = cv2.resize(img, (width, max(1, int(h * width / w))))
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return buf.tobytes() if ok else None

    def undo(self):
        with self.lock:
            if self.history:
                self.board.pop()
                self.history.pop()
                self.last_move = None
                self.ref_gray = None                # Referenz neu aufnehmen
                self._cand = None
                self._gray_buf.clear()
                self.note = "letzter Zug rückgängig"
