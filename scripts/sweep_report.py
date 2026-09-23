"""Sweep-Tabelle: `best` (waehlt nur den Checkpoint) neben dem Mittel der letzten `TAIL` Epochen.

Das Rauschen kommt aus DIESEM Sweep, je Arm ueber seine Schwanz-Epochen; ohne Seeds Untergrenze.

    uv run python scripts/sweep_report.py --dir data/models/_arch [--axis val_visible_piece_acc]
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
from pathlib import Path

from chesslab.ioutil import read_jsonl

TAIL = 20
TAIL_MIN = 10


def _mean(rows: list[dict], key: str) -> float:
    vals = [r[key] for r in rows if key in r]
    return sum(vals) / len(vals) if vals else float("nan")


def read_run(run: Path, axis: str) -> dict | None:
    metrics = run / "metrics.jsonl"
    if not metrics.is_file():
        return None
    rows = [r for r in read_jsonl(metrics) if axis in r]
    if not rows:
        return None
    cfg = {}
    if (run / "config.json").is_file():
        cfg = json.loads((run / "config.json").read_text(encoding="utf-8"))
    tail = rows[-TAIL:]
    vals = [r[axis] for r in tail]
    best = max(rows, key=lambda r: r[axis])
    return {
        "arm": run.name,
        "backbone": cfg.get("backbone", "?"),
        "n": len(rows),
        "best": best[axis],
        "best_ep": best["epoch"],
        "k": len(vals),
        "tail": sum(vals) / len(vals),
        "tail_sd": statistics.stdev(vals) if len(vals) > 1 else float("nan"),
        "macro": _mean(tail, "val_macro_recall"),
        "cov_p": _mean(tail, "val_coverage_precision"),
    }


def noise(a: dict, b: dict) -> float:
    """Standardfehler der Differenz zweier Schwanz-Mittel, aus den Epochen der beiden Laeufe."""
    return math.sqrt(a["tail_sd"] ** 2 / a["k"] + b["tail_sd"] ** 2 / b["k"])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="data/models/_arch")
    ap.add_argument("--axis", default="val_visible_piece_acc")
    args = ap.parse_args()

    runs = sorted(p for p in Path(args.dir).iterdir() if p.is_dir())
    got = [r for r in (read_run(p, args.axis) for p in runs) if r]
    if not got:
        print(f"[FAIL] keine Laeufe mit `{args.axis}` unter {args.dir}")
        return 1

    ref = got[0]
    print(f"\nAchse: {args.axis}   Bezug: {ref['arm']}   Mittel der letzten {TAIL} Epochen, "
          f"Rauschen je Arm aus diesem Sweep (ohne Seed-Streuung: Untergrenze)")
    print(f"{'arm':22s} {'backbone':32s} {'best':>7s} {'ep':>4s} {'tail':>7s} {'sd':>7s} "
          f"{'d':>7s} {'macro':>7s} {'cov_p':>7s}")
    for r in got:
        d = r["tail"] - ref["tail"]
        if r is ref:
            mark = ""
        elif min(r["k"], ref["k"]) < TAIL_MIN:
            mark = f"  (unter {TAIL_MIN} Epochen, kein Urteil)"
        else:
            mark = "" if abs(d) > 3 * noise(r, ref) else "  (im Rauschen)"
        print(f"{r['arm'][:22]:22s} {r['backbone'][:32]:32s} {r['best']:7.4f} {r['best_ep']:4d} "
              f"{r['tail']:7.4f} {r['tail_sd']:7.4f} {d:+7.4f} {r['macro']:7.4f} "
              f"{r['cov_p']:7.4f}{mark}")
    short = [r["arm"] for r in got if r["n"] < max(x["n"] for x in got)]
    if short:
        print(f"\n[!] unvollstaendig, nicht vergleichbar: {', '.join(short)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
