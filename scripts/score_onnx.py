"""Score an exported ONNX graph on the veto metric (specs/26, phase 02).

Every accuracy number this project has — including the champion's 0 phantoms — was measured on the
FLOAT weights. `model.qnn.onnx` is the INT8/QDQ graph that actually runs on the phone and it has
never been put through the veto metric. Small mobile CNNs are the known worst case for post-training
quantization, so "the float model is phantom-free" says nothing about the shipped artefact.

This runs the exported graphs through the **same** path-A crop pipeline as
`scripts/sweep_infer_size.py` — that script is the measurement of record and is frozen, so
everything here is imported from it rather than copied. The only new thing is a wrapper that makes
an `onnxruntime` session look like a torch module, which lets `serving.predict_arrays` (and
therefore `sweep_path_a`) drive it unchanged.

**This is desktop ONNX Runtime on the CPU EP. It measures what quantization did to the NUMBERS,
not what the NPU does with them.** It is not a device benchmark and no latency it produces should
ever be reported as one — the QNN/Hexagon backend has its own kernels and its own rounding.

Usage:
    .venv/Scripts/python.exe scripts/score_onnx.py
        [--run occ-v6-f5nd] [--dataset occ-real6] [--split test] [--size 80]
        [--variants torch,onnx,qnn] [--device cpu] [--miss-target 43]
        [--log data/_perf/score_onnx.log]

`--variants` names the three rows of the audit: `torch` is the float baseline, `onnx` is the float
export (the control that separates quantization error from export error), `qnn` is the shipped
INT8/QDQ graph. Extra graphs can be scored as `name=path/to/graph.onnx`.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# `src` ahead of the editable install: in a worktree the installed `chesslab` resolves to the MAIN
# checkout, and a number measured against the wrong source is plausible, green and meaningless.
# The script's own directory so `sweep_infer_size` imports however this file is invoked.
_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent / "src"))
sys.path.insert(0, str(_HERE))

import numpy as np  # noqa: E402
from sweep_infer_size import (  # noqa: E402
    Log,
    _counts,
    frames_for_split,
    load_torch_run,
    margin,
    misses_phantom_free,
    occupancy_reader,
    phantoms_at_miss_target,
    report_by_session,
    session_index,
    sweep_path_a,
)

from chesslab import config  # noqa: E402
from chesslab.dataset_build import dataset_dir  # noqa: E402
from chesslab.training.data import (  # noqa: E402
    filter_rows_by_split,
    load_manifest,
    load_split,
)

#: The audit of record: float torch, float ONNX, shipped INT8. The middle row is not optional —
#: without it a regression cannot be attributed to quantization rather than to the export.
VARIANTS = ("torch", "onnx", "qnn")

_FILES = {"onnx": "model.onnx", "qnn": "model.qnn.onnx"}


class OnnxModel:
    """An `onnxruntime` session that answers to the torch-module calls `serving` makes.

    `predict_arrays` builds a normalized NCHW float tensor and calls `model(batch)`; it never
    asks what kind of module it holds. So the whole serving path — the crop geometry, the
    photometry, the normalisation, the softmax — stays byte-identical between the torch row and
    the ONNX rows, and the only difference measured is the graph.

    The export bakes a static batch of 64 (`evaluate.ONNX_BATCH`), while a path-A frame carries
    only its LABELLED squares. Short batches are padded by repeating the last crop, and the
    padding is sliced off the logits: the graph normalizes per sample (GroupNorm, exported as
    rank-3 `InstanceNormalization`), so no padding row can reach a real one. Zeros would be
    equally safe numerically but would be a lie about what the model is being shown.
    """

    def __init__(self, path: Path) -> None:
        import onnxruntime as ort

        so = ort.SessionOptions()
        so.log_severity_level = 3
        self._sess = ort.InferenceSession(str(path), so, providers=["CPUExecutionProvider"])
        inp = self._sess.get_inputs()[0]
        self._in = inp.name
        self._out = self._sess.get_outputs()[0].name
        self.batch = int(inp.shape[0]) if isinstance(inp.shape[0], int) else 0
        self.hw = (int(inp.shape[2]), int(inp.shape[3]))
        self.path = Path(path)

    def eval(self) -> OnnxModel:
        return self

    def to(self, device: str) -> OnnxModel:
        if str(device).startswith("cuda"):
            raise SystemExit("score_onnx runs the CPU EP on purpose — see the module docstring.")
        return self

    def __call__(self, batch):
        import torch

        arr = batch.detach().cpu().float().numpy()
        n = arr.shape[0]
        if self.batch and n < self.batch:
            arr = np.concatenate([arr, np.repeat(arr[-1:], self.batch - n, axis=0)], axis=0)
        elif self.batch and n > self.batch:
            raise SystemExit(f"{self.path.name} takes {self.batch} crops, got {n}")
        out = self._sess.run([self._out], {self._in: arr})[0][:n]
        return torch.from_numpy(np.asarray(out, dtype=np.float32))


def resolve_variants(run_dir: Path, names: list[str]) -> dict[str, Path | None]:
    """`{row label: graph path or None for the torch checkpoint}`, in the order given."""
    out: dict[str, Path | None] = {}
    for raw in names:
        if "=" in raw:
            label, path = raw.split("=", 1)
            out[label] = Path(path)
        elif raw == "torch":
            out["torch"] = None
        elif raw in _FILES:
            out[raw] = run_dir / _FILES[raw]
        else:
            raise SystemExit(f"unknown variant '{raw}' — use torch, {'/'.join(_FILES)} or name=path")
    for label, path in out.items():
        if path is not None and not path.exists():
            raise SystemExit(f"variant '{label}': {path} missing")
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--run", default="occ-v6-f5nd")
    ap.add_argument("--dataset", default="occ-real6")
    ap.add_argument("--split", default="test")
    ap.add_argument("--size", type=int, default=80)
    ap.add_argument("--variants", default=",".join(VARIANTS))
    ap.add_argument("--device", default="cpu", help="the torch row's device; ONNX is always CPU EP")
    ap.add_argument("--miss-target", type=int, default=43)
    ap.add_argument("--log", default="data/_perf/score_onnx.log")
    args = ap.parse_args()

    log = Log(Path(args.log) if args.log else None)
    run_dir = config.DATA.models / args.run
    variants = resolve_variants(run_dir, [v for v in args.variants.split(",") if v])
    size = args.size

    torch_model, cfg = load_torch_run(run_dir)
    torch_model.to(args.device)
    # Not used for scoring — `sweep_path_a` derives its own reader per run. Called here only so an
    # incompatible class list fails on the first line instead of after the whole sweep.
    occupancy_reader(cfg)
    log(f"run={args.run} dataset={args.dataset} split={args.split} size={size} "
        f"variants={list(variants)} torch_device={args.device} (ONNX rows: CPU EP)")

    runs: dict[str, tuple] = {}
    for label, path in variants.items():
        if path is None:
            runs[label] = (run_dir, torch_model, cfg)
            continue
        m = OnnxModel(path)
        if m.hw != (size, size):
            raise SystemExit(f"{path.name} takes {m.hw} px, the audit is at {size} px — re-export.")
        log(f"  {label}: {path.name} batch={m.batch} input={m.hw} "
            f"({path.stat().st_size / 1e6:.1f} MB)")
        runs[label] = (run_dir, m, cfg)

    dd = dataset_dir(args.dataset)
    rows = filter_rows_by_split(load_manifest(dd / "manifest.jsonl"),
                                load_split(dd / "split.json"), args.split)
    if not rows:
        raise SystemExit(f"{args.split} split of {args.dataset} is empty")
    frames = len({(r["session_id"], str(r["frame"])) for r in rows})
    occ_n = sum(1 for r in rows if r["label"] != "empty")
    log(f"== {args.split}: {len(rows)} crops / {frames} boards / {occ_n} occupied ==")

    # One pass over the frames scores every variant on the SAME pixels: `sweep_path_a` cuts the
    # crops once per (geometry, photometry) variant and re-seeds the serving cache per model.
    a_all = sweep_path_a(runs, rows, (size,), args.device, log)
    sids = session_index(frames_for_split(rows))

    log("")
    log(f"  {'variant':<10} | {'phantoms':>8} {'misses':>7} | {'m p99.9':>8} {'m max':>7} "
        f"| {'ph@miss' + str(args.miss_target):>9} {'miss@0ph':>9}")
    log("  " + "-" * 72)
    for label in runs:
        trues, preds, probs = a_all[(label, size)]
        miss, phan = _counts(trues, preds)
        p999, mx = margin(trues, probs)
        ph_at_m, _, _ = phantoms_at_miss_target(trues, probs, args.miss_target)
        m_at_pf, _ = misses_phantom_free(trues, probs)
        log(f"  {label:<10} | {phan:>8} {miss:>7} | {p999:>8.3f} {mx:>7.3f} "
            f"| {ph_at_m:>9} {m_at_pf:>9}")
    log("")
    for label in runs:
        report_by_session(log, label, (size,), {size: a_all[(label, size)]}, sids)

    # How far apart the graphs actually are, crop by crop — a summary table can hide a model that
    # is right for different reasons.
    ref_label = next(iter(runs))
    base = a_all[(ref_label, size)][2]
    for label in list(runs)[1:]:
        q = a_all[(label, size)][2]
        agree = float(((base >= 0.5) == (q >= 0.5)).mean())
        log(f"  {label} vs {ref_label}: argmax agreement {agree:.4f}, "
            f"max |dP(occupied)| {float(np.abs(base - q).max()):.4f}, "
            f"mean {float(np.abs(base - q).mean()):.5f}")
    log(f"  classes = {list(cfg['classes'])}")
    log.close()


if __name__ == "__main__":
    main()
