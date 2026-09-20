"""Die scharfe Auswertung des Knopf-Screenings — aus den Logs, ohne einen Lauf zu wiederholen.

Die Zaehlung `found/missed/invented` hat 81 Plies Aufloesung und erklaerte 27 von 34 Armen fuer
wirkungslos; sieben davon verschieben Commit-Frames um bis zu 135. Die LATENZ je Ply ist stetig
und liefert ~80x mehr Messpunkte aus derselben Rechenzeit. Beides steht nebeneinander, weil eine
verschobene Latenz kein Gewinn ist, solange das Vorzeichen nicht dabei steht.
"""

from __future__ import annotations

import argparse
import collections
import re
import statistics
from pathlib import Path

from chesslab.ioutil import read_jsonl, write_json

ROOT = Path(__file__).resolve().parents[1]
LOGS = ROOT / "tmp/batch/screen-knobs"
RESULTS = LOGS / "results.jsonl"

FOUND = re.compile(r"^\s{4}(\S+)\s+label frame\s+(\d+)\s+run frame\s+(\d+)\s+\((\w+)\)")
MISSED = re.compile(r"^\s{4}(\S+)\s+label frame\s+(\d+)\s*$")
CACHE = re.compile(r"obs-cache: (\d+) hits, (\d+) misses")
TALLY = re.compile(r"^  (invented|beyond|reordered) (\d+)", re.M)


def read_log(path: Path) -> dict:
    """Ein Lauf auf EINER Aufnahme: je Ply die Latenz, dazu Steckenbleiber und Verluste."""
    text = path.read_text(encoding="utf-8", errors="replace")
    found, missed, block = {}, [], None
    for line in text.splitlines():
        if line.startswith("  found "):
            block = "found"
        elif line.startswith("  missed "):
            block = "missed"
        elif line.startswith(("  invented ", "  beyond ", "  reordered ")):
            block = None
        elif block == "found" and (m := FOUND.match(line)):
            # Schluessel ist (SAN, Label-Frame): derselbe Zug kommt mehrfach vor — drei `Rxc8` in
            # einem Clip sind gemessen —, und auf den SAN allein zaehlte der Bericht 75 statt 78.
            # Der Label-Frame stammt aus der `candidate.json` und ist ueber alle Arme derselbe.
            found[(m.group(1), int(m.group(2)))] = {"label": int(m.group(2)),
                                                    "run": int(m.group(3)), "decider": m.group(4)}
        elif block == "missed" and (m := MISSED.match(line)):
            missed.append(m.group(1))
    cache = CACHE.search(text)
    tally = {k: int(v) for k, v in TALLY.findall(text)}
    return {
        "found": found,
        "missed": missed,
        "invented": tally.get("invented", 0),
        "beyond": tally.get("beyond", 0),
        "reordered": tally.get("reordered", 0),
        "stuck": collections.Counter(re.findall(r"stuck: (\w+)", text)),
        "recovery_plies": sum(int(n) for n in re.findall(r"\[move 1/(\d+) of recovery", text)),
        "pairs": len(re.findall(r"by=cnn_pair", text)) // 2,
        "alarms": len(re.findall(r"ALARM latched", text)),
        "occl_veto_lines": len(re.findall(r"occlVeto=", text)),
        "cache_hits": int(cache.group(1)) if cache else -1,
        "cache_misses": int(cache.group(2)) if cache else -1,
    }


def arm_of(path: Path) -> tuple[str, str]:
    tag, rec = path.stem.split("--", 1)
    return tag, rec


def collect() -> dict[str, dict[str, dict]]:
    """Nur ABGESCHLOSSENE Arme: `results.jsonl` bekommt seine Zeile erst, wenn alle Aufnahmen
    durch sind. Ein laufender Arm sah sonst aus wie ein Einbruch — drei von vier Logs ergaben
    43 statt 78 Treffer, und das wurde prompt als Befund gemeldet."""
    fertig = {r["tag"] for r in read_jsonl(RESULTS)} if RESULTS.exists() else set()
    out: dict[str, dict[str, dict]] = collections.defaultdict(dict)
    for log in sorted(LOGS.glob("*--*.log")):
        tag, rec = arm_of(log)
        if tag in fertig:
            out[tag][rec] = read_log(log)
    return out


def summarise(arm: dict[str, dict], base: dict[str, dict]) -> dict:
    """Ein Arm gegen die Basis: Verschiebungen, Vorzeichen, und was die Zaehlung nicht zeigt."""
    shifts, later, earlier = [], 0, 0
    lat_arm, lat_base = [], []
    for rec, run in arm.items():
        ref = base.get(rec, {}).get("found", {})
        for key, ply in run["found"].items():
            lat_arm.append(ply["run"] - ply["label"])
            if key in ref:
                lat_base.append(ref[key]["run"] - ref[key]["label"])
                d = ply["run"] - ref[key]["run"]
                if d:
                    shifts.append(d)
                    later += d > 0
                    earlier += d < 0
    def agg(key: str) -> int:
        return sum(v[key] for v in arm.values())

    # `cache_hits`/`cache_misses` tragen `-1` fuer "das Log hat keine `obs-cache`-Zeile". Mit
    # summiert loeschte ein ungemessenes Log einen echten Miss weg, und `neu` verschwieg genau
    # den Fall, fuer den es da ist. Ungemessenes wird gezaehlt, nicht verrechnet.
    unmeasured = sum(1 for v in arm.values() if v["cache_misses"] < 0)

    stuck: collections.Counter = collections.Counter()
    for v in arm.values():
        stuck.update(v["stuck"])
    return {
        "found": sum(len(v["found"]) for v in arm.values()),
        "missed": sum(len(v["missed"]) for v in arm.values()),
        "invented": agg("invented"), "beyond": agg("beyond"), "reordered": agg("reordered"),
        "plies_shifted": len(shifts),
        "shifted_earlier": earlier,
        "shifted_later": later,
        "net_frames": sum(shifts),
        "max_abs_shift": max((abs(s) for s in shifts), default=0),
        "median_latency": statistics.median(lat_arm) if lat_arm else None,
        "base_median_latency": statistics.median(lat_base) if lat_base else None,
        "alarms": agg("alarms"), "pairs": agg("pairs"),
        "recovery_plies": agg("recovery_plies"),
        "stuck": dict(stuck),
        "cache_misses": sum(max(v["cache_misses"], 0) for v in arm.values()),
        "cache_unmeasured": unmeasured,
    }


def _tally(r: dict) -> tuple[int, int, int, int]:
    """Alle vier Achsen. `invented` ist das Veto, und `beyond` verschwieg drei verlorene
    Commits — `recoveryMaxPlies=2` galt damit als wirkungslos, obwohl es 18 auf 15 drueckt."""
    return r["found"], r["missed"], r["invented"], r["beyond"]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json", help="Ergebnis zusaetzlich hierhin schreiben")
    args = ap.parse_args()
    runs = collect()
    if "BASIS" not in runs:
        print("kein BASIS-Arm — nichts zu vergleichen")
        return 1
    base = runs["BASIS"]
    report = {tag: summarise(arm, base) for tag, arm in sorted(runs.items())}
    b = report["BASIS"]
    print(f"BASIS: found={b['found']} missed={b['missed']} "
          f"Latenz-Median={b['median_latency']} Frames, Alarme={b['alarms']}\n")
    print(f"{'Arm':30s} {'f/m':>7s} {'versch':>7s} {'frueher':>8s} {'spaeter':>8s} "
          f"{'netto':>7s} {'max':>5s} {'inv':>4s} {'bey':>4s}")
    for tag, r in report.items():
        if tag == "BASIS":
            continue
        zaehlung = "=" if _tally(r) == _tally(b) else "*"
        if not r["plies_shifted"] and zaehlung == "=":
            continue
        print(f"{tag:30s} {r['found']}/{r['missed']:<3} {zaehlung:>3s} {r['plies_shifted']:>5} "
              f"{r['shifted_earlier']:>8} {r['shifted_later']:>8} {r['net_frames']:>+7} "
              f"{r['max_abs_shift']:>5} {r['invented']:>4} {r['beyond']:>4}")
    stumm = [t for t, r in report.items()
             if t != "BASIS" and not r["plies_shifted"] and _tally(r) == _tally(b)]
    print(f"\nvollstaendig wirkungslos ({len(stumm)}): {', '.join(stumm)}")
    # Ein MISS ist hier richtig: wer aendert, welche Frames beobachtet oder wie sie geschnitten
    # werden, schneidet neue Crops. Gefaehrlich ist der TREFFER trotz geaendertem Modell — den
    # kann ein Engine-Knopf nicht ausloesen, aber ein Modellwechsel schon (`ObsCacheKeyTest`).
    neu = [t for t, r in report.items() if r["cache_misses"] > 0]
    if neu:
        print(f"\nneue Crops gesehen ({len(neu)}, erwartet bei Zuschnitt- und Zeit-Knoepfen): "
              f"{', '.join(neu)}")
    if args.json:
        write_json(Path(args.json), report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
