"""Die Fold-Durchsicht. Zwei Fehler waeren hier teuer: eine Aufnahme mit einem Modell lesen, das
sie trainiert hat, und eine Zelle vorlegen, ueber die der Mensch schon entschieden hat."""

from __future__ import annotations

import inspect
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import oof_review as oof  # noqa: E402


@pytest.fixture
def recs(tmp_path, monkeypatch):
    root = tmp_path / "recordings"
    (root / "a").mkdir(parents=True)
    monkeypatch.setattr(oof, "RECORDINGS", root)
    return root


def test_judged_collects_both_ledgers(recs):
    (recs / "a" / "reviewed.jsonl").write_text(
        json.dumps({"session_id": "rg-a", "frame": "1", "square": "e4", "label": "wN"}) + "\n",
        encoding="utf-8")
    (recs / "a" / "corrections.jsonl").write_text(
        json.dumps({"session_id": "rg-a", "frame": "2", "square": "d4", "label": "wB"}) + "\n",
        encoding="utf-8")
    assert oof.judged() == {("rg-a", "1", "e4"), ("rg-a", "2", "d4")}


def test_judged_is_empty_without_ledgers(recs):
    assert oof.judged() == set()


def test_only_the_test_part_of_a_fold_is_read():
    """Der Kern: `split['test']` und NICHTS sonst. Wer `train` mitnimmt, laesst ein Modell seine
    eigenen Trainingsdaten beurteilen und nennt das einen Zeugen."""
    src = inspect.getsource(oof.main)
    assert 'mine = set(split["test"])' in src
    assert 'split["train"]' not in src and 'split["val"]' not in src


def test_already_judged_cells_are_skipped():
    """Fast alle Funde waren laengst entschieden; ohne diesen Filter misst der Lauf das Modell,
    nicht die Labels.
    """
    src = inspect.getsource(oof.main)
    assert "if key in seen or not classification_eligible(row):" in src
