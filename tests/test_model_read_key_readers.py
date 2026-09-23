"""Jeder Leser von `model-reads.jsonl` versteht `model_cov` und das alte `cov`."""
from __future__ import annotations

import json

from conftest import load_script


def test_the_gate_measurement_reads_todays_spelling(tmp_path):
    gate = load_script("occlusion_gate")
    session = tmp_path / "rg-s"
    session.mkdir()
    (session / "matte.jsonl").write_text(
        json.dumps({"frame": "000100", "coverage": {"e4": 0.9}}) + "\n", encoding="utf-8")
    (session / "model-reads.jsonl").write_text(
        json.dumps({"frame": "000100", "square": "e4", "fen_label": "wP",
                    "probs": {"wP": 0.9}, "model_cov": 0.42}) + "\n", encoding="utf-8")
    gate.ROOT = tmp_path

    assert gate.collect("model-reads.jsonl", ["rg-s"]) == [(0.42, True)]
