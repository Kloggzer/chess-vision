"""Kern des Move-Trackers: Warp -> z-Scores (Rauschmodell) -> LL-Score je legalem Zug -> Spielzustand.
Optional CNN-Verify/-Recovery (Spec 09) und probabilistisches Scoring v2 (Spec 10).

Zustandsmaschine pro Frame:
  - Motion-Gating: Frame-zu-Frame-Differenz hoch (Brett ODER erweitertes ROI um das Brett)
    -> "Hand im Bild" (MOVING), nicht detektieren.
  - Wird es ruhig (STABLE): Per-Feld-Diff vs. Base-Truth -> Median-Normalisierung -> z-Scores
    gegen ein laufendes per-Feld-Rauschmodell -> Log-Likelihood je legalem Zug (relativ zu
    „kein Zug"); Ambiguität wird per Heuristik-Prior aufgelöst oder dem Nutzer gezeigt.
  - CNN-Recovery (optional): bei stuck oder periodisch prüft das CNN (cnn_recovery.py) die
    Identität/Occupancy, findet Züge bis 2 Halbzüge tief und kann einen Diff-Kandidaten
    im Pre-Commit-Verify überstimmen. Ohne CNN: Nudge-/Drift-Zellen-Patch der Referenz.
Vollbild: docs/move-tracker-flow.md (Mermaid).

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


def square_region(square: str, board_size: int, white_pov: bool, inset: float = 0.16,
                  extend_up: float = 0.0):
    """Pixel-Box (x0,y0,x1,y1) der Zelle im entzerrten board_size-Bild, leicht nach innen versetzt
    (gegen Grid-Linien-/Nachbar-Rauschen). `extend_up` (Anteil Zelle) erweitert die Box Richtung
    Bild-oben (hintere Reihe): 3D-Figuren ragen bei schräger Kamera dorthin über (CLAUDE.md-Fallstrick);
    erweiterte Zellen dürfen überlappen — das weiche LL-Scoring verträgt das."""
    col, row = _square_to_col_row(square, white_pov)
    cell = board_size / 8.0
    m = cell * inset
    y0 = row * cell + m - extend_up * cell
    return (int(col * cell + m), max(0, int(y0)),
            int((col + 1) * cell - m), int((row + 1) * cell - m))


def square_center(square: str, board_size: int, white_pov: bool):
    col, row = _square_to_col_row(square, white_pov)
    cell = board_size / 8.0
    return int((col + 0.5) * cell), int((row + 0.5) * cell)


def per_square_diff(gray_a, gray_b, board_size: int, white_pov: bool,
                    extend_up: float = 0.0) -> dict[str, float]:
    """Mittlere absolute Helligkeitsdifferenz je Feld zwischen zwei entzerrten Graustufenbildern."""
    d = cv2.absdiff(gray_a, gray_b)
    out: dict[str, float] = {}
    for sq in _ALL:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov, extend_up=extend_up)
        out[sq] = float(d[y0:y1, x0:x1].mean()) if (y1 > y0 and x1 > x0) else 0.0
    return out


# Popcount-LUT für 8-Bit-Census-Codes (Hamming-Distanz je Pixel).
_POPCOUNT8 = np.array([bin(i).count("1") for i in range(256)], dtype=np.uint8)


def census_transform(gray) -> np.ndarray:
    """3×3-Census-Transform: je Pixel ein 8-Bit-Code „Zentrum heller als Nachbar?".
    Invariant gegen MONOTONE Helligkeitsänderungen (Schatten dunkeln monoton ab → Code bleibt
    gleich), erfasst aber Struktur/Kanten (echte Figur → Code ändert sich)."""
    # Rand REPLICATE-padden statt np.roll: roll würde Randpixel gegen die GEGENSEITE des
    # Bildes vergleichen (Reihe 8 gegen Reihe 1) und die Census-Scores der Randfelder verfälschen.
    g = cv2.copyMakeBorder(gray, 1, 1, 1, 1, cv2.BORDER_REPLICATE).astype(np.int16)
    center = g[1:-1, 1:-1]
    code = np.zeros(center.shape, dtype=np.uint8)
    bit = 0
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            nb = g[1 + dy:g.shape[0] - 1 + dy, 1 + dx:g.shape[1] - 1 + dx]
            code |= (center > nb).astype(np.uint8) << bit
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


class SquareNoise:
    """Laufendes Rauschmodell des per-Feld-Diffs (EMA von Mittel und Streuung) auf den
    bereits median-normalisierten Diffs (sonst springen die z-Scores bei jedem
    Belichtungswechsel). Absorbiert Marker-Jitter, Belichtungsflackern und langsamen,
    räumlich ungleichmäßigen Lichtdrift, den der globale Median-Abzug nicht erwischt.

    Lernen läuft auf JEDEM stabilen Frame, aber nur für Felder unterhalb der Schwelle
    (`exclude` = aktuelle Kandidaten): sonst friert das Modell im Stuck-Zustand ein und
    kann Jitter nie wieder wegadaptieren. Der std-Floor ist zwingend: gegen eine frische
    Referenz ist diff ≈ 0 und die EMA würde sonst kollabieren (z-Scores explodieren).
    Floor 3.0 (≈ 9 Graustufen bei z_thr=3) ist bewusst EMPFINDLICHER als v1 (16):
    clip01-Replay zeigte, dass Floor 5 kontrastarme Züge (schwarzer Bauer auf dunklem
    Feld) verliert; die dadurch möglichen Phantom-Felder (Hand-Reste, AE-Flackern)
    heilt der per-Feld-Anomalie-Patcher in _maybe_patch_anomaly."""

    def __init__(self, alpha: float = 0.05, init_std: float = 6.0, std_floor: float = 3.0) -> None:
        self.alpha = alpha
        self.std_floor = std_floor
        self.mean: dict[str, float] = dict.fromkeys(_ALL, 0.0)
        self.std: dict[str, float] = dict.fromkeys(_ALL, init_std)

    def update(self, diffs: dict[str, float], exclude: set[str] = frozenset()) -> None:
        a = self.alpha
        for sq, d in diffs.items():
            if sq in exclude:
                continue
            m = self.mean[sq]
            self.mean[sq] = (1 - a) * m + a * d
            dev = abs(d - m)
            self.std[sq] = max(self.std_floor, (1 - a) * self.std[sq] + a * dev)

    def z(self, diffs: dict[str, float]) -> dict[str, float]:
        return {sq: (d - self.mean[sq]) / self.std[sq] for sq, d in diffs.items()}


def loglik_scores(board: chess.Board, z: dict[str, float],
                  z_thr: float = 3.0, k: float = 1.0) -> list[tuple[chess.Move, float]]:
    """Log-Likelihood-Score je legalem Zug, relativ zur Hypothese „kein Zug".

    p(Feld geändert) = sigmoid(k·(z − z_thr)); ein Zug „erklärt" seine berührten Felder.
    Relativ zu „kein Zug" trägt jeder Zug Σ logit(p) über seine touched-Felder bei —
    heiße unberührte Felder bestrafen damit automatisch alle Züge, die sie nicht erklären
    (relativ zu Zügen, die es tun). Kein harter Cutoff mehr: ein schwaches Zielfeld
    (weiße Figur auf weißem Feld) senkt den Score, eliminiert den Zug aber nicht.
    Rückgabe absteigend sortiert; leere Liste, wenn keine legalen Züge existieren."""
    # logit(sigmoid(x)) == x: der Beitrag eines Feldes ist direkt k·(z − z_thr), geklippt
    # gegen Ausreißer (ein einzelnes extrem heißes Feld soll nicht alles dominieren).
    logit = {sq: float(np.clip(k * (v - z_thr), -12.0, 12.0)) for sq, v in z.items()}
    scored = [(mv, sum(logit[s] for s in move_touched_squares(board, mv)))
              for mv in board.legal_moves]
    scored.sort(key=lambda t: -t[1])
    return scored


def loglik_pair_scores(board: chess.Board, z: dict[str, float],
                       z_thr: float = 3.0, k: float = 1.0,
                       soft: float | None = None) -> list[tuple[list[chess.Move], float]]:
    """LL-Score für ZUGPAARE (Halbzug + Antwort) — rettet schnelles Spiel ohne CNN:
    fällt die Antwort in den Diff, bevor der erste Zug bestätigt ist, erklärt kein
    Einzelzug mehr die Änderung, ein Paar aber schon. Reihenfolge ist durch side-to-move
    fixiert. Nur Paare, deren SÄMTLICHE from/to-Endpunkte wenigstens schwache Evidenz
    tragen (z ≥ soft), sind Kandidaten — sonst explodiert der Suchraum in Rauschen.
    Rückgabe absteigend sortiert (kann leer sein)."""
    soft = z_thr * 0.5 if soft is None else soft
    logit = {sq: float(np.clip(k * (v - z_thr), -12.0, 12.0)) for sq, v in z.items()}

    def _ok(b, mv):
        return (z[chess.square_name(mv.from_square)] >= soft
                and z[chess.square_name(mv.to_square)] >= soft)

    scored: list[tuple[list[chess.Move], float]] = []
    for mv1 in board.legal_moves:
        if not _ok(board, mv1):
            continue
        t1 = move_touched_squares(board, mv1)
        b2 = board.copy(stack=False)
        b2.push(mv1)
        for mv2 in b2.legal_moves:
            # Zielfeld von mv1 darf von mv2 wieder benutzt werden (Schlagabtausch) —
            # die Endpunkt-Evidenz von mv2 gilt trotzdem.
            if not _ok(b2, mv2):
                continue
            touched = t1 | move_touched_squares(b2, mv2)
            scored.append(([mv1, mv2], sum(logit[s] for s in touched)))
    scored.sort(key=lambda t: -t[1])
    return scored


def move_prior(board: chess.Board, move: chess.Move) -> float:
    """Kleiner Plausibilitäts-Prior in LL-Einheiten (Stufe A, ohne Engine): entscheidet NUR
    echte Beinahe-Gleichstände, nie gegen klare Bild-Evidenz (Deckelung |prior| ≤ 1.0).
    Schlagzug +0.5, Schachgebot +0.3, Vorwärtszug +0.2."""
    p = 0.0
    if board.is_capture(move):
        p += 0.5
    if board.gives_check(move):
        p += 0.3
    fwd = chess.square_rank(move.to_square) - chess.square_rank(move.from_square)
    if (fwd > 0) == (board.turn == chess.WHITE) and fwd != 0:
        p += 0.2
    return min(p, 1.0)


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


def diff_observer(board: chess.Board, z: dict[str, float], z_thr: float,
                  k: float = 1.0) -> Observation:
    """Pure: LL-Scoring auf z-Scores → beste/zweitbeste Hypothese (Observer-Seam, Spec 06/10).
    `changed` = Felder über z_thr (nur Gate-/Debug-Info; das Scoring selbst ist weich)."""
    changed = frozenset(s for s, v in z.items() if v >= z_thr)
    scored = loglik_scores(board, z, z_thr, k)
    if not scored:
        return Observation(move=None, score=-1e9, second=-1e9, changed=changed, source="diff")
    second = scored[1][1] if len(scored) > 1 else -1e9
    return Observation(move=scored[0][0], score=scored[0][1], second=second,
                       changed=changed, source="diff")


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
                 motion_thr: float = 3.0, settle_frames: int | None = None,
                 change_thr: float | None = None,          # DEPRECATED (Spec 10): ersetzt durch z_thr
                 confirm_frames: int | None = None,
                 ambiguity_margin: float | None = None,    # DEPRECATED (Spec 10): ersetzt durch ambiguity_margin_ll
                 live_align: bool = True, avg_frames: int | None = None, max_changed: int = 6,
                 cnn_run: str | None = None, cnn_conf_thr: float = 0.85,
                 cnn_cooldown_s: float = 2.0, cnn_check_interval_s: float = 10.0,
                 device: str = "auto", verify_window: int = 8,
                 census_thr: float = 55.0, cnn_verify: bool = True,
                 z_thr: float = 3.0, ll_k: float = 1.0, ambiguity_margin_ll: float = 2.0,
                 reanchor_ll_floor: float = -4.0, nudge_timeout_s: float = 5.0,
                 drift_window_s: float = 30.0, use_prior: bool = True,
                 cnn_min_agreement: float = 0.97, cnn_margin_squares: int = 1,
                 min_confident_board: int = 32, min_confident_recovery: int = 8,
                 motion_margin: float = 0.12, overhang: float = 0.0,
                 corner_jump_px: float = 6.0) -> None:
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
        if change_thr is not None or ambiguity_margin is not None:
            log.warning("change_thr/ambiguity_margin sind deprecated (Spec 10) — "
                        "das Scoring läuft über z_thr/ambiguity_margin_ll.")
        self.confirm_frames = confirm_frames          # gleicher Zug muss N ruhige Frames bestätigt sein
        # -- probabilistisches Scoring (Spec 10, Teil 1) --
        self.z_thr = z_thr                            # z-Score, ab dem ein Feld als „geändert" gilt
        self.ll_k = ll_k                              # Sigmoid-Steilheit des LL-Scorings
        self.ambiguity_margin_ll = ambiguity_margin_ll  # best − second in LL-Einheiten (lichtunabhängig)
        self.reanchor_ll_floor = reanchor_ll_floor    # Re-Anchor NUR wenn auch best-LL darunter liegt
        self.noise = SquareNoise()                    # per-Feld-Rauschmodell (EMA, nur in Ruhe geupdatet)
        self.use_prior = use_prior                    # Heuristik-Prior als Ambiguitäts-Tie-Break (Teil 2)
        self.prior_last = False                       # letzter Zug wurde per Prior entschieden (Undo-Hinweis)
        # -- Nudge-/Drift-Re-Anchor ohne CNN (Teil 4) --
        self.nudge_timeout_s = nudge_timeout_s
        self.drift_window_s = drift_window_s
        self._anomaly_since: dict[str, float] = {}    # je Feld: seit wann persistent unerklärt geändert
        # -- Promotion ohne CNN (Teil 5): wartet auf Nutzerwahl via choose_promotion() --
        self._promo_pending: dict | None = None       # {"from","to","cur","cur_bgr","fen"}
        self.motion_margin = motion_margin            # Motion-ROI über den Brettrand hinaus (Anteil)
        self._prev_roi = None                         # voriges ROI-Graubild fürs erweiterte Motion-Gate
        self.overhang = overhang                      # Diff-Zellen nach oben erweitern (Anteil Zelle)
        self.corner_jump_px = corner_jump_px          # Ecken-Sprung ⇒ Base-Truth geometrisch invalid
        self._ref_corners: list | None = None         # Warp-Ecken zum Zeitpunkt der Referenzaufnahme
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
        self.cnn_min_agreement = cnn_min_agreement
        self.cnn_margin_squares = cnn_margin_squares
        # min_confident gesplittet (Spec 10): Whole-Board-Match braucht viel freie Sicht (32),
        # Recovery muss gerade bei Teilverdeckung handlungsfähig bleiben (8).
        self.min_confident_board = min_confident_board
        self.min_confident_recovery = min_confident_recovery
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
        self.cnn_verify = cnn_verify                      # Identitäts-Verify pro Zug AN? (Default an, nicht blockierend)
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

    def _roi_motion(self, frame) -> float:
        """Bewegung in einem um `motion_margin` erweiterten Ausschnitt des ROHEN Frames —
        erfasst die Hand, bevor sie ein Feld verdeckt (Poggi). Downsampled (billig im Hot-Path).
        Nur vom Loop-Thread benutzt (kein Lock nötig für _prev_roi)."""
        corners = self._last_corners
        if not corners:
            return 0.0
        xs = [float(p[0]) for p in corners]
        ys = [float(p[1]) for p in corners]
        mx = (max(xs) - min(xs)) * self.motion_margin
        my = (max(ys) - min(ys)) * self.motion_margin
        h, w = frame.shape[:2]
        x0, x1 = max(0, int(min(xs) - mx)), min(w, int(max(xs) + mx))
        y0, y1 = max(0, int(min(ys) - my)), min(h, int(max(ys) + my))
        if x1 - x0 < 8 or y1 - y0 < 8:
            return 0.0
        roi = cv2.cvtColor(frame[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
        roi = cv2.resize(roi, (160, max(8, int(160 * (y1 - y0) / (x1 - x0)))))
        prev, self._prev_roi = self._prev_roi, roi
        if prev is None or prev.shape != roi.shape:
            return 0.0
        return float(cv2.absdiff(roi, prev).mean())

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
            self._promo_pending = None
            self._anomaly_since = {}
            self.prior_last = False

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
                # Erweitertes Motion-Gate (Spec 10, Teil 6): Bewegung auch im Rand UM das Brett
                # erfassen — die Hand wird so gesehen, BEVOR sie ein Feld verdeckt.
                motion_roi = self._roi_motion(frame)

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
                    motion = max(float(cv2.absdiff(gray, self.prev_gray).mean()), motion_roi)
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
                                        device=self._resolve_device(), conf_thr=self.cnn_conf_thr,
                                        min_agreement=self.cnn_min_agreement,
                                        margin_squares=self.cnn_margin_squares,
                                        min_confident_board=self.min_confident_board,
                                        min_confident_recovery=self.min_confident_recovery)
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
        # Identitäts-basierte Auswertung (rein) — Fallback auf Occupancy, wenn der Run keine
        # Figuren-Identität liefert (obs.label is None).
        has_identity = getattr(obs, "label", None) is not None
        if has_identity:
            matches = recovery.board_matches_identity(self.board, obs)
            # 2-Ply-Suche (Spec 10, Teil 3): erklärt kein einzelner Zug die Beobachtung,
            # werden Zugpaare probiert — rettet den Fall „Antwortzug kam vor dem Commit".
            cnn_moves, agreement, _second = recovery.derive_moves_identity(self.board, obs,
                                                                           max_plies=2)
            conflicts = matches["conflicts"]
            match_ok = matches["match"]
            inconclusive = matches["inconclusive"]
        else:
            res = recovery.resync_check(self.board, obs)
            cnn_moves = [chess.Move.from_uci(res["move"])] if res["move"] else []
            agreement, conflicts = res["agreement"], res["conflicts"]
            match_ok, inconclusive = res["match"], False

        with self.lock:
            self._last_cnn_ts = now
            if self.board.fen() != fen:                     # Zustand hat sich geändert → verwerfen
                self._recovery_confirmer.reset()
                return
            self._cnn_agreement = agreement
            self._cnn_best_move = " ".join(m.uci() for m in cnn_moves) if cnn_moves else None

            if match_ok:
                # „Nichts-verändert": CNN bestätigt, dass das Brett dem Spielzustand entspricht.
                # Der Diff hing an Schatten/Drift fest -> Referenz nachziehen, KEIN Zug.
                self.cnn_status, self.cnn_conflicts = "ok", []
                self._recovery_confirmer.reset()
                if self._stuck_reason is not None and self._last_cur is not None:
                    self._set_ref(self._last_cur, self._last_cur_bgr)
                    self._clear_stuck()
                    self._confirmer.reset()
                    self._verify_state = "resynced"
                    self.note = "CNN: Brett unverändert — Referenz nachgezogen (kein Zug)"
                return

            if inconclusive:                                # zu viel verdeckt → keine Aussage
                self._recovery_confirmer.reset()
                return

            self.cnn_status, self.cnn_conflicts = "mismatch", conflicts
            if not cnn_moves:
                shown = ", ".join(conflicts[:4]) + ("…" if len(conflicts) > 4 else "")
                self.note = f"CNN-Kontrolle: Brett weicht ab ({shown}) — Figuren prüfen oder Resync"
                self._recovery_confirmer.reset()
                return
            key = " ".join(m.uci() for m in cnn_moves)      # Zugfolge als Voting-Schlüssel
            if not self._recovery_confirmer.feed(key):      # Voting statt Single-Shot
                self.note = (f"CNN-Recovery prüft {key}… "
                             f"({self._recovery_confirmer.count}/{self.confirm_frames})")
                return
            # Atomarer Commit der Zugfolge (1 oder 2 Halbzüge, Reihenfolge durch side-to-move fixiert).
            sans = []
            for mv in cnn_moves:
                sans.append(self.board.san(mv))
                self.board.push(mv)
            self.history.extend(sans)
            self.last_move = cnn_moves[-1].uci()
            # Referenz NICHT verwerfen (Spec 10, Teil 3): der Frame, auf dem die Recovery
            # entschieden hat, ist per FEN-Revalidierung stellungsaktuell → sofort als
            # Base-Truth setzen, statt blind auf die nächste Settle-Phase zu warten.
            if self._last_cur is not None:
                self._set_ref(self._last_cur, self._last_cur_bgr)
            else:
                self.ref_gray = self.ref_bgr = None
                self.ref_fen = None
                self._gray_buf.clear()
            self.state = "move"
            self.recovered_last = True
            self.prior_last = False
            self.cnn_status, self.cnn_conflicts = "ok", []
            self._confirmer.reset()
            self._clear_stuck()
            self.note = (f"Zug per CNN-Recovery erkannt: {' + '.join(sans)} "
                         f"(Übereinstimmung {agreement:.0%})")

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
        time.time()
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
        # Auswertung (rein, per IDENTITÄT) außerhalb des Locks vorbereiten.
        pend_mv = chess.Move.from_uci(pending["uci"])
        agree, n = recovery.verify_move_identity(self.board, pend_mv, obs)
        matches = recovery.board_matches_identity(self.board, obs)
        cnn_mv, _best, _second = recovery.derive_move_identity(self.board, obs)
        cnn_uci = cnn_mv.uci() if cnn_mv else None

        with self.lock:
            self._infer_ms = infer_ms
            self._cnn_agreement = agree
            self._cnn_best_move = cnn_uci
            if self._pending is not pending or self.board.fen() != pending["fen"]:
                return                                      # Zustand hat sich geändert → verwerfen
            pending["frames"] += 1

            def _commit(note_suffix: str, state: str, status: str, conflicts=None,
                        move: chess.Move | None = None):
                self.cnn_status = status
                self.cnn_conflicts = conflicts or []
                self._commit_move(move or pend_mv, pending["cur"], pending.get("cur_bgr"),
                                  prior_used=pending.get("prior_used", False))
                self._verify_state = state
                if note_suffix:
                    self.note += note_suffix

            # 1) Schatten / kein Zug: CNN sieht das GEGLAUBTE Brett unverändert (Identität gleich)
            #    → NICHT committen, sondern Referenz nachziehen. Zuverlässiger Schatten-Killer.
            if matches["match"]:
                self._pending = None
                self._confirmer.reset()
                self._recovery_confirmer.reset()
                self._clear_stuck()
                self._set_ref(pending["cur"], pending.get("cur_bgr"))
                self._verify_state = "shadow"
                self.cnn_status, self.cnn_conflicts = "shadow", []
                self.note = "Schatten/kein Zug (CNN: Brett unverändert)"
                return

            # 2) Diff durch Identität bestätigt → Commit.
            if agree >= recovery.min_agreement:
                _commit("", "confirmed", "ok")
                return

            # 3) Gegenkandidat (Spec 10, Teil 5): das CNN sieht eindeutig einen ANDEREN legalen
            #    Zug und dessen berührte Felder bestätigen ihn belastbar → CNN überstimmt den
            #    Diff-Kandidaten (statt „Diff gewinnt immer"). Löst u.a. Promotion-Varianten
            #    (Zielfeld-Label) und ähnlich aussehende Züge.
            if cnn_mv is not None and cnn_uci != pending["uci"]:
                agree_alt, n_alt = recovery.verify_move_identity(self.board, cnn_mv, obs)
                if agree_alt >= recovery.min_agreement and n_alt >= 2:
                    old_san = self.board.san(pend_mv)
                    _commit(f"  (CNN hat {old_san} überstimmt)", "overruled", "ok", move=cnn_mv)
                    log.info("CNN hat Diff-Kandidat überstimmt: %s → %s", pending["uci"], cnn_uci)
                    return

            # 4) Berührte Felder belastbar, aber Identität passt NICHT → Diff gewinnt (Nutzer-
            #    Entscheidung), CNN warnt nur (mismatch, Alternative in der Debug-Card).
            if n >= 2:
                _commit("  (CNN unstimmig — Diff übernommen)", "mismatch", "mismatch",
                        [] if cnn_uci is None else [cnn_uci])
                return

            # 5) Verdeckung/geringe Konfidenz auf den Endpunkten → nicht blockieren: warten,
            #    nach `verify_window` dem Diff vertrauen.
            if pending["frames"] >= self.verify_window:
                _commit("  (CNN unsicher — Diff übernommen)", "confirmed", "ok")
            else:
                self.note = (f"prüfe {self.board.san(pend_mv)} per CNN… "
                             f"({pending['frames']}/{self.verify_window})")

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
        Merkt sich auch die Warp-Ecken der Aufnahme (Geometrie-Invalidierung). Unter self.lock."""
        self.ref_gray = cur
        if cur_bgr is not None:
            self.ref_bgr = cur_bgr
        self.ref_fen = self.board.fen()
        self._ref_corners = None if self._last_corners is None else \
            [[float(x), float(y)] for x, y in self._last_corners]

    def _corners_jumped(self) -> bool:
        """True, wenn sich eine Warp-Ecke seit der Referenzaufnahme um > corner_jump_px bewegt
        hat (Marker verloren/wiedergefunden, Kamera angestoßen). Dann ist die Base-Truth
        geometrisch UNBRAUCHBAR — gegen sie zu diffen erzeugt Phantom-Änderungen auf halben
        Rängen (beobachtet in clip03: a1-Marker intermittierend, ~130 px Sprung)."""
        if self._ref_corners is None or self._last_corners is None:
            return False
        for (rx, ry), (cx, cy) in zip(self._ref_corners, self._last_corners, strict=False):
            if abs(float(cx) - rx) > self.corner_jump_px or abs(float(cy) - ry) > self.corner_jump_px:
                return True
        return False

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

    def _commit_move(self, move: chess.Move, cur, cur_bgr=None, recovered: bool = False,
                     prior_used: bool = False) -> None:
        """Zug anwenden und Base-Truth = (Bild, FEN nach Zug) setzen. Unter self.lock.
        Von beiden Pfaden genutzt: Direkt-Commit (kein CNN) und verifizierter Verify-Commit."""
        san = self.board.san(move)
        self.board.push(move)
        self.history.append(san)
        self.last_move = move.uci()
        # Referenz aus dem Erkennungs-Frame: kann Hand-Reste enthalten (langsame Hand unterm
        # Motion-Gate), aber Neu-Aufnahme erwischt bei schnellem Spiel dieselben Hände und
        # macht den Tracker zusätzlich blind (clip01-Replay: schlechter). Reste heilt der
        # per-Feld-Anomalie-Patcher (_maybe_patch_anomaly) bzw. die CNN-Recovery.
        self._set_ref(cur, cur_bgr)
        self.state = "move"
        self._confirmer.reset()
        self._clear_stuck()          # setzt auch _recovery_confirmer zurück
        self._pending = None
        self._anomaly_since = {}
        self._verify_state = "confirmed"
        self.recovered_last = recovered
        # Prior-Entscheidungen sichtbar machen (Spec 10, Teil 2): der Prior kann bei echtem
        # Bild-Gleichstand raten — der Nutzer soll sehen, dass Undo naheliegt.
        self.prior_last = prior_used
        self.note = f"Zug erkannt: {san}" + (" (CNN-Recovery)" if recovered else "") \
            + (" (per Prior entschieden — ggf. Undo)" if prior_used else "")
        if self.board.is_checkmate():
            self.note += " — Schachmatt!"

    def _try_detect(self, cur, cur_bgr=None):
        # --- Pending-Verifikation/-Promotion läuft: keinen neuen Kandidaten erzeugen. ---
        if self._pending is not None or self._promo_pending is not None:
            return

        # --- Invariante: Base-Truth ist (Bild, FEN). Passt die FEN nicht mehr zum
        #     aktuellen Brett, ist ref_gray stale -> Neu-Aufnahme erzwingen statt gegen
        #     eine veraltete Referenz zu detektieren. ---
        if self.ref_gray is None or self.ref_fen != self.board.fen():
            self.ref_gray = self.ref_bgr = None
            self.ref_fen = None
            return

        # --- Geometrie-Invalidierung: Warp-Ecken sind seit der Referenzaufnahme gesprungen
        #     (Marker wiedergefunden/Kamera bewegt) → Base-Truth neu aufnehmen statt Phantom-
        #     Diffs zu jagen. Zug-Evidenz geht dabei nicht verloren: der Zug bleibt auf dem
        #     Brett sichtbar und wird gegen die NEUE Referenz beim nächsten Zug erkannt. ---
        if self._corners_jumped():
            self.ref_gray = self.ref_bgr = None
            self.ref_fen = None
            self._confirmer.reset()
            self._clear_stuck()
            self.note = "Brett-Geometrie verschoben (Marker/Kamera) — Referenz wird neu aufgenommen"
            return

        # --- Diffs → Median-Normalisierung (globaler Belichtungssprung) → z-Scores
        #     (per-Feld-Rauschmodell; lokaler Drift/Feld-Charakteristik). Alle Gates und
        #     das LL-Scoring arbeiten auf DENSELBEN z-Werten. ---
        _t0 = time.perf_counter()
        diffs = per_square_diff(self.ref_gray, cur, self.profile.board_size,
                                self.profile.white_pov, extend_up=self.overhang)
        diffs = normalize_diffs(diffs)
        z = self.noise.z(diffs)
        self._diff_ms = (time.perf_counter() - _t0) * 1000.0

        # --- Kandidaten-Felder (z über Schwelle); Debug zeigt auch knapp darunter ---
        changed = {s for s, v in z.items() if v >= self.z_thr}
        self._changed_vals = sorted(
            ((s, round(v, 1)) for s, v in z.items() if v >= self.z_thr * 0.5),
            key=lambda kv: -kv[1])[:8]

        # --- Cast-Shadow-Veto (HSV nach Cucchiara) + Census-Bestätigung ---
        # Vetoed Felder verlassen nur die changed-Menge (Gates); ihre z-Werte bleiben fürs
        # Scoring erhalten. WICHTIG: ein GERÄUMTES Feld sieht dem HSV-Test oft wie eine
        # Abdunkelung aus (Figur weg → Brettfarbe) — würde man z nullen, verlöre der echte
        # Zug seine from-Evidenz. Bewährte Semantik aus v1 beibehalten.
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

        self._changed = sorted(changed)
        # Rauschmodell lernt auf JEDEM stabilen Frame die Nicht-Kandidaten-Felder — auch im
        # Stuck-Zustand, sonst kann Jitter (Marker/Belichtung) nie wegadaptiert werden.
        self.noise.update(diffs, exclude=changed)

        # --- LL-Scoring: beste/zweitbeste Hypothese relativ zu „kein Zug". Viabel ist ein
        #     Zug nur, wenn BEIDE Endpunkte wenigstens schwache Evidenz tragen (z ≥ z_thr/2,
        #     Spec 10 Teil 1): sonst würde ein einzelnes heißes Feld (Nudge!) Züge mit völlig
        #     kalten Zielfeldern netto-positiv scoren. Weiß-auf-weiß (Ziel knapp unter z_thr)
        #     bleibt viabel — genau der Fall, den der alte −1000-Cutoff gekillt hat. ---
        scored = loglik_scores(self.board, z, self.z_thr, self.ll_k)
        soft = self.z_thr * 0.5
        viable = [(mv, s) for mv, s in scored
                  if z[chess.square_name(mv.from_square)] >= soft
                  and z[chess.square_name(mv.to_square)] >= soft]
        obs_move, best = viable[0] if viable else (None, -1e9)
        second = viable[1][1] if len(viable) > 1 else -1e9
        self._best_score = best if viable else (scored[0][1] if scored else 0.0)
        self._second_score = second
        self._candidate_uci = obs_move.uci() if obs_move else None

        # --- max_changed gate: Verdeckungs-/Instabilitäts-Gate (Base-Truth bleibt). Läuft
        #     NACH dem Scoring, damit der Anomalie-Patcher weiß, ob ein viabler Zug die Lage
        #     erklärt (dann niemals patchen). ---
        if len(changed) > self.max_changed:
            # Zugpaar-Versuch (schnelles Spiel: 2 Halbzüge = bis zu ~8 geänderte Felder),
            # bevor die Lage als verdeckt/instabil gilt.
            if len(changed) <= self.max_changed + 2 and self._try_pair(z, best, cur, cur_bgr):
                return
            self._confirmer.reset()
            self._mark_stuck("too_many_changed")   # Spec 09: Recovery-Trigger via _cnn_tick
            self._maybe_patch_anomaly(changed, best, cur, cur_bgr)
            if self._stuck_reason is not None:
                self.note = (f"viel Veränderung ({len(changed)} Felder) — verdeckt/instabil, "
                             f"kein Zug übernommen (Base-Truth unverändert)")
            return

        # --- Ruhe / Re-Anchor (verschärft, Spec 10 Teil 1): nichts über z_thr UND kein
        #     viabler Kandidat mit netto-positiver Evidenz. Ein voreiliger Re-Anchor würde
        #     schwache Zug-Evidenz dauerhaft in die Base-Truth einbacken.
        #     Nur hier lernt das Rauschmodell. ---
        if not changed:
            if obs_move is None or best < self.reanchor_ll_floor:
                self._confirmer.reset()
                self._clear_stuck()
                self._anomaly_since = {}
                self._set_ref(cur, cur_bgr)
                return
            if best < 0.0:
                # schwache, aber zugkonsistente Evidenz (weiß-auf-weiß?) → Referenz HALTEN,
                # weder re-anchorn noch stuck melden; der Confirmer sammelt weiter.
                self.note = f"schwache Zugevidenz ({self.board.san(obs_move)}?) — warte"
                return

        # --- kein Einzelzug erklärt die Änderung → erst Zugpaar probieren (schnelles
        #     Spiel), dann stuck + Nudge/Drift-Selbstheilung (Teil 4) ---
        if obs_move is None or best < 0.0:
            if self._try_pair(z, best, cur, cur_bgr):
                return
            self._confirmer.reset()
            self._mark_stuck("no_legal_move")      # Spec 09: Recovery-Trigger via _cnn_tick
            self._maybe_patch_anomaly(changed, best, cur, cur_bgr)   # Nudge/Drift ohne CNN (Teil 4)
            if self._stuck_reason is not None:
                self.note = (f"Änderung auf {len(changed)} Feldern, aber kein legaler Zug passt — "
                             f"möglicher Fehlzug, Base-Truth unverändert (Resync nötig?)")
            return
        self._anomaly_since = {}

        # --- ambiguity gate (LL-Einheiten, lichtunabhängig) + Prior-Tie-Break (Teil 2) ---
        prior_used = False
        if best - second < self.ambiguity_margin_ll:
            near = [(mv, s) for mv, s in viable if best - s < self.ambiguity_margin_ll]
            # Promotion-Sonderfall: alle nahen Kandidaten sind Promo-Varianten desselben Zuges
            # → Diff kann sie prinzipiell nicht unterscheiden. Mit CNN entscheidet das Verify
            # (Zielfeld-Label); ohne CNN fragt die UI den Nutzer (choose_promotion).
            if all(mv.promotion for mv, _ in near) and \
               len({(mv.from_square, mv.to_square) for mv, _ in near}) == 1:
                if not (self.cnn_verify and self.cnn_run and not self._cnn_failed):
                    self._promo_pending = {
                        "from": chess.square_name(near[0][0].from_square),
                        "to": chess.square_name(near[0][0].to_square),
                        "cur": cur, "cur_bgr": cur_bgr, "fen": self.board.fen()}
                    self.note = "Umwandlung erkannt — bitte Figur wählen (Q/R/B/N)"
                    return
                # mit CNN: beste Variante (Default Dame) weiterreichen, Verify korrigiert per Label
            elif self.use_prior:
                rescored = sorted(((mv, s + move_prior(self.board, mv)) for mv, s in near),
                                  key=lambda t: -t[1])
                if len(rescored) > 1 and rescored[0][1] - rescored[1][1] >= self.ambiguity_margin_ll:
                    obs_move, prior_used = rescored[0][0], True
                else:
                    self._confirmer.reset()
                    self.note = ("mehrdeutig: " + " / ".join(
                        f"{self.board.san(mv)} ({s:+.1f})" for mv, s in near[:3])
                        + " — bitte sauber ziehen / kurz warten")
                    return
            else:
                self._confirmer.reset()
                self.note = "mehrdeutige Änderung — bitte sauber ziehen / kurz warten"
                return

        # --- Confirmer voting ---
        uci = obs_move.uci()
        if not self._confirmer.feed(uci):
            self.note = f"erkenne {self.board.san(obs_move)}… ({self._confirmer.count}/{self.confirm_frames})"
            return

        # --- Bestätigter Diff-Kandidat ---
        san = self.board.san(obs_move)
        if self.cnn_verify and self.cnn_run and not self._cnn_failed:
            self._pending = {"uci": uci, "fen": self.board.fen(),
                             "cur": cur, "cur_bgr": cur_bgr, "frames": 0,
                             "prior_used": prior_used}
            self._recovery_confirmer.reset()
            self._verify_state = "verifying"
            self.note = f"prüfe {san} per CNN…"
            return
        # Standard: Diff committet direkt (schnell). Schatten sind bereits per HSV-Veto raus;
        # bei Stuck/Abweichung greift die CNN-Recovery/-Kontrolle in _cnn_tick.
        self._commit_move(obs_move, cur, cur_bgr, recovered=False, prior_used=prior_used)

    def _try_pair(self, z: dict[str, float], best_single: float, cur, cur_bgr) -> bool:
        """Diff-seitige 2-Halbzug-Erkennung (schnelles Spiel ohne CNN). Unter self.lock.

        True = Lage behandelt (Paar wird bestätigt oder wurde committet) — Aufrufer
        markiert dann NICHT stuck. Ein Paar muss klar besser sein als der beste Einzelzug
        UND als das zweitbeste Paar (LL-Margin), sonst greift die normale Stuck-Logik
        (mit CNN übernimmt dort die verifizierte 2-Ply-Recovery)."""
        pairs = loglik_pair_scores(self.board, z, self.z_thr, self.ll_k)
        if not pairs:
            return False
        seq, best = pairs[0]
        second = pairs[1][1] if len(pairs) > 1 else -1e9
        if best < 0.0 or best - max(second, best_single) < self.ambiguity_margin_ll:
            return False
        key = " ".join(m.uci() for m in seq)
        self._candidate_uci = key
        self._best_score, self._second_score = best, max(second, best_single)
        if not self._confirmer.feed(key):
            self.note = f"erkenne Doppelzug {key}… ({self._confirmer.count}/{self.confirm_frames})"
            return True
        sans = []
        for mv in seq:
            sans.append(self.board.san(mv))
            self.board.push(mv)
        self.history.extend(sans)
        self.last_move = seq[-1].uci()
        self._set_ref(cur, cur_bgr)
        self.state = "move"
        self._confirmer.reset()
        self._clear_stuck()
        self._pending = None
        self._anomaly_since = {}
        self.prior_last = False
        self.recovered_last = False
        self.note = f"Doppelzug erkannt: {' + '.join(sans)} (schnelles Spiel)"
        if self.board.is_checkmate():
            self.note += " — Schachmatt!"
        return True

    def _maybe_patch_anomaly(self, changed: set[str], best_ll: float, cur, cur_bgr) -> None:
        """Nudge-/Drift-Selbstheilung der Referenz ohne CNN (Spec 10, Teil 4). Unter self.lock.

        Per-Feld-Timer: ein Feld, das persistent „geändert" ist, obwohl KEIN viabler Zug die
        Lage erklärt (best_ll < 0), wird nach Ablauf seiner Frist einzeln in der Referenz
        nachgezogen (Zellen-Patch) statt die ganze Base-Truth zu verwerfen:
        - belegte Felder (Nudge/j'adoube, Hand-Rest auf der Commit-Referenz): nudge_timeout_s
        - leere Felder (lokaler Lichtdrift): drift_window_s — konservativer, weil ein sich
          änderndes leeres Feld auch ein stiller Fehlzug sein könnte.
        Schutz gegen ruhende Hände: bei mehr als max_changed+2 Feldern wird nie gepatcht."""
        now = time.time()
        # Timer pflegen (auch mit CNN, für Debug): neue Felder starten, verschwundene löschen.
        self._anomaly_since = {sq: self._anomaly_since.get(sq, now) for sq in changed}
        if self.cnn_run and not self._cnn_failed:
            return                                  # mit CNN heilt die Recovery schneller/sicherer
        if not changed or best_ll >= 0.0 or len(changed) > self.max_changed + 2:
            return
        patched, why = [], ""
        for sq in sorted(changed):
            occupied = self.board.piece_at(chess.parse_square(sq)) is not None
            needed = self.nudge_timeout_s if occupied else self.drift_window_s
            if now - self._anomaly_since[sq] < needed:
                continue
            x0, y0, x1, y1 = square_region(sq, self.profile.board_size, self.profile.white_pov,
                                           inset=0.0)
            self.ref_gray[y0:y1, x0:x1] = cur[y0:y1, x0:x1]
            if cur_bgr is not None and self.ref_bgr is not None:
                self.ref_bgr[y0:y1, x0:x1] = cur_bgr[y0:y1, x0:x1]
            patched.append(sq)
            why = "Figur verrückt/Hand-Rest" if occupied else "Licht gedriftet"
        if not patched:
            return
        for sq in patched:
            self._anomaly_since.pop(sq, None)
        self.note = f"Referenz nachgezogen ({', '.join(patched)}): {why} — kein Zug"
        log.info("Referenz-Zellen gepatcht: %s (%s)", patched, why)
        if len(patched) == len(changed):
            self._clear_stuck()
            self._confirmer.reset()

    def choose_promotion(self, piece: str) -> dict:
        """Nutzerwahl der Umwandlungsfigur (Q/R/B/N) für einen wartenden Promotion-Zug ohne CNN."""
        piece = (piece or "").lower().strip()
        symbols = {"q": chess.QUEEN, "r": chess.ROOK, "b": chess.BISHOP, "n": chess.KNIGHT}
        if piece not in symbols:
            return {"ok": False, "error": f"ungültige Figur: {piece!r} (q/r/b/n)"}
        with self.lock:
            pp = self._promo_pending
            if pp is None:
                return {"ok": False, "error": "keine Umwandlung offen"}
            if self.board.fen() != pp["fen"]:
                self._promo_pending = None
                return {"ok": False, "error": "Stellung hat sich geändert"}
            mv = chess.Move(chess.parse_square(pp["from"]), chess.parse_square(pp["to"]),
                            promotion=symbols[piece])
            if mv not in self.board.legal_moves:
                return {"ok": False, "error": f"{mv.uci()} ist nicht legal"}
            self._promo_pending = None
            self._commit_move(mv, pp["cur"], pp.get("cur_bgr"))
            return {"ok": True, "move": mv.uci(), "san": self.history[-1]}

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
            cv2.line(img, (p, 0), (p, bs), (0, 180, 0), 1)
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
                # Promotion wartet auf Nutzerwahl (nur ohne CNN-Verify): {"from","to"} | None
                "promotion_pending": (None if self._promo_pending is None else
                                      {"from": self._promo_pending["from"],
                                       "to": self._promo_pending["to"]}),
                "prior_last": self.prior_last,
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
                    "z_thr": self.z_thr,
                    "census_thr": self.census_thr,
                    # Rauschmodell-Heatmap-Daten (Mittel/Streuung je Feld, gerundet)
                    "noise_mean": {s: round(v, 1) for s, v in self.noise.mean.items()},
                    "noise_std": {s: round(v, 1) for s, v in self.noise.std.items()},
                    "best_score": round(self._best_score, 1),
                    "second_score": round(self._second_score, 1),
                    "margin": round(self._best_score - self._second_score, 1),
                    "ambiguity_margin_ll": self.ambiguity_margin_ll,
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
                self._promo_pending = None
                self._anomaly_since = {}
                self.prior_last = False
                self.note = "letzter Zug rückgängig"
