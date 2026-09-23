"""Re-estimate a run's BatchNorm statistics at ONE deployment resolution (AdaBN).

AdaBN is Li et al. (docs/references.md#li-2016): adapt by re-estimating the statistics in every
BatchNorm layer, changing no learned parameter. The published setting is a change of DOMAIN; here
the change is one of input RESOLUTION within a single domain, which the paper does not measure.
The per-scale variant is domain-specific BN (docs/references.md#chang-2019), with the same
substitution of "scale" for "domain".


Why this exists
---------------
Multi-scale training (`train.py`, `scales: [32, 64, 96, 128]`) pushes four resolutions through a
SINGLE set of `running_mean`/`running_var`. The averaged statistic fits none of them, which is how
a batch-norm run ends up reading every occupied square as empty at 32 px while the same weights are
fine at 128. But nothing deployed is multi-scale: `infer_size` is one number per model.

So the fix does not need a statistic that serves four scales — it needs four statistics, of which
exactly one ships. This script produces that one, without touching a single gradient: the weights,
`weight` and `bias` are trained knowledge and stay byte-identical; `running_mean`/`running_var` are
mere bookkeeping of what the activations looked like, and they are re-measured here on the pixels
the phone will actually send.

The prize would be the fold: a batch norm collapses into its convolution at export — 573 graph
nodes and 30.6 ms per 64 crops against 124 nodes and 6.5 ms on the real graph
(`model.py:PrimitiveBatchNorm2d`) — and GroupNorm never can, because its statistic depends on the
input.

**This script is a diagnosis, not a shipping path.** The 2026-07-30 scoreboard (occ-real6, phantoms
first) separates the batch-norm runs cleanly by scale spread — 244 and 154 phantoms at
`scales 32–128` against 35 and 21 for the single-scale runs, over two different corpora — which is
the predicted signature and confirms the mechanism. But the single-scale runs carry no multi-scale
confound at all and still sit at 21+ phantoms against the GroupNorm champion's 0, with empty crops
scored 0.975–1.000. So recalibration can at best lift a multi-scale run to single-scale quality,
which is still vetoed. What it buys is the one measurement that separates the STATISTIC from the
WEIGHTS: if `occ-v4bn-f3` falls from 154 phantoms toward 35 here, the averaged statistic is the
mechanism and a narrow-band or per-scale BN run is worth the hour; if it does not, the damage is in
the convolutions and the whole batch-norm direction is closed for twenty minutes of compute.

Two implementation points that are the whole difficulty
-------------------------------------------------------
**The crops are re-sliced, not shrunk from disk.** Training and `chesslab eval` load the 128 px
crop from disk and `F.interpolate` it down (`train.py:391`, `engine.py:44`) — bilinear, no
antialiasing, and the second resampling of a crop that was already resized once. Serving takes a
different route: it warps the board, cuts a box of `board_size / 8 * (1 + 2 * pad_side)` px out of
it (110 on the rig profile, 240 on the phone) and lands on `infer_size` through
`imgops.resize_keep_aspect`, i.e. INTER_AREA when that is a downscale — the same arithmetic
Android's `Crops.resizeKeepAspect` performs, while its `preprocess` refuses to resize at all.
Different pixels, and specifically different high-frequency content, i.e. different variance in the
early convolutions — the very thing being estimated. specs/22 named the re-sliced route path A and
declared it authoritative; calling `crops_for_frame` here inherits that whole chain.

`--warp` exists because the box size, not just the network input, differs between rig and phone:
the corpus was sliced at `board_size 800` and the phone warps at 1600. `pad_side` is deliberately
NOT overridable — Android's 0.10 against the rig's 0.05 changes what is INSIDE the crop, not how
finely it is sampled, and calibrating on more surrounding board than the weights were trained on
would measure a different domain rather than a different resolution.

**The statistic is accumulated here, not by the modules.** `nn.BatchNorm2d` offers `momentum=None`
for a cumulative average, but this project's `PrimitiveBatchNorm2d` — what `build_model` returns on
any ROCm build — reads `momentum=None` as 0.1 and silently gives an EMA instead (`model.py:53`).
Rather than depend on which of the two a run happens to hold, the pass collects per-channel sums in
float64 through hooks and writes the buffers itself. `track_running_stats` is switched off for the
duration, so no module can write to the buffers behind this script's back.

The batch norms run in TRAIN mode during the pass on purpose: each one then normalises by its
batch's own statistics, so the next layer sees inputs scaled the way the *calibrated* model will
scale them. Collecting in eval mode would condition every layer's estimate on the stale statistics
of the layer below it.

Usage
-----
    .venv/Scripts/python.exe scripts/adabn_recalibrate.py --run data/models/occ-v4bn-f3 --size 96
        [--warp 1600] [--frames 200] [--split train] [--out data/models/occ-v4bn-f3-adabn96]
        [--device cuda|cpu] [--batch-size 256] [--seed 42]

Writes a NEW run directory (config.json with `infer_size` set, plus best.pt) and never modifies the
source run. Evaluation is deliberately not part of this script — measure the result against the
scoreboard on the serving path, phantoms first:

    scripts/sweep_infer_size.py --runs <new-run> --sizes 96 --paths a

`--size` must be one of the source run's trained `scales`; specs/22 measured 133 misses at an
untrained 80 px against 19 at 96. Recalibration does not make an untrained size trained.

No training, no export, no rendering. One process, one DataLoader-free loop.
"""

from __future__ import annotations

import argparse
import random
import shutil
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chesslab import labeling, sessions  # noqa: E402
from chesslab.dataset_build import dataset_dir  # noqa: E402
from chesslab.ioutil import write_json  # noqa: E402
from chesslab.training.data import (  # noqa: E402
    filter_rows_by_split,
    load_manifest,
    load_split,
)
from chesslab.training.evaluate import load_run  # noqa: E402
from chesslab.training.torch_data import normalize_batch  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))   # sibling scripts
from sweep_warp_resolution import profile_at_warp  # noqa: E402


def log(msg: str = "") -> None:
    print(msg, flush=True)


# --- the calibration set: frames, re-sliced at the target size -------------------------------

def frames_for_split(rows: list[dict]) -> list[tuple[str, str]]:
    """`[(session_id, frame)]` in manifest order, deduplicated — one entry per board."""
    seen: set[tuple[str, str]] = set()
    order: list[tuple[str, str]] = []
    for r in rows:
        key = (r["session_id"], str(r["frame"]))
        if key not in seen:
            seen.add(key)
            order.append(key)
    return order


def split_rows(cfg: dict, split_name: str, override: str | None = None) -> list[dict]:
    """Rows of `split_name`, from `override` when given, else from the run's own dataset.

    The override is what makes the WARM START possible: a synthetic pretrain records `p2v4` in its
    config, but the statistics worth handing to a real finetune are the ones measured on real
    crops. Without it this script can only ever recalibrate a run onto its own domain, which for a
    pretrain is precisely the domain we are trying to leave.
    """
    ds_name = override or cfg.get("dataset")
    if not ds_name:
        raise SystemExit("run has no `dataset` in config.json — cannot locate its split.")
    dd = dataset_dir(ds_name)
    # `split_file` only applies to the run's OWN dataset: an override points at a foreign corpus
    # whose fold files, if any, have nothing to do with this run.
    own = not override or override == cfg.get("dataset")
    manifest_path = dd / "manifest.jsonl"
    split_path = dd / ((cfg.get("split_file") or "split.json") if own else "split.json")
    if not manifest_path.exists() or not split_path.exists():
        raise SystemExit(f"manifest/split missing under {dd}.")
    rows = filter_rows_by_split(load_manifest(manifest_path), load_split(split_path), split_name)
    if not rows:
        raise SystemExit(f"{split_name} split is empty.")
    return rows


# --- statistics --------------------------------------------------------------------------------

class ChannelStats:
    """Per-channel sum / sum-of-squares of one BatchNorm's INPUT, accumulated in float64.

    float64 because this is a variance over ~1e8 activations reduced by summation, and the project
    has been bitten by exactly this before: `PrimitiveBatchNorm2d` documents twelve `running_var`
    entries landing at +inf when the reduction ran in fp16. Cheap insurance at calibration time,
    where nothing is time-critical.
    """

    def __init__(self, channels: int) -> None:
        self.sum = torch.zeros(channels, dtype=torch.float64)
        self.sumsq = torch.zeros(channels, dtype=torch.float64)
        self.count = 0          # elements per channel, i.e. N*H*W summed over batches

    def observe(self, x: torch.Tensor) -> None:
        xd = x.detach().to(torch.float64)
        self.sum += xd.sum(dim=(0, 2, 3)).cpu()
        self.sumsq += (xd * xd).sum(dim=(0, 2, 3)).cpu()
        self.count += xd.numel() // xd.shape[1]

    def finish(self) -> tuple[torch.Tensor, torch.Tensor]:
        """`(mean, var)` — var UNBIASED, which is the estimate `nn.BatchNorm2d` stores."""
        n = self.count
        if n < 2:
            # Nothing was observed (an empty `--frames`, a generator that yielded no batch): the
            # two-pass identity would write NaN into every buffer and the run still be saved.
            raise SystemExit(f"no activations observed ({n} elements) — nothing to calibrate.")
        mean = self.sum / n
        # Clamped at zero: the two-pass identity can go a hair negative through cancellation when a
        # channel is near-constant, and a negative variance would produce NaNs on the first rsqrt.
        var = ((self.sumsq / n) - mean * mean).clamp_(min=0.0) * (n / (n - 1))
        return mean.float(), var.float()


def batchnorms(model: nn.Module) -> list[tuple[str, nn.BatchNorm2d]]:
    return [(n, m) for n, m in model.named_modules() if isinstance(m, nn.BatchNorm2d)]


def calibrate(model: nn.Module, batches, device: str) -> dict[str, ChannelStats]:
    """Run `batches` through `model` and return each BatchNorm's freshly measured input statistics.

    The batch norms are put in TRAIN mode with `track_running_stats=False`: in that state they
    normalise by the current batch (so every layer above sees calibrated-looking inputs) and write
    nothing to the buffers, which stay untouched until this function's caller installs the result.
    Everything else stays in eval mode — dropout during a statistics pass would be noise.
    """
    bns = batchnorms(model)
    if not bns:
        raise SystemExit(
            "this run has no BatchNorm2d — it is a GroupNorm model, and GroupNorm has no running "
            "statistics to recalibrate. AdaBN applies to batch-norm runs only.")
    stats = {name: ChannelStats(m.num_features) for name, m in bns}
    handles = []
    saved = []
    model.eval().to(device)
    for name, m in bns:
        saved.append((m, m.training, m.track_running_stats))
        m.track_running_stats = False
        m.train()
        handles.append(m.register_forward_pre_hook(
            lambda _mod, inputs, _n=name: stats[_n].observe(inputs[0])))
    try:
        with torch.no_grad():
            for i, batch in enumerate(batches):
                model(batch.to(device))
                if (i + 1) % 10 == 0:
                    log(f"    {i + 1} batches")
    finally:
        for h in handles:
            h.remove()
        for m, was_training, tracked in saved:
            m.track_running_stats = tracked
            m.train(was_training)
    return stats


def install(model: nn.Module, stats: dict[str, ChannelStats]) -> list[tuple[str, float, float]]:
    """Write the measured statistics into the buffers. Returns `(name, d_mean, d_var)` per layer,
    the relative change against what was there — a shift near zero means the resolution was not
    the problem, and the diagnosis is worth more than the checkpoint."""
    report = []
    for name, m in batchnorms(model):
        mean, var = stats[name].finish()
        # The statistics are accumulated on CPU (float64, see ChannelStats) while the buffers live
        # wherever the model does — every comparison below has to happen on one device.
        mean = mean.to(m.running_mean.device)
        var = var.to(m.running_var.device)
        old_mean, old_var = m.running_mean.clone(), m.running_var.clone()
        scale = old_var.sqrt().clamp(min=1e-6)
        d_mean = float(((mean - old_mean).abs() / scale).mean())
        d_var = float(((var - old_var).abs() / old_var.clamp(min=1e-6)).mean())
        m.running_mean.copy_(mean)
        m.running_var.copy_(var)
        if m.num_batches_tracked is not None:
            m.num_batches_tracked.zero_()
        report.append((name, d_mean, d_var))
    return report


# --- the pass ------------------------------------------------------------------------------------

def crop_batches(cfg: dict, frames: list[tuple[str, str]], size: int,
                 warp: int | None, batch_size: int):
    """Yield normalised `[N, C, size, size]` batches, re-sliced from the session frames.

    The crops are cut at `size` directly out of the warped board (path A of specs/22), then run
    through `normalize_batch` — the same arithmetic as `serving.predict_arrays`' fast path and as
    Android's `preprocess`. Labels are never read: AdaBN is unsupervised.
    """
    sdirs = {sid: sessions.session_dir(sid)[0] for sid, _ in frames}
    profiles, logs = {}, {}
    for sid, sdir in sdirs.items():
        prof = labeling._profile_for_session(labeling.read_session_meta(sdir), None)
        profiles[sid] = profile_at_warp(prof, warp) if warp else prof
        logs[sid] = {Path(e["frame"]).stem: e for e in labeling.read_log(sdir)}

    pending: list[np.ndarray] = []
    for sid, frame_id in frames:
        entry = logs[sid][frame_id]
        frame = cv2.imread(str(sdirs[sid] / entry["frame"]))
        if frame is None:
            raise SystemExit(f"frame not readable: {sid}/{entry['frame']}")
        pending.extend(labeling.crops_for_frame(
            frame, entry["corners"], profiles[sid], out_size=(size, size)))
        while len(pending) >= batch_size:
            yield to_batch(cfg, pending[:batch_size])
            del pending[:batch_size]
    if pending:
        yield to_batch(cfg, pending)


def to_batch(cfg: dict, crops: list[np.ndarray]) -> torch.Tensor:
    """BGR uint8 HWC crops -> the run's normalised NCHW float tensor."""
    arr = np.stack(crops)[:, :, :, ::-1].copy()            # BGR -> RGB
    batch = torch.from_numpy(arr).permute(0, 3, 1, 2).float() / 255.0
    return normalize_batch(cfg, batch)


def require_no_clahe(name: str, cfg: dict) -> None:
    """Refuse a CLAHE run: `to_batch` normalises by hand and never runs the operator chain, so the
    statistics would be measured on pixels this model is never served. Two batch-norm runs on disk
    carry `clahe_clip: 2.0` (`mnv3s128-bn-all`, `mnv3s128-bn-all-p60`)."""
    clip = float(cfg.get("clahe_clip", 0.0) or 0.0)
    if clip > 0:
        raise SystemExit(f"{name} carries clahe_clip={clip} — this pass would measure raw pixels, "
                         "and a model without its CLAHE is a different model (2026-09-07).")


def write_run(src: Path, dst: Path, model: nn.Module, cfg: dict, size: int,
              warp: int | None) -> None:
    """A new run directory: the recalibrated weights plus a config that says what they are for.

    `infer_size` is written because that is the whole point — these statistics are valid at ONE
    resolution, and a checkpoint that does not carry its own is a trap for the next reader.
    """
    dst.mkdir(parents=True, exist_ok=True)
    out_cfg = dict(cfg)
    out_cfg["infer_size"] = [size, size]
    out_cfg["adabn"] = {"source_run": str(src), "size": size, "warp": warp}
    write_json(dst / "config.json", out_cfg)
    torch.save(model.state_dict(), dst / "best.pt")
    for extra in ("split.json", "classes.json"):
        if (src / extra).exists():
            shutil.copy2(src / extra, dst / extra)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--run", required=True, help="source run directory (batch-norm run)")
    ap.add_argument("--size", type=int, required=True,
                    help="the deployment input size to calibrate for (must be a trained scale)")
    ap.add_argument("--warp", type=int, default=None,
                    help="override board_size in memory (1600 = the phone's warp; default: the "
                         "session profile's own value)")
    ap.add_argument("--frames", type=int, default=200,
                    help="boards to calibrate on (64 crops each; 200 = 12800 crops)")
    ap.add_argument("--split", default="train",
                    help="which split to draw the frames from (default train — never calibrate on "
                         "test, it is the number you are trying to earn)")
    ap.add_argument("--calib-dataset", default=None,
                    help="draw the calibration frames from THIS dataset instead of the run's own "
                         "(the warm-start case: a synthetic pretrain calibrated on real crops)")
    ap.add_argument("--out", default=None, help="destination run dir (default: <run>-adabn<size>)")
    ap.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    ap.add_argument("--batch-size", type=int, default=256)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    src = Path(args.run)
    if not (src / "config.json").exists():
        raise SystemExit(f"no config.json in {src}")
    dst = Path(args.out) if args.out else src.with_name(f"{src.name}-adabn{args.size}")
    if dst.exists() and any(dst.iterdir()):
        raise SystemExit(f"{dst} exists and is not empty — pick another --out.")

    model, cfg = load_run(src)
    require_no_clahe(src.name, cfg)
    scales = cfg.get("scales")
    if scales and args.size not in scales:
        # specs/22 measured what an untrained size costs: 133 misses at 80 px against 19 at 96.
        log(f"[WARN] {args.size} px is not among this run's trained scales {scales} — the curve is "
            "violently non-monotone off them. Calibrating anyway, but treat the result with care.")

    rows = split_rows(cfg, args.split, args.calib_dataset)
    frames = frames_for_split(rows)
    random.Random(args.seed).shuffle(frames)
    frames = frames[:args.frames]
    log(f"== AdaBN: {src.name} -> {dst.name} ==")
    log(f"   {len(frames)} boards from '{args.split}', re-sliced at {args.size} px"
        + (f", warped at board_size={args.warp}" if args.warp else "")
        + f", device={args.device}")

    t0 = time.time()
    stats = calibrate(model, crop_batches(cfg, frames, args.size, args.warp, args.batch_size),
                      args.device)
    report = install(model, stats)
    log(f"   done in {time.time() - t0:.0f}s over {len(report)} batch norms")

    d_means = [d for _, d, _ in report]
    d_vars = [d for _, _, d in report]
    log(f"   shift vs. the old statistics: mean {np.mean(d_means):.3f} sigma (max "
        f"{np.max(d_means):.3f}), var {np.mean(d_vars):.2f}x relative (max {np.max(d_vars):.2f})")
    log("   Read this first: a shift near zero means the multi-scale statistic already fitted this "
        "resolution, so AdaBN cannot be the fix and the loss is in the weights.")
    worst = sorted(report, key=lambda r: -r[1])[:5]
    for name, d_mean, d_var in worst:
        log(f"     {name:<46} mean {d_mean:6.3f} sigma   var {d_var:6.2f}x")

    model.cpu()
    write_run(src, dst, model, cfg, args.size, args.warp)
    log(f"[OK] wrote {dst}")
    log(f"     measure it on the serving path:  .venv/Scripts/python.exe "
        f"scripts/sweep_infer_size.py --runs {dst.name} --sizes {args.size} --paths a")


if __name__ == "__main__":
    main()
