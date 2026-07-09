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
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from . import config, labeling

log = logging.getLogger("chesslab.serving")

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

_CACHE: dict[str, tuple] = {}


def clear_cache() -> None:
    """Clear model cache (Windows file locks, run deletion)."""
    _CACHE.clear()


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
            import onnxruntime  # noqa: F401
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
    if all_at_size:
        # BGR uint8 HWC -> RGB NCHW float/255 + Normalize, no PIL/torchvision
        stacked = np.stack([c[..., ::-1].copy() for c in crops])  # (N,H,W,3) RGB
        batch = torch.from_numpy(stacked).permute(0, 3, 1, 2).contiguous()
        batch = batch.to(dtype=torch.float32).div_(255)
        mean_t = torch.tensor(config.NORMALIZE_MEAN, dtype=torch.float32).view(1, 3, 1, 1)
        std_t = torch.tensor(config.NORMALIZE_STD, dtype=torch.float32).view(1, 3, 1, 1)
        batch = (batch - mean_t) / std_t
        batch = batch.to(device)
    else:
        from PIL import Image

        from .training.torch_data import build_transform

        tf = build_transform(out_size, train=False)
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
        probs = torch.softmax(logits.float(), dim=1)
        conf, idx = probs.max(dim=1)
    results: list[dict] = []
    for i, (c, ix) in enumerate(zip(conf.tolist(), idx.tolist(), strict=False)):
        entry: dict = {"pred_label": classes[int(ix)], "confidence": round(float(c), 4)}
        if return_probs:
            entry["probs"] = [round(float(p), 6) for p in probs[i].tolist()]
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