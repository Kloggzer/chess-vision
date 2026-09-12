"""Alte Laeufe gegen DENSELBEN Massstab - sonst vergleicht man Splits, nicht Modelle.

Ein Lauf wird gegen den v7-Satz SEINER Aufloesung gestellt (80-px-Modelle gegen `-80`, 128er
gegen `-128`): Zeilen und Split sind in beiden identisch, nur der Pack unterscheidet sich. Wer
den v7-Val im eigenen Training hatte, wird abgewiesen statt geschoent.

    uv run python scripts/cross_eval.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

VAL = "rg-2026-09-06-20-27-33"
RUNS = [
    ("data/models/p4a-80-clahe", "real13-mix-v7-80"),
    ("data/models/_arch80v6/p4a-s42", "real13-mix-v7-80"),
    ("data/models/_arch80v6/rot-s42", "real13-mix-v7-80"),
    ("data/models/_arch128v6/p4a-s42", "real13-mix-v7-128"),
    ("data/models/_arch128v6/rot-s42", "real13-mix-v7-128"),
    ("data/models/_acc80v7/rot-s42", "real13-mix-v7-80"),
    ("data/models/_acc128v7/rot-s42", "real13-mix-v7-128"),
]


def trained_on_val(run: Path) -> bool:
    cfg = json.loads((run / "config.json").read_text(encoding="utf-8"))
    sp = Path("data/datasets") / str(cfg.get("dataset")) / (cfg.get("split_file") or "split.json")
    if not sp.exists():
        return False
    return VAL in set(json.loads(sp.read_text(encoding="utf-8"))["splits"].get("train") or [])


def main() -> int:
    for run, dataset in RUNS:
        p = Path(run)
        if not (p / "best.pt").exists():
            print(f"[skip] {run}: kein best.pt")
            continue
        if trained_on_val(p):
            print(f"[SKIP] {run}: hatte {VAL} im Training - nicht vergleichbar")
            continue
        print(f"\n=== {run} gegen {dataset} ===", flush=True)
        subprocess.run([sys.executable, "-m", "chesslab", "eval", "--run", run,
                        "--dataset", dataset, "--split", "val",
                        "--split-file", "split-pin.json"], check=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
