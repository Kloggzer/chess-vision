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
from chesslab.ioutil import iter_jsonl, read_jsonl, write_json

REC = Path("data/recordings")
#: Stufen, in denen `foreshorten` und `edge_px` gebuendelt werden. Fein genug, dass eine zweite
#: Pose auffiele, grob genug, dass Messrauschen keine eigene Zeile bekommt.
FORESHORTEN_STEP = 0.05
EDGE_STEP = 100


def manifest_of(dataset: str, override: str = "") -> Path:
    from chesslab.dataset_build import dataset_dir

    return Path(override) if override else dataset_dir(dataset) / "manifest.jsonl"


def tally(dataset: str, manifest: str = "") -> Counter:
    """Nur die Belege — der Nenner steht in `counts`."""
    return counts(dataset, manifest)[0]


def counts(dataset: str, manifest: str = "") -> tuple[Counter, dict]:
    """Belege je (Figur, Feldfarbe, Helligkeitsband) und ihr Nenner. `coverage is None` heisst NICHT
    GEMESSEN: diese Zellen zaehlen mit, aber ihre Zahl steht daneben.
    """
    from chesslab.cell_rule import PIECE_VISIBLE_MAX

    seen: Counter = Counter()
    pieces = unmeasured = 0
    for r in iter_jsonl(manifest_of(dataset, manifest)):
        if r["label"] == "empty":
            continue
        pieces += 1
        cov = r.get("coverage")
        if cov is None:
            unmeasured += 1
        elif float(cov) > PIECE_VISIBLE_MAX:
            continue
        b = r.get("brightness")
        seen[(r["label"], str(r.get("square_color") or "?"),
              band_of(None if b is None else float(b)))] += 1
    return seen, {"piece_rows": pieces, "coverage_unmeasured": unmeasured}


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
    """Was eine Aufnahme ueber Hoehe, Ausrichtung und Pose hergibt. Komposite ohne Ordner und `rg-`
    ohne `capture.json` zaehlen unter `unbekannt`, ohne Warnung.
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
        for row in read_jsonl(log):
            if row.get("corners"):
                # Der Manifest-Frame ist der STAMM, das Log traegt `frames/000117.png`.
                out["pose"][Path(str(row["frame"])).stem] = pose_of(row["corners"])
    return out


def _bucket(value: float, step: float) -> str:
    lo = math.floor(value / step) * step
    return f"{lo:.2f}-{lo + step:.2f}" if step < 1 else f"{int(lo)}-{int(lo + step)}"


def axes(dataset: str, manifest: str = "") -> dict:
    """Hoehe je Aufnahme, Ausrichtung je PLY, Pose je FRAME. Der Nenner sind ALLE Manifestzeilen,
    nicht wie bei `gaps` sichtbare Figurenzellen — `rows_counted` sagt es.
    """
    facts: dict[str, dict] = {}
    height: Counter = Counter()
    orient: Counter = Counter()
    fore: Counter = Counter()
    edge: Counter = Counter()
    rows = 0
    for r in iter_jsonl(manifest_of(dataset, manifest)):
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
    ap.add_argument("--manifest", default="", help="Statt des Datensatz-Manifests lesen.")
    ap.add_argument("--no-axes", action="store_true", help="Nur die Luecken, ohne Achsenblock.")
    args = ap.parse_args()

    seen, denom = counts(args.dataset, args.manifest)
    g = gaps(seen)
    by_fix = Counter(x["fix"] for x in g)
    print(f"{args.dataset}: {len(g)} duenne Zellen von {len(PIECES) * 2 * len(BANDS)} "
          f"({by_fix['Stellung']} ueber eine Stellung erreichbar, {by_fix['Licht']} nur ueber Licht)")
    if denom["coverage_unmeasured"]:
        share = 100 * denom["coverage_unmeasured"] / max(1, denom["piece_rows"])
        print(f"! {denom['coverage_unmeasured']} von {denom['piece_rows']} Figurenzellen sind NICHT "
              f"gemattet ({share:.1f} %) — sie zaehlen hier als sichtbar mit.")
    print(f"\n{'Figur':6s} {'Feld':6s} {'Band':12s} {'vorhanden':>10s} {'Korpus im Band':>15s}  Hebel")
    for x in g[:20]:
        print(f"{x['piece']:6s} {x['square_color']:6s} {x['band']:12s} {x['have']:10d} "
              f"{x['corpus_in_band']:15d}  {x['fix']}")

    payload = {"dataset": args.dataset, "thin_below": THIN, "gaps": g, "denominator": denom}
    if not args.no_axes:
        payload["axes"] = axes(args.dataset, args.manifest)
        a = payload["axes"]
        print(f"\nAchsen ueber {a['rows_counted']} Zeilen:")
        for name in ("height", "orientation_deg", "foreshorten", "edge_px"):
            top = list(a[name].items())[:3]
            print(f"  {name:16s} " + "  ".join(f"{k}={v}" for k, v in top))
    out = Path(args.json)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_json(out, payload, indent=1)
    print(f"\n[OK] {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
