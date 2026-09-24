"""Sweep the WARP resolution against the network's input size (specs/23, phase 00).

Every crop carries `board_size/8 * 1.10` px of detail whatever the camera delivered. This
measures, on the serving path only, whether sharper warps help at inference and which
`infer_size` should ship. `board_size` is overridden IN MEMORY ONLY, and only TRAINED sizes are
swept.

Usage:
    .venv/Scripts/python.exe scripts/sweep_warp_resolution.py --log data/_perf/sweep_warp.log
        [--warps 800,1200,1600] [--sizes 64,96,128] [--runs occ-v4-f3e20,occ-r3s-f3]
        [--splits test,val] [--device cuda|cpu] [--miss-target 43] [--max-frames N]"""

from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import replace
from pathlib import Path

import cv2
import numpy as np

# BEFORE `serving` captures anything: the CUDA/HIP graph bakes one input shape per run.
os.environ.setdefault("CHESSLAB_DISABLE_CUDA_GRAPH", "1")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chesslab import calibration, config, labeling  # noqa: E402
from chesslab.dataset import load_manifest, load_split  # noqa: E402
from chesslab.dataset_build import dataset_dir  # noqa: E402
from chesslab.session_store import paths as store_paths  # noqa: E402
from chesslab.session_store.log import read_log_rows  # noqa: E402
from chesslab.training.data import filter_rows_by_split  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))   # sibling scripts
from sweep_infer_size import (  # noqa: E402
    Log,
    _counts,
    frames_for_split,
    install_at_size,
    load_torch_run,
    misses_phantom_free,
    phantoms_at_miss_target,
    px_per_square,
)

#: The profile's own 800, the `config.DEFAULT_BOARD_SIZE` / Android 1600, and one in between.
WARPS = (800, 1200, 1600)

#: TRAINED scales only; 48 and 80 are not in the recipe and collapse.
SIZES = (64, 96, 128)

#: The multi-scale GroupNorm candidate, and the run currently bundled in the app.
RUNS = ("occ-v4-f3e20", "occ-r3s-f3")

SPLITS = ("test", "val")

#: The operating point the norm x scale matrix was compared at (specs/22 STATUS.md).
MISS_TARGET = 43


def crop_box_px(profile) -> float:
    """Linear px the crop box carries before the resize — up- or downsample; NOT px/square at the
    sensor.
    """
    return profile.board_size / 8.0 * (1.0 + 2.0 * profile.crop.pad_side)


def profile_at_warp(profile, board_size: int):
    """A COPY of the profile rectifying to `board_size`, never written back; derived fields
    re-derived so it cannot hand out stale numbers.
    """
    return replace(
        profile,
        board_size=int(board_size),
        crop=replace(profile.crop, cell=board_size / 8.0),
        homography=calibration.compute_homography(profile.image_corners, board_size, profile.margin),
    )


def occupied_index(cfg: dict) -> int:
    classes = list(cfg["classes"])
    if classes != ["empty", "occupied"]:
        raise SystemExit(f"this sweep measures occupancy models; run has classes {classes}")
    return classes.index("occupied")


def sweep(runs: dict[str, tuple], rows: list[dict], warps: tuple[int, ...], sizes: tuple[int, ...],
          device: str, max_frames: int | None, log: Log,
          ) -> dict[tuple[str, int, int], tuple[np.ndarray, np.ndarray, np.ndarray]]:
    """Cut crops from the session frames at every (warp, size) pair and predict; frames decode
    ONCE.
    """
    from chesslab import serving

    squares = labeling.all_squares()
    groups = frames_for_split(rows)
    if max_frames:
        groups = groups[:max_frames]
    sids = sorted({sid for sid, _, _ in groups})
    sdirs = {sid: store_paths.session_dir(sid)[0] for sid in sids}
    base_profiles = {}
    logs = {}
    for sid, sdir in sdirs.items():
        base_profiles[sid] = labeling._profile_for_session(labeling.read_session_meta(sdir), None)
        logs[sid] = {Path(e["frame"]).stem: e for e in read_log_rows(sdir)}
    profiles = {(sid, w): profile_at_warp(base_profiles[sid], w) for sid in sids for w in warps}

    acc: dict[tuple[str, int, int], tuple[list[bool], list[bool], list[float]]] = {
        (name, w, s): ([], [], []) for name in runs for w in warps for s in sizes
    }

    t0 = time.time()
    for i, (sid, frame_id, labels) in enumerate(groups):
        entry = logs[sid][frame_id]
        frame = cv2.imread(str(sdirs[sid] / entry["frame"]))
        if frame is None:
            raise SystemExit(f"frame not readable: {sid}/{entry['frame']}")
        corners = entry["corners"]
        keep = [j for j, sq in enumerate(squares) if sq in labels]
        truth = [labels[squares[j]] != "empty" for j in keep]
        for w in warps:
            prof = profiles[(sid, w)]
            for s in sizes:
                crops = labeling.crops_for_frame(frame, corners, prof, out_size=(s, s))
                for name, (run_dir, model, cfg) in runs.items():
                    cfg_at_size = install_at_size(run_dir, model, cfg, s)
                    occ = occupied_index(cfg_at_size)
                    preds = serving.predict_arrays(run_dir, [crops[j] for j in keep], device=device,
                                                   return_probs=True)
                    t_acc, p_acc, q_acc = acc[(name, w, s)]
                    t_acc.extend(truth)
                    p_acc.extend(p["pred_label"] == "occupied" for p in preds)
                    q_acc.extend(float(p["probs"][occ]) for p in preds)
        if (i + 1) % 10 == 0 or i + 1 == len(groups):
            log(f"    {i + 1}/{len(groups)} frames ({time.time() - t0:.0f}s)")

    return {k: (np.array(t, bool), np.array(p, bool), np.array(q, np.float64))
            for k, (t, p, q) in acc.items()}


_HEAD = (f"{'warp':>5} {'box px':>7} {'size':>5} | {'miss':>6} {'phan':>6} "
         f"| {'ph@miss':>8} {'miss@0ph':>9}")


def report(log: Log, name: str, split: str, warps: tuple[int, ...], sizes: tuple[int, ...],
           data: dict, target: int) -> dict:
    log("")
    log(f"  {name} / {split}")
    log(f"  {_HEAD}")
    log(f"  {'-' * len(_HEAD)}")
    cells: dict[tuple[int, int], tuple[int, int, int, int]] = {}
    unmatched = False
    for w in warps:
        box = w / 8.0 * 1.10
        for s in sizes:
            trues, preds, probs = data[(name, w, s)]
            miss, phan = _counts(trues, preds)
            ph_at_m, miss_at_t, _ = phantoms_at_miss_target(trues, probs, target)
            m_at_pf, _ = misses_phantom_free(trues, probs)
            cells[(w, s)] = (miss, phan, ph_at_m, m_at_pf)
            # `!` = the budget does not BIND (fewer occupied cells than `target`): the 0 phantoms
            # are vacuous.
            marked = f"{ph_at_m}!" if miss_at_t != target else str(ph_at_m)
            unmatched = unmatched or miss_at_t != target
            log(f"  {w:>5} {box:>7.0f} {s:>5} | {miss:>6} {phan:>6} "
                f"| {marked:>8} {m_at_pf:>9}")
        log(f"  {'-' * len(_HEAD)}")
    if unmatched:
        log(f"  ! = the miss budget {target} does not bind in that cell, so its ph@miss is at a "
            "DIFFERENT operating point and is not comparable with the rest of the column.")
    keys = list(cells)
    best_argmax = min(keys, key=lambda k: (cells[k][0], cells[k][1]))
    best_pf = min(keys, key=lambda k: cells[k][3])
    per_warp = {w: min(sizes, key=lambda s: (cells[(w, s)][0], cells[(w, s)][1])) for w in warps}
    log(f"  best({split}) overall: argmax misses @ warp {best_argmax[0]} / {best_argmax[1]} px "
        f"({cells[best_argmax][0]} miss / {cells[best_argmax][1]} phan); "
        f"misses at zero phantoms @ warp {best_pf[0]} / {best_pf[1]} px ({cells[best_pf][3]})")
    log(f"  best size per warp ({split}): "
        + ", ".join(f"{w}->{per_warp[w]}px ({cells[(w, per_warp[w])][0]}/"
                    f"{cells[(w, per_warp[w])][1]})" for w in warps))
    return {"cells": {f"{w}x{s}": cells[(w, s)] for w, s in cells},
            "argmax": list(best_argmax), "phantom_free": list(best_pf),
            "best_size_per_warp": per_warp}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--warps", default=",".join(str(w) for w in WARPS),
                    help="board_size values to rectify at — overridden in memory only")
    ap.add_argument("--sizes", default=",".join(str(s) for s in SIZES),
                    help="network input sizes. TRAINED scales only — see the module docstring.")
    ap.add_argument("--runs", default=",".join(RUNS))
    ap.add_argument("--splits", default=",".join(SPLITS))
    ap.add_argument("--device", default=None, help="default: cuda when available, else cpu")
    ap.add_argument("--miss-target", type=int, default=MISS_TARGET,
                    help="matched operating point: phantoms while misses stay <= this")
    ap.add_argument("--max-frames", type=int, default=0, help="smoke test: first N boards per split")
    ap.add_argument("--log", default="data/_perf/sweep_warp.log")
    args = ap.parse_args()

    warps = tuple(int(w) for w in args.warps.split(","))
    sizes = tuple(int(s) for s in args.sizes.split(","))
    run_names = [r for r in args.runs.split(",") if r]
    splits = [s for s in args.splits.split(",") if s]
    log = Log(Path(args.log) if args.log else None)

    from chesslab.training.engine import get_device

    device = args.device or str(get_device(require_gpu=False))
    log(f"device={device} warps={warps} sizes={sizes} runs={run_names} splits={splits} "
        f"miss_target={args.miss_target} max_frames={args.max_frames or 'all'}")

    runs: dict[str, tuple] = {}
    for name in run_names:
        run_dir = config.DATA.models / name
        model, cfg = load_torch_run(run_dir)
        occupied_index(cfg)
        model.to(device)
        runs[name] = (run_dir, model, cfg)
        untrained = [s for s in sizes if cfg.get("scales") and s not in cfg["scales"]]
        log(f"loaded {name}: backbone={cfg['backbone']} norm={cfg.get('norm')} "
            f"out_size={cfg['out_size']} infer_size={cfg.get('infer_size')} "
            f"scales={cfg.get('scales')} dataset={cfg['dataset']}")
        if untrained:
            log(f"  !! {name} was never trained at {untrained} — those cells measure "
                "extrapolation, not deployment")

    ds_names = {cfg["dataset"] for _, _, cfg in runs.values()}
    if len(ds_names) != 1:
        raise SystemExit(f"runs disagree about the dataset ({ds_names}) — splits would differ")
    dd = dataset_dir(ds_names.pop())
    manifest = load_manifest(dd / "manifest.jsonl")
    split = load_split(dd / "split.json")

    verdict: dict[tuple[str, str], dict] = {}
    for split_name in splits:
        rows = filter_rows_by_split(manifest, split, split_name)
        if not rows:
            raise SystemExit(f"{split_name} split is empty")
        sids = sorted({r["session_id"] for r in rows})
        frames = len({(r["session_id"], str(r["frame"])) for r in rows})
        occ_n = sum(1 for r in rows if r["label"] != "empty")
        log("")
        log(f"== {split_name}: {len(rows)} crops / {frames} boards / {occ_n} occupied ==")
        for sid in sids:
            base = labeling._profile_for_session(
                labeling.read_session_meta(store_paths.session_dir(sid)[0]), None)
            boxes = ", ".join(f"{w}->{crop_box_px(profile_at_warp(base, w)):.0f}px" for w in warps)
            log(f"   session {sid}: camera {px_per_square(sid):.1f} px/square; profile "
                f"'{base.profile}' board_size={base.board_size} pad_side={base.crop.pad_side} "
                f"=> crop box {boxes}")

        data = sweep(runs, rows, warps, sizes, device, args.max_frames or None, log)
        for name in runs:
            verdict[(name, split_name)] = report(log, name, split_name, warps, sizes, data,
                                                 args.miss_target)

    log("")
    log("summary (miss/phan at argmax) — the test leg is the clean one; val doubles as the "
        "checkpoint-selection set:")
    for (name, split_name), v in verdict.items():
        log(f"  {name:<14} {split_name:<5} argmax @ warp {v['argmax'][0]} / {v['argmax'][1]} px, "
            f"best size per warp {v['best_size_per_warp']}")
    log("")
    log("NOTE: pad_side stays the rig profile's 0.05, so the box is board_size/8 * 1.10. Android "
        "warps at boardSize=1600 with padSide=0.10 -> a 240 px box, so the 1600 row is the closest "
        "available PROXY for the phone (220 px), not the phone itself.")
    log("NOTE: data/calibration/phone.yaml was NOT modified — every warp above is an in-memory "
        "override (specs/23 entry.md).")
    log.close()


if __name__ == "__main__":
    main()
