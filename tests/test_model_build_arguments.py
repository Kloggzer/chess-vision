"""Was `build_model` entgegennimmt und was davon ankommt.

Zwei Stellen, an denen ein Argument durchgereicht und nie wirksam wird: `--norm` auf dem
`cellnet_*`-Zweig, und die Umskalierung des MobileNet-Stems fuer nicht-RGB-Eingaben.
"""
from __future__ import annotations

import pytest


def test_a_norm_the_backbone_cannot_honour_is_refused():
    """`cellnet` und die BoardNet-Truenke bauen immer BatchNorm.

    Still durchzuwinken schrieb `"norm": "groupnorm"` in die `config.json` eines Modells, in dem
    keine einzige Schicht eine ist — und das Projekt faehrt ohnehin BatchNorm (Model Guidelines).
    """
    pytest.importorskip("torch")
    from chesslab.training.model import build_model

    with pytest.raises(ValueError, match="BatchNorm"):
        build_model("cellnet_p4", num_classes=2, norm="groupnorm")
    with pytest.raises(ValueError, match="BatchNorm"):
        build_model("boardattn:cellnet_p4", num_classes=2, norm="groupnorm")

    build_model("cellnet_p4", num_classes=2, norm="batchnorm")


def test_the_retuned_stem_answers_a_grey_image_exactly_as_before():
    """`_retune_stem`'s own promise: 'the stem's response to a grey image is then unchanged'."""
    torch = pytest.importorskip("torch")
    from torchvision import models

    from chesslab.training.model import _retune_stem

    m = models.mobilenet_v3_small(weights=None)
    grey = torch.full((1, 3, 8, 8), 0.5)
    with torch.no_grad():
        before = m.features[0][0](grey)

    _retune_stem(m, 1)
    with torch.no_grad():
        after = m.features[0][0](torch.full((1, 1, 8, 8), 0.5))

    assert torch.allclose(before, after, atol=1e-5), (
        "the one-channel stem answers a grey image "
        f"{(after.abs().mean() / before.abs().mean()).item():.2f}x the pretrained response — "
        "every activation entering the first BatchNorm is off by that factor")
