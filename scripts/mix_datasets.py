"""Zwei Datensaetze zu einem Trainingssatz zusammenlegen — der Gast geht NUR in train.

Warum es das braucht: alle Rezept-Hebel verteilen eine feste Informationsmenge um, keiner
erzeugt welche (`docs/measurement-floor.md`). Der echte Trainingssplit kennt 183 (Figur,Feld)-
Kombinationen, `wK` davon auf drei Feldern. `comp13-v4-80` bringt 108 neue, +59 %, und trifft
genau die ausgehungerten Klassen.

Der Gast darf nie nach val oder test: der gehaltene Satz ist eine echte Aufnahme, und Composites
dazuzumischen wuerde die Zahl schoenrechnen, gegen die alles andere gemessen wurde. Beide Seiten
muessen dateibasiert sein (kein `mm://`) und dieselbe Klassenliste tragen — dann packt
`dataset pack` den Mischsatz frisch aus den Quell-Crops.

    uv run python scripts/mix_datasets.py real13-straight-80-v3-c8d1 comp13-v4-80 real13-mix-v4
    uv run chesslab dataset pack real13-mix-v4 --pack-size 80x80
"""
import argparse
import collections
import json

from chesslab.dataset_build import dataset_dir
from chesslab.ioutil import read_jsonl, write_json, write_rows


def load(name: str) -> tuple[list[dict], dict]:
    dd = dataset_dir(name)
    rows = read_jsonl(dd / "manifest.jsonl")
    return rows, json.loads((dd / "split.json").read_text(encoding="utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("host", help="Gibt die Splits vor; val/test bleiben seine.")
    ap.add_argument("guest", help="Kommt vollstaendig nach train.")
    ap.add_argument("out")
    a = ap.parse_args()

    hrows, hsplit = load(a.host)
    grows, gsplit = load(a.guest)
    if hsplit.get("classes") != gsplit.get("classes"):
        raise SystemExit("[FAIL] verschiedene Klassenlisten — der Mischsatz waere nicht lesbar.")
    for side, rows in ((a.host, hrows), (a.guest, grows)):
        mm = [r for r in rows if str(r["path"]).startswith("mm://")]
        if mm:
            raise SystemExit(f"[FAIL] {side} hat {len(mm)} mm://-Zeilen und keine Dateien; "
                             "ein Mischsatz kann daraus nicht frisch packen.")

    hval = set(hsplit["splits"].get("val", [])) | set(hsplit["splits"].get("test", []))
    gsess = sorted({r["session_id"] for r in grows})
    clash = hval & set(gsess)
    if clash:
        raise SystemExit(f"[FAIL] Gast-Sessions liegen im gehaltenen Satz: {sorted(clash)}")

    dd = dataset_dir(a.out)
    dd.mkdir(parents=True, exist_ok=True)
    write_rows(dd / "manifest.jsonl", hrows + grows)
    split = {**hsplit, "splits": {**hsplit["splits"],
                                  "train": sorted(set(hsplit["splits"]["train"]) | set(gsess))}}
    # Die Klassengewichte des Hosts passen nicht mehr; `train --head occlusion` rechnet sie
    # ohnehin aus den sichtbaren Zeilen des Mischsatzes neu, also raus statt falsch stehen lassen.
    split.pop("class_weights", None)
    write_json(dd / "split.json", split, indent=1)

    def combos(rows, keep):
        return {(r["label"], r["square"]) for r in rows
                if r["label"] != "empty" and r["session_id"] in keep}

    hc = combos(hrows, set(hsplit["splits"]["train"]))
    gc = combos(grows, set(gsess))
    print(f"[OK] {a.out}: {len(hrows) + len(grows)} Zeilen "
          f"({len(hrows)} Host + {len(grows)} Gast)")
    print(f"     train {len(split['splits']['train'])} Sessions "
          f"({len(hsplit['splits']['train'])} + {len(gsess)}), "
          f"val {len(hsplit['splits'].get('val', []))} unveraendert")
    print(f"     (Figur,Feld) im Training: {len(hc)} -> {len(hc | gc)}  (+{len(gc - hc)})")
    byc = collections.Counter(lab for lab, _sq in gc - hc)
    print("     " + "  ".join(f"{c}+{n}" for c, n in byc.most_common(6)))
    print(f"\nJetzt: uv run chesslab dataset pack {a.out} --pack-size 80x80")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
