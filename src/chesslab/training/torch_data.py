"""Stage 5 — torch-bound data: dataset + transforms (policy from Stage 4).

Augmentation ONLY on train (brightness/contrast/gamma, slight blur, small jitter;
**no** flip/rotation). Val/test: only resize + normalize.
"""

from __future__ import annotations

import random

import numpy as np
import torch
from PIL import Image
from torch.utils.data import Dataset

from .. import config
from .data import class_to_idx


class _RandomGamma:
    def __init__(self, lo: float, hi: float) -> None:
        self.lo, self.hi = lo, hi

    def __call__(self, img):
        import torchvision.transforms.functional as TF

        return TF.adjust_gamma(img, random.uniform(self.lo, self.hi))


class _GaussianNoise:
    """Additive Gaussian noise on the [0,1] tensor (after ToTensor, before Normalize)."""

    def __init__(self, std: float) -> None:
        self.std = std

    def __call__(self, t):
        return (t + torch.randn_like(t) * self.std).clamp_(0.0, 1.0)


class _EvalRgbTransform:
    """Regular PIL eval transform plus a zero-PIL path for exact-size packed uint8 crops."""

    def __init__(self, transform, out_size, mean, std) -> None:
        self.transform = transform
        self.out_size = tuple(out_size)
        self.mean = torch.tensor(mean, dtype=torch.float32).view(3, 1, 1)
        self.std = torch.tensor(std, dtype=torch.float32).view(3, 1, 1)

    def __call__(self, img):
        return self.transform(img)

    def from_uint8_hwc(self, arr: np.ndarray) -> torch.Tensor:
        h, w = arr.shape[:2]
        if (w, h) != self.out_size:
            return self.transform(Image.fromarray(arr))
        # `to(float32)` owns the storage, so the following arithmetic is safely in-place. This is
        # the same sequence as ToTensor + Normalize without the PIL bytes round-trip and second
        # NumPy materialization.
        x = torch.from_numpy(arr).permute(2, 0, 1).to(dtype=torch.float32).div_(255)
        return x.sub_(self.mean).div_(self.std)


class _RandomRot90:
    """Random k*90° rotation (k in 0..3). Square-color/geometry stay valid for 90°-multiples —
    this replaces the former build-time materialization of rotated crop copies (4x disk/memmap):
    same augmentation, applied on-the-fly, with fresh k per epoch instead of all four fixed."""

    _TRANSPOSES = (None, Image.ROTATE_90, Image.ROTATE_180, Image.ROTATE_270)

    def __call__(self, img):
        t = self._TRANSPOSES[random.randrange(4)]
        return img if t is None else img.transpose(t)


def build_transform(out_size, train: bool, policy=config.AUGMENT,
                    mean=config.NORMALIZE_MEAN, std=config.NORMALIZE_STD,
                    rot90: bool = False, per_crop: bool = False,
                    input_repr: str = "rgb"):
    from torchvision import transforms as T

    out_w, out_h = out_size
    ops = [T.Resize((out_h, out_w))]
    if train and rot90:
        ops += [_RandomRot90()]
    if train:
        ops += [
            T.ColorJitter(brightness=policy.brightness, contrast=policy.contrast, saturation=policy.color_jitter),
            _RandomGamma(*policy.gamma),
            T.RandomApply([T.GaussianBlur(3, sigma=(0.1, policy.blur_sigma_max))], p=0.3),
            # degrees=0 -> NO rotation; no flip -> square color/geometry remain valid.
            T.RandomAffine(degrees=0,
                           translate=(policy.jitter_translate, policy.jitter_translate),
                           scale=(1.0 - policy.jitter_scale, 1.0 + policy.jitter_scale)),
        ]
    ops += [T.ToTensor()]
    if train and getattr(policy, "noise_std", 0.0) > 0:
        ops += [T.RandomApply([_GaussianNoise(policy.noise_std)], p=0.5)]
    if train and getattr(policy, "erase_p", 0.0) > 0:
        # Cutout on the [0,1] tensor (before Normalize) so erased pixels = 0, a neutral value.
        # Cutout / Random Erasing: docs/references.md#devries-2017, #zhong-2017.
        ops += [T.RandomErasing(p=policy.erase_p, scale=policy.erase_scale, value=0)]
    # Per-crop standardisation instead of a fixed mean/std, when the run asks for it.
    #
    # It is the ONE thing GroupNorm was doing that a foldable BatchNorm cannot: normalising each
    # crop by its own statistics is a contrast stretch, and the crops that need it are the ones
    # this dataset is worst at. Measured on a clip: a black piece on a DARK square stands 6.0 grey
    # levels off its background against 40.2 on a light square — 6.6x less signal. After per-crop
    # standardisation that gap is 1.5x. Doing it here rather than inside the network costs one
    # cheap op per crop instead of 484 graph nodes.
    if input_repr != "rgb":
        ops += [InputRepresentation(input_repr)]
    else:
        # ToTensor created a private tensor immediately above; no caller can observe its
        # pre-normalized contents. In-place normalization therefore removes one full crop clone
        # and its memory traffic from every train/validation sample without changing values.
        ops += [_PerCropStandardize()] if per_crop else [T.Normalize(mean, std, inplace=True)]
    transform = T.Compose(ops)
    if not train and not per_crop and input_repr == "rgb":
        return _EvalRgbTransform(transform, (out_w, out_h), mean, std)
    return transform


# --- input representation ----------------------------------------------------------------------

# How many channels each representation feeds the first convolution. The NAME is recorded in the
# run's own config.json (`input_repr`), so serving reads what training did instead of guessing.
INPUT_REPRS: dict[str, int] = {"rgb": 3, "gray+sobel": 2, "rgb+sobel": 4, "sobel": 1}

def eval_transform_for(cfg: dict, out_size=None):
    """The val/test/serving transform a run's `config.json` describes: resize plus EXACTLY the
    normalisation the run trained with. The one place consumers should get it from — eval,
    calibration and serving each reconstructing it by hand is how they drift."""
    norm = cfg.get("normalize", {})
    return build_transform(tuple(out_size or cfg["out_size"]), train=False,
                           mean=tuple(norm.get("mean", config.NORMALIZE_MEAN)),
                           std=tuple(norm.get("std", config.NORMALIZE_STD)),
                           per_crop=norm.get("mode") == "per_crop",
                           input_repr=input_repr_of(cfg)[0])


def normalize_batch(cfg: dict, batch: torch.Tensor) -> torch.Tensor:
    """Apply a run's normalisation to an already-resized `[N,3,H,W]` RGB batch in `[0,1]`.

    The live serving path builds its batch with plain tensor ops rather than the PIL transform, so
    it needs the same arithmetic reachable without `torchvision`. Returns `[N,C,H,W]`, where C is
    the run's channel count.
    """
    norm = cfg.get("normalize", {})
    kind = input_repr_of(cfg)[0]
    if kind != "rgb":
        return InputRepresentation(kind)(batch)
    if norm.get("mode") == "per_crop":
        # Per CROP, not per batch: `_PerCropStandardize` sees one image at a time.
        flat = batch.flatten(1)
        mean = flat.mean(dim=1).view(-1, 1, 1, 1)
        std = flat.std(dim=1).view(-1, 1, 1, 1)
        return (batch - mean) / (std + 1e-5)
    kw = {"dtype": batch.dtype, "device": batch.device}
    mean = torch.tensor(tuple(norm.get("mean", config.NORMALIZE_MEAN)), **kw).view(1, 3, 1, 1)
    std = torch.tensor(tuple(norm.get("std", config.NORMALIZE_STD)), **kw).view(1, 3, 1, 1)
    return (batch - mean) / std


def input_repr_of(cfg: dict) -> tuple[str, int]:
    """`(name, channels)` a run was trained with, from its `config.json`. Runs predating the flag
    carry no key and were RGB."""
    kind = cfg.get("input_repr", "rgb")
    if kind not in INPUT_REPRS:
        raise ValueError(f"run was trained with unknown input_repr {kind!r}")
    return kind, INPUT_REPRS[kind]


def infer_size_of(cfg: dict) -> tuple[int, int]:
    """`(W, H)` the network is FED — a property of the model, read from its own `config.json`.

    The one place the inference size comes from (specs/22). Deliberately not the same key as
    `out_size`, which means "the size the crops on disk were built at": the two were the same
    number until phase 00 measured the deployment path, where `occ-v4-f3e20` reads 43 occupied
    squares as empty at 128 px and 19 at 96 px. What a crop actually carries is
    `board_size / 8 * (1 + 2 * pad_side)` px — 110 on the fixed rig, 240 on the phone — so the
    right input size is per model and per deployment, and lives with the model.

    Runs exported before specs/22 carry no key and were served at their crop size, so the fallback
    to `out_size` keeps every shipped model working unchanged.

    Reading a config is not the place to REJECT one: whether this is a size the run was actually
    trained at is validated once by the writer, `training.evaluate.run_export`.
    """
    raw = cfg.get("infer_size") or cfg["out_size"]
    return int(raw[0]), int(raw[1])


# ITU-R BT.601 luma, i.e. exactly the coefficients `cv2.COLOR_BGR2GRAY` uses.
_LUMA = (0.299, 0.587, 0.114)

# ImageNet's mean/std projected through _LUMA — the usual single-channel ImageNet constants.
_GRAY_MEAN, _GRAY_STD = 0.449, 0.226

# |Gx|+|Gy| statistics of the [0,1] luminance image, measured with THIS transform over 4000
# random occ-real crops at 128x128 (the same pass measured gray at 0.482/0.294, i.e. the ImageNet
# constants above are within 15% and are kept because they are standard). Only a scale — the point
# of the channel is the rectification, not its units.
_SOBEL_MEAN, _SOBEL_STD = 0.3704, 0.5259


class InputRepresentation(torch.nn.Module):
    """Turn the [0,1] RGB crop into the channel stack the run was trained on.

    The motivating measurement is a linear probe (logistic regression on 16x16 features, real
    crops, leave-one-session-out over the four largest sessions), mean accuracy all/dark:

        rgb 0.872/0.837   gray 0.843/0.814   sharpen 0.843/0.807   |Gx|+|Gy| 0.994/0.992

    The mechanism is RECTIFICATION, not high-frequency emphasis. A dark piece on a light square
    makes a negative luminance gradient and a light piece on a dark square a positive one; the
    magnitude makes the two identical, so "do piece and square differ in brightness" stops
    mattering and only "is there a silhouette" remains. That is why `sharpen`, which keeps the
    sign, does not help. A silhouette is shape rather than texture, which is the published reason
    to expect this to help at all (docs/references.md#geirhos-2018). Dark squares are where this project has always been worst — a black piece
    there stands 6.0 grey levels off its background against 40.2 on a light one.

    The gray channel is kept alongside it on purpose: unlike per-crop standardisation (which won
    the dark squares and lost 1641 empty squares to phantom pieces) this ADDS the rectified view
    without discarding absolute scale.

    **And it lost.** Trained through the baseline's own recipe (synth pretrain -> real fine-tune,
    GroupNorm, occupancy head) and scored on the 18-clip harness against `occ-act-f3`:

        rgb (ships)   per-square 0.9998   whole-board 0.9978     17 misses   16/18 clips
        rgb+sobel     per-square 0.9778   whole-board 0.0308   1937 misses   12/18 clips
        gray+sobel    per-square 0.9572   whole-board 0.0307   3680 misses   11/18 clips

    `rgb+sobel` is a strict SUPERSET of what the baseline sees — the same three normalised RGB
    planes plus one more — so it cannot have lost information, and it still fell two orders of
    magnitude on whole-board accuracy. Nor did it degrade evenly: one square carried 1143 of its
    1937 misses and 45 of 64 squares were never wrong once, i.e. the model acquired a handful of
    pieces it reads as empty on every single frame. Whatever the linear probe measured, giving a
    trained network the rectified channel did not transfer.
    """

    def __init__(self, kind: str) -> None:
        super().__init__()
        if kind not in INPUT_REPRS:
            raise ValueError(f"unknown input representation {kind!r} (one of {sorted(INPUT_REPRS)})")
        self.kind = kind

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        parts = []
        if self.kind.startswith("rgb"):
            kw = {"dtype": x.dtype, "device": x.device}
            parts.append((x - torch.tensor(config.NORMALIZE_MEAN, **kw).view(3, 1, 1))
                         / torch.tensor(config.NORMALIZE_STD, **kw).view(3, 1, 1))
        gray = luminance(x)
        if self.kind.startswith("gray"):
            parts.append((gray - _GRAY_MEAN) / _GRAY_STD)
        if self.kind.endswith("sobel"):
            parts.append((sobel_magnitude(gray) - _SOBEL_MEAN) / _SOBEL_STD)
        return torch.cat(parts, dim=-3)


def luminance(x: torch.Tensor) -> torch.Tensor:
    """BT.601 luma of a `[..., 3, H, W]` RGB tensor -> `[..., 1, H, W]`, same dtype."""
    w = torch.tensor(_LUMA, dtype=x.dtype, device=x.device).view(3, 1, 1)
    return (x * w).sum(dim=-3, keepdim=True)


def sobel_magnitude(gray: torch.Tensor) -> torch.Tensor:
    """`|Gx| + |Gy|` of a `[..., 1, H, W]` luminance image, same shape.

    Equivalent to, and pinned by `tests/test_input_repr.py` against:

        cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3, borderType=cv2.BORDER_REFLECT_101)

    **ksize=3** because the silhouette IS the signal — a 5x5 or 7x7 derivative smooths the piece
    edge over several squares' worth of blur and the probe's separation comes from that edge being
    sharp. **BORDER_REFLECT_101** because it is `cv2.Sobel`'s default AND `torch.nn.functional.pad`'s
    `"reflect"`, so the Python transform and the Kotlin port agree on the frame of the crop instead
    of each inventing an edge. **float32 on the [0,1] image**, not uint8: OpenCV's uint8 rounding is
    the one step the hand-written Kotlin port could not reproduce bit-for-bit.
    """
    k = torch.tensor([[[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]],
                      [[-1.0, -2.0, -1.0], [0.0, 0.0, 0.0], [1.0, 2.0, 1.0]]],
                     dtype=gray.dtype, device=gray.device).unsqueeze(1)
    flat = gray.reshape(-1, 1, *gray.shape[-2:])
    padded = torch.nn.functional.pad(flat, (1, 1, 1, 1), mode="reflect")
    g = torch.nn.functional.conv2d(padded, k)          # conv2d correlates, exactly as cv2 filters
    return g.abs().sum(dim=1, keepdim=True).reshape(gray.shape)


class _PerCropStandardize(torch.nn.Module):
    """`(x - x.mean()) / x.std()` over the WHOLE crop, channels together.

    Channels together on purpose: standardising each channel separately would flatten the colour
    relations that separate a black piece from a white one, and the point is to stretch contrast,
    not to discard chroma.
    """

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return (x - x.mean()) / (x.std() + 1e-5)


# Labels whose crop is mostly board/hand (no piece) — background randomization would corrupt them.
_NOT_A_PIECE = {"empty", "occluded"}

# Edge weights for the neighbour-bleed paste. Top-heavy: in the warped top-down crop the
# dominant real intrusion is the neighbour piece one rank away leaning across the upper
# crop edge (3D lean away from the camera); side/bottom intrusions (pawn heads at the
# corners) exist but are smaller. Measured on the mined hard empties (2026-07-21).
_NEIGHBOUR_EDGES = ("top", "left", "right", "bottom")
_NEIGHBOUR_EDGE_W = (0.5, 0.2, 0.2, 0.1)


def paste_neighbour_strip(img: Image.Image, donor: Image.Image,
                          frac_range: tuple[float, float]) -> Image.Image:
    """Composite the donor's central band (where its piece body/head sits) into one edge of
    `img`, feathered. Caller applies this to EMPTY crops only, with an OCCUPIED donor —
    the result mimics a tall neighbour piece bleeding into the empty square's crop
    (pad_side + perspective lean), which the label `empty` must survive.

    The band comes from the donor's CENTRE (its piece), not its border (its board), and is
    laterally rolled at random so the intruding blob is not always centred. The feathered
    mask avoids a hard seam the model could key on.
    """
    from PIL import ImageFilter

    w, h = img.size
    if donor.size != img.size:
        donor = donor.resize((w, h))
    arr = np.asarray(img).astype(np.float32)
    dar = np.asarray(donor).astype(np.float32)
    edge = random.choices(_NEIGHBOUR_EDGES, weights=_NEIGHBOUR_EDGE_W, k=1)[0]
    frac = random.uniform(*frac_range)

    comp = arr.copy()
    m = np.zeros((h, w), np.float32)
    if edge in ("top", "bottom"):
        d = max(2, int(frac * h))
        band = np.roll(dar, random.randint(-w // 4, w // 4), axis=1)
        band = band[(h - d) // 2 : (h - d) // 2 + d, :]
        sl = slice(0, d) if edge == "top" else slice(h - d, h)
        comp[sl, :] = band
        m[sl, :] = 1.0
    else:
        d = max(2, int(frac * w))
        band = np.roll(dar, random.randint(-h // 4, h // 4), axis=0)
        band = band[:, (w - d) // 2 : (w - d) // 2 + d]
        sl = slice(0, d) if edge == "left" else slice(w - d, w)
        comp[:, sl] = band
        m[:, sl] = 1.0

    feather = max(2, min(w, h) // 16)
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8))
                   .filter(ImageFilter.GaussianBlur(radius=feather))).astype(np.float32) / 255.0
    out = arr * (1.0 - m[..., None]) + comp * m[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def _target(y: int, row: dict) -> torch.Tensor:
    """Class and coverage in ONE tensor, so the loader contract stays `(x, y)`."""
    return torch.tensor([float(y), float(row.get("coverage", 0.0))])


class SquareDataset(Dataset):
    def __init__(self, rows, classes, transform, augment: bool = False,
                 policy=config.AUGMENT, with_coverage: bool = False) -> None:
        self.rows = rows
        self.with_coverage = with_coverage
        self.transform = transform
        self.c2i = class_to_idx(classes)
        self.policy = policy
        # Neighbour-bleed paste, train only — `augment=True` marks the augmented TRAIN dataset.
        # Donors must be OCCUPIED crops: their centred piece is what bleeds into the empty crop's
        # edge, so `empty` and `occluded` cannot donate.
        self.neighbour_paste = augment and getattr(policy, "neighbour_p", 0.0) > 0
        self.piece_pool: list[str] = []
        if self.neighbour_paste and rows:
            pieces = [r["path"] for r in rows if r["label"] not in _NOT_A_PIECE]
            n = min(getattr(policy, "neighbour_pool_size", 512), len(pieces))
            if n > 0:
                self.piece_pool = random.sample(pieces, n)
            else:
                self.neighbour_paste = False

    def __len__(self) -> int:
        return len(self.rows)

    def _open_donor(self) -> Image.Image | None:
        """A random occupied crop for the neighbour paste (a few retries on unreadable files)."""
        for _ in range(3):
            try:
                return Image.open(random.choice(self.piece_pool)).convert("RGB")
            except (OSError, ValueError):
                continue
        return None

    def __getitem__(self, i):
        r = self.rows[i]
        img = Image.open(r["path"]).convert("RGB")
        if (self.neighbour_paste and r["label"] == "empty"
              and random.random() < self.policy.neighbour_p):
            donor = self._open_donor()
            if donor is not None:
                img = paste_neighbour_strip(img, donor, self.policy.neighbour_frac)
        x = self.transform(img)
        y = self.c2i[r["label"]]
        return (x, _target(y, r)) if self.with_coverage else (x, y)


class PackedSquareDataset(Dataset):
    """Same contract as SquareDataset, but crops come from a single memmap (see training.pack)
    instead of one ``Image.open`` per item — the fix for the 1M-PNG I/O bottleneck."""

    def __init__(self, rows, classes, transform, packed, with_coverage: bool = False) -> None:
        path, shape, path2idx = packed
        self.with_coverage = with_coverage
        c2i = class_to_idx(classes)
        self.rows = rows            # kept for board-accuracy grouping in evaluate (picklable)
        self.transform = transform
        # Only small, picklable state survives to spawn workers: a per-row memmap index + label
        # index (both int arrays), plus the packed file path/shape. When training supplied its
        # already-parsed manifest, load_packed annotated the rows directly and did not build the
        # large path dictionary. Linked/general packs retain the lookup fallback.
        self.idx = np.array(
            [r["_packed_idx"] if path2idx is None else path2idx[r["path"]] for r in rows],
            dtype=np.int64,
        )
        self.labels = np.array([c2i[r["label"]] for r in rows], dtype=np.int64)
        self.cover = np.array([float(r.get("coverage", 0.0)) for r in rows], dtype=np.float32)
        self._path = path
        self._shape = shape
        self._mm = None

    def __getstate__(self):
        # Spawn DataLoader workers only need the int arrays + path/shape to serve items. The row
        # dicts (potentially millions) would otherwise be pickled into EVERY worker — gigabytes of
        # redundant RAM. `rows` stays available in the parent for board-accuracy grouping.
        state = dict(self.__dict__)
        state["rows"] = None
        state["_mm"] = None
        return state

    def _memmap(self):
        if self._mm is None:                                   # opened lazily, once per worker
            from .pack import open_packed_memmap
            self._mm = open_packed_memmap(self._path, self._shape)
        return self._mm

    def __len__(self) -> int:
        return len(self.idx)

    def __getitem__(self, i):
        arr = np.array(self._memmap()[self.idx[i]])            # copy out of the read-only memmap
        if isinstance(self.transform, _EvalRgbTransform):
            x = self.transform.from_uint8_hwc(arr)
        else:
            x = self.transform(Image.fromarray(arr))
        if not self.with_coverage:
            return x, int(self.labels[i])
        return x, torch.tensor([float(self.labels[i]), float(self.cover[i])])


def class_weights_tensor(split: dict, classes: list[str]) -> torch.Tensor:
    cw = split.get("class_weights", {})
    # NOT `or 1.0`: that would silently turn an explicit weight of 0.0 into 1.0 (falsy trap).
    return torch.tensor([float(cw.get(c, 1.0)) for c in classes], dtype=torch.float32)
