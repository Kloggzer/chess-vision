"""Refinement Runde 5: was die zusammengefuehrten Wege vorher taten, festgehalten."""

from __future__ import annotations

import hashlib
import json

import pytest
from tests.test_realgames import _confirmed_eleven

from chesslab.realgames.timeline import plan_rows


def _digest(rows) -> str:
    return hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()[:16]


@pytest.mark.parametrize(("kwargs", "want"), [
    ({"every": 3, "dirty": True}, "fd76732fbdd15c51"),
    ({"every": 3, "dirty": False}, "bc5a76f82493ef13"),
    ({"every": 5, "dirty": True, "per_position": 4}, "023771638eb7f14b"),
    ({"every": 7, "dirty": True, "settle": {3: {"g1": 380, "f3": 390}, 4: {"g8": 1}}}, "e852bc96842fde1c"),
])
def test_plan_rows_writes_the_rows_it_wrote_before(kwargs, want):
    assert _digest(plan_rows(_confirmed_eleven(), margin_frames=30, **kwargs)) == want


@pytest.mark.parametrize(("cfg", "want"), [({"classes": ["empty", "wP"]}, ["empty", "wP"]), ({}, [])])
def test_model_classes_reads_the_run_config(tmp_path, cfg, want):
    from chesslab import occluded_model

    (tmp_path / "config.json").write_text(json.dumps(cfg), encoding="utf-8")
    assert occluded_model.model_classes(tmp_path) == want


def _bulk(monkeypatch, tmp_path, target, attr, result):
    """Two recordings, `bad` raises: the bulk verbs' stdout and exit code."""

    from chesslab import config
    from chesslab.cli import occluders as cli_occ

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    for name in ("bad", "good"):
        (tmp_path / "recordings" / name).mkdir(parents=True)
        (tmp_path / "recordings" / name / "log.jsonl").write_text("{}\n", encoding="utf-8")
    monkeypatch.setattr(cli_occ, "_rg_recordings", lambda: ["bad", "good"])

    def fn(name, **_kw):
        if name == "bad":
            raise ValueError("kaputt")
        return result

    monkeypatch.setattr(target, attr, fn)
    return fn


BULK = [
    ("matte", "recut_coverage", ["occluders", "recut-coverage", "--all"],
     {"recut": 2, "frames": 5, "crossed": 1},
     "[ERR] bad: kaputt\n"
     "[OK] good: 2 von 5 Zeilen neu geschnitten, 1 Zellen ueber PIECE_VISIBLE_MAX gekippt\n"
     "[OK] 2 Zeilen neu geschnitten, 1 Zellen haben die Schwelle gewechselt (1 von 2 Aufnahmen)\n"),
    ("matte", "close_seams", ["occluders", "close-seams", "--all"],
     {"closed": 1, "frames": 4, "crossed": 2, "px": 7},
     "[ERR] bad: kaputt\n"
     "[OK] good: 1/4 Alphas geschlossen, +7 px, 2 Zellen wechseln die Schwelle\n"
     "[OK] gesamt 1/4 Alphas, 2 Zellen wechseln PIECE_VISIBLE_MAX\n"),
    ("matte", "matte_status", ["occluders", "status"],
     {"missing": ["1"], "missing_other": ["2"], "orphans": [], "matted": 3, "dirty": 4},
     "[ERR] bad: kaputt\n"
     "[!!] good: 3/4 gemattet, 1 fehlen, 1 nur mit --reason all, 0 Waisen\n"
     "[!!] 1 von 2 Aufnahmen gemessen: 1 fehlende Matten, 1 nur mit --reason all, 0 Waisen\n"),
    ("realgames.export", "adopt_reported_dirty", ["realgames", "adopt-dirty", "--all"],
     {"set": 2, "reported": 3, "retracted": 1, "changed": 3, "backup": "b"},
     "[ERR] bad: kaputt\n"
     "[OK] good: 2 von 3 gemeldeten Frames auf `occluded` gesetzt, 1 widerrufene Meldungen "
     "zurueckgenommen (Backup b)\n"
     "[FAIL] 2 neu gemeldete Frames warten jetzt auf die Matte — `chesslab occluders alpha-worker`\n"),
]


@pytest.mark.parametrize(("module", "attr", "argv", "result", "want"), BULK)
def test_bulk_recording_verbs_report_as_before(monkeypatch, tmp_path, module, attr, argv, result,
                                               want):
    import importlib

    from typer.testing import CliRunner

    from chesslab.cli import app

    _bulk(monkeypatch, tmp_path, importlib.import_module(f"chesslab.{module}"), attr, result)
    out = CliRunner().invoke(app, argv)
    assert (out.exit_code, out.output) == (1, want)
