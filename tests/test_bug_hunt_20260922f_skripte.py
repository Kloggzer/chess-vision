"""Bug-Hunt: Skripte, deren Zahlen eine Entscheidung tragen."""

from __future__ import annotations

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
