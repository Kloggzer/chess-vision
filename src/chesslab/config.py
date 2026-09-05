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


@dataclass(frozen=True)
class DedupDefaults:
    """Curation policy when building a dataset (Stage 4). The capture pipeline delivers
    many nearly identical crops due to never-moved pieces (fixed camera) — these defaults
    control how aggressively to deduplicate and whether to rotation-augment."""

    # OFF since 2026-08-21. It capped per (session, square, piece) ACROSS all positions, so a
    # piece that never moved yielded 4 crops for a whole game: one 18-move session went 17 114 ->
    # 388, every one of its 97 groups sitting exactly on the cap. That is not levelling, only
    # shrinking — `max_class_ratio` is the instrument for level. Set it per build if you need it.
    per_cell_cap: int = 0          # max crops per (session, square, piece); 0 = off
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
    of the numbers comes from a source, and none has been ablated except `erase_p`, which has a
    CLI override for that purpose."""

    brightness: float = 0.35      # ± fraction (lighting variance — the biggest real lever)
    contrast: float = 0.35
    gamma: tuple[float, float] = (0.6, 1.8)
    blur_sigma_max: float = 1.5   # Gaussian blur / sharpness (real camera variance)
    jitter_translate: float = 0.03  # ± fraction of crop size (small homography drift)
    jitter_scale: float = 0.03
    color_jitter: float = 0.1
    # Waagerechte Spiegelung. Der Kommentar in `build_transform` verbot Flips wegen "square
    # color/geometry" — das gilt fuers BRETT, nicht fuer einen Zellcrop: ein gespiegeltes Bild
    # zeigt dieselbe Figur auf derselben Feldfarbe. Es spiegelt aber den Lichtgradienten
    # (h3 bei 156, a7 bei 20), und der unterscheidet die Sessions. 0 = aus.
    hflip_p: float = 0.0
    # Senkrechte Spiegelung. Zusammen mit `hflip_p` ergibt sich die 180-Grad-Drehung als
    # Kombination beider — und DIE ist die einzige physikalisch echte: sie entsteht, wenn von
    # der anderen Tischseite gefilmt wird. Eine Spiegelung allein kann keine Kamera erzeugen,
    # sie taugt trotzdem, weil jede Figur entweder eine Spiegelebene hat oder sich drehen laesst.
    vflip_p: float = 0.0
    #: Halbe Drehung ALLEIN. `hflip_p` und `vflip_p` unabhaengig ergeben die ganze
    #: Vierergruppe; wer nur die Drehung will, nimmt diesen Regler.
    rot180_p: float = 0.0
    #: Genau EINE Achse, nie beide — schliesst die 180-Grad-Drehung aus.
    flip_xor_p: float = 0.0
    #: Helligkeit umkehren, Label unveraendert — Polaritaets-Invarianz erzwingen.
    #: Klein halten: bei 1,0 waere Weiss von Schwarz nicht mehr zu trennen.
    invert_p: float = 0.0
    #: ZUFAELLIG entfaerben. Anders als `--input-repr gray3`, das die Farbe ganz
    #: nimmt: hier bleibt sie nutzbar, nur nicht mehr verlaesslich.
    grayscale_p: float = 0.0
    noise_std: float = 0.03       # additive Gaussian noise on the [0,1] tensor (p=0.5); breaks the
                                  # "too clean" render/synthetic look and makes more robust
    # Random Erasing (Cutout): blanks a random rectangle after ToTensor (p=erase_p). Forces the
    # model off background shortcuts — if the board around the piece is erased it MUST read the
    # figure, and vice versa. Directly targets the "looks beside the piece" failure (esp. pawns).
    erase_p: float = 0.25             # probability of erasing per sample (0 = off)
    erase_scale: tuple[float, float] = (0.02, 0.15)   # erased area fraction range
    neighbour_pool_size: int = 512     # donor crops sampled once for the neighbour-bleed pool
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

# What every shipped model is: all 10 runs under `data/models/` are this backbone with
# batchnorm. `smallcnn` was the default until 2026-08-21 although NOTHING was ever trained with
# it — and it hard-crashes this ROCm-Windows machine (a 1-epoch smoke test on 5k crops took the
# whole PC down). The cheapest path must not be the one that reboots the box.
DEFAULT_BACKBONE: str = "mobilenetv4_conv_small_035"
DEFAULT_EPOCHS: int = 30      # also the cosine schedule's T_max — see training/train.py
DEFAULT_BATCH_SIZE: int = 256
# 8 keeps the GPU fed from memmaps and the user's sweep runs through on it. But six
# `Resource-Exhaustion` events in August name three or more `python.exe` at 4-7 GB each on a
# 31.8 GB box, and the 2026-08-18 crash followed one by two minutes — so this is the FIRST knob
# to lower if the machine goes down during a run, not the backbone and not the GPU.
DEFAULT_NUM_WORKERS: int = 8
# INHERITED, NOT MEASURED. No sweep and no learning-rate range test has ever been run on this
# project (the range test is docs/references.md#smith-2015, and costs a few epochs). It is also
# the rate at which every BatchNorm-vs-GroupNorm comparison on record ran, while the claim about
# BatchNorm is that tolerating a LARGER rate is its main benefit (docs/references.md#bjorck-2018),
# so this constant is a confound in the normalization result as well as an unknown of its own.
# Listed in docs/references.md §11 with the other decisions that rest on nothing published.
DEFAULT_LR: float = 3e-4

def cap_blas_threads() -> None:
    """One BLAS thread per process — the arenas, not torch, are what reserves the commit.

    Measured 2026-08-23: `import torch` reserves 3.48 GB of commit at 14 threads against 0.28 GB
    at one, while the working set stays 0.38 GB either way. Spawned loader workers inherit this
    env, which is the only place it multiplies (16 workers = 56 GB before the first batch).
    """
    os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")


def loader_kwargs(num_workers: int | None = None, *, pin_memory: bool = True,
                  prefetch_factor: int = 4, persistent: bool = True) -> dict:
    """The DataLoader policy every training path shares; `batch_size` and `shuffle` stay local.

    `pin_memory=False` is the gate trainer's: two pinned loaders together blew the HIP host heap.
    `persistent=False` for a loader that runs ONCE: kept workers hold ~1.2 GB each for a
    pass that never comes again.
    """
    workers = DEFAULT_NUM_WORKERS if num_workers is None else num_workers
    kw: dict = {"num_workers": workers, "pin_memory": pin_memory}
    if workers > 0:
        cap_blas_threads()
        kw.update(persistent_workers=persistent, prefetch_factor=prefetch_factor)
    return kw


DEFAULT_PATIENCE: int = 7

# --- Physical piece inventory (coverage strategy) -------------------------------------
# How many pieces of each type are physically available PER COLOR. A standard chess set
# has per side 8 pawns, 2 knights/bishops/rooks each, 1 queen, 1 king. The coverage
# generator (collect play --strategy coverage) places ONLY that many pieces per setup.
# With two sets (`--sets 2`) the rare classes per layout double -> queens/
# kings (the biggest bottlenecks) fill up twice as fast. Legality does not matter: the FEN
# serves only as a label source (per-square classifier), not as a playable position.
DEFAULT_INVENTORY: dict[str, int] = {"P": 8, "N": 2, "B": 2, "R": 2, "Q": 1, "K": 1}


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
    def occluders(self) -> Path:
        """RGBA occluder tiles, cut from `footage/occluders` by `chesslab occluders extract`.

        Called `plates/` until 2026-08-21 — a compositing word for a cut-out element, which said
        nothing about what is on them. They are hands.
        """
        return self.root / "occluders"

    @property
    def datasets(self) -> Path:
        """Curated, named datasets (each a session selection + dedup/split)."""
        return self.root / "datasets"

    @property
    def packs(self) -> Path:
        """One memmap per session (`packs/<pack>/`), shared by every dataset that cites it."""
        return self.root / "packs"

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


def ensure_dirs(paths: Paths = DATA) -> list[Path]:
    """Create all runtime data directories if missing; return the list."""
    created: list[Path] = []
    for p in paths.all():
        p.mkdir(parents=True, exist_ok=True)
        created.append(p)
    return created
