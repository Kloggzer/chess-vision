"""Drei Verdeckungssensoren gegen dieselbe Wahrheit — SAM 3s Matte, auf ungesehenem Material.

Zur Wahl stehen der Coverage-Ausgang am Figuren-CNN (heute im APK), der destillierte Hand-Schueler
(`hand_gate.py`, heute nur Ingest) und die Matte selbst als Obergrenze. CLAUDE.md haelt fest, dass
die Arme nie gegeneinander gemessen wurden; ohne das ist "Kopf raus, Spezialist rein" eine Meinung.

Die Session muss fuer BEIDE Modelle Holdout sein — `rg-2026-08-16-20-41-33` ist es (Val des
Figurenmodells, Holdout in der Karte des Schuelers).

    uv run python scripts/coverage_arms.py [--session rg-2026-08-16-20-41-33] [--run ...]
"""
import argparse
from pathlib import Path

import cv2
import numpy as np

from chesslab import config
from chesslab.calibration import load_profile
from chesslab.ioutil import read_jsonl, write_json
from chesslab.labeling import (
    all_squares,
    board_source,
    crops_for_frame,
    read_matte,
    read_session_meta,
)
from chesslab.training.occlusion import PIECE_VISIBLE_MAX as VMAX


def _num(v: float | None, width: int) -> str:
    return "—".rjust(width) if v is None else f"{v:>{width}.3f}"


def curve(truth: np.ndarray, said: np.ndarray, name: str, thrs) -> None:
    want = truth > VMAX
    print(f"\n  {name}  (Wahrheit: {want.sum()} von {len(want)} Zellen verdeckt, "
          f"{100 * want.mean():.1f} %)")
    print(f"    {'Schwelle':>9}{'Precision':>11}{'Recall':>9}{'F1':>8}{'Flags':>9}")
    for t in thrs:
        hit = said > t
        tp = int((want & hit).sum())
        # `max(1, …)` machte aus "nichts geflaggt" / "nichts zu finden" eine GEMESSENE 0,000 —
        # bei Flags=0 las sich die Zeile wie ein miserabler Arm statt wie eine leere Stichprobe.
        p = tp / int(hit.sum()) if hit.any() else None
        r = tp / int(want.sum()) if want.any() else None
        f1 = 2 * p * r / (p + r) if p is not None and r is not None and p + r else None
        print(f"    {t:>9.2f}{_num(p, 11)}{_num(r, 9)}{_num(f1, 8)}{int(hit.sum()):>9}")
    err = np.abs(said - truth)
    print(f"    MAE gesamt {err.mean():.4f}   "
          f"auf verdeckten {_num(err[want].mean() if want.any() else None, 6)}   "
          f"auf sichtbaren {_num(err[~want].mean() if (~want).any() else None, 6)}")


def cnn_coverage(reads: list[dict]) -> list[float]:
    """Die Coverage-Spalte der Reads — oder eine Absage.

    Ohne Occlusion-Kopf schreibt `all_reads` den Schluessel gar nicht. Als 0,0 gelesen entstand
    die Kurve dieses Arms auf lauter Nullen und sah gemessen aus; `occlusion_gate.py` verweigert
    denselben Fall seit jeher laut.
    """
    if not any("coverage" in r for r in reads):
        raise SystemExit("[FAIL] der Lauf traegt keinen Occlusion-Kopf — hier ist nichts zu messen")
    return [float(r.get("coverage") or 0.0) for r in reads]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--session", default="rg-2026-08-16-20-41-33")
    ap.add_argument("--run", default="data/models/_ab/c8d1-seed43")
    ap.add_argument("--gate", default="mnv4-640")
    ap.add_argument("--no-gate", action="store_true", help="Nur das CNN messen.")
    ap.add_argument("--limit", type=int, default=250, help="Bretter — 592 dauern unnoetig lang.")
    args = ap.parse_args()

    sdir = config.DATA.recordings / args.session.replace("rg-", "", 1)
    meta = read_session_meta(sdir)
    profile = load_profile(meta["profile"])
    matte = read_matte(sdir)
    squares = all_squares()
    rows = []
    for r in read_jsonl(sdir / "log.jsonl"):
        stem = Path(str(r.get("frame") or "")).stem
        if (r.get("board") or r.get("frame")) and stem in matte:
            rows.append((stem, r))
    rows = rows[:: max(1, len(rows) // args.limit)][:args.limit]
    print(f"[i] {len(rows)} Bretter aus {args.session} (beiden Modellen ungesehen)")

    from chesslab import hand_gate, occluded_model
    gate = card = dev = None
    if not args.no_gate:
        gate, card, dev = hand_gate.load_gate(args.gate)

    truth, cnn, spec = [], [], []
    for i, (stem, r) in enumerate(rows):
        rel, stored = board_source(r, profile)
        board = cv2.imread(str(sdir / rel))
        if board is None:
            continue
        cells = (crops_for_frame(None, r["corners"], profile, board=board) if stored
                 else crops_for_frame(board, r["corners"], profile))
        reads = occluded_model.all_reads(Path(args.run), cells)
        # Ueber `read_gate` mit dem Rand der ZEILE: `read_boards` schneidet ihn nicht ab, das
        # CNN daneben schneidet ihn sehr wohl — 12 px auf 952 sind ein Viertel Feld Versatz, und
        # jede Zelle meldete die Nachbarin. Genau der Vergleich, der hier gemessen wird.
        said = ([0.0] * 65 if gate is None
                else hand_gate.read_gate(gate, dev, [sdir / (r.get("board") or r["frame"])],
                                         card["size"],
                                         borders=[int(r.get("board_border") or 0)])[0])
        m = matte[stem]
        heads = cnn_coverage(reads)
        for j, sq in enumerate(squares):
            truth.append(float(m.get(sq, 0.0)))
            cnn.append(heads[j])
            spec.append(float(said[1 + j]))
        if (i + 1) % 50 == 0:
            print(f"    {i + 1}/{len(rows)}", flush=True)

    truth, cnn, spec = np.array(truth), np.array(cnn), np.array(spec)
    thrs = (0.02, 0.05, 0.10, 0.15, 0.25, 0.50, 0.75, 0.90)
    curve(truth, cnn, f"CNN-Coverage-Kopf ({Path(args.run).name})", thrs)
    if not args.no_gate:
        curve(truth, spec, f"Hand-Schueler ({args.gate}, aus SAM destilliert)", thrs)
    out = Path("data/reports/coverage-arms.json")
    write_json(out, {"session": args.session, "run": args.run, "gate": args.gate,
                     "cells": len(truth),
                     "truth": truth.round(3).tolist(),
                     "cnn": cnn.round(3).tolist(),
                     "gate_said": spec.round(3).tolist()}, indent=None)
    print(f"\n[OK] {out}")


if __name__ == "__main__":
    main()
