"""Canonical inference entry point: run specification, loading, crops & prediction.

This is the **only** supported public facade for model inference.
Consumers (web inference, CNN recovery in move_tracker, CLI evaluation)
use exclusively this module. It ensures that the **same** crop/photometry
pipeline is used as during training — thus train/serve parity is guaranteed.

Rules:
- torch/PIL only lazy-imported in function bodies (ROCm-Windows: CLI/web must start
  without GPU stack).
- Never imports `chesslab.web` (no circular import).
- Geometry implementation stays in `labeling` (no copy).
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from . import config, labeling

log = logging.getLogger("chesslab.serving")

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

_CACHE: dict[str, tuple] = {}
_GRAPH_CACHE: dict[str, object] = {}  # run key+device -> _CudaGraphPredictor | None (=failed)


def clear_cache() -> None:
    """Clear model cache (Windows file locks, run deletion)."""
    _CACHE.clear()
    _GRAPH_CACHE.clear()


# ---------------------------------------------------------------------------
# Run specification
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class RunSpec:
    """Self-describing specification of a trained model run.

    Tells all consumers how to crop a frame for this model."""
    run_dir: Path
    classes: list[str]
    out_size: tuple[int, int]   # (W, H)
    geometry: str               # "warp" | "box3d"
    photometry: str             # "none" | "clahe" | "grayworld" | "gamma"
    piece_height_cells: float


def run_spec(run_dir: Path) -> RunSpec:
    """Resolve run specification for a model directory.

    Resolution:
    1. config.json["variant"] (new, written by `training.train` since Rework 01).
    2. Fallback: labeling.variant_of_run(run_dir) scans the associated manifest.
    3. Fallback-fallback: ("warp", "none", EXP_PIECE_HEIGHT_CELLS) with warning.
    """
    run_dir = Path(run_dir)
    cfg_path = run_dir / "config.json"
    if not cfg_path.exists():
        raise FileNotFoundError(f"No config.json in {run_dir}")

    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    classes = cfg.get("classes", config.CLASSES)
    out_size_raw = cfg.get("out_size", [96, 128])
    out_size = (int(out_size_raw[0]), int(out_size_raw[1]))

    variant = cfg.get("variant")
    if variant and isinstance(variant, dict):
        return RunSpec(
            run_dir=run_dir,
            classes=classes,
            out_size=out_size,
            geometry=variant.get("geometry", "warp"),
            photometry=variant.get("photometry", "none"),
            piece_height_cells=float(variant.get("piece_height_cells", config.EXP_PIECE_HEIGHT_CELLS)),
        )

    # Fallback 1: Manifest scan
    try:
        geometry, photometry, piece_height_cells = labeling.variant_of_run(run_dir)
    except Exception:
        geometry, photometry, piece_height_cells = "warp", "none", config.EXP_PIECE_HEIGHT_CELLS

    if variant is None:
        log.warning("Run %s has no 'variant' field in config.json — falling back to manifest scan: "
                    "geometry=%s photometry=%s piece_height_cells=%.2f",
                    run_dir.name, geometry, photometry, piece_height_cells)

    return RunSpec(
        run_dir=run_dir,
        classes=classes,
        out_size=out_size,
        geometry=geometry,
        photometry=photometry,
        piece_height_cells=float(piece_height_cells),
    )


def model_classes(run_dir: Path) -> list[str]:
    """Class list of a run (short wrapper around run_spec)."""
    return run_spec(run_dir).classes


class _ONNXModel:
    """Wrapper that makes an ONNX InferenceSession behave like a PyTorch model
    (callable, .eval(), .to(device))."""

    def __init__(self, onnx_path: str, device: str = "cpu"):
        import onnxruntime
        providers = (["CUDAExecutionProvider", "CPUExecutionProvider"] if device == "cuda"
                     else ["CPUExecutionProvider"])
        # Errors only: models exported with a batch-1 example carry a static {1,N}
        # output shape in their metadata; ORT then warns on every batched call
        # (VerifyOutputSizes). Numerically harmless — silence it for existing models
        # (new exports use a batch-2 example and are properly dynamic).
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


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------


def load_run(run_dir: Path, device: str = "cpu"):
    """Load model + run config from a run directory and cache them.
    Prefers ONNX when available (model.onnx) — ONNX Runtime is 2-4× faster
    than raw PyTorch inference.

    Returns (model, cfg). The model is in eval() mode and on `device`.
    """
    key = str(Path(run_dir).resolve())
    if key in _CACHE:
        model, cfg = _CACHE[key]
        model.to(device)
        return model, cfg

    onnx_path = Path(run_dir) / "model.onnx"
    if onnx_path.exists():
        try:
            import onnxruntime
            # ONNX is only a win when it can actually serve the REQUESTED device. This
            # onnxruntime build ships CPU-only providers on Windows — preferring ONNX for a
            # device="cuda" caller silently downgraded tracker inference to CPU while torch
            # (ROCm/HIP) had a perfectly good GPU path. GPU wanted + no GPU provider -> torch.
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

    model, cfg = _load_run(Path(run_dir))
    model.eval().to(device)
    _CACHE[key] = (model, cfg)
    return model, cfg


# ---------------------------------------------------------------------------
# Crops
# ---------------------------------------------------------------------------


def crops_for_model(frame: np.ndarray, corners, profile, spec: RunSpec) -> list[np.ndarray]:
    """64 BGR crops (order `labeling.all_squares()`) for one frame,
    exactly with the geometry/photometry of the given `RunSpec`.

    Thin wrapper around `labeling.crops_for_frame` — the geometry implementation
    stays there (single source of truth).
    """
    out_size = spec.out_size
    return labeling.crops_for_frame(
        frame, corners, profile,
        geometry=spec.geometry,
        photometry=spec.photometry,
        piece_height_cells=spec.piece_height_cells,
        out_size=out_size,
    )


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

# Fixed capture size for the CUDA/HIP-graph fast path: the tracker's hot path is
# always the full board (64 crops); smaller local-verify batches reuse the same
# graph by writing into the head of the static buffer.
_GRAPH_BATCH = 64


class _CudaGraphPredictor:
    """CUDA/HIP-graph replay of a fixed-shape fp16 forward pass.

    On the Windows-ROCm wheels an eager forward launches hundreds of tiny
    kernels, so for the tracker models GPU inference is almost pure launch/
    framework overhead (tiny 0.64M: ~6.4 ms eager vs ~2.2 ms graph replay for
    64 crops @128; medium 8.45M: ~19 ms vs ~13 ms). Capturing the forward once
    and replaying it removes the per-kernel launch cost.

    Details:
    - Runs an fp16 copy of the model — same precision class as the autocast
      fp16 the eager CUDA path already used (measured argmax parity vs fp32 on
      real crops: 100% tiny / 99.8% medium, max prob delta ~0.005).
    - Static input of ``_GRAPH_BATCH`` rows. Smaller batches fill only the head;
      stale tail rows are harmless (eval-mode batchnorm — no cross-sample
      interaction) and are sliced off the output.
    - Preprocessing: one ``np.stack`` into a pinned staging buffer, async H2D
      copy, then BGR->RGB flip + normalize on the GPU (folded to one mul+sub) —
      ~0.8 ms vs ~8 ms for the per-crop numpy path.
    """

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
        # Warm-up on a side stream, then capture (standard torch.cuda.graph recipe).
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
        """``crops``: up to ``_GRAPH_BATCH`` BGR uint8 HWC arrays at model out_size.
        Returns float32 logits ``(len(crops), n_classes)`` on the GPU."""
        import torch

        n = len(crops)
        np.stack(crops, out=self._pin.numpy()[:n])
        gpu = self._pin[:n].to(self._device, non_blocking=True)
        x = gpu.permute(0, 3, 1, 2).flip(1).to(torch.float16) * self._scale - self._shift
        self._static_in[:n].copy_(x)
        self._graph.replay()
        return self._static_out[:n].float()


def _graph_predictor(key: str, model, out_h: int, out_w: int, device: str):
    """Cached _CudaGraphPredictor for a run, or None when capture is unavailable.

    A failed capture is cached as None so we do not retry (and re-log) per frame.
    Opt-out: set CHESSLAB_DISABLE_CUDA_GRAPH=1 to always use the eager path.
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


def _is_plain_rgb(cfg: dict) -> bool:
    """Whether the run's preprocessing is the one `_CudaGraphPredictor` bakes in.

    That path folds a FIXED 3-channel mean/std into a single mul+sub. A run trained on another
    input representation (`--input-repr`) or on per-crop statistics does not fit the fold, and
    feeding it the wrong preprocessing silently is worse than losing the fast path.
    """
    return (cfg.get("input_repr", "rgb") == "rgb"
            and cfg.get("normalize", {}).get("mode", "fixed") != "per_crop")


def predict_arrays(run_dir: Path, crops: list[np.ndarray], device: str = "cpu",
                   return_probs: bool = False) -> list[dict]:
    """Prediction for in-memory crops (BGR np.ndarray) — for live inference.

    Returns per crop {'pred_label', 'confidence'} in input order.
    `return_probs=True` adds 'probs': list[float] (full softmax,
    order = classes from the run config).
    """
    if not crops:
        return []
    import torch

    model, cfg = load_run(run_dir, device)
    classes = cfg["classes"]
    out_size = tuple(cfg["out_size"])
    out_h, out_w = out_size[1], out_size[0]

    # Fast path: when all crops are already at out_size, vectorize preprocessing
    all_at_size = all(c.shape[0] == out_h and c.shape[1] == out_w for c in crops)

    # CUDA-graph fast path (torch model on GPU, uniform crops, <= capture size):
    # replays a pre-captured fp16 forward — removes the eager per-kernel launch
    # overhead that dominates tracker inference on the Windows-ROCm wheels.
    logits = None
    if (all_at_size and len(crops) <= _GRAPH_BATCH and _is_plain_rgb(cfg)
            and device.startswith("cuda") and not isinstance(model, _ONNXModel)):
        key = f"{Path(run_dir).resolve()}|{device}"
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
            # BGR uint8 HWC -> RGB NCHW float/255 + the run's normalisation, no PIL/torchvision.
            # One stack of the raw BGR crops + torch flip: same numerics as the
            # previous per-crop `[..., ::-1].copy()` loop, ~3x cheaper.
            from .training.torch_data import normalize_batch

            stacked = np.stack(crops)  # (N,H,W,3) BGR uint8
            batch = torch.from_numpy(stacked).permute(0, 3, 1, 2).flip(1)  # RGB, copies
            batch = batch.to(dtype=torch.float32).div_(255)
            batch = normalize_batch(cfg, batch).to(device)
        else:
            from PIL import Image

            from .training.torch_data import eval_transform_for

            tf = eval_transform_for(cfg, out_size)
            batch = torch.stack(
                [tf(Image.fromarray(c[:, :, ::-1].copy())) for c in crops]
            ).to(device)  # BGR->RGB

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
        # ONE device->host transfer for the whole batch: per-row `probs[i].tolist()`
        # on a GPU tensor forced 64 separate syncs (~5 ms of the observation).
        probs = torch.softmax(logits.float(), dim=1).cpu()
        conf, idx = probs.max(dim=1)
    probs_np = probs.numpy()
    results: list[dict] = []
    for i, (c, ix) in enumerate(zip(conf.tolist(), idx.tolist(), strict=False)):
        entry: dict = {"pred_label": classes[int(ix)], "confidence": round(float(c), 4)}
        if return_probs:
            entry["probs"] = [round(float(p), 6) for p in probs_np[i]]
        results.append(entry)
    return results


def predict_rows(run_dir: Path, rows: list[dict], device: str = "cpu",
                 batch_size: int = 64) -> list[dict]:
    """For each manifest row: {'pred_label', 'confidence'} (order matches `rows`)."""
    if not rows:
        return []
    import torch
    from torch.utils.data import DataLoader

    from .training.torch_data import SquareDataset, build_transform

    model, cfg = load_run(run_dir, device)
    classes = cfg["classes"]
    out_size = tuple(cfg["out_size"])
    # Fused datasets (mm:// rows) have no crop files — route through the packed memmap.
    if rows and str(rows[0].get("path", "")).startswith("mm://"):
        from .training.pack import load_packed
        packed = load_packed(cfg.get("dataset")) if cfg.get("dataset") else None
        if packed is None:
            raise ValueError("fused dataset without a valid packed memmap — re-run "
                             "`chesslab dataset build-synth`.")
        from .training.torch_data import PackedSquareDataset
        ds = PackedSquareDataset(rows, classes, build_transform(out_size, train=False), packed)
    else:
        ds = SquareDataset(rows, classes, build_transform(out_size, train=False))
    loader = DataLoader(ds, batch_size=batch_size, shuffle=False)

    results: list[dict] = []
    with torch.no_grad():
        for x, _ in loader:
            x = x.to(device)
            probs = torch.softmax(model(x), dim=1)
            conf, idx = probs.max(dim=1)
            for c, i in zip(conf.tolist(), idx.tolist(), strict=False):
                results.append({"pred_label": classes[int(i)], "confidence": round(float(c), 4)})
    return results


def predict_frame(run_dir: Path, frame: np.ndarray, corners, profile,
                  device: str = "cpu", return_probs: bool = False) -> list[dict]:
    """Full pipeline for one frame: run_spec + crops_for_model + predict_arrays.

    Result per square: {"square": "a8", "pred_label": ..., "confidence": ...[, "probs": ...]}.
    """
    spec = run_spec(run_dir)
    crops = crops_for_model(frame, corners, profile, spec)
    preds = predict_arrays(run_dir, crops, device=device, return_probs=return_probs)
    squares = labeling.all_squares()
    return [{"square": sq, **p} for sq, p in zip(squares, preds, strict=False)]