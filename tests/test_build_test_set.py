"""Der Testsatz-Bauer darf nie Material aufnehmen, das ein Modell im Training hatte."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
import yaml

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
    ledger.write_text(json.dumps({"burned": {}, "benchmark": ["rg-alt"]}), encoding="utf-8")
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


def test_register_keeps_existing_entries(repo):
    fresh = bts.register(["rg-sauber"])
    doc = json.loads(bts.LEDGER.read_text(encoding="utf-8"))
    assert doc["benchmark"] == ["rg-alt", "rg-sauber"]
    assert fresh == ["rg-sauber"]


def test_register_reports_nothing_new_twice(repo):
    bts.register(["rg-sauber"])
    assert bts.register(["rg-sauber"]) == []


def test_register_never_writes_the_frozen_lock(repo):
    """`frozen` verbietet jede Messung ohne --burn-frozen — ein Benchmark waere damit tot."""
    bts.register(["rg-sauber"])
    assert json.loads(bts.LEDGER.read_text(encoding="utf-8")).get("frozen", []) == []


def test_explicit_sessions_cannot_bypass_the_check(repo, monkeypatch, capsys):
    monkeypatch.setattr(sys, "argv",
                        ["x", "--name", "test-v9", "--sessions", "rg-schmutzig", "--dry-run"])
    assert bts.main() == 1
    assert "im Training gewesen" in capsys.readouterr().out


def _fake_pack(packs: Path, session: str, size: int, rows: list[dict]) -> None:
    d = packs / f"{session}-{size}"
    d.mkdir(parents=True)
    (d / "manifest.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")


def test_built_yaml_names_its_packs(repo, monkeypatch, tmp_path):
    """Ohne `packs:` haelt `resolve_dataset_packs` den Satz fuer klassisch und `eval` bricht auf
    den mm://-Zeilen ab. Sechs Laeufe scheiterten daran, bevor einer gemessen hatte."""
    rows = [{"session_id": "rg-sauber", "square": "a1", "label": "wR", "frame": "000001",
             "coverage": 0.0, "path": "mm://rg-sauber-128/000001-a1"}]
    _fake_pack(repo / "packs", "rg-sauber", 128, rows)
    monkeypatch.setattr(sys, "argv", ["x", "--name", "test-v9", "--size", "128"])
    assert bts.main() == 0
    built = yaml.safe_load(
        (bts.DATASETS / "real13-test-v9-128" / "dataset.yaml").read_text(encoding="utf-8"))
    assert built["packs"] == ["rg-sauber-128"]
    assert built["session_ids"] == ["rg-sauber"]
