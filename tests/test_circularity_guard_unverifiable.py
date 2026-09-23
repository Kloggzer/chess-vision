"""A circularity guard that cannot check must refuse, not wave through; it reads the split
embedded in the run's `config.json` first."""

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


def test_a_missing_dataset_refuses_instead_of_allowing_everything(tmp_path, monkeypatch):
    run = _run(tmp_path, monkeypatch, {"dataset": "real13-mix-v4"})

    with pytest.raises(ValueError, match="real13-mix-v4"):
        check_not_circular(run, "rg-2026-08-07-13-52-38")


def test_a_run_naming_no_dataset_refuses_too(tmp_path, monkeypatch):
    run = _run(tmp_path, monkeypatch, {"classes": ["empty"]})

    with pytest.raises(ValueError):
        check_not_circular(run, "rg-2026-08-07-13-52-38")


def test_trained_on_still_reads_a_split_that_is_there(tmp_path, monkeypatch):
    run = _run(tmp_path, monkeypatch, {"dataset": "present-80"})
    ds = tmp_path / "data" / "datasets" / "present-80"
    ds.mkdir(parents=True)
    (ds / "split.json").write_text(
        json.dumps({"splits": {"train": ["rg-a"]}}), encoding="utf-8")

    assert trained_on(run) == {"rg-a"}
    check_not_circular(run, "rg-b")


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
