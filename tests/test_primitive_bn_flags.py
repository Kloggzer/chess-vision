"""`PrimitiveBatchNorm2d` verspricht Austauschbarkeit mit `nn.BatchNorm2d` — auch bei den Flags.

`_primitive_bn_replacement` reicht `affine` und `track_running_stats` treu weiter, die Arithmetik
las die Parameter aber unbedingt. Ein Backbone mit nicht-affiner BatchNorm wandelt sauber um und
stirbt beim ersten Vorwaertslauf.
"""
from __future__ import annotations

import pytest

torch = pytest.importorskip("torch")

from chesslab.training.model import PrimitiveBatchNorm2d  # noqa: E402


def _x():
    torch.manual_seed(0)
    return torch.randn(4, 3, 5, 5)


@pytest.mark.parametrize("kwargs", [
    pytest.param({"affine": False}, id="affine=False"),
    pytest.param({"track_running_stats": False}, id="no-running-stats"),
    pytest.param({"affine": False, "track_running_stats": False}, id="beides"),
])
def test_it_matches_stock_batchnorm_under_non_default_flags(kwargs):
    x = _x()
    mine, stock = PrimitiveBatchNorm2d(3, **kwargs), torch.nn.BatchNorm2d(3, **kwargs)

    assert torch.allclose(mine(x), stock(x), atol=1e-5)


def test_momentum_none_is_the_cumulative_average_stock_uses():
    # `momentum=None` heisst bei `nn.BatchNorm2d` NICHT 0,1, sondern 1/num_batches_tracked —
    # genau wofuer der Zaehler da ist.
    mine, stock = PrimitiveBatchNorm2d(3, momentum=None), torch.nn.BatchNorm2d(3, momentum=None)
    for _ in range(3):
        x = torch.randn(4, 3, 5, 5)
        mine(x)
        stock(x)

    assert torch.allclose(mine.running_mean, stock.running_mean, atol=1e-5)
    assert torch.allclose(mine.running_var, stock.running_var, atol=1e-4)
