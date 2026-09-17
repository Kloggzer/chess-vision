"""Wie viel Trainingsmaterial haengt an einer Matte, die niemand geprueft hat?

Ergaenzt `move_timing_audit.py`: dort geht es um den ZEITPUNKT des Zuges, hier um die Verdeckung
selbst. "Geflaggt" ist kein Verdacht - ein Frame mit Hand hat 50+ einwandfreie Felder. Verdacht
sind diese vier Lagen, jeweils nach Abzug dessen, was ein Mensch bestaetigt hat:

  blind    Frame gemeldet, aber NICHT gemessen (`coverage is None`, SAMs Absage). Ohne Matte
           liest JEDE Zelle 0.0 und ist von einer freien nicht zu unterscheiden
           (CLAUDE.md, "Coverage Matte Trap").
  saum     0 < coverage <= PIECE_VISIBLE_MAX: die Matte sieht etwas, der Verlust lernt trotzdem.
  nachbar  coverage 0, aber orthogonal neben einer Zelle ueber HAND_BODY - der Rand der Hand.
  spaet    dirty_reason `stale`/`changed`: die Stellung passt womoeglich nicht mehr zum FEN.

    uv run python scripts/hand_audit.py --dataset real13-mix-v7-128 --split train
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

from chesslab.training.occlusion import PIECE_VISIBLE_MAX

REC = Path("data/recordings")

#: Ab hier ist die Zelle Handkoerper, nicht Saum - ihre Nachbarn sind die verdaechtigen.
HAND_BODY = 0.5


def neighbours(square: str) -> list[str]:
    file_, rank = ord(square[0]) - 97, int(square[1]) - 1
    out = []
    for df, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        f, r = file_ + df, rank + dr
        if 0 <= f < 8 and 0 <= r < 8:
            out.append(f"{chr(97 + f)}{r + 1}")
    return out


def _jsonl(path: Path):
    if not path.exists():
        return
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def session_facts(sid: str) -> dict:
    """Was die Aufnahme ueber ihre Frames sagt: Matte, Schmutz-Ablage, menschliche Sichtung."""
    rec = REC / sid.removeprefix("rg-")
    matte = {Path(str(r["frame"])).stem: r for r in _jsonl(rec / "matte.jsonl")}
    dirty = {f.stem for f in (rec / "dirty").iterdir()} if (rec / "dirty").is_dir() else set()
    human: set[tuple[str, str]] = set()
    for name in ("reviewed.jsonl", "corrections.jsonl"):
        for r in _jsonl(rec / name):
            human.add((Path(str(r["frame"])).stem, str(r["square"])))
    return {"matte": matte, "dirty": dirty, "human": human}


def classify(row: dict | None, reason: str, cov: float, square: str) -> str | None:
    """Welche der vier Lagen - oder `None`, wenn die Zelle unverdaechtig ist."""
    cells = (row or {}).get("coverage") or {}
    # `concepts` leer heisst GEMESSEN, nichts gefunden — 684 Zeilen mit Schmutzgrund tragen das
    # im Korpus und galten geschlossen als blind. Ungemessen ist allein `coverage is None`
    # (SAMs Absage, CLAUDE.md „SAMs ABSAGE ist kein sauberes Brett").
    if row is None or row.get("coverage") is None:
        return "blind"
    if cov > 0.0:
        return "saum"
    if any(float(cells.get(n, 0.0)) > HAND_BODY for n in neighbours(square)):
        return "nachbar"
    return "spaet" if reason in ("stale", "changed") else None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dataset", default="real13-mix-v7-128")
    ap.add_argument("--split", default="train")
    ap.add_argument("--split-file", default="split-pin.json")
    args = ap.parse_args()

    from chesslab.dataset_build import dataset_dir

    dd = dataset_dir(args.dataset)
    split = json.loads((dd / args.split_file).read_text(encoding="utf-8"))
    # Nur Aufnahmen mit Verzeichnis koennen eine Hand tragen: ein Komposit hat kein Brett.
    want = {s for s in split["splits"][args.split] if (REC / s.removeprefix("rg-")).is_dir()}
    facts = {s: session_facts(s) for s in want}
    print(f"{args.dataset}/{args.split}: {len(want)} Aufnahmen mit Verzeichnis")

    per: dict[str, Counter] = defaultdict(Counter)
    reasons: Counter = Counter()
    with (dd / "manifest.jsonl").open(encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            sid = r["session_id"]
            if sid not in facts:
                continue
            per[sid]["train"] += 1
            f, sq = str(r["frame"]), str(r["square"])
            fx = facts[sid]
            row = fx["matte"].get(f)
            reason = (row or {}).get("dirty_reason") or ("abgelegt" if f in fx["dirty"] else None)
            if reason is None:
                continue
            cov = float(r.get("coverage") or 0.0)
            if cov > PIECE_VISIBLE_MAX:
                per[sid]["maskiert"] += 1
                continue
            lage = classify(row, reason, cov, sq)
            if lage is None:
                per[sid]["klar"] += 1
                continue
            if (f, sq) in fx["human"]:
                per[sid]["gesichtet"] += 1
                continue
            per[sid]["RISIKO"] += 1
            per[sid][lage] += 1
            reasons[f"{lage} ({reason})"] += 1

    tot = Counter()
    for c in per.values():
        tot.update(c)
    cols = ("train", "maskiert", "gesichtet", "RISIKO", "blind", "saum", "nachbar", "spaet")
    print("\n" + f"{'Aufnahme':32s}" + "".join(f"{c:>10s}" for c in cols))
    for sid, c in sorted(per.items(), key=lambda kv: -kv[1]["RISIKO"]):
        print(f"{sid:32s}" + "".join(f"{c[k]:10d}" for k in cols))
    print(f"{'GESAMT':32s}" + "".join(f"{tot[k]:10d}" for k in cols))
    share = 100.0 * tot["RISIKO"] / max(1, tot["train"])
    print(f"\nungeprueft und unmaskiert: {tot['RISIKO']} von {tot['train']} ({share:.3f} %)")
    for k, v in reasons.most_common(10):
        print(f"   {v:7d}  {k}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
