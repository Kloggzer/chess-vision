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
# Uppercase = White (w), lowercase = Black (b), FEN-conformant.
# `occluded` (square covered by hand/object) NEVER comes from the FEN — only from
# inference/review labels. It is treated like `empty` as a "may be absent" class.
CLASSES: list[str] = [
    "empty",
    "wP", "wN", "wB", "wR", "wQ", "wK",
    "bP", "bN", "bB", "bR", "bQ", "bK",
    "occluded",
]

# Classes that may be absent in a dataset without triggering a warning (do not come
# from auto-labeling of the FEN): empty square + occluded.
OPTIONAL_CLASSES: set[str] = {"empty", "occluded"}

# Global determinism seed for all random steps (split, sampling, training).
SEED: int = 42

# --- Calibration / crop defaults (Stage 1) --------------------------------------------
DEFAULT_PROFILE: str = "default"
DEFAULT_BOARD_SIZE: int = 1600  # Edge length of the rectified board (px) = 200 px/square. Adapted
                                # to high-resolution sources (phone ~209 px/square): the data warp
                                # must NOT downsample below the source resolution, otherwise the
                                # 128px crops get upscaled = pixelated. >source adds nothing (just bigger).


@dataclass(frozen=True)
class CropDefaults:
    """Default per-square crop geometry. A board square is square (board_size/8 per side),
    so the default crop is the **plain square cell** with a square out_size — no aspect
    distortion. `pad_up`/`pad_side` optionally extend the box (cell·(1+pad_up) high) for
    cameras flat enough that 3D pieces lean into the rank behind; `crop_square` keeps the
    aspect ratio (letterbox) so any pad value stays distortion-free. Overridable per `slice`."""

    pad_up: float = 0.0      # ADDITIONAL expansion only upward (3D lean), * cell. Kept 0 by default:
                             # a non-zero pad_up makes the crop TALLER than wide and, on near-top-down
                             # cameras/renders, drags the NEIGHBOUR rank's piece + board into the crop —
                             # exactly the board-shortcut we fight (Grad-CAM then lands on the board, not
                             # the piece). Raise it per `slice` only for a strongly oblique camera where
                             # tall pieces genuinely clip at the cell's top edge.
    pad_side: float = 0.10   # symmetric expansion in ALL 4 directions, * cell (10% MORE than the strict
                             # cell border on every side). Symmetric → the box stays SQUARE (no aspect
                             # distortion); gives margin so the piece isn't cut off hard at the square
                             # border while still centred on its own cell. Inference crops read the same
                             # profile.crop params, so live square crops match training 1:1 (parity).
    out_w: int = 128
    out_h: int = 128         # SQUARE — matches the square (pad_up=0) box aspect, so the piece fills the
                             # crop with no letterboxing and no neighbour-rank context. Raise out_h with
                             # pad_up together if a per-slice oblique override reintroduces upward padding.


CROP = CropDefaults()

# During slicing, the board is rectified with a border (in cells) so that EDGE SQUARES have real
# image content for the pad_side/pad_up expansion (instead of a black border at the board edge).
# Only affects the data/crop pipeline; the web display remains edge-to-edge. Grows automatically with the pads.
CROP_WARP_BORDER_CELLS: float = 0.1


# --- Camera capture defaults (used by chesslab.camera when a caller sets nothing) -----
@dataclass(frozen=True)
class CameraDefaults:
    """Default capture mode for local USB cameras. Applied by `chesslab.camera.open_capture`
    whenever a `CameraSpec` leaves a field as `None`. This is the ONE place to switch the
    house default between 1440p and 4K.

    Why 1440p is the default: 2560×1440 delivers 30 fps, while true 4K (3840×2160) runs at
    ~19 fps and only on a direct USB-3 port — overkill for the chessboard's small per-square
    crops. To force 4K instead, set width=3840, height=2160 here.

    On `fourcc`: "MJPG" is requested but does NOT take effect, and that is a deliberate
    trade-off rather than an accident — setting FOURCC before the resolution is what makes
    OpenCV's DSHOW backend fall back to YUY2 (opencv#7013; full explanation in `camera.py`).
    Engaging MJPG was measured and is not worth it: +5% fps at 1440p, ~5% SLOWER at 4K, and
    an extra ~0.7 CPU cores burned on JPEG decode. The rates above are therefore the
    datasheet's YUY2 limits. Uncompressed 4K is ~380 MB/s, which is why it stalls near
    20 fps on USB-3."""

    width: int = 2560          # → 3840 for 4K
    height: int = 1440         # → 2160 for 4K
    fps: int = 30
    fourcc: str = "MJPG"
    backend: str = "auto"      # auto = DSHOW on Windows (MSMF caps 4K on this cam), else default


CAMERA = CameraDefaults()

# Named capture modes offered by the UI/CLI (`chesslab track --res`, the track web UI's
# resolution selector) and mapped to a `CameraSpec` by `camera.spec_for_mode`. The ONE
# place this list is defined — the UI derives its dropdown from `GET /api/camera/modes`,
# it never hardcodes resolutions. `None` = leave the resolution unset, i.e. fall back to
# `CAMERA` above. A camera is free to IGNORE a requested mode (UVC drivers silently pick
# the nearest supported one), so callers must always read the delivered size back from an
# actually grabbed frame instead of trusting the request.
DEFAULT_CAMERA_MODE: str = "default"
CAMERA_MODES: dict[str, tuple[int, int] | None] = {
    DEFAULT_CAMERA_MODE: None,     # whatever config.CAMERA says (currently 1440p)
    "720p": (1280, 720),
    "1080p": (1920, 1080),
    "1440p": (2560, 1440),
    "4k": (3840, 2160),
}


# --- Lens undistortion (optics, NOT board geometry) -----------------------------------
@dataclass(frozen=True)
class LensDefaults:
    """Barrel/pincushion removal for the rig camera. Applied at exactly one place —
    `chesslab.camera.open_capture` wraps the capture in an undistort decorator. The
    intrinsics come from `chesslab lens calibrate` (see `chesslab/lens.py`); this is the
    LENS model and has nothing to do with `calibration.py` (BOARD geometry).

    `path` "" resolves to `DATA.lens / "calib.npz"`. `alpha` trades black borders against
    field of view (0 = crop-free-looking result with no black corners, 1 = keep every
    source pixel); the output size always equals the input size, so `frame_size` stays
    invariant everywhere. The `undistort_urls`/`undistort_files` switches stay off because
    a URL source is the phone/IP cam (different lens) and a file holds pixels that were
    already captured — remapping those would distort them a second time."""

    enabled: bool = True
    path: str = ""               # "" -> DATA.lens / "calib.npz"
    alpha: float = 0.0           # 0 = no black borders; 1 = keep all pixels
    interpolation: str = "linear"
    undistort_urls: bool = False
    undistort_files: bool = False

    # -- Live drift detection (see `lens.DriftMonitor`) --
    # Signal 1 (geometry/scale): the live board quad vs. the quad recorded in the
    # board profile. A bumped zoom ring changes the board's apparent size a lot, so
    # this is the large, robust signal. Thresholds below are RELATIVE deviations.
    drift_enabled: bool = True
    drift_sample_every: int = 30      # measure on every N-th ArUco alignment (not per frame)
    drift_window: int = 9             # rolling-median window over sampled measurements
    drift_streak: int = 3             # consecutive medians above threshold before warning
    drift_geometry_thr: float = 0.06  # 6 % change of mean side length / sqrt(area)
    # Signal 2 (distortion residual): leave-one-marker-out homography reprojection error
    # in pixels, normalised by the board's mean side length. SPECULATIVE — the threshold
    # is a starting guess and has never been tuned on the real rig, and the check costs
    # one extra ArUco pass on sampled frames, so it is OFF by default.
    drift_residual_enabled: bool = False
    drift_residual_thr: float = 0.004  # 0.4 % of the board's mean side length


LENS = LensDefaults()


# --- Photometry (Stage 7, shared between Slicing and later live inference) -------
# A deterministic preprocessing that is baked INTO the PNGs during slicing and must be
# called identically by the live app (parity). Only deterministic methods.
@dataclass(frozen=True)
class PhotometryDefaults:
    clahe_clip: float = 2.0    # CLAHE clipLimit (local contrast; higher = more aggressive)
    clahe_tile: int = 8        # CLAHE tile size (tileGridSize = tile x tile)
    gamma: float = 1.3         # > 1 brightens shadows (current pain point: dark corners)


PHOTOMETRY = PhotometryDefaults()
PHOTOMETRY_METHODS: tuple[str, ...] = ("none", "clahe", "grayworld", "gamma")

# --- 3D box geometry & bake-off (Stage 7) ---------------------------------------------
# `box3d`: camera pose per frame (solvePnP from markers/corners), project an upward-extruded
# cell per square into the sharp original frame instead of warping top-down.
EXP_GEOMETRIES: tuple[str, ...] = ("warp", "box3d")
EXP_PHOTOMETRIES: tuple[str, ...] = PHOTOMETRY_METHODS
EXP_PIECE_HEIGHT_CELLS: float = 1.6   # Extrude the square base upward in cells (king
                                      # ~1.5 high); too large catches markers/background, too small clips
EXP_BOX3D_FOV_DEG: float = 60.0       # Approximate intrinsics if profile has no camera_matrix
EXP_BOX3D_PAD_SIDE_CELLS: float = 0.15  # lateral clearance of the 3D box per side (in cells)
EXP_MARKER_LEN_CELLS: float = 0.6     # printed marker edge length in cell units (PnP scale)
EXP_PREFIX: str = "bakeoff"           # Name prefix for variant-tagged datasets/experiments


@dataclass(frozen=True)
class DedupDefaults:
    """Curation policy when building a dataset (Stage 4). The capture pipeline delivers
    many nearly identical crops due to never-moved pieces (fixed camera) — these defaults
    control how aggressively to deduplicate and whether to rotation-augment."""

    per_cell_cap: int = 4          # max crops per (session, square, piece) — catches "never moved"
    phash_enabled: bool = True     # additionally remove visually near-identical ones (dhash)
    phash_hamming: int = 6         # Hamming distance <= -> discard as duplicate (0..64)
    # Rotation augmentation AFTER dedup — OFF by default. It contradicts the fixed-camera
    # assumption (CLAUDE.md: rotate90 distorts square colour/light/angle) and was only ever a
    # crutch from before synthetic data existed, when the real set was too small. With 66k+
    # renders carrying their own camera/board/lighting variance it buys nothing, while
    # quadrupling the train split on disk (one extra png per crop per angle) and in the packed
    # memmap. `rotations_augmented` is what `dataset build --rotate` opts into (A/B toggle).
    rotations: tuple[int, ...] = (0,)
    rotations_augmented: tuple[int, ...] = (0, 90, 180, 270)


DEDUP = DedupDefaults()


@dataclass(frozen=True)
class TrackerDefaults:
    """Marker tracker behavior (Stage 1/3). The camera is fixed, so the tracker may
    aggressively smooth and hold positions; at the same time it must self-correct
    if the board does get moved. All values are in pixels or frames."""

    move_threshold: float = 4.0     # Dead zone: detected movement below this -> freeze position
    smooth_alpha: float = 0.35      # EMA weight for actual movement (0 = fixed, 1 = raw/unsmoothed)
    jump_reject_px: float = 60.0    # Single-frame jump above this is treated as an outlier ...
    jump_confirm_frames: int = 2    # ... unless confirmed over this many consecutive frames
    max_held_frames: int = 90       # after this, a held-only corner is considered "stale" (~3 s @30fps)
    default_min_markers: int = 2    # Box needs >= this many known corners (seed/live/held)


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

    brightness: float = 0.35      # ± fraction (lighting variance — the biggest real lever)
    contrast: float = 0.35
    gamma: tuple[float, float] = (0.6, 1.8)
    blur_sigma_max: float = 1.5   # Gaussian blur / sharpness (real camera variance)
    jitter_translate: float = 0.03  # ± fraction of crop size (small homography drift)
    jitter_scale: float = 0.03
    color_jitter: float = 0.1
    noise_std: float = 0.03       # additive Gaussian noise on the [0,1] tensor (p=0.5); breaks the
                                  # "too clean" render/synthetic look and makes more robust
    # Random Erasing (Cutout): blanks a random rectangle after ToTensor (p=erase_p). Forces the
    # model off background shortcuts — if the board around the piece is erased it MUST read the
    # figure, and vice versa. Directly targets the "looks beside the piece" failure (esp. pawns).
    erase_p: float = 0.25             # probability of erasing per sample (0 = off)
    erase_scale: tuple[float, float] = (0.02, 0.15)   # erased area fraction range
    # Class-conditional background randomization: for OCCUPIED crops only (never `empty`), replace
    # the border ring (= the board) with a random feathered background, keeping the centered piece.
    # Fractional (bg_p) so board-vs-random does not correlate with occupancy. Mask-free (works on
    # real crops too, which have no piece mask). Directly attacks the bN=8%-background shortcut:
    # among occupied squares the board carries no piece-type info → the type head must read the piece.
    bg_p: float = 0.60                # prob per occupied crop (0 = off)
    bg_keep_w: float = 0.60           # centered box width kept (piece region), * crop
    bg_keep_h: float = 0.90           # centered box height kept (taller — pieces extend up)
    # The replacement border is drawn from a MIX of self-generated procedural textures
    # (checker/noise/gradient/wood — board-like but random) and random crops of OTHER board
    # images in the dataset (real texture, uncorrelated with THIS crop's piece). A textured,
    # realistic-but-uninformative border is far harder to shortcut than a flat colour: the model
    # can't tell augmented from real, so it must read the figure. bg_procedural_frac = share drawn
    # procedurally (the rest from the other-board pool); bg_pool_size = pool of donor crops.
    bg_procedural_frac: float = 0.5   # fraction of bg draws that are procedural (rest: other-board)
    bg_pool_size: int = 512           # donor crops sampled once for the other-board background pool
    # Neighbour-bleed paste: for EMPTY crops only, composite the central band of a random
    # OCCUPIED crop into one crop edge (feathered). Simulates the mined failure mode: a tall
    # neighbour piece (queen crown, rook body) leans into the empty square's crop via
    # pad_side + perspective and the model reads it as that piece with high confidence.
    # The augment teaches the invariance "piece pixels at the EDGE + board in the CENTRE
    # = empty". Never applied to occupied crops (their piece is centred, so edge content
    # stays a valid negative there via jitter being tiny). Train-time only, real finetune
    # path (SquareDataset); the synth pretrain covers bleed via targeted render FENs.
    neighbour_p: float = 0.30         # prob per EMPTY train crop (0 = off)
    neighbour_frac: tuple[float, float] = (0.10, 0.40)  # intrusion depth range, * crop size
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
# How many pieces of each type are physically available PER COLOR. A standard chess set
# has per side 8 pawns, 2 knights/bishops/rooks each, 1 queen, 1 king. The coverage
# generator (collect play --strategy coverage) places ONLY that many pieces per setup.
# With two sets (`--sets 2`) the rare classes per layout double -> queens/
# kings (the biggest bottlenecks) fill up twice as fast. Legality does not matter: the FEN
# serves only as a label source (per-square classifier), not as a playable position.
DEFAULT_INVENTORY: dict[str, int] = {"P": 8, "N": 2, "B": 2, "R": 2, "Q": 1, "K": 1}

# --- Collection-UI thresholds (Stage 6) -----------------------------------------------
UI_TARGET_PER_CLASS: int = 200          # Target per non-empty class (= stats threshold)
UI_EMPTY_TARGET_RATIO: float = 1.5      # empty target = ratio * largest piece class
UI_WARN_FRAC: float = 0.5               # < 50 % -> red, 50–99 % -> yellow, >= 100 % -> green
UI_TOTAL_TARGET: int = 5000             # Total crop target for the progress bar


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


def find_realityscan() -> str | None:
    """Find RealityScan executable (for launching photogrammetry from the Scan tab).

    Order: Env CHESSLAB_REALITYSCAN → PATH → usual Windows installation locations.
    """
    env = os.environ.get("CHESSLAB_REALITYSCAN", "").strip()
    if env:
        if os.path.isfile(env):
            return os.path.abspath(env)
        on_path = shutil.which(env)
        if on_path:
            return on_path
    on_path = shutil.which("RealityScan")
    if on_path:
        return on_path
    for base in (r"D:\Program Files\Epic Games", r"C:\Program Files\Epic Games"):
        b = Path(base)
        if b.is_dir():
            hits = sorted(b.glob("RealityScan_*/RealityScan.exe"), reverse=True)
            if hits:
                return str(hits[0])
    return None


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
    def lens(self) -> Path:
        """Lens intrinsics (`calib.npz`). Deliberately NOT under `calibration/` — that
        directory holds BOARD profiles and `calibrate list` enumerates its *.yaml. Kept
        out of `all()` so `ensure_dirs` does not create an empty dir for everyone."""
        return self.root / "lens"

    @property
    def sessions(self) -> Path:
        return self.root / "sessions"

    @property
    def sessions_archive(self) -> Path:
        """Archived sessions: removed from the active dataset, but not deleted."""
        return self.root / "sessions_archive"

    @property
    def session_rejects(self) -> Path:
        """Rejected/cut session tails: not active training data, preserved for later relabeling."""
        return self.root / "session_rejects"

    @property
    def squares(self) -> Path:
        return self.root / "squares"

    @property
    def manifests(self) -> Path:
        return self.root / "manifests"

    @property
    def datasets(self) -> Path:
        """Curated, named datasets (each a session selection + dedup/split)."""
        return self.root / "datasets"

    @property
    def models(self) -> Path:
        return self.root / "models"

    @property
    def experiments(self) -> Path:
        """Bake-off outputs (comparison tables per geometry×photometry run)."""
        return self.root / "experiments"

    @property
    def squares_aug(self) -> Path:
        return self.root / "squares_aug"

    @property
    def corrections(self) -> Path:
        """Human label corrections (web relabel UI); applied during re-slice."""
        return self.manifests / "corrections.jsonl"

    @property
    def tracker_feedback(self) -> Path:
        """Move-tracker good/bad feedback: per-decision JSONL + warped board PNGs. A
        hard-negative dataset for CNN retraining / threshold tuning (created on demand)."""
        return self.root / "tracker_feedback"

    def all(self) -> list[Path]:
        return [self.calibration, self.sessions, self.squares, self.manifests, self.models]


DATA = Paths()

_REPO_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class SynthDefaults:
    """Defaults for the synthetic render pipeline (chesslab synth render)."""

    blend: Path = _REPO_ROOT / "synth_assets/Chess Scene.blend"
    pieces_dir: Path = _REPO_ROOT / "synth_pieces"
    out_dir: Path = DATA.root / "synth_raw"
    res: int = 1024
    blender_exe: str = "blender"  # overridable via Env CHESSLAB_BLENDER
    # Warp resolution for slicing renders (dataset build-synth): 1100 px board ~ 137 px/square,
    # matching the ~134 px/square framed renders carry (frame_frac 0.80 @ res 1024). The classic
    # ingest default of 900 (112 px/square) UPSCALES crops to 128 and wastes real resolution.
    warp_board_size: int = 1100

    @property
    def board_texture(self) -> Path:
        """Default board texture path (pieces_dir/board_texture.png) if it exists."""
        return self.pieces_dir / "board_texture.png"

    def blender_cmd(self) -> str:
        """Resolve Blender executable: Env CHESSLAB_BLENDER → PATH → usual Windows
        installation locations (newest first). Fallback: the bare name."""
        env = os.environ.get("CHESSLAB_BLENDER")
        if env:
            return env
        if shutil.which(self.blender_exe):
            return self.blender_exe
        for base in (Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Blender Foundation",):
            if base.is_dir():
                hits = sorted(base.glob("Blender */blender.exe"), reverse=True)
                if hits:
                    return str(hits[0])
        return self.blender_exe


SYNTH = SynthDefaults()


def build_blender_cmd(
    blender: str,
    blend: Path,
    script: Path,
    out: Path,
    n: int = 200,
    seed: int = 42,
    fens: Path | None = None,
    pieces: Path | None = None,
    res: int = 1024,
    board_texture: Path | None = None,
    views_per_scene: int = 1,
    samples: int = 24,
    max_obliqueness: float = 0.20,
    piece_scale: float = 1.0,
    cam_distance_jitter: float = 0.0,
    occlusion_p: float = 0.0,
    borderless_p: float = 0.0,
                       isolate_p: float = 0.0,
                       frame_frac: float = 0.80,
) -> list[str]:
    """Build the Blender command line (pure function, no subprocess)."""
    cmd = [
        blender, "--background", str(blend),
        "--python", str(script),
        "--",
        "--out", str(out),
        "--n", str(n),
        "--seed", str(seed),
        "--res", str(res),
        "--views-per-scene", str(views_per_scene),
        "--samples", str(samples),
        "--max-obliqueness", str(max_obliqueness),
        "--piece-scale", str(piece_scale),
        "--cam-distance-jitter", str(cam_distance_jitter),
        "--occlusion-p", str(occlusion_p),
        "--borderless-p", str(borderless_p),
        "--isolate-p", str(isolate_p),
        "--frame-frac", str(frame_frac),
    ]
    if fens is not None:
        cmd.extend(["--fens", str(fens)])
    if pieces is not None:
        cmd.extend(["--pieces", str(pieces)])
    if board_texture is not None:
        cmd.extend(["--board-texture", str(board_texture)])
    return cmd


# --- Web-UI defaults (local app) ------------------------------------------------------
DEFAULT_WEB_HOST: str = "127.0.0.1"
DEFAULT_WEB_PORT: int = 8000

# --- Move-Tracker defaults -------------------------------------------------------------
DEFAULT_TRACK_HOST: str = "127.0.0.1"
DEFAULT_TRACK_PORT: int = 8001

# Default model for the Move-Tracker CNN recovery/verify. run-20260706-045056
# (mobilenet_v3_small, real-all): ~99.99% on `empty`, ~88% per-square, ~40% piece type — an
# excellent OCCUPANCY detector, which is exactly what the occupancy-based pre-commit verify
# needs. None/"missing on disk" ⇒ feature off (default_tracker_run falls back to newest run).
MOVE_TRACKER_DEFAULT_RUN: str = "run-20260706-045056"


def list_model_runs() -> list[dict]:
    """Model runs under data/models that have weights (best.pt), newest first."""
    runs = []
    root = DATA.models
    if root.exists():
        for d in sorted(root.iterdir()):
            if d.is_dir() and (d / "best.pt").exists():
                runs.append({"run": d.name, "mtime": (d / "best.pt").stat().st_mtime})
    runs.sort(key=lambda r: -r["mtime"])
    return runs


def default_tracker_run() -> str | None:
    """MOVE_TRACKER_DEFAULT_RUN if it exists on disk, else the newest run, else None."""
    if (DATA.models / MOVE_TRACKER_DEFAULT_RUN / "best.pt").exists():
        return MOVE_TRACKER_DEFAULT_RUN
    runs = list_model_runs()
    return runs[0]["run"] if runs else None

# Move-Tracker detection defaults (specs/rework/10-move-detection-v2.md) — Single Source
# for CLI and app; no magic numbers in tracker.py callers.
TRACK_DEFAULTS: dict = {
    "motion_thr": 0.25,            # Motion gate: PERCENT of strongly-changed pixels (motion_score).
                                   # Low on purpose: a slow hand only moves a thin edge band between
                                   # frames; wobble/jitter stays ~0 thanks to blur + motion_px_thr.
    "motion_px_thr": 20.0,         # Per-pixel delta above which a pixel counts as changed —
                                   # desk wobble/jitter shifts everything by ~1 px (tiny deltas,
                                   # score ~0); a hand produces a compact region of strong deltas.
    "z_thr": 3.0,                  # z-Score above which a square is considered "changed"
    "ambiguity_margin_ll": 2.0,    # best − second in log-likelihood units (~e² factor)
    "reanchor_ll_floor": -4.0,     # Re-anchor only if even the best move LL lies below this
    "nudge_timeout_s": 5.0,        # Nudge patch (occupied squares) after this many seconds stuck
    "drift_window_s": 30.0,        # Drift patch (empty squares) — more conservative
    "max_changed": 6,              # Occlusion gate
    "census_thr": 40.0,            # Structural change (census, 0..255); higher ⇒ more squares veto as shadow.
                                   # 160 (live-tuned pre-fusion) vetoed real dark-on-dark ARRIVALS as shadows
                                   # (black rook onto dark f8 -> O-O blocked, Rg8 committed). 40 is the
                                   # clip-validated floor; real cast shadows stay below it (structure unchanged).
    "census_z_weight": 1.0,        # Structural evidence fusion: z_eff = max(z_gray, w·z_census). Census is
                                   # illumination-invariant structure — lifts dark-on-dark moves the gray
                                   # absdiff misses without raising z_thr. 0 = off (legacy single-channel).
    "occl_census_thr": 24.0,       # Baseline occlusion needs structure above this (census 0..255 ≈ Hamming 0.75):
                                   # strong absdiff WITHOUT structure/chroma anomaly is a cast shadow, not a hand.
                                   # 0 = legacy (any strong absdiff counts as occlusion).
    "cnn_conf_thr": 0.85,          # CNN square confidence "reliable"
    "cnn_cooldown_s": 2.0,         # Minimum interval between recovery observations
    "cnn_check_interval_s": 10.0,  # Periodic CNN check
    "verify_window": 8,            # Max CNN frames per pre-commit verify
    "cnn_min_agreement": 0.97,     # Recovery/verify agreement threshold
    "cnn_margin_squares": 1,
    "recovery_max_plies": 4,       # CNN deep recovery: max half-moves the conflict-guided search may bridge       # Recovery margin in SQUARES (capture = 1 square difference)
    "min_confident_board": 32,     # Whole-board match needs plenty of clear view
    "min_confident_recovery": 8,   # Recovery remains operational with partial occlusion
    "motion_margin": 0.10,         # Motion ROI beyond the board edge (fraction of board edge)
    "overhang": 0.25,              # Extend diff/occlusion cells toward back rank (fraction of cell)
    "align_every": 3,              # ArUco marker detection every N-th frame (most expensive per-frame op; camera fixed)
    "align_scale": 0.5,            # ArUco on downscaled frame (0.5 = half-res, ~3x faster; ±1 px inside tracker dead-zone)
    "corner_jump_px": 6.0,         # Warp corner jump ⇒ base truth geometrically invalid → reacquire
    "motion_hold_s": 0.4,          # Seconds the board must be motion-free before detection resumes
                                   # (wall time — frame counts settle in milliseconds at 40 fps)
    "occlusion_color_thr": 3.0,    # Color-outlier veto: Mahalanobis sigma vs board gamut (lower=more sensitive, 0=off).
                                   # NOTE: the historic 1.5 was "tuned" while the gamut was never built (veto dead);
                                   # now that it is live, 1.5 over-fires — 3.0 is the validated-conservative start.
    "min_grid_line_coverage": 0.5, # Grid-line occlusion gate: min visible-line fraction (0=off)
    "reconnect_grace_s": 2.0,      # Auto-reattach camera after this many seconds of no frames (0=off)
    "diff_clahe_clip": 2.0,        # CLAHE contrast boost on the diff image (0=off; ~2-3 lifts dark moves)
    "require_motion_for_move": True,  # Only commit a move if a hand entered since the last reference (drift guard)
    "motion_recency_s": 20.0,
    "commit_ll_floor": 2.0,        # Min ABSOLUTE loglik score a voting candidate needs to commit (0=off).
                                   # A sole-viable candidate has infinite margin, so only an absolute floor
                                   # stops weak phantoms (live: f6h5 @ 0.44 swallowed a castle; real moves
                                   # score ~12-24). Endpoint candidates (CNN-verified) are exempt.
    "detect_scale": 0.5,           # Detection warp scale (0.5 = half-res board; 1.0 = off).
    "desync_obs_n": 3,             # Consecutive stable-mismatch CNN ticks before illegal-move alarm
    "verify_obs_votes": 2,         # Consecutive same-outcome CNN observations per verify decision (never act on one glance)
    "observer_interval_s": 0.0,    # Min seconds between CNN observation starts; 0 = free-running
                                   # (desktop). Raise on battery/thermal-constrained devices (Android port).
}


def ensure_dirs(paths: Paths = DATA) -> list[Path]:
    """Create all runtime data directories if missing; return the list."""
    created: list[Path] = []
    for p in paths.all():
        p.mkdir(parents=True, exist_ok=True)
        created.append(p)
    return created
