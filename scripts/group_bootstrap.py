"""Unsicherheit eines gepaarten Armvergleichs — gezogen ueber die Einheit, die unabhaengig ist.

Phase 3.2 des 99-%-Plans verlangt den Bootstrap ueber AUFNAHMEGRUPPEN, nicht ueber Crops:
benachbarte Frames derselben Verweil-Episode sind kein zweiter Beleg. Traegt der Auswertungssatz
nur eine Gruppe, ist die Gruppenziehung nicht definiert; dann zieht dieses Skript ueber EPISODEN
und sagt das laut. Es rechnet nie ueber Zellen.

    uv run python scripts/group_bootstrap.py --a rot --b p4a --seeds 42,43,44,45,46,47,48
"""

from __future__ import annotations

import argparse
import re
import statistics as st
from pathlib import Path

import numpy as np

from chesslab.ioutil import read_jsonl, write_json

DUMPS = Path("data/reports/episodes")
#: `rg-2026-09-06-20-27-33` und `rg-VID_20260906_202733` sind derselbe Aufnahmetag. Abgeleitete
#: Kompositen tragen die Quelle im Namen und gehoeren zur Gruppe ihrer Quelle.
DATE = re.compile(r"(\d{4})-?(\d{2})-?(\d{2})")


def group_of(session_id: str) -> str:
    m = DATE.search(session_id.replace("VID_", ""))
    return "-".join(m.groups()) if m else session_id


def load(arm: str, seed: int) -> list[dict]:
    p = DUMPS / f"{arm}-s{seed}.jsonl"
    if not p.is_file():
        raise SystemExit(f"fehlt: {p} — erst `scripts/episode_eval.py --dump` laufen lassen")
    return read_jsonl(p)


def episode_acc(eps: list[dict]) -> float:
    return sum(1 for e in eps if e["errors"] == 0) / len(eps) if eps else 0.0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--a", default="rot", help="Arm, der gewinnen soll.")
    ap.add_argument("--b", default="p4a", help="Kontrolle.")
    ap.add_argument("--seeds", default="42,43,44,45,46,47,48")
    ap.add_argument("--drop-squares", default="", help="Diese Felder auslassen (kommagetrennt).")
    ap.add_argument("--draws", type=int, default=1_000_000)
    ap.add_argument("--seed", type=int, default=0, help="Zufallsstartwert der Ziehung.")
    ap.add_argument("--json", default="data/reports/group-bootstrap.json")
    args = ap.parse_args()

    seeds = [int(s) for s in args.seeds.split(",") if s.strip()]
    a = {s: load(args.a, s) for s in seeds}
    b = {s: load(args.b, s) for s in seeds}

    keys = [(e["session_id"], e["square"], e["ply"]) for e in a[seeds[0]]]
    for arm in (a, b):
        for s, eps in arm.items():
            got = [(e["session_id"], e["square"], e["ply"]) for e in eps]
            if got != keys:
                raise SystemExit(f"Seed {s}: andere Episoden als die Referenz — nicht paarbar")

    drop = {s.strip() for s in args.drop_squares.split(",") if s.strip()}
    if drop:
        live = [i for i, e in enumerate(a[seeds[0]]) if e["square"] not in drop]
        keys = [keys[i] for i in live]
        a = {s: [eps[i] for i in live] for s, eps in a.items()}
        b = {s: [eps[i] for i in live] for s, eps in b.items()}
        print(f"ohne {sorted(drop)}: {len(keys)} Episoden")
    groups = sorted({group_of(k[0]) for k in keys})
    by_unit: dict[str, list[int]] = {}
    unit = "Aufnahmegruppe" if len(groups) > 1 else "Episode"
    for i, k in enumerate(keys):
        by_unit.setdefault(group_of(k[0]) if len(groups) > 1 else str(i), []).append(i)
    units = list(by_unit.values())

    print(f"{args.a} gegen {args.b}, {len(seeds)} Seeds, {len(keys)} Episoden, "
          f"{len(groups)} Aufnahmegruppe(n)")
    if len(groups) == 1:
        print("!! Der Auswertungssatz traegt EINE Aufnahmegruppe. Die Gruppenziehung von 3.2 ist\n"
              "   darauf nicht definiert; gezogen wird ueber Episoden. Das misst die Streuung\n"
              "   INNERHALB dieser Aufnahme, nicht die zwischen Aufnahmen — die braucht Folds\n"
              "   (3.3) oder die Testgruppe.")

    # Vektorisiert: eine Ziehung ist ein Multinomialvektor ueber die Einheiten, die Genauigkeit je
    # Seed danach ein Matrixprodukt. Erst das macht Millionen Ziehungen bezahlbar. Die Seeds werden
    # MITGEZOGEN — sonst stuende ihre Streuung ueberhaupt nicht im Intervall.
    ok_a = np.array([[e["errors"] == 0 for e in a[s]] for s in seeds], dtype=np.float64)
    ok_b = np.array([[e["errors"] == 0 for e in b[s]] for s in seeds], dtype=np.float64)
    weight = np.zeros((len(units), len(keys)))
    for u, members in enumerate(units):
        weight[u, members] = 1.0
    size = weight.sum(axis=1)

    obs = st.mean([episode_acc(a[s]) for s in seeds]) - st.mean([episode_acc(b[s]) for s in seeds])
    rng = np.random.default_rng(args.seed)
    parts, left = [], args.draws
    while left > 0:
        d = min(left, 50_000)
        left -= d
        mult = rng.multinomial(len(units), np.full(len(units), 1 / len(units)), size=d)
        cells = mult @ weight                                      # (d, Episoden): Vielfachheit
        n = mult @ size                                            # (d,): Episoden je Ziehung
        da = ((ok_a - ok_b) @ cells.T) / n                         # (Seeds, d)
        pick = rng.integers(0, len(seeds), size=(len(seeds), d))
        parts.append(np.take_along_axis(da, pick, axis=0).mean(axis=0))
    diffs = np.concatenate(parts)
    lo, hi = float(np.quantile(diffs, 0.025)), float(np.quantile(diffs, 0.975))
    worse = int((diffs <= 0).sum())

    print(f"\nEpisodengenauigkeit {args.a}: " +
          "  ".join(f"{episode_acc(a[s]):.4f}" for s in seeds))
    print(f"Episodengenauigkeit {args.b}: " +
          "  ".join(f"{episode_acc(b[s]):.4f}" for s in seeds))
    print(f"\nbeobachteter Abstand {obs:+.4f}")
    print(f"95-%-Intervall ueber {len(units)} {unit}n, {args.draws:_} Ziehungen: "
          f"[{lo:+.4f}, {hi:+.4f}]")
    # Die ANZAHL, nicht eine gerundete Quote: bei einer Million Ziehungen verschwinden zwei
    # Treffer hinter "0,0000". Und unter 1/Ziehungen loest ein Bootstrap ohnehin nicht auf.
    print(f"Ziehungen mit Abstand <= 0: {worse} von {args.draws:_}" +
          (f"  (p < {1 / args.draws:g})" if worse == 0 else f"  (p = {worse / args.draws:.3g})"))

    out = Path(args.json)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_json(out, {"a": args.a, "b": args.b, "seeds": seeds, "unit": unit,
                     "units": len(units), "groups": len(groups),
                     "episodes": len(keys), "draws": args.draws,
                     "observed": float(obs), "ci95": [lo, hi],
                     "draws_le_zero": worse,
                     "share_le_zero": worse / args.draws}, indent=1)
    print(f"[OK] {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
