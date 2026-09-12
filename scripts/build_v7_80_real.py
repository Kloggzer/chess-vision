"""real13-mix-v7-80-real - dieselbe Val- und Testgruppe, aber nur ECHTE Aufnahmen im Training.

Die Domaenenfrage: die Haelfte des Trainings sind Kompositen (376 640 von 756 401 Zeilen), und
ausgeliefert wird auf echten Handy-Aufnahmen. Bei 80 px ist Kapazitaet knapp - vielleicht kostet
die fremde Haelfte mehr als sie bringt. Gegenargument steht daneben: die Kompositen liefern rund
63 % aller Springer-Beispiele, und der Springer ist die Klasse, die scheitert.
"""
import json
from pathlib import Path

from chesslab import dataset_build

FROZEN_TEST = "rg-2026-09-11-20-00-52"
PIN = Path("data/datasets/real13-mix-v7-128/split-pin.json")

splits = json.loads(PIN.read_text(encoding="utf-8"))["splits"]
train = [s for s in splits["train"] if not s.startswith("comp-")]
sids = train + list(splits["val"]) + [s for s in splits["test"] if s != FROZEN_TEST] + [FROZEN_TEST]
print(f"{len(train)} echte Trainingsaufnahmen, {len(sids)} insgesamt")
res = dataset_build.build_dataset("real13-mix-v7-80-real", sids, like="_pin-donor-v6-128",
                                  from_packs=True, pack_size=(80, 80), add_test=[FROZEN_TEST])
print(res["counts"], res["split_counts"])

ds = Path("data/datasets/real13-mix-v7-80-real")
(ds / "split-pin.json").write_bytes((ds / "split.json").read_bytes())
print("[OK] split-pin.json gesetzt")
