"""Rauschgrenze eines Rezepts: was ein A/B schlagen muss, um nicht der Seed zu sein.

Liest die Laeufe unter `data/models/_noise/` (ein Verzeichnis je Seed, sonst identisches Rezept)
und stellt die Metrik am BESTEN Checkpoint nebeneinander — nicht die letzte Epoche, denn die
waehlt niemand aus.
"""
import json
import statistics as st
from pathlib import Path

KEYS = ["val_checkpoint_score", "val_visible_acc", "val_piece_acc", "val_macro_recall",
        "val_occupied_board_acc", "val_conf_auroc"]
runs = {}
for d in sorted(Path("data/models/_noise").iterdir()):
    m = d / "metrics.jsonl"
    if not m.is_file():
        continue
    rows = [json.loads(x) for x in m.read_text(encoding="utf-8").splitlines()]
    best = max(rows, key=lambda r: r["val_checkpoint_score"])
    runs[d.name.replace("s2-seed", "seed ")] = (best, len(rows))

print(f"{'Metrik':<26}" + "".join(f"{n:>12}" for n in runs) + f"{'Spanne':>10}{'rel.':>8}")
for k in KEYS:
    v = [b[k] for b, _ in runs.values()]
    span = max(v) - min(v)
    print(f"{k:<26}" + "".join(f"{x:>12.4f}" for x in v) + f"{span:>10.4f}{100*span/st.mean(v):>7.1f}%")
print(f"\n{'Epochen bis Stopp':<26}" + "".join(f"{n:>12}" for _, n in runs.values()))
print(f"{'beste Epoche':<26}" + "".join(f"{b['epoch']:>12}" for b, _ in runs.values()))
