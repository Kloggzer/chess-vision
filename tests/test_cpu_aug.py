"""Exact pixels and RNG state, not just distributional similarity, for CPU fast paths."""
import random
from dataclasses import replace

import numpy as np
import pytest
import torch
from PIL import Image
from torchvision import transforms as T
from torchvision.transforms import functional as F

from chesslab import config
from chesslab.training import cpu_aug
from chesslab.training.torch_data import _RandomGamma, build_transform


class LegacyGamma:
    def __init__(self, lo, hi):
        self.lo, self.hi = lo, hi

    def __call__(self, img):
        return F.adjust_gamma(img, random.uniform(self.lo, self.hi))


def reference(tf):
    ops = []
    for op in tf.transforms:
        if isinstance(op, cpu_aug.ColorJitter):
            op = T.ColorJitter(op.brightness or 0, op.contrast or 0, op.saturation or 0, op.hue or 0)
        elif isinstance(op, cpu_aug.ToTensor):
            op = T.ToTensor()
        elif isinstance(op, cpu_aug.Normalize):
            op = T.Normalize(op.mean, op.std, inplace=True)
        elif isinstance(op, _RandomGamma):
            op = LegacyGamma(op.lo, op.hi)
        elif isinstance(op, T.RandomErasing):
            op = T.RandomErasing(op.p, op.scale, op.ratio, op.value, inplace=False)
        ops.append(op)
    return T.Compose(ops)


@pytest.mark.parametrize('size', [(80, 80), (96, 64)])
@pytest.mark.parametrize('per_crop', [False, True])
def test_full_chain_matches_pixels_and_both_rng_streams(size, per_crop):
    policy = replace(config.AUGMENT, brightness=0.35, contrast=0.35, color_jitter=0.1,
                     gamma=(0.6, 1.8), noise_std=0.03, erase_p=0.25,
                     hflip_p=0.5, invert_p=0.2, grayscale_p=0.2)
    fast = build_transform(size, True, policy=policy, per_crop=per_crop)
    old = reference(fast)
    rng = np.random.default_rng(42)
    for seed in range(32):
        image = Image.fromarray(rng.integers(0, 256, (80, 80, 3), dtype=np.uint8))
        random.seed(seed)
        torch.manual_seed(seed)
        expected = old(image)
        expected_python, expected_torch = random.getstate(), torch.get_rng_state()
        random.seed(seed)
        torch.manual_seed(seed)
        actual = fast(image)
        assert torch.equal(actual, expected), seed
        assert random.getstate() == expected_python
        assert torch.equal(torch.get_rng_state(), expected_torch)


@pytest.mark.parametrize('mode', ['RGB', 'L', 'RGBA'])
def test_gamma_all_intensities_and_modes(mode):
    image = Image.fromarray(np.tile(np.arange(256, dtype=np.uint8), (16, 1))).convert(mode)
    for seed in range(64):
        random.seed(seed)
        expected = LegacyGamma(0.6, 1.8)(image)
        random.seed(seed)
        actual = _RandomGamma(0.6, 1.8)(image)
        assert actual.mode == expected.mode
        assert actual.tobytes() == expected.tobytes()


def test_normalize_fallback_and_input_ownership():
    for dtype in (torch.float32, torch.float64):
        x = torch.rand(3, 12, 12, dtype=dtype)
        original = x.clone()
        args = ([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        assert torch.equal(cpu_aug.Normalize(*args)(x), T.Normalize(*args)(x))
        assert torch.equal(x, original)

