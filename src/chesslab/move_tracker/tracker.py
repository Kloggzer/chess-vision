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

from ..calibration import (  # noqa: E402
    _square_to_col_row,
    board_corners_for_frame,
    draw_calibration_overlay,
    load_profile,
    make_tracker,
    warp_from_corners,
)
from ..web.camera import LatestFrame, open_source  # noqa: E402

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


# Popcount-LUT für 8-Bit-Census-Codes (Hamming-Distanz je Pixel).
_POPCOUNT8 = np.array([bin(i).count("1") for i in range(256)], dtype=np.uint8)


def census_transform(gray) -> np.ndarray:
    """3×3-Census-Transform: je Pixel ein 8-Bit-Code „Zentrum heller als Nachbar?".
    Invariant gegen MONOTONE Helligkeitsänderungen (Schatten dunkeln monoton ab → Code bleibt
    gleich), erfasst aber Struktur/Kanten (echte Figur → Code ändert sich)."""
    g = gray.astype(np.int16)
    code = np.zeros(g.shape, dtype=np.uint8)
    bit = 0
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            nb = np.roll(np.roll(g, dy, axis=0), dx, axis=1)
            code |= (g > nb).astype(np.uint8) << bit
            bit += 1
    return code


def per_square_census_change(ref_gray, cur_gray, board_size: int, white_pov: bool) -> dict[str, float]:
    """Strukturelle Änderung je Feld: mittlere Hamming-Distanz der Census-Codes (0..8),
    auf 0..255 skaliert (vergleichbar mit dem Grau-Diff/change_thr). Klein bei reiner
    Helligkeits-/Schatten-Änderung, groß bei erscheinender/verschwindender Figur."""
    ham = _POPCOUNT8[census_transform(ref_gray) ^ census_transform(cur_gray)]
    out: dict[str, float] = {}
    for sq in _ALL:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov)
        reg = ham[y0:y1, x0:x1]
        out[sq] = float(reg.mean()) * (255.0 / 8.0) if reg.size else 0.0
    return out


def hsv_shadow_squares(ref_bgr, cur_bgr, board_size: int, white_pov: bool, candidates,
                       v_lo: float = 0.45, v_hi: float = 0.95,
                       h_tol: float = 12.0, s_tol: float = 30.0, frac: float = 0.6) -> set[str]:
    """Cast-Shadow-Erkennung nach Cucchiara (HSV): ein Feld ist „Schatten", wenn seine Pixel
    gegenüber der Referenz gleiche Farbe (Hue ~gleich), nicht stärker gesättigt und dunkler
    sind (V-Verhältnis in [v_lo, v_hi]). Nur die `candidates` (bereits als geändert markiert)
    werden geprüft. Ein Handschatten erfüllt das; eine echte Figur nicht (andere Farbe/Struktur)."""
    hr = cv2.cvtColor(ref_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    hc = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    out: set[str] = set()
    for sq in candidates:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov)
        R, C = hr[y0:y1, x0:x1], hc[y0:y1, x0:x1]
        if R.size == 0:
            continue
        Vr, Vc = R[..., 2], C[..., 2]
        ratio = Vc / (Vr + 1e-3)
        dh = np.abs(C[..., 0] - R[..., 0])
        dh = np.minimum(dh, 180.0 - dh)                  # Hue ist zirkulär (0..179)
        ds = C[..., 1] - R[..., 1]
        shadow_px = (ratio >= v_lo) & (ratio <= v_hi) & (dh <= h_tol) & (ds <= s_tol)
        if float(shadow_px.mean()) >= frac and Vc.mean() < Vr.mean():
            out.add(sq)
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


def diff_observer(board: chess.Board, diffs: dict[str, float], change_thr: float,
                  normalize: bool = True) -> Observation:
    """Pure: normalize_diffs → best_legal_move, extrahiert aus dem heutigen _try_detect.
    Keine Verhaltensänderung — nur Struktur für den Observer-Seam (Spec 09 hängt CNN hier ein).
    `normalize=False`, wenn der Aufrufer die Diffs bereits normalisiert hat (Doppelabzug vermeiden)."""
    if normalize:
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
                 motion_thr: float = 3.0, settle_frames: int | None = None, change_thr: float = 16.0,
                 confirm_frames: int | None = None, ambiguity_margin: float | None = None,
                 live_align: bool = True, avg_frames: int | None = None, max_changed: int = 6,
                 cnn_run: str | None = None, cnn_conf_thr: float = 0.85,
                 cnn_cooldown_s: float = 2.0, cnn_check_interval_s: float = 10.0,
                 device: str = "auto", verify_window: int = 8,
                 census_thr: float = 40.0, cnn_verify: bool = False) -> None:
        self.profile = load_profile(profile)
        _src = source if not str(source).isdigit() else int(source)
        _cap = open_source(_src)
        # Grab-Latest NUR für Netz-Streams (URL): killt den akkumulierenden MJPEG-Rückstau
        # (read() liefert sonst das älteste gepufferte JPEG -> Latenz). Lokale Kameras liefern
        # ohnehin den aktuellen Frame; Wrappen würde nur einen Extra-Thread kosten.
        self.cap = LatestFrame(_cap) if isinstance(_src, str) and "://" in _src else _cap
        self.marker_tracker = make_tracker(self.profile)
        self.board = chess.Board()
        self.motion_thr = motion_thr
        # Schnellere Defaults, wenn das CNN jeden Zug verifiziert (es ist dann die
        # Vertrauensinstanz statt Mehr-Frame-Diff-Voting); sonst robustere Zähler.
        _cnn = bool(cnn_run)
        self.settle_frames = settle_frames if settle_frames is not None else (2 if _cnn else 4)
        avg_frames = avg_frames if avg_frames is not None else (2 if _cnn else 3)
        confirm_frames = confirm_frames if confirm_frames is not None else (1 if _cnn else 2)
        self.change_thr = change_thr
        self.confirm_frames = confirm_frames          # gleicher Zug muss N ruhige Frames bestätigt sein
        # Zweitbester Zug muss mind. so viel schlechter sein, sonst gilt die Lage als mehrdeutig:
        self.ambiguity_margin = ambiguity_margin if ambiguity_margin is not None else change_thr
        self.live_align = live_align                  # True: Marker live nachführen; False: Kalib. einfrieren
        self.avg_frames = max(1, avg_frames)          # gleitendes Mittel über N ruhige Frames (Denoise)
        self.max_changed = max_changed                # mehr geänderte Felder => verdeckt/instabil, kein Zug
        self.census_thr = census_thr                  # Schwelle für STRUKTURELLE Änderung (Census, 0..255)
        self._confirmer = Confirmer(confirm_frames)   # extrahiertes Voting (ersetzt self._cand)
        self._gray_buf = deque(maxlen=self.avg_frames)  # Ring der letzten ruhigen Graubilder
        self._bgr_buf = deque(maxlen=self.avg_frames)   # dito in Farbe (für den HSV-Schatten-Test)

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
        self.device = device                             # "auto" | "cpu" | "cuda" (lazy aufgelöst)
        self._device_resolved: str | None = None         # tatsächliches Torch-Device nach erster Nutzung
        self._cnn_failed = False                          # Modell fehlt/kaputt -> Feature still aus
        self._recovery_confirmer = Confirmer(confirm_frames)  # kein Single-Shot-Commit (Voting)
        self._stuck_reason: str | None = None             # "no_legal_move" | "too_many_changed"
        self._stuck_count = 0                             # wie viele ruhige Frames in Folge stuck
        self._last_cnn_ts = 0.0
        self.recovered_last = False                       # letzter Zug kam aus der CNN-Recovery
        self.cnn_status: str | None = None                # None | "ok" | "mismatch"
        self.cnn_conflicts: list[str] = []                # Felder, die der Kontrolle widersprechen

        # Pre-Commit-Verifikation: ein bestätigter Diff-Kandidat wartet, bis das CNN ihn
        # über eine (adaptive) Mehr-Frame-Abstimmung bestätigt oder als Ghost verwirft.
        self.verify_window = verify_window                # max. Frames, die das CNN befragt wird
        self.cnn_verify = cnn_verify                      # Pre-Commit-Verify AN? (Default aus: nicht blockieren)
        self._pending: dict | None = None                 # {"uci","fen","frames"} oder None

        # -- Debug-Metriken (nur Anzeige; unter self.lock gepflegt) --
        self._motion = 0.0
        self._diff_ms = 0.0
        self._infer_ms = 0.0
        self._fps = 0.0
        self._changed: list[str] = []
        self._changed_vals: list[tuple[str, float]] = []   # stärkste Feld-Diffs (sq, wert) für Tuning
        self._shadow_vetoed: list[str] = []                # Felder, die als Cast-Shadow verworfen wurden
        self._best_score = 0.0
        self._second_score = 0.0
        self._candidate_uci: str | None = None
        self._cnn_agreement = 0.0                         # Sicherheit der CNN-Empfehlung (0..1)
        self._cnn_best_move: str | None = None
        self._verify_state: str | None = None             # None|"verifying"|"confirmed"|"ghost"

        self.lock = threading.Lock()
        self.ref_gray = None          # entzerrtes (gemitteltes) Graubild der Stellung NACH dem letzten Zug
        self.ref_bgr = None           # dito in Farbe (Base-Truth fürs HSV-Schatten-Veto)
        self.ref_fen = None           # FEN, die zu ref_gray gehört (Base-Truth = (Bild, FEN)-Paar)
        self._last_cur = None         # zuletzt gemitteltes ruhiges Graubild (für „nichts-verändert"-Reanchor)
        self._last_cur_bgr = None
        self.prev_gray = None         # fürs Motion-Gating
        self.stable_count = 0
        self.state = "init"           # init | waiting | moving | move
        self.history: list[str] = []  # SAN
        self.last_move = None         # uci
        self.note = ""
        self._overlay_jpeg = None
        self._last_encode_ts = 0.0    # Overlay-Encode drosseln (nicht jeden Loop unter Lock)
        self._last_loop_ts = 0.0      # für FPS-Schätzung (EMA)
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
            self.ref_gray = self.ref_bgr = None
            self.ref_fen = None
            self.state = "waiting"
            self._confirmer.reset()
            self._gray_buf.clear()
            self._clear_stuck()
            self.recovered_last = False
            self.cnn_status, self.cnn_conflicts = None, []
            self._pending, self._verify_state = None, None

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

                now = time.time()
                with self.lock:
                    self._last_frame = frame
                    # FPS als EMA der Loop-Rate (nur Anzeige).
                    if self._last_loop_ts:
                        dt = now - self._last_loop_ts
                        if dt > 0:
                            self._fps = 0.9 * self._fps + 0.1 * (1.0 / dt) if self._fps else 1.0 / dt
                    self._last_loop_ts = now

                    self.prev_gray = gray if self.prev_gray is None else self.prev_gray
                    motion = float(cv2.absdiff(gray, self.prev_gray).mean())
                    self.prev_gray = gray
                    self._motion = motion

                    if motion > self.motion_thr:       # Hand/Kamera in Bewegung -> Puffer verwerfen
                        self.state, self.stable_count = "moving", 0
                        self._confirmer.reset()
                        self._gray_buf.clear()
                        self._bgr_buf.clear()
                        self._changed, self._changed_vals = [], []   # Overlay/Debug leeren (Hand im Bild)
                        self._shadow_vetoed = []
                    else:
                        self.stable_count += 1
                        self._gray_buf.append(gray)
                        self._bgr_buf.append(warped)
                        if len(self._gray_buf) >= self.avg_frames:
                            cur = self._mean_gray()    # gleitendes Mittel über N ruhige Frames (denoised)
                            cur_bgr = self._mean_bgr()
                            self._last_cur, self._last_cur_bgr = cur, cur_bgr
                            if self.ref_gray is None:
                                # Erst-/Neu-Aufnahme der Base-Truth: NICHT beim ersten ruhigen
                                # Puffer greifen (eine noch aufliegende Hand würde ein verdecktes
                                # Bild zur Referenz machen), sondern erst nach freier Sicht (Brett
                                # länger ruhig). Der Nutzer hat die Stellung gerade aufgebaut.
                                if self.stable_count >= self.settle_frames:
                                    self._set_ref(cur, cur_bgr)  # Base-Truth = (Bild, aktuelle FEN)
                                else:
                                    self.note = "warte auf freie Sicht aufs Brett…"
                            elif self.stable_count >= self.settle_frames and self.state != "move":
                                self._try_detect(cur, cur_bgr)  # committet erst nach Mehr-Frame-Bestätigung
                        if self.state != "move":
                            self.state = "waiting"

                    # Overlay-Encode drosseln (JPEG ~5–15 ms): hält den Detektions-Hot-Path frei.
                    if now - self._last_encode_ts >= 0.08:
                        self._overlay_jpeg = self._encode_overlay(warped)
                        self._last_encode_ts = now

                # CNN AUSSERHALB des Locks. Verify eines Pending-Kandidaten hat Vorrang
                # (Pre-Commit-Ghost-Filter); sonst Recovery/periodische Kontrolle.
                if self.cnn_run and not self._cnn_failed:
                    if self._pending is not None:
                        self._verify_tick(frame)
                    else:
                        self._cnn_tick(frame)
                time.sleep(0.005)
        finally:
            if hasattr(self.cap, "release"):
                self.cap.release()

    # -- CNN-Recovery & periodische Kontrolle (Spec 09) --
    def _resolve_device(self) -> str:
        """`device` einmal auflösen: 'auto' -> 'cuda' wenn verfügbar, sonst 'cpu'. torch wird
        erst hier importiert (lazy), also nicht im Hot-Path. NIE unter self.lock aufrufen."""
        if self._device_resolved is not None:
            return self._device_resolved
        dev = (self.device or "auto").lower()
        if dev == "auto":
            try:
                import torch  # lazy: erst beim ersten CNN-Einsatz
                dev = "cuda" if torch.cuda.is_available() else "cpu"
            except Exception:  # noqa: BLE001 — kein torch -> CPU (Feature scheitert später sauber)
                dev = "cpu"
        self._device_resolved = dev
        return dev

    def _ensure_cnn(self):
        """CnnRecovery lazy bauen; bei fehlendem/kaputtem Run Feature still deaktivieren.
        NIE unter self.lock aufrufen."""
        if self.recovery is not None:
            return self.recovery
        try:
            from .. import config
            from .cnn_recovery import CnnRecovery

            self.recovery = CnnRecovery(config.DATA.models / self.cnn_run, self.profile,
                                        device=self._resolve_device(), conf_thr=self.cnn_conf_thr)
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
                # „Nichts-verändert"-Recover: der Diff hatte etwas als geändert markiert
                # (Schatten/Drift/Wackeln) und hängt fest, aber das CNN bestätigt: die
                # Occupancy stimmt noch mit dem Spielzustand überein -> KEIN Zug, sondern
                # Referenz aufs aktuelle Bild nachziehen, damit der Diff nicht ewig stuck bleibt.
                if self._stuck_reason is not None and self._last_cur is not None:
                    self._set_ref(self._last_cur, self._last_cur_bgr)
                    self._clear_stuck()
                    self._confirmer.reset()
                    self._verify_state = "resynced"
                    self.note = "CNN: Brett unverändert — Referenz nachgezogen (kein Zug)"
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
            self.ref_gray = self.ref_bgr = None             # Referenz auf neue Stellung neu aufnehmen
            self.ref_fen = None
            self._gray_buf.clear()
            self.state = "move"
            self.recovered_last = True
            self.cnn_status, self.cnn_conflicts = "ok", []
            self._confirmer.reset()
            self._clear_stuck()
            self.note = f"Zug per CNN-Recovery erkannt: {san} (Übereinstimmung {res['agreement']:.0%})"

    def _verify_tick(self, frame) -> None:
        """Pre-Commit-Verifikation eines Diff-Kandidaten (`self._pending`) durchs CNN, autonom
        über mehrere Frames — kein Nutzer-Input. Ablauf wie _cnn_tick: Snapshot unter Lock →
        observe OHNE Lock → unter Lock FEN revalidieren + Mehr-Frame-Abstimmung werten.

        Entscheidung je Beobachtung:
          - verify_move(pending) hoch & CNN-Eigenvorschlag ∈ {pending, None} → Vote pending.
          - CNN-Eigenvorschlag ist ein ANDERER eindeutiger Zug → Vote diesen (Diff war Ghost;
            CNN kennt den echten Zug → Recovery wendet ihn an).
          - sonst unsicher → kein Vote (nächster Frame = neues Bild).
        `_recovery_confirmer` sammelt gleiche Votes bis confirm_frames → Commit. Bleibt es über
        `verify_window` Frames unentschieden → Kandidat als Ghost verwerfen, Base-Truth bleibt."""
        now = time.time()
        with self.lock:
            pending = self._pending
            if pending is None or self.board.fen() != pending["fen"]:
                return
            corners = self._last_corners
        if corners is None:
            return
        recovery = self._ensure_cnn()
        if recovery is None:                                # CNN nicht verfügbar → Fallback:
            with self.lock:                                 # Kandidaten direkt committen.
                if self._pending is pending and self.board.fen() == pending["fen"]:
                    self._commit_move(chess.Move.from_uci(pending["uci"]), pending["cur"],
                                      pending.get("cur_bgr"))
            return
        try:
            _t0 = time.perf_counter()
            obs = recovery.observe(frame, corners)          # teuer, bewusst ohne Lock
            infer_ms = (time.perf_counter() - _t0) * 1000.0
        except Exception as e:  # noqa: BLE001 — einzelner Fehlversuch, nächster Frame erneut
            log.warning("CNN-Verify-Beobachtung fehlgeschlagen: %s", e)
            return
        # Auswertung (rein) außerhalb des Locks vorbereiten.
        pend_mv = chess.Move.from_uci(pending["uci"])
        agree, _n = recovery.verify_move(self.board, pend_mv, obs)
        cnn_mv, best, _second = recovery.score_moves(self.board, obs)
        cnn_uci = cnn_mv.uci() if cnn_mv else None

        with self.lock:
            self._infer_ms = infer_ms
            self._cnn_agreement = max(agree, best)
            self._cnn_best_move = cnn_uci
            if self._pending is not pending or self.board.fen() != pending["fen"]:
                return                                      # Zustand hat sich geändert → verwerfen
            pending["frames"] += 1

            # Entscheiden, wofür dieser Frame stimmt (oder None = unsicher).
            vote: str | None = None
            recovered = False
            if agree >= recovery.min_agreement and cnn_uci in (pending["uci"], None):
                vote = pending["uci"]
            elif cnn_uci is not None and cnn_uci != pending["uci"]:
                vote, recovered = cnn_uci, True             # Diff war Ghost; CNN kennt echten Zug

            if vote is not None and self._recovery_confirmer.feed(vote):
                self._commit_move(chess.Move.from_uci(vote), pending["cur"],
                                  pending.get("cur_bgr"), recovered=recovered)
                if recovered:
                    self.note += "  (Diff-Ghost korrigiert)"
                return
            if vote is not None:
                san = self.board.san(chess.Move.from_uci(vote))
                self.note = (f"CNN prüft {san}… "
                             f"({self._recovery_confirmer.count}/{self.confirm_frames})")

            # Timeout: bleibt das CNN unentschieden (z.B. Verdeckung/geringe Konfidenz) →
            # NICHT blockieren, sondern dem Diff vertrauen und committen. Das CNN kann einen
            # Zug nur noch KORRIGIEREN (anderer eindeutiger Zug), nicht dauerhaft verhindern.
            if pending["frames"] >= self.verify_window and self._recovery_confirmer.count == 0:
                self._commit_move(chess.Move.from_uci(pending["uci"]), pending["cur"],
                                  pending.get("cur_bgr"), recovered=False)
                self.note += "  (CNN unsicher — Diff übernommen)"

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
                self.ref_gray = self.ref_bgr = None
                self.ref_fen = None
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

    def _set_ref(self, cur, cur_bgr=None) -> None:
        """Base-Truth als (Bild, FEN)-Paar setzen: ref_gray/ref_bgr und ref_fen bleiben gekoppelt.
        Immer unter self.lock aufrufen."""
        self.ref_gray = cur
        if cur_bgr is not None:
            self.ref_bgr = cur_bgr
        self.ref_fen = self.board.fen()

    def _mean_gray(self):
        """Gleitendes Mittel der gepufferten ruhigen Graubilder -> dämpft Sensor-/Lichtrauschen und
        Rest-Jitter der Marker-Nachführung, sodass die Per-Feld-Differenz nicht auf einem einzelnen
        verrauschten Frame beruht."""
        return np.mean(np.stack(list(self._gray_buf)), axis=0).astype(np.uint8)

    def _mean_bgr(self):
        """Gleitendes Mittel der ruhigen Farbframes (für den HSV-Schatten-Test)."""
        if not self._bgr_buf:
            return None
        return np.mean(np.stack(list(self._bgr_buf)), axis=0).astype(np.uint8)

    def _commit_move(self, move: chess.Move, cur, cur_bgr=None, recovered: bool = False) -> None:
        """Zug anwenden und Base-Truth = (Bild, FEN nach Zug) setzen. Unter self.lock.
        Von beiden Pfaden genutzt: Direkt-Commit (kein CNN) und verifizierter Verify-Commit."""
        san = self.board.san(move)
        self.board.push(move)
        self.history.append(san)
        self.last_move = move.uci()
        self._set_ref(cur, cur_bgr)
        self.state = "move"
        self._confirmer.reset()
        self._clear_stuck()          # setzt auch _recovery_confirmer zurück
        self._pending = None
        self._verify_state = "confirmed"
        self.recovered_last = recovered
        self.note = f"Zug erkannt: {san}" + (" (CNN-Recovery)" if recovered else "")
        if self.board.is_checkmate():
            self.note += " — Schachmatt!"

    def _try_detect(self, cur, cur_bgr=None):
        # --- Pending-Verifikation läuft: keinen neuen Kandidaten erzeugen (wird gerade
        #     vom CNN über mehrere Frames geprüft). ---
        if self._pending is not None:
            return

        # --- Invariante: Base-Truth ist (Bild, FEN). Passt die FEN nicht mehr zum
        #     aktuellen Brett, ist ref_gray stale -> Neu-Aufnahme erzwingen statt gegen
        #     eine veraltete Referenz zu detektieren. ---
        if self.ref_gray is None or self.ref_fen != self.board.fen():
            self.ref_gray = self.ref_bgr = None
            self.ref_fen = None
            return

        # --- Compute diffs und EINMAL oben normalisieren: alle Gates (Empty, max_changed)
        #     und die Zugsuche arbeiten auf DENSELBEN normalisierten Diffs, damit ein
        #     globaler Belichtungssprung (Handy-AutoExposure) nicht fälschlich als
        #     „zu viel geändert / verdeckt" zählt. ---
        _t0 = time.perf_counter()
        diffs = per_square_diff(self.ref_gray, cur, self.profile.board_size, self.profile.white_pov)
        diffs = normalize_diffs(diffs)
        self._diff_ms = (time.perf_counter() - _t0) * 1000.0

        # --- Kandidaten-Felder (Grau-Diff über Schwelle) ---
        changed = {s for s, v in diffs.items() if v >= self.change_thr}
        # Top-Felder inkl. Wert (auch knapp unter der Schwelle: ab change_thr/2) fürs Tuning:
        # so sieht man live, wie „stark" ein echter Zug vs. Tischwackeln ausschlägt.
        self._changed_vals = sorted(
            ((s, round(v, 1)) for s, v in diffs.items() if v >= self.change_thr * 0.5),
            key=lambda kv: -kv[1])[:8]

        # --- Cast-Shadow-Veto (HSV nach Cucchiara) + Census-Bestätigung ---
        # Ein Feld wird als Schatten verworfen, wenn es (a) farblich wie ein Schatten aussieht
        # (Hue gleich, dunkler) UND (b) Census keine strukturelle Änderung sieht. Nur beides
        # zusammen -> echte Figuren (andere Farbe/Struktur) bleiben immer erhalten.
        self._shadow_vetoed = []
        if cur_bgr is not None and self.ref_bgr is not None and changed:
            cens = per_square_census_change(self.ref_gray, cur, self.profile.board_size,
                                            self.profile.white_pov)
            shadows = hsv_shadow_squares(self.ref_bgr, cur_bgr, self.profile.board_size,
                                         self.profile.white_pov, changed)
            veto = {s for s in changed if s in shadows and cens[s] < self.census_thr}
            if veto:
                changed -= veto
                self._shadow_vetoed = sorted(veto)

        self._changed = sorted(changed)   # nach Veto: für Overlay/Debug (auch bei den Gates unten)
        if not changed:
            self._confirmer.reset()
            self._clear_stuck()
            self._set_ref(cur, cur_bgr)
            return

        # --- max_changed gate: Verdeckungs-/Instabilitäts-Gate (Base-Truth bleibt) ---
        if len(changed) > self.max_changed:
            self._confirmer.reset()
            self._mark_stuck("too_many_changed")   # Spec 09: Recovery-Trigger via _cnn_tick
            self.note = (f"viel Veränderung ({len(changed)} Felder) — verdeckt/instabil, "
                         f"kein Zug übernommen (Base-Truth unverändert)")
            return

        # --- Diff observer (bereits normalisiert -> normalize=False, kein Doppelabzug) ---
        obs = diff_observer(self.board, diffs, self.change_thr, normalize=False)
        # Debug: Kandidat + Scores für die Debug-Card festhalten.
        self._best_score, self._second_score = obs.score, obs.second
        self._candidate_uci = obs.move.uci() if obs.move else None

        # --- score < 0 gate ---
        if obs.move is None or obs.score < 0:
            self._confirmer.reset()
            self._mark_stuck("no_legal_move")      # Spec 09: Recovery-Trigger via _cnn_tick
            self.note = (f"Änderung auf {len(changed)} Feldern, aber kein legaler Zug passt — "
                         f"möglicher Fehlzug, Base-Truth unverändert (Resync nötig?)")
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

        # --- Bestätigter Diff-Kandidat ---
        san = self.board.san(obs.move)
        if self.cnn_verify and self.cnn_run and not self._cnn_failed:
            # NUR wenn Pre-Commit-Verify explizit AN ist: zur CNN-Prüfung anmelden.
            # (Default aus — das CNN soll nicht jeden Zug aufhalten, sondern nur bei Stuck helfen.)
            self._pending = {"uci": uci, "fen": self.board.fen(),
                             "cur": cur, "cur_bgr": cur_bgr, "frames": 0}
            self._recovery_confirmer.reset()
            self._verify_state = "verifying"
            self.note = f"prüfe {san} per CNN…"
            return
        # Standard: Diff committet direkt (schnell). Schatten sind bereits per HSV-Veto raus;
        # bei Stuck/Abweichung greift die CNN-Recovery/-Kontrolle in _cnn_tick.
        self._commit_move(obs.move, cur, cur_bgr, recovered=False)

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
        # Vom Diff-Algorithmus AKTUELL als „geändert" erkannte Felder (magenta) — zeigt live,
        # worauf die Erkennung reagiert (Schatten/Ghosts sofort sichtbar → Tuning-Hilfe).
        changed = set(self._changed)
        for sq in changed:
            x0, y0, x1, y1 = square_region(sq, bs, self.profile.white_pov, inset=0.06)
            cv2.rectangle(img, (x0, y0), (x1, y1), (255, 0, 255), 2)
        # Als Cast-Shadow verworfene Felder (cyan) — zeigt, was das HSV-Veto rausfiltert.
        for sq in self._shadow_vetoed:
            x0, y0, x1, y1 = square_region(sq, bs, self.profile.white_pov, inset=0.06)
            cv2.rectangle(img, (x0, y0), (x1, y1), (255, 255, 0), 2)
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
                # Base-Truth-Diagnose: welche FEN das Referenzbild zeigt (None = Neu-Aufnahme läuft)
                "ref_fen": self.ref_fen,
                # Debug-Card: alle relevanten Live-Metriken (nur Anzeige).
                "debug": {
                    "fps": round(self._fps, 1),
                    "diff_ms": round(self._diff_ms, 1),
                    "infer_ms": round(self._infer_ms, 1),
                    "device": self._device_resolved or self.device,
                    "motion": round(self._motion, 2),
                    "motion_thr": self.motion_thr,
                    "stable_count": self.stable_count,
                    "frames_used": self.avg_frames,
                    "settle_frames": self.settle_frames,
                    "n_changed": len(self._changed),
                    "changed": list(self._changed),
                    "changed_vals": [[s, v] for s, v in self._changed_vals],
                    "shadow_vetoed": list(self._shadow_vetoed),
                    "max_changed": self.max_changed,
                    "change_thr": self.change_thr,
                    "census_thr": self.census_thr,
                    "best_score": round(self._best_score, 1),
                    "second_score": round(self._second_score, 1),
                    "margin": round(self._best_score - self._second_score, 1),
                    "candidate": self._candidate_uci,
                    "confirm_count": self._confirmer.count,
                    "confirm_frames": self.confirm_frames,
                    "stuck_reason": self._stuck_reason,
                    "stuck_count": self._stuck_count,
                    # CNN-Verifikation
                    "verify_state": self._verify_state,
                    "pending_move": None if self._pending is None else self._pending["uci"],
                    "verify_frames": 0 if self._pending is None else self._pending["frames"],
                    "verify_votes": self._recovery_confirmer.count,
                    "cnn_agreement": round(self._cnn_agreement, 3),
                    "cnn_best_move": self._cnn_best_move,
                    "cnn_conf_thr": self.cnn_conf_thr,
                },
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
                self.ref_gray = self.ref_bgr = None                # Referenz neu aufnehmen
                self.ref_fen = None
                self._confirmer.reset()
                self._gray_buf.clear()
                self._clear_stuck()
                self.recovered_last = False
                self._pending, self._verify_state = None, None
                self.note = "letzter Zug rückgängig"
