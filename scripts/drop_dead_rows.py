"""Die toten Zeilen aus einem Datensatz-Manifest nehmen — sie zeigen in keinen Pack mehr.

    uv run python scripts/drop_dead_rows.py real13-mix-v7-128


Ein Pack ist unveraenderlich, aber ein NEU GESCHNITTENER traegt nicht dieselben Zeilen: beim
Re-Pack vom 2026-09-17 verlor `real13-mix-v7-128` zwei von 979 363. Der Loader wirft beim ERSTEN
Treffer (`KeyError: ... is not in pack ...`), also stirbt jeder Lauf daran, nicht nur einer.

Das Manifest allein reicht nicht: `split*.json` traegt `counts`, `train_class_counts` und die
`class_weights`, die in den Verlust gehen — alles gemessen am ALTEN Manifest. Bleibt es stehen,
behauptet die Datei, die laut Projektregel die Wahrheit ueber den Split ist, Zeilen, die es nicht
mehr gibt (gemessen 2026-09-17: `counts.test` 188 102 gegen 188 101 gebliebene Zeilen).
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

from chesslab import dataset as dataset_mod
from chesslab.ioutil import read_jsonl, write_json, write_rows

WHY = "Re-Pack vom 2026-09-17 schnitt die Aufnahmen neu; diese Zeilen fehlen seitdem"


def pack_paths() -> dict[str, set]:
    have: dict[str, set] = {}
    for pack in Path("data/packs").glob("*"):
        meta = pack / "packed_meta.json"
        if meta.is_file():
            have[pack.name] = set(json.loads(meta.read_text(encoding="utf-8"))["paths"])
    return have


def partition(rows: list[dict], have: dict[str, set]) -> tuple[list[dict], list[dict]]:
    alive, dead = [], []
    for row in rows:
        path = str(row.get("path", ""))
        if not path.startswith("mm://"):
            alive.append(row)
            continue
        pack = path.removeprefix("mm://").split("/", 1)[0]
        (alive if path in have.get(pack, ()) else dead).append(row)
    return alive, dead


def sync_splits(ds: Path, alive: list[dict], stamp: str, n_dead: int) -> list[str]:
    """Jede `split*.json` am ueberlebenden Manifest neu rechnen — mit DERSELBEN Sitzungsaufteilung.

    `make_split` mit `precomputed_splits` reproduziert die Datei bitgleich (nachgewiesen gegen das
    geparkte Manifest von 2026-09-17), rechnet aber Zaehlungen und Gewichte neu. Eine Fold-Datei,
    deren Sitzungsliste das Manifest nicht deckt, wird BENANNT statt stillschweigend stehen
    gelassen — sie neu zu rechnen hiesse, ihren Zuschnitt zu erfinden.
    """
    stale = []
    sessions = {r["session_id"] for r in alive}
    for f in sorted(ds.glob("split*.json")):
        sp = json.loads(f.read_text(encoding="utf-8-sig"))
        covered = {s for sids in (sp.get("splits") or {}).values() for s in sids}
        if not sp.get("splits") or not sessions <= covered:
            stale.append(f.name)
            continue
        new = dataset_mod.make_split(
            alive, sp["val_frac"], sp["test_frac"], sp["max_empty_ratio"], sp["seed"],
            sp["max_class_ratio"], precomputed_splits=sp["splits"],
            priority_paths=dataset_mod.load_priority_paths(), classes=sp["classes"])
        shutil.copy2(f, Path("data/_parked") / f"{ds.name}-{f.stem}-{stamp}.json")
        write_json(f, {**sp, **new, "dead_rows_dropped": {"when": stamp, "n": n_dead, "why": WHY}})
        print(f"   {f.name} nachgezogen: counts {sp['counts']} -> {new['counts']}")
    return stale


def sync_yaml(ds: Path, n_alive: int, n_dead: int, stamp: str) -> None:
    cfg = ds / "dataset.yaml"
    if not cfg.is_file():
        return
    import yaml

    blob = yaml.safe_load(cfg.read_text(encoding="utf-8"))
    counts = blob.get("counts") or {}
    for key in ("after_dedup", "final"):
        if key in counts:
            counts[key] = n_alive
    blob["counts"] = counts
    blob["dead_rows_dropped"] = {"when": stamp, "n": n_dead, "why": WHY}
    cfg.write_text(yaml.safe_dump(blob, sort_keys=False, allow_unicode=True), encoding="utf-8")
    print("   dataset.yaml nachgezogen")


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__)
        return 2
    name = argv[0]
    ds = Path("data/datasets") / name
    manifest = ds / "manifest.jsonl"

    rows = read_jsonl(manifest)
    alive, dead = partition(rows, pack_paths())
    print(f"{name}: {len(rows)} Zeilen, {len(dead)} tot")
    for row in dead:
        print(f"   {row.get('path')}  ({row.get('label')}, Split-Sitzung {row.get('session_id')})")
    if not dead:
        print("   nichts zu tun")
        return 0

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    Path("data/_parked").mkdir(parents=True, exist_ok=True)
    backup = Path("data/_parked") / f"{name}-manifest-{stamp}.jsonl"
    shutil.copy2(manifest, backup)
    print(f"   gesichert: {backup}")

    write_rows(manifest, alive)
    print(f"   geschrieben: {len(alive)} Zeilen")

    stale = sync_splits(ds, alive, stamp, len(dead))
    sync_yaml(ds, len(alive), len(dead), stamp)
    if stale:
        print(f"   ! NICHT nachgezogen (Sitzungsliste deckt das Manifest nicht): {', '.join(stale)}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
