"""`brightness` fuer Zeilen nachrechnen, die sie nie bekommen haben — aus den Pack-Pixeln.

376 640 von 979 363 Manifestzeilen tragen keine `brightness`: alle Kompositen. Die sind aber
ECHTES Material (`composite.py`: „occluder plates over a recorded board", auf demselben Rig
gedreht), ihre Helligkeit ist also messbar und wurde nur nie notiert. Ohne sie rechnet
`coverage_gaps.py` die Luecken auf 62 % des Korpus und schickt den Menschen womoeglich nach
Material, das laengst daliegt.

`brightness` ist der Grauwert-Mittelwert des Crops (`labeling.py:565`) — hier ueber die 80-px-Packs
gerechnet, weil ein Mittelwert die Skalierung ueberlebt und 7 statt 48 GB von der Platte liest.

    uv run python scripts/backfill_brightness.py --dataset real13-mix-v7-128
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import numpy as np

#: BT.601, wie `cv2.COLOR_BGR2GRAY`. Der Pack haelt RGB, also die Gewichte umgekehrt anlegen.
GRAY = np.array([0.299, 0.587, 0.114], dtype=np.float32)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dataset", default="real13-mix-v7-128")
    ap.add_argument("--size", type=int, default=80, help="Aus welchen Packs gelesen wird.")
    ap.add_argument("--out", default="", help="Zieldatei; leer heisst: das Manifest selbst. "
                                              "Waehrend ein Lauf den Datensatz liest, hier eine "
                                              "Seitendatei angeben.")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    from chesslab.dataset_build import dataset_dir

    dd = dataset_dir(args.dataset)
    rows = [json.loads(line) for line in (dd / "manifest.jsonl").open(encoding="utf-8")]
    todo = [r for r in rows if r.get("brightness") is None]
    print(f"{len(todo)} von {len(rows)} Zeilen ohne brightness")
    if not todo:
        return 0

    by_pack: dict[str, list[dict]] = {}
    for r in todo:
        by_pack.setdefault(f"{r['session_id']}-{args.size}", []).append(r)
    print(f"{len(by_pack)} Packs zu lesen")
    if args.dry_run:
        return 0

    done = gaps = 0
    for name, group in sorted(by_pack.items()):
        d = Path("data/packs") / name
        meta = json.loads((d / "packed_meta.json").read_text(encoding="utf-8"))
        n, h, w = int(meta["n"]), int(meta["h"]), int(meta["w"])
        at = {p: i for i, p in enumerate(meta["paths"])}
        mm = np.memmap(d / "packed_images.u8", dtype=np.uint8, mode="r", shape=(n, h, w, 3))
        missed = 0
        for r in group:
            key = f"mm://{name}/{r['frame']}/{r['square']}"
            i = at.get(key)
            # TODO: dieser Sprung fiel ungezaehlt aus — die Zeile behaelt `brightness: None`, und
            # `{len(group)} Zeilen` plus `[OK]` lasen sich wie ein vollstaendiger Nachtrag.
            if i is None:
                missed += 1
                continue
            r["brightness"] = round(float((mm[i].astype(np.float32) @ GRAY).mean()), 2)
            done += 1
        del mm
        print(f"  {name}: {len(group)} Zeilen"
              + (f", {missed} nicht im Pack" if missed else ""), flush=True)
        gaps += missed

    out = Path(args.out) if args.out else dd / "manifest.jsonl"
    # TODO: `open("w")` KUERZT das GETEILTE Manifest; ein Abbruch liess es halb da, und ein
    # toleranter Leser verwirft die halbe letzte Zeile stumm — der Datensatz ist dann kuerzer,
    # ohne dass etwas meckert. Nebendatei plus `os.replace` laesst das alte bis zuletzt stehen.
    tmp = out.with_name(out.name + ".tmp")
    try:
        with tmp.open("w", encoding="utf-8") as fh:
            for r in rows:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise
    os.replace(tmp, out)
    print(f"[OK] {done} Zeilen nachgetragen"
          + (f", {gaps} ohne Eintrag im Pack" if gaps else "") + f" -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
