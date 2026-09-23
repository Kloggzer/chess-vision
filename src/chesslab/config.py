"""Single source of truth for paths, defaults and the canonical class list."""

from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from pathlib import Path

# Canonical class list (14), the ONE place it is defined. Uppercase = White, FEN-conformant.
# `occluded` NEVER comes from the FEN, only from inference/review labels.
CLASSES: list[str] = [
    "empty",
    "wP", "wN", "wB", "wR", "wQ", "wK",
    "bP", "bN", "bB", "bR", "bQ", "bK",
    "occluded",
]

# May be absent from a dataset without a warning: FEN auto-labeling never produces them.
OPTIONAL_CLASSES: set[str] = {"empty", "occluded"}

# Identity classes (13), DERIVED from `CLASSES`. The pool holds zero `occluded` rows, and an
# untrained 14th logit can still win an argmax — exactly under a hand, where it matters.
IDENTITY_CLASSES: list[str] = [c for c in CLASSES if c != "occluded"]


SEED: int = 42

# Review-candidate threshold, not an occlusion probability or training-loss gate.
TEMPORAL_AUDIT_CUT: float = 0.4
TEMPORAL_MATTE_LOW: float = 24.0
TEMPORAL_MATTE_HIGH: float = 48.0
TEMPORAL_MATTE_MAX_GAP_S: float = 5.0
TEMPORAL_MATTE_PEERS: int = 5
# Smallest blob kept, as a fraction of the raster: a fingertip over one cell is ~1.5 %, a piece
# under the hand's shadow ~0.3 %.
TEMPORAL_MATTE_MIN_AREA: float = 0.006
# Outward margin in px on the 928-px raster; the blurred rim of a moving hand needs it.
TEMPORAL_MATTE_GROW: int = 4

# Fraction by which an ArUco marker's CENTRE sits outside the playing field — THE authoritative
# default (also Kotlin). Measured: grid alignment peaks at 0.040-0.050 on four recordings.
DEFAULT_MARKER_MARGIN: float = 0.045
DEFAULT_BOARD_SIZE: int = 1600  # px; never below the source, or 128 px crops get upscaled


@dataclass(frozen=True)
class CropDefaults:
    """Default per-square crop geometry: the plain square cell plus `pad_side`, letterboxed so any
    pad stays undistorted.

    `pad_side` 0.05 because every crop ever trained on was cut at 0.05; another default shifts
    scale ~9 % with nothing to report it (specs/45)."""

    pad_side: float = 0.05  # symmetric expansion per side, * cell
    out_w: int = 128
    out_h: int = 128  # SQUARE like the box: no letterboxing, no neighbour-rank context


CROP = CropDefaults()

# Border (cells) for the data warp, so EDGE squares have real content for their pad. Grows with the
# pads; the display stays edge-to-edge.
CROP_WARP_BORDER_CELLS: float = 0.1


@dataclass(frozen=True)
class DedupDefaults:
    """Curation policy when building a dataset: a fixed camera yields many near-identical crops."""

    # OFF: capped per (session, square, piece) ACROSS positions, one game went 17 114 -> 388 crops.
    # `max_class_ratio` is the instrument for level.
    per_cell_cap: int = 0          # max crops per (session, square, piece); 0 = off
    # OFF, measured: dhash collides on sign patterns, not pixels — 0 of 3 432 collisions were
    # identical, and hamming 6 dropped 54.8 % of the corpus. Off: 42 misses -> 17, 4 phantoms -> 2.
    phash_enabled: bool = False    # visually near-identical (dhash) — see above
    phash_hamming: int = 6         # Hamming distance <= -> discard as duplicate (0..64)
    # Rotation augmentation after dedup, OFF: it contradicts the fixed camera and quadruples the
    # train split on disk. `dataset build --rotate` opts in.
    rotations: tuple[int, ...] = (0,)
    rotations_augmented: tuple[int, ...] = (0, 90, 180, 270)


DEDUP = DedupDefaults()


@dataclass(frozen=True)
class TrackerDefaults:
    """Marker tracker behavior in pixels/frames; a moved board must still self-correct."""

    move_threshold: float = 4.0     # Dead zone: detected movement below this -> freeze position
    smooth_alpha: float = 0.35      # EMA weight for actual movement (0 = fixed, 1 = raw/unsmoothed)
    jump_reject_px: float = 60.0    # Single-frame jump above this is treated as an outlier ...
    jump_confirm_frames: int = 2    # ... unless confirmed over this many consecutive frames
    max_held_frames: int = 90       # after this, a held-only corner is considered "stale" (~3 s @30fps)
    default_min_markers: int = 2    # Box needs >= this many known corners (seed/live/held)


TRACKER = TrackerDefaults()

DEFAULT_VAL_FRAC: float = 0.15
DEFAULT_TEST_FRAC: float = 0.15
DEFAULT_MAX_EMPTY_RATIO: float = 1.5  # empty capped at ratio * largest piece class
MIN_CLASS_SAMPLES: int = 200           # warn below this for a non-empty class


@dataclass(frozen=True)
class AugmentPolicy:
    """Allowed train-time augmentation; the camera is FIXED, so no board flips or 90° turns.

    Techniques are published (docs/references.md §5); every magnitude is hand-set and unswept
    except `erase_p`.
    """

    brightness: float = 0.35      # ± fraction (lighting variance — the biggest real lever)
    contrast: float = 0.35
    gamma: tuple[float, float] = (0.6, 1.8)
    blur_sigma_max: float = 1.5   # Gaussian blur / sharpness (real camera variance)
    jitter_translate: float = 0.03  # ± fraction of crop size (small homography drift)
    jitter_scale: float = 0.03
    color_jitter: float = 0.1
    # Waagerechte Spiegelung: fuer einen Zellcrop zulaessig (dieselbe Figur, dieselbe Feldfarbe),
    # sie spiegelt aber den Lichtgradienten, der die Sessions unterscheidet. 0 = aus.
    hflip_p: float = 0.0
    # Senkrechte Spiegelung. Mit `hflip_p` zusammen die 180-Grad-Drehung, die einzige physikalisch
    # echte (Kamera von der anderen Tischseite).
    vflip_p: float = 0.0
    #: Halbe Drehung ALLEIN; `hflip_p` und `vflip_p` unabhaengig ergeben die ganze Vierergruppe.
    rot180_p: float = 0.0
    #: Genau EINE Achse, nie beide — schliesst die 180-Grad-Drehung aus.
    flip_xor_p: float = 0.0
    #: Helligkeit umkehren, Label unveraendert — Polaritaets-Invarianz erzwingen.
    #: Klein halten: bei 1,0 waere Weiss von Schwarz nicht mehr zu trennen.
    invert_p: float = 0.0
    #: ZUFAELLIG entfaerben; anders als `--input-repr gray3` bleibt die Farbe nutzbar, nur
    #: unzuverlaessig.
    grayscale_p: float = 0.0
    noise_std: float = 0.03  # additive Gaussian noise on the [0,1] tensor (p=0.5)
    # Random Erasing (Cutout) after ToTensor: erasing the board forces the model to read the figure,
    # and vice versa — against the "looks beside the piece" failure.
    erase_p: float = 0.25             # probability of erasing per sample (0 = off)
    erase_scale: tuple[float, float] = (0.02, 0.15)   # erased area fraction range
    neighbour_pool_size: int = 512     # donor crops sampled once for the neighbour-bleed pool
    # Neighbour-bleed paste, EMPTY crops only: a tall neighbour leaning into the crop was read as
    # that piece. Teaches "piece pixels at the EDGE + board in the CENTRE = empty"; real finetune
    # path only.
    neighbour_p: float = 0.30         # prob per EMPTY train crop (0 = off)
    neighbour_frac: tuple[float, float] = (0.10, 0.40)  # intrusion depth range, * crop size
    allow_flip: bool = False
    allow_rotate90: bool = False


AUGMENT = AugmentPolicy()

# Normalization MUST match across train/eval/export and the app. ImageNet stats because the
# pretrained backbone was trained under them; `--crop-norm per-crop` replaces them.
NORMALIZE_MEAN: tuple[float, float, float] = (0.485, 0.456, 0.406)
NORMALIZE_STD: tuple[float, float, float] = (0.229, 0.224, 0.225)

# Every shipped model is this backbone with batchnorm. `smallcnn` hard-crashes this ROCm-Windows
# machine (a 1-epoch smoke test took the PC down).
DEFAULT_BACKBONE: str = "mobilenetv4_conv_small_035"
DEFAULT_EPOCHS: int = 30      # also the cosine schedule's T_max — see training/train_recipe.py
DEFAULT_BATCH_SIZE: int = 256
# Three or more `python.exe` at 4-7 GB each on a 31.8 GB box preceded the crashes, so this is the
# FIRST knob to lower when the machine goes down during a run.
DEFAULT_NUM_WORKERS: int = 8
# INHERITED, NOT MEASURED: no LR sweep ever ran. Every BatchNorm-vs-GroupNorm comparison ran at this
# rate, so it confounds that result too (docs/references.md §11).
DEFAULT_LR: float = 3e-4

def cap_blas_threads() -> None:
    """One BLAS thread per process — the arenas, not torch, reserve the commit.

    `import torch` reserves 3.48 GB commit at 14 threads, 0.28 GB at one; loader workers inherit
    this env (16 workers = 56 GB before the first batch).
    """
    os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")


def loader_kwargs(num_workers: int | None = None, *, pin_memory: bool = True,
                  prefetch_factor: int = 4, persistent: bool = True) -> dict:
    """The DataLoader policy every training path shares; `batch_size` and `shuffle` stay local.

    `pin_memory=False`: two pinned loaders blew the HIP host heap. `persistent=False` for
    one-shot loaders: kept workers hold ~1.2 GB each.
    """
    workers = DEFAULT_NUM_WORKERS if num_workers is None else num_workers
    kw: dict = {"num_workers": workers, "pin_memory": pin_memory}
    if workers > 0:
        cap_blas_threads()
        kw.update(persistent_workers=persistent, prefetch_factor=prefetch_factor)
    return kw


DEFAULT_PATIENCE: int = 7

# Pieces available PER COLOR in one set; the coverage generator places only that many per setup.
# Legality does not matter: the FEN is only a label source.
DEFAULT_INVENTORY: dict[str, int] = {"P": 8, "N": 2, "B": 2, "R": 2, "Q": 1, "K": 1}


def label_from_piece(symbol: str | None) -> str:
    """Map a python-chess piece symbol to a class label: 'P' -> 'wP', 'n' -> 'bN', None/'' ->
    'empty'.
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
    def recordings(self) -> Path:
        """One folder per recording: `log.jsonl`, `matte.jsonl`, `corrections.jsonl`, `boards/`,
        `mattes/`.

        The session id keeps its `rg-` prefix (the manifest join key); only the directory dropped
        it."""
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
        """Machine output about the corpus, regenerable by the command that wrote it — never a
        human's word.
        """
        return self.root / "reports"

    @property
    def footage(self) -> Path:
        """Raw video nothing in the pipeline writes: turntable clips, occluder clips, phone dumps."""
        return self.root / "footage"

    @property
    def occluders(self) -> Path:
        """RGBA occluder tiles (hands), cut from `footage/occluders` by `chesslab occluders
        extract`.
        """
        return self.root / "occluders"

    @property
    def datasets(self) -> Path:
        """Curated, named datasets (each a session selection + dedup/split)."""
        return self.root / "datasets"

    @property
    def packs(self) -> Path:
        """One pack per session, cited by every dataset — out of `all()`, nobody needs it empty."""
        return self.root / "packs"

    @property
    def models(self) -> Path:
        return self.root / "models"


    @property
    def labels(self) -> Path:
        """The human verdicts that belong to no single recording. Machine output goes to `reports/`:
        a re-slice must never take a human's ruling with it.
        """
        return self.root / "labels"

    def all(self) -> list[Path]:
        return [self.calibration, self.recordings, self.crops, self.labels, self.models]


DATA = Paths()

_REPO_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class SynthDefaults:
    blend: Path = _REPO_ROOT / "synth/assets/Chess Scene.blend"
    pieces_dir: Path = _REPO_ROOT / "synth_pieces"
    out_dir: Path = DATA.root / "synth_raw"
    res: int = 1024
    blender_exe: str = "blender"  # overridable via Env CHESSLAB_BLENDER
    # Warp resolution for slicing renders: 1100 px ~ 137 px/square, matching the framed renders. 900
    # would upscale crops to 128.
    warp_board_size: int = 1100

    @property
    def board_texture(self) -> Path:
        """Default board texture path (pieces_dir/board_texture.png) if it exists."""
        return self.pieces_dir / "board_texture.png"

    def blender_cmd(self) -> str:
        """Blender executable: Env CHESSLAB_BLENDER -> PATH -> Windows install dirs (newest first)
        -> bare name.
        """
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


def ensure_dirs(paths: Paths = DATA) -> list[Path]:
    created: list[Path] = []
    for p in paths.all():
        p.mkdir(parents=True, exist_ok=True)
        created.append(p)
    return created
