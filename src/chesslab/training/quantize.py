"""Stage 5 — INT8 static quantization for the Hexagon NPU (QNN Execution Provider).

The HTP runs quantized models only; a float graph silently falls back to CPU. So a QDQ
`model.qnn.onnx` sits next to the FP32 `model.onnx`, calibrated on the run's OWN training crops.
"""

from __future__ import annotations

import random
from collections import defaultdict
from pathlib import Path

import numpy as np

from .. import config
from ..runs import lacks_run_config, read_run_config

# Resolved lazily so the module imports without onnxruntime.
_QUANT_TYPES = {"quint8", "qint8", "quint16", "qint16"}

#: Below this the INT8 graph is not the model any more (`_parity`); above it is still no proof.
PARITY_FLOOR = 0.9


def _quant_type(name: str):
    from onnxruntime.quantization import QuantType

    return {
        "quint8": QuantType.QUInt8,
        "qint8": QuantType.QInt8,
        "quint16": QuantType.QUInt16,
        "qint16": QuantType.QInt16,
    }[name]


def _calibration_rows(cfg: dict, limit: int) -> list[dict]:
    """A small, class-balanced sample of the run's TRAIN crops (never test); round-robin across
    labels, because `empty` dominates.
    """
    from ..dataset import load_manifest, load_split
    from .data import dataset_paths, filter_rows_by_split

    # Der Split des LAUFS: ein Fold traegt `split-f<i>.json`.
    manifest_path, split_path = dataset_paths(cfg.get("dataset"), cfg.get("split_file"))
    if not manifest_path.exists() or not split_path.exists():
        raise FileNotFoundError(f"manifest/split missing ({manifest_path}) — build/split the dataset first.")

    manifest = load_manifest(manifest_path)
    split = load_split(split_path)
    # NUR der Trainings-Split: ein `or` schob bei leerem Train-Satz still den Val-Satz unter die
    # Kalibrierung.
    rows = filter_rows_by_split(manifest, split, "train")
    if not rows:
        return []

    rng = random.Random(config.SEED)
    by_label: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_label[r["label"]].append(r)
    for bucket in by_label.values():
        rng.shuffle(bucket)

    picked: list[dict] = []
    cursors = dict.fromkeys(by_label, 0)
    labels = sorted(by_label)
    while len(picked) < limit:
        advanced = False
        for lab in labels:
            c = cursors[lab]
            if c < len(by_label[lab]):
                picked.append(by_label[lab][c])
                cursors[lab] = c + 1
                advanced = True
                if len(picked) >= limit:
                    break
        if not advanced:
            break
    return picked


def _make_reader(rows: list[dict], input_name: str, cfg: dict):
    """A rewindable CalibrationDataReader in `ONNX_BATCH` groups, preprocessed exactly as serving
    does.
    """
    packed = [r["path"] for r in rows if str(r.get("path", "")).startswith("mm://")]
    if packed:
        raise ValueError(
            f"{len(packed)} calibration rows are mm:// (a session-pack or fused-synth dataset, "
            f"e.g. {packed[0]}) and have no file on disk — `--format qnn` needs a file-backed "
            "dataset for its calibration set.")

    from onnxruntime.quantization import CalibrationDataReader
    from PIL import Image

    from .evaluate import ONNX_BATCH
    from .torch_data import eval_transform_for, infer_size_of

    # The graph takes a FIXED batch, so a short final group is padded with its own crops (zeros
    # would widen every range). At the GRAPH's size: 128 px into a 96 px graph was refused outright.
    tf = eval_transform_for(cfg, out_size=infer_size_of(cfg))
    crops = []
    for r in rows:
        with Image.open(r["path"]) as im:
            img = im.convert("RGB")
        crops.append(tf(img).numpy().astype(np.float32))
    samples: list[dict] = []
    for start in range(0, len(crops), ONNX_BATCH):
        group = crops[start:start + ONNX_BATCH]
        if len(group) < ONNX_BATCH:
            group = (group * (ONNX_BATCH // len(group) + 1))[:ONNX_BATCH]
        samples.append({input_name: np.stack(group)})

    class _CropReader(CalibrationDataReader):
        def __init__(self) -> None:
            self._it = iter(samples)

        def get_next(self):
            return next(self._it, None)

        def rewind(self) -> None:
            self._it = iter(samples)

    return _CropReader(), samples


def _parity(fp32_path: Path, quant_path: Path, samples: list[dict]) -> float:
    """Fraction of calibration crops where the quantized argmax matches FP32.

    It does NOT detect the failure that matters: an A8W8 graph scored parity 1.000 here and 5
    phantoms on the veto metric. Below 0.9 stop; at 1.0 still score the regression set first.
    """
    import onnxruntime as ort

    so = ort.SessionOptions()
    so.log_severity_level = 3
    ref = ort.InferenceSession(str(fp32_path), so, providers=["CPUExecutionProvider"])
    q = ort.InferenceSession(str(quant_path), so, providers=["CPUExecutionProvider"])
    # Per CROP: a 64-crop all-or-nothing vote per batch would be far harsher than the threshold
    # assumes.
    agree = total = 0
    for feed in samples[:min(len(samples), 32)]:
        a = np.asarray(ref.run(None, feed)[0]).argmax(-1)
        b = np.asarray(q.run(None, feed)[0]).argmax(-1)
        agree += int((a == b).sum())
        total += a.size
    return agree / max(1, total)


def run_quantize(run: str, limit: int = 128, activation_type: str = "quint16",
                 weight_type: str = "quint8", per_channel: bool = True) -> int:
    """FP32 `model.onnx` -> QDQ `model.qnn.onnx` for the QNN/Hexagon NPU EP.

    Default A16W8 per-channel: 8-bit activations collapsed parity to ~0.34, and per-channel A16W8
    was the only phantom-free graph measured. NOT verified on the device: confirm NPU placement
    first."""
    run_dir = Path(run)
    if lacks_run_config(run_dir):
        return 1
    fp32 = run_dir / "model.onnx"
    if not fp32.exists():
        print(f"[FAIL] {fp32} missing — run `chesslab export --run {run} --format onnx` first.")
        return 1
    if activation_type not in _QUANT_TYPES or weight_type not in _QUANT_TYPES:
        print(f"[FAIL] quant types must be one of {sorted(_QUANT_TYPES)}.")
        return 1

    cfg = read_run_config(run_dir)

    import onnxruntime as ort
    from onnxruntime.quantization import quantize
    from onnxruntime.quantization.execution_providers.qnn import get_qnn_qdq_config
    from onnxruntime.quantization.shape_inference import quant_pre_process

    so = ort.SessionOptions()
    so.log_severity_level = 3
    input_name = ort.InferenceSession(str(fp32), so, providers=["CPUExecutionProvider"]).get_inputs()[0].name

    rows = _calibration_rows(cfg, limit)
    if not rows:
        print("[FAIL] no calibration crops found (empty train/val split).")
        return 1
    reader, samples = _make_reader(rows, input_name, cfg)

    prep = run_dir / "model.prep.onnx"
    out = run_dir / "model.qnn.onnx"
    # `skip_symbolic_shape`: unser Graph hat keine dynamischen Dimensionen, und die Ableitung stirbt
    # an `nn.MultiheadAttention`s eigenem Reshape (`_infer_Reshape`, `assert is_literal`).
    quant_pre_process(str(fp32), str(prep), skip_symbolic_shape=True)
    try:
        qnn_config = get_qnn_qdq_config(
            str(prep), reader,
            activation_type=_quant_type(activation_type),
            weight_type=_quant_type(weight_type),
            per_channel=per_channel,
        )
        quantize(str(prep), str(out), qnn_config)
    finally:
        prep.unlink(missing_ok=True)

    agreement = _parity(fp32, out, samples)
    size_mb = out.stat().st_size / 1e6
    print(f"[OK] quantized ({activation_type}/{weight_type}, "
          f"{'per-channel' if per_channel else 'per-tensor'} weights) -> {out} "
          f"({size_mb:.1f} MB, {len(rows)} calib crops, argmax parity {agreement:.3f})")
    if agreement < PARITY_FLOOR:
        out.unlink(missing_ok=True)
        print(f"[FAIL] FP32↔INT8 argmax parity {agreement:.3f} < {PARITY_FLOOR} — graph removed; "
              "consider quint16 activations or more calib crops.")
        return 1
    return 0
