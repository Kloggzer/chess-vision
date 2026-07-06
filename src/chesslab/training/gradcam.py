"""Grad-CAM — visualize which pixels drove the classifier's decision for a square crop.

Backbone-agnostic: hooks the deepest ``Conv2d`` in the network (works for both
``smallcnn`` and ``mobilenet_v3_small``, any head). Used by ``scripts/gradcam.py``
(CLI) and the web Training page (``/api/runs/{run}/gradcam``).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image


def last_conv(model: nn.Module) -> nn.Conv2d:
    """The deepest Conv2d in forward order — Grad-CAM's target layer."""
    conv = None
    for m in model.modules():
        if isinstance(m, nn.Conv2d):
            conv = m
    if conv is None:
        raise RuntimeError("no Conv2d found in model")
    return conv


def compute_cam(model: nn.Module, x: torch.Tensor, target_layer: nn.Conv2d,
                class_idx: int | None):
    """Return (cam[h,w] in [0,1], chosen_class_idx, prob) for a single input x[1,3,H,W]."""
    acts: dict = {}
    grads: dict = {}
    h1 = target_layer.register_forward_hook(lambda _m, _i, o: acts.__setitem__("a", o))
    h2 = target_layer.register_full_backward_hook(lambda _m, _gi, go: grads.__setitem__("g", go[0]))
    try:
        model.zero_grad(set_to_none=True)
        logits = model(x)                                  # [1, C]
        probs = F.softmax(logits, dim=1).detach()
        if class_idx is None:
            class_idx = int(logits.argmax(dim=1).item())
        logits[0, class_idx].backward()

        a = acts["a"][0]                                   # [K, h, w]
        g = grads["g"][0]                                  # [K, h, w]
        weights = g.mean(dim=(1, 2))                       # [K] GAP of gradients
        cam = F.relu((weights[:, None, None] * a).sum(0))  # [h, w]
        cam = cam - cam.min()
        cam = cam / (cam.max() + 1e-8)
        return cam.detach().cpu().numpy(), class_idx, float(probs[0, class_idx])
    finally:
        h1.remove()
        h2.remove()


def jet(gray: np.ndarray) -> np.ndarray:
    """Cheap jet colormap (blue→green→red), no matplotlib. gray in [0,1] -> RGB uint8."""
    x = np.clip(gray, 0, 1)
    r = np.clip(1.5 - np.abs(4 * x - 3), 0, 1)
    g = np.clip(1.5 - np.abs(4 * x - 2), 0, 1)
    b = np.clip(1.5 - np.abs(4 * x - 1), 0, 1)
    return (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)


def overlay(pil_img: Image.Image, cam: np.ndarray, out_size: tuple[int, int]) -> Image.Image:
    """Blend the (upsampled) CAM heatmap over the crop. out_size = (w, h)."""
    cam_up = np.array(Image.fromarray((cam * 255).astype(np.uint8)).resize(out_size, Image.BILINEAR)) / 255.0
    base = np.asarray(pil_img.resize(out_size)).astype(np.float32)
    heat = jet(cam_up).astype(np.float32)
    blended = (0.45 * heat + 0.55 * base).clip(0, 255).astype(np.uint8)
    return Image.fromarray(blended)


def gradcam_for_run(run_dir: Path, split: str = "test", per_class: int = 1,
                    force_class: str | None = None) -> list[dict]:
    """Generate Grad-CAM overlays for sample crops of a trained run.

    Picks up to ``per_class`` crops for each true class from the run's ``split`` (the
    dataset recorded in the run config), saves ``original`` + ``overlay`` PNGs under
    ``run_dir/gradcam/`` and returns a list of dicts describing each example.
    """
    from .. import config
    from .data import filter_rows_by_split, load_manifest, load_split
    from .evaluate import load_run
    from .torch_data import build_transform

    model, cfg = load_run(run_dir)
    model.eval()
    classes = cfg["classes"]
    out_size = tuple(cfg["out_size"])                      # (w, h)
    tf = build_transform(out_size, train=False)
    layer = last_conv(model)
    forced = classes.index(force_class) if force_class else None

    ds_name = cfg.get("dataset")
    if ds_name:
        from ..dataset_build import dataset_dir
        dd = dataset_dir(ds_name)
        manifest_path, split_path = dd / "manifest.jsonl", dd / "split.json"
    else:
        manifest_path = config.DATA.manifests / "squares.jsonl"
        split_path = config.DATA.manifests / "split.json"
    manifest = load_manifest(manifest_path)
    split_data = load_split(split_path)
    rows = filter_rows_by_split(manifest, split_data, split)

    # up to `per_class` rows per true label, in class order
    picked: list[dict] = []
    for c in classes:
        hits = [r for r in rows if r["label"] == c][:per_class]
        picked.extend(hits)

    out_dir = run_dir / "gradcam"
    out_dir.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []
    for i, r in enumerate(picked):
        img = Image.open(r["path"]).convert("RGB")
        x = tf(img).unsqueeze(0)
        cam, idx, prob = compute_cam(model, x, layer, forced)
        stem = f"{i:02d}_{r['label']}"
        orig_p = out_dir / f"{stem}_orig.png"
        over_p = out_dir / f"{stem}_cam.png"
        img.resize(out_size).save(orig_p)
        overlay(img, cam, out_size).save(over_p)
        results.append({
            "true": r["label"], "pred": classes[idx], "prob": round(prob, 3),
            "orig": orig_p, "overlay": over_p,
        })
    return results


def _center_mask(h: int, w: int, frac: float) -> torch.Tensor:
    """Boolean [h,w] mask, True inside the centered box covering `frac` of each dimension."""
    m = torch.zeros(h, w, dtype=torch.bool)
    dh, dw = int(h * frac), int(w * frac)
    y0, x0 = (h - dh) // 2, (w - dw) // 2
    m[y0:y0 + dh, x0:x0 + dw] = True
    return m


def reliance_for_run(run_dir: Path, split: str = "test", per_class: int = 8,
                     center_frac: float = 0.55) -> list[dict]:
    """Measure where each class's evidence lives: piece (center) vs. background (border ring).

    Mask-free occlusion test (Zeiler & Fergus style): for each crop, blank the centered box
    (where the piece sits) with neutral gray and measure the drop in the true-class probability,
    then do the same for the border ring. ``piece_frac = drop_center / (drop_center + drop_border)``
    — high = decision driven by the figure, low = driven by surrounding board.

    Returns one dict per class: mean base prob, mean center/border drop, and piece_frac.
    """
    from .. import config
    from .data import filter_rows_by_split, load_manifest, load_split
    from .evaluate import load_run

    model, cfg = load_run(run_dir)
    model.eval()
    classes = cfg["classes"]
    out_w, out_h = cfg["out_size"]
    mean = torch.tensor(config.NORMALIZE_MEAN).view(3, 1, 1)
    std = torch.tensor(config.NORMALIZE_STD).view(3, 1, 1)
    gray = 0.5  # neutral occluder value on the [0,1] scale

    ds_name = cfg.get("dataset")
    if ds_name:
        from ..dataset_build import dataset_dir
        dd = dataset_dir(ds_name)
        manifest_path, split_path = dd / "manifest.jsonl", dd / "split.json"
    else:
        manifest_path = config.DATA.manifests / "squares.jsonl"
        split_path = config.DATA.manifests / "split.json"
    manifest = load_manifest(manifest_path)
    split_data = load_split(split_path)
    rows = filter_rows_by_split(manifest, split_data, split)

    from torchvision.transforms.functional import resize, to_tensor

    center = _center_mask(out_h, out_w, center_frac)          # piece region
    border = ~center                                          # background ring

    def _prob(t01: torch.Tensor, cls_idx: int) -> float:
        with torch.no_grad():
            logits = model(((t01 - mean) / std).unsqueeze(0))
            return float(F.softmax(logits, dim=1)[0, cls_idx])

    out: list[dict] = []
    for c in classes:
        hits = [r for r in rows if r["label"] == c][:per_class]
        if not hits:
            continue
        cls_idx = classes.index(c)
        base_l, dc_l, db_l = [], [], []
        for r in hits:
            img = Image.open(r["path"]).convert("RGB")
            t = to_tensor(resize(img, [out_h, out_w]))        # [3,H,W] in [0,1]
            base = _prob(t, cls_idx)
            tc = t.clone(); tc[:, center] = gray              # piece hidden
            tb = t.clone(); tb[:, border] = gray              # background hidden
            base_l.append(base)
            dc_l.append(max(0.0, base - _prob(tc, cls_idx)))
            db_l.append(max(0.0, base - _prob(tb, cls_idx)))
        dc, db = sum(dc_l) / len(dc_l), sum(db_l) / len(db_l)
        piece_frac = dc / (dc + db + 1e-8)
        out.append({
            "cls": c, "n": len(hits),
            "base_prob": round(sum(base_l) / len(base_l), 3),
            "drop_center": round(dc, 3), "drop_border": round(db, 3),
            "piece_frac": round(piece_frac, 3),
        })
    return out
