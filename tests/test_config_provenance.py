"""Ein Lauf muss aus seiner `config.json` reproduzierbar sein."""

from __future__ import annotations

import re
from pathlib import Path

SRC = Path("src/chesslab/training/train_recipe.py").read_text(encoding="utf-8")

#: Jeder Regler, der das Ergebnis aendert, gehoert in die config. Waechst mit jedem neuen Flag.
REQUIRED = (
    "weight_cap", "class_weight", "balance", "epoch_frac", "label_smoothing", "weight_decay",
    "aug_hflip_p", "aug_vflip_p", "aug_rot180_p", "aug_flip_xor_p", "aug_invert_p",
    "aug_grayscale_p", "aug_rot90", "aug_scale", "aug_erase_p", "aug_erase_scale",
)


def test_every_recipe_knob_is_written_to_config_json():
    missing = [k for k in REQUIRED if f'"{k}"' not in SRC]
    assert not missing, (
        f"Diese Regler aendern das Ergebnis, stehen aber nicht in config.json: {missing}. "
        "Ein Lauf, dessen Rezept man nicht ablesen kann, ist nicht vergleichbar."
    )


def test_the_cli_option_and_the_config_key_agree():
    """Ein Flag ohne config-Eintrag faellt sonst erst auf, wenn jemand zwei Laeufe vergleicht."""
    cli = "\n".join(p.read_text(encoding="utf-8") for p in Path("src/chesslab/cli").glob("*.py"))
    flags = set(re.findall(r'"--([a-z0-9-]+)"', cli))
    for flag, key in (("weight-cap", "weight_cap"), ("class-weight", "class_weight"),
                      ("erase-scale", "aug_erase_scale"), ("invert-p", "aug_invert_p")):
        assert flag in flags, f"--{flag} gibt es nicht mehr"
        assert f'"{key}"' in SRC, f"--{flag} wird nicht als {key} in config.json geschrieben"
