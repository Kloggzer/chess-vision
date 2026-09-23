"""Screening: welche Engine-Zahl bewegt die Bewertung ueberhaupt?

Erster Schnitt vor jeder Optimierung — One-at-a-time an den RAENDERN des plausiblen Bereichs,
nicht Morris. Die Zielgroesse ist eine Zaehlung, viele Knoepfe bewegen sie exakt gar nicht, und
das beantwortet ein Randlauf abschliessend. Morris lohnt erst auf den Ueberlebenden, wo
Wechselwirkungen ueberhaupt moeglich sind. Hintergrund: `docs/engine-fuzz.md`.

Gefahren wird auf den VIER kuerzesten Aufnahmen (10 996 von 81 110 Frames) — ein Screening darf
billig sein, die Bestaetigung laeuft danach auf dem vollen Satz. Ein Job zur Zeit.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from chesslab.ioutil import append_rows, read_jsonl

ROOT = Path(__file__).resolve().parents[1]
BINARY = ROOT / "android/desktop/build/install/desktop/bin/desktop.bat"
DESKTOP = ROOT / "android/desktop"
OUT = ROOT / "tmp/batch/screen-knobs"
RESULTS = OUT / "results.jsonl"

#: Die vier kuerzesten des Regressionssatzes, zusammen 10 996 Frames.
RECORDINGS = ["2026-08-08-11-55-19", "VID_20260727_233929",
              "VID_20260726_233432", "VID_20260824_153751"]

#: Plausible Raender, nicht Extremwerte: ein Lauf, der die Engine unbrauchbar macht, beweist nichts.
RANGES: dict[str, tuple[float, float]] = {
    "motionThr": (0.15, 0.40), "motionPxThr": (10.0, 35.0), "zThr": (2.0, 4.5),
    "ambiguityMarginLl": (1.0, 4.0), "nudgeTimeoutS": (2.0, 10.0), "driftWindowS": (15.0, 60.0),
    "maxChanged": (4, 9), "taintIdentityThr": (0.0, 0.5), "censusThr": (25.0, 60.0),
    "censusZWeight": (0.5, 2.0), "occlCensusThr": (15.0, 35.0), "cnnConfThr": (0.70, 0.95),
    "cnnCooldownS": (0.3, 1.5), "cnnCheckIntervalS": (1.5, 6.0), "pOccludedThr": (0.25, 0.75),
    "refusedStreakForEval": (1, 6), "alarmDeferObs": (0, 4), "verifyWindow": (4, 16),
    "verifyTimeoutS": (0.75, 3.0), "cnnMinAgreement": (0.90, 0.99), "cnnMarginSquares": (0, 2),
    "cnnPlyCostSquares": (0, 2), "recoveryMaxPlies": (2, 6), "minConfidentBoard": (24, 48),
    "minConfidentRecovery": (4, 16), "motionMargin": (0.05, 0.20), "overhang": (0.15, 0.40),
    "alignEvery": (1, 6), "alignScale": (0.35, 1.0), "cornerJumpPx": (3.0, 12.0),
    "motionHoldS": (0.10, 0.35), "occluderHoldS": (0.10, 0.35), "commitHoldS": (0.033, 0.15),
    "earlyCommitObs": (1, 4), "sightCoverageMax": (0.02, 0.12), "occlusionColorThr": (1.5, 6.0),
    "minGridLineCoverage": (0.3, 0.7), "diffClaheClip": (1.0, 4.0), "motionRecencyS": (10.0, 40.0),
    "commitLlFloor": (1.0, 4.0), "detectScale": (0.35, 1.0), "desyncObsN": (2, 6),
    "alarmMinS": (0.75, 3.0), "desyncStandoffObsN": (6, 24), "autoResyncObsN": (0, 4),
    "verifyObsVotes": (1, 4), "darkLumaThr": (10.0, 30.0),
}

SCORE = {"found": re.compile(r"found (\d+):"), "missed": re.compile(r"missed (\d+)"),
         "invented": re.compile(r"invented (\d+)"), "beyond": re.compile(r"beyond (\d+)")}


def score_of(log: str) -> dict[str, int]:
    out = {k: (int(m.group(1)) if (m := p.search(log)) else -1) for k, p in SCORE.items()}
    out["alarms"] = len(re.findall(r"ALARM latched", log))
    return out


def run_one(tag: str, extra: list[str], rec: str) -> dict[str, int]:
    # `trace=` schreibt JEDEN Frame mit `cnnCoverageMax`, `gate` und der Verify-Leiter; das Log
    # kennt nur Entscheidungen, und die Verdeckungs-Achse ist nachtraeglich nicht rekonstruierbar.
    trace = OUT / "traces" / f"{tag}--{rec}.jsonl"
    trace.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(
        [str(BINARY), "replay", str(ROOT / f"data/recordings/{rec}/video.mp4"),
         "score", f"name={rec}", f"trace={trace}", *extra],
        cwd=DESKTOP, capture_output=True, text=True, errors="replace", check=False)
    (OUT / f"{tag}--{rec}.log").write_text(proc.stdout, encoding="utf-8", newline="\n")
    return score_of(proc.stdout)


def run_arm(tag: str, extra: list[str], jvms: int) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    total, started = {"found": 0, "missed": 0, "invented": 0, "beyond": 0, "alarms": 0}, time.time()
    # Zwei JVMs sind ~12 GB; mehr stehen an derselben Platte an.
    with ThreadPoolExecutor(max_workers=jvms) as pool:
        scores = list(pool.map(lambda r: run_one(tag, extra, r), RECORDINGS))
    for rec, score in zip(RECORDINGS, scores, strict=True):
        # Ein `-1` fuer "kein Score" darf nicht als gemessene Null in `results.jsonl` landen.
        missing = sorted(k for k, v in score.items() if v < 0)
        if missing:
            raise SystemExit(f"[FAIL] {tag}--{rec}: kein {', '.join(missing)} im Log — "
                             f"der Lauf ist nicht gemessen, nicht null")
        for key, value in score.items():
            total[key] += value
    total["tag"] = tag
    total["sec"] = round(time.time() - started, 1)
    return total


def arms() -> list[tuple[str, list[str]]]:
    out = [("BASIS", [])]
    for knob, (lo, hi) in RANGES.items():
        for side, value in (("lo", lo), ("hi", hi)):
            out.append((f"{knob}={value}#{side}", [f"set:{knob}={value}"]))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only", help="nur dieser Knopf")
    ap.add_argument("--jvms", type=int, default=2, help="Aufnahmen eines Arms gleichzeitig")
    args = ap.parse_args()
    done = {r["tag"] for r in read_jsonl(RESULTS)} if RESULTS.exists() else set()
    todo = [a for a in arms() if a[0] not in done
            and (not args.only or a[0].startswith(args.only) or a[0] == "BASIS")]
    print(f"{len(todo)} Arme offen ({len(done)} schon gemessen)", flush=True)
    for i, (tag, extra) in enumerate(todo, 1):
        row = run_arm(tag, extra, args.jvms)
        append_rows(RESULTS, [row])
        print(f"  [{i}/{len(todo)}] {tag:34s} "
              f"{row['found']}/{row['missed']}/{row['invented']}/{row['beyond']} "
              f"· {row['alarms']} alarm · {row['sec']}s", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
