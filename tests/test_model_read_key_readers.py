"""Jeder Leser von `model-reads.jsonl` muss die HEUTIGE Schreibweise verstehen.

`read_session` schreibt seit 2026-09-16 `model_cov` statt `cov`. Wer nur `cov` kennt, sieht auf
frisch gelesenen Aufnahmen null Zeilen — `occlusion_gate.py` meldet dann "der Lauf hat keinen
Occlusion-Kopf" und die Messung, aus der jede `coverage_gate` stammt, faellt aus.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

SCRIPTS = Path(__file__).parents[1] / "scripts"


def _load(name: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_the_gate_measurement_reads_todays_spelling(tmp_path):
    gate = _load("occlusion_gate")
    session = tmp_path / "rg-s"
    session.mkdir()
    (session / "matte.jsonl").write_text(
        json.dumps({"frame": "000100", "coverage": {"e4": 0.9}}) + "\n", encoding="utf-8")
    (session / "model-reads.jsonl").write_text(
        json.dumps({"frame": "000100", "square": "e4", "fen_label": "wP",
                    "probs": {"wP": 0.9}, "model_cov": 0.42}) + "\n", encoding="utf-8")
    gate.ROOT = tmp_path

    assert gate.collect("model-reads.jsonl", ["rg-s"]) == [(0.42, True)]
