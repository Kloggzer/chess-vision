"""Stufe 1 — Kalibrierung.

Bestimmt einmalig die Geometrie zwischen Kamerabild und Brett (Homographie) und speichert
sie als wiederverwendbares YAML-Profil. Solange Kamera und Brett unbewegt bleiben, liefert
das Profil für jeden Frame deterministisch die 64 Square-Crops.

Die reine Mapping-Funktion `square_to_crop_box` lebt hier zentral (Profil-gebunden) und
wird von Stufe 3 (`labeling.py`) importiert. Profil-Laden/-Speichern und die Geometrie
sind headless (ohne Kamera/GUI) nutzbar und getestet; nur `calibrate new`/`check` brauchen
Kamera + Display.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import cv2
import numpy as np
import yaml

from . import config

_FILES = "abcdefgh"


# --- Datenmodell ----------------------------------------------------------------------

@dataclass
class CropParams:
    cell: float
    pad_up: float
    pad_side: float
    out_size: tuple[int, int]  # [W, H], H > W

    def to_dict(self) -> dict:
        return {
            "cell": float(self.cell),
            "pad_up": float(self.pad_up),
            "pad_side": float(self.pad_side),
            "out_size": [int(self.out_size[0]), int(self.out_size[1])],
        }

    @classmethod
    def from_dict(cls, d: dict) -> CropParams:
        return cls(
            cell=float(d["cell"]),
            pad_up=float(d["pad_up"]),
            pad_side=float(d["pad_side"]),
            out_size=(int(d["out_size"][0]), int(d["out_size"][1])),
        )

    @classmethod
    def default(cls, board_size: int) -> CropParams:
        c = config.CROP
        return cls(
            cell=board_size / 8.0,
            pad_up=c.pad_up,
            pad_side=c.pad_side,
            out_size=(c.out_w, c.out_h),
        )


@dataclass
class CalibrationProfile:
    profile: str
    camera_index: int
    frame_size: tuple[int, int]          # [W, H] of the source
    board_size: int
    image_corners: list[list[float]]     # clicked points, order a8, h8, h1, a1
    homography: list[list[float]]        # 3x3, row-major
    white_pov: bool
    crop: CropParams
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    # Marker-basiert (Pflicht): Slicing/Aufnahme kalibrieren pro Frame aus den ArUco-Markern.
    # image_corners/homography sind nur der Snapshot von der Kalibrierung (Fallback/Vorschau).
    margin: float = 0.0
    marker_dict: str = "DICT_4X4_50"
    # Multi-Cam: optionale Quelle (URL/Pfad statt camera_index) und echte Intrinsics. Fehlen sie,
    # nutzt geometry3d eine Näherung aus frame_size. So ist jede Kamera ein geschlossenes Profil.
    source: str | None = None
    camera_matrix: list[list[float]] | None = None
    dist_coeffs: list[float] | None = None

    # -- serialization --
    def to_dict(self) -> dict:
        return {
            "profile": self.profile,
            "created_at": self.created_at,
            "camera_index": int(self.camera_index),
            "frame_size": [int(self.frame_size[0]), int(self.frame_size[1])],
            "board_size": int(self.board_size),
            "image_corners": [[float(x), float(y)] for x, y in self.image_corners],
            "homography": [[float(v) for v in row] for row in self.homography],
            "white_pov": bool(self.white_pov),
            "crop": self.crop.to_dict(),
            "margin": float(self.margin),
            "marker_dict": self.marker_dict,
            "source": self.source,
            "camera_matrix": (None if self.camera_matrix is None
                              else [[float(v) for v in row] for row in self.camera_matrix]),
            "dist_coeffs": (None if self.dist_coeffs is None else [float(v) for v in self.dist_coeffs]),
        }

    @classmethod
    def from_dict(cls, d: dict) -> CalibrationProfile:
        cm = d.get("camera_matrix")
        dc = d.get("dist_coeffs")
        return cls(
            profile=d["profile"],
            created_at=d.get("created_at", ""),
            camera_index=int(d["camera_index"]),
            frame_size=(int(d["frame_size"][0]), int(d["frame_size"][1])),
            board_size=int(d["board_size"]),
            image_corners=[[float(x), float(y)] for x, y in d["image_corners"]],
            homography=[[float(v) for v in row] for row in d["homography"]],
            white_pov=bool(d["white_pov"]),
            crop=CropParams.from_dict(d["crop"]),
            margin=float(d.get("margin", 0.0)),
            marker_dict=d.get("marker_dict", "DICT_4X4_50"),
            source=d.get("source"),
            camera_matrix=(None if cm is None else [[float(v) for v in row] for row in cm]),
            dist_coeffs=(None if dc is None else [float(v) for v in dc]),
        )

    def save(self, path: Path) -> Path:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fh:
            yaml.safe_dump(self.to_dict(), fh, sort_keys=False, allow_unicode=True)
        return path

    @classmethod
    def load(cls, path: Path) -> CalibrationProfile:
        with Path(path).open("r", encoding="utf-8") as fh:
            return cls.from_dict(yaml.safe_load(fh))


def profile_path(name: str) -> Path:
    return config.DATA.calibration / f"{name}.yaml"


def load_profile(name: str) -> CalibrationProfile:
    p = profile_path(name)
    if not p.exists():
        raise FileNotFoundError(f"Kalibrierungsprofil '{name}' nicht gefunden ({p}).")
    return CalibrationProfile.load(p)


# --- Reine Geometrie (headless, getestet) ---------------------------------------------

def _square_to_col_row(square: str, white_pov: bool) -> tuple[int, int]:
    """Square 'e4' -> (col, row) im entzerrten Bild. Ursprung oben links.

    file a..h -> col 0..7; rank 8..1 -> row 0..7. Bei white_pov=False um 180° gedreht.
    """
    sq = square.strip().lower()
    if len(sq) != 2 or sq[0] not in _FILES or not sq[1].isdigit():
        raise ValueError(f"ungültiges Feld: {square!r}")
    col = _FILES.index(sq[0])
    rank = int(sq[1])
    if not 1 <= rank <= 8:
        raise ValueError(f"ungültiger Rang: {square!r}")
    row = 8 - rank
    if not white_pov:
        col, row = 7 - col, 7 - row
    return col, row


def square_to_crop_box(square: str, profile: CalibrationProfile,
                       clamp: bool = True) -> tuple[int, int, int, int]:
    """'e4' -> (x0, y0, x1, y1) im entzerrten board_size-Bild.

    Basiszelle (cell x cell, quadratisch) optional nach OBEN verlängert (Höhe =
    cell*(1+pad_up), an der unteren Feldkante verankert) und seitlich um pad_side*cell
    erweitert. `clamp=True` schneidet auf die Bildgrenzen (Box wird ggf. kleiner);
    `clamp=False` gibt die rohe Box zurück — der Aufrufer (crop_square) füllt überstehende
    Bereiche mit Rand auf, damit die Box-Geometrie über alle Felder konstant bleibt.
    """
    col, row = _square_to_col_row(square, profile.white_pov)
    bs = profile.board_size
    cell = bs / 8.0
    pad_up = profile.crop.pad_up
    pad_side = profile.crop.pad_side

    # `pad_side` weitet die Zelle SYMMETRISCH in alle 4 Richtungen (etwas mehr Figur sichtbar,
    # nicht hart an der Feldkante abgeschnitten). `pad_up` verlängert ZUSÄTZLICH nach oben für
    # den 3D-Lean. Bei pad_side=pad_up=0 = exakte Zelle (rückwärtskompatibel).
    x0 = col * cell - pad_side * cell
    x1 = (col + 1) * cell + pad_side * cell
    y0 = row * cell - pad_side * cell - pad_up * cell
    y1 = (row + 1) * cell + pad_side * cell

    def fix(v: float) -> int:
        return int(round(max(0.0, min(float(bs), v)) if clamp else v))

    return fix(x0), fix(y0), fix(x1), fix(y1)


def square_center(square: str, profile: CalibrationProfile) -> tuple[int, int]:
    """Pixelmitte der Basiszelle eines Feldes im entzerrten board_size-Bild."""
    col, row = _square_to_col_row(square, profile.white_pov)
    cell = profile.board_size / 8.0
    return int((col + 0.5) * cell), int((row + 0.5) * cell)


def crop_border_px(profile: CalibrationProfile) -> int:
    """Rand (in Pixeln), mit dem das Brett für den DATEN-Crop mitentzerrt wird, damit Randfelder
    Inhalt für ihre pad_side/pad_up-Erweiterung haben. Wächst automatisch mit den Pads (mind.
    `config.CROP_WARP_BORDER_CELLS`). 0 -> kein Rand (Anzeige-Verhalten)."""
    cell = profile.board_size / 8.0
    border_cells = max(config.CROP_WARP_BORDER_CELLS, profile.crop.pad_side, profile.crop.pad_up)
    return int(round(border_cells * cell))


def compute_homography(image_corners, board_size: int, margin: float = 0.0) -> list[list[float]]:
    """Vier Bildpunkte (a8, h8, h1, a1) -> 3x3-Homographie auf ein board_size-Quadrat.

    `margin` > 0: die Bildpunkte liegen um diesen Anteil AUSSERHALB des Spielfelds (Marker
    an den äußeren Ecken). Das Spielfeld [0, board_size] ist dann entsprechend eingerückt.
    """
    src = np.array(image_corners, dtype=np.float32)
    bs = float(board_size)
    m = margin * bs
    # Zielpunkte passend zur Klick-Reihenfolge a8, h8, h1, a1 (ggf. nach außen erweitert):
    dst = np.array([[-m, -m], [bs + m, -m], [bs + m, bs + m], [-m, bs + m]], dtype=np.float32)
    H = cv2.getPerspectiveTransform(src, dst)
    return H.tolist()


def draw_calibration_overlay(frame, marker_pts, profile: CalibrationProfile, labels: bool = False):
    """Auf dem Kamerabild: Marker-Box (außen, orange) + echtes Spielfeld + Raster (innen, grün).

    `labels=True` beschriftet zusätzlich jedes der 64 Felder (a1..h8) an seiner Zellmitte —
    auflösungs-adaptiv, damit es im Web-UI bei jeder Stream-/Snapshot-Größe lesbar bleibt.
    """
    img = frame.copy()
    bs = profile.board_size
    h_inv = np.linalg.inv(np.array(profile.homography, dtype=np.float64))

    def to_img(board_pts):
        a = np.array(board_pts, dtype=np.float32).reshape(-1, 1, 2)
        return cv2.perspectiveTransform(a, h_inv).reshape(-1, 2)

    cell = bs / 8.0
    # Zellgröße in Bildpixeln schätzen -> Linienstärke/Schrift skalieren (Stream vs Snapshot).
    o, ex = to_img([[0.0, 0.0]])[0], to_img([[cell, 0.0]])[0]
    cell_px = float(np.hypot(*(ex - o))) or 40.0
    grid_th = max(1, int(round(cell_px / 60)))
    for i in range(9):  # 8x8-Raster zurückprojizieren
        p = i * cell
        v = to_img([[p, 0], [p, bs]]).astype(int)
        hh = to_img([[0, p], [bs, p]]).astype(int)
        cv2.line(img, tuple(v[0]), tuple(v[1]), (0, 200, 0), grid_th, cv2.LINE_AA)
        cv2.line(img, tuple(hh[0]), tuple(hh[1]), (0, 200, 0), grid_th, cv2.LINE_AA)
    field = to_img([[0, 0], [bs, 0], [bs, bs], [0, bs]]).astype(np.int32)
    cv2.polylines(img, [field], True, (0, 255, 0), grid_th + 1, cv2.LINE_AA)  # Spielfeld (grün)

    if labels:
        fs = max(0.3, cell_px / 150.0)            # Schriftgröße ~ Zellgröße
        th = max(1, int(round(cell_px / 90)))
        off = int(cell_px * 0.18)
        for rank in range(1, 9):
            for fl in _FILES:
                col, row = _square_to_col_row(f"{fl}{rank}", profile.white_pov)
                c = to_img([[(col + 0.5) * cell, (row + 0.5) * cell]])[0].astype(int)
                cv2.putText(img, f"{fl}{rank}", (c[0] - off, c[1] + off // 2),
                            cv2.FONT_HERSHEY_SIMPLEX, fs, (0, 0, 255), th, cv2.LINE_AA)

    mb = np.array(marker_pts, dtype=np.int32)
    cv2.polylines(img, [mb], True, (0, 180, 255), grid_th + 1, cv2.LINE_AA)   # Marker-Box (orange)
    for p in marker_pts:
        cv2.circle(img, (int(p[0]), int(p[1])), max(4, int(cell_px / 18)), (0, 180, 255), -1, cv2.LINE_AA)
    return img


def warp_board(frame, profile: CalibrationProfile):
    H = np.array(profile.homography, dtype=np.float64)
    return cv2.warpPerspective(frame, H, (profile.board_size, profile.board_size))


def draw_board_grid(board_img, profile: CalibrationProfile, labels: bool = True):
    """8x8-Raster (+ Eck-/Mittenbeschriftung) auf das entzerrte Brett zeichnen."""
    img = board_img.copy()
    bs = profile.board_size
    for i in range(9):
        p = int(round(i * bs / 8.0))
        cv2.line(img, (p, 0), (p, bs), (0, 255, 0), 1)
        cv2.line(img, (0, p), (bs, p), (0, 255, 0), 1)
    if labels:
        for sq in ("a8", "h8", "a1", "h1", "e4"):
            col, row = _square_to_col_row(sq, profile.white_pov)
            cx = int((col + 0.5) * bs / 8.0)
            cy = int((row + 0.5) * bs / 8.0)
            cv2.putText(img, sq, (cx - 12, cy + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
    return img


# --- Kamera-Helfer --------------------------------------------------------------------

def open_camera(source: int | str):
    """Kamera/Quelle öffnen. `int` = lokaler Index (Windows: stabileres DSHOW-Backend); `str` =
    URL/Pfad (z. B. Handy-IP-Webcam `http://.../video`) -> Standard-Backend, kein DSHOW. So läuft
    eine Netzwerk-/Handy-Kamera mit identischem Code wie eine USB-Kamera."""
    import sys

    if isinstance(source, str):
        return cv2.VideoCapture(source)
    if sys.platform.startswith("win") and hasattr(cv2, "CAP_DSHOW"):
        return cv2.VideoCapture(source, cv2.CAP_DSHOW)
    return cv2.VideoCapture(source)


# --- ArUco-Auto-Ecken (Marker an a8/h8/h1/a1) -----------------------------------------
# id 0 -> a8, id 1 -> h8, id 2 -> h1, id 3 -> a1 (gleiche Reihenfolge wie Klick-Kalibrierung).
_ARUCO_LABELS = ("a8", "h8", "h1", "a1")


def _aruco_dictionary(dict_name: str):
    return cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, dict_name))


def _detect_marker_quads(frame, dict_name: str, ids: tuple[int, ...]) -> dict[int, np.ndarray]:
    """Roh-Detektion: {id: (4,2)-Eckarray} je gefundenem Marker (Reihenfolge wie von ArUco)."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame.ndim == 3 else frame
    params = cv2.aruco.DetectorParameters()
    params.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX  # genauere Eckpunkte
    detector = cv2.aruco.ArucoDetector(_aruco_dictionary(dict_name), params)
    found_corners, found_ids, _ = detector.detectMarkers(gray)
    if found_ids is None:
        return {}
    return {int(i): c.reshape(4, 2) for c, i in zip(found_corners, found_ids.flatten(), strict=False) if int(i) in ids}


def detect_board_marker_quads(frame, dict_name: str = "DICT_4X4_50",
                              ids: tuple[int, ...] = (0, 1, 2, 3)) -> dict[int, np.ndarray]:
    """Volle 4-Eck-Quads je gefundenem Marker — für Pose/PnP (geometry3d). `detect_board_markers`
    kollabiert auf einen Punkt je Marker; hier bleiben alle 4 Ecken als 2D-3D-Korrespondenzen erhalten."""
    return _detect_marker_quads(frame, dict_name, ids)


def detect_board_markers(frame, dict_name: str = "DICT_4X4_50", ids: tuple[int, ...] = (0, 1, 2, 3),
                         corner: str = "center") -> dict[int, list[float]]:
    """Erkennt die Marker und gibt {id: [x,y]} der GEFUNDENEN zurück (center bzw. innere Ecke)."""
    quads = _detect_marker_quads(frame, dict_name, ids)
    if not quads:
        return {}
    centroid = np.mean([q.mean(axis=0) for q in quads.values()], axis=0)
    out: dict[int, list[float]] = {}
    for i, quad in quads.items():
        if corner == "inner":
            pt = quad[int(np.argmin(np.linalg.norm(quad - centroid, axis=1)))]
        else:
            pt = quad.mean(axis=0)
        out[i] = [float(pt[0]), float(pt[1])]
    return out


def resolve_board_corners(points_by_id, ids: tuple[int, ...] = (0, 1, 2, 3),
                          board_size: int = 800) -> tuple[list[list[float]], int] | None:
    """Aus 2/3/4 Markerpunkten die 4 Eckpunkte (a8,h8,h1,a1) rekonstruieren.

    Gibt (corners4, n_genutzt) zurück oder None bei < 2. 4 -> exakte Perspektive,
    3 -> Affin (Parallelogramm), 2 -> Ähnlichkeit (Quadrat-Annahme). So genügen 2/3 Marker.
    """
    bs = float(board_size)
    board = {ids[0]: (0.0, 0.0), ids[1]: (bs, 0.0), ids[2]: (bs, bs), ids[3]: (0.0, bs)}
    have = [i for i in ids if i in points_by_id]
    if len(have) < 2:
        return None
    src = np.array([board[i] for i in have], dtype=np.float64)
    dst = np.array([points_by_id[i] for i in have], dtype=np.float64)
    targets = np.array([[0.0, 0.0], [bs, 0.0], [bs, bs], [0.0, bs]], dtype=np.float64)

    if len(have) == 2:  # Ähnlichkeit (Rotation + Skalierung) exakt aus 2 Punkten
        vb, vd = src[1] - src[0], dst[1] - dst[0]
        nb = float(np.linalg.norm(vb))
        if nb < 1e-6:
            return None
        s = float(np.linalg.norm(vd)) / nb
        ang = np.arctan2(vd[1], vd[0]) - np.arctan2(vb[1], vb[0])
        c, si = np.cos(ang), np.sin(ang)
        rot = np.array([[c, -si], [si, c]])
        proj = np.array([dst[0] + s * (rot @ (t - src[0])) for t in targets])
    elif len(have) == 3:
        m = cv2.getAffineTransform(src[:3].astype(np.float32), dst[:3].astype(np.float32))
        proj = cv2.transform(targets.astype(np.float32).reshape(-1, 1, 2), m).reshape(-1, 2)
    else:
        h = cv2.getPerspectiveTransform(src[:4].astype(np.float32), dst[:4].astype(np.float32))
        proj = cv2.perspectiveTransform(targets.astype(np.float32).reshape(-1, 1, 2), h).reshape(-1, 2)
    return [[float(x), float(y)] for x, y in proj], len(have)


def detect_board_corners_aruco(frame, dict_name: str = "DICT_4X4_50", ids: tuple[int, ...] = (0, 1, 2, 3),
                               corner: str = "center", min_markers: int = 4) -> list[list[float]] | None:
    """4 Eckpunkte (a8,h8,h1,a1) — rekonstruiert fehlende Marker, solange >= min_markers da sind."""
    res = resolve_board_corners(detect_board_markers(frame, dict_name, ids, corner), ids)
    if res is None or res[1] < min_markers:
        return None
    return res[0]


class MarkerTracker:
    """Verfolgt je Marker eine geglättete, gegen Verdeckung/Jitter resiliente Position.

    Eigenschaften (Parameter aus `config.TRACKER`):
    - **Dead-Zone**: erkannte Bewegung <= `move_threshold` -> Position einfrieren (ruhige Box).
    - **Glättung**: echte Bewegung -> EMA mit `smooth_alpha` statt hartem Schnappen.
    - **Ausreißer / Selbstkorrektur**: ein Einzel-Frame-Sprung > `jump_reject_px` wird zunächst
      gehalten; erst wenn die neue Lage über `jump_confirm_frames` Frames stabil bleibt, wird die
      Ecke neu gesetzt. So überleben Fehl-Detektionen nicht, ein echtes Verschieben aber schon.
    - **Alterung**: pro Frame steigt das Alter jeder Ecke; eine Live-Detektion setzt es auf 0.
      Ab `max_held_frames` ohne Sicht gilt eine Ecke als `stale` (nur fürs Feedback, sie bleibt nutzbar).
    - **Seed**: `seed()` belegt Ecken aus einem Kalibrierprofil vor (Status `seed`), sodass die
      Box bei fixer Kamera sofort und perspektivtreu steht — eine Live-Detektion ersetzt den Seed.
    """

    def __init__(self, params: config.TrackerDefaults | None = None) -> None:
        self.p = params or config.TRACKER
        self.pos: dict[int, list[float]] = {}                  # geglättete/gehaltene Position
        self.age: dict[int, int] = {}                          # Frames seit letzter Live-Detektion
        self.seeded: set[int] = set()                          # nie live bestätigt, nur aus Seed
        self._pending: dict[int, tuple[list[float], int]] = {}  # Sprung-Kandidat: (Position, Frames)

    # -- Vorbelegung aus bekannter Geometrie (z.B. Profil) --
    def seed(self, points_by_id: dict[int, list[float]]) -> None:
        for i, q in points_by_id.items():
            if i not in self.pos:
                self.pos[i] = [float(q[0]), float(q[1])]
                self.age[i] = self.p.max_held_frames           # Seed gilt sofort als "alt"/unbestätigt
                self.seeded.add(int(i))

    def update(self, detected: dict[int, list[float]]) -> dict[int, list[float]]:
        for i in self.pos:                                     # zuerst alle altern lassen
            self.age[i] = self.age.get(i, 0) + 1
        for i, q in detected.items():
            p = [float(q[0]), float(q[1])]
            prev = self.pos.get(i)
            if prev is None:                                   # neuer Marker -> direkt übernehmen
                self.pos[i] = p
                self.age[i] = 0
                self.seeded.discard(i)
                self._pending.pop(i, None)
                continue
            d = abs(p[0] - prev[0]) + abs(p[1] - prev[1])      # L1-Distanz zur aktuellen Lage
            if d <= self.p.move_threshold:                     # Dead-Zone -> einfrieren, aber live
                self.age[i] = 0
                self.seeded.discard(i)
                self._pending.pop(i, None)
                continue
            if i in self.seeded:                               # erste echte Detektion ersetzt den Seed
                self.pos[i] = p                                # -> SNAPpen statt EMA-blenden (sonst
                self.age[i] = 0                                #    bleibt die Ecke 65% beim Seed =
                self.seeded.discard(i)                         #    versetztes Raster, Fallstrick im
                self._pending.pop(i, None)                     #    Marker-Fallback-Slicing)
                continue
            if d > self.p.jump_reject_px and i not in self.seeded:
                if not self._confirm_jump(i, p):               # noch nicht bestätigt -> alte Lage halten
                    continue
            a = self.p.smooth_alpha                            # echte Bewegung -> EMA-Glättung
            self.pos[i] = [prev[0] + a * (p[0] - prev[0]), prev[1] + a * (p[1] - prev[1])]
            self.age[i] = 0
            self.seeded.discard(i)
            self._pending.pop(i, None)
        return self.points()

    def _confirm_jump(self, i: int, p: list[float]) -> bool:
        """Sprung erst akzeptieren, wenn die neue Lage `jump_confirm_frames` Frames stabil ist."""
        cand, cnt = self._pending.get(i, (None, 0))
        if cand is not None and abs(p[0] - cand[0]) + abs(p[1] - cand[1]) <= self.p.jump_reject_px:
            cnt += 1
        else:
            cnt = 1
        self._pending[i] = (p, cnt)
        return cnt >= self.p.jump_confirm_frames

    # -- Abfragen --
    def points(self) -> dict[int, list[float]]:
        return {i: list(p) for i, p in self.pos.items()}

    def status(self) -> dict[int, str]:
        out: dict[int, str] = {}
        for i in self.pos:
            if i in self.seeded:
                out[i] = "seed"
            elif self.age.get(i, 0) == 0:
                out[i] = "live"
            elif self.age.get(i, 0) >= self.p.max_held_frames:
                out[i] = "stale"
            else:
                out[i] = "held"
        return out

    def n_live(self) -> int:
        return sum(1 for i in self.pos if i not in self.seeded and self.age.get(i, 0) == 0)

    def n_held(self) -> int:
        return sum(1 for i in self.pos if i not in self.seeded and self.age.get(i, 0) > 0)

    @property
    def last(self) -> dict[int, list[float]]:
        """Rückwärtskompatibel: alle bekannten Ecken (live, gehalten, geseedet)."""
        return self.points()


# =======================================================================================
# Markerlose Brett-Erkennung über die Brettlinien (Spec 11, chesscog-Stil, KEIN DL)
# =======================================================================================

def _cluster_two_angle_families(lines) -> tuple[list, list]:
    """Hough-Linien (rho, theta) in zwei Winkel-Familien teilen (k-means auf dem
    verdoppelten Winkel, weil theta und theta+pi dieselbe Linienrichtung sind)."""
    import numpy as _np
    pts = _np.array([[_np.cos(2 * t), _np.sin(2 * t)] for _r, t in lines], dtype=_np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1e-3)
    _c, labels, _ctr = cv2.kmeans(pts, 2, None, crit, 5, cv2.KMEANS_PP_CENTERS)
    fam = [[], []]
    for (r, t), lab in zip(lines, labels.ravel()):
        fam[int(lab)].append((float(r), float(t)))
    return fam[0], fam[1]


def _family_positions(family) -> tuple[float, list[tuple[float, float, float]]]:
    """Je Familie: mittlerer Winkel + 1D-Position jeder Linie entlang der Familien-Normalen.
    rho-Vorzeichen wird auf den mittleren Winkel normalisiert (theta vs. theta+pi)."""
    import numpy as _np
    ref = float(_np.arctan2(_np.mean([_np.sin(2 * t) for _r, t in family]),
                            _np.mean([_np.cos(2 * t) for _r, t in family])) / 2.0) % _np.pi
    out = []
    for r, t in family:
        # Linie auf Referenzrichtung normalisieren: |theta - ref| > pi/2 → Linie umklappen.
        d = (t - ref + _np.pi / 2) % _np.pi - _np.pi / 2
        rr = r if abs(d) <= _np.pi / 2 else -r
        out.append((float(rr), r, t))
    return ref, out


def _merge_positions(pos_lines, tol: float) -> list[tuple[float, float, float]]:
    """Nahezu identische Hough-Linien (mehrfach getroffene Brettlinie) zu einer mitteln."""
    merged = []
    for p, r, t in sorted(pos_lines):
        if merged and abs(p - merged[-1][0]) <= tol:
            mp, mr, mt, n = merged[-1]
            merged[-1] = ((mp * n + p) / (n + 1), (mr * n + r) / (n + 1),
                          (mt * n + t) / (n + 1), n + 1)
        else:
            merged.append((p, r, t, 1))
    return [(p, r, t) for p, r, t, _n in merged]


def _grid_progression(positions: list[float]) -> tuple[float, float] | None:
    """RANSAC über Linienpositionen: die 9er-arithmetische Folge (Brettraster) finden.

    Zählt DISTINKTE Slots (zwei Linien im selben Slot zählen einmal) und normiert den
    Fehler aufs Spacing — sonst gewinnen große Spacings automatisch (große Toleranz
    fängt alles). Spacing ist auf ein plausibles Verhältnis zur Positions-Spannweite
    begrenzt (mind. 5 der 9 Linien sichtbar → span/8 ≤ s ≤ span/4).
    Rückgabe (erste_position, spacing) der Außenlinien-Slots 0 und 8, sonst None."""
    n = len(positions)
    if n < 6:                                    # mind. 6 der 9 Rasterlinien nötig
        return None
    best = None                                  # (slots, -fehler/s, base, s)
    span = max(positions) - min(positions)
    s_lo, s_hi = span / 9.0, span / 4.0
    for i in range(n):
        for j in range(i + 1, n):
            gap = positions[j] - positions[i]
            for k in range(1, 9):                # Hypothese: Linien i,j liegen k Slots auseinander
                s = gap / k
                if s <= 2 or not (s_lo <= s <= s_hi):
                    continue
                for shift in range(0, 9 - k):    # Slot-Offset: Linie i auf Slot `shift`
                    base = positions[i] - shift * s
                    slots: dict[int, float] = {}
                    for q in positions:
                        m = round((q - base) / s)
                        e = abs(q - (base + m * s))
                        if 0 <= m <= 8 and e <= s * 0.15:
                            slots[m] = min(e, slots.get(m, 1e9))
                    if len(slots) < 6:
                        continue
                    cand = (len(slots), -sum(slots.values()) / s, base, s)
                    if best is None or cand > best:
                        best = cand
    if best is None:
        return None
    return best[2], best[3]


def board_corners_from_lines(frame, profile: CalibrationProfile | None = None,
                             work_width: int = 960) -> list[list[float]] | None:
    """Die 4 Brett-Ecken OHNE Marker aus den Brettlinien schätzen (Spec 11).

    Klassische Pipeline: Canny → HoughLines → zwei Winkel-Familien → je Familie die
    9er-Rasterprogression der Linienpositionen (RANSAC) → Außenlinien schneiden = Ecken.
    Funktioniert bei mäßiger Perspektive (Kamera grob über dem Brett); die Zuordnung zu
    (a8,h8,h1,a1) übernimmt — wo vorhanden — die Nähe zu `profile.image_corners`, sonst
    die Standard-Leserichtung. Rückgabe None, wenn kein konsistentes Raster gefunden wird."""
    import numpy as _np

    h, w = frame.shape[:2]
    scale = min(1.0, work_width / float(w))
    small = cv2.resize(frame, (int(w * scale), int(h * scale))) if scale < 1.0 else frame
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(gray, 40, 120)
    # Hough-Schwelle adaptiv absenken, bis BEIDE Familien genug Rasterlinien tragen —
    # vertikale Brettlinien sind oft schwächer (Figuren unterbrechen sie); zu niedrige
    # Schwellen fluten dagegen mit Diagonal-Kanten (clip02-Empirie: 0.30 → B nur 5 Linien,
    # 0.18 → 4400 Linien Clutter). Die Progression-Suche selbst ist der Qualitätsfilter.
    quad = None
    for thr_frac in (0.30, 0.24, 0.19):
        raw = cv2.HoughLines(edges, 1, _np.pi / 360,
                             threshold=int(min(small.shape[:2]) * thr_frac))
        if raw is None or len(raw) < 12:
            continue
        lines = [(float(r), float(t)) for r, t in raw[:, 0, :]][:250]
        quad = _quad_from_lines(lines)
        if quad is not None:
            break
    if quad is None:
        return None
    quad = [[x / scale, y / scale] for x, y in quad]
    return _finish_quad(quad, w, h, profile)


def _quad_from_lines(lines) -> list[list[float]] | None:
    """Aus Hough-Linien die 4 Außen-Ecken des Rasters (in Arbeitsauflösung) oder None."""
    import numpy as _np

    fam_a, fam_b = _cluster_two_angle_families(lines)
    # Familien müssen klar verschiedene Richtungen haben (sonst ist eine nur Clutter).
    def _ref(fam):
        return float(_np.arctan2(_np.mean([_np.sin(2 * t) for _r, t in fam]),
                                 _np.mean([_np.cos(2 * t) for _r, t in fam])) / 2.0) % _np.pi
    if len(fam_a) < 6 or len(fam_b) < 6:
        return None
    dref = abs(_ref(fam_a) - _ref(fam_b)) % _np.pi
    if min(dref, _np.pi - dref) < _np.radians(35):
        return None
    borders = []
    for fam in (fam_a, fam_b):
        ref, pos_lines = _family_positions(fam)
        span = max(p for p, _r, _t in pos_lines) - min(p for p, _r, _t in pos_lines)
        merged = _merge_positions(pos_lines, tol=max(3.0, span / 40.0))
        prog = _grid_progression([p for p, _r, _t in merged])
        if prog is None:
            return None
        base, s = prog
        # Außenlinien: echte Linie nahe Slot 0/8 bevorzugen, sonst mit dem Familienwinkel
        # extrapolieren (Position p ist per Definition das rho einer Linie mit theta=ref).
        pair = []
        for slot in (0, 8):
            target = base + slot * s
            near = min(merged, key=lambda m: abs(m[0] - target))
            pair.append((near[1], near[2]) if abs(near[0] - target) <= s * 0.15
                        else (target, ref))
        borders.append(pair)

    def _intersect(l1, l2):
        r1, t1 = l1
        r2, t2 = l2
        a = _np.array([[_np.cos(t1), _np.sin(t1)], [_np.cos(t2), _np.sin(t2)]])
        b = _np.array([r1, r2])
        if abs(_np.linalg.det(a)) < 1e-9:
            return None
        x, y = _np.linalg.solve(a, b)
        return [float(x), float(y)]

    quad = []
    for la in borders[0]:
        for lb in borders[1]:
            p = _intersect(la, lb)
            if p is None:
                return None
            quad.append(p)
    # quad = [A0B0, A0B8, A8B0, A8B8] → als konvexes Viereck ordnen (Winkel um den Schwerpunkt).
    cx = sum(p[0] for p in quad) / 4.0
    cy = sum(p[1] for p in quad) / 4.0
    quad.sort(key=lambda p: _np.arctan2(p[1] - cy, p[0] - cx))
    return quad


def _finish_quad(quad, w: int, h: int,
                 profile: CalibrationProfile | None) -> list[list[float]] | None:
    """Plausibilität (im Bild, Mindestfläche) + Zuordnung zu (a8,h8,h1,a1): Rotation wählen,
    die den Kalibrier-Ecken am nächsten kommt — Linien allein können 90°/180°-Drehungen
    nicht unterscheiden. Ohne Profil: Reihenfolge wie sortiert (Nutzer prüft Overlay)."""
    for x, y in quad:
        if not (-0.2 * w <= x <= 1.2 * w and -0.2 * h <= y <= 1.2 * h):
            return None
    area = 0.0
    for i in range(4):
        x1, y1 = quad[i]
        x2, y2 = quad[(i + 1) % 4]
        area += x1 * y2 - x2 * y1
    if abs(area) / 2.0 < 0.05 * w * h:
        return None
    if profile is not None and profile.image_corners and len(profile.image_corners) >= 4:
        ref = profile.image_corners
        best_rot, best_cost = 0, None
        for rot in range(4):
            rq = quad[rot:] + quad[:rot]
            cost = sum((rq[i][0] - ref[i][0]) ** 2 + (rq[i][1] - ref[i][1]) ** 2 for i in range(4))
            if best_cost is None or cost < best_cost:
                best_rot, best_cost = rot, cost
        quad = quad[best_rot:] + quad[:best_rot]
    return quad


def make_tracker(profile: CalibrationProfile | None = None) -> MarkerTracker:
    """Tracker erzeugen, bei vorhandenem Profil aus dessen 4 Eckpunkten geseedet.

    `profile.image_corners` sind exakt die 4 Marker-Zentren (a8,h8,h1,a1) der Kalibrierung.
    Damit steht die Box bei fixer Kamera sofort und perspektivtreu, auch wenn gerade weniger
    als 4 Marker sichtbar sind.
    """
    t = MarkerTracker()
    if profile is not None and profile.image_corners and len(profile.image_corners) >= 4:
        t.seed({i: profile.image_corners[i] for i in range(4)})
    return t


def board_corners_for_frame(frame, profile: CalibrationProfile, tracker: MarkerTracker,
                            min_markers: int | None = None) -> list[list[float]] | None:
    """Die 4 Brett-Ecken (a8,h8,h1,a1) in **Frame-Pixeln** für diesen Frame.

    Aktualisiert den Tracker einmal mit der aktuellen Marker-Detektion und löst daraus die
    Ecken auf (Marker-abgeleitet, **vor** `margin`). Gibt None, wenn weniger als `min_markers`
    Ecken bekannt sind (Default `config.TRACKER.default_min_markers`). Genau diese Punkte werden
    bei der Aufnahme ins Log geschrieben, damit `slice` später identisch warpt.
    """
    if min_markers is None:
        min_markers = config.TRACKER.default_min_markers
    tracker.update(detect_board_markers(frame, profile.marker_dict, corner="center"))
    pts = tracker.points()
    if len(pts) < min_markers:
        return None
    # Genau EINE Ecke ist nur-Seed (Marker nie live gesehen — z.B. am Bildrand angeschnitten,
    # clip02: a8 0% Detektionsrate)? Dann aus den drei ECHTEN Ecken als Parallelogramm
    # vervollständigen statt den Seed einer womöglich anderen Kameralage zu verwenden
    # (der versetzte Seed verzerrt sonst dauerhaft ein Viertel des Warps).
    status = tracker.status()
    seeded = [i for i, s in status.items() if s == "seed"]
    if len(seeded) == 1 and len(pts) >= 4:
        m = seeded[0]
        prev_i, next_i, opp_i = (m - 1) % 4, (m + 1) % 4, (m + 2) % 4
        if all(i in pts for i in (prev_i, next_i, opp_i)):
            pts = dict(pts)
            pts[m] = [pts[prev_i][0] + pts[next_i][0] - pts[opp_i][0],
                      pts[prev_i][1] + pts[next_i][1] - pts[opp_i][1]]
    res = resolve_board_corners(pts, board_size=profile.board_size)
    return res[0] if res is not None else None


def warp_from_corners(frame, profile: CalibrationProfile, corners):
    """Brett **randlos** entzerren aus 4 Frame-Ecken (a8,h8,h1,a1) — Spielfeld füllt [0, board_size].

    Das ist der **Anzeige-Warp** (Web-Frontend legt sein 8×8-Overlay exakt auf die Spielfeldkante).
    Für den DATEN-Crop siehe `warp_board_for_crops` (mit Rand). Reine Transformation ohne
    Marker-Detektion; reproduziert dieselbe Geometrie wie zur Aufnahmezeit.
    """
    h = np.array(compute_homography(corners, profile.board_size, profile.margin), dtype=np.float64)
    return cv2.warpPerspective(frame, h, (profile.board_size, profile.board_size))


def warp_board_for_crops(frame, profile: CalibrationProfile, corners):
    """Brett **mit Rand** entzerren — der DATEN-Crop-Warp. Canvas `board_size + 2B` mit
    `B = crop_border_px(profile)`, Homographie um B translatiert. So haben RANDFELDER echten
    Brett-/Randinhalt für ihre pad_side/pad_up-Erweiterung (statt schwarzem Rand an der
    Spielfeldkante). Geometrie ist identisch zum randlosen Warp, nur um B verschoben; `crop_square`
    verschiebt seine Box passend um +B.
    """
    bs = profile.board_size
    b = crop_border_px(profile)
    h = np.array(compute_homography(corners, bs, profile.margin), dtype=np.float64)
    t = np.array([[1.0, 0.0, b], [0.0, 1.0, b], [0.0, 0.0, 1.0]], dtype=np.float64)
    return cv2.warpPerspective(frame, t @ h, (bs + 2 * b, bs + 2 * b))


def generate_markers(out_path, dict_name: str = "DICT_4X4_50", ids: tuple[int, ...] = (0, 1, 2, 3),
                     marker_px: int = 300, quiet: int | None = None, gap: int = 70):
    """Druckbares 2x2-Blatt: jeder Marker mit weißer Ruhezone in einer gleich großen Schnitt-Box.

    `quiet`: weißer Rand um den Marker (wichtig für die Erkennung). Entlang der dünnen
    schwarzen Box schneiden -> alle 4 Marker exakt gleich groß. `gap`: Abstand zwischen den Boxen.
    """
    d = _aruco_dictionary(dict_name)
    if quiet is None:
        quiet = max(marker_px // 6, 20)
    box = marker_px + 2 * quiet                      # Schnittkanten-Größe (für alle gleich)
    label_h = 46
    cell = box + 2 * gap + label_h
    sheet = np.full((cell * 2, cell * 2, 3), 255, dtype=np.uint8)
    pos = [(0, 0), (0, 1), (1, 1), (1, 0)]           # a8, h8, h1, a1
    for (r, c), mid, lab in zip(pos, ids, _ARUCO_LABELS, strict=False):
        bx0, by0 = c * cell + gap, r * cell + gap    # obere linke Ecke der Schnitt-Box
        marker = cv2.cvtColor(cv2.aruco.generateImageMarker(d, mid, marker_px), cv2.COLOR_GRAY2BGR)
        sheet[by0 + quiet:by0 + quiet + marker_px, bx0 + quiet:bx0 + quiet + marker_px] = marker
        cv2.rectangle(sheet, (bx0, by0), (bx0 + box, by0 + box), (0, 0, 0), 1, cv2.LINE_AA)  # Schnittlinie
        cv2.putText(sheet, f"{lab} (id {mid})", (bx0, by0 + box + 34),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2, cv2.LINE_AA)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), sheet)
    return out_path


def calibrate_auto(camera: int, profile: str, board_size: int, dict_name: str = "DICT_4X4_50",
                   white_pov: bool = True, preview: bool = False, margin: float = 0.06,
                   min_markers: int = 4) -> int:
    """Marker erkennen -> Marker-Box + eingerücktes Spielfeld -> Profil speichern (kein Klicken).

    `margin`: Anteil, um den die Marker AUSSERHALB des Spielfelds liegen. Mit `--preview` live
    über +/- justieren, bis die grüne Spielfeld-Box auf dem echten Brett liegt.
    """
    out_path = profile_path(profile)
    if out_path.exists():
        import typer

        if not typer.confirm(f"Profil '{profile}' existiert bereits ({out_path}). Überschreiben?"):
            print("Abgebrochen.")
            return 1

    cap = open_camera(camera)
    if not cap.isOpened():
        print(f"[FAIL] Kamera {camera} konnte nicht geöffnet werden.")
        return 1
    try:
        def build_from(f, p, m: float) -> CalibrationProfile:
            hh, ww = f.shape[:2]
            return CalibrationProfile(
                profile=profile, camera_index=camera, frame_size=(ww, hh), board_size=board_size,
                image_corners=p, homography=compute_homography(p, board_size, m),
                white_pov=white_pov, crop=CropParams.default(board_size),
                margin=m, marker_dict=dict_name,
            )

        if preview:
            # LIVE-Video: jeder Frame wird neu gelesen + Marker neu erkannt, Boxen laufen mit.
            win = "chesslab auto-calibrate"
            cv2.namedWindow(win, cv2.WINDOW_NORMAL)
            print("Live-Video: w = Box GRÖSSER, e oder - = KLEINER, r = reset, s = speichern, q = abbrechen")
            tracker = MarkerTracker()
            last_pts, frame, m = None, None, margin
            while True:
                ok, f = cap.read()
                if ok and f is not None:
                    frame = f
                    tracker.update(detect_board_markers(frame, dict_name, corner="center"))
                seen = len(tracker.last)
                if seen >= min_markers:
                    res = resolve_board_corners(tracker.last, board_size=board_size)
                    if res is not None:
                        last_pts = res[0]
                if frame is None:
                    if (cv2.waitKey(30) & 0xFF) in (ord("q"), 27):
                        cv2.destroyAllWindows()
                        print("[FAIL] kein Frame von der Kamera.")
                        return 1
                    continue
                if last_pts and seen >= min_markers:
                    overlay = draw_calibration_overlay(frame, last_pts, build_from(frame, last_pts, m))
                    cv2.putText(overlay, f"margin={m:.3f}  {seen}/4 Marker  w/e=justieren  s=speichern  q=quit",
                                (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2, cv2.LINE_AA)
                else:
                    overlay = frame.copy()
                    cv2.putText(overlay, f"Warte auf alle {min_markers} Marker ({seen}/4 bekannt)...",
                                (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
                cv2.imshow(win, overlay)
                k = cv2.waitKey(30) & 0xFF
                if k in (ord("w"), ord("+"), ord("=")):       # größer
                    m += 0.005
                elif k in (ord("e"), ord("-"), ord("_")):     # kleiner
                    m = max(0.0, m - 0.005)
                elif k == ord("r"):
                    m = margin
                elif k == ord("s") and last_pts:
                    cv2.destroyAllWindows()
                    build_from(frame, last_pts, m).save(out_path)
                    print(f"[OK] Auto-Kalibrierung gespeichert: {out_path} (margin={m:.3f})")
                    return 0
                elif k in (ord("q"), 27):
                    cv2.destroyAllWindows()
                    print("Verworfen.")
                    return 1

        # Nicht-interaktiv: über mehrere Frames sammeln, bis alle min_markers bekannt sind.
        tracker = MarkerTracker()
        frame = None
        for _ in range(120):
            ok, frame = cap.read()
            if not ok or frame is None:
                continue
            tracker.update(detect_board_markers(frame, dict_name, corner="center"))
            if len(tracker.last) >= min_markers:
                break
        if frame is None or len(tracker.last) < min_markers:
            print(f"[FAIL] nicht alle {min_markers} Marker (id 0-3) erkannt — Beleuchtung/Sicht prüfen, "
                  "Marker müssen vollständig & flach sichtbar sein.")
            return 1
        pts = resolve_board_corners(tracker.last, board_size=board_size)[0]
        build_from(frame, pts, margin).save(out_path)
        print(f"[OK] Auto-Kalibrierung gespeichert: {out_path} (margin={margin:.3f})")
        return 0
    finally:
        cap.release()


# --- Interaktive Befehle (brauchen Kamera + Display) ----------------------------------

_WIN = "chesslab calibrate"
_HELP_NEW = "c=capture  Klick 4 Ecken (a8,h8,h1,a1)  u=undo  r=reset  o=POV  s=save  q=quit"


def calibrate_new(camera: int, profile: str, board_size: int) -> int:
    """Interaktive Profilerstellung. Gibt einen Exit-Code zurück."""
    out_path = profile_path(profile)
    if out_path.exists():
        import typer

        if not typer.confirm(f"Profil '{profile}' existiert bereits ({out_path}). Überschreiben?"):
            print("Abgebrochen.")
            return 1

    cap = open_camera(camera)
    if not cap.isOpened():
        print(f"[FAIL] Kamera {camera} konnte nicht geöffnet werden — anderen Index probieren (0,1,2…).")
        return 1

    points: list[list[float]] = []
    frozen = None
    white_pov = True

    def on_mouse(event, x, y, flags, _param):
        if frozen is not None and event == cv2.EVENT_LBUTTONDOWN and len(points) < 4:
            points.append([float(x), float(y)])

    cv2.namedWindow(_WIN, cv2.WINDOW_NORMAL)
    cv2.setMouseCallback(_WIN, on_mouse)

    try:
        while True:
            if frozen is None:
                ok, frame = cap.read()
                if not ok or frame is None:
                    print("[FAIL] kein Frame von der Kamera gelesen.")
                    return 1
                view = frame.copy()
                cv2.putText(view, "c = capture (Standbild einfrieren)", (10, 24),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2, cv2.LINE_AA)
            else:
                view = frozen.copy()
                for i, (px, py) in enumerate(points):
                    cv2.circle(view, (int(px), int(py)), 5, (0, 0, 255), -1)
                    cv2.putText(view, f"{i}:{['a8','h8','h1','a1'][i]}", (int(px) + 6, int(py) - 6),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
                cv2.putText(view, _HELP_NEW, (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1, cv2.LINE_AA)
                cv2.putText(view, f"white_pov={white_pov}", (10, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                            (0, 255, 255), 1, cv2.LINE_AA)

            cv2.imshow(_WIN, view)
            key = cv2.waitKey(20) & 0xFF

            if key == ord("q"):
                print("Abgebrochen (q).")
                return 1
            if key == ord("c") and frozen is None:
                frozen = frame.copy()
            elif key == ord("u") and points:
                points.pop()
            elif key == ord("r"):
                points.clear()
            elif key == ord("o"):
                white_pov = not white_pov
            elif key == ord("s"):
                if len(points) != 4:
                    print(f"[WARN] genau 4 Ecken nötig (aktuell {len(points)}).")
                    continue
                h, w = frozen.shape[:2]
                H = compute_homography(points, board_size)
                prof = CalibrationProfile(
                    profile=profile,
                    camera_index=camera,
                    frame_size=(w, h),
                    board_size=board_size,
                    image_corners=points,
                    homography=H,
                    white_pov=white_pov,
                    crop=CropParams.default(board_size),
                )
                preview = draw_board_grid(warp_board(frozen, prof), prof)
                cv2.imshow(_WIN, preview)
                cv2.putText(preview, "s=save bestätigen, q=verwerfen", (10, 24),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2, cv2.LINE_AA)
                cv2.imshow(_WIN, preview)
                k2 = cv2.waitKey(0) & 0xFF
                if k2 == ord("s"):
                    prof.save(out_path)
                    print(f"[OK] Profil gespeichert: {out_path}")
                    return 0
                # sonst zurück zum Editieren
        return 1
    finally:
        cap.release()
        cv2.destroyAllWindows()


def calibrate_check(camera: int, profile: str) -> int:
    """Live-Overlay des Rasters auf das entzerrte Kamerabild."""
    try:
        prof = load_profile(profile)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        return 1

    cap = open_camera(camera)
    if not cap.isOpened():
        print(f"[FAIL] Kamera {camera} konnte nicht geöffnet werden.")
        return 1
    print("q = beenden")
    cv2.namedWindow(_WIN, cv2.WINDOW_NORMAL)
    try:
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                print("[FAIL] kein Frame gelesen.")
                return 1
            board = draw_board_grid(warp_board(frame, prof), prof)
            cv2.imshow(_WIN, board)
            if (cv2.waitKey(20) & 0xFF) == ord("q"):
                return 0
    finally:
        cap.release()
        cv2.destroyAllWindows()


def calibrate_list() -> int:
    d = config.DATA.calibration
    d.mkdir(parents=True, exist_ok=True)
    profiles = sorted(d.glob("*.yaml"))
    if not profiles:
        print(f"Keine Profile in {d}.")
        return 0
    print(f"Profile in {d}:")
    for p in profiles:
        try:
            prof = CalibrationProfile.load(p)
            print(f"  {prof.profile:<12} board_size={prof.board_size} white_pov={prof.white_pov} "
                  f"frame={prof.frame_size[0]}x{prof.frame_size[1]} created={prof.created_at}")
        except Exception as e:  # noqa: BLE001
            print(f"  {p.name:<12} [unlesbar: {e!r}]")
    return 0
