"""Sweep the CNN's inference resolution on the path that actually serves (specs/22, phase 00).

The question: `occ-v4-f3e20` reads 43 occupied squares as empty at 128 px and 18 at 96 px on the
real holdout — but that curve was produced by SHRINKING the 128 px crops on disk. Serving does
something else: `crops_for_model` cuts the square out of the warped board straight to the model's
input size and never passes through 128. Those are different pixels.

So the sweep runs twice and reports both:

- **path A — re-sliced (authoritative).** Crops cut from the session frames at each size via
  `labeling.crops_for_frame(..., out_size=(s, s))`, then through `serving.predict_arrays`. This is
  what live inference does.
- **path B — from the 128 px crops (cross-check).** The dataset rows through
  `eval_transform_for(cfg, out_size=(s, s))`, i.e. the disk crop resized a second time.

If A and B disagree about the optimum, A wins and B's disagreement is the finding: it would mean
the crop pipeline, not the network, is where the resolution is lost.

Reported per model x split x size x path, on the occupancy question — for a two-class run
directly, for an identity run through the summed piece mass (`occupancy_reader`):

- argmax misses (true occupied read as empty) / phantoms (true empty read as occupied),
- phantoms at the threshold that holds misses at `--miss-target` (the MATCHED operating point —
  argmax is an arbitrary point on each model's curve),
- misses at the most permissive phantom-free threshold.

Usage:
    .venv/Scripts/python.exe scripts/sweep_infer_size.py
        [--runs occ-v4-f3e20,occ-r3s-f3] [--splits test,val] [--sizes 48,64,80,96,112,128,160]
        [--paths ab] [--device cuda|cpu] [--num-workers 2] [--batch-size 256]
        [--miss-target 43] [--log data/_perf/sweep_infer_size.log]

Evaluation only: no training, no export, no rendering. One process — two concurrent DataLoader
sweeps have deadlocked this machine before.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from collections.abc import Callable, Sequence
from pathlib import Path

import cv2
import numpy as np

# Must be set BEFORE `serving` captures anything: the CUDA/HIP-graph fast path bakes one fixed
# input shape into a per-run cache entry, which is exactly wrong for a resolution sweep.
os.environ.setdefault("CHESSLAB_DISABLE_CUDA_GRAPH", "1")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chesslab import config, labeling  # noqa: E402
from chesslab.dataset_build import dataset_dir  # noqa: E402
from chesslab.move_tracker.cnn_recovery import classes_have_identity  # noqa: E402
from chesslab.training.data import (  # noqa: E402
    filter_rows_by_split,
    load_manifest,
    load_split,
)

#: Outside 48..160 the multi-scale runs were never trained (`scales: [32, 64, 96, 128]` plus the
#: 128-px native size); numbers there measure extrapolation, not deployment.
SIZES = (48, 64, 80, 96, 112, 128, 160)

#: The two champions `CLAUDE.md` names, and both are bundled: the assets live in per-model
#: subdirectories (`android/app/src/main/assets/cnn_model/<model>/config.json`) — there has never
#: been a `config.json` at the root of that directory. `occ-v9bn-wide` is `bn100-80/`, the 2-class
#: full-width model; `occ-v10bn35-13c-hn` is `id35-80/`, the 13-class one the device runs. Both
#: asset config.json files are byte-identical to their run's (verified 2026-08-02).
#:
#: The previous default (`occ-v4-f3e20`, `occ-r3s-f3`) named a champion two geometry generations
#: old: both are pre-realignment runs, and `CLAUDE.md` records that every path-A number taken on
#: the mis-aligned corpus is void.
RUNS = ("occ-v9bn-wide", "occ-v10bn35-13c-hn")

SPLITS = ("test", "val")

#: The operating point the norm x scale matrix was compared at (see STATUS.md).
MISS_TARGET = 43


class Log:
    """stdout + file, flushed on every line — a hang has to be visible while it hangs."""

    def __init__(self, path: Path | None) -> None:
        self._fh = None
        if path is not None:
            path.parent.mkdir(parents=True, exist_ok=True)
            self._fh = path.open("w", encoding="utf-8")

    def __call__(self, msg: str = "") -> None:
        print(msg, flush=True)
        if self._fh is not None:
            self._fh.write(msg + "\n")
            self._fh.flush()

    def close(self) -> None:
        if self._fh is not None:
            self._fh.close()


def px_per_square(session_id: str) -> float:
    """Native resolution of a session: mean edge of the logged corner quad / 8."""
    p = config.DATA.sessions / session_id / "log.jsonl"
    with p.open("r", encoding="utf-8") as fh:
        c = json.loads(fh.readline())["corners"]
    return sum(math.dist(c[i], c[(i + 1) % 4]) for i in range(4)) / 4 / 8


def warp_px_per_square(profile) -> float:
    """Resolution the crop is actually cut at: the warp lands on `board_size`, whatever the
    camera delivered. This is the number `crops_for_frame` sees, and it is the same for every
    session sharing a profile."""
    return profile.board_size / 8.0


# --- metrics -------------------------------------------------------------------------------

def _counts(trues: np.ndarray, preds: np.ndarray) -> tuple[int, int]:
    """(misses, phantoms): occupied read as empty, empty read as occupied."""
    return int((trues & ~preds).sum()), int((~trues & preds).sum())


def phantoms_at_miss_target(trues: np.ndarray, probs: np.ndarray, target: int) -> tuple[int, int, float]:
    """Fewest phantoms reachable while keeping misses <= `target`.

    misses(t) grows and phantoms(t) shrinks with the threshold t on P(occupied), so the answer is
    the LARGEST t whose miss count is still within budget. Returns (phantoms, misses, t).
    """
    occ = np.sort(probs[trues])
    if occ.size == 0:
        return 0, 0, 0.0
    t = float(occ[target]) if target < occ.size else float(occ[-1]) + 1e-9
    preds = probs >= t
    misses, phantoms = _counts(trues, preds)
    return phantoms, misses, t


def margin(trues: np.ndarray, probs: np.ndarray) -> tuple[float, float]:
    """`(p99.9, max)` of P(occupied) over the truly EMPTY crops — how close the model comes to
    inventing a piece.

    The phantom count says whether the model crossed the line at ITS threshold; this says how much
    room was left. Two models can both be phantom-free while one sits at 0.34 and the other at 0.63,
    and the second is the one that will produce phantoms on material neither has seen.
    """
    emp = probs[~trues]
    if emp.size == 0:
        return 0.0, 0.0
    return float(np.quantile(emp, 0.999)), float(emp.max())


def misses_phantom_free(trues: np.ndarray, probs: np.ndarray) -> tuple[int, float]:
    """Fewest misses reachable at ZERO phantoms = the most permissive phantom-free threshold.

    The spec says "the largest phantom-free threshold", which is degenerate (t=1 is phantom-free
    and misses everything) — the informative end is the smallest such t. Returns (misses, t).
    """
    emp = probs[~trues]
    t = float(emp.max()) + 1e-6 if emp.size else 0.0
    preds = probs >= t
    misses, _ = _counts(trues, preds)
    return misses, t


# --- model handling -----------------------------------------------------------------------

def load_torch_run(run_dir: Path):
    """(model, cfg) from the checkpoint — deliberately NOT via `serving.load_run`.

    `serving.load_run` prefers a `model.onnx` when one exists, and this exporter bakes a static
    `[64, 3, 128, 128]` input into the graph (`evaluate.ONNX_BATCH`, no dynamic axes). A sweep over
    input sizes has to run the weights.
    """
    from chesslab.training.evaluate import load_run as _load_run

    model, cfg = _load_run(run_dir)
    return model.eval(), cfg


def install_at_size(run_dir: Path, model, cfg: dict, size: int) -> dict:
    """Make `serving.predict_arrays` treat `size` as this run's input size, and return the cfg.

    `predict_arrays` reads its target size from `infer_size_of(cfg)` and would resize freshly sliced
    s x s crops straight back, erasing the very thing this sweep measures. Seeding the module cache
    is the only seam.

    **Both keys, not just `out_size`.** When this was written `infer_size` did not exist and
    `out_size` was the whole story; specs/22 then added the key and `infer_size_of` PREFERS it. From
    that moment a run carrying an `infer_size` — every model shipped since — silently ignored the
    swept size and served everything at its own. It went unnoticed because the sweeps that mattered
    ran at the size the model already declared, where the two agree. Found by specs/26 phase 02.
    """
    from chesslab import serving

    cfg_at_size = {**cfg, "out_size": [size, size], "infer_size": [size, size]}
    serving._CACHE[str(Path(run_dir).resolve())] = (model, cfg_at_size)
    return cfg_at_size


def occupancy_reader(cfg: dict) -> Callable[[Sequence[float]], tuple[float, bool]]:
    """`probs -> (P(occupied), read as occupied)` for this run's class list.

    A **two-class** run answers the question directly: the `occupied` column *is* P(occupied) and
    the argmax between the two columns is the verdict. That is the path every number in
    `data/_perf/*.log` was measured on, so it is left alone.

    An **identity** run (13 or 14 classes) has no `occupied` column. P(occupied) is then the summed
    mass of the piece classes — `1 - P(empty) - P(occluded)`, clamped at 0 against float drift —
    and the square reads as occupied when that mass beats P(empty). This is not a new metric: it is
    `cnn_recovery.observation_from_probs` plus `OccupancyObservation.occupied`, i.e. exactly what
    the tracker concludes from the same softmax (`Observations.kt:17` is the port of it and agrees).
    Deriving a second definition here would measure a model nobody runs.
    """
    classes = list(cfg["classes"])
    if "empty" not in classes:
        raise SystemExit(f"run has no `empty` class — nothing to measure occupancy against: {classes}")
    i_empty = classes.index("empty")
    if not classes_have_identity(classes):
        if classes != config.OCCUPANCY_CLASSES:
            raise SystemExit(f"this sweep measures occupancy; run has classes {classes}")
        i_occ = classes.index("occupied")
        return lambda p: (float(p[i_occ]), float(p[i_occ]) > float(p[i_empty]))
    i_occl = classes.index("occluded") if "occluded" in classes else None

    def read(p: Sequence[float]) -> tuple[float, bool]:
        p_empty = float(p[i_empty])
        p_occl = float(p[i_occl]) if i_occl is not None else 0.0
        p_occ = max(0.0, 1.0 - p_empty - p_occl)
        return p_occ, p_occ > p_empty

    return read


# --- path A: re-sliced from the session frames --------------------------------------------

def frames_for_split(rows: list[dict]) -> list[tuple[str, str, dict[str, str]]]:
    """[(session_id, frame, {square: label})] in manifest order — the labels for path A."""
    order: list[tuple[str, str]] = []
    groups: dict[tuple[str, str], dict[str, str]] = {}
    for r in rows:
        key = (r["session_id"], str(r["frame"]))
        if key not in groups:
            groups[key] = {}
            order.append(key)
        groups[key][r["square"]] = r["label"]
    return [(sid, fr, groups[(sid, fr)]) for sid, fr in order]


def session_index(groups: list[tuple[str, str, dict[str, str]]]) -> np.ndarray:
    """The session id of every crop in `sweep_path_a`'s accumulated arrays, aligned element-wise.

    Derived rather than threaded through the sweep: `sweep_path_a` extends its arrays group by
    group, `len(labels)` entries at a time, in exactly this order. Recomputing that here keeps the
    sweep's return shape untouched — and the alignment is checked by length at the call site.
    """
    return np.array([sid for sid, _, labels in groups for _ in labels], dtype=object)


def sweep_path_a(runs: dict[str, tuple], rows: list[dict], sizes: tuple[int, ...],
                 device: str, log: Log) -> dict[tuple[str, int], tuple[np.ndarray, np.ndarray, np.ndarray]]:
    """Cut the crops out of the session frames at every size and predict — the serving path.

    Frames are decoded ONCE and re-cropped per size (the warp is size-independent, only
    `crop_square`'s resize is not), so the sweep costs one PNG decode per frame, not seven.
    """
    from chesslab import serving

    squares = labeling.all_squares()
    groups = frames_for_split(rows)
    sessions = sorted({sid for sid, _, _ in groups})
    profiles = {}
    logs = {}
    for sid in sessions:
        meta = labeling.read_session_meta(config.DATA.sessions / sid)
        profiles[sid] = labeling._profile_for_session(meta, None)
        logs[sid] = {Path(e["frame"]).stem: e for e in labeling.read_log(config.DATA.sessions / sid)}

    specs = {name: serving.run_spec(run_dir) for name, (run_dir, _, _) in runs.items()}
    acc: dict[tuple[str, int], tuple[list[bool], list[bool], list[float]]] = {
        (name, s): ([], [], []) for name in runs for s in sizes
    }

    t0 = time.time()
    for i, (sid, frame_id, labels) in enumerate(groups):
        entry = logs[sid][frame_id]
        frame = cv2.imread(str(config.DATA.sessions / sid / entry["frame"]))
        if frame is None:
            raise SystemExit(f"frame not readable: {sid}/{entry['frame']}")
        corners = entry["corners"]
        keep = [j for j, sq in enumerate(squares) if sq in labels]
        truth = [labels[squares[j]] != "empty" for j in keep]
        for s in sizes:
            crops_by_variant: dict[tuple, list] = {}
            for name, (run_dir, model, cfg) in runs.items():
                spec = specs[name]
                vkey = (spec.geometry, spec.photometry, spec.piece_height_cells)
                if vkey not in crops_by_variant:
                    crops_by_variant[vkey] = labeling.crops_for_frame(
                        frame, corners, profiles[sid], geometry=spec.geometry,
                        photometry=spec.photometry, piece_height_cells=spec.piece_height_cells,
                        out_size=(s, s))
                crops = crops_by_variant[vkey]
                cfg_at_size = install_at_size(run_dir, model, cfg, s)
                read_occ = occupancy_reader(cfg_at_size)
                preds = serving.predict_arrays(run_dir, [crops[j] for j in keep], device=device,
                                               return_probs=True)
                seen = [read_occ(p["probs"]) for p in preds]
                t_acc, p_acc, q_acc = acc[(name, s)]
                t_acc.extend(truth)
                p_acc.extend(o for _, o in seen)
                q_acc.extend(q for q, _ in seen)
        if (i + 1) % 10 == 0 or i + 1 == len(groups):
            log(f"    path A {i + 1}/{len(groups)} frames ({time.time() - t0:.0f}s)")

    return {k: (np.array(t, bool), np.array(p, bool), np.array(q, np.float64))
            for k, (t, p, q) in acc.items()}


# --- path B: the 128 px crops resized a second time ---------------------------------------

def sweep_path_b(run_dir: Path, model, cfg: dict, rows: list[dict], sizes: tuple[int, ...],
                 device: str, batch_size: int, num_workers: int,
                 log: Log) -> dict[int, tuple[np.ndarray, np.ndarray, np.ndarray]]:
    import torch
    from torch.utils.data import DataLoader

    from chesslab.training.pack import load_packed
    from chesslab.training.torch_data import (
        PackedSquareDataset,
        SquareDataset,
        eval_transform_for,
    )

    classes = list(cfg["classes"])
    read_occ = occupancy_reader(cfg)
    packed = load_packed(cfg["dataset"]) if cfg.get("dataset") else None
    model.to(device)
    out: dict[int, tuple[np.ndarray, np.ndarray, np.ndarray]] = {}
    for s in sizes:
        tf = eval_transform_for(cfg, out_size=(s, s))
        ds = (PackedSquareDataset(rows, classes, tf, packed) if packed is not None
              else SquareDataset(rows, classes, tf))
        loader = DataLoader(ds, batch_size=batch_size, shuffle=False, num_workers=num_workers,
                            pin_memory=True)
        trues: list[bool] = []
        preds: list[bool] = []
        probs: list[float] = []
        t0 = time.time()
        with torch.no_grad():
            for x, y in loader:
                logits = model(x.to(device))
                p = torch.softmax(logits.float(), dim=1).cpu()
                # Truth is "not empty", the same rule path A applies to its labels — for the
                # 2-class list that is the class index itself, which is what this used to store.
                trues.extend(classes[t] != "empty" for t in y.tolist())
                seen = [read_occ(row) for row in p.tolist()]
                preds.extend(o for _, o in seen)
                probs.extend(q for q, _ in seen)
        out[s] = (np.array(trues, bool), np.array(preds, bool), np.array(probs, np.float64))
        log(f"    path B {s:>3} px: {len(trues)} crops ({time.time() - t0:.0f}s)")
    return out


# --- reporting -----------------------------------------------------------------------------

_HEAD = (f"{'size':>5} | {'A miss':>7} {'A phan':>7} | {'A ph@m':>7} {'A m@ph':>7} "
         f"| {'B miss':>7} {'B phan':>7} | {'B ph@m':>7} {'B m@ph':>7}")


def report(log: Log, name: str, split: str, sizes: tuple[int, ...], a, b, target: int) -> dict:
    log("")
    log(f"  {name} / {split}")
    log(f"  {_HEAD}")
    log(f"  {'-' * len(_HEAD)}")
    best = {}
    for s in sizes:
        cells = []
        for res in (a.get(s), b.get(s)):
            if res is None:
                cells += ["-"] * 4
                continue
            trues, preds, probs = res
            miss, phan = _counts(trues, preds)
            ph_at_m, _, _ = phantoms_at_miss_target(trues, probs, target)
            m_at_pf, _ = misses_phantom_free(trues, probs)
            cells += [str(miss), str(phan), str(ph_at_m), str(m_at_pf)]
        log(f"  {s:>5} | {cells[0]:>7} {cells[1]:>7} | {cells[2]:>7} {cells[3]:>7} "
            f"| {cells[4]:>7} {cells[5]:>7} | {cells[6]:>7} {cells[7]:>7}")
    for label, data in (("A", a), ("B", b)):
        if not data:
            continue
        argmax_best = min(sizes, key=lambda s: _counts(*data[s][:2])[0])
        pf_best = min(sizes, key=lambda s: misses_phantom_free(data[s][0], data[s][2])[0])
        best[label] = {"argmax": argmax_best, "phantom_free": pf_best}
        log(f"  best({split}) path {label}: argmax misses @ {argmax_best} px, "
            f"misses at zero phantoms @ {pf_best} px")
    return best


def report_by_session(log: Log, name: str, sizes: tuple[int, ...], a, sids: np.ndarray) -> None:
    """Per-session misses/phantoms plus the empty-crop margin — the scoreboard's decisive columns.

    Split by session because the two test sessions are not interchangeable: one is the USB rig, one
    is a phone game, and the phone column is the deployment-near one. A model can be phantom-free on
    the anchor and not on the phone, and only the anchor number would be reported by a total.
    """
    for s in sizes:
        res = a.get(s)
        if res is None:
            continue
        trues, preds, probs = res
        if len(sids) != len(trues):
            log(f"  [WARN] session index misaligned ({len(sids)} vs {len(trues)}) — skipping "
                "the per-session breakdown rather than reporting made-up attribution.")
            return
        p999, mx = margin(trues, probs)
        parts = []
        for sid in sorted(set(sids.tolist())):
            m = sids == sid
            miss, phan = _counts(trues[m], preds[m])
            parts.append(f"{sid}: {miss} miss / {phan} phantom")
        log(f"  {name} @ {s}px — " + " · ".join(parts)
            + f" | margin(empty p99.9/max) {p999:.3f} / {mx:.3f}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--runs", default=",".join(RUNS))
    ap.add_argument("--splits", default=",".join(SPLITS))
    ap.add_argument("--sizes", default=",".join(str(s) for s in SIZES))
    ap.add_argument("--paths", default="ab", help="'a', 'b' or 'ab' (default: both)")
    ap.add_argument("--device", default=None, help="default: cuda when available, else cpu")
    ap.add_argument("--batch-size", type=int, default=256)
    ap.add_argument("--num-workers", type=int, default=2,
                    help="path B DataLoader workers. Keep at 0 or 2 — 4 has deadlocked this box.")
    ap.add_argument("--miss-target", type=int, default=MISS_TARGET,
                    help="matched operating point: phantoms while misses stay <= this")
    ap.add_argument("--dataset", default=None,
                    help="evaluate on THIS dataset's split instead of the one the runs were "
                         "trained on (e.g. occ-real6, which extends occ-real5nd by a held-out "
                         "phone session and keeps train/val identical)")
    ap.add_argument("--log", default="data/_perf/sweep_infer_size.log")
    args = ap.parse_args()

    sizes = tuple(int(s) for s in args.sizes.split(","))
    run_names = [r for r in args.runs.split(",") if r]
    splits = [s for s in args.splits.split(",") if s]
    log = Log(Path(args.log) if args.log else None)

    from chesslab.training.engine import get_device

    device = args.device or str(get_device(require_gpu=False))
    log(f"device={device} sizes={sizes} runs={run_names} splits={splits} "
        f"paths={args.paths} miss_target={args.miss_target}")

    runs: dict[str, tuple] = {}
    for name in run_names:
        run_dir = config.DATA.models / name
        model, cfg = load_torch_run(run_dir)
        occupancy_reader(cfg)                 # refuse a run we cannot score, before any GPU work
        model.to(device)
        runs[name] = (run_dir, model, cfg)
        log(f"loaded {name}: backbone={cfg['backbone']} norm={cfg.get('norm')} "
            f"out_size={cfg['out_size']} scales={cfg.get('scales')} dataset={cfg['dataset']} "
            f"classes={len(cfg['classes'])} "
            f"identity={classes_have_identity(list(cfg['classes']))}")

    if args.dataset:
        # A dataset whose TRAIN split differs from the run's would leak; the caller is trusted to
        # know that, so the override is logged loudly rather than guessed at. The real use is a
        # corpus extended by a held-out session — occ-real6 is occ-real5nd plus one phone session,
        # with byte-identical train and val lists.
        log(f"[OVERRIDE] evaluating on dataset '{args.dataset}' instead of the runs' own "
            f"{sorted({cfg['dataset'] for _, _, cfg in runs.values()})} — verify the train split "
            "matches, or the numbers are leaked.")
        dd = dataset_dir(args.dataset)
    else:
        ds_names = {cfg["dataset"] for _, _, cfg in runs.values()}
        if len(ds_names) != 1:
            raise SystemExit(f"runs disagree about the dataset ({ds_names}) — splits would differ")
        dd = dataset_dir(ds_names.pop())
    manifest = load_manifest(dd / "manifest.jsonl")
    split = load_split(dd / "split.json")

    profile_note = set()
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
            prof = labeling._profile_for_session(
                labeling.read_session_meta(config.DATA.sessions / sid), None)
            profile_note.add((prof.profile, prof.board_size, warp_px_per_square(prof)))
            log(f"   session {sid}: camera {px_per_square(sid):.1f} px/square, "
                f"warped to {warp_px_per_square(prof):.1f} px/square "
                f"(profile '{prof.profile}', board_size={prof.board_size})")

        a_all = (sweep_path_a(runs, rows, sizes, device, log) if "a" in args.paths else {})
        for name, (run_dir, model, cfg) in runs.items():
            a = {s: a_all[(name, s)] for s in sizes} if a_all else {}
            b = (sweep_path_b(run_dir, model, cfg, rows, sizes, device, args.batch_size,
                              args.num_workers, log) if "b" in args.paths else {})
            verdict[(name, split_name)] = report(log, name, split_name, sizes, a, b,
                                                 args.miss_target)
            if a:
                report_by_session(log, name, sizes, a, session_index(frames_for_split(rows)))

    log("")
    log("best(split) summary — path A is authoritative:")
    for (name, split_name), best in verdict.items():
        log(f"  {name:<14} {split_name:<5} {best}")
    log("")
    log("NOTE: every session in a profile is warped to board_size/8 px/square before the crop is "
        "cut, so 'native camera resolution' does not reach the model directly: "
        f"{sorted(profile_note)}")
    log.close()


if __name__ == "__main__":
    main()
