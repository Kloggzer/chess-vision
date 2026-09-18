"""Einen Datensatz ausduennen: je Standzeit nur k Crops, per Farthest-Point gewaehlt.

90,3 % der Aufnahme-Crops sind Dubletten (`scripts/crop_redundancy.py`, 2026-09-17). Dieses
Skript baut den Zwilling eines Spender-Datensatzes, in dem der TRAIN-Split je Standzeit auf k
Crops zusammengestrichen ist — Val und Test bleiben Zeile fuer Zeile unveraendert, sonst waere
der Vergleich wertlos.

Nur die AUFNAHMEN (`rg-*`) werden ausgeduennt. Ein Komposit ist keine Partie; seine Bilder sind
per Bauart verschieden, und es zu stutzen wuerde messen, was niemand gefragt hat.

    uv run python scripts/thin_dataset.py --like real13-mix-v7-128 --name v7-thin16 --keep 16
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
import yaml

from chesslab.ioutil import read_jsonl, write_json, write_rows

PACKS = Path("data/packs")
DATASETS = Path("data/datasets")
THUMB = 16


def runs_of(rows: list[dict]) -> dict[tuple, list[dict]]:
    """Standzeit = (Feld, Figur, ununterbrochene Strecke) INNERHALB einer Aufnahme."""
    per_key: dict[tuple, list[dict]] = defaultdict(list)
    for row in rows:
        per_key[(str(row.get("session_id")), str(row.get("square")))].append(row)
    out: dict[tuple, list[dict]] = defaultdict(list)
    for (session, square), group in per_key.items():
        group.sort(key=lambda r: (int(r.get("ply") or 0), str(r.get("frame"))))
        run_id, last = 0, None
        for row in group:
            here = str(row.get("label"))
            if last is not None and here != last:
                run_id += 1
            out[(session, square, here, run_id)].append(row)
            last = here
    return out


def pack_index(name: str) -> tuple[np.memmap, dict[str, int]]:
    meta = json.loads((PACKS / name / "packed_meta.json").read_text(encoding="utf-8"))
    mm = np.memmap(PACKS / name / "packed_images.u8", dtype=np.uint8, mode="r",
                   shape=(meta["n"], meta["h"], meta["w"], 3))
    return mm, {p: i for i, p in enumerate(meta["paths"])}


def farthest_point(dist: np.ndarray, k: int) -> list[int]:
    chosen = [0]
    while len(chosen) < min(k, dist.shape[0]):
        near = dist[chosen].min(axis=0)
        near[chosen] = -1.0
        chosen.append(int(near.argmax()))
    return chosen


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--like", required=True, help="Spender-Datensatz.")
    ap.add_argument("--name", required=True, help="Name des Zwillings.")
    ap.add_argument("--keep", type=int, default=16, help="Crops je Standzeit im TRAIN.")
    ap.add_argument("--trim", type=float, default=0.0,
                    help="Anteil der vom Median entferntesten Crops, der VOR dem Spreizen "
                         "wegfaellt. Dort sitzen Haende und Wackler: reines Farthest-Point waehlt "
                         "sie als 'Vielfalt' und verlor gegen den Zufall (2026-09-17).")
    ap.add_argument("--random", type=int, default=None,
                    help="Statt Farthest-Point zufaellig waehlen, mit diesem Seed. Der GEGENARM: "
                         "gleiche Groesse, gleiche Mischung, nur die Auswahl ist anders — erst so "
                         "misst der Unterschied das Verfahren und nicht die Datenmenge.")
    args = ap.parse_args()

    donor = DATASETS / args.like
    split = json.loads((donor / "split.json").read_text(encoding="utf-8"))
    where = {s: k for k, v in split["splits"].items() for s in v}
    rows = read_jsonl(donor / "manifest.jsonl")
    print(f"{args.like}: {len(rows)} Zeilen")

    # Nur Aufnahmen im TRAIN werden angefasst.
    thin_me, keep_as_is = [], []
    for row in rows:
        sid = str(row.get("session_id"))
        (thin_me if where.get(sid) == "train" and sid.startswith("rg-") else keep_as_is).append(row)
    print(f"   {len(thin_me)} Zeilen aus Aufnahmen im Train werden ausgeduennt")
    print(f"   {len(keep_as_is)} Zeilen bleiben (Komposite, Val, Test)")

    caches: dict[str, tuple] = {}
    picked: list[dict] = []
    runs = runs_of(thin_me)
    for done, (_key, group) in enumerate(sorted(runs.items()), 1):
        if len(group) <= args.keep:
            picked.extend(group)
            continue
        pack = str(group[0]["path"]).removeprefix("mm://").split("/", 1)[0]
        if pack not in caches:
            caches[pack] = pack_index(pack)
        mm, at = caches[pack]
        h = mm.shape[1]
        step = h // THUMB
        flat = np.empty((len(group), THUMB * THUMB), dtype=np.float32)
        for j, row in enumerate(group):
            idx = at.get(str(row["path"]))
            if idx is None:
                flat[j] = 0.0
                continue
            flat[j] = mm[idx].reshape(THUMB, step, THUMB, step, 3).mean(axis=(1, 3, 4)).ravel()
        if args.random is not None:
            rng = np.random.default_rng(args.random + done)
            chosen = sorted(rng.choice(len(group), size=args.keep, replace=False).tolist())
        else:
            dist = np.abs(flat[:, None, :] - flat[None, :, :]).mean(axis=2)
            if args.trim > 0:
                to_median = dist.mean(axis=1)
                core = np.flatnonzero(to_median <= np.quantile(to_median, 1.0 - args.trim))
                if len(core) >= args.keep:
                    sub = dist[np.ix_(core, core)]
                    chosen = [int(core[i]) for i in farthest_point(sub, args.keep)]
                else:
                    chosen = farthest_point(dist, args.keep)
            else:
                chosen = farthest_point(dist, args.keep)
        picked.extend(group[pick] for pick in chosen)
        if done % 200 == 0:
            print(f"   {done}/{len(runs)} Standzeiten", flush=True)

    out = DATASETS / args.name
    out.mkdir(parents=True, exist_ok=True)
    final = keep_as_is + picked
    # Ein neu geschnittener Pack kann Zeilen verloren haben: 2 von 979 363 bei v7 (2026-09-17).
    # Der Loader wirft beim ERSTEN Treffer, also raus damit statt einen Lauf daran sterben lassen.
    alive, dead = [], 0
    for row in final:
        path = str(row.get("path", ""))
        if not path.startswith("mm://"):
            alive.append(row)
            continue
        pack = path.removeprefix("mm://").split("/", 1)[0]
        if pack not in caches:
            caches[pack] = pack_index(pack)
        if path in caches[pack][1]:
            alive.append(row)
        else:
            dead += 1
    if dead:
        print(f"   {dead} Zeilen zeigen in keinen Pack mehr und fallen weg")
    final = alive
    write_rows(out / "manifest.jsonl", final)
    write_json(out / "split.json", split)
    cfg = yaml.safe_load((donor / "dataset.yaml").read_text(encoding="utf-8"))
    cfg["name"] = args.name
    cfg["thinned_from"] = args.like
    cfg["thinned_keep"] = args.keep
    cfg["thinned_how"] = ("random" if args.random is not None
                          else f"farthest-point, trim {args.trim:.0%}")
    cfg["counts"] = {"raw": len(rows), "after_dedup": len(final), "final": len(final)}
    (out / "dataset.yaml").write_text(yaml.safe_dump(cfg, sort_keys=False, allow_unicode=True),
                                      encoding="utf-8")
    from chesslab import dataset as dataset_mod
    write_json(out / "stats.json", dataset_mod.compute_stats(final))
    print(f"\n{args.name}: {len(final)} Zeilen ({100 * len(final) / len(rows):.1f} % von "
          f"{args.like}), davon {len(picked)} aus ausgeduennten Aufnahmen")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
