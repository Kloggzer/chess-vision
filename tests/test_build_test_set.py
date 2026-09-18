"""Der Testsatz-Bauer darf nie Material aufnehmen, das ein Modell im Training hatte."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import build_test_set as bts  # noqa: E402


@pytest.fixture
def repo(tmp_path, monkeypatch):
    datasets = tmp_path / "datasets"
    (datasets / "alt").mkdir(parents=True)
    (datasets / "alt" / "split.json").write_text(
        json.dumps({"splits": {"train": ["rg-schmutzig"], "test": ["rg-sauber"]}}),
        encoding="utf-8")
    (datasets / "alt" / "split-f0.json").write_text(
        json.dumps({"splits": {"train": ["rg-fold-only"]}}), encoding="utf-8")
    ledger = tmp_path / "TEST-USED.json"
    ledger.write_text(json.dumps({"burned": {}, "frozen": ["rg-alt"]}), encoding="utf-8")
    monkeypatch.setattr(bts, "DATASETS", datasets)
    monkeypatch.setattr(bts, "LEDGER", ledger)
    monkeypatch.setattr(bts, "PACKS", tmp_path / "packs")
    return tmp_path


def test_ever_trained_reads_every_split_file(repo):
    """Ein Fold-Split ist auch ein Training — wer nur `split.json` liest, laesst Material durch."""
    assert bts.ever_trained() == {"rg-schmutzig", "rg-fold-only"}


def test_candidates_skips_trained_sessions(repo):
    packs = repo / "packs"
    for name in ("rg-sauber-128", "rg-schmutzig-128", "rg-fold-only-128"):
        (packs / name).mkdir(parents=True)
    assert bts.candidates(128) == ["rg-sauber"]


def test_candidates_ignores_other_sizes(repo):
    packs = repo / "packs"
    (packs / "rg-sauber-80").mkdir(parents=True)
    assert bts.candidates(128) == []


def test_freeze_keeps_existing_entries(repo):
    fresh = bts.freeze(["rg-sauber"])
    doc = json.loads(bts.LEDGER.read_text(encoding="utf-8"))
    assert doc["frozen"] == ["rg-alt", "rg-sauber"]
    assert fresh == ["rg-sauber"]


def test_freeze_reports_nothing_new_twice(repo):
    bts.freeze(["rg-sauber"])
    assert bts.freeze(["rg-sauber"]) == []


def test_explicit_sessions_cannot_bypass_the_check(repo, monkeypatch, capsys):
    monkeypatch.setattr(sys, "argv",
                        ["x", "--name", "test-v9", "--sessions", "rg-schmutzig", "--dry-run"])
    assert bts.main() == 1
    assert "im Training gewesen" in capsys.readouterr().out
