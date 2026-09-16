"""Aendern mehr Loader-Worker das ERGEBNIS - und wenn nein, wie viel Zeit kaufen sie?

CLAUDE.md sagt "der Feed ist nicht mehr der Engpass". Das war am monolithischen Memmap mit
Pinned Memory gemessen; auf Session-Packs mit `--low-memory` wartet der Schritt zu 68-77 % auf
Daten. Bevor daraus eine Empfehlung wird, muss die Bitgleichheit stehen: mit `--batch-aug` liegt
die Augmentierung auf der GPU und der Sampler ist geseedet, also DUERFTE die Worker-Zahl nichts
aendern. Duerfen ist keine Messung.

    uv run python scripts/worker_probe.py --workers 2,4 --epochs 3
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
from pathlib import Path

from chesslab.ioutil import read_jsonl

#: Das Konsolenskript, nicht `python -m chesslab` - ein `__main__.py` gibt es nicht.
CHESSLAB = str(Path(".venv/Scripts/chesslab.exe").resolve())
#: Ohne das waehlt Triton clang, dem die Windows-Header fehlen - `scripts/campaign_v7.ps1` setzt
#: es ebenso. Ein Lauf ohne `CC` stirbt beim Kompilieren der Batch-Augmentierung.
TCC = str(Path(".venv/Lib/site-packages/triton/runtime/tcc/tcc.exe").resolve())


def run(workers: int, epochs: int, dataset: str, frac: float) -> list[dict]:
    out = Path(f"data/tmp/wprobe-w{workers}")
    shutil.rmtree(out, ignore_errors=True)
    cmd = [CHESSLAB, "train", "--backbone", "boardattn:cellnet_p4",
           "--no-pretrained", "--dataset", dataset, "--split", "split-pin.json",
           "--out", str(out), "--epochs", str(epochs), "--batch-size", "256", "--lr", "0.01",
           "--sched", "cosine", "--weight-decay", "0.01", "--head", "occlusion", "--seed", "42",
           "--low-memory", "--ram-reserve-gb", "4", "--patience", "999",
           "--num-workers", str(workers), "--epoch-frac", str(frac), "--weight-cap", "3.0",
           "--board-width", "128", "--board-layers", "2", "--rot90", "--hflip-p", "0.5",
           "--batch-aug", "--compile-batch-aug", "--compile-model", "--fused-adamw"]
    env = {**os.environ, "CC": TCC, "OPENBLAS_NUM_THREADS": "1"}
    log = out.with_suffix(".log")
    out.mkdir(parents=True, exist_ok=True)
    with log.open("w", encoding="utf-8") as fh:
        subprocess.run(cmd, check=False, stdout=fh, stderr=subprocess.STDOUT, env=env)
    m = out / "metrics.jsonl"
    if not m.exists():
        tail = log.read_text(encoding="utf-8", errors="replace").splitlines()[-6:]
        raise SystemExit(f"[FAIL] {workers} Worker: kein metrics.jsonl. " + chr(10).join(tail))
    return read_jsonl(m)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--workers", default="2,4")
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--dataset", default="real13-mix-v7-128")
    ap.add_argument("--epoch-frac", type=float, default=0.1)
    args = ap.parse_args()

    got = {}
    for w in [int(x) for x in args.workers.split(",")]:
        print(f"[probe] {w} Worker ...", flush=True)
        got[w] = run(w, args.epochs, args.dataset, args.epoch_frac)

    base = min(got)
    print(f"\n{'Worker':>7} {'train_loss (alle Epochen)':38s} {'s/Epoche':>9} {'Daten':>8} {'bitgleich':>10}")
    for w, rows in sorted(got.items()):
        losses = [r["train_loss"] for r in rows]
        per = sum(r["t_train_s"] + r["t_val_s"] for r in rows) / len(rows)
        dat = sum(r["t_data_s"] for r in rows) / len(rows)
        same = "-" if w == base else ("JA" if losses == [r["train_loss"] for r in got[base]] else "NEIN")
        print(f"{w:7d} {str([round(x, 6) for x in losses]):38s} {per:8.1f}s {dat:7.1f}s {same:>10}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
