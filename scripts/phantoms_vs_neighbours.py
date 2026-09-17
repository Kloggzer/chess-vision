"""Does an empty square get harder to read when its NEIGHBOURS are occupied?

The per-square classifier never sees the board — one crop in, one occupied/empty out — so position
diversity ought to buy nothing, and a start-position session ought to be worth as much per crop as a
mid-game one. Worth checking rather than assuming, because there are two ways a neighbour can reach
these pixels even though the crop box is barely larger than its cell (`pad_side 0.05`
of a 100 px cell):

- The homography rectifies the board PLANE. Anything above it is displaced outward, so a tall piece
  on an adjacent square can lean into this crop unless the camera is exactly overhead.
- Shadows fall on neighbours, and a shadow inside an empty cell is the classic phantom.

Neither is assumed here. The script buckets EMPTY crops by how many of their eight neighbours are
truly occupied — read from the manifest labels, not from a prediction — and reports what the model
does in each bucket. A flat table says the crop really is one square and the hypothesis holds.

    uv run python scripts/phantoms_vs_neighbours.py --run occ-v6-f5nd --dataset occ-real6a
"""

from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))


def _neighbours(sq: str) -> list[str]:
    f, r = ord(sq[0]) - 97, int(sq[1]) - 1
    return [f"{chr(97 + f + df)}{r + dr + 1}"
            for df in (-1, 0, 1) for dr in (-1, 0, 1)
            if (df or dr) and 0 <= f + df < 8 and 0 <= r + dr < 8]


def _band(v) -> str:
    if not len(v):
        return "n=0 — nicht gemessen"
    return f"mean {v.mean():.4f}  max {v.max():.4f}  n={len(v)}"


def main() -> int:
    import numpy as np
    from sweep_infer_size import (
        Log,
        filter_rows_by_split,
        frames_for_split,
        load_torch_run,
        sweep_path_a,
    )

    from chesslab import config, labeling
    from chesslab.dataset_build import dataset_dir
    from chesslab.training.data import load_manifest, load_split
    from chesslab.training.engine import get_device

    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--run", required=True)
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--split", default="test")
    ap.add_argument("--split-file", default="split.json",
                    help="Split file inside the dataset, e.g. a fold's split-f0.json. "
                         "A fold model scored against split.json measures its own train sessions.")
    ap.add_argument("--size", type=int, default=80)
    ap.add_argument("--device", default=None)
    args = ap.parse_args()

    dd = dataset_dir(args.dataset)
    rows = filter_rows_by_split(load_manifest(dd / "manifest.jsonl"),
                                load_split(dd / args.split_file), args.split)
    device = args.device or str(get_device(require_gpu=False))
    run_dir = config.DATA.models / args.run
    model, cfg = load_torch_run(run_dir)
    model.to(device)
    log = Log(None)
    acc = sweep_path_a({args.run: (run_dir, model, cfg)}, rows, (args.size,), device, log)
    trues, _preds, probs = acc[(args.run, args.size)]

    # Rebuild the key of every accumulated crop the way sweep_path_a produced them: group by group,
    # and within a group in `all_squares()` order restricted to the squares the manifest has.
    squares = labeling.all_squares()
    groups = frames_for_split(rows)
    keys = [(sid, fr, sq) for sid, fr, labels in groups for sq in squares if sq in labels]
    if len(keys) != len(probs):
        raise SystemExit(f"alignment broken: {len(keys)} keys against {len(probs)} scores")

    occupied: dict[tuple[str, str], set[str]] = defaultdict(set)
    for sid, fr, labels in groups:
        for sq, lab in labels.items():
            if lab != "empty":
                occupied[(sid, fr)].add(sq)

    buckets: dict[int, list[float]] = defaultdict(list)
    for (sid, fr, sq), t, p in zip(keys, trues, probs, strict=True):
        if t:                                     # occupied square — not a phantom candidate
            continue
        n = sum(1 for s in _neighbours(sq) if s in occupied[(sid, fr)])
        buckets[n].append(float(p))

    print(f"\n{args.run} @ {args.size}px on {args.dataset}/{args.split} — EMPTY crops only\n")
    print(f"{'occupied neighbours':>20}{'crops':>9}{'mean P(occ)':>13}{'p99':>10}{'max':>9}{'>=0.5':>8}")
    print("-" * 69)
    for n in sorted(buckets):
        v = np.array(buckets[n])
        print(f"{n:>20}{len(v):>9}{v.mean():13.4f}{np.percentile(v, 99):10.4f}{v.max():9.4f}"
              f"{int((v >= 0.5).sum()):>8}")

    # Ein leerer Bucket ist nicht gemessen. `[np.nan]` machte daraus n=1 mit mean nan, und das
    # Verhaeltnis wurde still `nan` bzw. — gegen 1e-12 — eine astronomische Zahl.
    lonely = np.array(buckets.get(0, []), dtype=float)
    crowded = np.array([p for n in sorted(buckets) if n >= 3 for p in buckets[n]], dtype=float)
    print(f"\n  0 neighbours : {_band(lonely)}")
    print(f"  3+ neighbours: {_band(crowded)}")
    if len(lonely) and len(crowded) and lonely.mean() > 0:
        print(f"  ratio of means: {crowded.mean() / lonely.mean():.1f}x")
    else:
        print("  ratio of means: — (ein Bucket ist leer, nicht 0)")
    print("\nA ratio near 1 means the crop really is one square, and a start-position session is\n"
          "worth as much per crop as a mid-game one. A ratio that climbs means the neighbours reach\n"
          "these pixels, and a fixed layout only ever samples the part of the range it produces.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
