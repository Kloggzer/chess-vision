"""INT8/QDQ export — the calibration set and the shipped graph's contract (specs/26 phase 02).

What this file does NOT test is the thing that actually decides: whether the quantized graph is
phantom-free. That is `scripts/score_onnx.py` against `occ-real6` test, and it needs the corpus.
The two tests here guard the preconditions that made a bad export possible in the first place —
a calibration set that only ever saw `empty`, and a quantized graph that silently disagrees with
the float one about its own input.
"""

from __future__ import annotations

import json

import pytest

from chesslab import config
from chesslab.training.quantize import _calibration_rows


def _write_dataset(tmp_path, rows: list[dict]) -> None:
    (tmp_path / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    (tmp_path / "split.json").write_text(
        json.dumps({"splits": {"train": ["s0"], "val": [], "test": []}}), encoding="utf-8")


def test_calibration_reader_covers_both_classes(tmp_path, monkeypatch):
    """`empty` outnumbers `occupied` ~3:1 in the corpus and far more than that per board. A flat
    random draw would hand the calibrator almost nothing but empty squares and place every
    activation range on the wrong distribution — so the sample is round-robin over labels."""
    rows = ([{"session_id": "s0", "label": "empty", "path": f"e{i}.png"} for i in range(500)]
            + [{"session_id": "s0", "label": "occupied", "path": f"o{i}.png"} for i in range(60)])
    _write_dataset(tmp_path, rows)
    monkeypatch.setattr("chesslab.dataset_build.dataset_dir", lambda name: tmp_path)

    picked = _calibration_rows({"dataset": "whatever"}, 128)

    assert len(picked) == 128
    occupied = sum(1 for r in picked if r["label"] == "occupied")
    # Round-robin means parity until a bucket runs dry; 60 occupied rows cannot fill half of 128.
    assert occupied == 60, f"expected every occupied row, got {occupied}"
    assert all(r["label"] in ("empty", "occupied") for r in picked)


def test_calibration_sample_is_deterministic(tmp_path, monkeypatch):
    """Seeded from `config.SEED`: two exports of the same run must calibrate on the same crops,
    or a re-export is a new model nobody measured."""
    rows = [{"session_id": "s0", "label": lab, "path": f"{lab}{i}.png"}
            for lab in ("empty", "occupied") for i in range(200)]
    _write_dataset(tmp_path, rows)
    monkeypatch.setattr("chesslab.dataset_build.dataset_dir", lambda name: tmp_path)

    first = _calibration_rows({"dataset": "whatever"}, 64)
    second = _calibration_rows({"dataset": "whatever"}, 64)

    assert [r["path"] for r in first] == [r["path"] for r in second]
    assert config.SEED == 42


def _run_with_both_graphs():
    models = config.DATA.models
    if not models.exists():
        return None
    for run_dir in sorted(models.iterdir()):
        if (run_dir / "model.onnx").exists() and (run_dir / "model.qnn.onnx").exists():
            return run_dir
    return None


def test_quantized_graph_input_shape_matches_float():
    """The float and quantized graphs must agree on the input, batch included.

    The export traces a FIXED batch (`evaluate.ONNX_BATCH`) because a dynamic one broke NPU
    partitioning, and the Android classifier is contracted to exactly that many crops. A
    quantization pass that changed the batch or the spatial size would still load, still run on
    the calibration crops, and hand the device a graph it cannot feed.
    """
    ort = pytest.importorskip("onnxruntime")
    run_dir = _run_with_both_graphs()
    if run_dir is None:
        pytest.skip("no run with both model.onnx and model.qnn.onnx (data/ is gitignored)")

    so = ort.SessionOptions()
    so.log_severity_level = 3
    fp32 = ort.InferenceSession(str(run_dir / "model.onnx"), so, providers=["CPUExecutionProvider"])
    qdq = ort.InferenceSession(str(run_dir / "model.qnn.onnx"), so,
                               providers=["CPUExecutionProvider"])

    assert fp32.get_inputs()[0].shape == qdq.get_inputs()[0].shape
    assert fp32.get_inputs()[0].type == qdq.get_inputs()[0].type == "tensor(float)"
    assert fp32.get_outputs()[0].shape == qdq.get_outputs()[0].shape
    # The QDQ graph keeps float in/out: quantization is internal, so serving feeds it unchanged.
    assert fp32.get_outputs()[0].type == qdq.get_outputs()[0].type == "tensor(float)"

    cfg = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))
    infer_w, infer_h = (cfg.get("infer_size") or cfg["out_size"])[:2]
    assert list(qdq.get_inputs()[0].shape[2:]) == [int(infer_h), int(infer_w)], (
        "the quantized graph does not take the size the run declares it is served at")
