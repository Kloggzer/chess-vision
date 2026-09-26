"""Auswerter in `scripts/` rechnen auf der Zellmenge des Verlusts."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from conftest import load_script

ROOT = Path(__file__).resolve().parents[1]

BRIGHT = {"path": "hell", "coverage": 0.0, "brightness": 156.0}
DARK = {"path": "dunkel", "coverage": 0.0, "brightness": 10.0}
HIDDEN = {"path": "verdeckt", "coverage": 0.9, "brightness": 156.0}
NO_COLUMN = {"path": "alt", "coverage": 0.05}


class _Seen(Exception):
    pass


def _spy(bucket: list):
    def runs_of(rows):
        bucket.extend(r["path"] for r in rows)
        raise _Seen
    return runs_of


def _pack(tmp_path: Path, rows: list[dict]) -> Path:
    pack = tmp_path / "rg-x-16"
    pack.mkdir()
    base = {"square": "a5", "label": "wN", "ply": 0, "frame": "f"}
    (pack / "manifest.jsonl").write_text(
        "".join(json.dumps(base | r) + "\n" for r in rows), encoding="utf-8")
    return pack


def test_episode_eval_grades_the_cells_the_loss_learns():
    mod = load_script("episode_eval")
    assert mod.graded([BRIGHT, DARK, HIDDEN, NO_COLUMN]) == [0, 3]


def test_show_dispute_leaves_dark_cells_out_of_the_dispute():
    mod = load_script("show_dispute")
    live, unmeasured = mod.disputed([BRIGHT, DARK, {"path": "u"}], [0, 0, 0], [1, 1, 1])
    assert (live, unmeasured) == ([0], 1)


def test_crop_redundancy_thins_only_learnable_cells(tmp_path, monkeypatch):
    mod = load_script("crop_redundancy")
    seen: list = []
    monkeypatch.setattr(mod, "runs_of", _spy(seen))
    with pytest.raises(_Seen):
        mod.measure(_pack(tmp_path, [BRIGHT, DARK, HIDDEN, NO_COLUMN]), 2.0, 3, False)
    assert seen == ["hell", "alt"]


def test_hand_audit_counts_a_dark_cell_as_masked_not_as_risk(tmp_path, monkeypatch, capsys):
    mod = load_script("hand_audit")
    import chesslab.dataset_build as dataset_build

    rec, dd = tmp_path / "rec", tmp_path / "ds"
    (rec / "S").mkdir(parents=True)
    dd.mkdir()
    (rec / "S" / "matte.jsonl").write_text(
        json.dumps({"frame": "f1", "dirty_reason": "occluded", "coverage": {}}) + "\n",
        encoding="utf-8")
    (dd / "split-pin.json").write_text(json.dumps({"splits": {"train": ["rg-S"]}}), encoding="utf-8")
    cell = {"session_id": "rg-S", "frame": "f1", "label": "empty", "coverage": 0.05}
    (dd / "manifest.jsonl").write_text(
        json.dumps(cell | {"square": "a5", "brightness": 10.0}) + "\n"
        + json.dumps(cell | {"square": "h3", "brightness": 156.0}) + "\n", encoding="utf-8")
    monkeypatch.setattr(mod, "REC", rec)
    monkeypatch.setattr(dataset_build, "dataset_dir", lambda name: dd)
    monkeypatch.setattr(sys, "argv", ["x"])

    assert mod.main() == 0
    total = next(ln for ln in capsys.readouterr().out.splitlines() if ln.startswith("GESAMT"))
    train, masked, _, risk = (int(v) for v in total.split()[1:5])
    assert (train, masked, risk) == (2, 1, 1)
