"""Several folds over ONE packed corpus: the split is chosen per run, and the guard follows it."""

import json

from chesslab import config
from chesslab.occluded_model import check_not_circular, trained_on


def _run(tmp_path, monkeypatch, *, split_name, splits):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    ds = tmp_path / "data" / "datasets" / "xval-80"
    ds.mkdir(parents=True)
    (ds / split_name).write_text(json.dumps({"splits": splits}), encoding="utf-8")
    (ds / "split.json").write_text(
        json.dumps({"splits": {"train": ["rg-a", "rg-b", "rg-c"]}}), encoding="utf-8")
    run = tmp_path / "data" / "models" / "fold0"
    run.mkdir(parents=True)
    (run / "config.json").write_text(
        json.dumps({"dataset": "xval-80", "split": split_name}), encoding="utf-8")
    return run


def test_the_guard_reads_the_split_the_run_actually_used(tmp_path, monkeypatch):
    """Without this the fold model would be checked against the corpus-wide `split.json`, which
    names every session — the guard would refuse the very sessions the fold exists to score."""
    run = _run(tmp_path, monkeypatch, split_name="split-f0.json",
               splits={"train": ["rg-b", "rg-c"], "val": ["rg-c"]})

    assert trained_on(run) == {"rg-b", "rg-c"}
    check_not_circular(run, "rg-a")             # held out by this fold: allowed


def test_a_session_the_fold_trained_on_is_still_refused(tmp_path, monkeypatch):
    run = _run(tmp_path, monkeypatch, split_name="split-f0.json",
               splits={"train": ["rg-b", "rg-c"]})

    try:
        check_not_circular(run, "rg-b")
    except ValueError as e:
        assert "rg-b" in str(e)
    else:
        raise AssertionError("a trained-on session must be refused")


def test_a_run_without_a_split_name_keeps_the_default(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    ds = tmp_path / "data" / "datasets" / "plain-80"
    ds.mkdir(parents=True)
    (ds / "split.json").write_text(json.dumps({"splits": {"train": ["rg-x"]}}), encoding="utf-8")
    run = tmp_path / "data" / "models" / "plain"
    run.mkdir(parents=True)
    (run / "config.json").write_text(json.dumps({"dataset": "plain-80"}), encoding="utf-8")

    assert trained_on(run) == {"rg-x"}
