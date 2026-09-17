"""Die toten Zeilen aus einem Datensatz-Manifest nehmen — sie zeigen in keinen Pack mehr.

    uv run python scripts/drop_dead_rows.py real13-mix-v7-128


Ein Pack ist unveraenderlich, aber ein NEU GESCHNITTENER traegt nicht dieselben Zeilen: beim
Re-Pack vom 2026-09-17 verlor `real13-mix-v7-128` zwei von 979 363. Der Loader wirft beim ERSTEN
Treffer (`KeyError: ... is not in pack ...`), also stirbt jeder Lauf daran, nicht nur einer.
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

from chesslab.ioutil import read_jsonl, write_rows

if len(sys.argv) != 2:
    print(__doc__)
    raise SystemExit(2)
name = sys.argv[1]
ds = Path("data/datasets") / name
manifest = ds / "manifest.jsonl"

have: dict[str, set] = {}
for pack in Path("data/packs").glob("*"):
    meta = pack / "packed_meta.json"
    if meta.is_file():
        have[pack.name] = set(json.loads(meta.read_text(encoding="utf-8"))["paths"])

rows = read_jsonl(manifest)
alive, dead = [], []
for row in rows:
    path = str(row.get("path", ""))
    if not path.startswith("mm://"):
        alive.append(row)
        continue
    pack = path.removeprefix("mm://").split("/", 1)[0]
    (alive if path in have.get(pack, ()) else dead).append(row)

print(f"{name}: {len(rows)} Zeilen, {len(dead)} tot")
for row in dead:
    print(f"   {row.get('path')}  ({row.get('label')}, Split-Sitzung {row.get('session_id')})")
if not dead:
    print("   nichts zu tun")
    raise SystemExit(0)

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = Path("data/_parked") / f"{name}-manifest-{stamp}.jsonl"
backup.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(manifest, backup)
print(f"   gesichert: {backup}")

write_rows(manifest, alive)
print(f"   geschrieben: {len(alive)} Zeilen")

cfg = ds / "dataset.yaml"
if cfg.is_file():
    import yaml

    blob = yaml.safe_load(cfg.read_text(encoding="utf-8"))
    counts = blob.get("counts") or {}
    for key in ("after_dedup", "final"):
        if key in counts:
            counts[key] = len(alive)
    blob["counts"] = counts
    blob["dead_rows_dropped"] = {
        "when": stamp,
        "n": len(dead),
        "why": "Re-Pack vom 2026-09-17 schnitt die Aufnahmen neu; diese Zeilen fehlen seitdem",
    }
    cfg.write_text(yaml.safe_dump(blob, sort_keys=False, allow_unicode=True), encoding="utf-8")
    print("   dataset.yaml nachgezogen")
