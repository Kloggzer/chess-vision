"""Aufnahmen, die NIE ins Training duerfen, und eine Wache, die es merkt."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DATASETS = ROOT / "data" / "datasets"

#: Warum jede hier steht — ohne Grund gehoert keine Aufnahme gesperrt.
HOLDOUT = {
    "rg-2026-09-15-16-54-44": "das einzige ungesehene Spiel; der ehrliche Zeuge fuer jeden Audit",
    "rg-2026-09-11-20-00-52": "der zweite Teil von test-v1; nie trainiert, in TEST-USED eingefroren",
}


def datasets_with_a_split() -> list[Path]:
    if not DATASETS.is_dir():
        return []
    return sorted(d for d in DATASETS.iterdir() if any(d.glob("split*.json")))


def holdout_in_training(dataset: Path) -> list[str]:
    """Jede `split*.json`, nicht nur `split.json`: ein Fold trainiert genauso wie ein Lauf."""
    caught: list[str] = []
    for split_file in sorted(dataset.glob("split*.json")):
        try:
            splits = json.loads(split_file.read_text(encoding="utf-8"))["splits"]
        except (ValueError, KeyError, OSError):
            continue
        for where in ("train", "val"):
            caught.extend(f"{dataset.name}/{split_file.name}: {s} steht in {where}"
                          for s in splits.get(where) or [] if s in HOLDOUT)
    return caught


def test_no_dataset_trains_on_a_holdout_session():
    """Ein Datensatz, der sie in `train` oder `val` zieht, macht sie als Zeugen wertlos."""
    sets = datasets_with_a_split()
    if not sets:
        pytest.skip("keine Datensaetze auf dieser Maschine")

    caught: list[str] = []
    for dataset in sets:
        caught.extend(holdout_in_training(dataset))

    assert caught == [], (
        "diese Aufnahmen sind als Holdout gesetzt und gehoeren nicht ins Training — "
        f"mit `--add-test` bauen: {caught}"
    )


def test_every_holdout_names_its_reason():
    """Eine Sperre ohne Begruendung wird irgendwann aus Ratlosigkeit entfernt."""
    assert all(reason.strip() for reason in HOLDOUT.values())


def test_a_fold_split_is_checked_too(tmp_path):
    """Die Wache las nur `split.json`. Ein `split-f0.json` haette den Zeugen still verbrannt."""
    dataset = tmp_path / "irgendein-satz"
    dataset.mkdir()
    holdout = next(iter(HOLDOUT))
    (dataset / "split-f0.json").write_text(
        json.dumps({"splits": {"train": [holdout], "val": [], "test": []}}), encoding="utf-8")
    assert holdout_in_training(dataset) == [f"irgendein-satz/split-f0.json: {holdout} steht in train"]
