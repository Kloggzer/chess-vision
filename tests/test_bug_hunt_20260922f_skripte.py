"""Bug-Hunt 2026-09-22f: Skripte, deren Zahlen eine Entscheidung tragen."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from conftest import load_script, write_jsonl

ROOT = Path(__file__).resolve().parents[1]


# --- show_dispute: die Episode ist (Aufnahme, Feld, Ply), nicht (Feld, Ply) ----------------

def test_show_dispute_episode_keeps_the_recording_apart():
    mod = load_script("show_dispute")
    a = {"session_id": "rg-2026-09-06-20-27-33", "square": "d1", "true": "wQ", "ply": 26}
    b = {**a, "session_id": "rg-2026-09-19-21-03-11"}
    assert mod.episode_key(a) != mod.episode_key(b)


def test_show_dispute_unmeasured_coverage_is_not_a_visible_cell():
    mod = load_script("show_dispute")
    rows = [{"path": "a", "coverage": 0.0}, {"path": "b"}, {"path": "c", "coverage": 0.9}]
    live, unmeasured = mod.disputed(rows, [0, 0, 0], [1, 1, 1])
    assert live == [0]
    assert unmeasured == 1


# --- check_setup_video: ein OK nach null verglichenen Brettern ------------------------------

def test_check_setup_video_refuses_when_nothing_was_read(tmp_path, monkeypatch):
    mod = load_script("check_setup_video")
    tag = tmp_path / "data" / "crops" / "check-p1"
    tag.mkdir(parents=True)
    rows = [{"path": str(tag / f"{sq}.png"), "square": sq, "frame": "000001",
             "label": "empty", "coverage": 0.9} for sq in ("a1", "a2")]
    write_jsonl(tag / "manifest.jsonl", rows)
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(sys, "argv", ["check_setup_video", "--tag", "check-p1",
                                      "--fen", "8/8/8/8/8/8/8/8 w - - 0 1"])
    with pytest.raises(SystemExit):
        mod.main()


# --- benchmark_training_feed: die Zeilennummer ist nicht die Packzeile ---------------------

def _pack_dir(tmp_path: Path, paths: list[str], pack_paths: list[str], size: int = 2) -> Path:
    dd = tmp_path / "ds"
    dd.mkdir()
    (dd / "manifest.jsonl").write_text(
        "".join(json.dumps({"path": p}) + "\n" for p in paths), encoding="utf-8")
    (dd / "packed_meta.json").write_text(
        json.dumps({"n": len(pack_paths), "h": size, "w": size, "paths": pack_paths}),
        encoding="utf-8")
    (dd / "packed_images.u8").write_bytes(b"\0" * (len(pack_paths) * size * size * 3))
    return dd


def test_benchmark_feed_reads_the_pack_order_from_its_meta(tmp_path):
    mod = load_script("benchmark_training_feed")
    dd = _pack_dir(tmp_path, ["A", "B", "C"], ["C", "A", "B"])
    image, shape, path2idx = mod.packed_source(dd)
    assert Path(image) == dd / "packed_images.u8"
    assert shape == (3, 2, 2)
    assert path2idx == {"C": 0, "A": 1, "B": 2}


def test_benchmark_feed_refuses_a_pack_of_the_wrong_size(tmp_path):
    mod = load_script("benchmark_training_feed")
    dd = _pack_dir(tmp_path, ["A", "B"], ["A", "B"])
    (dd / "packed_images.u8").write_bytes(b"\0" * 7)
    with pytest.raises(SystemExit):
        mod.packed_source(dd)
