"""Die Zellen, bei denen sich zwei Arme widersprechen — als Kontaktbogen.

Ein Abstand von +0,0612 auf Episoden sind netto neun von 147. Welche neun das sind, entscheidet
das Auge: sind es echte Ansichtsprobleme oder schlechte Labels. Gezeigt wird je Episode EIN Frame,
der strittigste (beide Antworten stehen darunter).

    uv run python scripts/show_dispute.py --a data/models/_acc128v7/rot-s42 \
                                          --b data/models/_acc128v7/p4a-s42
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw

CELL, PAD, BAR = 112, 6, 40


def episode_key(row: dict) -> tuple:
    """Eine Episode ist (Aufnahme, Feld, Ply) — ohne die Aufnahme fallen fremde Faelle zusammen."""
    return row.get("session_id"), row["square"], row.get("true"), row.get("ply")


def disputed(rows: list[dict], preds_a: list[int], preds_b: list[int]) -> tuple[list[int], int]:
    """Indizes strittiger, GEMESSEN benotbarer Zellen, dazu die Zahl der ungemessenen.

    `coverage is None` heisst nicht gemessen, nicht null (CLAUDE.md, Coverage Matte Trap);
    als 0,0 gelesen waren 161 536 Zeilen eines Turntable-Satzes stillschweigend "sichtbar".
    """
    from chesslab.training.occlusion import classification_eligible

    live, unmeasured = [], 0
    for i, r in enumerate(rows):
        if r.get("coverage") is None:
            unmeasured += 1
        elif classification_eligible(r) and preds_a[i] != preds_b[i]:
            live.append(i)
    return live, unmeasured


def predictions(run: str, split: str):
    from chesslab.dataset_build import dataset_dir
    from chesslab.training.boardnet import CELLS
    from chesslab.training.data import filter_rows_by_split, load_manifest, load_split
    from chesslab.training.engine import evaluate_dataset
    from chesslab.training.evaluate import _load_run
    from chesslab.training.pack import load_packed, resolve_dataset_packs
    from chesslab.training.pack_bake import cfg_for_pack
    from chesslab.training.torch_data import PackedBoardDataset, eval_transform_for

    model, cfg = _load_run(Path(run))
    model.eval()
    dd = dataset_dir(cfg["dataset"])
    rows = filter_rows_by_split(load_manifest(dd / "manifest.jsonl"),
                                load_split(dd / (cfg.get("split_file") or "split.json")), split)
    packed = resolve_dataset_packs(cfg["dataset"], manifest_rows=rows) or load_packed(cfg["dataset"])
    tf = eval_transform_for(cfg_for_pack(cfg, cfg["dataset"], packed))
    ds = PackedBoardDataset(rows, cfg["classes"], tf, packed)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    res = evaluate_dataset(model.to(device), ds, device, batch_size=max(1, 256 // CELLS),
                           keep_workers=False)
    conf = res.get("conf")
    return ds.rows, res["trues"].tolist(), res["preds"].tolist(), cfg, \
        (list(conf) if conf is not None else [float("nan")] * len(res["trues"])), packed


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--a", required=True, help="Arm, der gewinnen soll.")
    ap.add_argument("--b", required=True, help="Kontrolle.")
    ap.add_argument("--split", default="val")
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--max", type=int, default=30)
    ap.add_argument("--out", default="data/reports/streit.png")
    args = ap.parse_args()

    rows, trues, preds_a, cfg, conf_a, packed = predictions(args.a, args.split)
    rows_b, trues_b, preds_b, _, conf_b, _ = predictions(args.b, args.split)
    if [r["path"] for r in rows] != [r["path"] for r in rows_b]:
        raise SystemExit("die beiden Laeufe sehen verschiedene Zeilen — nicht vergleichbar")

    cls = cfg["classes"]
    live, unmeasured = disputed(rows, preds_a, preds_b)
    hits = [{**rows[i], "true": cls[trues[i]], "a": cls[preds_a[i]], "b": cls[preds_b[i]],
             "ca": conf_a[i], "cb": conf_b[i]} for i in live]
    if unmeasured:
        print(f"!! {unmeasured} Zellen ohne gemessene coverage — nicht gewertet "
              f"(un-gemattete Aufnahme? `chesslab occluders recut-coverage`)")
    # Je Episode ein Bild: dieselbe Figur auf demselben Feld ueber viele Frames ist EIN Fall.
    best: dict[tuple, dict] = {}
    for h in hits:
        k = episode_key(h)
        if k not in best or h["cb"] > best[k]["cb"]:
            best[k] = h
    show = sorted(best.values(), key=lambda h: -h["cb"])[:args.max]
    a_right = sum(1 for h in hits if h["a"] == h["true"])
    print(f"{len(hits)} strittige Zellen in {len(best)} Episoden — "
          f"{args.a.split('/')[-1]} hat in {a_right} recht, {len(hits) - a_right} mal nicht")

    # Session-Packs: die Zeile traegt `_pack_at`, ein Monolith `_packed_idx` — eine Abfrage,
    # zwei Herkuenfte, sonst haette dieses Blatt seinen eigenen Lesepfad.
    maps = [np.memmap(f, dtype=np.uint8, mode="r", shape=(s[0], s[1], s[2], 3))
            for f, s in packed.files] if hasattr(packed, "files") else None

    def pixels(row: dict) -> np.ndarray:
        if maps is not None:
            pack_no, row_no = row["_pack_at"]
            return np.asarray(maps[pack_no][row_no])
        return np.asarray(packed[0][row["_packed_idx"]])

    grid = (len(show) + args.cols - 1) // args.cols
    sheet = Image.new("RGB", (args.cols * (CELL + PAD) + PAD,
                              grid * (CELL + BAR + PAD) + PAD), (18, 20, 24))
    dr = ImageDraw.Draw(sheet)
    for i, h in enumerate(show):
        x, y = PAD + (i % args.cols) * (CELL + PAD), PAD + (i // args.cols) * (CELL + BAR + PAD)
        sheet.paste(Image.fromarray(pixels(h)).resize((CELL, CELL), Image.NEAREST), (x, y))
        dr.text((x + 2, y + CELL + 2), f"{h['square']} = {h['true']}  ply {h.get('ply')}",
                fill=(210, 215, 225))
        for line, (arm, key, c) in enumerate((("A", "a", "ca"), ("B", "b", "cb"))):
            good = h[key] == h["true"]
            dr.text((x + 2, y + CELL + 14 + 12 * line),
                    f"{arm} {h[key]:6s} {h[c]:.2f}", fill=(120, 230, 140) if good else (240, 140, 130))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(f"[OK] {len(show)} Faelle -> {args.out}   (A = {args.a}, B = {args.b})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
