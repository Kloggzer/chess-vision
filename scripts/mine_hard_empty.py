"""Mine hard-negative `empty` crops: real empty squares the deployed model reads as pieces.

Motivation (2026-07-21, live incident): the deployed CNN read the empty dark square h6 as
bB and a black queen on b6 as wQ with high confidence — the known dark-square domain gap.
The `empty` class is capped at dataset-build time (`subsample_classes`), and the random cap
throws away exactly the rare HARD empties (dark corner squares, neighbour pieces bleeding
into the crop via pad_up, shadows). This script finds those hard cases so the build can
keep them (see `priority_paths` in `dataset.subsample_classes`).

Usage:
    python scripts/mine_hard_empty.py --run data/models/p3-finetune [--device cpu]
        [--source data/manifests/squares.jsonl] [--conf-thr 0.5] [--batch 256]
        [--out data/manifests/hard_empty.jsonl] [--montage data/_perf/hard_empty.png]

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

# Real capture sessions are timestamped `YYYYMMDD-HHMMSS`. Everything else in the crop
# manifest (e.g. `pretrain-synth__synth-004`) is a classic-ingested SYNTHETIC pool whose
# PNGs also live on disk — mining those drowns the deployment-relevant real failures:
# on 2026-07-21, 697 of 786 mined "hard empties" turned out to be crops of the obsolete
# unframed ~51 px/square renders, and the headline stats described the wrong problem.
_CAMERA_SESSION_RE = re.compile(r"^\d{8}-\d{6}$")


def is_camera_session(session_id: str | None) -> bool:
    return bool(session_id and _CAMERA_SESSION_RE.match(str(session_id)))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--run", required=True, help="model run dir (e.g. data/models/p3-finetune)")
    ap.add_argument("--source", default=None,
                    help="crop manifest (default: data/manifests/squares.jsonl)")
    ap.add_argument("--device", default="cpu",
                    help="cpu is fine — mining is offline (default: cpu)")
    ap.add_argument("--conf-thr", type=float, default=0.5,
                    help="keep misreads with confidence >= this (default 0.5; the really "
                         "dangerous ones are >= the tracker's 0.85)")
    ap.add_argument("--batch", type=int, default=256)
    ap.add_argument("--limit", type=int, default=0, help="cap crops scanned (0 = all)")
    ap.add_argument("--out", default=None,
                    help="output JSONL (default: data/manifests/hard_empty.jsonl)")
    ap.add_argument("--include-synthetic", action="store_true",
                    help="also scan classic-ingested synthetic sessions (PNG pools like "
                         "pretrain-synth__*). Default OFF: they drown the real failures.")
    ap.add_argument("--montage", default=None,
                    help="montage PNG of the worst offenders (default: data/_perf/hard_empty.png)")
    args = ap.parse_args()

    from chesslab import serving  # lazy: torch import is slow

    src = Path(args.source) if args.source else config.DATA.manifests / "squares.jsonl"
    out = Path(args.out) if args.out else config.DATA.manifests / "hard_empty.jsonl"
    montage = Path(args.montage) if args.montage else config.DATA.root / "_perf" / "hard_empty.png"
    run_dir = Path(args.run)

    rows = [r for r in load_manifest(src) if r["label"] == "empty" and r.get("path")]
    # Fused synthetic pools are packed (mm:// rows have no files) — this miner targets REAL crops.
    rows = [r for r in rows if not str(r["path"]).startswith("mm://")]
    if not args.include_synthetic:
        n_before = len(rows)
        rows = [r for r in rows if is_camera_session(r.get("session_id"))]
        if n_before != len(rows):
            print(f"skipping {n_before - len(rows)} empty crops from non-camera sessions "
                  f"(classic-ingested synth pools; --include-synthetic to scan them)")
    if args.limit:
        rows = rows[: args.limit]
    print(f"scanning {len(rows)} real empty crops from {src.name} "
          f"with {run_dir.name} on {args.device} …")

    hard: list[dict] = []
    n_seen = 0
    for i in range(0, len(rows), args.batch):
        chunk = rows[i : i + args.batch]
        crops, kept_rows = [], []
        for r in chunk:
            img = cv2.imread(str(r["path"]))    # manifest paths are repo-cwd-relative
            if img is None:
                continue
            crops.append(img)
            kept_rows.append(r)
        if not crops:
            continue
        preds = serving.predict_arrays(run_dir, crops, device=args.device)
        n_seen += len(crops)
        for r, p in zip(kept_rows, preds, strict=True):
            if p["pred_label"] != "empty" and float(p["confidence"]) >= args.conf_thr:
                hard.append({"path": r["path"], "label": "empty",
                             "pred": p["pred_label"], "conf": round(float(p["confidence"]), 3),
                             "session_id": r.get("session_id"), "square": r.get("square"),
                             "square_color": r.get("square_color"),
                             "run": run_dir.name})
        if (i // args.batch) % 20 == 0:
            print(f"  {n_seen}/{len(rows)} scanned, {len(hard)} hard so far", flush=True)

    hard.sort(key=lambda h: -h["conf"])
    print(f"\n{len(hard)} hard empties (conf >= {args.conf_thr}) out of {n_seen} scanned "
          f"({100.0 * len(hard) / max(1, n_seen):.1f}%)")
    print("by predicted class:", dict(Counter(h["pred"] for h in hard).most_common()))
    print("by square color:  ", dict(Counter(str(h["square_color"]) for h in hard).most_common()))
    conf85 = sum(1 for h in hard if h["conf"] >= 0.85)
    print(f"confidently wrong (>= 0.85, the tracker's conf_thr): {conf85}")

    # Merge, de-duplicated by path (re-running with a newer model updates pred/conf).
    merged: dict[str, dict] = {}
    if out.exists():
        for line in out.read_text(encoding="utf-8").splitlines():
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
                for line in side.read_text(encoding="utf-8").splitlines():
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
