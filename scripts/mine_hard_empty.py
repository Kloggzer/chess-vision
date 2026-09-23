"""Mine hard-negative `empty` crops: real empty squares the deployed model reads as pieces.

Offline mining from one finished model: its keep-list is a hidden input to the next run, so
`data/reports/hard_empty.jsonl` is parked between experiments. `--criterion occupancy` is the
phantom condition itself; `argmax` misses undecided softmaxes. Mine at the SERVED `--infer-size`.

Usage:
    python scripts/mine_hard_empty.py --run data/models/p3-finetune [--device cpu]
        [--source data/crops/default/manifest.jsonl] [--conf-thr 0.5] [--batch 256]
        [--criterion argmax|occupancy] [--infer-size 80] [--exclude-sessions A,B]
        [--out data/reports/hard_empty.jsonl] [--montage data/reports/perf/hard_empty.png]"""

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
from chesslab.ioutil import read_jsonl, write_rows  # noqa: E402
from chesslab.serving import observation_from_probs  # noqa: E402

# Real captures carry `rg-` (or the old `YYYYMMDD-HHMMSS`); everything else is a synthetic pool that
# drowns the real failures. The pattern once matched nothing and silently skipped every real
# session.
_CAMERA_SESSION_RE = re.compile(r"^(rg-.+|\d{8}-\d{6})$")


def training_rows_and_reader(name, split_name, which="train"):
    """Genau die Zeilen und Pixel, die das Training frisst: Trainings-Split und eigene Memmap. Der
    splitlose 128-px-Pool mass val/test und eine andere Skalierung.
    """
    import numpy as np

    from chesslab.dataset import load_manifest, load_split
    from chesslab.dataset_build import dataset_dir
    from chesslab.training.data import filter_rows_by_split
    from chesslab.training.packs import open_packed_rows

    dd = dataset_dir(name)
    manifest = load_manifest(dd / "manifest.jsonl")
    split = load_split(dd / (split_name or "split.json"))
    rows = filter_rows_by_split(manifest, split, which)
    mm, index = open_packed_rows(name, manifest)
    n, h, w = mm.shape[:3]
    print(f"[i] {len(rows)} Zeilen ({which}) aus {name} (Memmap {n} Zeilen @ {w}px)")
    return rows, (lambda path: (np.array(mm[index[path]])[:, :, ::-1]
                                if path in index else None)), (w, h)


def packed_reader(src, out_size):
    """Die Crops aus der passenden Memmap: 0,089 statt 9,72 ms je Crop. Die Groesse MUSS zum Pool
    passen, sonst wird still herunterskaliert.
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


def drop_packed_rows(rows: list[dict], have_reader: bool) -> tuple[list[dict], int]:
    """Drop `mm://` rows only when nothing can read them, and say how many went: session-pack
    datasets carry nothing else.
    """
    if have_reader:
        return rows, 0
    kept = [r for r in rows if not str(r["path"]).startswith("mm://")]
    return kept, len(rows) - len(kept)


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
    ap.add_argument("--which", default="train", choices=("train", "val", "test"),
                    help="Welche Haelfte des Splits. `train` fuers Verstaerken, `test` um zu "
                         "messen, wie oft das Modell ueberzeugt falsch liegt.")
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
        rows, reader, pool_size = training_rows_and_reader(args.dataset, args.split, args.which)
        src = Path(args.dataset)
    else:
        rows = load_manifest(src)
    rows = [r for r in rows if r.get("path") and ("all" in want or r["label"] in want)]
    rows, n_packed = drop_packed_rows(rows, reader is not None)
    if n_packed:
        print(f"skipping {n_packed} packed (mm://) rows — no memmap reader; use --dataset")
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

    # Serve at the deployment size; seeding the module cache is the only seam `predict_arrays`
    # offers.
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
    n_seen = n_unread = 0
    for i in range(0, len(rows), args.batch):
        chunk = rows[i : i + args.batch]
        crops, kept_rows = [], []
        for r in chunk:
            img = reader(r["path"]) if reader else None
            if img is None:
                img = cv2.imread(str(r["path"]))   # Rueckfall: Pfade sind cwd-relativ
            if img is None:
                n_unread += 1
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
                # `--occ-thr` widens past the crops that ALREADY fail (27 of 73 602, too few to
                # reach a batch): the band from 0.10 up is the whole tail, not "nearly wrong".
                if obs.p_occ["x"] < args.occ_thr and not obs.occupied("x"):
                    continue
                rec["p_occ"] = round(obs.p_occ["x"], 4)
                rec["p_empty"] = round(obs.p_empty["x"], 4)
                # Does the summed piece mass alone cross the line, or does a piece win the argmax (a
                # classic hard example)?
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
          f"({100.0 * len(hard) / max(1, n_seen):.1f}%)"
          + (f"; {n_unread} of {len(rows)} rows were UNREADABLE and never scanned"
             if n_unread else ""))
    # Wie viele EIGENE Situationen dahinter stecken: `wK` hatte 378 Fehler aus VIER — vervielfacht
    # ueberpasst das auf vier Stellungen.
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

    # Merged by path; a re-run with a newer model updates pred/conf.
    merged: dict[str, dict] = {}
    if not args.fresh:
        for r in read_jsonl(out):
            merged[r["path"]] = r
    for h in hard:
        merged[h["path"]] = h
    if not args.include_synthetic:
        # Legacy non-camera rows leave the keep list (kept, not deleted): obsolete synth pools.
        legacy = {p: r for p, r in merged.items() if not is_camera_session(r.get("session_id"))}
        if legacy:
            side = out.with_suffix(".synthetic.jsonl")
            existing = {}
            for r in read_jsonl(side):
                existing[r["path"]] = r
            existing.update(legacy)
            write_rows(side, existing.values())
            merged = {p: r for p, r in merged.items() if p not in legacy}
            print(f"moved {len(legacy)} legacy synth-pool rows -> {side}")
    out.parent.mkdir(parents=True, exist_ok=True)
    write_rows(out, merged.values())
    print(f"wrote {len(merged)} rows -> {out}")

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
