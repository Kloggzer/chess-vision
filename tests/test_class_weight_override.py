"""`--class-weight` muss den Occlusion-Neuberechnung UEBERLEBEN.

Bis 2026-08-27 stand das Setzen VOR dem Zweig, der `class_weights` fuer Occlusion-Laeufe aus den
sichtbaren Zeilen neu rechnet — und wurde dort komplett ueberschrieben. Bei `--head occlusion`,
also bei jedem Lauf dieses Projekts, tat das Flag damit nichts, ohne es zu sagen.
"""

from __future__ import annotations

import re
from pathlib import Path

SRC = Path("src/chesslab/training/train.py").read_text(encoding="utf-8")


def _pos(needle: str) -> int:
    i = SRC.find(needle)
    assert i >= 0, f"nicht gefunden: {needle!r}"
    return i


def test_the_override_is_applied_after_the_occlusion_recount():
    recount = _pos('split = {**split, "class_weights": compute_class_weights(vis_counts')
    override = _pos('cw.update({c: float(v) for c, v in class_weight.items()})')
    assert override > recount, (
        "Das Setzen der Klassengewichte steht wieder VOR der Occlusion-Neuberechnung — "
        "sie wuerde es ueberschreiben und das Flag waere still wirkungslos."
    )


def test_the_name_check_still_fails_early():
    """Ein Tippfehler im Klassennamen muss abbrechen, bevor 60 Epochen laufen."""
    check = _pos("--class-weight names classes not in this dataset")
    recount = _pos('split = {**split, "class_weights": compute_class_weights(vis_counts')
    assert check < recount


def test_only_the_named_classes_are_touched():
    """`cw.update` statt Neuaufbau: alles Ungenannte behaelt seinen berechneten Wert."""
    block = SRC[_pos("cw = dict(split.get"):]
    block = block[: block.find("print(")]
    assert "update" in block and not re.search(r"cw\s*=\s*\{\s*\}", block)
