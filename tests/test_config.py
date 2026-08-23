"""Config tests — values that must not drift back."""


def test_augment_policy_values_pinned():
    """Protects against accidental revert to old augmentation values."""
    from chesslab.config import AUGMENT
    assert AUGMENT.brightness == 0.35
    assert AUGMENT.contrast == 0.35
    assert AUGMENT.gamma == (0.6, 1.8)
    assert AUGMENT.blur_sigma_max == 1.5
    assert AUGMENT.allow_flip is False
    assert AUGMENT.allow_rotate90 is False


