"""The circularity guard sees through dataset variant prefixes (`occ-rg-` vs `rg-`)."""

import json

import pytest

from chesslab import config
from chesslab.occluded_model import check_not_circular


def _run_dir(tmp_path, monkeypatch, train):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    split_dir = config.DATA.datasets / "d1"
    split_dir.mkdir(parents=True)
    (split_dir / "split.json").write_text(json.dumps({"splits": {"train": train}}))
    run = tmp_path / "model"
    run.mkdir()
    (run / "config.json").write_text(json.dumps({"dataset": "d1"}))
    return run


def test_a_variant_prefix_does_not_hide_a_trained_session(tmp_path, monkeypatch):
    run = _run_dir(tmp_path, monkeypatch, ["occ-rg-2026-08-07-13-52-38"])
    with pytest.raises(ValueError, match="TRAINED on"):
        check_not_circular(run, "rg-2026-08-07-13-52-38")


def test_a_literal_entry_still_refuses(tmp_path, monkeypatch):
    run = _run_dir(tmp_path, monkeypatch, ["rg-2026-08-08-00-39-57"])
    with pytest.raises(ValueError, match="TRAINED on"):
        check_not_circular(run, "rg-2026-08-08-00-39-57")


def test_an_unrelated_session_passes(tmp_path, monkeypatch):
    run = _run_dir(tmp_path, monkeypatch, ["occ-rg-2026-08-07-13-52-38"])
    check_not_circular(run, "rg-2026-08-13-19-34-23")
