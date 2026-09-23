"""Der Weg Checkpoint -> ONNX -> Android-Asset (`run_export`, `run_quantize`,
`stage_model_asset.main`)."""
from __future__ import annotations

import ast
import inspect
import json
import re
import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from conftest import load_script, write_jsonl

torch = pytest.importorskip("torch")
pytest.importorskip("onnxruntime")

ROOT = Path(__file__).resolve().parents[1]
CROP = 32
CLASSES = ["empty", "wP"]


def _stage_module(monkeypatch, assets: Path):
    mod = load_script("stage_model_asset")
    monkeypatch.setattr(mod, "ASSETS", assets)
    return mod


def _stage(monkeypatch, tmp_path, *argv):
    mod = _stage_module(monkeypatch, tmp_path / "assets")
    monkeypatch.setattr(sys, "argv", ["stage_model_asset.py", *argv])
    try:
        return mod.main()
    except SystemExit as e:
        return e.code if isinstance(e.code, int) else 1


def _run(tmp_path, name="run", **extra):
    from chesslab.training.model import build_model

    run_dir = tmp_path / name
    run_dir.mkdir()
    torch.manual_seed(0)
    model = build_model("smallcnn", len(CLASSES) + 1, norm="batchnorm", head="combined")
    torch.save(model.state_dict(), str(run_dir / "best.pt"))
    cfg = {"backbone": "smallcnn", "classes": CLASSES, "out_size": [CROP, CROP],
           "norm": "batchnorm", "head": "occlusion", "temperature": 1.5,
           "prior_lambda": 6.0, **extra}
    (run_dir / "config.json").write_text(json.dumps(cfg), encoding="utf-8")
    return run_dir


def _cfg(run_dir):
    return json.loads((run_dir / "config.json").read_text(encoding="utf-8"))


def _exported(tmp_path, **extra):
    from chesslab.training.evaluate import run_export

    run_dir = _run(tmp_path, **extra)
    assert run_export(str(run_dir), fmt="onnx") == 0
    return run_dir


# --- 1. Der Graph muss vom Checkpoint stammen, den die Config beschreibt ----------------------


def test_staging_refuses_a_graph_from_an_older_checkpoint(tmp_path, monkeypatch):
    run_dir = _exported(tmp_path)
    from chesslab.training.model import build_model

    torch.manual_seed(1)
    newer = build_model("smallcnn", len(CLASSES) + 1, norm="batchnorm", head="combined")
    torch.save(newer.state_dict(), str(run_dir / "best.pt"))

    assert _stage(monkeypatch, tmp_path, str(run_dir), "--gate", "0.25") != 0
    assert not (tmp_path / "assets" / "run").exists()


def test_staging_refuses_a_graph_without_a_fingerprint(tmp_path, monkeypatch):
    run_dir = _run(tmp_path)
    (run_dir / "model.onnx").write_bytes(b"from some earlier export")

    assert _stage(monkeypatch, tmp_path, str(run_dir), "--gate", "0.25") != 0


def test_a_fresh_export_stages(tmp_path, monkeypatch):
    run_dir = _exported(tmp_path)

    assert _stage(monkeypatch, tmp_path, str(run_dir), "--gate", "0.25") == 0
    staged = tmp_path / "assets" / "run"
    assert (staged / "model.onnx").read_bytes() == (run_dir / "model.onnx").read_bytes()
    assert _cfg(staged)["coverage_gate"] == 0.25


# --- 2. pad_side: die Run-Config gewinnt ---------------------------------------------------


def _dataset_with_pad(tmp_path, monkeypatch, pad):
    dd = tmp_path / "ds"
    dd.mkdir()
    rows = [{"path": "x.png", "label": "empty", "pad_side": pad}]
    write_jsonl(dd / "manifest.jsonl", rows)
    monkeypatch.setattr("chesslab.dataset_build.dataset_dir", lambda name, paths=None: dd)


def test_export_refuses_a_dataset_rebuilt_with_another_pad(tmp_path, monkeypatch, capsys):
    from chesslab.training.evaluate import run_export

    _dataset_with_pad(tmp_path, monkeypatch, 0.10)
    run_dir = _run(tmp_path, dataset="same-name", pad_side=0.05)

    assert run_export(str(run_dir), fmt="onnx") != 0
    assert _cfg(run_dir)["pad_side"] == 0.05
    assert not (run_dir / "model.onnx").exists()
    assert "0.05" in capsys.readouterr().out


def test_export_takes_the_dataset_pad_when_the_run_declares_none(tmp_path, monkeypatch):
    from chesslab.training.evaluate import run_export

    _dataset_with_pad(tmp_path, monkeypatch, 0.05)
    run_dir = _run(tmp_path, dataset="same-name")

    assert run_export(str(run_dir), fmt="torchscript") == 0
    assert _cfg(run_dir)["pad_side"] == 0.05


# --- 3. Was Kotlin nicht lesen kann, geht nicht aufs Geraet ----------------------------------


@pytest.mark.parametrize("extra", [{"input_repr": "gray3"}, {"clahe_denoise": "pre"},
                                   {"clahe_denoise": "post"}])
def test_staging_refuses_preprocessing_the_app_cannot_do(tmp_path, monkeypatch, extra):
    run_dir = _exported(tmp_path)
    cfg = _cfg(run_dir)
    cfg.update(extra)
    (run_dir / "config.json").write_text(json.dumps(cfg), encoding="utf-8")

    assert _stage(monkeypatch, tmp_path, str(run_dir), "--gate", "0.25") != 0
    assert not (tmp_path / "assets" / "run").exists()


def _kotlin_input_reprs(source: str) -> set[str]:
    block = source.split("enum class InputRepr(", 1)[1].split(";", 1)[0]
    return set(re.findall(r'^\s*[A-Z_][A-Z0-9_]*\(\s*"([^"]+)"', block, re.MULTILINE))


def _kotlin_denoise(source: str) -> set[str]:
    guard = re.search(r"require\(\s*denoise\s*==\s*([A-Z_][A-Z0-9_]*)\s*\)", source)
    const = re.search(rf'const val {guard.group(1)}\s*=\s*"([^"]+)"', source)
    return {const.group(1)}


def test_the_staging_lists_match_the_kotlin_source(tmp_path, monkeypatch):
    mod = _stage_module(monkeypatch, tmp_path)
    kt = ROOT / "android"
    pre = (kt / "core-cnn/src/main/kotlin/com/chesslab/cnn/Preprocess.kt").read_text(encoding="utf-8")
    spec = (kt / "tracker-runtime/src/main/kotlin/com/chesslab/tracker/cnn/ModelSpec.kt"
            ).read_text(encoding="utf-8")

    assert set(mod.ANDROID_INPUT_REPRS) == _kotlin_input_reprs(pre)
    assert set(mod.ANDROID_CLAHE_DENOISE) == _kotlin_denoise(spec)


def test_the_kotlin_parser_sees_a_planted_entry():
    planted = ('enum class InputRepr(\n    val id: String,\n) {\n    RGB("rgb", x),\n'
               '    GRAY3(\n        "gray3", y),\n    ;\n}\n')
    assert _kotlin_input_reprs(planted) == {"rgb", "gray3"}
    assert _kotlin_denoise('private const val OFF_X = "none"\nrequire(denoise == OFF_X) {') == {"none"}


def test_python_still_trains_what_the_app_refuses():
    from chesslab.training.torch_data import INPUT_REPRS

    assert "gray3" in INPUT_REPRS


# --- 5. Paritaet ---------------------------------------------------------------------------


def test_export_fails_when_the_onnx_graph_disagrees_with_torch(tmp_path, monkeypatch, capsys):
    from chesslab.training.evaluate import run_export
    from chesslab.training.model import build_model

    real_export = torch.onnx.export

    def drifted(model, example, path, **kw):
        torch.manual_seed(7)
        other = build_model("smallcnn", len(CLASSES) + 1, norm="batchnorm", head="combined")
        real_export(other.eval(), example, path, **kw)

    monkeypatch.setattr(torch.onnx, "export", drifted)
    run_dir = _run(tmp_path)

    assert run_export(str(run_dir), fmt="onnx") != 0
    assert "export_fingerprint" not in _cfg(run_dir)


def _calibration_dataset(tmp_path, monkeypatch):
    dd = tmp_path / "calib"
    dd.mkdir()
    rows = []
    for i, label in enumerate(CLASSES * 4):
        p = dd / f"c{i}.png"
        Image.fromarray(np.full((CROP, CROP, 3), 40 * i % 255, dtype=np.uint8)).save(p)
        rows.append({"path": str(p), "label": label, "session_id": "s1"})
    write_jsonl(dd / "manifest.jsonl", rows)
    (dd / "split.json").write_text(json.dumps(
        {"classes": CLASSES, "splits": {"train": ["s1"], "val": [], "test": []}}),
        encoding="utf-8")
    monkeypatch.setattr("chesslab.dataset_build.dataset_dir", lambda name, paths=None: dd)


def test_quantize_fails_under_the_parity_floor(tmp_path, monkeypatch, capsys):
    from chesslab.training import quantize

    _calibration_dataset(tmp_path, monkeypatch)
    run_dir = _exported(tmp_path, dataset="calib")
    monkeypatch.setattr(quantize, "_parity", lambda *a: 0.5)

    assert quantize.run_quantize(str(run_dir), limit=8) != 0
    assert not (run_dir / "model.qnn.onnx").exists()


def test_quantize_passes_at_parity(tmp_path, monkeypatch):
    from chesslab.training import quantize

    _calibration_dataset(tmp_path, monkeypatch)
    run_dir = _exported(tmp_path, dataset="calib")
    monkeypatch.setattr(quantize, "_parity", lambda *a: 1.0)

    assert quantize.run_quantize(str(run_dir), limit=8) == 0
    assert (run_dir / "model.qnn.onnx").is_file()


# --- 6. Ungemessen ist kein Normalwert -------------------------------------------------------


@pytest.mark.parametrize("missing", ["temperature", "prior_lambda"])
def test_staging_requires_the_measured_fields(tmp_path, monkeypatch, capsys, missing):
    run_dir = _exported(tmp_path)
    cfg = _cfg(run_dir)
    del cfg[missing]
    (run_dir / "config.json").write_text(json.dumps(cfg), encoding="utf-8")

    assert _stage(monkeypatch, tmp_path, str(run_dir), "--gate", "0.25") != 0
    assert missing in capsys.readouterr().out
    assert not (tmp_path / "assets" / "run").exists()


def test_staging_requires_a_gate_for_a_coverage_model(tmp_path, monkeypatch, capsys):
    run_dir = _exported(tmp_path)

    assert _stage(monkeypatch, tmp_path, str(run_dir)) != 0
    assert "occlusion-gate.md" in capsys.readouterr().out


def test_staging_takes_a_prior_lambda_from_the_command_line(tmp_path, monkeypatch):
    run_dir = _exported(tmp_path)
    cfg = _cfg(run_dir)
    del cfg["prior_lambda"]
    (run_dir / "config.json").write_text(json.dumps(cfg), encoding="utf-8")

    assert _stage(monkeypatch, tmp_path, str(run_dir), "--gate", "0.25",
                  "--prior-lambda", "8") == 0
    assert _cfg(tmp_path / "assets" / "run")["prior_lambda"] == 8.0


def test_staging_refuses_a_failed_temperature_fit(tmp_path, monkeypatch, capsys):
    run_dir = _exported(tmp_path)
    cfg = _cfg(run_dir)
    del cfg["temperature"]
    cfg["temperature_error"] = "RuntimeError: boom"
    (run_dir / "config.json").write_text(json.dumps(cfg), encoding="utf-8")

    assert _stage(monkeypatch, tmp_path, str(run_dir), "--gate", "0.25") != 0
    assert "boom" in capsys.readouterr().out


def test_a_failed_temperature_fit_leaves_a_marker(tmp_path):
    from chesslab.training.temperature import _record_temperature

    cfg_path = tmp_path / "config.json"
    cfg_path.write_text(json.dumps({"temperature": 1.3}), encoding="utf-8")

    _record_temperature(cfg_path, None, RuntimeError("val is empty"))

    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    assert "temperature" not in cfg, "a temperature from an older best.pt survived"
    assert "val is empty" in cfg["temperature_error"]

    _record_temperature(cfg_path, 1.23456)
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    assert cfg == {"temperature": 1.2346}


def test_run_train_marks_the_failure_where_it_catches_it():
    """`run_train` braucht eine GPU; der Syntaxbaum prueft den echten Fehlerpfad."""
    from chesslab.training import temperature as train_mod

    tree = ast.parse(inspect.getsource(train_mod.calibrate_run))
    (handler_try,) = [t for t in ast.walk(tree) if isinstance(t, ast.Try) and any(
        isinstance(c, ast.Call) and getattr(c.func, "id", None) == "fit_temperature"
        for c in ast.walk(ast.Module(body=t.body, type_ignores=[])))]
    calls = {getattr(c.func, "id", None) for h in handler_try.handlers for c in ast.walk(h)
             if isinstance(c, ast.Call)}
    assert "_record_temperature" in calls


def test_the_bundled_models_carry_the_required_fields(tmp_path, monkeypatch):
    """Nur lesend: die sieben Assets muessen die Pflichtfelder schon tragen."""
    mod = _stage_module(monkeypatch, tmp_path)
    bundled = ROOT / "android/app/src/main/assets/cnn_model"
    dirs = sorted(d for d in bundled.iterdir() if (d / "config.json").is_file())
    assert len(dirs) == 7
    for d in dirs:
        cfg = json.loads((d / "config.json").read_text(encoding="utf-8-sig"))
        assert mod.contract_errors(cfg) == [], d.name
