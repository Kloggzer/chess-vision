"""real13-mix-v7-80 - derselbe Zuschnitt wie v7-128, nur aus den 80-px-Packs.

Fuer den Aufloesungsvergleich muessen Zeilen, Split und eingefrorene Testgruppe identisch sein;
verschieden ist einzig, welchen Pack je Aufnahme `--pack-size` waehlt.
"""
from pathlib import Path

import yaml

from chesslab import dataset_build

FROZEN_TEST = "rg-2026-09-11-20-00-52"

cfg = yaml.safe_load(Path("data/datasets/real13-mix-v7-128/dataset.yaml").read_text(encoding="utf-8"))
sids = [s for s in cfg["session_ids"] if s != FROZEN_TEST] + [FROZEN_TEST]
print(f"{len(sids)} Aufnahmen")
res = dataset_build.build_dataset("real13-mix-v7-80", sids, like="_pin-donor-v6-128",
                                  from_packs=True, pack_size=(80, 80), add_test=[FROZEN_TEST])
print(res["counts"], res["split_counts"])

ds = Path("data/datasets/real13-mix-v7-80")
(ds / "split-pin.json").write_bytes((ds / "split.json").read_bytes())
print("[OK] split-pin.json gesetzt")
