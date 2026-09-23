"""The one public facade for model inference: the same crop pipeline as training, so train/serve
parity.

torch/PIL are imported lazily: on ROCm-Windows the CLI must start without the GPU stack.
"""

from __future__ import annotations

import json
import logging
import math
import os
from dataclasses import dataclass, field, replace
from pathlib import Path

import numpy as np

from . import config

log = logging.getLogger("chesslab.serving")

_CACHE: dict[str, tuple] = {}
_GRAPH_CACHE: dict[str, object] = {}  # run key+device -> _CudaGraphPredictor | None (=failed)


def clear_cache() -> None:
    """Clear model cache (Windows file locks, run deletion)."""
    _CACHE.clear()
    _GRAPH_CACHE.clear()



@dataclass(frozen=True)
class RunSpec:
    """Self-describing specification of a trained model run: how to crop a frame for it."""
    run_dir: Path
    classes: list[str]
    out_size: tuple[int, int]   # (W, H) the crops on disk were built at — a DATASET property
    infer_size: tuple[int, int]  # (W, H) the exported graph takes — a MODEL property (specs/22)
    #: What the crop CONTAINS, in cells around the square (specs/45): 128 px of a 1.10 and of a 1.20
    #: box are different photographs. None = legacy run, the caller's profile decides.
    pad_side: float | None = None


def run_spec(run_dir: Path) -> RunSpec:
    """Resolve run specification for a model directory — from its config.json alone."""
    run_dir = Path(run_dir)
    cfg_path = run_dir / "config.json"
    if not cfg_path.exists():
        raise FileNotFoundError(f"No config.json in {run_dir}")

    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    classes = cfg.get("classes", config.CLASSES)
    out_size_raw = cfg.get("out_size", [96, 128])
    out_size = (int(out_size_raw[0]), int(out_size_raw[1]))
    # Imported here: `torch_data` pulls in the torch stack.
    from .training.torch_data import infer_size_of

    infer_size = infer_size_of({**cfg, "out_size": out_size})

    pad_side = None if cfg.get("pad_side") is None else float(cfg["pad_side"])

    return RunSpec(
        run_dir=run_dir,
        classes=classes,
        out_size=out_size,
        infer_size=infer_size,
        pad_side=pad_side,
    )


def model_classes(run_dir: Path) -> list[str]:
    return run_spec(run_dir).classes


class _ONNXModel:
    """Makes an ONNX InferenceSession behave like a PyTorch model (callable, .eval(),
    .to(device)).
    """

    def __init__(self, onnx_path: str, device: str = "cpu"):
        import onnxruntime
        providers = (["CUDAExecutionProvider", "CPUExecutionProvider"] if device == "cuda"
                     else ["CPUExecutionProvider"])
        # Errors only: batch-1 exports carry a static {1,N} output shape, and ORT warns on every
        # batched call (VerifyOutputSizes). Numerically harmless.
        opts = onnxruntime.SessionOptions()
        opts.log_severity_level = 3
        self._sess = onnxruntime.InferenceSession(str(onnx_path), sess_options=opts,
                                                  providers=providers)
        self._input_name = self._sess.get_inputs()[0].name
        self._output_name = self._sess.get_outputs()[0].name
        self._device = device

    def eval(self):
        return self

    def to(self, device: str):
        self._device = device
        return self

    def __call__(self, batch):
        import torch
        if self._device.startswith("cuda"):
            arr = batch.cpu().float().numpy()
        else:
            arr = batch.float().numpy()
        out = self._sess.run([self._output_name], {self._input_name: arr})[0]
        return torch.from_numpy(out).to(batch.device)



def load_run(run_dir: Path, device: str = "cpu", weights: str | None = None):
    """Load model + run config from a run directory and cache them; prefers `model.onnx` (2-4x
    faster).

    [weights] names a checkpoint (`swa.pt`): it joins the cache key and skips `model.onnx`, which
    exports whatever was current, not that checkpoint."""
    key = (str(Path(run_dir).resolve()), weights)
    if key in _CACHE:
        model, cfg = _CACHE[key]
        model.to(device)
        return model, cfg

    onnx_path = Path(run_dir) / "model.onnx"
    if onnx_path.exists() and not weights:
        try:
            import onnxruntime
            # This onnxruntime build ships CPU-only providers on Windows: ONNX for a device="cuda"
            # caller silently downgraded inference to CPU. GPU wanted + no GPU provider -> torch.
            gpu_wanted = str(device).startswith("cuda")
            gpu_providers = {"CUDAExecutionProvider", "ROCMExecutionProvider",
                             "DmlExecutionProvider", "MIGraphXExecutionProvider"}
            if gpu_wanted and not (gpu_providers & set(onnxruntime.get_available_providers())):
                log.info("model.onnx present but onnxruntime has no GPU provider — using "
                         "PyTorch on %s instead of silent CPU inference.", device)
            else:
                cfg = json.loads((Path(run_dir) / "config.json").read_text(encoding="utf-8"))
                model = _ONNXModel(str(onnx_path), device)
                _CACHE[key] = (model, cfg)
                return model, cfg
        except Exception as e:
            log.warning("ONNX load failed (%s) — falling back to PyTorch", e)

    import torch  # noqa: F401

    from .training.evaluate import load_run as _load_run

    model, cfg = _load_run(Path(run_dir), weights)
    model.eval().to(device)
    _CACHE[key] = (model, cfg)
    return model, cfg


# Fixed CUDA/HIP-graph capture size: the hot path is the full board; smaller batches fill the head.
_GRAPH_BATCH = 64


class _CudaGraphPredictor:
    """CUDA/HIP-graph replay of a fixed-shape fp16 forward pass.

    On the Windows-ROCm wheels an eager forward is mostly kernel-launch overhead (~6.4 ms eager
    vs ~2.2 ms replay for 64 crops). fp16 argmax parity 99.8-100 %; stale tail rows are harmless
    in eval BN."""

    def __init__(self, model, out_h: int, out_w: int, device: str):
        import copy

        import torch

        self._device = device
        self._model = copy.deepcopy(model).half().to(device).eval()
        self._pin = torch.empty((_GRAPH_BATCH, out_h, out_w, 3), dtype=torch.uint8,
                                pin_memory=True)
        mean = torch.tensor(config.NORMALIZE_MEAN, dtype=torch.float32).view(1, 3, 1, 1)
        std = torch.tensor(config.NORMALIZE_STD, dtype=torch.float32).view(1, 3, 1, 1)
        # (x/255 - mean)/std  ==  x * 1/(255*std) - mean/std
        self._scale = (1.0 / (255.0 * std)).to(device=device, dtype=torch.float16)
        self._shift = (mean / std).to(device=device, dtype=torch.float16)
        self._static_in = torch.zeros((_GRAPH_BATCH, 3, out_h, out_w),
                                      dtype=torch.float16, device=device)
        # Warm-up on a side stream, then capture (the standard torch.cuda.graph recipe).
        stream = torch.cuda.Stream()
        stream.wait_stream(torch.cuda.current_stream())
        with torch.cuda.stream(stream), torch.no_grad():
            for _ in range(3):
                self._model(self._static_in)
        torch.cuda.current_stream().wait_stream(stream)
        self._graph = torch.cuda.CUDAGraph()
        with torch.cuda.graph(self._graph), torch.no_grad():
            self._static_out = self._model(self._static_in)

    def __call__(self, crops: list[np.ndarray]):
        """`crops`: up to `_GRAPH_BATCH` BGR uint8 HWC arrays at inference size -> float32 logits on
        the GPU.
        """
        import torch

        n = len(crops)
        np.stack(crops, out=self._pin.numpy()[:n])
        gpu = self._pin[:n].to(self._device, non_blocking=True)
        x = gpu.permute(0, 3, 1, 2).flip(1).to(torch.float16) * self._scale - self._shift
        self._static_in[:n].copy_(x)
        self._graph.replay()
        return self._static_out[:n].float()


def graph_key(run_dir, device: str, weights: str | None) -> str:
    """One graph per run, device AND checkpoint: without `weights` the default's graph replayed for
    all.
    """
    return f"{Path(run_dir).resolve()}|{device}|{weights or ''}"


def _graph_predictor(key: str, model, out_h: int, out_w: int, device: str):
    """Cached _CudaGraphPredictor for a run, or None when capture is unavailable (cached, no
    per-frame retry). CHESSLAB_DISABLE_CUDA_GRAPH=1 forces the eager path.
    """
    if os.environ.get("CHESSLAB_DISABLE_CUDA_GRAPH") == "1":
        return None
    if key in _GRAPH_CACHE:
        return _GRAPH_CACHE[key]
    try:
        pred = _CudaGraphPredictor(model, out_h, out_w, device)
        log.info("CUDA-graph fast path captured for %s (batch %d, fp16).", key, _GRAPH_BATCH)
    except Exception as e:
        log.warning("CUDA-graph capture failed (%s: %s) — using eager forward.",
                    type(e).__name__, e)
        pred = None
    _GRAPH_CACHE[key] = pred
    return pred


def board_cells(cfg: dict) -> int | None:
    """`CELLS`, wenn der Lauf ein BRETT-Netz ist (Zellachse im Batch), sonst None."""
    if not str(cfg.get("backbone", "")).startswith(("board:", "boardattn:")):
        return None
    from .training.boardnet import CELLS

    return CELLS


def _is_plain_rgb(cfg: dict) -> bool:
    """Whether the run's preprocessing is the fixed 3-channel mean/std the graph path folds into
    mul+sub; wrong preprocessing silently is worse than losing the fast path.
    """
    # Ein Lauf mit EIGENEN festen Statistiken wuerde still mit fremder Normalisierung bedient.
    norm = cfg.get("normalize", {})
    mean = tuple(float(v) for v in norm.get("mean", config.NORMALIZE_MEAN))
    std = tuple(float(v) for v in norm.get("std", config.NORMALIZE_STD))
    return (cfg.get("input_repr", "rgb") == "rgb"
            and norm.get("mode", "fixed") != "per_crop"
            and mean == tuple(config.NORMALIZE_MEAN)
            and std == tuple(config.NORMALIZE_STD)
            # CLAHE sitzt in der PIL-Kette; der gefaltete mul+sub liesse es STILL weg.
            and float(cfg.get("clahe_clip", 0.0)) <= 0
            and board_cells(cfg) is None)


def predict_arrays(run_dir: Path, crops: list[np.ndarray], device: str = "cpu",
                   return_probs: bool = False, weights: str | None = None) -> list[dict]:
    """Prediction for in-memory BGR crops: per crop {'pred_label', 'confidence'} in input order;
    `return_probs=True` adds the full softmax in run-class order.
    """
    if not crops:
        return []
    import torch

    from .training.torch_data import infer_size_of

    model, cfg = load_run(run_dir, device, weights)
    classes = cfg["classes"]
    # The size the graph takes (specs/22): the crops' build size would send every crop down the slow
    # path.
    infer_size = infer_size_of(cfg)
    out_h, out_w = infer_size[1], infer_size[0]

    # Fast path when all crops are at inference size — NICHT mit CLAHE: der Pfad ruft die Kette nie
    # auf, und ein Modell ohne sein CLAHE ist ein anderes Modell.
    all_at_size = (float(cfg.get("clahe_clip", 0.0)) <= 0
                   and all(c.shape[0] == out_h and c.shape[1] == out_w for c in crops))

    # CUDA-graph fast path: removes the eager per-kernel launch overhead of the Windows-ROCm wheels.
    logits = None
    if (all_at_size and len(crops) <= _GRAPH_BATCH and _is_plain_rgb(cfg)
            and device.startswith("cuda") and not isinstance(model, _ONNXModel)):
        key = graph_key(run_dir, device, weights)
        pred = _graph_predictor(key, model, out_h, out_w, device)
        if pred is not None:
            try:
                with torch.no_grad():
                    logits = pred(crops)
            except Exception as e:
                log.warning("CUDA-graph replay failed (%s: %s) — falling back to eager.",
                            type(e).__name__, e)
                _GRAPH_CACHE[key] = None
                logits = None

    if logits is None:
        if all_at_size:
            # BGR uint8 HWC -> RGB NCHW float/255 + the run's normalisation; one stack + torch flip,
            # same numerics as the per-crop loop, ~3x cheaper.
            from .training.torch_data import normalize_batch

            stacked = np.stack(crops)  # (N,H,W,3) BGR uint8
            batch = torch.from_numpy(stacked).permute(0, 3, 1, 2).flip(1)  # RGB, copies
            batch = batch.to(dtype=torch.float32).div_(255)
            batch = normalize_batch(cfg, batch).to(device)
        else:
            from PIL import Image

            from .training.torch_data import eval_transform_for

            tf = eval_transform_for(cfg, infer_size)
            batch = torch.stack(
                [tf(Image.fromarray(c[:, :, ::-1].copy())) for c in crops]
            ).to(device)  # BGR->RGB

        # NUR der Torch-Pfad: der ONNX-Export eines Brett-Netzes traegt die Brettachse selbst und
        # nimmt (64, C, H, W).
        cells = None if isinstance(model, _ONNXModel) else board_cells(cfg)
        if cells is not None:
            if batch.shape[0] % cells:
                raise ValueError(
                    f"{Path(run_dir).name} ist ein Brett-Netz und braucht ganze Bretter: "
                    f"{batch.shape[0]} Crops sind kein Vielfaches von {cells}.")
            batch = batch.view(-1, cells, *batch.shape[1:])
        with torch.no_grad():
            if device.startswith("cuda"):
                try:
                    with torch.autocast(device_type="cuda", dtype=torch.float16):
                        logits = model(batch)
                except Exception:
                    logits = model(batch)
            else:
                logits = model(batch)

    with torch.no_grad():
        # The occlusion head's ONE sigmoid coverage unit sits beside the classes: softmaxed with
        # them it bends every probability, and `classes[argmax]` runs off the end.
        cover = None
        if logits.shape[1] == len(classes) + 1:
            logits, cover = logits[:, :-1], torch.sigmoid(logits[:, -1].float()).cpu()
        # ONE device->host transfer: per-row `.tolist()` on a GPU tensor forced 64 syncs (~5 ms).
        probs = torch.softmax(logits.float(), dim=1).cpu()
        conf, idx = probs.max(dim=1)
    probs_np = probs.numpy()
    results: list[dict] = []
    for i, (c, ix) in enumerate(zip(conf.tolist(), idx.tolist(), strict=False)):
        entry: dict = {"pred_label": classes[int(ix)], "confidence": round(float(c), 4)}
        if cover is not None:
            entry["coverage"] = round(float(cover[i]), 4)
        if return_probs:
            entry["probs"] = [round(float(p), 6) for p in probs_np[i]]
        results.append(entry)
    return results


# What a softmax says about occupancy, and whether it names a piece — answered once for every
# consumer.


@dataclass(frozen=True)
class OccupancyObservation:
    """A model's view of the board: occupancy DERIVED from identity, plus class and confidence per
    square where the run has an identity axis — identity tells a shadow from a real move.
    """

    p_occ: dict[str, float]
    p_empty: dict[str, float]
    p_occluded: dict[str, float]
    label: dict[str, str] | None = None
    conf: dict[str, float] | None = None
    # Raw mass on labels the position prior forbids — the "none of the allowed labels fits" escape
    # hatch, from the unconditioned softmax.
    invalid_mass: dict[str, float] = field(default_factory=dict)
    # Only on a conditioned observation. Recovery must read this, or a wrong committed FEN
    # suppresses the contradiction needed to repair it.
    raw: OccupancyObservation | None = None

    def occupied(self, sq: str) -> bool:
        return self.p_occ[sq] > self.p_empty[sq]

    def raw_observation(self) -> OccupancyObservation:
        return self.raw if self.raw is not None else self

    def invalid(self, sq: str) -> float:
        return self.invalid_mass.get(sq, 0.0)

    def invalid_confident(self, sq: str, threshold: float) -> bool:
        """Whether "none of the context-allowed labels fits" wins confidently."""
        return self.raw is not None and self.invalid(sq) >= threshold

def invalid_mass(probs: list[float], classes: list[str],
                 allowed: set[str] | None) -> float:
    """Raw mass on context-forbidden identity labels; `occluded` and the coverage value past
    `classes` are not chess placements.
    """
    if allowed is None:
        return 0.0
    return float(sum(probs[i] for i, cls in enumerate(classes)
                     if cls not in allowed and cls != "occluded"))


def apply_prior(probs: list[float], classes: list[str], allowed: set[str] | None,
                lam: float) -> list[float]:
    """Reweight a square's classes by what chess allows there, then renormalise: `logit + lam *
    log_prior`.

    `lam` stays FINITE so a wrong committed move stays arguable; `occluded` is never penalised.
    """
    if lam <= 0.0 or allowed is None:
        return probs
    penalty = math.exp(-lam)
    out = list(probs)
    for i, cls in enumerate(classes):
        if cls not in allowed and cls != "occluded":
            out[i] = probs[i] * penalty
    total = sum(out[:len(classes)])
    if total <= 0.0:
        return probs
    for i in range(len(classes)):
        out[i] /= total
    return out


def observation_from_probs(per_square_probs: dict[str, list[float]],
                           classes: list[str],
                           possible: dict[str, set[str]] | None = None,
                           prior_lambda: float = 0.0) -> OccupancyObservation:
    """Full softmax per square to occupancy plus identity (Kotlin twin: `Observations.kt`).

    Indices come from the run's own `classes`: 13- and 14-class runs differ, a guessed index
    transposes. A positive `prior_lambda` with `possible` folds in chess legality; at 0.0 the
    pixels decide alone."""
    i_empty = classes.index("empty")
    i_occl = classes.index("occluded") if "occluded" in classes else None

    def read(rows: dict[str, list[float]]) -> OccupancyObservation:
        p_occ: dict[str, float] = {}
        p_empty: dict[str, float] = {}
        p_occluded: dict[str, float] = {}
        label: dict[str, str] = {}
        conf: dict[str, float] = {}
        for sq, probs in rows.items():
            pe = float(probs[i_empty])
            po = float(probs[i_occl]) if i_occl is not None else 0.0
            p_empty[sq] = pe
            p_occluded[sq] = po
            p_occ[sq] = max(0.0, 1.0 - pe - po)                 # sum of piece classes
            top = max(range(len(classes)), key=lambda i: probs[i])
            label[sq] = classes[top]
            conf[sq] = float(probs[top])
        return OccupancyObservation(p_occ=p_occ, p_empty=p_empty, p_occluded=p_occluded,
                                    label=label, conf=conf)

    raw_obs = read(per_square_probs)
    masses = {
        sq: invalid_mass(raw, classes, possible.get(sq) if possible else None)
        for sq, raw in per_square_probs.items()
    }
    raw_obs = replace(raw_obs, invalid_mass=masses)
    if prior_lambda <= 0.0 or possible is None:
        return raw_obs

    conditioned = {
        sq: apply_prior(raw, classes, possible.get(sq), prior_lambda)
        for sq, raw in per_square_probs.items()
    }
    obs = read(conditioned)
    return replace(obs, invalid_mass=masses, raw=raw_obs)
