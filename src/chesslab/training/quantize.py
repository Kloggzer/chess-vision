"""Stage 5 — INT8 static quantization for the on-device NPU (Qualcomm Hexagon).

The Android tracker runs the per-square classifier through ONNX Runtime. On a
Snapdragon phone (dev target: Poco F7 Pro / SD 8 Gen 3) the fastest, lowest-power
backend is the **QNN Execution Provider**, which offloads the graph to the Hexagon
NPU (HTP). The HTP backend runs **quantized models only** — a float32 graph would
silently fall back to CPU. So we produce a QDQ (Quantize-Dequantize) ONNX next to
the FP32 `model.onnx`:

    model.onnx       — FP32, the CPU/NNAPI fallback (unchanged).
    model.qnn.onnx   — INT8 static-quantized QDQ, loaded by the QNN EP on-device.

The quantization uses ONNX Runtime's own QNN QDQ config helper (`get_qnn_qdq_config`),
which enforces the HTP constraints (per-tensor scales, supported op set), calibrated
on a small, class-balanced sample of the run's OWN training crops. Preprocessing for
calibration is identical to inference/eval (`build_transform(..., train=False)`), so
the recorded activation ranges match what the phone actually feeds the model.

The device stays model-agnostic: whatever backbone `train` produced, export → quantize
just walks its graph. No weights need to be final.

The scheme being produced is integer-arithmetic-only inference (docs/references.md#jacob-2017);
note that this is POST-TRAINING static quantization with a calibration set, not that paper's
quantization-aware training. Per-channel weights are docs/references.md#krishnamoorthi-2018.
"""

from __future__ import annotations

import json
import random
from collections import defaultdict
from pathlib import Path

import numpy as np

from .. import config

# Map CLI-friendly names to ONNX Runtime QuantType members (resolved lazily so this
# module imports without onnxruntime present).
_QUANT_TYPES = {"quint8", "qint8", "quint16", "qint16"}


def _quant_type(name: str):
    from onnxruntime.quantization import QuantType

    return {
        "quint8": QuantType.QUInt8,
        "qint8": QuantType.QInt8,
        "quint16": QuantType.QUInt16,
        "qint16": QuantType.QInt16,
    }[name]


def _calibration_rows(cfg: dict, limit: int) -> list[dict]:
    """A small, class-balanced sample of the run's TRAIN crops (never test — no eval
    leak). ``empty`` dominates massively (see CLAUDE.md), so a flat random draw would
    starve the piece classes of calibration range; we round-robin across labels."""
    from .data import filter_rows_by_split, load_manifest, load_split

    ds_name = cfg.get("dataset")
    if ds_name:
        from ..dataset_build import dataset_dir

        dd = dataset_dir(ds_name)
        # A fold run trains against `split-f<i>.json`; reading `split.json` here would
        # hand back the very sessions the fold was built to hold out.
        manifest_path = dd / "manifest.jsonl"
        split_path = dd / (cfg.get("split_file") or "split.json")
    else:
        manifest_path = config.DATA.crop_pool / "manifest.jsonl"
        split_path = config.DATA.reports / "split.json"
    if not manifest_path.exists() or not split_path.exists():
        raise FileNotFoundError(f"manifest/split missing ({manifest_path}) — build/split the dataset first.")

    manifest = load_manifest(manifest_path)
    split = load_split(split_path)
    rows = filter_rows_by_split(manifest, split, "train") or filter_rows_by_split(manifest, split, "val")
    if not rows:
        return []

    rng = random.Random(config.SEED)
    by_label: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_label[r["label"]].append(r)
    for bucket in by_label.values():
        rng.shuffle(bucket)

    # Round-robin over labels until we hit the limit or exhaust every bucket.
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
    """A rewindable CalibrationDataReader yielding preprocessed crops in `ONNX_BATCH`-sized
    groups, matching the on-device preprocessing exactly — `eval_transform_for` IS what serving
    reproduces, including the run's input representation."""
    from onnxruntime.quantization import CalibrationDataReader
    from PIL import Image

    from .evaluate import ONNX_BATCH
    from .torch_data import eval_transform_for, infer_size_of

    # The FP32 graph is traced at a FIXED batch (`evaluate.ONNX_BATCH`) because a dynamic one
    # breaks the Android session — so calibration has to feed that exact batch, not one crop at a
    # time. A short final group is padded by repeating its own crops rather than with zeros: black
    # squares would widen every activation range the calibrator measures.
    #
    # And at the size the GRAPH takes, not the size the crops were built at: `eval_transform_for`
    # defaults to `out_size`, so a run serving at 96 fed the calibrator 128 px tensors and ORT
    # refused them outright ("index: 2 Got: 128 Expected: 96"). That dropped `model.qnn.onnx` from
    # a ship once (specs/23 phase 02) — the calibration set must live in the graph's own geometry.
    tf = eval_transform_for(cfg, out_size=infer_size_of(cfg))
    crops = []
    # TODO: `mm://`-Zeilen (Session-Packs, fused synth) haben keine Datei — PIL wirft hier
    # einen nackten OSError, waehrend `evaluate.run_eval` denselben Fall benennt. `--format qnn`
    # stirbt damit auf genau den Datensaetzen, die heute gebaut werden.
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
    """Fraction of calibration crops where the quantized argmax matches FP32. A rough
    on-parity sanity gate (INT8 rounding shifts logits but should rarely flip argmax).

    **It does not detect the failure that matters.** specs/26 phase 02 measured a pure-INT8
    (A8W8, per-tensor) export of `occ-v6-f5nd` at parity **1.000** here and 5 phantoms on the
    veto metric, against the float model's 1. The calibration set is TRAIN crops the model
    already fits; phantoms live on empty squares in a held-out session. Parity below 0.9 is a
    reason to stop, but parity 1.0 is not a reason to ship — score the graph with
    `scripts/score_onnx.py`.
    """
    import onnxruntime as ort

    so = ort.SessionOptions()
    so.log_severity_level = 3
    ref = ort.InferenceSession(str(fp32_path), so, providers=["CPUExecutionProvider"])
    q = ort.InferenceSession(str(quant_path), so, providers=["CPUExecutionProvider"])
    # Counted per CROP, not per batch: a feed now carries `ONNX_BATCH` of them, and scoring a
    # 64-crop batch as one all-or-nothing vote would report a far harsher number than the docstring
    # promises and than the threshold below was chosen against.
    agree = total = 0
    for feed in samples[:min(len(samples), 32)]:
        a = np.asarray(ref.run(None, feed)[0]).argmax(-1)
        b = np.asarray(q.run(None, feed)[0]).argmax(-1)
        agree += int((a == b).sum())
        total += a.size
    return agree / max(1, total)


def run_quantize(run: str, limit: int = 128, activation_type: str = "quint16",
                 weight_type: str = "quint8", per_channel: bool = True) -> int:
    """FP32 ``model.onnx`` → INT8-weight QDQ ``model.qnn.onnx`` for the QNN/Hexagon NPU EP.

    Default is A16W8 (16-bit activations, INT8 weights) — the Hexagon HTP's recommended
    accuracy/performance balance. MobileNet's depthwise convs are very sensitive to 8-bit
    *activation* rounding: pure quint8/quint8 collapsed argmax parity to ~0.34 on the dev
    model, while quint16 activations held it at 1.0 with the same INT8 weights. Pass
    ``activation_type='quint8'`` for pure INT8 if a given model tolerates it.

    ``per_channel`` gives every output channel of a weight its own scale instead of one scale
    per tensor. It is the literature's largest single lever for MobileNet-class models — the
    quantization whitepaper measures MobileNet v1/v2 collapsing to 0.001 top-1 under per-layer
    weight quantization and recovering to ~0.70 per-channel, because batch norm leaves the kernels
    of one layer with wildly different dynamic ranges (docs/references.md#krishnamoorthi-2018).
    That stated mechanism does NOT apply to this model, which is GroupNorm, so the far milder
    effect measured below is not a contradiction of the paper. It measures the same direction here
    (specs/26 phase 02, `occ-v6-f5nd` on `occ-real6` test at 80 px,
    path A — phantoms / margin p99.9 / max):

        per-tensor A8W8      5 · 0.406 / 0.802      per-channel A8W8   2 · 0.382 / 0.622
        per-tensor A16W8     1 · 0.314 / 0.549      per-channel A16W8  0 · 0.284 / 0.431

    The bottom right is the only phantom-free graph in that set — better than the FP32 weights
    it was quantized from (1 · 0.312 / 0.508). Hence the default.

    **Not verified on the device.** Per-tensor scales were historically an HTP constraint; ORT's
    QNN config builder accepts ``per_channel`` but whether the HTP assigns the resulting graph or
    silently leaves it on CPU is an on-device question (`disable_cpu_ep_fallback`). Confirm
    placement before swapping a bundled asset — a graph that fell off the NPU is far slower for a
    margin gain nobody can spend.
    """
    run_dir = Path(run)
    if not (run_dir / "config.json").exists():
        print(f"[FAIL] no config.json in {run_dir}.")
        return 1
    fp32 = run_dir / "model.onnx"
    if not fp32.exists():
        print(f"[FAIL] {fp32} missing — run `chesslab export --run {run} --format onnx` first.")
        return 1
    if activation_type not in _QUANT_TYPES or weight_type not in _QUANT_TYPES:
        print(f"[FAIL] quant types must be one of {sorted(_QUANT_TYPES)}.")
        return 1

    cfg = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))

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
    # `skip_symbolic_shape`: die symbolische Ableitung ist fuer Graphen mit dynamischen
    # Dimensionen da, und unserer hat keine — der Exporter nagelt die Charge auf 64.
    # Ohne den Schalter stirbt sie an `nn.MultiheadAttention`s eigenem Reshape, dessen
    # Zielform aus `Shape`/`Concat` kommt (`_infer_Reshape`, `assert is_literal`).
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
    if agreement < 0.9:
        print("[WARN] low FP32↔INT8 argmax parity — consider quint16 activations or more calib crops.")
    return 0
