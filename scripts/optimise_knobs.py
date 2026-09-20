"""Latenz minimieren, ohne einen Treffer zu verlieren — Racing, dann Bestaetigung.

Ziel des Nutzers (2026-09-20): "Minimiere Latenz, kein Treffer darf verloren gehen." Beides sind
harte NEBENBEDINGUNGEN, keine Gewichte: ein Phantom oder ein verlorener Zug bricht den Versuch ab,
statt gegen gewonnene Frames aufgerechnet zu werden.

Zwei Stufen. GESUCHT wird auf fuenf Aufnahmen (20 572 Frames), BESTAETIGT auf allen zehn
(`--voll`). Racing sortiert dabei nach Aussieben je Sekunde, nicht nach Laenge — gemessen erledigt
`222741` sechs von sieben Fehlversuchen, und an siebter Stelle kostete ein Abbruch 37 072 Frames
statt 9 576. Der Suchraum kommt aus `scripts/screen_knobs.py`: 4 von 47 Knoepfen tragen die
Groessenordnung (`docs/knopf-screening.md`).

**Ein gescheiterter Versuch wird nicht geprunet, sondern schliesst ab.** Optunas Constrained-TPE
lernt die unzulaessige Region aus genau diesen Werten; ein `TrialPruned` wuerfe die teuerste
Information weg, die ein Abbruch liefert.
"""

from __future__ import annotations

import argparse
import logging
import re
import subprocess
import threading
import time
from pathlib import Path

import optuna

from chesslab.ioutil import append_rows, read_jsonl

ROOT = Path(__file__).resolve().parents[1]
BINARY = ROOT / "android/desktop/build/install/desktop/bin/desktop.bat"
DESKTOP = ROOT / "android/desktop"
OUT = ROOT / "tmp/batch/optimise-knobs"
TRIALS = OUT / "trials.jsonl"
#: Die visuellen Beobachtungen EINER Aufnahme, einmal gebaut und von allen Versuchen gelesen.
#: Gemessen 42,7 -> 12,5 s je Lauf (3,4x), 6 MB je Aufnahme. Der Kopf traegt Video, Modell und
#: eine Signatur ueber Geometrie, Quad und Ausrichtung — ein fremder Cache kann nicht still
#: gelesen werden. `docs/visual-cache-2026-09-20.md`.
VISUAL = OUT / "visual"

#: Racing sortiert nach AUSSIEBEN je Sekunde, nicht nach Laenge: `222741` erledigte 6 von 7
#: Fehlversuchen, stand aber an siebter Stelle — ein Abbruch kostete 37 072 statt 9 576 Frames.
#: Gesucht wird auf diesen fuenf (20 572 Frames), bestaetigt auf allen zehn (`--voll`).
RECORDINGS = ["VID_20260802_222741", "2026-08-08-11-55-19", "VID_20260727_233929",
              "VID_20260726_233432", "VID_20260824_153751"]
VOLL = RECORDINGS + ["VID_20260802_222203", "2026-08-07-13-52-38", "2026-08-08-00-39-57",
                     "VID_20260824_154327", "2026-08-08-11-59-12"]

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

#: So viele Kandidaten der Suche werden auf dem vollen Satz nachgefahren.
BESTAETIGEN = 3

#: Zwei Threads haengen sonst beim Anhaengen ineinander. Der Lauf selbst ist ein Unterprozess,
#: der das GIL freigibt — die Parallelitaet kostet also nichts ausser diesem Riegel.
SCHREIBEN = threading.Lock()

FOUND = re.compile(r"^\s{4}(\S+)\s+label frame\s+(\d+)\s+run frame\s+(\d+)\s+\((\w+)\)", re.M)
TALLY = re.compile(r"^  (invented|beyond) (\d+)", re.M)

#: Gezaehlt wird die EPISODE, nicht die abgelehnte Entscheidung. `replay-regression.ps1` zaehlt
#: `ALARM latched`-Zeilen, also Entscheidungen unter einem stehenden Latch — danach sah der
#: Champion mit 7 gegen 5 schlechter aus, waehrend er die Episoden von 15 auf 8 senkte.
ALARM = re.compile(r"board desynced")


def replay(rec: str, config: dict[str, float], tag: str) -> dict:
    """Ein Lauf auf einer Aufnahme. Gibt Treffer, Phantome und die Summe der Latenzen zurueck."""
    OUT.mkdir(parents=True, exist_ok=True)
    sets = [f"set:{k}={int(v) if k in GANZZAHLIG else v}" for k, v in config.items()]
    # `visualcache-partial`: der Beobachter sieht hoechstens jeden zweiten Frame, ein Cache ist
    # also nie lueckenlos — was fehlt, wird gerechnet statt zu werfen.
    cache = ["visualcache=" + str(VISUAL / f"{rec}.visual"), "visualcache-partial"]
    proc = subprocess.run(
        [str(BINARY), "replay", str(ROOT / f"data/recordings/{rec}/video.mp4"),
         "score", f"name={rec}", *cache, *sets],
        cwd=DESKTOP, capture_output=True, text=True, errors="replace", check=False)
    (OUT / f"{tag}--{rec}.log").write_text(proc.stdout, encoding="utf-8", newline="\n")
    plies = FOUND.findall(proc.stdout)
    tally = {k: int(v) for k, v in TALLY.findall(proc.stdout)}
    return {
        "found": len(plies),
        "invented": tally.get("invented", 0),
        "alarme": len(ALARM.findall(proc.stdout)),
        "latency": sum(int(run) - int(label) for _, label, run, _ in plies),
    }


def race(config: dict[str, float], base: dict[str, dict], tag: str,
         recs: list[str] | None = None) -> dict:
    """Aufnahme fuer Aufnahme, Abbruch beim ersten Verstoss — die Werte bleiben aber erhalten."""
    recs = recs or RECORDINGS
    latency, started = 0, time.time()
    # Der Vergleich laeuft gegen die Summe ueber ALLE Aufnahmen des Rennens: ein frueher Abbruch
    # ist nur dann richtig, wenn keine spaetere Aufnahme den Ueberschuss mehr einsparen kann.
    alarme, budget = 0, sum(base[r]["alarme"] for r in recs)
    for i, rec in enumerate(recs):
        run = replay(rec, config, tag)
        sec = round(time.time() - started, 1)
        if run["invented"] > base[rec]["invented"]:
            return {"status": "phantom", "at": rec, "nach": i + 1, "sec": sec,
                    "phantome": run["invented"] - base[rec]["invented"], "fehlt": 0, "latency": 0}
        if run["found"] < base[rec]["found"]:
            return {"status": "verlust", "at": rec, "nach": i + 1, "sec": sec,
                    "fehlt": base[rec]["found"] - run["found"], "phantome": 0, "latency": 0}
        alarme += run["alarme"]
        # Alarme sind ein BUDGET ueber den Satz, kein Veto je Aufnahme -- anders als Treffer.
        # Belegt am eigenen Champion: er holt sich eine Episode in 00-39-57 und spart acht in
        # 222203, netto 15 -> 8. Die Regel je Aufnahme haette ihn verworfen.
        if alarme > budget:
            return {"status": "alarm", "at": rec, "nach": i + 1, "sec": sec, "fehlt": 0,
                    "phantome": 0, "latency": 0, "extra_alarme": alarme - budget}
        latency += run["latency"]
    return {"status": "ok", "latency": latency, "nach": len(recs), "fehlt": 0, "phantome": 0,
            "extra_alarme": 0, "sec": round(time.time() - started, 1)}


#: Die Netze, die der Regressionssatz NICHT misst: er lieferte 396/3/0/171 mit UND ohne
#: Verdeckungsschutz. Latenz gewinnt man, indem man Tore aufmacht — also braucht die Freigabe eine
#: eigene Achse dafuer. `desktop fuzz check` kostet Sekunden, ein Replay Minuten.
WACHEN = ("veto:shadow", "veto:occlusion")

#: Einmal je Lauf unter den Vorgabewerten gemessen; nur eine Wache, die HIER feuert, kann
#: spaeter entwaffnet werden. Gesetzt in `main`, damit der Import nichts startet.
WACHEN_BASIS: dict[str, int] = {}


def wachen(config: dict[str, float]) -> dict[str, int]:
    """Feuern die Vetos unter dieser Konfiguration noch? Synthetisch, ohne Aufnahme."""
    # OHNE `set:` — das Verb nimmt blanke `<knopf>=<wert>`. Mit Praefix hiess der Knopf
    # `set:motionThr`, und der Katalog warf; die Basispruefung uebergibt keinen und lief durch.
    words = [f"{k}={v}" for k, v in config.items()]
    proc = subprocess.run([str(BINARY), "fuzz", "check", *words], cwd=DESKTOP,
                          capture_output=True, text=True, errors="replace", check=False)
    letzte = [z for z in proc.stdout.splitlines() if "veto:" in z]
    if not letzte:
        # Der .bat-Rahmen verschluckt den Exit-Code einer geworfenen Ausnahme, also traegt die
        # Meldung stderr mit: sonst steht hier eine leere Zeile und niemand weiss, warum.
        raise RuntimeError(f"fuzz check lieferte keine Achsen (rc={proc.returncode}): "
                           f"{proc.stdout[-200:]} | {proc.stderr[-400:]}")
    return {t.split("=")[0]: int(t.split("=")[1]) for t in letzte[-1].split()}


def entwaffnet(config: dict[str, float], basis: dict[str, int]) -> list[str]:
    """Welche Wache feuert unter der Basis, aber nicht mehr hier? Das ist ein stiller Rueckschritt."""
    jetzt = wachen(config)
    return [a for a in WACHEN if basis.get(a, 0) > 0 and jetzt.get(a, 0) == 0]


def constraints(trial: optuna.trial.FrozenTrial) -> tuple[float, float, float]:
    """<= 0 heisst zulaessig. Alle vier sind HART: kein verlorener Treffer, kein Phantom,
    kein entwaffnetes Veto, kein zusaetzlicher Alarm."""
    return (trial.user_attrs.get("fehlende_treffer", 0.0),
            trial.user_attrs.get("phantome", 0.0),
            trial.user_attrs.get("entwaffnet", 0.0),
            trial.user_attrs.get("extra_alarme", 0.0))


def objective(trial: optuna.Trial, base: dict[str, dict], strafe: float) -> float:
    config = {
        name: (trial.suggest_int(name, int(lo), int(hi)) if name in GANZZAHLIG
               else round(trial.suggest_float(name, lo, hi), 4))
        for name, (lo, hi) in SPACE.items()
    }
    # VOR dem Racing: eine entwaffnete Wache spart fuenf Replays und ist ohnehin unzulaessig.
    tot = entwaffnet(config, WACHEN_BASIS)
    if tot:
        row = {"status": "entwaffnet", "at": ",".join(tot), "nach": 0, "sec": 0.0,
               "fehlt": 0, "phantome": 0, "latency": 0}
    else:
        row = race(config, base, f"t{trial.number:03d}")
    trial.set_user_attr("entwaffnet", float(len(tot)))
    trial.set_user_attr("fehlende_treffer", float(row.get("fehlt", 0)))
    trial.set_user_attr("phantome", float(row.get("phantome", 0)))
    trial.set_user_attr("extra_alarme", float(row.get("extra_alarme", 0)))
    trial.set_user_attr("nach", row["nach"])
    trial.set_user_attr("status", row["status"])
    with SCHREIBEN:
        append_rows(TRIALS, [{"kind": "suche", "tag": f"t{trial.number:03d}",
                             "config": config, **row}])
    return row["latency"] if row["status"] == "ok" else strafe


def bestaetige(done: list[dict], base: dict[str, dict]) -> int:
    """Die besten Kandidaten der Suche auf ALLEN zehn Aufnahmen nachfahren.

    Die Suche laeuft auf fuenf, weil das viermal billiger ist; ob ein Gewinn dort auch auf den
    anderen fuenf traegt, ist eine eigene Frage und keine Rechnung.
    """
    fehlt = [r for r in VOLL if r not in base]
    if fehlt:
        print(f"Basis fehlt fuer {fehlt} — erst ohne --voll laufen lassen")
        return 1
    ok = sorted((r for r in done if r.get("kind") == "suche" and r["status"] == "ok"),
                key=lambda r: r["latency"])[:BESTAETIGEN]
    if not ok:
        print("kein zulaessiger Kandidat aus der Suche")
        return 1
    basis = sum(base[r]["latency"] for r in VOLL)
    print(f"Basis ueber alle zehn: {basis:+} Frames\n")
    for i, kand in enumerate(ok):
        row = race(kand["config"], base, f"voll{i:02d}", recs=VOLL)
        append_rows(TRIALS, [{"kind": "bestaetigung", "config": kand["config"],
                              "such_latenz": kand["latency"], **row}])
        wert = f"{row['latency']:+} ({row['latency'] - basis:+} gegen Basis)" \
            if row["status"] == "ok" else row["status"]
        print(f"  Kandidat {i} (Suche {kand['latency']:+}): {wert} · {row['sec']}s", flush=True)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--trials", type=int, default=60)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--jobs", type=int, default=3, help="Versuche gleichzeitig")
    ap.add_argument("--voll", action="store_true",
                    help="die besten Kandidaten auf ALLEN zehn Aufnahmen bestaetigen")
    args = ap.parse_args()

    done = list(read_jsonl(TRIALS)) if TRIALS.exists() else []
    # Eine Basiszeile von VOR der Alarm-Bedingung traegt keine Alarmzahl. Sie stehen zu lassen
    # haette die Bedingung lautlos abgeschaltet — also fallen sie raus und werden neu gemessen.
    base = {r["rec"]: r for r in done if r.get("kind") == "basis" and "alarme" in r}
    # NACHEINANDER, vor den parallelen Versuchen: zwei Prozesse, die denselben Cache gleichzeitig
    # anlegen, streiten sich um dieselbe `.partial`-Datei.
    VISUAL.mkdir(parents=True, exist_ok=True)
    for rec in (VOLL if args.voll else RECORDINGS):
        if not (VISUAL / f"{rec}.visual").exists():
            t0 = time.time()
            replay(rec, {}, "CACHE")
            print(f"  visueller Cache {rec}: {time.time() - t0:.0f}s", flush=True)
    if args.voll:
        return bestaetige(done, base)
    if len(base) < len(RECORDINGS):
        print("Basis fehlt — einmal mit Vorgabewerten", flush=True)
        OUT.mkdir(parents=True, exist_ok=True)
        for rec in RECORDINGS:
            if rec in base:
                continue
            row = {"kind": "basis", "rec": rec, **replay(rec, {}, "BASIS")}
            append_rows(TRIALS, [row])
            base[rec] = row
            print(f"   {rec:22s} found={row['found']} inv={row['invented']} "
                  f"lat={row['latency']:+}", flush=True)
    # NUR ueber die Suchaufnahmen: `base` traegt auch die fuenf, die erst `--voll` braucht, und
    # ein Massstab aus zehn Aufnahmen gegen ein Ergebnis aus fuenf waere schlicht falsch.
    WACHEN_BASIS.update(wachen({}))
    print("Wachen unter Vorgabe: "
          + " ".join(f"{a}={WACHEN_BASIS.get(a, 0)}" for a in WACHEN), flush=True)
    basis_lat = sum(base[r]["latency"] for r in RECORDINGS)
    treffer = sum(base[r]["found"] for r in RECORDINGS)
    print(f"\nBasis: {treffer} Treffer, Latenz {basis_lat:+} Frames", flush=True)

    optuna.logging.set_verbosity(logging.WARNING)
    study = optuna.create_study(
        direction="minimize",
        sampler=optuna.samplers.TPESampler(seed=args.seed, constraints_func=constraints),
        storage=f"sqlite:///{(OUT / 'study.db').as_posix()}",
        # Der Name traegt die BEDINGUNGEN mit, nicht nur den Aufnahmesatz: ein Versuch, der unter
        # zwei Bedingungen zulaessig hiess, sagt unter vier nichts — er wurde auf Wachen und Alarme
        # nie geprueft. Ihn als zulaessig zurueckzuspielen wuerde TPE genau dorthin ziehen.
        study_name="latenz5-w4", load_if_exists=True,
    )
    # Unzulaessige Versuche brauchen EINEN Zielwert. Die Strafe liegt weit ueber jedem echten
    # Ergebnis, damit sie die Verteilung nicht verzerrt — entschieden wird ueber `constraints`.
    strafe = abs(basis_lat) * 10 + 100_000.0
    # Warmstart: die zulaessigen Konfigurationen des Zehn-Satz-Laufs sind teuer erkauft und
    # bleiben als Startpunkte gueltig, auch wenn ihre Zielwerte es nicht sind.
    if not study.trials:
        # Die ganze Geschichte zurueckspielen, nicht nur die Besten: TPE lernt aus den
        # GESCHEITERTEN mit, und `trials.jsonl` haelt sie alle. Ein geleerter Studienspeicher
        # kostet damit nichts ausser dem Zurueckspielen.
        # NUR Zeilen, die unter allen vier Bedingungen gemessen wurden. Aeltere fehlen bewusst:
        # ihre Zulaessigkeit ist unbekannt, und "unbekannt als zulaessig" ist der teuerste Irrtum.
        alt = [x for x in done if x.get("kind") == "suche" and "config" in x
               and "extra_alarme" in x]
        for r in alt:
            study.add_trial(
                optuna.trial.create_trial(
                    params=r["config"],
                    distributions={
                        n: (optuna.distributions.IntDistribution(int(lo), int(hi)) if n in GANZZAHLIG
                            else optuna.distributions.FloatDistribution(lo, hi))
                        for n, (lo, hi) in SPACE.items()
                    },
                    value=r["latency"] if r["status"] == "ok" else strafe,
                    user_attrs={"fehlende_treffer": float(r.get("fehlt", 0)),
                                "phantome": float(r.get("phantome", 0)),
                                "entwaffnet": float(r.get("entwaffnet", 0)),
                                "extra_alarme": float(r.get("extra_alarme", 0)),
                                "nach": r.get("nach", 0), "status": r["status"]},
                    system_attrs={"constraints": [float(r.get("fehlt", 0)),
                                                  float(r.get("phantome", 0)),
                                                  float(r.get("entwaffnet", 0)),
                                                  float(r.get("extra_alarme", 0))]},
                ),
            )
        if alt:
            print(f"{len(alt)} fruehere Versuche zurueckgespielt", flush=True)
    offen = args.trials - len([t for t in study.trials if t.state.is_finished()])
    if offen > 0:
        study.optimize(lambda tr: objective(tr, base, strafe), n_trials=offen,
                       n_jobs=args.jobs,
                       callbacks=[lambda _study, tr: print(
                           f"  [{tr.number:>3}] {tr.user_attrs.get('status','?'):<8s} "
                           f"nach {tr.user_attrs.get('nach','?')}/{len(RECORDINGS)} "
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
