"""Ein FERTIGER Datensatz hat die Zeilen schon kopiert: `train`/`eval` melden beim Start, welche
davon ein Mensch seitdem gesperrt oder umgelabelt hat — gefiltert wird nicht (Rezept).

2026-09-23 auf der Platte: 8 Zeilen in `real13-mix-v7-128`, 278 in `real13-mix-v6-128`.
"""

import json

import pytest

from chesslab import config, dataset_build
from chesslab.training import evaluate
from chesslab.training import train as tr

SID = "rg-2026-01-01-00-00-00"


def _row(sid, frame, square, label):
    return {"path": f"mm://{sid}-80/{frame}/{square}", "label": label, "session_id": sid,
            "frame": frame, "square": square, "out_size": [80, 80], "coverage": 0.0}


@pytest.fixture
def ds(tmp_path, monkeypatch):
    """A built dataset under a patched `config.DATA`: one recording in train, one in test."""
    paths = config.Paths(root=tmp_path / "data")
    monkeypatch.setattr(config, "DATA", paths)
    other = "rg-2026-01-02-00-00-00"
    for sid in (SID, other):
        (paths.recordings / sid[3:]).mkdir(parents=True)
    rows = [_row(SID, "000010", "e1", "wK"), _row(SID, "000010", "d1", "wQ"),
            _row(other, "000020", "a1", "wR"), _row("comp-x-00", "000001", "a1", "wR")]
    dd = paths.datasets / "ds"
    dd.mkdir(parents=True)
    (dd / "manifest.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    split = {"classes": ["empty", "wK", "wQ", "wR"],
             "splits": {"train": [SID, "comp-x-00"], "val": [], "test": [other]}}
    (dd / "split.json").write_text(json.dumps(split), encoding="utf-8")
    return paths, rows, split["splits"], other


def _ledger(paths, sid, name, row):
    with (paths.recordings / sid[3:] / name).open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({"session_id": sid, **row}) + "\n")


def test_a_later_lock_and_relabel_are_counted_per_split_with_examples(ds, capsys):
    paths, rows, splits, other = ds
    _ledger(paths, SID, "unusable-cells.jsonl", {"frame": "000010", "square": "e1"})
    _ledger(paths, other, "corrections.jsonl", {"frame": "000020", "square": "a1", "label": "empty"})
    found = dataset_build.check_verdicts(rows, splits, strict=False)
    assert found["rows"] == 2
    assert found["per_split"]["train"] == {"unusable": 1, "relabelled": 0,
                                           "examples": [f"{SID} 000010/e1 (unusable)"]}
    assert found["per_split"]["test"]["relabelled"] == 1
    assert found["sessions_without_ledger"] == 1
    out = capsys.readouterr().out
    assert "[verdict] train: 1 row(s) locked unusable" in out and "AS BUILT" in out


def test_agreeing_and_withdrawn_verdicts_report_nothing(ds, capsys):
    paths, rows, splits, _ = ds
    _ledger(paths, SID, "corrections.jsonl", {"frame": "000010", "square": "d1", "label": "wQ"})
    _ledger(paths, SID, "unusable-cells.jsonl", {"frame": "000010", "square": "e1"})
    _ledger(paths, SID, "unusable-cells.jsonl", {"frame": "000010", "square": "e1",
                                                 "unusable": False})
    found = dataset_build.check_verdicts(rows, splits, strict=True)
    assert found["rows"] == 0 and found["per_split"] == {}
    assert "[verdict]" not in capsys.readouterr().out


def test_strict_verdicts_stops_train_before_any_training(ds, monkeypatch, capsys):
    paths, _, _, _ = ds
    _ledger(paths, SID, "unusable-cells.jsonl", {"frame": "000010", "square": "e1"})
    monkeypatch.setattr(tr.doctor, "validate_gpu", lambda: (True, []))
    monkeypatch.setattr(tr, "_acquire_train_lock", lambda desc: True)
    monkeypatch.setattr(tr.atexit, "register", lambda *a: None)
    monkeypatch.setattr(tr, "_load_training_pack",
                        lambda *a: pytest.fail("the check must run before the pack is touched"))
    code = tr.run_train("smallcnn", 1, 8, 1e-3, no_amp=True, seed=0, out=str(paths.root / "run"),
                        patience=1, dataset="ds", split="split.json", strict_verdicts=True)
    assert code == 1
    assert "1 dataset row(s) contradict a human verdict (--strict-verdicts)" in capsys.readouterr().out


def test_eval_reports_by_default_and_strict_refuses(ds, monkeypatch, capsys):
    paths, _, _, other = ds
    _ledger(paths, other, "corrections.jsonl", {"frame": "000020", "square": "a1", "label": "empty"})
    run = paths.root / "run"
    run.mkdir()
    (run / "config.json").write_text(json.dumps({"dataset": "ds"}), encoding="utf-8")
    monkeypatch.setattr(evaluate, "_load_run",
                        lambda d: (None, {"dataset": "ds", "classes": ["empty", "wK", "wQ", "wR"]}))
    monkeypatch.setattr(evaluate, "_frozen_hit", lambda rows: {"stop-here"})
    assert evaluate.run_eval(str(run), "test", strict_verdicts=True) == 1
    assert "contradict a human verdict" in capsys.readouterr().out
    # Default: reported, then the run goes on (here into the frozen guard, which ends it cheaply).
    assert evaluate.run_eval(str(run), "test") == 1
    out = capsys.readouterr().out
    assert "[verdict] test: 0 row(s) locked unusable, 1 relabelled" in out and "eingefroren" in out
