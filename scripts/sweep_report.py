"""Sweep-Tabelle: `best` UND das Mittel der letzten fuenf Epochen, nebeneinander.

`best` ist ein Maximum ueber 60 verrauschte Ziehungen und liegt im Schnitt 0,022 ueber dem Trend
(`docs/measurement-floor.md` 2) — es taugt zur Auswahl des Checkpoints, nicht als Guete. Die
Spalte `last5` ist der ehrlichere Vergleich zwischen Armen, `d` die Differenz zum ersten Arm.

    uv run python scripts/sweep_report.py --dir data/models/_arch [--axis val_visible_piece_acc]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

#: Streuung einer einzelnen Val-Messung im flachen Kurventeil, aus 23 Laeufen in `_ab`.
EPOCH_SD = 0.0157


def read_run(run: Path, axis: str) -> dict | None:
    metrics = run / "metrics.jsonl"
    if not metrics.is_file():
        return None
    rows = []
    for line in metrics.read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    rows = [r for r in rows if axis in r]
    if not rows:
        return None
    cfg = {}
    if (run / "config.json").is_file():
        cfg = json.loads((run / "config.json").read_text(encoding="utf-8"))
    last5 = [r[axis] for r in rows[-5:]]
    best = max(rows, key=lambda r: r[axis])
    return {
        "arm": run.name,
        "backbone": cfg.get("backbone", "?"),
        "n": len(rows),
        "best": best[axis],
        "best_ep": best["epoch"],
        "last5": sum(last5) / len(last5),
        "macro": best.get("val_macro_recall", float("nan")),
        "cov_p": best.get("val_coverage_precision", float("nan")),
    }


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

    ref = got[0]["last5"]
    print(f"\nAchse: {args.axis}   Bezug: {got[0]['arm']}   "
          f"Rauschen einer Epoche sd={EPOCH_SD:.4f}, gepaart ~0,003")
    print(f"{'arm':22s} {'backbone':32s} {'best':>7s} {'ep':>4s} {'last5':>7s} "
          f"{'d':>7s} {'macro':>7s} {'cov_p':>7s}")
    for r in got:
        d = r["last5"] - ref
        mark = "" if abs(d) > 3 * EPOCH_SD or r is got[0] else "  (im Rauschen)"
        print(f"{r['arm'][:22]:22s} {r['backbone'][:32]:32s} {r['best']:7.4f} {r['best_ep']:4d} "
              f"{r['last5']:7.4f} {d:+7.4f} {r['macro']:7.4f} {r['cov_p']:7.4f}{mark}")
    short = [r["arm"] for r in got if r["n"] < max(x["n"] for x in got)]
    if short:
        print(f"\n[!] unvollstaendig, nicht vergleichbar: {', '.join(short)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
