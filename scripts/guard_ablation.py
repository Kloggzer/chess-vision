"""Welche Wache merkt der Regressionssatz — und welche nicht?

    uv run python scripts/guard_ablation.py

Liest die Ergebnisse von `scripts/guard_ablation.ps1` und stellt sie gegen den Bezugslauf. Eine
Wache, deren Abschalten NICHTS bewegt, ist von diesem Satz nicht abgedeckt: sie mag im Betrieb
tragen, als Freigabe-Argument taugt der Satz fuer sie nicht.

Der erste so gemessene Fall war `baselineOcclusion` — beide engine-eigenen Verdeckungsarme aus,
396/3/0 Ziffer fuer Ziffer wie mit, auf allen zehn Aufnahmen
(`docs/regression-reference.md`).
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
}


def summe(tag: str) -> dict | None:
    """Die Summe des Laufs, und unter `stems`, WORUEBER sie laeuft: ein Delta gegen einen anderen
    Satz ist keine Wirkung der Wache.
    """
    d = ROOT / "tmp" / "batch" / tag
    logs = [p for p in sorted(d.glob("*.log")) if not p.name.endswith(".err")]
    if not logs:
        return None
    out = dict.fromkeys(MUSTER, 0)
    out["desync"] = 0
    out["aufnahmen"] = len(logs)
    out["stems"] = frozenset(p.stem for p in logs)
    for log in logs:
        text = log.read_text(encoding="utf-8", errors="replace")
        for name, muster in MUSTER.items():
            treffer = muster.search(text)
            # Fehlt die Zahl, ist der Lauf abgebrochen; das darf nicht als 0 erscheinen.
            if treffer is None:
                return None
            out[name] += int(treffer.group(1))
        out["desync"] += len(re.findall(r"board desynced", text))
    return out


def befund(delta: dict[str, int]) -> str:
    """Eine bewegte Episode ist kein Nachweis wie eine bewegte Entscheidung."""
    if all(v == 0 for v in delta.values()):
        return "der Satz merkt NICHTS"
    if all(delta[k] == 0 for k in ("found", "missed", "invented")):
        return f"nur Episoden ({delta['desync']:+d}), keine Entscheidung"
    return "gedeckt"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--bezug", default="baseline-an")
    ap.add_argument("--praefix", default="abl")
    args = ap.parse_args()

    basis = summe(args.bezug)
    if basis is None:
        print(f"Bezugslauf '{args.bezug}' fehlt oder ist unvollstaendig")
        return 1
    print(f"Bezug '{args.bezug}': {basis['found']}/{basis['missed']}/{basis['invented']}, "
          f"{basis['desync']} Desync, {basis['aufnahmen']} Aufnahmen\n")

    zeilen = []
    for d in sorted((ROOT / "tmp" / "batch").glob(f"{args.praefix}-*")):
        wache = d.name[len(args.praefix) + 1:]
        s = summe(d.name)
        if s is None or s["stems"] != basis["stems"]:
            zeilen.append((wache, None if s is None else "satz"))
            continue
        delta = {k: s[k] - basis[k] for k in ("found", "missed", "invented", "desync")}
        zeilen.append((wache, delta))

    if not zeilen:
        print(f"keine Laeufe '{args.praefix}-*' gefunden")
        return 1

    print(f"{'Wache':24s} {'found':>7s} {'missed':>7s} {'inv':>5s} {'desync':>7s}  Befund")
    for wache, delta in zeilen:
        if not isinstance(delta, dict):
            grund = "anderer Aufnahmesatz als der Bezug" if delta == "satz" else "unvollstaendig"
            print(f"{wache:24s} {'-':>7s} {'-':>7s} {'-':>5s} {'-':>7s}  {grund}")
            continue
        print(f"{wache:24s} {delta['found']:+7d} {delta['missed']:+7d} {delta['invented']:+5d} "
              f"{delta['desync']:+7d}  {befund(delta)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
