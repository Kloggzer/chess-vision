"""Welche Aufnahmen schon als Test ausgewertet wurden — und welche unberuehrt bleiben muss.

Phase 0.5 des 99-%-Plans: ein Test-Split, der schon Architekturentscheidungen getragen hat, ist
kein Test mehr. Das laesst sich mechanisch feststellen, weil jeder `chesslab eval --split test`
ein `eval_test*.json` mit `per_session` hinterlaesst.

    python scripts/test_used.py            # data/TEST-USED.json neu schreiben
    python scripts/test_used.py --check rg-2026-09-11-20-00-52
"""

from __future__ import annotations

import argparse
import collections
import json
from pathlib import Path

OUT = Path("data/TEST-USED.json")

#: Die Gruppe, die bis zur Abnahme niemand anfassen darf. Genau EINE Auswertung ist vorgesehen,
#: nach festgelegtem Checkpoint — danach ist auch sie verbrannt.
FROZEN = ["rg-2026-09-11-20-00-52"]


def burned(models: Path = Path("data/models")) -> dict[str, int]:
    """session_id -> wie oft sie in einem `eval_test*.json` als Testmaterial auftaucht."""
    seen: collections.Counter[str] = collections.Counter()
    for p in models.rglob("eval_test*.json"):
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        seen.update((d.get("per_session") or {}).keys())
    return dict(seen.most_common())


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", metavar="SESSION", help="Exit 1, wenn diese Aufnahme verbrannt ist.")
    args = ap.parse_args()

    used = burned()
    if args.check:
        n = used.get(args.check, 0)
        print(f"{args.check}: {n}x als Test ausgewertet" if n else f"{args.check}: unberuehrt")
        return 1 if n else 0

    payload = {"burned": used, "frozen": FROZEN,
               "note": "Eine Aufnahme in `burned` hat schon Entscheidungen getragen und ist als "
                       "Test wertlos. `frozen` wird genau einmal ausgewertet, nach Phase 3.",
               "evals_scanned": sum(1 for _ in Path("data/models").rglob("eval_test*.json"))}
    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False), encoding="utf-8")
    still = [s for s in FROZEN if s in used]
    print(f"[OK] {OUT}: {len(used)} verbrannte Aufnahmen aus {payload['evals_scanned']} Evals")
    if still:
        print(f"[WARN] eingefroren, aber schon benutzt: {', '.join(still)}")
    return 1 if still else 0


if __name__ == "__main__":
    raise SystemExit(main())
