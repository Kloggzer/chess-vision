"""Grad-CAM (Selvaraju et al.) on the deepest spatial `Conv2d`: which pixels drove a square's
decision. The "reliance" number derived from it is this project's own construction.
"""

from __future__ import annotations

import random
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image


def _crop_reader(ds_name: str | None, rows: list[dict] | None = None):
    """`row -> PIL.Image` from the packed memmap when there is one (required for mm:// rows), else
    disk. `resolve_dataset_packs` FIRST, like `run_eval`; `.packed` tells the caller for
    `cfg_for_pack`.
    """
    from .. import config
    from .packs import open_dataset_pack, open_packed_memmap

    packed = open_dataset_pack(ds_name, config.DATA)
    if packed is None or rows is None:
        def _read(r: dict) -> Image.Image:
            p = str(r["path"])
            if p.startswith("mm://"):
                raise ValueError(f"dataset '{ds_name}' has mm:// paths — a fused synth build or a "
                                 "pack-built dataset — but no usable memmap: re-run `chesslab "
                                 "dataset build-synth`, or check that dataset.yaml still names "
                                 "its packs under data/packs/.")
            return Image.open(p).convert("RGB")
        _read.packed = None
        return _read
    from .packs import _pack_index

    files, idx = _pack_index(rows, packed)
    at = {str(r["path"]): (int(idx[i][0]), int(idx[i][1])) for i, r in enumerate(rows)}
    mm: dict[int, object] = {}

    def _read(r: dict) -> Image.Image:
        hit = at.get(str(r["path"]))
        if hit is None:
            return Image.open(str(r["path"])).convert("RGB")
        pack_no, row_no = hit
        if pack_no not in mm:
            mm[pack_no] = open_packed_memmap(*files[pack_no])
        return Image.fromarray(np.array(mm[pack_no][row_no]))
    _read.packed = packed
    return _read


def _diverse_sample(rows: list[dict], per_class: int, seed: int = 42) -> list[dict]:
    """Up to `per_class` rows, round-robin over DISTINCT (session_id, square) groups: static pieces
    repeat near-identical frames. Seeded, so deterministic across reloads.
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
        if not added:
            break
        depth += 1
    return picked


def last_conv(model: nn.Module) -> nn.Conv2d:
    """The deepest Conv2d with kernel > 1: a 1x1 conv gives no spatial structure, the CAM becomes a
    blob.
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


def class_logits(logits: torch.Tensor, n_classes: int | None) -> torch.Tensor:
    """Nur die Klassenspalten: die SIGMOID-Coverage des Occlusion-Kopfs mischte sich sonst in jede
    Wahrscheinlichkeit.
    """
    return logits if not n_classes or logits.shape[1] <= n_classes else logits[:, :n_classes]


def compute_cam(model: nn.Module, x: torch.Tensor, target_layer: nn.Conv2d,
                class_idx: int | None, n_classes: int | None = None):
    """(cam[h,w] in [0,1], chosen_class_idx, prob) for one input x[1,3,H,W]; `n_classes` cuts an
    occlusion run's coverage column.
    """
    acts: dict = {}
    grads: dict = {}
    h1 = target_layer.register_forward_hook(lambda _m, _i, o: acts.__setitem__("a", o))
    h2 = target_layer.register_full_backward_hook(lambda _m, _gi, go: grads.__setitem__("g", go[0]))
    try:
        model.zero_grad(set_to_none=True)
        logits = class_logits(model(x), n_classes)         # [1, C]
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
    """Where each class's evidence lives: blank the centre (the piece), then the border ring, with
    grey and compare the true-class drops. `piece_frac` high = the figure decides. One dict per
    class.
    """
    from .. import config
    from ..dataset import load_manifest, load_split
    from .data import dataset_paths, filter_rows_by_split
    from .evaluate import load_run

    model, cfg = load_run(run_dir)
    model.eval()
    classes = cfg["classes"]
    if center_frac is None:
        # Die Figurenregion ist die ZELLE im Crop, mit dem Zuschnitt des LAUFS (specs/45), nicht dem
        # Profil dieser Maschine.
        center_frac = 1.0 / (1.0 + 2.0 * float(cfg.get("pad_side", config.CROP.pad_side)))
    # Die EINE Transformation des Laufs, mit CLAHE und Eingangs-Darstellung, in der Groesse des
    # GRAPHEN; von Hand nachgebaut mass sie in einer anderen Domaene.
    from .torch_data import eval_transform_for, infer_size_of
    out_w, out_h = infer_size_of(cfg)
    gray = 0.5  # neutral occluder value on the [0,1] scale

    ds_name = cfg.get("dataset")
    # Der Split des LAUFS: ein Fold traegt `split-f<i>.json`.
    manifest_path, split_path = dataset_paths(cfg.get("dataset"), cfg.get("split_file"))
    manifest = load_manifest(manifest_path)
    split_data = load_split(split_path)
    # Benotet wird, was der Verlust lernt; Verdeckung trifft Klassen ungleich, sonst liefe jede
    # Klasse auf einer anderen Zellmenge.
    from ..cell_rule import classification_eligible

    rows = [r for r in filter_rows_by_split(manifest, split_data, split)
            if classification_eligible(r)]

    from torchvision.transforms.functional import resize, to_pil_image, to_tensor

    center = _center_mask(out_h, out_w, center_frac)          # piece region
    border = ~center                                          # background ring

    def _prob(t01: torch.Tensor, cls_idx: int) -> float:
        # Verdeckt wird das BILD, dann laeuft die echte Kette darauf — sonst saehe CLAHE ein fremdes
        # Histogramm.
        with torch.no_grad():
            logits = class_logits(model(tf(to_pil_image(t01)).unsqueeze(0)), len(classes))
            return float(F.softmax(logits, dim=1)[0, cls_idx])

    read_crop = _crop_reader(ds_name, rows)
    from .packs import cfg_for_pack

    run_cfg = cfg_for_pack(cfg, ds_name, getattr(read_crop, "packed", None), (out_w, out_h))
    tf = eval_transform_for(run_cfg, out_size=(out_w, out_h))
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
