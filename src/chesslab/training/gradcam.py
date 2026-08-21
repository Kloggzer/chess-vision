"""Grad-CAM — visualize which pixels drove the classifier's decision for a square crop.

Backbone-agnostic: hooks the deepest ``Conv2d`` in the network (works for both
``smallcnn`` and ``mobilenet_v3_small``, any head). Used by ``scripts/gradcam.py``
(CLI) and the web Training page (``/api/runs/{run}/gradcam``).

The method is Selvaraju et al. (docs/references.md#selvaraju-2016), which names identifying
dataset bias among its uses — that is exactly what it was used for here, producing the measurement
that a knight's prediction relied 8% on the piece and 43% on the board around it. The "reliance"
number derived from the map is this project's own construction, not the paper's.
"""

from __future__ import annotations

import random
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image


def _crop_reader(ds_name: str | None):
    """Return ``row -> PIL.Image`` that reads from the packed memmap when the dataset has one
    (required for fused builds, whose mm:// rows have no files) and from disk otherwise."""
    packed = None
    if ds_name:
        from .pack import load_packed, open_packed_memmap
        packed = load_packed(ds_name)
    if packed is None:
        def _read(r: dict) -> Image.Image:
            p = str(r["path"])
            if p.startswith("mm://"):
                raise ValueError(f"dataset '{ds_name}' is a fused synth build but its packed "
                                 "memmap is missing/stale — re-run `chesslab dataset build-synth`.")
            return Image.open(p).convert("RGB")
        return _read
    path, shape, p2i = packed
    mm = open_packed_memmap(path, shape)

    def _read(r: dict) -> Image.Image:
        idx = p2i.get(str(r["path"]))
        if idx is None:
            return Image.open(str(r["path"])).convert("RGB")
        return Image.fromarray(np.array(mm[idx]))
    return _read


def _diverse_sample(rows: list[dict], per_class: int, seed: int = 42) -> list[dict]:
    """Pick up to ``per_class`` rows preferring DISTINCT (session_id, square) combos.

    Real test splits are sliced from recorded game sessions: static pieces (kings!)
    contribute dozens of near-identical frames of the same piece on the same square,
    so taking the first N manifest rows shows one frame N times. Instead, group rows
    by (session_id, square) and round-robin across the groups — every distinct
    piece/lighting situation is represented before any near-duplicate frame repeats.
    Group order and the frame picked within a group are seeded-shuffled, so the
    sample is deterministic across reloads but not biased to manifest order. When a
    class has fewer rows than ``per_class``, all rows are returned.
    """
    if len(rows) <= per_class:
        return list(rows)
    rng = random.Random(seed)
    groups: dict[tuple, list[dict]] = {}
    for r in rows:
        groups.setdefault((r.get("session_id"), r.get("square")), []).append(r)
    keys = sorted(groups, key=str)          # deterministic base order, then seeded shuffle
    rng.shuffle(keys)
    for k in keys:
        rng.shuffle(groups[k])              # which frame of a static piece we show
    picked: list[dict] = []
    depth = 0
    while len(picked) < per_class:
        added = False
        for k in keys:
            if depth < len(groups[k]):
                picked.append(groups[k][depth])
                added = True
                if len(picked) >= per_class:
                    break
        if not added:                       # all groups exhausted (can't happen: len(rows) > per_class)
            break
        depth += 1
    return picked


def last_conv(model: nn.Module) -> nn.Conv2d:
    """The deepest spatially meaningful Conv2d — Grad-CAM's target layer.

    Skips 1×1 convs (projection/expansion layers common at the end of MobileNet
    architectures). A 1×1 conv produces no spatial heatmap structure — the CAM
    becomes a uniform blob that looks like "nothing happened". Instead we pick the
    deepest conv with kernel > 1 (usually the last 3×3 or 5×5 depthwise/regular conv
    in the feature extractor).
    """
    last_spatial: nn.Conv2d | None = None
    last_any: nn.Conv2d | None = None
    for m in model.modules():
        if isinstance(m, nn.Conv2d):
            last_any = m
            if m.kernel_size != (1, 1):
                last_spatial = m
    conv = last_spatial or last_any
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


def _center_mask(h: int, w: int, frac: float) -> torch.Tensor:
    """Boolean [h,w] mask, True inside the centered box covering `frac` of each dimension."""
    m = torch.zeros(h, w, dtype=torch.bool)
    dh, dw = int(h * frac), int(w * frac)
    y0, x0 = (h - dh) // 2, (w - dw) // 2
    m[y0:y0 + dh, x0:x0 + dw] = True
    return m


def reliance_for_run(run_dir: Path, split: str = "test", per_class: int = 8,
                     center_frac: float | None = None, seed: int = 42) -> list[dict]:
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
    if center_frac is None:
        # The "piece region" of a crop is the CELL inside it: crop width = cell * (1 + 2*pad_side)
        # (labeling.crop_square), so center_frac = 1/(1+2*pad_side) ~ 0.83 at pad_side 0.10.
        # The old hardcoded 0.55 was authored for the 128x176 pad_up-0.35 crops, where the piece
        # floated small inside a tall crop; on today's tight square crops it missed the whole
        # silhouette — tall pieces (kings!) scored piece_frac ~0 although the model reads them.
        center_frac = 1.0 / (1.0 + 2.0 * config.CROP.pad_side)
    mean = torch.tensor(config.NORMALIZE_MEAN).view(3, 1, 1)
    std = torch.tensor(config.NORMALIZE_STD).view(3, 1, 1)
    gray = 0.5  # neutral occluder value on the [0,1] scale

    ds_name = cfg.get("dataset")
    if ds_name:
        from ..dataset_build import dataset_dir
        dd = dataset_dir(ds_name)
        manifest_path, split_path = dd / "manifest.jsonl", dd / "split.json"
    else:
        manifest_path = config.DATA.crop_pool / "manifest.jsonl"
        split_path = config.DATA.reports / "split.json"
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

    read_crop = _crop_reader(ds_name)
    out: list[dict] = []
    for c in classes:
        hits = _diverse_sample([r for r in rows if r["label"] == c], per_class, seed=seed)
        if not hits:
            continue
        cls_idx = classes.index(c)
        base_l, dc_l, db_l = [], [], []
        for r in hits:
            img = read_crop(r)
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
