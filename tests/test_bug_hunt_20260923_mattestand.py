"""Stand der `matte.jsonl` fuer die Kette, gestagter Upsert, EINE Zellregel.
Befunde aus `docs/architektur-review-python-2026-09-23.md`."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import cell_rule, config, ioutil, provenance, temporal_flags, temporal_matte
from conftest import write_jsonl


def _recording(tmp_path: Path, monkeypatch, frames=("000001",)) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "g"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-g\nprofile: p\n", encoding="utf-8")
    config.DATA.calibration.mkdir(parents=True)
    (config.DATA.calibration / "p.yaml").write_text("margin: 0.045\n", encoding="utf-8")
    rows = [{"frame": f"frames/{f}.png", "ply": 1, "board": f"boards/{f}.webp"} for f in frames]
    write_jsonl(rec / "log.jsonl", rows)
    return rec


def _matte(rec: Path, rows: list[dict]) -> None:
    write_jsonl(rec / "matte.jsonl", rows)


# H6 / H3-Matte: der echte Weg ist `session temporal-pass` -----------------------------------------

def _run_pass(monkeypatch, during_flags=None) -> Path:
    from chesslab import cli, position_flags

    monkeypatch.setattr(temporal_flags, "scan_session", lambda _s: {"cells": 0, "flags": 0})
    monkeypatch.setattr(temporal_matte, "propose_session",
                        lambda *_a, **_k: {"proposed": 0, "skipped": 0})
    monkeypatch.setattr(temporal_matte, "adopt_proposals",
                        lambda *_a, **_k: {"adopted": 0, "kept_sam": 0})
    monkeypatch.setattr(temporal_matte, "upsert_proposals",
                        lambda *_a, **_k: {"upserted": 0, "sam_found": 0})

    def flags():
        if during_flags:
            during_flags()
        return {"flags": 0, "path": "x"}

    monkeypatch.setattr(position_flags, "position_flags", flags)
    cli.session_temporal_pass("g", workers=1, method="local")
    return config.DATA.reports / "temporal-mattes" / "g" / "pass.json"


def test_a_fresh_pass_is_current_against_its_own_matte(tmp_path, monkeypatch):
    """Kein Selbst-Veralten: der Pass stempelt NACH seinem letzten Schreiben (prune)."""
    rec = _recording(tmp_path, monkeypatch)
    _matte(rec, [{"frame": "000001", "coverage": {"a1": 0.0}},
                 {"frame": "000001", "source": "temporal", "coverage": {"a1": 0.9}}])
    report = _run_pass(monkeypatch)
    provenance.check(rec, report)
    head = json.loads(report.read_text(encoding="utf-8"))
    assert head["_inputs"]["matte"] == provenance.file_stamp(rec / "matte.jsonl")


def test_a_sam_row_during_the_flags_stales_the_pass(tmp_path, monkeypatch):
    """`position_flags` laeuft nach dem Upsert; eine Zeile, die dann dazukommt, hat kein Upsert gesehen."""
    rec = _recording(tmp_path, monkeypatch)
    _matte(rec, [{"frame": "000001", "coverage": {"a1": 0.0}}])
    report = _run_pass(monkeypatch, during_flags=lambda: ioutil.append_rows(
        rec / "matte.jsonl", [{"frame": "000002", "coverage": {"a1": 0.0}}]))
    with pytest.raises(provenance.Stale, match="matte.jsonl"):
        provenance.check(rec, report)


def test_pass_inputs_are_the_form_chain_ts_reads(tmp_path, monkeypatch):
    """`chain.ts::inputsMoved` liest `matte` als `ms:bytes` und `scan` als `source_stamp`."""
    rec = _recording(tmp_path, monkeypatch)
    _matte(rec, [])
    inputs = temporal_matte.pass_inputs("rg-g")
    assert inputs == {"matte": provenance.file_stamp(rec / "matte.jsonl"),
                      "scan": temporal_flags.source_stamp(rec)}
    assert "profile:p" in {e[0] for e in inputs["scan"]}


def test_a_pass_without_matte_still_says_so(tmp_path, monkeypatch):
    """Fehlte `matte.jsonl` beim Pass, oeffnet erst die ERSTE SAM-Zeile die Sprosse."""
    rec = _recording(tmp_path, monkeypatch)
    report = temporal_matte.write_pass_report("rg-g", {"upserted": 0})
    provenance.check(rec, report)
    _matte(rec, [{"frame": "000001", "coverage": {"a1": 0.0}}])
    with pytest.raises(provenance.Stale):
        provenance.check(rec, report)


def test_an_old_pass_without_inputs_is_judged_as_before(tmp_path, monkeypatch):
    """Altbestand (23 von 27 ungestempelt): kein neues Urteil, nur der Log-Stempel zaehlt."""
    rec = _recording(tmp_path, monkeypatch)
    _matte(rec, [])
    report = config.DATA.reports / "temporal-mattes" / "g" / "pass.json"
    report.parent.mkdir(parents=True)
    report.write_text(json.dumps({"_source": provenance.source(rec)}), encoding="utf-8")
    ioutil.append_rows(rec / "matte.jsonl", [{"frame": "000001", "coverage": {"a1": 0.0}}])
    provenance.check(rec, report)


# H5: der Upsert veroeffentlicht erst, wenn der Ledger steht ------------------------------------

def _upsert_setup(tmp_path, monkeypatch, proposals: list[dict]) -> Path:
    rec = _recording(tmp_path, monkeypatch, frames=("000001", "000002", "000003"))
    _matte(rec, [{"frame": "000001", "coverage": {"a1": 0.0}},
                 {"frame": "000002", "coverage": {"a1": 0.0}},
                 {"frame": "000003", "coverage": {"a1": 0.0}},
                 {"frame": "000001", "source": "upsert", "coverage": {"a1": 0.9}}])
    mattes = rec / "mattes"
    (mattes / "000001.webp").write_bytes(b"old-upsert")
    (mattes / "000001.sam.webp").write_bytes(b"sam-1")
    (mattes / "000002.webp").write_bytes(b"sam-2")
    directory = tmp_path / "reports" / "temporal-mattes" / "g" / "local"
    directory.mkdir(parents=True)
    alpha = np.full((8, 8), 255, np.uint8)
    for row in proposals:
        if row.get("write", True):
            cv2.imwrite(str(directory / row["alpha"]), alpha)
    (directory / "proposals.jsonl").write_text(
        "".join(json.dumps({"frame": r["frame"], "alpha": r["alpha"], "fraction_above_half": 1.0}) + "\n"
                for r in proposals), encoding="utf-8")
    monkeypatch.setattr(temporal_matte, "require_fresh_proposals", lambda *_a: None)
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda _name: object())
    monkeypatch.setattr("chesslab.matte.coverage_of", lambda *_a: {"a1": 0.9})
    return rec


def _files(rec: Path) -> dict[str, bytes]:
    return {p.name: p.read_bytes() for p in sorted((rec / "mattes").iterdir())}


def test_a_confirmed_upsert_publishes_like_the_old_order(tmp_path, monkeypatch):
    """Frueheres Upsert zurueck auf SAM, neues davor, SAMs Datei als `.sam.webp` — wie vorher."""
    rec = _upsert_setup(tmp_path, monkeypatch, [{"frame": "000002", "alpha": "a2.webp"}])
    result = temporal_matte.upsert_proposals("rg-g")
    files = _files(rec)
    assert result["upserted"] == 1 and result["replaced"] == 1
    assert files["000001.webp"] == b"sam-1" and "000001.sam.webp" not in files
    assert files["000002.sam.webp"] == b"sam-2"
    assert cv2.imread(str(rec / "mattes" / "000002.webp"), cv2.IMREAD_GRAYSCALE) is not None
    assert not [n for n in files if ".tmp." in n]


def test_a_crash_in_the_loop_leaves_every_alpha_alone(tmp_path, monkeypatch):
    """`cv2.imread` = `None` beim zweiten Vorschlag: der erste war schon gestagt."""
    rec = _upsert_setup(tmp_path, monkeypatch, [{"frame": "000002", "alpha": "a2.webp"},
                                                {"frame": "000003", "alpha": "gone.webp",
                                                 "write": False}])
    before, ledger = _files(rec), (rec / "matte.jsonl").read_bytes()
    with pytest.raises(AttributeError):
        temporal_matte.upsert_proposals("rg-g")
    assert _files(rec) == before
    assert (rec / "matte.jsonl").read_bytes() == ledger


def test_a_contested_upsert_drops_its_staged_alpha(tmp_path, monkeypatch):
    rec = _upsert_setup(tmp_path, monkeypatch, [{"frame": "000002", "alpha": "a2.webp"}])
    before = _files(rec)
    monkeypatch.setattr(temporal_matte, "stamp_of", lambda _p: (0, 0))
    with pytest.raises(ioutil.Contested):
        temporal_matte.upsert_proposals("rg-g")
    assert _files(rec) == before


# H4: eine Zellregel, torch-frei -----------------------------------------------------------------

def test_matte_dirty_and_the_loss_read_one_constant():
    from chesslab import labeling
    from chesslab.training import occlusion

    assert labeling.MATTE_DIRTY is cell_rule.PIECE_VISIBLE_MAX
    assert occlusion.PIECE_VISIBLE_MAX is cell_rule.PIECE_VISIBLE_MAX
    assert occlusion.CELL_DARK_MIN is cell_rule.CELL_DARK_MIN
    assert occlusion.classification_eligible is cell_rule.classification_eligible


def test_labeling_does_not_pull_torch():
    code = "import sys, chesslab.labeling, chesslab.cell_rule; print('torch' in sys.modules)"
    out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, check=True)
    assert out.stdout.strip() == "False"
