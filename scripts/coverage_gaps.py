"""Wo der Korpus duenn ist, ob Stellung oder Licht hilft — und was er ueber Hoehe und Winkel weiss.

Eine Zelle ohne Belege ist entweder NIE AUFGEBAUT worden (dann hilft eine Stellung) oder unter
dieser Beleuchtung nicht erreichbar (dann hilft nur Licht). Unterschieden wird empirisch: kommt
die Kombination aus Feldfarbe und Helligkeitsband im Korpus fuer IRGENDEINE Klasse haeufig vor,
ist sie erreichbar.

`axes` zaehlt daneben, was der Korpus ueber die Aufnahme selbst weiss — Hoehe, Ausrichtung und
Kamerapose. Heute steht dort fast alles unter „unbekannt", und genau das ist die Aussage:
`docs/capture-axes.md`.

    uv run python scripts/coverage_gaps.py --dataset real13-mix-v7-128
"""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from pathlib import Path

from chesslab.capture_plan import BANDS, PIECES, THIN, UNKNOWN, UNREACHABLE, band_of, pose_of

REC = Path("data/recordings")
#: Stufen, in denen `foreshorten` und `edge_px` gebuendelt werden. Fein genug, dass eine zweite
#: Pose auffiele, grob genug, dass Messrauschen keine eigene Zeile bekommt.
FORESHORTEN_STEP = 0.05
EDGE_STEP = 100


def tally(dataset: str) -> Counter:
    from chesslab.dataset_build import dataset_dir
    from chesslab.training.occlusion import PIECE_VISIBLE_MAX

    seen: Counter = Counter()
    with (dataset_dir(dataset) / "manifest.jsonl").open(encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            if r["label"] == "empty" or float(r.get("coverage") or 0.0) > PIECE_VISIBLE_MAX:
                continue
            b = r.get("brightness")
            seen[(r["label"], str(r.get("square_color") or "?"),
                  band_of(None if b is None else float(b)))] += 1
    return seen


def gaps(seen: Counter) -> list[dict]:
    names = [n for _, _, n in BANDS]
    reach: Counter = Counter()
    for (_, sq, b), n in seen.items():
        reach[(sq, b)] += n
    out = []
    for piece in PIECES:
        for sq in ("light", "dark"):
            for b in names:
                have = seen[(piece, sq, b)]
                if have >= THIN:
                    continue
                lit = reach[(sq, b)] >= UNREACHABLE
                out.append({"piece": piece, "square_color": sq, "band": b, "have": have,
                            "fix": "Stellung" if lit else "Licht",
                            "corpus_in_band": reach[(sq, b)]})
    return sorted(out, key=lambda g: (g["fix"] != "Stellung", g["have"]))


def _session_facts(session_id: str) -> dict:
    """Was eine Aufnahme ueber Hoehe, Ausrichtung und Pose hergibt.

    138 der 161 `session_id` sind Komposite ohne Aufnahmeordner — die zaehlen unter `unbekannt`,
    ohne Warnung; das ist ihre Natur, kein Fehler. Eine `rg-`Aufnahme ohne `capture.json` ebenso:
    nicht erfasst ist nicht dasselbe wie erfasst und normal.
    """
    rec = REC / session_id.removeprefix("rg-")
    out: dict = {"height": UNKNOWN, "by_ply": {}, "pose": {}}
    if not rec.is_dir():
        return out
    for cap in sorted(rec.glob("files/sessions/*/capture.json")):
        try:
            blob = json.loads(cap.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        out["height"] = str(blob.get("height") or UNKNOWN)
        for step in blob.get("steps") or ():
            out["by_ply"][int(step["ply"])] = str(step.get("orientation_deg", UNKNOWN))
    log = rec / "log.jsonl"
    if log.is_file():
        with log.open(encoding="utf-8") as fh:
            for line in fh:
                if not line.strip():
                    continue
                row = json.loads(line)
                if row.get("corners"):
                    # Der Manifest-Frame ist der STAMM, das obere Log traegt `frames/000117.png`.
                    out["pose"][Path(str(row["frame"])).stem] = pose_of(row["corners"])
    return out


def _bucket(value: float, step: float) -> str:
    lo = math.floor(value / step) * step
    return f"{lo:.2f}-{lo + step:.2f}" if step < 1 else f"{int(lo)}-{int(lo + step)}"


def axes(dataset: str) -> dict:
    """Hoehe je Aufnahme, Ausrichtung je PLY, Pose je FRAME — drei verschiedene Verbunde.

    Der Nenner ist ein anderer als bei `gaps`: dort zaehlen nur sichtbare Figurenzellen, hier
    ALLE Manifestzeilen, weil Hoehe und Winkel Eigenschaften der Aufnahme sind und nicht der
    Zelle. `rows_counted` macht das explizit, damit niemand die Bloecke gegeneinander rechnet.
    """
    from chesslab.dataset_build import dataset_dir

    facts: dict[str, dict] = {}
    height: Counter = Counter()
    orient: Counter = Counter()
    fore: Counter = Counter()
    edge: Counter = Counter()
    rows = 0
    with (dataset_dir(dataset) / "manifest.jsonl").open(encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            rows += 1
            sid = r["session_id"]
            if sid not in facts:
                facts[sid] = _session_facts(sid)
            f = facts[sid]
            height[f["height"]] += 1
            ply = r.get("ply")
            orient[f["by_ply"].get(int(ply), UNKNOWN) if ply is not None else UNKNOWN] += 1
            pose = f["pose"].get(str(r.get("frame")))
            fore[_bucket(pose["foreshorten"], FORESHORTEN_STEP) if pose else UNKNOWN] += 1
            edge[_bucket(pose["edge_px"], EDGE_STEP) if pose else UNKNOWN] += 1
    return {"rows_counted": rows, "height": dict(height.most_common()),
            "orientation_deg": dict(orient.most_common()),
            "foreshorten": dict(fore.most_common()), "edge_px": dict(edge.most_common())}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dataset", default="real13-mix-v7-128")
    ap.add_argument("--json", default="data/reports/coverage-gaps.json")
    ap.add_argument("--no-axes", action="store_true", help="Nur die Luecken, ohne Achsenblock.")
    args = ap.parse_args()

    seen = tally(args.dataset)
    g = gaps(seen)
    by_fix = Counter(x["fix"] for x in g)
    print(f"{args.dataset}: {len(g)} duenne Zellen von {len(PIECES) * 2 * len(BANDS)} "
          f"({by_fix['Stellung']} ueber eine Stellung erreichbar, {by_fix['Licht']} nur ueber Licht)")
    print(f"\n{'Figur':6s} {'Feld':6s} {'Band':12s} {'vorhanden':>10s} {'Korpus im Band':>15s}  Hebel")
    for x in g[:20]:
        print(f"{x['piece']:6s} {x['square_color']:6s} {x['band']:12s} {x['have']:10d} "
              f"{x['corpus_in_band']:15d}  {x['fix']}")

    payload = {"dataset": args.dataset, "thin_below": THIN, "gaps": g}
    if not args.no_axes:
        payload["axes"] = axes(args.dataset)
        a = payload["axes"]
        print(f"\nAchsen ueber {a['rows_counted']} Zeilen:")
        for name in ("height", "orientation_deg", "foreshorten", "edge_px"):
            top = list(a[name].items())[:3]
            print(f"  {name:16s} " + "  ".join(f"{k}={v}" for k, v in top))
    out = Path(args.json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=1), encoding="utf-8")
    print(f"\n[OK] {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
