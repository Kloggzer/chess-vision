"""The run carries its own split; a vanished dataset directory must not blind the guard.

`p4a-80-clahe` — the DEFAULT bundled model — names `real13-mix-v4`, which is not on disk, but
its `config.json` holds the whole `split` it trained under. Reading the dataset directory and
nothing else made the guard unverifiable for three of the seven bundled models (2026-09-14).
"""

import json

import pytest

from chesslab import config
from chesslab.occluded_model import check_not_circular, trained_on

EMBEDDED = {"seed": 42, "splits": {"train": ["occ-rg-gone-a", "rg-gone-b"], "val": ["rg-v"]}}


def _run(tmp_path, monkeypatch, cfg):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    run = tmp_path / "data" / "models" / "p4a-80-clahe"
    run.mkdir(parents=True)
    (run / "config.json").write_text(json.dumps(cfg), encoding="utf-8")
    return run


def test_the_embedded_split_is_read_when_the_dataset_is_gone(tmp_path, monkeypatch):
    run = _run(tmp_path, monkeypatch, {"dataset": "real13-mix-v4", "split": EMBEDDED})

    assert trained_on(run) == {"occ-rg-gone-a", "rg-gone-b"}
    with pytest.raises(ValueError, match="TRAINED on"):
        check_not_circular(run, "rg-gone-a")
    check_not_circular(run, "rg-held-out")


def test_the_embedded_split_wins_over_a_rebuilt_dataset(tmp_path, monkeypatch):
    """The directory's split.json can be rebuilt after the run; the config cannot."""
    run = _run(tmp_path, monkeypatch, {"dataset": "d", "split": EMBEDDED})
    ds = tmp_path / "data" / "datasets" / "d"
    ds.mkdir(parents=True)
    (ds / "split.json").write_text(
        json.dumps({"splits": {"train": ["rg-something-else"]}}), encoding="utf-8")

    assert trained_on(run) == {"occ-rg-gone-a", "rg-gone-b"}
