"""Learning-rate range test: find the usable band of peak rates instead of inheriting one.

Every learning rate in this project is `3e-04`, and nobody chose it. That matters most for the
normalization question: BatchNorm's headline benefit in the literature is that it tolerates LARGER
learning rates than an unnormalized or differently-normalized net (Bjorck et al., "Understanding
Batch Normalization", arXiv:1806.02375), so comparing BN against GroupNorm at GroupNorm's rate
removes the very thing BN is supposed to bring. This script measures each norm's own band.

The method is Smith's (arXiv:1506.01186): train one short run while raising the learning rate
geometrically from far-too-small to far-too-large, and watch where the loss starts falling and where
it blows up. What comes out is a curve, not a number — a grid of three guessed rates cannot say
where the edge is, and the edge is the interesting part.

Deliberately NOT a training run: no checkpoint, no schedule, no early stopping, and it does not take
the single-GPU training lock. It reuses the real train split, the real transforms and the real class
weights, because a band measured on a different pipeline would not transfer.

    uv run python scripts/lr_range_test.py --dataset occ-real6a --norm batchnorm
    uv run python scripts/lr_range_test.py --dataset occ-real6a --norm groupnorm
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

os.environ.setdefault("PYTORCH_ALLOC_CONF", "expandable_segments:True")


def main() -> int:
    import numpy as np
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader

    from chesslab import config
    from chesslab.dataset import subsample_classes
    from chesslab.dataset_build import dataset_dir
    from chesslab.training.data import filter_rows_by_split, load_manifest, load_split
    from chesslab.training.engine import get_device
    from chesslab.training.model import build_model
    from chesslab.training.torch_data import (
        SquareDataset,
        build_transform,
        class_weights_tensor,
    )

    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--norm", required=True, choices=("batchnorm", "groupnorm", "none"))
    ap.add_argument("--backbone", default="mobilenetv4_conv_small_035")
    ap.add_argument("--head", default="combined")
    ap.add_argument("--scales", default="48,64,80,96",
                    help="mirror the training recipe: one size drawn per batch")
    ap.add_argument("--batch-size", type=int, default=256)
    ap.add_argument("--num-workers", type=int, default=8)
    ap.add_argument("--iters", type=int, default=300)
    ap.add_argument("--lr-min", type=float, default=1e-7)
    ap.add_argument("--lr-max", type=float, default=1.0)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--erase-p", type=float, default=0.25)
    ap.add_argument("--bg-p", type=float, default=0.6)
    ap.add_argument("--csv", default=None, help="write the raw curve here")
    args = ap.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    dd = dataset_dir(args.dataset)
    manifest, split = load_manifest(dd / "manifest.jsonl"), load_split(dd / "split.json")
    classes = split["classes"]
    out_size = tuple(next(iter(manifest))["out_size"])
    ts = split.get("train_subsample") or {}
    train_rows = subsample_classes(filter_rows_by_split(manifest, split, "train"),
                                   max_empty_ratio=ts.get("max_empty_ratio"),
                                   max_class_ratio=ts.get("max_class_ratio"),
                                   seed=ts.get("seed", args.seed))
    from dataclasses import replace
    policy = replace(config.AUGMENT, erase_p=args.erase_p, bg_p=args.bg_p)
    tf = build_transform(out_size, train=True, policy=policy, per_crop=False, input_repr="rgb")
    ds = SquareDataset(train_rows, classes, tf, bg_randomize=True, policy=policy)
    dl = DataLoader(ds, batch_size=args.batch_size, shuffle=True, drop_last=True,
                    num_workers=args.num_workers, persistent_workers=args.num_workers > 0)

    device = get_device(require_gpu=True)
    model = build_model(args.backbone, len(classes), pretrained=False, norm=args.norm,
                        head=args.head, classes=classes, in_chans=3).to(device)
    crit = nn.CrossEntropyLoss(weight=class_weights_tensor(split, classes).to(device))
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr_min)
    scales = [int(s) for s in args.scales.split(",") if s.strip()]
    rng = np.random.default_rng(args.seed)

    # Geometric ramp: the interesting range spans seven orders of magnitude, so equal STEPS would
    # spend almost every iteration in the part that is uselessly small.
    mult = (args.lr_max / args.lr_min) ** (1.0 / max(1, args.iters - 1))
    print(f"[range] {args.norm}: {args.iters} iterations, lr {args.lr_min:.1e} -> {args.lr_max:.1e} "
          f"(x{mult:.4f} per step), {len(train_rows)} train crops, scales={scales}")

    lrs: list[float] = []
    raw: list[float] = []
    smooth: list[float] = []
    avg, beta, best = 0.0, 0.98, float("inf")
    lr = args.lr_min
    model.train()
    it = 0
    stop = None
    while it < args.iters and stop is None:
        for x, y in dl:
            if it >= args.iters:
                break
            for g in opt.param_groups:
                g["lr"] = lr
            s = int(rng.choice(scales))
            xb = torch.nn.functional.interpolate(x.to(device, non_blocking=True), size=(s, s),
                                                 mode="bilinear", align_corners=False)
            loss = crit(model(xb), y.to(device, non_blocking=True))
            opt.zero_grad(set_to_none=True)
            loss.backward()
            opt.step()

            v = float(loss.detach())
            # Bias-corrected exponential average: the raw per-batch loss is far too noisy to read an
            # edge off, and the correction keeps the first few points from being pulled to zero.
            avg = beta * avg + (1 - beta) * v
            sm = avg / (1 - beta ** (it + 1))
            lrs.append(lr)
            raw.append(v)
            smooth.append(sm)
            best = min(best, sm)
            if it > 10 and (sm > 4 * best or not np.isfinite(sm)):
                stop = f"diverged at lr {lr:.2e} (smoothed loss {sm:.3f} vs best {best:.3f})"
                break
            it += 1
            lr *= mult

    a_lr, a_sm = np.array(lrs), np.array(smooth)
    if args.csv:
        Path(args.csv).write_text(
            "lr,loss_raw,loss_smooth\n"
            + "".join(f"{a},{b},{c}\n" for a, b, c in zip(lrs, raw, smooth, strict=True)),
            encoding="utf-8")
        print(f"[range] curve -> {args.csv}")

    print(f"\n{'lr':>10}{'loss (smoothed)':>18}")
    for i in range(0, len(a_lr), max(1, len(a_lr) // 24)):
        print(f"{a_lr[i]:10.2e}{a_sm[i]:18.4f}")
    if stop:
        print(f"\n[range] {stop}")

    i_min = int(np.argmin(a_sm))
    # The steepest descent of the smoothed loss per log-decade of lr. This is the point Smith's
    # method points at, and it sits BELOW the minimum on purpose: at the minimum the loss has
    # already stopped improving, so a schedule that starts there begins in the part of the band
    # that no longer buys anything.
    if len(a_lr) > 12:
        d = np.gradient(a_sm, np.log10(a_lr))
        lo, hi = 5, max(6, i_min + 1)
        i_steep = int(np.argmin(d[lo:hi])) + lo
        print(f"\n  steepest descent : lr {a_lr[i_steep]:.2e}   (loss {a_sm[i_steep]:.4f})")
    print(f"  minimum loss     : lr {a_lr[i_min]:.2e}   (loss {a_sm[i_min]:.4f})")
    print(f"  last lr reached  : lr {a_lr[-1]:.2e}   (loss {a_sm[-1]:.4f})")
    print("\nRead the band, not the number: usable rates start where the curve turns down and end "
          "where it turns up.\nA peak rate is normally taken from the steep part, not from the "
          "minimum. This measures OPTIMISATION only —\nthis project selects models on phantoms, so "
          "whatever the curve suggests still has to win on sweep_infer_size.py.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
