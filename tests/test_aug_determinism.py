"""Die neuen Augmentierungen muessen aus dem Seed reproduzierbar sein.

Sie ziehen aus ZWEI Quellen: die eigenen Klassen aus Pythons `random`, die von torchvision aus
torchs RNG. Beide werden von PyTorch je Dataloader-Worker geseedet — aber nur, solange niemand
eine Transformation mit eigener Entropie dazwischenschiebt. Der Test haelt das fest, weil ohne
Determinismus jeder gepaarte Vergleich seinen Hebel verliert (`docs/measurement-floor.md`:
gepaart faellt die Streuung von 0,027 auf 0,003).
"""

from __future__ import annotations

import hashlib
import random
from dataclasses import replace

import numpy as np
import torch
from PIL import Image

from chesslab import config
from chesslab.training.torch_data import build_transform

POLICY = replace(config.AUGMENT, hflip_p=0.5, vflip_p=0.3, rot180_p=0.2,
                 flip_xor_p=0.3, invert_p=0.1, grayscale_p=0.25)


def _hash(seed: int, policy) -> str:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    rng = np.random.default_rng(0)          # die BILDER sind fest, nur die Augmentierung wuerfelt
    imgs = [Image.fromarray(rng.integers(0, 255, (80, 80, 3), dtype=np.uint8)) for _ in range(16)]
    tf = build_transform((80, 80), train=True, policy=policy)
    h = hashlib.sha256()
    for im in imgs:
        h.update(np.ascontiguousarray(tf(im).numpy()).tobytes())
    return h.hexdigest()


def test_the_same_seed_gives_the_same_augmented_pixels():
    assert _hash(42, POLICY) == _hash(42, POLICY)


def test_a_different_seed_gives_different_pixels():
    """Sonst wuerde der Test oben auch bestehen, wenn gar nichts augmentiert wird."""
    assert _hash(42, POLICY) != _hash(43, POLICY)


def test_every_new_knob_actually_changes_the_output():
    """Ein Regler, der nichts tut, wuerde als 'kein Effekt' gemessen und faelschlich verworfen."""
    off = replace(config.AUGMENT, hflip_p=0.0, vflip_p=0.0, rot180_p=0.0,
                  flip_xor_p=0.0, invert_p=0.0, grayscale_p=0.0)
    base = _hash(42, off)
    for knob in ("hflip_p", "vflip_p", "rot180_p", "flip_xor_p", "invert_p", "grayscale_p"):
        assert _hash(42, replace(off, **{knob: 1.0})) != base, knob
