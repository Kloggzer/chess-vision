"""Eine kaputte Zeile in `metrics.jsonl` faellt nicht lautlos aus `read_run`."""

from __future__ import annotations

import json

import pytest
from scripts.sweep_report import read_run

AXIS = "val_visible_piece_acc"


def _epoch(n: int) -> str:
    return json.dumps({"epoch": n, AXIS: 0.90 + n / 1000})


def _run(tmp_path, text: str):
    run = tmp_path / "arm-a"
    run.mkdir()
    (run / "metrics.jsonl").write_text(text, encoding="utf-8")
    return run


def test_a_broken_line_in_the_middle_is_loud(tmp_path):
    run = _run(tmp_path, "\n".join([_epoch(1), '{"epoch": 2, "val_vis', _epoch(3)]) + "\n")

    with pytest.raises(ValueError):
        read_run(run, AXIS)


def test_the_tail_of_a_running_sweep_is_still_tolerated(tmp_path):
    """Der Lauf schreibt gerade — seine halbe letzte Zeile ist kein Defekt."""
    run = _run(tmp_path, "\n".join([_epoch(1), _epoch(2)]) + '\n{"epoch": 3, "val_vis')

    assert read_run(run, AXIS)["n"] == 2


def test_a_healthy_run_counts_every_epoch(tmp_path):
    run = _run(tmp_path, "".join(_epoch(n) + "\n" for n in range(1, 7)))

    got = read_run(run, AXIS)
    assert (got["n"], got["best"]) == (6, 0.906)
