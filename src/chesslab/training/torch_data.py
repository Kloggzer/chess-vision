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


def build_transform(out_size, train: bool, policy=config.AUGMENT,
                    mean=config.NORMALIZE_MEAN, std=config.NORMALIZE_STD):
    from torchvision import transforms as T

    out_w, out_h = out_size
    ops = [T.Resize((out_h, out_w))]
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
        ops += [T.RandomErasing(p=policy.erase_p, scale=policy.erase_scale, value=0)]
    ops += [T.Normalize(mean, std)]
    return T.Compose(ops)


def _procedural_bg(h: int, w: int) -> np.ndarray:
    """A random board-LIKE texture (float32 HxWx3, 0..255): checker / gradient / wood bands /
    noise / solid. Board-like but carrying no piece information — so the border can't be a shortcut,
    yet (unlike a flat colour) the model can't tell it apart from a real board and ignore it."""
    kind = random.choice(("checker", "gradient", "wood", "noise", "solid"))
    if kind == "checker":
        c1 = np.array([random.uniform(30, 230) for _ in range(3)], np.float32)
        c2 = np.array([random.uniform(30, 230) for _ in range(3)], np.float32)
        cell = random.randint(max(8, w // 12), max(16, w // 3))
        off_x, off_y = random.randint(0, cell), random.randint(0, cell)
        yy, xx = np.mgrid[0:h, 0:w]
        m = (((xx + off_x) // cell + (yy + off_y) // cell) % 2).astype(np.float32)[..., None]
        bg = c1[None, None, :] * m + c2[None, None, :] * (1.0 - m)
    elif kind == "gradient":
        c1 = np.array([random.uniform(0, 255) for _ in range(3)], np.float32)
        c2 = np.array([random.uniform(0, 255) for _ in range(3)], np.float32)
        t = (np.linspace(0, 1, w)[None, :, None] if random.random() < 0.5
             else np.linspace(0, 1, h)[:, None, None])
        bg = c1[None, None, :] * (1.0 - t) + c2[None, None, :] * t
    elif kind == "wood":
        base = np.array([random.uniform(60, 200), random.uniform(40, 150), random.uniform(20, 110)], np.float32)
        freq, phase = random.uniform(0.03, 0.18), random.uniform(0, 6.28)
        bands = (np.sin(np.arange(h)[:, None] * freq + phase) * 0.5 + 0.5)[..., None]
        bg = base[None, None, :] * (0.6 + 0.4 * bands) * np.ones((1, w, 1), np.float32)
    elif kind == "noise":
        base = np.array([random.uniform(30, 220) for _ in range(3)], np.float32)
        bg = base[None, None, :] + np.random.normal(0, random.uniform(6, 45), (h, w, 3))
    else:  # solid + gentle vertical gradient (the original behaviour, kept as one option)
        base = np.array([random.uniform(0, 255) for _ in range(3)], np.float32)
        bg = base[None, None, :] + np.linspace(random.uniform(-30, 30), random.uniform(-30, 30), h)[:, None, None]
    bg = bg + np.random.normal(0, 4, bg.shape)  # mild grain on every kind
    return np.clip(bg, 0, 255).astype(np.float32)


def _pool_bg(h: int, w: int, pool: list[str]) -> np.ndarray | None:
    """Random crop of ANOTHER board image (real texture, uncorrelated with this crop's piece).
    The donor's own piece sits centred and is masked out by the keep-box, so only its board border
    shows. Returns float32 HxWx3 (0..255), or None if the donor can't be read."""
    for _ in range(3):
        try:
            donor = Image.open(random.choice(pool)).convert("RGB")
        except (OSError, ValueError):
            continue
        # slight random zoom/crop for variety, then match the target size
        dw, dh = donor.size
        z = random.uniform(0.8, 1.0)
        cw, ch = max(1, int(dw * z)), max(1, int(dh * z))
        x0, y0 = random.randint(0, dw - cw), random.randint(0, dh - ch)
        donor = donor.crop((x0, y0, x0 + cw, y0 + ch)).resize((w, h))
        return np.asarray(donor).astype(np.float32)
    return None


def randomize_border_bg(img: Image.Image, keep_w: float, keep_h: float,
                        pool: list[str] | None = None, procedural_frac: float = 0.5) -> Image.Image:
    """Replace the border ring (the board) with a random TEXTURED background, keep the centered box.

    Mask-free class-conditional background randomization (caller applies it only to occupied crops).
    The centered box (keep_w x keep_h of the crop) preserves the piece; everything outside is blended
    toward a background drawn from a MIX of procedural textures and crops of OTHER board images, with a
    soft (blurred) edge so the model can't latch onto a hard rectangle. A textured, realistic-but-
    uninformative border is far harder to shortcut than a flat colour — it forces the type head onto
    the figure. Falls back to procedural when the donor pool is empty/unreadable.
    """
    from PIL import ImageFilter

    w, h = img.size
    arr = np.asarray(img).astype(np.float32)
    kw, kh = int(w * keep_w), int(h * keep_h)
    x0, y0 = (w - kw) // 2, (h - kh) // 2
    m = np.zeros((h, w), np.float32)
    m[y0:y0 + kh, x0:x0 + kw] = 1.0
    feather = max(2, w // 12)
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8))
                   .filter(ImageFilter.GaussianBlur(radius=feather))).astype(np.float32) / 255.0
    m = m[..., None]
    bg = None
    if pool and random.random() >= procedural_frac:
        bg = _pool_bg(h, w, pool)
    if bg is None:
        bg = _procedural_bg(h, w)
    out = arr * m + bg * (1.0 - m)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


# Labels whose crop is mostly board/hand (no piece) — background randomization would corrupt them.
_BG_SKIP_LABELS = {"empty", "occluded"}


class SquareDataset(Dataset):
    def __init__(self, rows, classes, transform, bg_randomize: bool = False,
                 policy=config.AUGMENT) -> None:
        self.rows = rows
        self.transform = transform
        self.c2i = class_to_idx(classes)
        # Class-conditional background randomization (train only). See config.AugmentPolicy.bg_*.
        self.bg_randomize = bg_randomize and getattr(policy, "bg_p", 0.0) > 0
        self.policy = policy
        # Donor pool for the "other-board" background source: a random sample of crop paths whose
        # borders (real board texture) get pasted around OTHER crops' pieces (uncorrelated).
        self.bg_pool: list[str] = []
        if self.bg_randomize and rows:
            n = min(getattr(policy, "bg_pool_size", 0), len(rows))
            if n > 0:
                self.bg_pool = [r["path"] for r in random.sample(rows, n)]

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, i):
        r = self.rows[i]
        img = Image.open(r["path"]).convert("RGB")
        if self.bg_randomize and r["label"] not in _BG_SKIP_LABELS and random.random() < self.policy.bg_p:
            img = randomize_border_bg(img, self.policy.bg_keep_w, self.policy.bg_keep_h,
                                      pool=self.bg_pool, procedural_frac=self.policy.bg_procedural_frac)
        x = self.transform(img)
        y = self.c2i[r["label"]]
        return x, y


class PackedSquareDataset(Dataset):
    """Same contract as SquareDataset, but crops come from a single memmap (see training.pack)
    instead of one ``Image.open`` per item — the fix for the 1M-PNG I/O bottleneck. Background
    randomization is intentionally not applied here (packed is used for the big synth pretrain,
    which runs bg_p=0); the small real finetune keeps the per-PNG SquareDataset + bg augment."""

    def __init__(self, rows, classes, transform, packed) -> None:
        path, shape, path2idx = packed
        c2i = class_to_idx(classes)
        self.rows = rows            # kept for board-accuracy grouping in evaluate (picklable)
        self.transform = transform
        # Only small, picklable state survives to spawn workers: a per-row memmap index + label
        # index (both int arrays), plus the packed file path/shape. The 1M-entry path2idx dict and
        # the memmap itself are NOT stored (they don't pickle to Windows workers). Built once here.
        self.idx = np.array([path2idx[r["path"]] for r in rows], dtype=np.int64)
        self.labels = np.array([c2i[r["label"]] for r in rows], dtype=np.int64)
        self._path = path
        self._shape = shape
        self._mm = None

    def _memmap(self):
        if self._mm is None:                                   # opened lazily, once per worker
            from .pack import open_packed_memmap
            self._mm = open_packed_memmap(self._path, self._shape)
        return self._mm

    def __len__(self) -> int:
        return len(self.idx)

    def __getitem__(self, i):
        arr = np.array(self._memmap()[self.idx[i]])            # copy out of the read-only memmap
        x = self.transform(Image.fromarray(arr))
        return x, int(self.labels[i])


def class_weights_tensor(split: dict, classes: list[str]) -> torch.Tensor:
    cw = split.get("class_weights", {})
    return torch.tensor([float(cw.get(c, 1.0)) or 1.0 for c in classes], dtype=torch.float32)
