"""Latenz minimieren, ohne einen Treffer zu verlieren — mit Racing ueber die zehn Aufnahmen.

Ziel des Nutzers (2026-09-20): "Minimiere Latenz, kein Treffer darf verloren gehen." Beides sind
harte NEBENBEDINGUNGEN, keine Gewichte: ein Phantom oder ein verlorener Zug bricht den Versuch ab,
statt gegen gewonnene Frames aufgerechnet zu werden.

Racing macht den vollen Satz bezahlbar: die Aufnahmen laufen von der kuerzesten zur laengsten, und
ein schlechter Versuch stirbt nach ~25 s statt nach ~20 min. Nur die Kandidaten, die durchhalten,
kosten die vollen 81 110 Frames. Der Suchraum kommt aus `scripts/screen_knobs.py` — 4 von 47
Knoepfen tragen die Groessenordnung (`docs/knopf-screening.md`).

**Ein gescheiterter Versuch wird nicht geprunet, sondern schliesst ab.** Optunas Constrained-TPE
lernt die unzulaessige Region aus genau diesen Werten; ein `TrialPruned` wuerfe die teuerste
Information weg, die ein Abbruch liefert.
"""

from __future__ import annotations

import argparse
import logging
import re
import subprocess
import time
from pathlib import Path

import optuna

from chesslab.ioutil import append_rows, read_jsonl

ROOT = Path(__file__).resolve().parents[1]
BINARY = ROOT / "android/desktop/build/install/desktop/bin/desktop.bat"
DESKTOP = ROOT / "android/desktop"
OUT = ROOT / "tmp/batch/optimise-knobs"
TRIALS = OUT / "trials.jsonl"

#: Von der kuerzesten zur laengsten — das ist die ganze Racing-Idee.
RECORDINGS = ["2026-08-08-11-55-19", "VID_20260727_233929", "VID_20260726_233432",
              "VID_20260824_153751", "VID_20260802_222203", "2026-08-07-13-52-38",
              "VID_20260802_222741", "2026-08-08-00-39-57", "VID_20260824_154327",
              "2026-08-08-11-59-12"]

#: Die vier Knoepfe, die im Screening die Groessenordnung tragen, plus zwei aus dem Mittelfeld.
#: Grenzen etwas weiter als die Screening-Raender, damit das Optimum nicht auf der Kante liegt.
SPACE: dict[str, tuple[float, float]] = {
    "motionThr": (0.20, 0.60),
    "motionPxThr": (18.0, 45.0),
    "motionMargin": (0.02, 0.14),
    "commitHoldS": (0.020, 0.090),
    "motionHoldS": (0.08, 0.26),
    "maxChanged": (4, 8),
}
GANZZAHLIG = {"maxChanged"}

FOUND = re.compile(r"^\s{4}(\S+)\s+label frame\s+(\d+)\s+run frame\s+(\d+)\s+\((\w+)\)", re.M)
TALLY = re.compile(r"^  (invented|beyond) (\d+)", re.M)


def replay(rec: str, config: dict[str, float], tag: str) -> dict:
    """Ein Lauf auf einer Aufnahme. Gibt Treffer, Phantome und die Summe der Latenzen zurueck."""
    OUT.mkdir(parents=True, exist_ok=True)
    sets = [f"set:{k}={int(v) if k in GANZZAHLIG else v}" for k, v in config.items()]
    proc = subprocess.run(
        [str(BINARY), "replay", str(ROOT / f"data/recordings/{rec}/video.mp4"),
         "score", f"name={rec}", *sets],
        cwd=DESKTOP, capture_output=True, text=True, errors="replace", check=False)
    (OUT / f"{tag}--{rec}.log").write_text(proc.stdout, encoding="utf-8", newline="\n")
    plies = FOUND.findall(proc.stdout)
    tally = {k: int(v) for k, v in TALLY.findall(proc.stdout)}
    return {
        "found": len(plies),
        "invented": tally.get("invented", 0),
        "latency": sum(int(run) - int(label) for _, label, run, _ in plies),
    }


def race(config: dict[str, float], base: dict[str, dict], tag: str) -> dict:
    """Aufnahme fuer Aufnahme, Abbruch beim ersten Verstoss — die Werte bleiben aber erhalten."""
    latency, started = 0, time.time()
    for i, rec in enumerate(RECORDINGS):
        run = replay(rec, config, tag)
        sec = round(time.time() - started, 1)
        if run["invented"] > base[rec]["invented"]:
            return {"status": "phantom", "at": rec, "nach": i + 1, "sec": sec,
                    "phantome": run["invented"] - base[rec]["invented"], "fehlt": 0, "latency": 0}
        if run["found"] < base[rec]["found"]:
            return {"status": "verlust", "at": rec, "nach": i + 1, "sec": sec,
                    "fehlt": base[rec]["found"] - run["found"], "phantome": 0, "latency": 0}
        latency += run["latency"]
    return {"status": "ok", "latency": latency, "nach": len(RECORDINGS), "fehlt": 0, "phantome": 0,
            "sec": round(time.time() - started, 1)}


def constraints(trial: optuna.trial.FrozenTrial) -> tuple[float, float]:
    """<= 0 heisst zulaessig. Beide sind HART: kein verlorener Treffer, kein Phantom."""
    return (trial.user_attrs.get("fehlende_treffer", 0.0), trial.user_attrs.get("phantome", 0.0))


def objective(trial: optuna.Trial, base: dict[str, dict], strafe: float) -> float:
    config = {
        name: (trial.suggest_int(name, int(lo), int(hi)) if name in GANZZAHLIG
               else round(trial.suggest_float(name, lo, hi), 4))
        for name, (lo, hi) in SPACE.items()
    }
    row = race(config, base, f"t{trial.number:03d}")
    trial.set_user_attr("fehlende_treffer", float(row.get("fehlt", 0)))
    trial.set_user_attr("phantome", float(row.get("phantome", 0)))
    trial.set_user_attr("nach", row["nach"])
    trial.set_user_attr("status", row["status"])
    append_rows(TRIALS, [{"kind": "versuch", "tag": f"t{trial.number:03d}", "config": config, **row}])
    return row["latency"] if row["status"] == "ok" else strafe


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--trials", type=int, default=60)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    done = list(read_jsonl(TRIALS)) if TRIALS.exists() else []
    base = {r["rec"]: r for r in done if r.get("kind") == "basis"}
    if len(base) < len(RECORDINGS):
        print("Basis fehlt — einmal mit Vorgabewerten ueber den vollen Satz", flush=True)
        OUT.mkdir(parents=True, exist_ok=True)
        for rec in RECORDINGS:
            if rec in base:
                continue
            row = {"kind": "basis", "rec": rec, **replay(rec, {}, "BASIS")}
            append_rows(TRIALS, [row])
            base[rec] = row
            print(f"   {rec:22s} found={row['found']} inv={row['invented']} "
                  f"lat={row['latency']:+}", flush=True)
    basis_lat = sum(b["latency"] for b in base.values())
    treffer = sum(b["found"] for b in base.values())
    print(f"\nBasis: {treffer} Treffer, Latenz {basis_lat:+} Frames NL", flush=True)

    optuna.logging.set_verbosity(logging.WARNING)
    study = optuna.create_study(
        direction="minimize",
        sampler=optuna.samplers.TPESampler(seed=args.seed, constraints_func=constraints),
        storage=f"sqlite:///{(OUT / 'study.db').as_posix()}",
        study_name="latenz", load_if_exists=True,
    )
    # Unzulaessige Versuche brauchen EINEN Zielwert. Die Strafe liegt weit ueber jedem echten
    # Ergebnis, damit sie die Verteilung nicht verzerrt — entschieden wird ueber `constraints`.
    strafe = abs(basis_lat) * 10 + 100_000.0
    offen = args.trials - len([t for t in study.trials if t.state.is_finished()])
    if offen > 0:
        study.optimize(lambda tr: objective(tr, base, strafe), n_trials=offen,
                       callbacks=[lambda _study, tr: print(
                           f"  [{tr.number:>3}] {tr.user_attrs.get('status','?'):<8s} "
                           f"nach {tr.user_attrs.get('nach','?')}/10 "
                           f"{'Latenz ' + format(tr.value, '+.0f') if tr.user_attrs.get('status') == 'ok' else ''}",
                           flush=True)])
    zulaessig = [t for t in study.trials if t.user_attrs.get("status") == "ok"]
    if zulaessig:
        best = min(zulaessig, key=lambda t: t.value)
        print(f"\nBester: Latenz {best.value:+.0f} gegen Basis {basis_lat:+} "
              f"({best.value - basis_lat:+.0f} Frames)")
        for k, v in sorted(best.params.items()):
            print(f"   {k:16s} {v}")
        print(f"\n{len(zulaessig)} von {len(study.trials)} Versuchen zulaessig")
    else:
        print("\nkein zulaessiger Versuch — jede Ziehung verlor einen Treffer oder erfand ein Phantom")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
