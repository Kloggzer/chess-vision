"""Pool vs session pack on ONE real session: same rows? same pixels? same accuracy?

The pool path resamples twice (board -> 128 px WebP -> model size), the pack path cuts once from
the board store straight at model size, so the two disagree BY DESIGN. This measures by how much,
and proves the row sets and labels are identical — the part that must not differ at all.

    uv run python scripts/pack_parity.py --session rg-2026-08-08-11-59-12 [--size 80]

The pool arm is sliced into its OWN tag first. `data/crops/default/` is a cut from whenever the
session was last sliced, and this one moved since: 53 frames and 8 labels apart from today's log
(2026-09-05). Against that pool the row comparison measures the pool's age, not the pack path.

One session means the session-based split assigner leaves val and test empty (it never splits a
session), so both builds are `--allow-degenerate` and both trainings run against a
`split-parity.json` whose val IS the train session. That measures the two pixel paths against each
other, never generalisation — the numbers are comparable to each other and to nothing else.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from chesslab import config  # noqa: E402
from chesslab.dataset_build import dataset_dir  # noqa: E402
from chesslab.ioutil import write_json  # noqa: E402
from chesslab.training import packs  # noqa: E402
from chesslab.training.data import load_manifest  # noqa: E402
from chesslab.training.pack import (  # noqa: E402
    load_packed,
    open_packed_memmap,
    resolve_dataset_packs,
)

POOL = "sp-parity-pool"
PACKS = "sp-parity-packs"
POOL_TAG = "sp-parity"
#: The pool's own crop side — `board_size` 928 with `pad_side` 0.05 gives 127.6 px (§3.1).
POOL_SIDE = 128
SPLIT_FILE = "split-parity.json"
#: Mean absolute channel difference the two cutting paths may drift apart, in grey levels.
MAX_MEAN_DIFF = 6.0


def _cli(*args: str) -> None:
    cmd = [sys.executable, "-m", "chesslab.cli", *args]
    print("\n$ chesslab " + " ".join(args), flush=True)
    subprocess.run(cmd, check=True)


def _key(row: dict) -> tuple[str, str, str, str]:
    return (row["session_id"], str(row["frame"]), row["square"], row["label"])


def _reader(name: str, paths: config.Paths) -> tuple[list[dict], dict]:
    """`(rows, key -> (memmap, index))` for a pool-built or a pack-built dataset alike."""
    rows = load_manifest(dataset_dir(name, paths) / "manifest.jsonl")
    mp = resolve_dataset_packs(name, paths, manifest_rows=rows)
    if mp is not None:
        mms = [open_packed_memmap(p, s) for p, s in mp.files]
        return rows, {_key(r): (mms[r["_pack_at"][0]], r["_pack_at"][1]) for r in rows}
    packed = load_packed(name, paths, manifest_rows=rows)
    if packed is None:
        raise SystemExit(f"[FAIL] dataset '{name}' has no memmap — nothing to compare pixel-wise.")
    path, shape, path2idx = packed
    mm = open_packed_memmap(path, shape)
    return rows, {_key(r): (mm, r["_packed_idx"] if path2idx is None else path2idx[r["path"]])
                  for r in rows}


def write_parity_split(name: str, paths: config.Paths) -> None:
    """A split whose val is the train session — the only way one session reaches a val loader."""
    dd = dataset_dir(name, paths)
    split = json.loads((dd / "split.json").read_text(encoding="utf-8"))
    split["splits"]["val"] = list(split["splits"]["train"])
    write_json(dd / SPLIT_FILE, split)


def row_parity(pool_rows: list[dict], pack_rows: list[dict]) -> tuple[set, dict]:
    a = {_key(r) for r in pool_rows}
    b = {_key(r) for r in pack_rows}
    return a & b, {"pool_rows": len(pool_rows), "pack_rows": len(pack_rows),
                   "pool_keys": len(a), "pack_keys": len(b),
                   "only_pool": len(a - b), "only_packs": len(b - a), "common": len(a & b)}


def parity_problems(counts: dict, px: dict) -> list[str]:
    """Was der Nachweis NICHT belegt hat. Eine leere Schnittmenge ist kein Beweis von Gleichheit,
    und zwei Zeilenlisten koennen als MENGE gleich sein und trotzdem verschieden viele Zeilen
    tragen — genau der Fall, den ein `--like`-Zwilling schon mit 228 Zeilen Unterschied lieferte.
    """
    bad = []
    if not counts["common"] or not px["n"]:
        bad.append("nichts verglichen: 0 gemeinsame Zeilen")
    if counts["only_pool"] or counts["only_packs"]:
        bad.append(f"Zeilenmengen verschieden (nur Pool {counts['only_pool']}, "
                   f"nur Packs {counts['only_packs']})")
    if counts["pool_rows"] != counts["pack_rows"]:
        bad.append(f"Zeilenzahl verschieden: {counts['pool_rows']} gegen {counts['pack_rows']}")
    if px["n"] and px["mean"] > MAX_MEAN_DIFF:
        bad.append(f"mean abs diff {px['mean']:.3f} > {MAX_MEAN_DIFF}")
    return bad


def pixel_parity(common: set, pool_at: dict, pack_at: dict) -> dict:
    keys = sorted(common)
    if not keys:
        return {"mean": float("nan"), "p99": float("nan"), "max": float("nan"),
                "n": 0, "worst": []}
    diffs = np.empty(len(keys), dtype=np.float64)
    for i, k in enumerate(keys):
        mm_a, ia = pool_at[k]
        mm_b, ib = pack_at[k]
        a = np.asarray(mm_a[ia], dtype=np.int16)
        b = np.asarray(mm_b[ib], dtype=np.int16)
        if a.shape != b.shape:
            raise SystemExit(f"[FAIL] crop shapes differ: pool {a.shape} vs pack {b.shape}")
        diffs[i] = np.abs(a - b).mean()
    worst = np.argsort(diffs)[-5:][::-1]
    return {"mean": float(diffs.mean()), "p99": float(np.percentile(diffs, 99)),
            "max": float(diffs.max()), "n": len(keys),
            "worst": [(keys[j], float(diffs[j])) for j in worst]}


def train_and_eval(name: str, paths: config.Paths) -> float | None:
    """One epoch, one worker, the default backbone; then eval BOTH arms against the pool corpus."""
    run = str(paths.models / f"sp-parity-{name.rsplit('-', 1)[-1]}")
    # `--no-empty-cap`: the cap protects the mined hard empties by CROP PATH, which no `mm://`
    # row can match — with it on, the two arms would train on different rows.
    _cli("train", "--dataset", name, "--epochs", "1", "--num-workers", "1", "--seed", "42",
         "--split", SPLIT_FILE, "--no-empty-cap", "--out", run)
    _cli("eval", "--run", run, "--dataset", POOL, "--split", "train", "--split-file", SPLIT_FILE)
    trained_on = json.loads(Path(run, "config.json").read_text(encoding="utf-8")).get("dataset")
    stem = "train" if trained_on == POOL else f"train__{POOL}"
    return json.loads(Path(run, f"eval_{stem}.json").read_text(encoding="utf-8"))[
        "visible_piece_acc"]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--session", required=True, help="Session ID, e.g. rg-2026-08-08-11-59-12.")
    ap.add_argument("--size", type=int, default=packs.DEFAULT_PACK_SIDE, help="Crop side in px.")
    args = ap.parse_args()
    paths = config.DATA
    size = args.size

    pack_name = f"{args.session}-{size}"
    if packs.pack_dir(pack_name, paths).exists():
        print(f"[skip] pack {pack_name} already exists")
    else:
        _cli("session", "pack", "--session", args.session, "--size", str(size))

    pool_manifest = paths.crops / POOL_TAG / "manifest.jsonl"
    if pool_manifest.exists():
        print(f"[skip] crop pool {pool_manifest} already exists")
    else:
        _cli("slice", "--session", args.session, "--variant-tag", POOL_TAG,
             "--out-size", f"{POOL_SIDE}x{POOL_SIDE}")

    _cli("dataset", "build", POOL, "--sessions", args.session, "--classes", "pieces13",
         "--source-manifest", pool_manifest.as_posix(),
         "--pack-size", f"{size}x{size}", "--allow-degenerate")
    _cli("dataset", "build", PACKS, "--sessions", args.session, "--classes", "pieces13",
         "--from-packs", "--pack-size", f"{size}x{size}", "--allow-degenerate")

    pool_rows, pool_at = _reader(POOL, paths)
    pack_rows, pack_at = _reader(PACKS, paths)
    common, counts = row_parity(pool_rows, pack_rows)
    px = pixel_parity(common, pool_at, pack_at)

    for name in (POOL, PACKS):
        write_parity_split(name, paths)
    acc: dict[str, float | None] = {}
    train_error = None
    try:
        for name in (POOL, PACKS):
            acc[name] = train_and_eval(name, paths)
    except (subprocess.CalledProcessError, OSError, KeyError, ValueError) as exc:
        train_error = f"{type(exc).__name__}: {exc}"
        print(f"\n[WARN] the training step failed — the parity numbers above still stand.\n"
              f"       {train_error}", flush=True)

    print(f"\n=== pack parity: {args.session} @ {size} px ===")
    print(f"{'rows (pool / packs)':<28} {counts['pool_rows']} / {counts['pack_rows']}")
    print(f"{'symmetric difference':<28} {counts['only_pool'] + counts['only_packs']} "
          f"(pool-only {counts['only_pool']}, packs-only {counts['only_packs']})")
    print(f"{'common rows compared':<28} {px['n']}")
    print(f"{'mean abs diff':<28} {px['mean']:.3f} / 255")
    print(f"{'p99 per-crop mean diff':<28} {px['p99']:.3f} / 255   (max {px['max']:.3f})")
    for k, d in px["worst"]:
        print(f"{'  worst':<28} {'/'.join(k)}  {d:.3f}")
    for name in (POOL, PACKS):
        v = acc.get(name)
        print(f"{'visible_piece_acc ' + name.split('-')[-1]:<28} "
              f"{'—  (' + str(train_error) + ')' if v is None else f'{v:.4f}'}")

    problems = parity_problems(counts, px)
    if problems:
        raise SystemExit("[FAIL] " + "; ".join(problems))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
