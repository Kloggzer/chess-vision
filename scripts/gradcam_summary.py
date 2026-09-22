"""Worauf schaut das Modell — ueber VIELE Zellen gemittelt, nicht nur auf einer.

`scripts/gradcam.py` zeigt eine Karte je Bild. Die Frage "nimmt das Modell eine Abkuerzung"
beantwortet aber erst der Mittelwert: liegt die Aufmerksamkeit auf der Figur in der Mitte, oder
am Rand, wo der Nachbar und der Lichtgradient des Bretts liegen?

Zwei Laeufe nebeneinander zeigen, was ein Rezeptwechsel wirklich veraendert hat. Dazu ein Streifen
Einzelbeispiele, weil ein Mittelwert eine bimodale Verteilung verstecken kann.

    uv run python scripts/gradcam_summary.py data/models/_reg/flip-s42 [zweiter-lauf] \
        --n 300 --examples 10
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

from chesslab.dataset_build import dataset_dir
from chesslab.ioutil import read_jsonl
from chesslab.training.evaluate import load_run
from chesslab.training.gradcam import compute_cam, jet, last_conv
from chesslab.training.torch_data import eval_transform_for

#: Der aeussere Ring gehoert dem NACHBARN, nicht dieser Zelle: `pad_side` 0,05 schneidet auf
#: jeder Seite 5 % ueber die Feldkante hinaus, und die perspektivische Neigung schiebt den Koerper
#: der Nachbarfigur zusaetzlich herein. Aufmerksamkeit dort ist eine Abkuerzung, keine Evidenz.
#: Ein Ring dieser Breite ist 51 % der Flaeche — bei gleichverteilter Aufmerksamkeit waeren also
#: 51 % zu erwarten, und alles darunter heisst "das Modell schaut nach innen".
EDGE = 0.15


def edge_mass(cam: np.ndarray) -> float:
    """Anteil der Aufmerksamkeit im aeusseren Ring — hoch heisst: auf dem Nachbarn."""
    h, w = cam.shape
    inner = cam[int(h * EDGE):int(h * (1 - EDGE)), int(w * EDGE):int(w * (1 - EDGE))]
    tot = float(cam.sum())
    return 1.0 - (float(inner.sum()) / tot if tot > 0 else 0.0)


def collect(run: Path, rows, size, n_examples):
    model, cfg = load_run(run)
    model.eval()
    layer = last_conv(model)
    tf = eval_transform_for(cfg)
    classes = cfg["classes"]
    acc = np.zeros((size, size), np.float64)
    per_class: dict[str, list[np.ndarray]] = {}
    cm, ex = [], []
    for r in rows:
        img = Image.open(r["path"]).convert("RGB")
        x = tf(img).unsqueeze(0)
        cam, idx, prob = compute_cam(model, x, layer, None, len(classes))
        cam = np.asarray(Image.fromarray((cam * 255).astype(np.uint8)).resize((size, size))) / 255.0
        acc += cam
        cm.append(edge_mass(cam))
        per_class.setdefault(r["label"], []).append(cam)
        if len(ex) < n_examples:
            ex.append((img.resize((size, size)), cam, r["label"], classes[idx], float(prob)))
    return acc / max(1, len(rows)), float(np.mean(cm)), per_class, ex, classes


def strip(items, size, gap=4):
    sheet = Image.new("RGB", (len(items) * (size + gap) + gap, 2 * (size + gap) + gap + 14),
                      (18, 20, 24))
    from PIL import ImageDraw

    dr = ImageDraw.Draw(sheet)
    for i, (img, cam, lab, pred, p) in enumerate(items):
        x = gap + i * (size + gap)
        sheet.paste(img, (x, gap))
        ov = Image.blend(img, Image.fromarray(jet(cam)), 0.55)
        sheet.paste(ov, (x, gap * 2 + size))
        ok = lab == pred
        dr.text((x + 1, 2 * size + 3 * gap), f"{lab}->{pred} {p:.2f}",
                fill=(140, 230, 150) if ok else (240, 140, 130))
    return sheet


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("runs", type=Path, nargs="+")
    ap.add_argument("--dataset", default="real13-straight-80-v3")
    ap.add_argument("--split", default="val")
    ap.add_argument("--n", type=int, default=300)
    ap.add_argument("--examples", type=int, default=10)
    ap.add_argument("--size", type=int, default=96)
    ap.add_argument("--out", default="data/reports/gradcam")
    a = ap.parse_args()

    dd = dataset_dir(a.dataset)
    split = json.loads((dd / "split.json").read_text(encoding="utf-8"))["splits"][a.split]
    rows = [r for r in read_jsonl(dd / "manifest.jsonl")
            if r["session_id"] in split and r["label"] != "empty" and Path(r["path"]).exists()]
    step = max(1, len(rows) // a.n)
    rows = rows[::step][:a.n]
    print(f"[i] {len(rows)} besetzte Zellen aus {a.split} von {a.dataset}")

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    means = []
    for run in a.runs:
        mean, cm, per_class, ex, classes = collect(run, rows, a.size, a.examples)
        means.append((run.name, mean, cm, per_class))
        strip(ex, a.size).save(out / f"{run.name}-beispiele.png")
        print(f"  {run.name:24} Aufmerksamkeit im RAND-Ring: {100*cm:.1f} % (gleichverteilt waeren 51 %)"
              f"   -> {run.name}-beispiele.png")

    # Mittelwertkarten nebeneinander, gemeinsame Skala
    hi = max(float(m.max()) for _n, m, _c, _p in means)
    sheet = Image.new("RGB", (len(means) * (a.size + 8) + 8, a.size + 8), (18, 20, 24))
    for i, (_n, m, _c, _p) in enumerate(means):
        sheet.paste(Image.fromarray(jet(m / hi)), (8 + i * (a.size + 8), 4))
    sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(out / "mittel.png")
    print(f"[OK] Mittelwertkarten -> {out}/mittel.png   "
          f"(Reihenfolge: {', '.join(n for n, *_ in means)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
