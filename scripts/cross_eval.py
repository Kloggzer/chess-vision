"""Alte Laeufe gegen DENSELBEN Massstab, den v7-Satz ihrer Aufloesung — sonst vergleicht man Splits.
Wer den v7-Val trainiert hat, wird abgewiesen.

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
#: Der EXPORT traegt nur config.json und model.onnx; nur der Lauf dahinter laesst sich mit `chesslab
#: eval --run` gegen einen fremden Datensatz stellen.
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
    # Unbekannte Herkunft ist nicht sauber — gerade die aeltesten Laeufe haben keinen Datensatz
    # mehr.
    if not sp.exists():
        raise SystemExit(f"[FAIL] {run}: {sp} fehlt — Herkunft nicht pruefbar")
    return VAL in set(json.loads(sp.read_text(encoding="utf-8"))["splits"].get("train") or [])


def main() -> int:
    # Ein abgestuerzter `eval` darf nicht als gelungen durchgehen.
    failed = []
    for run, dataset in RUNS:
        p = Path(run)
        if not (p / "best.pt").exists():
            print(f"[skip] {run}: kein best.pt")
            continue
        if trained_on_val(p):
            print(f"[SKIP] {run}: hatte {VAL} im Training - nicht vergleichbar")
            continue
        print(f"\n=== {run} gegen {dataset} ===", flush=True)
        rc = subprocess.run([CHESSLAB, "eval", "--run", run, "--dataset", dataset, "--split", "val",
                             "--split-file", "split-pin.json"], check=False,
                            env={**os.environ, "CC": TCC, "OPENBLAS_NUM_THREADS": "1"}).returncode
        if rc != 0:
            print(f"[FAIL] {run}: eval endete mit {rc} - keine Zahl, kein Vergleich")
            failed.append(run)
    if failed:
        print(f"\n{len(failed)} Laeufe ohne Ergebnis: {', '.join(failed)}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
