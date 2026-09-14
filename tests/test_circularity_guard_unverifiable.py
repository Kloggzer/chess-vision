"""A guard that cannot check must refuse, not wave through.

`real13-mix-v4` — the dataset THREE bundled models name, `p4a-80-clahe` (the DEFAULT) among
them — is not on disk. `trained_on` returned an empty set for it, so `check_not_circular`
found no hits and allowed every session, including the ones the model was trained on.
"""

import json

import pytest

from chesslab import config
from chesslab.occluded_model import check_not_circular, trained_on


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
