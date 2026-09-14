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
    ap.add_argument("--clean-repeat", type=int, default=1,
                    help="saubere Zeilen so oft wiederholen — trennt Haeufigkeit von Vielfalt")
    ap.add_argument("--force", action="store_true", help="Vorhandenen Zieldatensatz ueberschreiben")
    args = ap.parse_args()

    src = dataset_dir(args.source)
    dst = dataset_dir(args.target)
    if dst.exists() and not args.force:
        print(f"[FAIL] {dst} existiert bereits; zum Ersetzen --force angeben")
        return 1
    rows = [json.loads(x) for x in (src / "manifest.jsonl").read_text(encoding="utf-8").splitlines()]

    cover = collections.defaultdict(list)
    for r in rows:
        cover[(r["session_id"], r["ply"], r["frame"])].append(float(r.get("coverage") or 0.0))
    mean = {k: sum(v) / len(v) for k, v in cover.items()}

    per_pos = collections.defaultdict(list)
    for (sess, ply, frame) in mean:
        per_pos[(sess, ply)].append(frame)

    keep = set()
    # SAUBER heisst hier: im Rang der Stellung vorn. Ein absoluter Coverage-Schnitt taugt
    # nicht — eine Hand ueber 12 von 64 Zellen ergibt im Mittel auch nur ~0,15.
    clean_keys = set()
    for (sess, ply), frames in per_pos.items():
        ordered = sorted(frames, key=lambda f: (mean[(sess, ply, f)], f))
        c, dy = args.clean, args.dirty
        # `head` ist IMMER nur der saubere Kopf: im Rueckfall stand hier `ordered`, also wurde
        # das verdeckteste Brett der Stellung als sauber vervielfacht.
        head, tail = ordered[:c], ordered[max(c, len(ordered) - dy):]
        chosen = head + tail
        clean_keys.update((sess, ply, f) for f in head)
        keep.update((sess, ply, f) for f in chosen)

    kept = []
    for r in rows:
        k = (r["session_id"], r["ply"], r["frame"])
        if k not in keep:
            continue
        # Wiederholte Zeilen zeigen auf dieselben Memmap-Eintraege: identische Pixel, nur oefter
        # gezogen. So variiert die HAEUFIGKEIT sauberer Zellen ohne ihre Vielfalt zu aendern.
        kept.extend([r] * (args.clean_repeat if k in clean_keys else 1))
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
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
