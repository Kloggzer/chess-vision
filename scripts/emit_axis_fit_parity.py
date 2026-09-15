"""Erzeugt `parity/_geometry/axis_fit.json` — den geteilten Fall fuer `_fit_axis` / `AxisFit.kt`.

Der Grid-Fit traegt das gesamte Genauigkeitsbudget (Mesh 0,9-1,1 px gegen 15-16 px roh) und
existiert zweimal. Bis 2026-09-15 pruefte jede Seite gegen ihre EIGENE synthetische Wahrheit,
nie gegeneinander.

`clean` traegt die ANALYTISCHE Wahrheit: die Punkte liegen exakt auf `intercept_k + (a + b*k)*lever`,
also muss der Fit sie zurueckgeben. Die robusten Faelle koennen das nicht — dort steht, was diese
Seite rechnet, und die Behauptung ist, dass die andere Seite dasselbe rechnet.

    uv run python scripts/emit_axis_fit_parity.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from chesslab.alignment import MIN_BAND_SAMPLES, _fit_axis

OUT = (Path(__file__).resolve().parents[1] / "android" / "core-engine" / "src" / "test"
       / "resources" / "parity" / "_geometry" / "axis_fit.json")

CENTRE = 500.0
SLOPE_A, SLOPE_B = 0.002, 0.0001
LEVERS = [-300.0, -200.0, -100.0, 0.0, 100.0, 200.0, 300.0, 400.0]


def truth(k: int, lever: float) -> float:
    return 50.0 + 100.0 * k + (SLOPE_A + SLOPE_B * k) * lever


def build(name: str, bands: dict[int, list[float]], nudge=None) -> dict:
    samples = []
    for k, levers in sorted(bands.items()):
        for lev in levers:
            pos = truth(k, lev)
            if nudge:
                pos += nudge(k, lev)
            samples.append([float(k), CENTRE + lev, pos])
    present = [k for k in sorted(bands) if len(bands[k]) >= MIN_BAND_SAMPLES]
    ks = np.array([s[0] for s in samples if int(s[0]) in present], np.float64)
    lev = np.array([s[1] for s in samples if int(s[0]) in present]) - CENTRE
    pos = np.array([s[2] for s in samples if int(s[0]) in present])
    fit = _fit_axis(ks, lev, pos, present, MIN_BAND_SAMPLES) if present else {}
    return {"name": name, "centre": CENTRE, "samples": samples,
            "expect": {str(k): [v[0], v[1]] for k, v in sorted(fit.items())}}


def main() -> None:
    full = {k: list(LEVERS) for k in range(9)}
    cases = [
        build("clean", full),
        # Eine Figur auf der Rille zieht den Schwerpunkt EINES Bandes um mehrere Pixel.
        build("one_outlier_band", full,
              nudge=lambda k, lev: 6.0 if (k == 4 and lev == 100.0) else 0.0),
        # Zwei Zeilen unter `MIN_BAND_SAMPLES` — keine Linie, ein Punktpaar im Schatten.
        build("sparse_lines", {**full, 2: LEVERS[:2], 7: LEVERS[:1]}),
        # Eine Linie, deren Baender sich WIDERSPRECHEN: ein gleichmaessiger Versatz wird vom
        # Achsenabschnitt geschluckt, ein wechselndes Vorzeichen nicht. Ausgezaehlt, nicht gemessen.
        build("outvoted_line", full,
              nudge=lambda k, lev: (40.0 if lev > 0 else -40.0) if k == 6 else 0.0),
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"cases": cases}, indent=2) + "\n", encoding="utf-8")
    for c in cases:
        print(f"  {c['name']}: {len(c['samples'])} Proben, {len(c['expect'])} Linien")
    print(f"[OK] {OUT}")


if __name__ == "__main__":
    main()
