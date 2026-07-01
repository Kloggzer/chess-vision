"""Stufe 5 — torch-gebundene Daten: Dataset + Transforms (Policy aus Stufe 4).

Augmentation NUR auf train (Helligkeit/Kontrast/Gamma, leichter Blur, kleines Jitter;
**kein** Flip/Rotation). Val/Test: nur Resize + Normalize.
"""

from __future__ import annotations

import random

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
    """Additives Gauß-Rauschen auf dem [0,1]-Tensor (nach ToTensor, vor Normalize)."""

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
            # degrees=0 -> KEINE Rotation; kein Flip -> Feldfarbe/Geometrie bleiben gültig.
            T.RandomAffine(degrees=0,
                           translate=(policy.jitter_translate, policy.jitter_translate),
                           scale=(1.0 - policy.jitter_scale, 1.0 + policy.jitter_scale)),
        ]
    ops += [T.ToTensor()]
    if train and getattr(policy, "noise_std", 0.0) > 0:
        ops += [T.RandomApply([_GaussianNoise(policy.noise_std)], p=0.5)]
    ops += [T.Normalize(mean, std)]
    return T.Compose(ops)


class SquareDataset(Dataset):
    def __init__(self, rows, classes, transform) -> None:
        self.rows = rows
        self.transform = transform
        self.c2i = class_to_idx(classes)

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, i):
        r = self.rows[i]
        img = Image.open(r["path"]).convert("RGB")
        x = self.transform(img)
        y = self.c2i[r["label"]]
        return x, y


def class_weights_tensor(split: dict, classes: list[str]) -> torch.Tensor:
    cw = split.get("class_weights", {})
    return torch.tensor([float(cw.get(c, 1.0)) or 1.0 for c in classes], dtype=torch.float32)
