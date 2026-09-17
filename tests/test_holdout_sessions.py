"""Aufnahmen, die NIE ins Training duerfen — und eine Wache, die es merkt.

`2026-09-15-16-54-44` ist das einzige ganze Spiel, das kein Modell je gesehen hat (Nutzer,
2026-09-17). Genau daran ist der Label-Audit heute gescheitert: jeder "Zeuge" hatte auf dem
Material trainiert, das er beurteilen sollte, und drei Modelle aus zwei Architektur-Familien
lasen denselben Turm zuversichtlich als Springer.

`assign_sessions_to_splits` kennt `force_train`, aber kein Gegenstueck — die Entscheidung haelt
also nur, solange jemand `--add-test` nicht vergisst. Dieser Test merkt es.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DATASETS = ROOT / "data" / "datasets"

#: Warum jede hier steht — ohne Grund gehoert keine Aufnahme gesperrt.
HOLDOUT = {
    "rg-2026-09-15-16-54-44": "das einzige ungesehene Spiel; der ehrliche Zeuge fuer jeden Audit",
}


def datasets_with_a_split() -> list[Path]:
    if not DATASETS.is_dir():
        return []
    return sorted(d for d in DATASETS.iterdir() if (d / "split.json").is_file())


def test_no_dataset_trains_on_a_holdout_session():
    """Ein Datensatz, der sie in `train` oder `val` zieht, macht sie als Zeugen wertlos."""
    sets = datasets_with_a_split()
    if not sets:
        pytest.skip("keine Datensaetze auf dieser Maschine")

    caught: list[str] = []
    for dataset in sets:
        try:
            splits = json.loads((dataset / "split.json").read_text(encoding="utf-8"))["splits"]
        except (ValueError, KeyError, OSError):
            continue
        for where in ("train", "val"):
            caught.extend(f"{dataset.name}: {s} steht in {where}"
                          for s in splits.get(where) or [] if s in HOLDOUT)

    assert caught == [], (
        "diese Aufnahmen sind als Holdout gesetzt und gehoeren nicht ins Training — "
        f"mit `--add-test` bauen: {caught}"
    )


def test_every_holdout_names_its_reason():
    """Eine Sperre ohne Begruendung wird irgendwann aus Ratlosigkeit entfernt."""
    assert all(reason.strip() for reason in HOLDOUT.values())
