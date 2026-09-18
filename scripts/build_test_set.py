"""Einen versionierten Testsatz bauen: `test-v1`, `test-v2`, ...

Ein Testsatz taugt nur, solange KEIN Modell sein Material im Training hatte. Von 24 Aufnahmen
des Korpus waren am 2026-09-18 genau zwei nie in einem Train-Split — der Rest ist verbraucht.
Deshalb prueft dieses Skript die Herkunft selbst und verweigert jede Aufnahme, die je in einem
`splits.train` stand, statt sich auf eine gepflegte Liste zu verlassen.

Alle Zeilen landen im TEST-Split; der Satz hat weder Train noch Val und kann darum nicht
versehentlich trainiert werden. Zusaetzlich wandern die Aufnahmen in `data/TEST-USED.json`
unter `frozen`, wo `chesslab eval` sie ohne `--burn-frozen` verweigert.

    uv run python scripts/build_test_set.py --name test-v1 --size 128
"""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

import yaml

from chesslab.ioutil import read_jsonl, write_json, write_rows

DATASETS = Path("data/datasets")
PACKS = Path("data/packs")
LEDGER = Path("data/TEST-USED.json")
CLASSES = ["empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK"]


def ever_trained() -> set[str]:
    """Jede Session, die je in einem `splits.train` stand — ueber ALLE Datensaetze und Folds."""
    seen: set[str] = set()
    for ds in DATASETS.iterdir():
        for split_file in ds.glob("split*.json"):
            try:
                doc = json.loads(split_file.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            seen.update(doc.get("splits", {}).get("train", []))
    return seen


def candidates(size: int) -> list[str]:
    trained = ever_trained()
    out = []
    for pack in sorted(PACKS.iterdir()):
        if not pack.is_dir() or not pack.name.endswith(f"-{size}"):
            continue
        session = pack.name[: -len(f"-{size}")]
        if session.startswith("rg-") and session not in trained:
            out.append(session)
    return out


def freeze(sessions: list[str]) -> list[str]:
    doc = json.loads(LEDGER.read_text(encoding="utf-8"))
    frozen = set(doc.get("frozen", []))
    fresh = [s for s in sessions if s not in frozen]
    doc["frozen"] = sorted(frozen | set(sessions))
    write_json(LEDGER, doc)
    return fresh


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--name", required=True, help="z.B. test-v1")
    ap.add_argument("--size", type=int, default=128)
    ap.add_argument("--sessions", default=None,
                    help="Komma-Liste statt Auto-Auswahl. Eine trainierte Aufnahme wird auch "
                         "hier abgelehnt — die Pruefung ist nicht abschaltbar.")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    trained = ever_trained()
    want = args.sessions.split(",") if args.sessions else candidates(args.size)
    dirty = [s for s in want if s in trained]
    if dirty:
        print(f"[FAIL] im Training gewesen, als Test wertlos: {', '.join(sorted(dirty))}")
        return 1
    if not want:
        print("[FAIL] keine unverbrauchte Aufnahme gefunden.")
        return 1

    rows: list[dict] = []
    for session in want:
        manifest = PACKS / f"{session}-{args.size}" / "manifest.jsonl"
        if not manifest.is_file():
            print(f"[FAIL] {manifest} fehlt")
            return 1
        part = read_jsonl(manifest)
        vis = sum(1 for r in part
                  if r.get("coverage") is not None
                  and r["coverage"] <= 0.15 and r["label"] != "empty")
        print(f"   {session}: {len(part)} Zeilen, {vis} sichtbar besetzt")
        rows.extend(part)

    print(f"\n{args.name}: {len(rows)} Zeilen aus {len(want)} Aufnahmen, alle im TEST")
    if args.dry_run:
        return 0

    out = DATASETS / f"real13-{args.name}-{args.size}"
    out.mkdir(parents=True, exist_ok=True)
    write_rows(out / "manifest.jsonl", rows)
    write_json(out / "split.json", {
        "seed": 42, "classes": CLASSES,
        "splits": {"train": [], "val": [], "test": sorted(want)},
        # Ohne Train gibt es nichts zu gewichten; der Satz wird nur gemessen.
        "class_weights": dict.fromkeys(CLASSES, 1.0),
    })
    (out / "dataset.yaml").write_text(yaml.safe_dump({
        "name": out.name, "created_at": datetime.now(UTC).isoformat(),
        "class_mode": "pieces13", "session_ids": sorted(want),
        "purpose": "eval-only", "counts": {"raw": len(rows), "final": len(rows)},
    }, sort_keys=False, allow_unicode=True), encoding="utf-8")
    from chesslab import dataset as dataset_mod
    write_json(out / "stats.json", dataset_mod.compute_stats(rows))

    fresh = freeze(want)
    print(f"[OK] {out}")
    print(f"[OK] eingefroren in {LEDGER}: {', '.join(fresh) if fresh else 'war schon drin'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
