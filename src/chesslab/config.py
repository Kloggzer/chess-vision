"""Single source of truth for paths, defaults and the canonical class list.

Per project convention (CLAUDE.md): configuration lives here, not hardcoded in logic.
Later stages extend this module (crop params, split fractions, UI thresholds, ...).
"""

from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from pathlib import Path

# --- Canonical, ordered class list (14). The ONE place this is defined. ---------------
# Großbuchstabe = Weiß (w), Kleinbuchstabe = Schwarz (b), FEN-konform.
# `occluded` (Feld von Hand/Objekt verdeckt) kommt NIE aus der FEN — nur über die
# Inference-/Review-Labels. Es wird wie `empty` als "darf fehlen"-Klasse behandelt.
CLASSES: list[str] = [
    "empty",
    "wP", "wN", "wB", "wR", "wQ", "wK",
    "bP", "bN", "bB", "bR", "bQ", "bK",
    "occluded",
]

# Klassen, die in einem Datensatz fehlen dürfen, ohne eine Warnung auszulösen (kommen nicht
# aus dem Auto-Labeling der FEN): leeres Feld + verdeckt.
OPTIONAL_CLASSES: set[str] = {"empty", "occluded"}

# Global determinism seed for all random steps (split, sampling, training).
SEED: int = 42

# --- Calibration / crop defaults (Stage 1) --------------------------------------------
DEFAULT_PROFILE: str = "default"
DEFAULT_BOARD_SIZE: int = 1600  # Kantenlänge des entzerrten Bretts (px) = 200 px/Feld. An hoch-
                                # auflösende Quellen (Handy ~209 px/Feld) angepasst: der Daten-Warp
                                # darf NICHT unter die Quellauflösung downsampeln, sonst werden die
                                # 128er-Crops hochskaliert = pixelig. >Quelle bringt nichts (nur größer).


@dataclass(frozen=True)
class CropDefaults:
    """Default per-square crop geometry. A board square is square (board_size/8 per side),
    so the default crop is the **plain square cell** with a square out_size — no aspect
    distortion. `pad_up`/`pad_side` optionally extend the box (cell·(1+pad_up) high) for
    cameras flat enough that 3D pieces lean into the rank behind; `crop_square` keeps the
    aspect ratio (letterbox) so any pad value stays distortion-free. Overridable per `slice`."""

    pad_up: float = 0.0      # ZUSÄTZLICHE Erweiterung nur nach oben (3D-Lean), * cell
    pad_side: float = 0.05   # symmetrische Erweiterung in ALLE 4 Richtungen, * cell (5% = mehr Figur
                             # sichtbar statt hart an der grünen Feldkante abgeschnitten)
    out_w: int = 128
    out_h: int = 128         # square: matches the square board cell -> no stretching


CROP = CropDefaults()

# Beim Slicen wird das Brett mit einem Rand (in Zellen) mitentzerrt, damit RANDFELDER echten
# Bildinhalt für die pad_side/pad_up-Erweiterung haben (statt schwarzem Rand an der Spielfeldkante).
# Wirkt nur im Daten-/Crop-Pfad; die Web-Anzeige bleibt edge-to-edge. Wächst automatisch mit den Pads.
CROP_WARP_BORDER_CELLS: float = 0.1


# --- Photometrie (Stufe 7, geteilt zwischen Slicing und späterer Live-Inferenz) -------
# Eine deterministische Aufbereitung, die beim Slicen IN die PNGs gebacken wird und von der
# Live-App identisch aufgerufen werden muss (Parität). Nur deterministische Methoden.
@dataclass(frozen=True)
class PhotometryDefaults:
    clahe_clip: float = 2.0    # CLAHE clipLimit (lokaler Kontrast; höher = aggressiver)
    clahe_tile: int = 8        # CLAHE Kachelgröße (tileGridSize = tile x tile)
    gamma: float = 1.3         # > 1 hellt Schatten auf (aktuelles Schmerzproblem: dunkle Ecken)


PHOTOMETRY = PhotometryDefaults()
PHOTOMETRY_METHODS: tuple[str, ...] = ("none", "clahe", "grayworld", "gamma")

# --- 3D-Box-Geometrie & Bake-Off (Stufe 7) --------------------------------------------
# `box3d`: Kamerapose pro Frame (solvePnP aus Markern/Ecken), pro Feld eine nach oben
# extrudierte Zelle in den scharfen Originalframe projizieren statt Top-Down zu warpen.
EXP_GEOMETRIES: tuple[str, ...] = ("warp", "box3d")
EXP_PHOTOMETRIES: tuple[str, ...] = PHOTOMETRY_METHODS
EXP_PIECE_HEIGHT_CELLS: float = 1.6   # Extrusion der Feld-Grundfläche nach oben in Zellen (König
                                      # ~1.5 hoch); zu groß fängt Marker/Hintergrund, zu klein kappt
EXP_BOX3D_FOV_DEG: float = 60.0       # Näherungs-Intrinsics, falls Profil keine camera_matrix hat
EXP_BOX3D_PAD_SIDE_CELLS: float = 0.15  # seitlicher Spielraum der 3D-Box je Seite (in Zellen)
EXP_MARKER_LEN_CELLS: float = 0.6     # gedruckte Markerkanten-Länge in Zell-Einheiten (PnP-Skala)
EXP_PREFIX: str = "bakeoff"           # Namenspräfix für variantengetaggte Datasets/Experimente


@dataclass(frozen=True)
class DedupDefaults:
    """Kuratierungs-Policy beim Bauen eines Datensatzes (Stufe 4). Der Aufnahme-Ablauf liefert
    durch nie bewegte Figuren (fixe Kamera) viele fast identische Crops — diese Defaults regeln,
    wie stark dedupliziert und ob rotations-augmentiert wird."""

    per_cell_cap: int = 4          # max. Crops je (Session, Feld, Figur) — trifft "nie bewegt"
    phash_enabled: bool = True     # zusätzlich visuell fast gleiche (dhash) entfernen
    phash_hamming: int = 6         # Hamming-Distanz <= -> als Duplikat verwerfen (0..64)
    # Rotations-Augmentation NACH dem Dedup (4x kuratierte Crops). ACHTUNG: widerspricht der
    # Fixkamera-Annahme (CLAUDE.md: rotate90 verboten, da Feldfarbe/Licht/Neigung verfälscht).
    # Als Toggle/A-B gedacht; () oder (0,) = aus. Quadratische Crops -> 90° bleibt formatrein.
    rotations: tuple[int, ...] = (0, 90, 180, 270)


DEDUP = DedupDefaults()


@dataclass(frozen=True)
class TrackerDefaults:
    """Marker-Tracker-Verhalten (Stufe 1/3). Die Kamera steht fix, deshalb darf der Tracker
    aggressiv glätten und Positionen halten; gleichzeitig muss er sich selbst korrigieren,
    wenn das Brett doch verschoben wird. Alle Werte sind in Pixeln bzw. Frames."""

    move_threshold: float = 4.0     # Dead-Zone: erkannte Bewegung darunter -> Position einfrieren
    smooth_alpha: float = 0.35      # EMA-Gewicht für echte Bewegung (0 = fix, 1 = roh/ungeglättet)
    jump_reject_px: float = 60.0    # Einzel-Frame-Sprung darüber gilt erstmal als Ausreißer ...
    jump_confirm_frames: int = 2    # ... außer er wird über so viele Frames in Folge bestätigt
    max_held_frames: int = 90       # danach gilt eine nur gehaltene Ecke als "veraltet" (~3 s @30fps)
    default_min_markers: int = 2    # Box braucht >= so viele bekannte Ecken (Seed/live/gehalten)


TRACKER = TrackerDefaults()

# --- Dataset / split defaults (Stage 4) -----------------------------------------------
DEFAULT_VAL_FRAC: float = 0.15
DEFAULT_TEST_FRAC: float = 0.15
DEFAULT_MAX_EMPTY_RATIO: float = 1.5   # empty capped at ratio * largest piece class
MIN_CLASS_SAMPLES: int = 200           # warn below this for a non-empty class


@dataclass(frozen=True)
class AugmentPolicy:
    """Allowed train-time augmentation. The camera is FIXED, so flips and 90/180°
    rotation are forbidden (they would falsify field colour and geometry). Applied in
    Stage 5 (train only); val/test get deterministic resize/normalize only."""

    brightness: float = 0.2       # ± fraction (lighting variance — the biggest real lever)
    contrast: float = 0.2
    gamma: tuple[float, float] = (0.8, 1.2)
    blur_sigma_max: float = 0.8   # light Gaussian blur / sharpness
    jitter_translate: float = 0.03  # ± fraction of crop size (small homography drift)
    jitter_scale: float = 0.03
    color_jitter: float = 0.1
    allow_flip: bool = False        # explicitly forbidden
    allow_rotate90: bool = False    # explicitly forbidden


AUGMENT = AugmentPolicy()

# --- Training defaults (Stage 5) ------------------------------------------------------
# Normalization MUST be identical for train/eval/export (and the inference app mirrors it).
# ImageNet stats — required by the pretrained mobilenet backbone, harmless for smallcnn.
NORMALIZE_MEAN: tuple[float, float, float] = (0.485, 0.456, 0.406)
NORMALIZE_STD: tuple[float, float, float] = (0.229, 0.224, 0.225)

DEFAULT_BACKBONE: str = "smallcnn"
DEFAULT_EPOCHS: int = 30
DEFAULT_BATCH_SIZE: int = 256
DEFAULT_LR: float = 3e-4
DEFAULT_PATIENCE: int = 7

# --- Physical piece inventory (coverage strategy) -------------------------------------
# Wie viele Figuren je Typ PRO FARBE physisch verfügbar sind. Ein Standard-Schachspiel
# hat pro Seite 8 Bauern, je 2 Springer/Läufer/Türme, 1 Dame, 1 König. Der Coverage-
# Generator (collect play --strategy coverage) platziert NUR so viele Figuren je Setup.
# Mit zwei Spielen (`--sets 2`) verdoppeln sich die seltenen Klassen pro Aufbau -> Damen/
# Könige (die größten Engpässe) füllen sich doppelt so schnell. Legalität ist egal: die FEN
# dient nur als Label-Quelle (per-Feld-Klassifikator), nicht als spielbare Stellung.
DEFAULT_INVENTORY: dict[str, int] = {"P": 8, "N": 2, "B": 2, "R": 2, "Q": 1, "K": 1}

# --- Collection-UI thresholds (Stage 6) -----------------------------------------------
UI_TARGET_PER_CLASS: int = 200          # Zielzahl je Nicht-empty-Klasse (= stats-Schwelle)
UI_EMPTY_TARGET_RATIO: float = 1.5      # empty-Ziel = ratio * größte Figurenklasse
UI_WARN_FRAC: float = 0.5               # < 50 % -> rot, 50–99 % -> gelb, >= 100 % -> grün
UI_TOTAL_TARGET: int = 5000             # Gesamt-Crop-Ziel für den Fortschrittsbalken


# --- Engine (Stockfish) discovery -----------------------------------------------------
# Frontend users should not have to know where the engine binary lives. We look in a few
# conventional places so picking strategy "stockfish" just works out of the box.
ENGINE_ENV_VAR: str = "CHESSLAB_STOCKFISH"


def _bundled_engine_dirs() -> list[Path]:
    """Candidate directories that may hold a bundled UCI engine binary."""
    repo_root = Path(__file__).resolve().parents[2] / "tools" / "stockfish"  # src/chesslab/.. -> repo
    cwd_local = Path("tools") / "stockfish"
    return [repo_root, cwd_local]


def find_stockfish() -> str | None:
    """Locate a UCI chess engine binary without the user specifying a path.

    Order of preference:
      1. Explicit override via the CHESSLAB_STOCKFISH env var (file path or name on PATH).
      2. A binary bundled under tools/stockfish/ (shipped with the repo).
      3. `stockfish` found on the system PATH.

    Returns an absolute path string, or None if nothing is found.
    """
    override = os.environ.get(ENGINE_ENV_VAR, "").strip()
    if override:
        if os.path.isfile(override):
            return os.path.abspath(override)
        on_path = shutil.which(override)
        if on_path:
            return on_path

    for d in _bundled_engine_dirs():
        if not d.is_dir():
            continue
        for p in sorted(d.glob("stockfish*")):
            if not p.is_file():
                continue
            if os.name == "nt" and p.suffix.lower() != ".exe":
                continue  # on Windows only an .exe is runnable
            return str(p.resolve())

    return shutil.which("stockfish")


def label_from_piece(symbol: str | None) -> str:
    """Map a python-chess piece symbol (FEN letter) to a class label.

    'P' -> 'wP', 'n' -> 'bN', None/'' -> 'empty'. Result is always a member of CLASSES.
    """
    if not symbol:
        return "empty"
    prefix = "w" if symbol.isupper() else "b"
    return f"{prefix}{symbol.upper()}"


@dataclass(frozen=True)
class Paths:
    """Runtime data directories (created on demand, git-ignored)."""

    root: Path = Path("data")

    @property
    def calibration(self) -> Path:
        return self.root / "calibration"

    @property
    def sessions(self) -> Path:
        return self.root / "sessions"

    @property
    def sessions_archive(self) -> Path:
        """Archivierte Sessions: aus dem aktiven Datensatz genommen, aber nicht gelöscht."""
        return self.root / "sessions_archive"

    @property
    def squares(self) -> Path:
        return self.root / "squares"

    @property
    def manifests(self) -> Path:
        return self.root / "manifests"

    @property
    def datasets(self) -> Path:
        """Kuratierte, benannte Datensätze (je eine Session-Auswahl + Dedup/Split)."""
        return self.root / "datasets"

    @property
    def models(self) -> Path:
        return self.root / "models"

    @property
    def experiments(self) -> Path:
        """Bake-Off-Ausgaben (Vergleichstabellen je Geometrie×Photometrie-Lauf)."""
        return self.root / "experiments"

    @property
    def squares_aug(self) -> Path:
        return self.root / "squares_aug"

    @property
    def corrections(self) -> Path:
        """Human label corrections (web relabel UI); applied during re-slice."""
        return self.manifests / "corrections.jsonl"

    def all(self) -> list[Path]:
        return [self.calibration, self.sessions, self.squares, self.manifests, self.models]


DATA = Paths()

# --- Web-UI defaults (local app) ------------------------------------------------------
DEFAULT_WEB_HOST: str = "127.0.0.1"
DEFAULT_WEB_PORT: int = 8000


def ensure_dirs(paths: Paths = DATA) -> list[Path]:
    """Create all runtime data directories if missing; return the list."""
    created: list[Path] = []
    for p in paths.all():
        p.mkdir(parents=True, exist_ok=True)
        created.append(p)
    return created
