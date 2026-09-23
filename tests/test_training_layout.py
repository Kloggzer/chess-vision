"""Storage layout and copy scheduling must preserve every batch element and its order."""
import pytest
import torch

from chesslab.training.train_feed import _channels_last_batch, _device_batches


@pytest.mark.parametrize("boards", [1, 2, 3, 4])
def test_board_layout_preserves_cell_order(boards):
    x = torch.arange(boards * 64 * 3 * 8 * 8).view(boards, 64, 3, 8, 8).float()
    actual = _channels_last_batch(x)
    assert actual.shape == x.shape
    assert torch.equal(actual, x)
    assert actual.flatten(0, 1).is_contiguous(memory_format=torch.channels_last)
    assert torch.equal(_channels_last_batch(x.flatten(0, 1)), actual.flatten(0, 1))


@pytest.mark.parametrize("layout", [False, True])
@pytest.mark.parametrize("device", ["cpu", "cuda"])
def test_transfer_preserves_batches_and_final_short_batch(layout, device):
    if device == "cuda" and not torch.cuda.is_available():
        pytest.skip("GPU unavailable")
    batches = [(torch.full((n, 64, 3, 8, 8), float(i)), torch.arange(n * 64))
               for i, n in enumerate([4, 4, 1])]
    if device == "cuda":
        batches = [(x.pin_memory(), y.pin_memory()) for x, y in batches]
    actual = list(_device_batches(batches, torch.device(device), channels_last=layout))
    assert len(actual) == len(batches)
    for (x, y), (expected_x, expected_y) in zip(actual, batches, strict=True):
        assert torch.equal(x.cpu(), expected_x)
        assert torch.equal(y.cpu(), expected_y)
