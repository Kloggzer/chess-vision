"""Mine hard-negative `empty` crops: real empty squares the deployed model reads as pieces.

Hard-example mining, offline: the published online form selects hard examples per mini-batch
inside the training loop (docs/references.md#shrivastava-2016), while this writes a keep-list
once, from a finished model. The difference matters — a list mined from one model is a hidden
input to the next, which is why `data/reports/hard_empty.jsonl` is parked between experiments.

Motivation (2026-07-21, live incident): the deployed CNN read the empty dark square h6 as
bB and a black queen on b6 as wQ with high confidence — the known dark-square domain gap.
The `empty` class is capped at dataset-build time (`subsample_classes`), and the random cap
throws away exactly the rare HARD empties (dark corner squares, neighbour pieces bleeding
into the crop via pad_up, shadows). This script finds those hard cases so the build can
keep them (see `priority_paths` in `dataset.subsample_classes`).

Two selection criteria, because "misread" means different things to a 2-class and an identity run:

- `--criterion argmax` (default, legacy): the argmax names a piece, with confidence >= --conf-thr.
- `--criterion occupancy`: the crop READS AS OCCUPIED by the tracker's own definition —
  `p_occ = 1 - P(empty) - P(occluded)` beats `P(empty)` (`cnn_recovery.observation_from_probs`
  plus `OccupancyObservation.occupied`). This is the phantom condition itself, and on a 13-class
  run it is the only criterion that finds the whole failure: an undecided identity softmax spreads
  its mass over 12 piece classes, so a crop can read as occupied while `empty` is still the argmax
  at a confidence far below any `--conf-thr`. `argmax` mode cannot see those at all.

`--infer-size` matters as much as the criterion: a model is mined at the size it is SERVED at
(`infer_size`, seeded into `serving._CACHE` the way `sweep_infer_size.install_at_size` does it),
not at the 128 px the crops happen to sit on disk at.

Usage:
    python scripts/mine_hard_empty.py --run data/models/p3-finetune [--device cpu]
        [--source data/crops/default/manifest.jsonl] [--conf-thr 0.5] [--batch 256]
        [--criterion argmax|occupancy] [--infer-size 80] [--exclude-sessions A,B]
        [--out data/reports/hard_empty.jsonl] [--montage data/reports/perf/hard_empty.png]

Output: JSONL of misread empty crops (path, pred, conf, session, square, square_color),
merged de-duplicated by path into --out, plus a montage of the worst offenders (visual
probe: what does the model think it is seeing?).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chesslab import config  # noqa: E402
from chesslab.dataset import load_manifest  # noqa: E402
from chesslab.serving import observation_from_probs  # noqa: E402

# Real capture sessions are timestamped `YYYYMMDD-HHMMSS`. Everything else in the crop
# manifest (e.g. `pretrain-synth__synth-004`) is a classic-ingested SYNTHETIC pool whose
# PNGs also live on disk — mining those drowns the deployment-relevant real failures:
# on 2026-07-21, 697 of 786 mined "hard empties" turned out to be crops of the obsolete
# unframed ~51 px/square renders, and the headline stats described the wrong problem.
# Seit der Umbenennung tragen echte Aufnahmen ein `rg-`-Praefix (`rg-2026-08-15-23-01-43`,
# `rg-VID_20260727_233929`). Das alte Muster `^\d{8}-\d{6}$` traf davon nichts mehr und
# hat SAEMTLICHE echten Sessions als Synth-Pool verworfen — der Miner lief ins Leere,
# ohne zu scheitern (2026-08-24: 235 304 uebersprungen, 0 gescannt).
_CAMERA_SESSION_RE = re.compile(r"^(rg-.+|\d{8}-\d{6})$")


def training_rows_and_reader(name, split_name):
    """Genau die Zeilen und Pixel, die das Training frisst: Trainings-Split + eigene Memmap.

    Der Crop-Pool ist das falsche Ziel — er kennt keinen Split, also lagen rund 30 % der
    gefundenen Crops in val/test und konnten nie eine Batch erreichen. Und der Pool steht auf
    128 px, das Modell auf 80: gemessen wurde damit eine andere Skalierung als die trainierte.
    """
    import numpy as np

    from chesslab.dataset import load_manifest
    from chesslab.dataset_build import dataset_dir
    from chesslab.training.data import filter_rows_by_split, load_split
    from chesslab.training.pack import load_packed

    dd = dataset_dir(name)
    manifest = load_manifest(dd / "manifest.jsonl")
    split = load_split(dd / (split_name or "split.json"))
    rows = filter_rows_by_split(manifest, split, "train")
    packed = load_packed(name, manifest_rows=manifest)
    if packed is None:
        raise SystemExit(f"[FAIL] '{name}' hat keine nutzbare Memmap — erst "
                         f"`chesslab dataset pack {name}` laufen lassen.")
    img_path, (n, h, w), path2idx = packed
    # Bei uebergebenen Manifest-Zeilen markiert load_packed `_packed_idx` an der Zeile und baut
    # kein Pfad-Woerterbuch — derselbe Weg, den PackedSquareDataset nimmt.
    index = path2idx if path2idx is not None else {
        r["path"]: r["_packed_idx"] for r in manifest if "_packed_idx" in r}
    mm = np.memmap(img_path, dtype=np.uint8, mode="r", shape=(n, h, w, 3))
    print(f"[i] {len(rows)} Trainingszeilen aus {name} (Memmap {n} Zeilen @ {w}px)")
    return rows, (lambda path: (np.array(mm[index[path]])[:, :, ::-1]
                                if path in index else None)), (w, h)


def packed_reader(src, out_size):
    """Die Crops aus der passenden Memmap statt aus 235 000 Einzeldateien.

    Gemessen 2026-08-24: 9,72 ms je Crop ueber `cv2.imread`, 0,089 ms ueber die Memmap — fuer den
    vollen Pool 38 Minuten gegen 21 Sekunden. Derselbe Engpass, den `training/pack.py` beschreibt.

    Welche Memmap, sagt der Datensatz selbst (`source_manifest`). Die Groesse MUSS zum Pool passen:
    vier Packs stammen aus demselben Manifest, drei davon bei 80 px — einen davon zu nehmen wuerde
    die Crops still herunterskalieren und etwas anderes messen als die Dateien.
    """
    import numpy as np
    import yaml

    src = Path(src).as_posix()
    for cfg in sorted(config.DATA.datasets.glob("*/dataset.yaml")):
        try:
            d = yaml.safe_load(cfg.read_text(encoding="utf-8")) or {}
        except (OSError, ValueError):
            continue
        srcs = d.get("source_manifest") or []
        if isinstance(srcs, str):
            srcs = [srcs]
        if not any(Path(s).as_posix() == src for s in srcs):
            continue
        meta_path = cfg.with_name("packed_meta.json")
        img = cfg.with_name("packed_images.u8")
        if not (meta_path.exists() and img.exists()):
            continue
        meta = json.loads(meta_path.read_text(encoding="utf-8-sig"))
        if (meta.get("w"), meta.get("h")) != (int(out_size[0]), int(out_size[1])):
            continue
        paths = meta.get("paths") or []
        if not paths or str(paths[0]).startswith("mm://"):
            continue
        mm = np.memmap(img, dtype=np.uint8, mode="r",
                       shape=(meta["n"], meta["h"], meta["w"], 3))
        index = {q: k for k, q in enumerate(paths)}
        print(f"[i] Crops aus {cfg.parent.name} (Memmap, {meta['n']} Zeilen @ {meta['w']}px)")
        return lambda path: (np.array(mm[index[path]])[:, :, ::-1]
                             if path in index else None)
    return None

def is_camera_session(session_id: str | None) -> bool:
    return bool(session_id and _CAMERA_SESSION_RE.match(str(session_id)))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--run", required=True, help="model run dir (e.g. data/models/p3-finetune)")
    ap.add_argument("--source", default=None,
                    help="crop manifest (default: data/crops/default/manifest.jsonl)")
    ap.add_argument("--dataset", default=None,
                    help="Aus dem ECHTEN Trainingsmaterial minen: Zeilen des Trainings-Splits, "
                         "Pixel aus der Memmap dieses Datensatzes. Ersetzt --source.")
    ap.add_argument("--split", default=None,
                    help="Split-Datei im Datensatz (Vorgabe: split.json).")
    ap.add_argument("--device", default="cpu",
                    help="cpu is fine — mining is offline (default: cpu)")
    ap.add_argument("--conf-thr", type=float, default=0.5,
                    help="keep misreads with confidence >= this (default 0.5; the really "
                         "dangerous ones are >= the tracker's 0.85)")
    ap.add_argument("--classes", default="empty",
                    help="Welche WAHREN Klassen minen: `empty` (Vorgabe), `all`, oder eine Liste "
                         "wie `wK,bB`. Ueberzeugte Fehler gibt es in jeder Klasse — die groesste "
                         "Einzelverwechslung war zwar empty->wR (989), aber bB->bP lag bei 914.")
    ap.add_argument("--fresh", action="store_true",
                    help="Ergebnisdatei neu schreiben statt mit ihr zu verschmelzen. Noetig, wenn "
                         "sich die Quelle geaendert hat — sonst ueberleben Zeilen aus einem "
                         "anderen Zuschnitt (Pool statt Trainings-Split) unbemerkt.")
    ap.add_argument("--batch", type=int, default=256)
    ap.add_argument("--limit", type=int, default=0, help="cap crops scanned (0 = all)")
    ap.add_argument("--out", default=None,
                    help="output JSONL (default: data/reports/hard_empty.jsonl)")
    ap.add_argument("--include-synthetic", action="store_true",
                    help="also scan classic-ingested synthetic sessions (PNG pools like "
                         "pretrain-synth__*). Default OFF: they drown the real failures.")
    ap.add_argument("--montage", default=None,
                    help="montage PNG of the worst offenders (default: data/reports/perf/hard_empty.png)")
    ap.add_argument("--occ-thr", type=float, default=1.01,
                    help="With --criterion occupancy: also keep crops whose P(occupied) reaches "
                         "this, even though `empty` still wins. Default 1.01 = off, i.e. only crops "
                         "that already read as occupied. 0.10 takes the whole tail.")
    ap.add_argument("--criterion", choices=("argmax", "occupancy"), default="argmax",
                    help="argmax: pred names a piece at >= --conf-thr (legacy). occupancy: the "
                         "crop reads as occupied (p_occ > p_empty) — the phantom condition itself, "
                         "and the only one that sees an undecided identity softmax.")
    ap.add_argument("--infer-size", type=int, default=0,
                    help="serve the model at this input size while mining (0 = the run's own). "
                         "Mine at the size you DEPLOY at; the disk crops are 128 px.")
    ap.add_argument("--exclude-sessions", default="",
                    help="comma-separated session ids to leave untouched — use it to keep a "
                         "held-out session clean of the keep-list it would otherwise train on.")
    args = ap.parse_args()

    from chesslab import serving  # lazy: torch import is slow

    src = Path(args.source) if args.source else config.DATA.crop_pool / "manifest.jsonl"
    out = Path(args.out) if args.out else config.DATA.reports / "hard_empty.jsonl"
    montage = Path(args.montage) if args.montage else config.DATA.reports / "perf" / "hard_empty.png"
    run_dir = Path(args.run)

    want = {c.strip() for c in args.classes.split(",") if c.strip()}
    reader = pool_size = None
    if args.dataset:
        rows, reader, pool_size = training_rows_and_reader(args.dataset, args.split)
        src = Path(args.dataset)
    else:
        rows = load_manifest(src)
    rows = [r for r in rows if r.get("path") and ("all" in want or r["label"] in want)]
    # Fused synthetic pools are packed (mm:// rows have no files) — this miner targets REAL crops.
    rows = [r for r in rows if not str(r["path"]).startswith("mm://")]
    if not args.include_synthetic:
        n_before = len(rows)
        rows = [r for r in rows if is_camera_session(r.get("session_id"))]
        if n_before != len(rows):
            print(f"skipping {n_before - len(rows)} empty crops from non-camera sessions "
                  f"(classic-ingested synth pools; --include-synthetic to scan them)")
    excluded = {s.strip() for s in args.exclude_sessions.split(",") if s.strip()}
    if reader is None:
        pool_size = (rows[0].get("out_size") or [128, 128]) if rows else [128, 128]
        reader = packed_reader(src, pool_size)
    if excluded:
        n_before = len(rows)
        rows = [r for r in rows if str(r.get("session_id")) not in excluded]
        print(f"excluding {n_before - len(rows)} crops from {len(excluded)} held-out session(s): "
              f"{', '.join(sorted(excluded))}")
    if args.limit:
        rows = rows[: args.limit]

    # Serve at the deployment size, not at whatever the crops sit on disk at. Seeding the module
    # cache is the only seam `predict_arrays` offers (same trick as sweep_infer_size.install_at_size).
    classes: list[str] = []
    if args.infer_size:
        from chesslab.training.evaluate import load_run as _load_run
        model, cfg = _load_run(run_dir)
        own = cfg.get("infer_size") or cfg.get("out_size")
        cfg = {**cfg, "out_size": [args.infer_size] * 2, "infer_size": [args.infer_size] * 2}
        serving._CACHE[str(run_dir.resolve())] = (model.eval(), cfg)
        classes = list(cfg["classes"])
        print(f"serving {run_dir.name} at {args.infer_size} px (the run's own size is {own})")
    elif args.criterion == "occupancy":
        classes = list(json.loads((run_dir / "config.json").read_text(encoding="utf-8"))["classes"])
    print(f"scanning {len(rows)} real empty crops from {src.name} "
          f"with {run_dir.name} on {args.device} …  criterion={args.criterion}")

    hard: list[dict] = []
    n_seen = 0
    for i in range(0, len(rows), args.batch):
        chunk = rows[i : i + args.batch]
        crops, kept_rows = [], []
        for r in chunk:
            img = reader(r["path"]) if reader else None
            if img is None:
                img = cv2.imread(str(r["path"]))   # Rueckfall: Pfade sind cwd-relativ
            if img is None:
                continue
            crops.append(img)
            kept_rows.append(r)
        if not crops:
            continue
        want_probs = args.criterion == "occupancy"
        preds = serving.predict_arrays(run_dir, crops, device=args.device, return_probs=want_probs)
        n_seen += len(crops)
        for r, p in zip(kept_rows, preds, strict=True):
            rec = {"path": r["path"], "label": r["label"],
                   "pred": p["pred_label"], "conf": round(float(p["confidence"]), 3),
                   "session_id": r.get("session_id"), "square": r.get("square"),
                   "square_color": r.get("square_color"), "run": run_dir.name}
            if want_probs:
                obs = observation_from_probs({"x": p["probs"]}, classes)
                # `--occ-thr` widens this past the crops that ALREADY fail. Mining only those is
                # mining the symptom: on `occ-v10bn35-13c` they are 27 of 73 602 crops, a keep-list
                # too small to reach a batch. The crops one nudge below the line are the same
                # failure caught earlier — 99.1 % of empties sit under 0.02, so the band from 0.10
                # up is not "nearly wrong", it is the whole tail, 150 crops of it.
                if obs.p_occ["x"] < args.occ_thr and not obs.occupied("x"):
                    continue
                rec["p_occ"] = round(obs.p_occ["x"], 4)
                rec["p_empty"] = round(obs.p_empty["x"], 4)
                # The scientific split: does the summed piece mass alone cross the line, or does
                # a piece class actually win the argmax? Only the second is a classic hard example.
                rec["kind"] = "piece_argmax" if p["pred_label"] != "empty" else "summed_mass"
                hard.append(rec)
            elif p["pred_label"] != r["label"] and float(p["confidence"]) >= args.conf_thr:
                hard.append(rec)
        if (i // args.batch) % 20 == 0:
            print(f"  {n_seen}/{len(rows)} scanned, {len(hard)} hard so far", flush=True)

    hard.sort(key=lambda h: -h.get("p_occ", h["conf"]))
    crit = (("p_occ > p_empty" + (f" or p_occ >= {args.occ_thr}" if args.occ_thr <= 1.0 else ""))
            if args.criterion == "occupancy" else f"conf >= {args.conf_thr}")
    print(f"\n{len(hard)} hard empties ({crit}) out of {n_seen} scanned "
          f"({100.0 * len(hard) / max(1, n_seen):.1f}%)")
    # Wie viele EIGENE Situationen stecken dahinter? `wK` hatte 378 Fehler aus VIER
    # (Session,Feld)-Situationen — sie zu vervielfachen ueberpasst auf vier Stellungen,
    # statt die Klasse zu lehren. Bei `empty` sind es Tausende, dort traegt es.
    by_class: dict[str, set] = {}
    for h in hard:
        by_class.setdefault(h["label"], set()).add((h.get("session_id"), h.get("square")))
    if by_class:
        print("Situationen je Klasse (Crops / eigene Situationen):")
        per = Counter(h["label"] for h in hard)
        for lab, sits in sorted(by_class.items(), key=lambda kv: -per[kv[0]]):
            flag = "  <- zu wenige, nicht verstaerken" if len(sits) < 20 else ""
            print(f"   {lab:6s} {per[lab]:6d} / {len(sits):4d}{flag}")
    print("by predicted class:", dict(Counter(h["pred"] for h in hard).most_common()))
    print("by square color:  ", dict(Counter(str(h["square_color"]) for h in hard).most_common()))
    print("by session:       ", dict(Counter(str(h["session_id"]) for h in hard).most_common()))
    if args.criterion == "occupancy":
        kinds = Counter(h["kind"] for h in hard)
        print("by kind:          ", dict(kinds.most_common()),
              "  (summed_mass = `empty` still wins the argmax, the crop reads occupied only "
              "because the 12 piece columns sum past it)")
        for k in ("piece_argmax", "summed_mass"):
            sub = [h for h in hard if h["kind"] == k]
            if sub:
                confs = [h["conf"] for h in sub]
                print(f"  {k:12s} n={len(sub):5d}  winning conf mean {sum(confs) / len(sub):.3f} "
                      f"max {max(confs):.3f}  |  p_empty mean "
                      f"{sum(h['p_empty'] for h in sub) / len(sub):.3f}")
    conf85 = sum(1 for h in hard if h["conf"] >= 0.85)
    print(f"confidently wrong (>= 0.85, the tracker's conf_thr): {conf85}")

    # Merge, de-duplicated by path (re-running with a newer model updates pred/conf).
    merged: dict[str, dict] = {}
    if out.exists() and not args.fresh:
        for line in out.read_text(encoding="utf-8-sig").splitlines():
            if line.strip():
                r = json.loads(line)
                merged[r["path"]] = r
    for h in hard:
        merged[h["path"]] = h
    if not args.include_synthetic:
        # Migrate legacy non-camera rows out of the keep list (kept, not deleted): they are
        # crops of obsolete synth PNG pools and would silently distort every future stat.
        legacy = {p: r for p, r in merged.items() if not is_camera_session(r.get("session_id"))}
        if legacy:
            side = out.with_suffix(".synthetic.jsonl")
            existing = {}
            if side.exists():
                for line in side.read_text(encoding="utf-8-sig").splitlines():
                    if line.strip():
                        r = json.loads(line)
                        existing[r["path"]] = r
            existing.update(legacy)
            side.write_text("\n".join(json.dumps(r, ensure_ascii=False)
                                      for r in existing.values()) + "\n", encoding="utf-8")
            merged = {p: r for p, r in merged.items() if p not in legacy}
            print(f"moved {len(legacy)} legacy synth-pool rows -> {side}")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in merged.values()) + "\n",
                   encoding="utf-8")
    print(f"wrote {len(merged)} rows -> {out}")

    # Visual probe: worst offenders annotated with what the model thinks it sees.
    top = hard[:48]
    if top:
        tiles = []
        for h in top:
            img = cv2.imread(str(h["path"]))
            if img is None:
                continue
            img = cv2.resize(img, (128, 128))
            img = cv2.copyMakeBorder(img, 30, 2, 2, 2, cv2.BORDER_CONSTANT, value=(25, 25, 25))
            cv2.putText(img, f"{h['square']} {h['pred']}@{h['conf']:.2f}", (4, 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, (80, 80, 255), 1, cv2.LINE_AA)
            tiles.append(img)
        if tiles:
            cols = 8
            while len(tiles) % cols:
                tiles.append(np.zeros_like(tiles[0]))
            grid = np.vstack([np.hstack(tiles[i : i + cols]) for i in range(0, len(tiles), cols)])
            montage.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(montage), grid)
            print(f"montage -> {montage}")


if __name__ == "__main__":
    main()
