"""Labels nachziehen: Ledger -> Pack -> Datensatz.

Das Wort des Menschen steht in `corrections.jsonl`/`reviewed.jsonl` einer Aufnahme, spaeter
schlaegt frueher. Ein Pack ist ein Schnappschuss davon, ein Datensatz ein Schnappschuss des Packs
— und beide veralten still. Gemessen am 2026-09-18: 111 Pack-Zellen und 260 Zeilen in
`real13-mix-v7-128` trugen ein anderes Label als das Urteil, meist ein Laeufer/Springer-Tausch
auf der Grundreihe, den jedes Modell so gelernt hat.

Nur LABELS, keine Pixel — also kein Re-Slice, Minuten statt Stunden.

    uv run python scripts/sync_labels.py --packs --datasets real13-mix-v7-128 --apply
"""

from __future__ import annotations

import argparse
import collections
import shutil
from datetime import UTC, datetime
from pathlib import Path

from chesslab.config import IDENTITY_CLASSES
from chesslab.ioutil import read_jsonl, write_rows

RECORDINGS = Path("data/recordings")
PACKS = Path("data/packs")
DATASETS = Path("data/datasets")
Cell = tuple[str, str, str]


def ledger() -> dict[Cell, str]:
    """Das letzte Wort des Menschen je Zelle. `reviewed` und `corrections` in EINER Reihenfolge:
    spaeter schlaegt frueher, damit eine Ruecknahme die fruehere Zusage aufhebt."""
    rows: list[dict] = []
    for rec in sorted(RECORDINGS.iterdir()):
        if not rec.is_dir():
            continue
        for name in ("reviewed.jsonl", "corrections.jsonl"):
            path = rec / name
            if path.is_file():
                rows.extend(read_jsonl(path))
    rows.sort(key=lambda r: str(r.get("ts", "")))
    out: dict[Cell, str] = {}
    for row in rows:
        # `occluded` ist zurueckgezogen (`config.IDENTITY_CLASSES`); es zu schreiben baut eine
        # Klasse wieder auf, die der Verlust als Regressionsziel fuehrt.
        if row.get("label") in IDENTITY_CLASSES:
            out[(row["session_id"], str(row["frame"]), str(row["square"]))] = row["label"]
    return out


def key_of(row: dict) -> Cell:
    return (str(row.get("session_id")), str(row.get("frame")), str(row.get("square")))


def retag(path: Path, truth: dict[Cell, str], park: Path | None) -> collections.Counter:
    rows = read_jsonl(path)
    changed: collections.Counter = collections.Counter()
    for row in rows:
        want = truth.get(key_of(row))
        if want is not None and want != row.get("label"):
            changed[(row["label"], want)] += 1
            row["label"] = want
    if changed and park is not None:
        shutil.copy2(path, park / f"{path.parent.name}--{path.name}")
        write_rows(path, rows)
    return changed


def pack_truth(pack: Path) -> dict[Cell, str]:
    manifest = pack / "manifest.jsonl"
    return {key_of(r): r["label"] for r in read_jsonl(manifest)} if manifest.is_file() else {}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--packs", action="store_true", help="Packs gegen das Ledger nachziehen.")
    ap.add_argument("--datasets", default="", help="Komma-Liste, gegen ihre Packs nachgezogen.")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    park = None
    if args.apply:
        park = Path("data/_parked") / f"label-sync-{datetime.now(UTC):%Y%m%d-%H%M%S}"
        park.mkdir(parents=True)

    total: collections.Counter = collections.Counter()
    if args.packs:
        truth = ledger()
        print(f"Ledger: {len(truth)} Zellen mit gueltigem Urteil")
        for pack in sorted(PACKS.iterdir()):
            if not pack.is_dir() or not (pack / "manifest.jsonl").is_file():
                continue
            hit = retag(pack / "manifest.jsonl", truth, park)
            if hit:
                print(f"   {pack.name}: {sum(hit.values())} Zellen")
                total.update(hit)

    for name in [n for n in args.datasets.split(",") if n]:
        manifest = DATASETS / name / "manifest.jsonl"
        if not manifest.is_file():
            print(f"[FAIL] {manifest} fehlt")
            return 1
        rows = read_jsonl(manifest)
        truth: dict[Cell, str] = {}
        for pack in {str(r.get("path", "")).removeprefix("mm://").split("/", 1)[0]
                     for r in rows if str(r.get("path", "")).startswith("mm://")}:
            truth.update(pack_truth(PACKS / pack))
        hit = retag(manifest, truth, park)
        print(f"   {name}: {sum(hit.values())} Zellen")
        total.update(hit)

    print(f"\n{sum(total.values())} Labels" + (" geaendert" if args.apply else " WUERDEN sich aendern"))
    for (a, b), n in total.most_common(10):
        print(f"   {a:6s} -> {b:6s} {n:5d}x")
    if args.apply and park is not None:
        print(f"[OK] Sicherung: {park}")
    else:
        print("(Probelauf — mit --apply schreiben)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
