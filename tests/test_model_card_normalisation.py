"""Die Modellkarte nennt dieselbe Normalisierung wie das Rezept (`--crop-norm`)."""

from __future__ import annotations

from chesslab import config
from chesslab.training.data import build_model_card

_CARD = {"classes": ["empty", "wP"], "out_size": (80, 80), "backbone": "bn",
         "metrics": {}, "torch_version": "2.13", "hip_version": None,
         "exported_formats": ["onnx"]}


def test_a_per_crop_run_says_so() -> None:
    card = build_model_card(**_CARD, normalize={"mean": [], "std": [], "mode": "per_crop"})

    assert card["normalize"]["mode"] == "per_crop"
    assert not card["normalize"]["mean"], "per-crop rechnet keinen festen Mittelwert"


def test_the_fixed_recipe_is_unchanged() -> None:
    card = build_model_card(**_CARD)

    assert card["normalize"]["mean"] == list(config.NORMALIZE_MEAN)
    assert card["normalize"]["std"] == list(config.NORMALIZE_STD)
    assert card["normalize"]["mode"] == "fixed"
