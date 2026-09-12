"""Unsicherheit eines gepaarten Armvergleichs — gezogen ueber die Einheit, die unabhaengig ist.

Phase 3.2 des 99-%-Plans verlangt den Bootstrap ueber AUFNAHMEGRUPPEN, nicht ueber Crops:
benachbarte Frames derselben Verweil-Episode sind kein zweiter Beleg. Traegt der Auswertungssatz
nur eine Gruppe, ist die Gruppenziehung nicht definiert; dann zieht dieses Skript ueber EPISODEN
und sagt das laut. Es rechnet nie ueber Zellen.

    uv run python scripts/group_bootstrap.py --a rot --b p4a --seeds 42,43,44,45,46,47,48
"""

from __future__ import annotations

import argparse
import json
import random
import re
import statistics as st
from pathlib import Path

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
    return [json.loads(line) for line in p.open(encoding="utf-8") if line.strip()]


def episode_acc(eps: list[dict]) -> float:
    return sum(1 for e in eps if e["errors"] == 0) / len(eps) if eps else 0.0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--a", default="rot", help="Arm, der gewinnen soll.")
    ap.add_argument("--b", default="p4a", help="Kontrolle.")
    ap.add_argument("--seeds", default="42,43,44,45,46,47,48")
    ap.add_argument("--draws", type=int, default=10000)
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

    def acc(eps: list[dict], pick: list[int]) -> float:
        hit = sum(1 for i in pick if eps[i]["errors"] == 0)
        return hit / len(pick) if pick else 0.0

    obs = st.mean([episode_acc(a[s]) for s in seeds]) - st.mean([episode_acc(b[s]) for s in seeds])
    rng = random.Random(args.seed)
    diffs = []
    for _ in range(args.draws):
        pick = [i for _ in units for i in rng.choice(units)]
        diffs.append(st.mean([acc(a[s], pick) for s in seeds])
                     - st.mean([acc(b[s], pick) for s in seeds]))
    diffs.sort()
    lo, hi = diffs[int(0.025 * len(diffs))], diffs[int(0.975 * len(diffs)) - 1]
    worse = sum(1 for d in diffs if d <= 0) / len(diffs)

    print(f"\nEpisodengenauigkeit {args.a}: " +
          "  ".join(f"{episode_acc(a[s]):.4f}" for s in seeds))
    print(f"Episodengenauigkeit {args.b}: " +
          "  ".join(f"{episode_acc(b[s]):.4f}" for s in seeds))
    print(f"\nbeobachteter Abstand {obs:+.4f}")
    print(f"95-%-Intervall ueber {len(units)} {unit}n, {args.draws} Ziehungen: "
          f"[{lo:+.4f}, {hi:+.4f}]")
    print(f"Anteil der Ziehungen mit Abstand <= 0: {worse:.4f}")

    out = Path(args.json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"a": args.a, "b": args.b, "seeds": seeds, "unit": unit,
                               "units": len(units), "groups": len(groups),
                               "episodes": len(keys), "draws": args.draws,
                               "observed": obs, "ci95": [lo, hi], "share_le_zero": worse},
                              indent=1), encoding="utf-8")
    print(f"[OK] {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
