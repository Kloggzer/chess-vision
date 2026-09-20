"""Alte Laeufe gegen DENSELBEN Massstab - sonst vergleicht man Splits, nicht Modelle.

Ein Lauf wird gegen den v7-Satz SEINER Aufloesung gestellt (80-px-Modelle gegen `-80`, 128er
gegen `-128`): Zeilen und Split sind in beiden identisch, nur der Pack unterscheidet sich. Wer
den v7-Val im eigenen Training hatte, wird abgewiesen statt geschoent.

    uv run python scripts/cross_eval.py
"""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

#: Das Konsolenskript, nicht `python -m chesslab` - ein `__main__.py` gibt es nicht.
CHESSLAB = str(Path(".venv/Scripts/chesslab.exe").resolve())
#: Ohne das waehlt Triton clang, dem die Windows-Header fehlen.
TCC = str(Path(".venv/Lib/site-packages/triton/runtime/tcc/tcc.exe").resolve())

VAL = "rg-2026-09-06-20-27-33"
#: `data/models/p4a-80-clahe` ist der EXPORT (nur config.json und model.onnx). Der Lauf dahinter
#: traegt die Gewichte, und nur der laesst sich mit `chesslab eval --run` gegen einen fremden
#: Datensatz stellen.
RUNS = [
    ("data/models/_arch/real13-mix-v4/p4a80-clahe2-s42", "real13-mix-v7-80"),
    ("data/models/p4a-80-v5-head256", "real13-mix-v7-80"),
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
    # `return False` meldete UNBEKANNTE Herkunft als saubere — und zwar bei den aeltesten
    # Laeufen, deren Datensatz am ehesten weg ist, also genau dort, wo der Wall gebraucht wird.
    if not sp.exists():
        raise SystemExit(f"[FAIL] {run}: {sp} fehlt — Herkunft nicht pruefbar")
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
        subprocess.run([CHESSLAB, "eval", "--run", run, "--dataset", dataset, "--split", "val",
                        "--split-file", "split-pin.json"], check=False,
                       env={**os.environ, "CC": TCC, "OPENBLAS_NUM_THREADS": "1"})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
