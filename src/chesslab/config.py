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

# --- Identity class list (13) = CLASSES minus `occluded`. ------------------------------
# DERIVED, never a second literal: the canonical list stays the one above.
#
# Why 13 and not 14: the crop pool holds zero `occluded` rows in 53,000 — capture only runs
# while the board is clear, and `occluded` is documented above as never coming from a FEN.
# Training the 14th output would leave it shaped by nothing but the initialisation, and an
# untrained logit can still win an argmax on unusual input. Unusual input under a hand is
# precisely the case where the tracker relies on the answer.
IDENTITY_CLASSES: list[str] = [c for c in CLASSES if c != "occluded"]


# Global determinism seed for all random steps (split, sampling, training).
SEED: int = 42

# --- Calibration / crop defaults (Stage 1) --------------------------------------------
DEFAULT_PROFILE: str = "default"
# Fraction by which an ArUco marker's CENTRE sits outside the playing field — the markers are
# printed/glued in the label border, so the quad they span is larger than the board. THE
# authoritative default; `calibrate`, `profile_from_frame` and the Kotlin store all read it.
# 0.045 is measured, not chosen: sweeping it against grid-line alignment puts the optimum at
# 0.040-0.050 on four independent recordings (two phone, two rendered). The previous 0.06
# over-indented every profile made from it. Per-corner values live in the profile, because a
# re-glued marker moves on its own.
DEFAULT_MARKER_MARGIN: float = 0.045
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
    pad_side: float = 0.05   # symmetric expansion in ALL 4 directions, * cell (5% MORE than the strict
                             # cell border on every side). Symmetric → the box stays SQUARE (no aspect
                             # distortion); gives margin so the piece isn't cut off hard at the square
                             # border while still centred on its own cell.
                             #
                             # 0.05, not the 0.10 this held until 2026-08-06: the pad decides what a
                             # training example LOOKS like, and every crop this project has ever
                             # trained on was cut at 0.05 (all 23 real sessions, profiles `default`
                             # and `phone`). A default no corpus uses is a trap for whatever is built
                             # next — a freshly auto-created profile (`ensure_profile`) or a synth
                             # ingest would have cut 1.20 cells against the corpus's 1.10, a 9 %
                             # scale shift with nothing to report it. specs/18's DATA-QUALITY note
                             # named the same mismatch and proposed closing it the other way round;
                             # the corpus and every shipped model went 0.05, so the default follows
                             # them. See specs/45-the-crop-belongs-to-the-model/.
    out_w: int = 128
    out_h: int = 128         # SQUARE — matches the square (pad_up=0) box aspect, so the piece fills the
                             # crop with no letterboxing and no neighbour-rank context. Raise out_h with
                             # pad_up together if a per-slice oblique override reintroduces upward padding.


CROP = CropDefaults()

# During slicing, the board is rectified with a border (in cells) so that EDGE SQUARES have real
# image content for the pad_side/pad_up expansion (instead of a black border at the board edge).
# Only affects the data/crop pipeline; the web display remains edge-to-edge. Grows automatically with the pads.
CROP_WARP_BORDER_CELLS: float = 0.1


# --- Rig capture reference resolution -------------------------------------------------
@dataclass(frozen=True)
class CameraDefaults:
    """The resolution the rig camera records at. Python no longer opens the camera (Kotlin
    owns it since 2026-08-20); this is the reference `doctor` checks the lens calibration
    against.

    Why 1440p is the default: 2560×1440 delivers 30 fps, while true 4K (3840×2160) runs at
    ~19 fps and only on a direct USB-3 port — overkill for the chessboard's small per-square
    crops. To force 4K instead, set width=3840, height=2160 here.

    The rates are the datasheet's YUY2 limits — uncompressed 4K is ~380 MB/s, which is why
    it stalls near 20 fps on USB-3."""

    width: int = 2560          # → 3840 for 4K
    height: int = 1440         # → 2160 for 4K
    fps: int = 30


CAMERA = CameraDefaults()

# --- Lens undistortion (optics, NOT board geometry) -----------------------------------
@dataclass(frozen=True)
class LensDefaults:
    """Barrel/pincushion removal for the rig camera. Applied at exactly one place —
    `lens.active()` builds the undistorter a caller applies to raw frames. The
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


@dataclass(frozen=True)
class DedupDefaults:
    """Curation policy when building a dataset (Stage 4). The capture pipeline delivers
    many nearly identical crops due to never-moved pieces (fixed camera) — these defaults
    control how aggressively to deduplicate and whether to rotation-augment."""

    per_cell_cap: int = 4          # max crops per (session, square, piece) — catches "never moved"
    # OFF since 2026-07-30, measured. `dhash` reduces a crop to 64 yes/no comparisons between
    # neighbouring pixels of a 9x8 grey thumbnail — absolute brightness, contrast, noise and
    # colour are gone. Two crops collide as soon as that SIGN PATTERN matches, which for a
    # smooth empty square or a piece body it reliably does.
    #
    # So "duplicate" was never true here: of 3 432 collisions in five sessions, **0 were pixel
    # identical** and no frame was ever delivered twice. What the filter removed at hamming 6
    # was 54.8% of the corpus — crops differing in noise, exposure and sub-pixel shift, i.e.
    # exactly the variation the model has to become robust against. Turning it off, one
    # variable changed: 42 misses -> 17, 4 phantoms -> 2 (`occ-v4-f5` vs `occ-v4-f5nd`,
    # occ-real6 test split). `per_cell_cap` still bounds the "never moved" case, which is what
    # this policy is actually for.
    #
    # NOT measured: hamming 2 (22.2% discarded) and 0 (6.0%) against a trained model. Only
    # 6-vs-off was, so a middle ground may exist — but even at 0 the discarded crops are merely
    # dhash-identical, not identical.
    phash_enabled: bool = False    # visually near-identical (dhash) — see above
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
DEFAULT_MAX_EMPTY_RATIO: float = 1.5   # empty capped at ratio * largest piece class. The value is
                                       # this project's own; see dataset.subsample_classes for
                                       # where it stands relative to the imbalance literature.
MIN_CLASS_SAMPLES: int = 200           # warn below this for a non-empty class


@dataclass(frozen=True)
class AugmentPolicy:
    """Allowed train-time augmentation. The camera is FIXED, so flips and 90/180°
    rotation are forbidden (they would falsify field colour and geometry). Applied in
    Stage 5 (train only); val/test get deterministic resize/normalize only.

    The techniques are published (docs/references.md §5): erasing a random rectangle is
    Cutout/Random Erasing, and replacing the border is a defence against the background shortcut
    this project measured with Grad-CAM. **Every magnitude below is hand-set and unswept** — none
    of the numbers comes from a source, and none has been ablated except `erase_p`/`bg_p`, which
    have CLI overrides for that purpose."""

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
# ImageNet stats — required by the pretrained mobilenet backbone, harmless for smallcnn. No paper
# defines these six numbers; they are the ImageNet training-set channel statistics that
# torchvision's pretrained weights were trained under, and they are used here for that reason
# alone. `--crop-norm per-crop` replaces them entirely (see torch_data._PerCropStandardize).
NORMALIZE_MEAN: tuple[float, float, float] = (0.485, 0.456, 0.406)
NORMALIZE_STD: tuple[float, float, float] = (0.229, 0.224, 0.225)

DEFAULT_BACKBONE: str = "smallcnn"
DEFAULT_EPOCHS: int = 30      # also the cosine schedule's T_max — see training/train.py
DEFAULT_BATCH_SIZE: int = 256
DEFAULT_NUM_WORKERS: int = 8  # Verified stable with Windows spawn; keeps the GPU fed from memmaps.
# INHERITED, NOT MEASURED. No sweep and no learning-rate range test has ever been run on this
# project (the range test is docs/references.md#smith-2015, and costs a few epochs). It is also
# the rate at which every BatchNorm-vs-GroupNorm comparison on record ran, while the claim about
# BatchNorm is that tolerating a LARGER rate is its main benefit (docs/references.md#bjorck-2018),
# so this constant is a confound in the normalization result as well as an unknown of its own.
# Listed in docs/references.md §11 with the other decisions that rest on nothing published.
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
UI_EMPTY_TARGET_RATIO: float = 1.5      # empty target = ratio * largest piece class
UI_WARN_FRAC: float = 0.5               # < 50 % -> red, 50–99 % -> yellow, >= 100 % -> green
UI_TOTAL_TARGET: int = 5000             # Total crop target for the progress bar


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
    def recordings(self) -> Path:
        """One folder per recording: the import, what was cut from it, and its corrections.

        Everything that only says something about THIS recording lives here — `log.jsonl`,
        `matte.jsonl`, `corrections.jsonl`, `boards/`, `mattes/`. The session id keeps its `rg-`
        prefix (it is the join key in every manifest); only the directory dropped it.
        """
        return self.root / "recordings"

    @property
    def sessions(self) -> Path:
        return self.root / "sessions"

    @property
    def inbox(self) -> Path:
        """Where the web app keeps its own state — and the heavy lock BOTH sides serialize on."""
        return self.root / "inbox"

    @property
    def heavy_lock(self) -> Path:
        return self.inbox / "heavy.lock"

    @property
    def sessions_archive(self) -> Path:
        """Archived sessions: removed from the active dataset, but not deleted."""
        return self.root / "sessions_archive"

    @property
    def session_rejects(self) -> Path:
        """Rejected/cut session tails: not active training data, preserved for later relabeling."""
        return self.root / "session_rejects"

    @property
    def crops(self) -> Path:
        """Every crop pool lives here: `crops/<tag>/<label>/*.webp`, default tag `default`."""
        return self.root / "crops"

    @property
    def crop_pool(self) -> Path:
        """The default pool. A variant `ingest --tag X` writes `crops/X/` beside it."""
        return self.crops / "default"

    @property
    def reports(self) -> Path:
        """Machine output about the corpus: audit flags, violations, mined hard empties, sweeps.

        Regenerable by the command that wrote it — never a human's word, that lives in `labels/`
        and next to its recording.
        """
        return self.root / "reports"

    @property
    def footage(self) -> Path:
        """Raw video nothing in the pipeline writes: turntable clips, occluder clips, phone dumps."""
        return self.root / "footage"

    @property
    def plates(self) -> Path:
        """RGBA occluder tiles, cut from `footage/occluders` by `chesslab occluders extract`."""
        return self.root / "plates"

    @property
    def datasets(self) -> Path:
        """Curated, named datasets (each a session selection + dedup/split)."""
        return self.root / "datasets"

    @property
    def models(self) -> Path:
        return self.root / "models"


    @property
    def labels(self) -> Path:
        """The human verdicts that belong to no single recording — today `review-notes.jsonl`.

        A recording's own corrections live beside it (`recordings/<ts>/corrections.jsonl`).
        Machine output goes to `reports/`; a re-slice rebuilds that and must never be able to
        take a human's ruling with it."""
        return self.root / "labels"

    def all(self) -> list[Path]:
        return [self.calibration, self.recordings, self.crops, self.labels, self.models]


DATA = Paths()

_REPO_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class SynthDefaults:
    """Defaults for the synthetic render pipeline (chesslab synth render)."""

    blend: Path = _REPO_ROOT / "synth/assets/Chess Scene.blend"
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
        runs.extend({"run": d.name, "mtime": (d / "best.pt").stat().st_mtime}
                    for d in sorted(root.iterdir())
                    if d.is_dir() and (d / "best.pt").exists())
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
    "verify_window": 8,            # Max CNN observations per pre-commit verify
    "verify_timeout_s": 1.5,       # ...and the same deadline in SECONDS, which is the unit the
                                   # player experiences. `verify_window` counts OBSERVATIONS, and
                                   # what one costs is set by the CNN: 8 of them is 1.2 s at a
                                   # 146 ms observation and 2.4 s at the 290 ms measured on an
                                   # SM8650 — and if the observer stalls, unbounded. A pending
                                   # candidate blinds BOTH paths (`_detect_guards` refuses
                                   # detection, and `_cnn_worker` routes every observation to
                                   # verify so recovery cannot run), so that is dead time.
                                   # 1.5 s is above every terminal decision ever measured:
                                   # over 66 candidates on 15 clips + 3 recordings a commit
                                   # needs 1 observation (pair) or 2 (single, one lost to the
                                   # seq gate) and the slowest verdict was a 3-observation
                                   # shadow = 0.9 s at the device rate.
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
    "motion_hold_s": 0.34,         # Seconds the board must be motion-free before detection resumes
                                   # (wall time). It is HALF the commit latency: measured
                                   # deterministically at 30 fps, last motion -> commit is
                                   # `motion_hold_s + 0.05..0.07` (the remainder is the grid-gate
                                   # re-hold), and the frame rate does not enter — the same clip at
                                   # 30/15/10 fps commits every move within 0.2 s of the same wall
                                   # time. 0.34 is the floor the clip suite allows: at 0.32
                                   # `blender-scholars` loses its mate (Qxf7#) because detection
                                   # then fires two frames earlier on a frame carrying 7 changed
                                   # squares against `max_changed` = 6, refuses it as
                                   # `too_many_changed`, and the eventual single commit swallows
                                   # the queen. Going lower needs `max_changed` = 7, which widens
                                   # the occlusion gate — a detection-quality trade the user has
                                   # ruled out. The six-rung ladder is in `docs/tracker-flow.md`.
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
