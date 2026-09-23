"""Zwei Regressionslaeufe gegeneinander — Bewertung UND Alarm-Episoden.

    uv run python scripts/compare_regression.py champ-default baseline-aus

`replay-regression.ps1` druckt seine Tabelle nur einmal auf die Konsole; wer zwei Laeufe
vergleicht, hat sie danach nicht mehr. Hier wird aus den Logs gelesen, die bleiben.

**Die Alarmspalte des Skripts ist nicht die Episodenzahl.** Sie zaehlt `ALARM latched`-Zeilen,
also abgelehnte ENTSCHEIDUNGEN unter einem stehenden Latch. Der Champion sah danach mit 7 gegen 5
schlechter aus, waehrend seine Episoden von 15 auf 8 fielen. Beide Spalten stehen deshalb hier,
und `desync` ist die, die zaehlt (`docs/regression-reference.md`).
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

MUSTER = {
    "found": re.compile(r"found (\d+):"),
    "missed": re.compile(r"missed (\d+)"),
    "invented": re.compile(r"invented (\d+)"),
    "beyond": re.compile(r"beyond (\d+)"),
}


def lies(log: Path) -> dict[str, int | None]:
    """Die Zahlen des Laufs -- `None`, wo er keine geschrieben hat.

    Die `-1`, die hier vorher stand, war als Merkzeichen gedacht und lief danach ungeprueft in
    die Summe: zwei abgestuerzte Laeufe verglichen sich als (-1, -1) und gingen ohne Marke als
    unveraendert durch. `None` kann das nicht.
    """
    text = log.read_text(encoding="utf-8", errors="replace")
    out: dict[str, int | None] = {}
    for name, muster in MUSTER.items():
        treffer = muster.search(text)
        out[name] = int(treffer.group(1)) if treffer else None
    out["latched"] = len(re.findall(r"ALARM latched", text))
    out["desync"] = len(re.findall(r"board desynced", text))
    return out


def vollstaendig(zeile: dict[str, int | None]) -> bool:
    return all(zeile[k] is not None for k in MUSTER)


def satz(tag: str) -> dict[str, dict[str, int | None]]:
    d = ROOT / "tmp" / "batch" / tag
    return {p.stem: lies(p) for p in sorted(d.glob("*.log")) if not p.name.endswith(".err")}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("vorher")
    ap.add_argument("nachher")
    args = ap.parse_args()

    a, b = satz(args.vorher), satz(args.nachher)
    gemeinsam = sorted(set(a) & set(b))
    if not gemeinsam:
        print(f"keine gemeinsamen Aufnahmen in {args.vorher} und {args.nachher}")
        return 1
    for tag, s in ((args.vorher, a), (args.nachher, b)):
        fehlt = sorted(set(s) - set(gemeinsam))
        if fehlt:
            print(f"! nur in {tag}: {', '.join(fehlt)}")

    print(f"{'Aufnahme':22s} {'found':>13s} {'missed':>9s} {'inv':>7s} {'desync':>11s}")
    summe = {k: [0, 0] for k in ("found", "missed", "invented", "desync", "latched")}
    gewertet, blind = 0, []
    for rec in gemeinsam:
        x, y = a[rec], b[rec]
        if not (vollstaendig(x) and vollstaendig(y)):
            blind.append(rec)
            print(f"{rec:22s} {'unvollstaendig -- keine Bewertungszeile im Log':>45s}")
            continue
        gewertet += 1
        for k in summe:
            summe[k][0] += x[k]
            summe[k][1] += y[k]
        marke = "" if (x["found"], x["invented"]) == (y["found"], y["invented"]) else "  <--"
        print(f"{rec:22s} {x['found']:5d} -> {y['found']:<5d} {x['missed']:3d} -> {y['missed']:<3d} "
              f"{x['invented']:2d} -> {y['invented']:<2d} {x['desync']:4d} -> {y['desync']:<4d}{marke}")

    print()
    if not gewertet:
        print(f"keine Aufnahme bewertbar ({len(blind)} unvollstaendig) -- nichts gemessen")
        return 1
    for k in ("found", "missed", "invented", "desync", "latched"):
        vor, nach = summe[k]
        print(f"{k:10s} {vor:5d} -> {nach:<5d} ({nach - vor:+d})")
    print(f"\nSumme ueber {gewertet} von {len(gemeinsam)} gemeinsamen Aufnahmen"
          + (f"; unvollstaendig und AUSGELASSEN: {', '.join(blind)}" if blind else ""))
    return 1 if blind else 0


if __name__ == "__main__":
    raise SystemExit(main())
