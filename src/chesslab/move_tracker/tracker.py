"""Kern des Move-Trackers: Warp -> Per-Feld-Differenz -> bester legaler Zug -> Spielzustand.
Optional CNN-gestützte Occupancy-Recovery bei festgefahrener Diff-Erkennung (Spec 09).

Zustandsmaschine pro Frame:
  - Motion-Gating: Frame-zu-Frame-Differenz hoch -> "Hand im Bild" (MOVING), nicht detektieren.
  - Wird es ruhig (STABLE) und unterscheidet sich vom Referenzbild (= Brett nach dem letzten Zug),
    dann: Per-Feld-Differenz -> unter allen LEGALEN Zügen den wählen, dessen berührte Felder die
    beobachtete Änderung am besten erklären -> Zug anwenden, Referenz aktualisieren.
  - CNN-Recovery (optional): bei stuck/no_legal_move/too_many_changed oder periodisch
    kontrolliert das CNN (cnn_recovery.py) die Occupancy und findet/korrigiert den Zug.

Reuse aus chesslab: Profil/Geometrie (load_profile, _square_to_col_row, board_corners_for_frame,
make_tracker, warp_from_corners) und Kamera (web.camera.open_source: int|URL inkl. IP-Cam).
"""

from __future__ import annotations

import logging
import threading
import time
from collections import deque
from typing import NamedTuple

import chess
import cv2
import numpy as np

log = logging.getLogger("chesslab.move_tracker")

from ..calibration import (
    _square_to_col_row,
    board_corners_for_frame,
    draw_calibration_overlay,
    load_profile,
    make_tracker,
    warp_from_corners,
)
from ..web.camera import open_source

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


# =======================================================================================
# Observer-Seam (Spec 06/09)
# =======================================================================================

class Observation(NamedTuple):
    """Eine Erkennungs-Beobachtung, die ein Observer (Diff/CNN) zurückgibt."""
    move: chess.Move | None
    score: float
    second: float
    changed: frozenset[str]
    source: str                 # "diff" | "cnn"
    note: str = ""


def diff_observer(board: chess.Board, diffs: dict[str, float], change_thr: float) -> Observation:
    """Pure: normalize_diffs → best_legal_move, extrahiert aus dem heutigen _try_detect.
    Keine Verhaltensänderung — nur Struktur für den Observer-Seam (Spec 09 hängt CNN hier ein)."""
    diffs = normalize_diffs(diffs)
    mv, score, second, changed = best_legal_move(board, diffs, change_thr)
    return Observation(move=mv, score=score, second=second,
                       changed=frozenset(changed), source="diff")


class Confirmer:
    """Extrahiertes confirm_frames-Voting (heutiges self._cand-Tupel).

    Gleicher uci × confirm_frames → feed() returns True (bestätigt/committen).
    Anderer uci dazwischen oder feed(None) → Reset.
    """

    def __init__(self, confirm_frames: int) -> None:
        self._confirm_frames = confirm_frames
        self._cand: tuple[str, int] | None = None

    def feed(self, uci: str | None) -> bool:
        """True = bestätigt (committen!). Kein Reset bei None → explizit reset() aufrufen."""
        if uci is None:
            self._cand = None
            return False
        cnt = (self._cand[1] + 1) if (self._cand and self._cand[0] == uci) else 1
        self._cand = (uci, cnt)
        return cnt >= self._confirm_frames

    def reset(self) -> None:
        self._cand = None

    @property
    def count(self) -> int:
        """Aktueller Zähler (0 wenn kein Kandidat)."""
        return self._cand[1] if self._cand else 0


# =======================================================================================
# MoveTracker
# =======================================================================================

class MoveTracker:
    """Liest die Kamera, hält den Spielzustand und das letzte Overlay-Bild (thread-sicher)."""

    def __init__(self, profile: str = "phone", source="0",
                 motion_thr: float = 3.0, settle_frames: int = 4, change_thr: float = 16.0,
                 confirm_frames: int = 2, ambiguity_margin: float | None = None,
                 live_align: bool = True, avg_frames: int = 3, max_changed: int = 6,
                 cnn_run: str | None = None, cnn_conf_thr: float = 0.85,
                 cnn_cooldown_s: float = 2.0, cnn_check_interval_s: float = 10.0) -> None:
        self.profile = load_profile(profile)
        self.cap = open_source(source if not str(source).isdigit() else int(source))
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
        self._confirmer = Confirmer(confirm_frames)   # extrahiertes Voting (ersetzt self._cand)
        self._gray_buf = deque(maxlen=self.avg_frames)  # Ring der letzten ruhigen Graubilder

        # Observer-Seam-Slots (Spec 06); `recovery` wird bei gesetztem cnn_run lazy befüllt.
        self.extra_observers: list = []
        self.recovery = None

        # CNN-Recovery/-Kontrolle (Spec 09): automatischer Beobachter, der (a) bei
        # festgefahrener Diff-Erkennung den Zug per Occupancy findet und (b) periodisch
        # kontrolliert, ob Spielzustand und Brett noch übereinstimmen. torch bleibt aus,
        # solange cnn_run None ist oder nie beobachtet wird.
        self.cnn_run = cnn_run
        self.cnn_conf_thr = cnn_conf_thr
        self.cnn_cooldown_s = cnn_cooldown_s              # Mindestabstand zwischen Recovery-Beobachtungen
        self.cnn_check_interval_s = cnn_check_interval_s  # Intervall der periodischen Kontrolle
        self._cnn_failed = False                          # Modell fehlt/kaputt -> Feature still aus
        self._recovery_confirmer = Confirmer(confirm_frames)  # kein Single-Shot-Commit (Voting)
        self._stuck_reason: str | None = None             # "no_legal_move" | "too_many_changed"
        self._stuck_count = 0                             # wie viele ruhige Frames in Folge stuck
        self._last_cnn_ts = 0.0
        self.recovered_last = False                       # letzter Zug kam aus der CNN-Recovery
        self.cnn_status: str | None = None                # None | "ok" | "mismatch"
        self.cnn_conflicts: list[str] = []                # Felder, die der Kontrolle widersprechen

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
            self._confirmer.reset()
            self._gray_buf.clear()
            self._clear_stuck()
            self.recovered_last = False
            self.cnn_status, self.cnn_conflicts = None, []

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self):
        """Signal zum Beenden setzen und auf Thread-Ende warten (NIEMALS unter self.lock joinen)."""
        self._running = False
        if self._thread is not None and self._thread.is_alive():
            self._thread.join(timeout=2)

    # -- Hauptschleife --
    def _loop(self):
        try:
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
                        self.state, self.stable_count = "moving", 0
                        self._confirmer.reset()
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

                # CNN-Recovery/-Kontrolle AUSSERHALB des Locks (Inference ~100–300 ms CPU).
                if self.cnn_run and not self._cnn_failed:
                    self._cnn_tick(frame)
                time.sleep(0.02)
        finally:
            if hasattr(self.cap, "release"):
                self.cap.release()

    # -- CNN-Recovery & periodische Kontrolle (Spec 09) --
    def _ensure_cnn(self):
        """CnnRecovery lazy bauen; bei fehlendem/kaputtem Run Feature still deaktivieren.
        NIE unter self.lock aufrufen."""
        if self.recovery is not None:
            return self.recovery
        try:
            from .. import config
            from .cnn_recovery import CnnRecovery

            self.recovery = CnnRecovery(config.DATA.models / self.cnn_run, self.profile,
                                        conf_thr=self.cnn_conf_thr)
            return self.recovery
        except Exception as e:  # noqa: BLE001 — Feature aus, Tracker läuft normal weiter
            self._cnn_failed = True
            with self.lock:
                self.note = f"CNN-Recovery deaktiviert: {e}"
            return None

    def _cnn_tick(self, frame) -> None:
        """Ein Beobachtungs-Zyklus, eventgetrieben — nie im Per-Frame-Hot-Path:
        - Recovery: Diff-Pfad persistent stuck (no_legal_move/too_many_changed) + Cooldown.
        - Kontrolle: Brett ruhig und seit cnn_check_interval_s nicht mehr geprüft.
        Ablauf: Snapshot unter Lock → observe OHNE Lock → unter Lock FEN revalidieren + werten."""
        now = time.time()
        with self.lock:
            stable = len(self._gray_buf) >= self.avg_frames and self.state in ("waiting", "move")
            stuck = (self._stuck_reason is not None and self._stuck_count >= self.settle_frames
                     and (now - self._last_cnn_ts) >= self.cnn_cooldown_s)
            periodic = stable and (now - self._last_cnn_ts) >= self.cnn_check_interval_s
            if not (stuck or periodic):
                return
            fen = self.board.fen()
            corners = self._last_corners
        if corners is None:
            return
        recovery = self._ensure_cnn()
        if recovery is None:
            return
        try:
            obs = recovery.observe(frame, corners)          # teuer, bewusst ohne Lock
        except Exception as e:  # noqa: BLE001 — einzelner Fehlversuch, Feature bleibt an
            with self.lock:
                self._last_cnn_ts = now
            log.warning("CNN-Beobachtung fehlgeschlagen: %s", e)
            return
        with self.lock:
            self._last_cnn_ts = now
            if self.board.fen() != fen:                     # Zustand hat sich geändert → verwerfen
                self._recovery_confirmer.reset()
                return
            res = recovery.resync_check(self.board, obs)
            if res["match"]:
                self.cnn_status, self.cnn_conflicts = "ok", []
                self._recovery_confirmer.reset()
                return
            self.cnn_status, self.cnn_conflicts = "mismatch", res["conflicts"]
            uci = res["move"]
            if uci is None:
                # Kein eindeutiger erklärender Zug: nur warnen (Kontrolle), nie raten.
                shown = ", ".join(res["conflicts"][:4]) + ("…" if len(res["conflicts"]) > 4 else "")
                self.note = f"CNN-Kontrolle: Brett weicht ab ({shown}) — Figuren prüfen oder Resync"
                self._recovery_confirmer.reset()
                return
            mv = chess.Move.from_uci(uci)
            if not self._recovery_confirmer.feed(uci):      # Voting statt Single-Shot
                san = self.board.san(mv)
                self.note = (f"CNN-Recovery prüft {san}… "
                             f"({self._recovery_confirmer.count}/{self.confirm_frames})")
                return
            san = self.board.san(mv)
            self.board.push(mv)
            self.history.append(san)
            self.last_move = uci
            self.ref_gray = None                            # Referenz auf neue Stellung neu aufnehmen
            self._gray_buf.clear()
            self.state = "move"
            self.recovered_last = True
            self.cnn_status, self.cnn_conflicts = "ok", []
            self._confirmer.reset()
            self._clear_stuck()
            self.note = f"Zug per CNN-Recovery erkannt: {san} (Übereinstimmung {res['agreement']:.0%})"

    def resync_cnn(self) -> dict:
        """Manueller „Resync per CNN"-Button: einmalige Kontrolle, wendet einen EINDEUTIG
        erklärenden Zug direkt an (bewusst Single-Shot — expliziter Nutzerwunsch)."""
        if not self.cnn_run or self._cnn_failed:
            return {"ok": False, "error": "CNN nicht konfiguriert (--cnn-run) oder deaktiviert"}
        with self.lock:
            frame = None if self._last_frame is None else self._last_frame.copy()
            corners = self._last_corners
            fen = self.board.fen()
        if frame is None or corners is None:
            return {"ok": False, "error": "kein Kamerabild/keine Ecken — Tracker gestartet?"}
        recovery = self._ensure_cnn()
        if recovery is None:
            return {"ok": False, "error": "CNN-Recovery deaktiviert (Modell fehlt/kaputt)"}
        try:
            obs = recovery.observe(frame, corners)
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": f"CNN-Beobachtung fehlgeschlagen: {e}"}
        with self.lock:
            self._last_cnn_ts = time.time()
            if self.board.fen() != fen:
                return {"ok": False, "error": "Brett hat sich während der Analyse geändert"}
            res = recovery.resync_check(self.board, obs)
            if res["match"]:
                self.cnn_status, self.cnn_conflicts = "ok", []
                self.note = "CNN-Resync: Brett stimmt mit dem Spielzustand überein"
                return {"ok": True, "match": True, "conflicts": [], "move": None,
                        "agreement": res["agreement"], "note": self.note}
            self.cnn_status, self.cnn_conflicts = "mismatch", res["conflicts"]
            if res["move"]:
                mv = chess.Move.from_uci(res["move"])
                san = self.board.san(mv)
                self.board.push(mv)
                self.history.append(san)
                self.last_move = res["move"]
                self.ref_gray = None
                self._gray_buf.clear()
                self.state = "move"
                self.recovered_last = True
                self.cnn_status, self.cnn_conflicts = "ok", []
                self._confirmer.reset()
                self._clear_stuck()
                self.note = f"CNN-Resync: Zug übernommen: {san} (Übereinstimmung {res['agreement']:.0%})"
            else:
                shown = ", ".join(res["conflicts"][:4]) + ("…" if len(res["conflicts"]) > 4 else "")
                self.note = f"CNN-Resync: kein eindeutiger Zug — Konflikte auf {shown}"
            return {"ok": True, "match": False, "conflicts": res["conflicts"],
                    "move": res["move"], "agreement": res["agreement"], "note": self.note}

    def _mean_gray(self):
        """Gleitendes Mittel der gepufferten ruhigen Graubilder -> dämpft Sensor-/Lichtrauschen und
        Rest-Jitter der Marker-Nachführung, sodass die Per-Feld-Differenz nicht auf einem einzelnen
        verrauschten Frame beruht."""
        return np.mean(np.stack(list(self._gray_buf)), axis=0).astype(np.uint8)

    def _try_detect(self, cur):
        # --- Compute & normalize diffs ---
        diffs = per_square_diff(self.ref_gray, cur, self.profile.board_size, self.profile.white_pov)

        # --- Empty changed set → ref refresh (absorbiert Restdrift) ---
        changed = {s for s, v in diffs.items() if v >= self.change_thr}
        if not changed:
            self._confirmer.reset()
            self._clear_stuck()
            self.ref_gray = cur
            return

        # --- max_changed gate: Verdeckungs-/Instabilitäts-Gate ---
        if len(changed) > self.max_changed:
            self._confirmer.reset()
            self._mark_stuck("too_many_changed")   # Spec 09: Recovery-Trigger via _cnn_tick
            self.note = f"viel Veränderung ({len(changed)} Felder) — verdeckt/instabil, kein Zug"
            return

        # --- Diff observer (pure: normalize + best_legal_move) ---
        obs = diff_observer(self.board, diffs, self.change_thr)

        # --- score < 0 gate ---
        if obs.move is None or obs.score < 0:
            self._confirmer.reset()
            self._mark_stuck("no_legal_move")      # Spec 09: Recovery-Trigger via _cnn_tick
            self.note = f"Änderung auf {len(changed)} Feldern, aber kein legaler Zug passt — Resync nötig?"
            return

        # --- ambiguity gate ---
        if obs.score - obs.second < self.ambiguity_margin:
            self._confirmer.reset()
            self.note = "mehrdeutige Änderung — bitte sauber ziehen / kurz warten"
            return

        # --- Confirmer voting ---
        uci = obs.move.uci()
        if not self._confirmer.feed(uci):
            cnt = self._confirmer.count
            san = self.board.san(obs.move)
            self.note = f"erkenne {san}… ({cnt}/{self.confirm_frames})"
            return

        # --- Commit ---
        san = self.board.san(obs.move)
        self.board.push(obs.move)
        self.history.append(san)
        self.last_move = obs.move.uci()
        self.ref_gray = cur                         # neue (gemittelte) Referenz = Stellung nach dem Zug
        self.state = "move"
        self._confirmer.reset()
        self._clear_stuck()
        self.recovered_last = False
        self.note = f"Zug erkannt: {san}"
        if self.board.is_checkmate():
            self.note += " — Schachmatt!"

    # -- Stuck-Buchhaltung (unter self.lock aufrufen) --
    def _mark_stuck(self, reason: str) -> None:
        self._stuck_count = (self._stuck_count + 1) if self._stuck_reason == reason else 1
        self._stuck_reason = reason

    def _clear_stuck(self) -> None:
        self._stuck_reason, self._stuck_count = None, 0
        self._recovery_confirmer.reset()

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
                # CNN-Recovery/-Kontrolle (additiv, Spec 09)
                "cnn_active": bool(self.cnn_run) and not self._cnn_failed,
                "recovered_last": self.recovered_last,
                "cnn_status": self.cnn_status,
                "cnn_conflicts": list(self.cnn_conflicts),
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
                self._confirmer.reset()
                self._gray_buf.clear()
                self._clear_stuck()
                self.recovered_last = False
                self.note = "letzter Zug rückgängig"
