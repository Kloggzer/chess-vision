"""`signature()`: zwei Modelle teilen einen Batch nur bei gleicher Vorverarbeitung."""

from __future__ import annotations

import inspect
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import bench_models as bm  # noqa: E402

BASE = {"out_size": [128, 128], "classes": ["empty", "wP"], "normalize": {"mean": [0.5]}}


def test_identical_configs_share_a_group():
    assert bm.signature(dict(BASE)) == bm.signature(dict(BASE))


@pytest.mark.parametrize("field,value", [
    ("out_size", [80, 80]),
    ("clahe_clip", 2.0),
    ("clahe_tile", 16),
    ("clahe_min_mean", 25.0),
    ("clahe_max_mean", 40.0),
    ("clahe_denoise", "on"),
    ("normalize", {"mean": [0.25]}),
    ("input_repr", "gray+sobel"),
    ("classes", ["empty", "wP", "wN"]),
])
def test_a_differing_field_splits_the_group(field, value):
    other = {**BASE, field: value}
    assert bm.signature(dict(BASE)) != bm.signature(other)


def test_signature_covers_every_field_the_transform_reads():
    """Die Gegenprobe gegen das Vergessen: was `eval_transform_for` aus der Config liest, muss
    in der Signatur stehen. Ohne diesen Test faellt ein neues Feld still durch."""
    from chesslab.training import torch_data

    src = inspect.getsource(torch_data.eval_transform_for)
    read = set(re.findall(r'cfg(?:\.get\(|\[)"([a-z_]+)"', src))
    read -= {"normalize"}                      # ueber json.dumps in der Signatur
    covered = set(re.findall(r'cfg(?:\.get\(|\[)"([a-z_]+)"', inspect.getsource(bm.signature)))
    missing = read - covered
    assert missing == set(), f"{missing} liest die Transformation, die Signatur nicht"


def test_error_count_divides_by_the_occupied_cells():
    """`piece_acc` ist auf BESETZTEN Zellen gerechnet. Wer mit `visible_n` multipliziert, zaehlt
    die leeren mit und meldete 193 Fehler statt 73."""
    src = inspect.getsource(bm.main)
    line = next(ln for ln in src.splitlines() if "wrong =" in ln)
    assert "visible_occupied_n" in line and "m[\"visible_n\"]" not in line
