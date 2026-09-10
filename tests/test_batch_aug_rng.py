"""The CPU eager path must retain the factor-before-permutation RNG order."""
import pytest
import torch

from chesslab import config
from chesslab.training.batch_aug import BatchPhotometric


@pytest.mark.parametrize('seed', [0, 1, 42])
def test_cpu_preserves_legacy_permutation_position(seed):
    aug = BatchPhotometric(config.AUGMENT, config.NORMALIZE_MEAN, config.NORMALIZE_STD)
    raw = torch.rand((3, 3, 8, 8), generator=torch.Generator().manual_seed(9))
    torch.manual_seed(seed)
    # None draws the permutation inside jitter, after its random factors (legacy order).
    expected = aug._device(raw, None)
    expected_rng = torch.get_rng_state()
    torch.manual_seed(seed)
    actual = aug(raw)
    assert torch.equal(actual, expected)
    assert torch.equal(torch.get_rng_state(), expected_rng)


def test_compile_batch_aug_requires_batch_aug():
    from chesslab.training.train import run_train

    with pytest.raises(ValueError, match='requires --batch-aug'):
        run_train('cellnet_p4', 1, 256, .01, False, 42, None, 1, compile_batch_aug=True)
