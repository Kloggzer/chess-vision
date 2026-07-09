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


def randomize_border_bg(img: Image.Image, keep_w: float, keep_h: float) -> Image.Image:
    """Replace the border ring (the board) with a random feathered background, keep the centered box.

    Mask-free class-conditional background randomization (caller applies it only to occupied crops).
    The centered box (keep_w x keep_h of the crop) preserves the piece; everything outside is blended
    toward a random color + mild gradient, with a soft (blurred) edge so the model can't latch onto a
    hard rectangle. Forces the type head off the board and onto the figure.
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
    base = np.array([random.uniform(0, 255) for _ in range(3)], np.float32)
    grad = np.linspace(random.uniform(-30, 30), random.uniform(-30, 30), h)[:, None, None]
    bg = np.clip(base[None, None, :] + grad, 0, 255)
    out = arr * m + bg * (1.0 - m)
    return Image.fromarray(out.astype(np.uint8))


class SquareDataset(Dataset):
    def __init__(self, rows, classes, transform, bg_randomize: bool = False,
                 policy=config.AUGMENT) -> None:
        self.rows = rows
        self.transform = transform
        self.c2i = class_to_idx(classes)
        # Class-conditional background randomization (train only). See config.AugmentPolicy.bg_*.
        self.bg_randomize = bg_randomize and getattr(policy, "bg_p", 0.0) > 0
        self.policy = policy

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, i):
        r = self.rows[i]
        img = Image.open(r["path"]).convert("RGB")
        if self.bg_randomize and r["label"] != "empty" and random.random() < self.policy.bg_p:
            img = randomize_border_bg(img, self.policy.bg_keep_w, self.policy.bg_keep_h)
        x = self.transform(img)
        y = self.c2i[r["label"]]
        return x, y


def class_weights_tensor(split: dict, classes: list[str]) -> torch.Tensor:
    cw = split.get("class_weights", {})
    return torch.tensor([float(cw.get(c, 1.0)) or 1.0 for c in classes], dtype=torch.float32)
