"""Eine Op auf Staerke 0 ist nicht weg — sie zieht weiter Zufallszahlen und kostet."""

from dataclasses import replace

import numpy as np
import torch
from PIL import Image

from chesslab import config
from chesslab.training.torch_data import build_transform

FULL = config.AUGMENT


def ops(policy):
    return build_transform((80, 80), train=True, policy=policy).transforms


def names(policy) -> list[str]:
    return [type(op).__name__ for op in ops(policy)]


def has_blur(policy) -> bool:
    """`RandomApply` traegt auch das Rauschen — es genuegt nicht, nach der Huelle zu sehen."""
    return any(type(inner).__name__ == "GaussianBlur"
               for op in ops(policy) for inner in getattr(op, "transforms", []))


def test_the_full_policy_keeps_every_op():
    have = names(FULL)
    for op in ("ColorJitter", "_RandomGamma", "RandomAffine"):
        assert op in have, have
    assert has_blur(FULL)


def test_zeroed_photometry_leaves_the_chain():
    """Die drei Ops kosten 930 us je Crop, 73 % der Kette."""
    lean = replace(FULL, brightness=0.0, contrast=0.0, color_jitter=0.0,
                   blur_sigma_max=0.1, gamma=(1.0, 1.0))
    have = names(lean)
    assert "ColorJitter" not in have
    assert "_RandomGamma" not in have
    assert not has_blur(lean)
    # Der Jitter bleibt: er ist der einzige Regler, der auf real13-mix-v4 gemessen wirkt.
    assert "RandomAffine" in have


def test_one_live_knob_is_enough_to_keep_colorjitter():
    """Erst wenn ALLE drei null sind, faellt die Op — sonst wuerde ein Regler still verschwinden."""
    for field in ("brightness", "contrast", "color_jitter"):
        knobs = {"brightness": 0.0, "contrast": 0.0, "color_jitter": 0.0, field: 0.2}
        assert "ColorJitter" in names(replace(FULL, **knobs)), field


def test_a_dropped_affine_needs_both_knobs_at_zero():
    assert "RandomAffine" in names(replace(FULL, jitter_translate=0.0, jitter_scale=0.03))
    assert "RandomAffine" not in names(replace(FULL, jitter_translate=0.0, jitter_scale=0.0))


def test_dropping_a_no_op_does_not_change_what_it_produced():
    """Statistisch dasselbe Bild — nur der Zufallsstrom verschiebt sich, was ein frischer Lauf
    nicht sehen kann. Geprueft auf dem einzigen Arm, der KEINE Zufallszahl mehr zieht."""
    still = replace(FULL, brightness=0.0, contrast=0.0, color_jitter=0.0, blur_sigma_max=0.1,
                    gamma=(1.0, 1.0), jitter_translate=0.0, jitter_scale=0.0, erase_p=0.0,
                    hflip_p=0.0, vflip_p=0.0, rot180_p=0.0, flip_xor_p=0.0, invert_p=0.0,
                    grayscale_p=0.0, noise_std=0.0)
    img = Image.fromarray(np.full((80, 80, 3), 120, dtype=np.uint8))
    train = build_transform((80, 80), train=True, policy=still)
    val = build_transform((80, 80), train=False, policy=still)
    assert torch.allclose(train(img), val(img), atol=1e-6)
