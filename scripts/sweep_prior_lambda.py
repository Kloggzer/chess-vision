"""Sweep the legal-placement prior's weight against a dataset manifest.

The prior says, per square, which labels chess allows there after one half-move from the last
committed position (`state.possible_labels`). `serving.apply_prior` folds it onto the softmax as
`p * exp(-lambda)` on the disallowed classes — identical to `logit + lambda * log_prior` under the
original softmax, because the head emits log-probabilities.

**The model runs ONCE.** The probabilities do not depend on lambda, so every value is swept
arithmetically over the same cached softmax. That is the point of putting the prior after the CNN
instead of inside it: no retraining, no export, and a sweep that costs one forward pass.
`--probs-cache` writes those probabilities out so a second sweep needs no model at all.

The prior's base is the FEN of the PREVIOUS ply in the same session — never the frame's own, which
would be the answer. A frame at ply k is judged by what was known after ply k-1, which is what the
tracker has when it looks. Rows at a session's first ply have no base and are reported separately.

Reported per lambda, over the crops that survive `--max-coverage` (an occluded cell's label is not
a statement about what the pixels show):

- `cell` / `board` accuracy — board = all of a frame's judged squares correct.
- `phantom` — a truly empty square read as a piece. The veto metric: phantoms disqualify, misses
  are recoverable.
- `miss` — a truly occupied square read as empty.
- `illegal` — the argmax landing on a class the prior excludes. At lambda 0 this is the damage the
  prior exists to undo; it must fall monotonically as lambda rises.
- `dropped` — squares under `--conf-thr`, which `DeepSearch.channelFor` discards before the beam
  search ever sees them.
- `rescued` / `broken` — squares that cross that threshold INTO a correct reading, or out of one.
  This is the claim the prior is built on and the number that decides whether it holds.

`broken` is necessarily 0 while the prior's base is right: the truth is then always among the
allowed labels, is never penalised, and can only gain from the renormalisation. It measures
something only in the RISK case — `--base-offset 2 --keep-unreachable` builds the prior on a
position the tracker has already fallen behind, so the correct answer is forbidden. That run is
what a lambda has to survive, and it is where a finite lambda earns its keep over a hard mask.

Evaluation only: no training, no export, no rendering. One process.

Usage:
    .venv/Scripts/python.exe scripts/sweep_prior_lambda.py
        [--run comp13-occ-bn-lr1e2-bs512] [--dataset real13-straight-80-v1] [--split test]
        [--lambdas 0,0.5,1,2,4,8] [--max-coverage 0.15] [--conf-thr 0.85] [--limit 0]
        [--device cuda|cpu] [--batch-size 256] [--probs-cache data/_perf/prior-probs.npz]
        [--out data/reports/sweep-prior-lambda.json]
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chesslab import config  # noqa: E402
from chesslab.dataset_build import dataset_dir  # noqa: E402
from chesslab.ioutil import write_json  # noqa: E402
from chesslab.serving import apply_prior, invalid_mass  # noqa: E402
from chesslab.state import possible_labels  # noqa: E402
from chesslab.training.data import filter_rows_by_split, load_manifest, load_split  # noqa: E402

LAMBDAS = (0.0, 0.5, 1.0, 2.0, 4.0, 8.0)
DATASET = "real13-straight-80-v1"
RUN = "comp13-occ-bn-lr1e2-bs512"


def prior_by_ply(rows: list[dict], offset: int = 1, keep_unreachable: bool = False,
                 ) -> tuple[dict[tuple[str, int], dict[str, set[str]]], dict]:
    """{(session, ply): allowed-labels} from the FEN `offset` plies back, plus a consistency report.

    The truth at ply k must be reachable from its base, or the prior rests on an assumption the
    data does not support. Those plies are counted and EXCLUDED — unless `keep_unreachable`, which
    is how `--base-offset 2` stages the risk case: a prior built on a position the tracker has
    already fallen behind, where the right answer IS forbidden and only a finite lambda saves it.
    """
    import chess

    fens: dict[str, dict[int, str]] = defaultdict(dict)
    truth: dict[tuple[str, int], dict[str, str]] = defaultdict(dict)
    for r in rows:
        if r.get("ply") is None or not r.get("fen"):
            continue
        sid, ply = r["session_id"], int(r["ply"])
        fens[sid][ply] = r["fen"]
        truth[(sid, ply)][r["square"]] = r["label"]

    out: dict[tuple[str, int], dict[str, set[str]]] = {}
    report: dict = {"no_base": 0, "unreachable": 0, "unreachable_plies": []}
    cache: dict[str, dict[str, set[str]]] = {}
    for sid, by_ply in fens.items():
        for ply in sorted(by_ply):
            base = by_ply.get(ply - offset)
            if base is None:
                report["no_base"] += 1
                continue
            if base not in cache:
                cache[base] = possible_labels(chess.Board(base))
            allowed = cache[base]
            bad = [sq for sq, label in truth[(sid, ply)].items() if label not in allowed[sq]]
            if bad:
                report["unreachable"] += 1
                if len(report["unreachable_plies"]) < 10:
                    report["unreachable_plies"].append(f"{sid}@{ply}: {','.join(sorted(bad)[:6])}")
                if not keep_unreachable:
                    continue
            out[(sid, ply)] = allowed
    return out, report


def probabilities(run_dir: Path, rows: list[dict], pack: Path, device: str,
                  batch_size: int, cache: Path | None) -> np.ndarray:
    """(len(rows), n_classes) softmax rows, read from the packed memmap in manifest order."""
    if cache is not None and cache.exists():
        stored = np.load(cache)
        if len(stored["probs"]) == len(rows):
            print(f"probs: reusing {cache} ({len(rows)} rows)")
            return stored["probs"]
        print(f"probs: {cache} holds {len(stored['probs'])} rows for {len(rows)} — recomputing")

    from chesslab.serving import predict_arrays

    meta = json.loads((pack / "packed_meta.json").read_text(encoding="utf-8"))
    shape = (int(meta["n"]), int(meta["h"]), int(meta["w"]), 3)
    # BGR on disk (`dataset_build` packs `cv2.imread` output) and BGR is what `predict_arrays`
    # documents as its input, so the memmap goes in untouched.
    images = np.memmap(pack / "packed_images.u8", dtype=np.uint8, mode="r", shape=shape)
    index = {p: i for i, p in enumerate(meta["paths"])}
    missing = [r["path"] for r in rows if r["path"] not in index]
    if missing:
        raise SystemExit(f"{len(missing)} manifest rows are not in the pack, e.g. {missing[0]}")
    order = [index[r["path"]] for r in rows]

    out: list[list[float]] = []
    for start in range(0, len(order), batch_size):
        batch_order = order[start:start + batch_size]
        crops = [np.asarray(images[i]) for i in batch_order]
        # Older ONNX exports have a static 64-row input. Padding the final partial batch is
        # numerically inert and lets the same sweep cover every manifest row instead of dying on
        # the last 1..63 crops after doing all expensive inference work.
        actual = len(crops)
        if crops and actual < batch_size:
            crops.extend([crops[-1]] * (batch_size - actual))
        predicted = predict_arrays(run_dir, crops, device, return_probs=True)
        out.extend(p["probs"] for p in predicted[:actual])
        print(f"  {min(start + batch_size, len(order))}/{len(order)}", end="\r", flush=True)
    print()
    probs = np.asarray(out, dtype=np.float64)
    if cache is not None:
        cache.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(cache, probs=probs)
        print(f"probs: wrote {cache}")
    return probs


def score(rows: list[dict], probs: np.ndarray, classes: list[str],
          priors: dict[tuple[str, int], dict[str, set[str]]],
          lam: float, conf_thr: float, baseline: list[tuple[bool, bool]] | None,
          ) -> tuple[dict, list[tuple[bool, bool]]]:
    """Metrics at one lambda, plus per-row (confident, correct) for the rescue comparison."""
    i_empty = classes.index("empty")
    cells = phantom = miss = illegal = invalid = dropped = correct = 0
    boards: dict[tuple[str, str], bool] = {}
    state: list[tuple[bool, bool]] = []
    for i, r in enumerate(rows):
        allowed = priors[(r["session_id"], int(r["ply"]))][r["square"]]
        p = apply_prior(list(probs[i]), classes, allowed, lam)
        top = max(range(len(classes)), key=lambda j: p[j])
        read, true = classes[top], r["label"]
        is_correct = read == true
        # Mirrors OccupancyObservation.labelConfident: a confident explicit invalid outcome
        # withholds the context-forced label. Lambda zero is the unconditioned before case.
        is_invalid = lam > 0.0 and invalid_mass(list(probs[i]), classes, allowed) >= conf_thr
        is_confident = p[top] >= conf_thr and not is_invalid
        state.append((is_confident, is_correct))

        cells += 1
        correct += is_correct
        if read not in allowed:
            illegal += 1
        if is_invalid:
            invalid += 1
        if true == "empty" and top != i_empty:
            phantom += 1
        if true != "empty" and top == i_empty:
            miss += 1
        if not is_confident:
            dropped += 1
        key = (r["session_id"], str(r["frame"]))
        boards[key] = boards.get(key, True) and is_correct

    rescued = broken = 0
    if baseline is not None:
        for (was_conf, was_ok), (is_conf, is_ok) in zip(baseline, state, strict=True):
            if not (was_conf and was_ok) and (is_conf and is_ok):
                rescued += 1
            elif (was_conf and was_ok) and not (is_conf and is_ok):
                broken += 1

    return {
        "lambda": lam,
        "cells": cells,
        "cell_acc": correct / cells if cells else 0.0,
        "board_acc": sum(boards.values()) / len(boards) if boards else 0.0,
        "boards": len(boards),
        "phantom": phantom,
        "miss": miss,
        "illegal": illegal,
        "invalid": invalid,
        "dropped": dropped,
        "rescued": rescued,
        "broken": broken,
    }, state


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", default=RUN, help="run name under data/models/")
    ap.add_argument("--dataset", default=DATASET)
    ap.add_argument("--split", default="test")
    ap.add_argument("--lambdas", default=",".join(str(x) for x in LAMBDAS))
    ap.add_argument("--max-coverage", type=float, default=0.15,
                    help="skip cells above this coverage (training/occlusion.PIECE_VISIBLE_MAX)")
    ap.add_argument("--conf-thr", type=float, default=0.85,
                    help="DeepSearch's channel threshold (CnnConfig.confThr)")
    ap.add_argument("--base-offset", type=int, default=1,
                    help="build the prior from the FEN this many plies back; 2 stages a tracker "
                         "that has fallen a move behind")
    ap.add_argument("--keep-unreachable", action="store_true",
                    help="keep plies whose truth the prior forbids — the risk case, not the clean one")
    ap.add_argument("--limit", type=int, default=0, help="0 = all rows")
    ap.add_argument("--device", default=None, help="default: cuda when available, else cpu")
    ap.add_argument("--batch-size", type=int, default=256)
    ap.add_argument("--probs-cache", default=None)
    ap.add_argument("--out", default="data/reports/sweep-prior-lambda.json")
    args = ap.parse_args()

    device = args.device
    if device is None:
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"

    pack = dataset_dir(args.dataset)
    rows = load_manifest(pack / "manifest.jsonl")
    split_file = pack / "split.json"
    if split_file.exists():
        rows = filter_rows_by_split(rows, load_split(split_file), args.split)
    print(f"{len(rows)} rows in {args.dataset}/{args.split}")

    kept = [r for r in rows if float(r.get("coverage") or 0.0) <= args.max_coverage]
    print(f"{len(rows) - len(kept)} dropped over coverage {args.max_coverage}")

    priors, report = prior_by_ply(kept, args.base_offset, args.keep_unreachable)
    rows = [r for r in kept if (r["session_id"], int(r["ply"] or -1)) in priors]
    print(f"{len(rows)} rows carry a prior "
          f"({report['no_base']} plies without a base, {report['unreachable']} unreachable)")
    for line in report["unreachable_plies"]:
        print(f"  unreachable: {line}")
    if not rows:
        raise SystemExit("no row has a usable prior — nothing to sweep")
    if args.limit:
        rows = rows[:args.limit]

    run_dir = config.DATA.models / args.run
    cache = Path(args.probs_cache) if args.probs_cache else None
    probs = probabilities(run_dir, rows, pack, device, args.batch_size, cache)
    classes = list(json.loads((run_dir / "config.json").read_text(encoding="utf-8"))["classes"])
    if probs.shape[1] != len(classes):
        raise SystemExit(f"probs carry {probs.shape[1]} columns for {len(classes)} classes")

    results, baseline = [], None
    for lam in [float(x) for x in args.lambdas.split(",") if x.strip()]:
        row, state = score(rows, probs, classes, priors, lam, args.conf_thr, baseline)
        if baseline is None:
            baseline = state
        results.append(row)
        print(f"lambda {lam:>5}  cell {row['cell_acc']:.4f}  board {row['board_acc']:.4f}  "
              f"phantom {row['phantom']:>5}  miss {row['miss']:>5}  illegal {row['illegal']:>5}  "
              f"invalid {row['invalid']:>4}  dropped {row['dropped']:>6}  "
              f"rescued {row['rescued']:>5}  broken {row['broken']:>4}")

    payload = {"run": args.run, "dataset": args.dataset, "split": args.split,
               "device": device, "conf_thr": args.conf_thr, "max_coverage": args.max_coverage,
               "base_offset": args.base_offset, "keep_unreachable": args.keep_unreachable,
               "rows": len(rows), "prior_report": report, "results": results}
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_json(out, payload)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
