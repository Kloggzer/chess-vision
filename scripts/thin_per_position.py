"""Einen Datensatz auf N Bretter je Stellung ausduennen — dieselben Pixel, nur weniger.

Beantwortet „brauchen wir acht Bilder je Stellung oder reichen zwei" OHNE einen Neu-Export: die
Variante waehlt aus dem vorhandenen Manifest aus, packt per `--from` aus derselben Memmap und ist
damit bis aufs Bit dieselben Crops. Ein Neu-Export haette andere Bilder gewaehlt und beide
Aenderungen vermischt.

Sauber und verdeckt getrennt, weil `dirty_per_position` eigenes Material fuer den Occlusion-Kopf
ist: je Stellung die N saubersten UND die N verdecktesten Bretter.

    uv run python scripts/thin_per_position.py <quelle> <ziel> --clean 2 --dirty 2
"""
import argparse
import collections
import json
import shutil

from chesslab.dataset_build import dataset_dir


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("target")
    ap.add_argument("--clean", type=int, default=2, help="saubere Bretter je Stellung")
    ap.add_argument("--dirty", type=int, default=2, help="verdeckte Bretter je Stellung")
    args = ap.parse_args()

    src = dataset_dir(args.source)
    rows = [json.loads(x) for x in (src / "manifest.jsonl").read_text(encoding="utf-8").splitlines()]

    cover = collections.defaultdict(list)
    for r in rows:
        cover[(r["session_id"], r["ply"], r["frame"])].append(float(r.get("coverage") or 0.0))
    mean = {k: sum(v) / len(v) for k, v in cover.items()}

    per_pos = collections.defaultdict(list)
    for (sess, ply, frame) in mean:
        per_pos[(sess, ply)].append(frame)

    keep = set()
    for (sess, ply), frames in per_pos.items():
        ordered = sorted(frames, key=lambda f: (mean[(sess, ply, f)], f))
        c, dy = args.clean, args.dirty
        chosen = ordered[:c] + ordered[len(ordered) - dy:] if len(ordered) > c + dy else ordered
        keep.update((sess, ply, f) for f in chosen)

    kept = [r for r in rows if (r["session_id"], r["ply"], r["frame"]) in keep]
    dst = dataset_dir(args.target)
    dst.mkdir(parents=True, exist_ok=True)
    (dst / "manifest.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in kept), encoding="utf-8")
    for name in ("split.json", "dataset.yaml", "stats.json"):
        if (src / name).is_file():
            shutil.copy2(src / name, dst / name)

    print(f"{len(per_pos)} Stellungen: {len(mean)} Bretter -> {len(keep)} "
          f"({100 * len(keep) / len(mean):.0f} %), Crops {len(rows)} -> {len(kept)}")
    print(f"[OK] {dst}\n     jetzt: uv run chesslab dataset pack {args.target} "
          f"--pack-size 80x80 --from {args.source}")


if __name__ == "__main__":
    main()
