"""`stage_model_asset.py` can stamp a measured gate onto an already staged model."""

import json
import subprocess
import sys
from pathlib import Path

SCRIPT = Path("scripts/stage_model_asset.py")


def _asset(tmp_path, gate=None):
    d = tmp_path / "p4a-80-clahe"
    d.mkdir(parents=True)
    cfg = {"classes": ["empty", "wP"], "head": "occlusion", "coverage_output": True}
    if gate is not None:
        cfg["coverage_gate"] = gate
    (d / "config.json").write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")
    (d / "model.onnx").write_bytes(b"not a real graph")
    return d


def _run(*args):
    return subprocess.run([sys.executable, str(SCRIPT), *args],
                          capture_output=True, text=True)


def test_an_existing_asset_can_be_stamped_without_its_run(tmp_path):
    asset = _asset(tmp_path)

    r = _run("--stamp", str(asset), "--gate", "0.35")

    assert r.returncode == 0, f"{r.stdout}{r.stderr}"
    cfg = json.loads((asset / "config.json").read_text(encoding="utf-8"))
    assert cfg["coverage_gate"] == 0.35
    assert cfg["coverage_output"] is True and cfg["classes"] == ["empty", "wP"], (
        "stamping must touch the gate and nothing else"
    )
    assert (asset / "model.onnx").read_bytes() == b"not a real graph", "the graph was rewritten"


def test_stamping_refuses_a_directory_that_is_not_an_asset(tmp_path):
    r = _run("--stamp", str(tmp_path / "nope"), "--gate", "0.35")

    assert r.returncode != 0
