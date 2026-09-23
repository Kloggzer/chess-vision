"""Der Abgleich Ledger -> Pack -> Datensatz. Was er falsch macht, lernt jedes Modell mit."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import sync_labels as sl  # noqa: E402

from conftest import write_jsonl


def _rec(root: Path, session: str, name: str, rows: list[dict]) -> None:
    d = root / session[3:]
    d.mkdir(parents=True, exist_ok=True)
    write_jsonl(d / name, rows)


@pytest.fixture
def recs(tmp_path, monkeypatch):
    monkeypatch.setattr(sl, "RECORDINGS", tmp_path / "recordings")
    (tmp_path / "recordings").mkdir()
    return tmp_path / "recordings"


def test_later_verdict_wins_across_both_files(recs):
    """Eine Ruecknahme hebt die fruehere Zusage auf — sonst schlaegt die Dateireihenfolge zu."""
    _rec(recs, "rg-a", "reviewed.jsonl",
         [{"session_id": "rg-a", "frame": "1", "square": "e4", "label": "wN",
           "ts": "2026-01-02T00:00:00Z"}])
    _rec(recs, "rg-a", "corrections.jsonl",
         [{"session_id": "rg-a", "frame": "1", "square": "e4", "label": "wB",
           "ts": "2026-01-01T00:00:00Z"}])
    assert sl.ledger()[("rg-a", "1", "e4")] == "wN"


def test_the_retired_class_is_never_written(recs):
    """`occluded` ist Regressionsziel, keine Klasse. Es zurueckzuschreiben baut sie wieder auf."""
    _rec(recs, "rg-a", "corrections.jsonl",
         [{"session_id": "rg-a", "frame": "1", "square": "e4", "label": "occluded",
           "ts": "2026-01-01T00:00:00Z"}])
    assert sl.ledger() == {}


def test_a_cell_without_a_verdict_keeps_its_label(tmp_path):
    f = tmp_path / "manifest.jsonl"
    f.write_text(json.dumps({"session_id": "rg-a", "frame": "1", "square": "e4",
                             "label": "wB"}) + "\n", encoding="utf-8")
    assert sl.retag(f, {}, None) == {}


def test_retag_reports_the_pair_it_changed(tmp_path):
    f = tmp_path / "manifest.jsonl"
    f.write_text(json.dumps({"session_id": "rg-a", "frame": "1", "square": "e4",
                             "label": "wB"}) + "\n", encoding="utf-8")
    assert sl.retag(f, {("rg-a", "1", "e4"): "wN"}, None) == {("wB", "wN"): 1}


def test_a_dry_run_leaves_the_file_alone(tmp_path):
    f = tmp_path / "manifest.jsonl"
    before = json.dumps({"session_id": "rg-a", "frame": "1", "square": "e4", "label": "wB"}) + "\n"
    f.write_text(before, encoding="utf-8")
    sl.retag(f, {("rg-a", "1", "e4"): "wN"}, None)
    assert f.read_text(encoding="utf-8") == before


def test_apply_writes_and_backs_up(tmp_path):
    f = tmp_path / "pack" / "manifest.jsonl"
    f.parent.mkdir()
    f.write_text(json.dumps({"session_id": "rg-a", "frame": "1", "square": "e4",
                             "label": "wB"}) + "\n", encoding="utf-8")
    park = tmp_path / "park"
    park.mkdir()
    sl.retag(f, {("rg-a", "1", "e4"): "wN"}, park)
    assert json.loads(f.read_text(encoding="utf-8").strip())["label"] == "wN"
    assert json.loads((park / "pack--manifest.jsonl").read_text(encoding="utf-8").strip())["label"] == "wB"
