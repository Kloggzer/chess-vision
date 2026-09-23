"""Worauf schaut das Modell, gemessen durch WEGNEHMEN: ein Fleck in Datensatz-Mittelfarbe wandert
ueber den Crop. Grad-CAM taugt hier nicht (3x3-Karte auf 80 px).

    uv run python scripts/occlusion_sensitivity.py <lauf> [<lauf> ...] --n 120 --patch 16 --stride 4
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw

from chesslab.dataset_build import dataset_dir
from chesslab.ioutil import read_jsonl
from chesslab.training.evaluate import load_run
from chesslab.training.gradcam import jet
from chesslab.training.torch_data import eval_transform_for

sys.path.insert(0, str(Path(__file__).resolve().parent))   # sibling scripts
from gradcam_summary import edge_mass  # noqa: E402


def occlusion_map(model, x: torch.Tensor, cls: int, n_cls: int, patch: int,
                  stride: int, device: str) -> tuple[np.ndarray, float, float]:
    """Wahrscheinlichkeits-ABFALL je Fleckposition, plus der SCHLIMMSTE Fleck: traegt ein Bereich
    die Entscheidung allein, kippt eine Hand darueber sie.
    """
    _, _, h, w = x.shape
    ys = list(range(0, h - patch + 1, stride))
    xs = list(range(0, w - patch + 1, stride))
    batch = x.repeat(len(ys) * len(xs), 1, 1, 1)
    for i, yy in enumerate(ys):
        for j, xx in enumerate(xs):
            # 0 im normierten Raum IST die Datensatz-Mittelfarbe.
            batch[i * len(xs) + j, :, yy:yy + patch, xx:xx + patch] = 0.0
    with torch.no_grad():
        # Nur ueber die KLASSEN normieren: die letzte Spalte ist bei `--head occlusion` der
        # Coverage-Sigmoid.
        base = torch.softmax(model(x.to(device))[:, :n_cls], 1)[0, cls].item()
        out = []
        for k in range(0, batch.shape[0], 256):
            p = torch.softmax(model(batch[k:k + 256].to(device))[:, :n_cls], 1)[:, cls]
            out.append(p.cpu())
        probs = torch.cat(out).numpy()
    drop = np.clip(base - probs, 0, None).reshape(len(ys), len(xs))
    worst = float(drop.max())
    acc = np.zeros((h, w), np.float64)
    cnt = np.zeros((h, w), np.float64)
    for i, yy in enumerate(ys):
        for j, xx in enumerate(xs):
            acc[yy:yy + patch, xx:xx + patch] += drop[i, j]
            cnt[yy:yy + patch, xx:xx + patch] += 1
    return acc / np.maximum(cnt, 1), base, worst


def pick_rows(manifest, split, n: int) -> list[dict]:
    """Die Zellen, die das Verfahren oeffnen KANN, oder eine Absage: `mm://`-Zeilen haben keine
    Datei, und die v6/v7-Saetze tragen nur solche.
    """
    want = [r for r in manifest if r["session_id"] in split and r["label"] != "empty"]
    rows = [r for r in want if not str(r["path"]).startswith("mm://") and Path(r["path"]).exists()]
    if not rows:
        packed = sum(1 for r in want if str(r["path"]).startswith("mm://"))
        raise SystemExit(f"[FAIL] keine oeffenbare Zelle: {len(want)} Zeilen im Split, davon "
                         f"{packed} als `mm://` im Pack. Dieses Werkzeug liest Dateien.")
    return rows[::max(1, len(rows) // n)][:n]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("runs", type=Path, nargs="+")
    ap.add_argument("--dataset", default="real13-straight-80-v3")
    ap.add_argument("--split", default="val")
    ap.add_argument("--n", type=int, default=120)
    ap.add_argument("--patch", type=int, default=16)
    ap.add_argument("--stride", type=int, default=4)
    ap.add_argument("--examples", type=int, default=12)
    ap.add_argument("--min-p", type=float, default=0.5,
                    help="Zellen ueberspringen, denen das Modell die wahre Klasse "
                         "ohnehin nicht gibt: dort kann nichts abfallen und die "
                         "Karte ist Rauschen.")
    ap.add_argument("--out", default="data/reports/occlusion")
    a = ap.parse_args()

    dd = dataset_dir(a.dataset)
    split = json.loads((dd / "split.json").read_text(encoding="utf-8"))["splits"][a.split]
    rows = pick_rows(read_jsonl(dd / "manifest.jsonl"), split, a.n)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[i] {len(rows)} Zellen, Fleck {a.patch} px, Schritt {a.stride}, "
          f"{((80 - a.patch) // a.stride + 1) ** 2} Positionen je Bild, {device}")

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    summary = []
    for run in a.runs:
        model, cfg = load_run(run)
        model.to(device).eval()
        tf = eval_transform_for(cfg)
        classes = cfg["classes"]
        acc, ems, ex, skipped, worsts = None, [], [], 0, []
        for r in rows:
            img = Image.open(r["path"]).convert("RGB")
            x = tf(img).unsqueeze(0)
            cls = classes.index(r["label"])
            m, base, worst = occlusion_map(model, x, cls, len(classes), a.patch,
                                           a.stride, device)
            if base < a.min_p:
                skipped += 1
                continue
            acc = m if acc is None else acc + m
            ems.append(edge_mass(m))
            worsts.append(worst / max(base, 1e-9))
            if len(ex) < a.examples:
                ex.append((img.resize((80, 80)), m, r["label"], base))
        acc /= max(1, len(ems))
        summary.append((run.name, acc, float(np.mean(ems))))
        s = Image.new("RGB", (len(ex) * 88 + 8, 2 * 88 + 22), (18, 20, 24))
        dr = ImageDraw.Draw(s)
        for i, (img, m, lab, base) in enumerate(ex):
            hi = m.max() or 1.0
            s.paste(img, (8 + i * 88, 6))
            s.paste(Image.blend(img, Image.fromarray(jet(m / hi)), 0.6), (8 + i * 88, 98))
            dr.text((8 + i * 88, 180), f"{lab} p={base:.2f}", fill=(150, 220, 255))
        s.save(out / f"{run.name}-beispiele.png")
        print(f"  {run.name:24} Rand-Ring {100 * np.mean(ems):5.1f} %  |  "
              f"schlimmster Einzelfleck kostet {100 * np.mean(worsts):5.1f} % der "
              f"Wahrscheinlichkeit  |  {len(ems)} Zellen, {skipped} unter p={a.min_p:g}")

    hi = max(float(m.max()) for _n, m, _e in summary)
    sheet = Image.new("RGB", (len(summary) * 96 + 8, 104), (18, 20, 24))
    for i, (_n, m, _e) in enumerate(summary):
        sheet.paste(Image.fromarray(jet(m / hi)).resize((88, 88)), (8 + i * 96, 8))
    sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(out / "mittel.png")
    print(f"[OK] {out}/mittel.png  ({', '.join(n for n, *_ in summary)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
