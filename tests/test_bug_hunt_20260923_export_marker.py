"""Folgeschritte pruefen den Marker `.export-running`; Bretter erst nach dem Log."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from chesslab import calibration, config, ioutil, session_boards, sessions
from chesslab.cli import app
from chesslab.realgames import confirm as rg_confirm
from chesslab.realgames import export as rg_export
from chesslab.realgames import timeline as rg_timeline
from chesslab.session_store import log as store_log
from chesslab.session_store import recording as store_rec
from conftest import make_profile


def _session(tmp_path, monkeypatch, *, marker=True):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = config.DATA.recordings / "g"
    (sdir / "boards").mkdir(parents=True)
    (sdir / "dirty").mkdir()
    (sdir / "session.yaml").write_text("session_id: rg-g\nprofile: desktop\n", encoding="utf-8")
    make_profile().save(calibration.profile_path("desktop"))
    rows = [{"frame": f"frames/{i:06d}.png", "board": f"boards/{i:06d}.webp", "ply": 1, "fen": "x",
             "corners": [[0, 0], [8, 0], [8, 8], [0, 8]]} for i in (144, 900)]
    rows.append({"frame": "frames/001000.png", "board": "dirty/001000.webp", "ply": 1, "fen": "x",
                 "dirty": True, "dirty_reason": "occluded"})
    for r in rows:
        (sdir / r["board"]).write_bytes(b"x")
    ioutil.write_rows(sdir / "log.jsonl", rows)
    if marker:
        (sdir / store_log.EXPORT_MARKER).write_text("export started x\n", encoding="utf-8")
    notes = config.DATA.labels / "review-notes.jsonl"
    notes.parent.mkdir(parents=True, exist_ok=True)
    notes.write_text("", encoding="utf-8")
    return sdir, notes


def _note(notes: Path, *frames: str) -> None:
    notes.write_text("".join(json.dumps({"session_id": "rg-g", "frame": f, "verdict": "dirty-frame"})
                             + "\n" for f in frames), encoding="utf-8")


def _refused(result, sdir: Path, before: bytes) -> None:
    text = result.output + repr(result.exception)
    assert result.exit_code == 1, text
    assert isinstance(result.exception, (SystemExit, store_log.ExportInterrupted)), text
    assert "export was interrupted" in text, text
    assert (sdir / "log.jsonl").read_bytes() == before


# --- W5 Python: jeder Folgeschritt verweigert unter dem Marker ----------------------------------

def test_settle_scan_refuses(tmp_path, monkeypatch):
    sdir, _ = _session(tmp_path, monkeypatch)
    before = (sdir / "log.jsonl").read_bytes()
    _refused(CliRunner().invoke(app, ["session", "settle-scan", "rg-g"]), sdir, before)


def test_alpha_worker_refuses(tmp_path, monkeypatch):
    from chesslab import calibration, matte

    sdir, _ = _session(tmp_path, monkeypatch)
    monkeypatch.setattr(matte, "exit_with_parent", lambda: None)
    monkeypatch.setattr(calibration, "load_profile", lambda _name: object())
    before = (sdir / "log.jsonl").read_bytes()
    _refused(CliRunner().invoke(app, ["occluders", "alpha-worker", "g"]), sdir, before)
    assert not (sdir / "matte.jsonl").exists()


def test_temporal_pass_refuses(tmp_path, monkeypatch):
    sdir, _ = _session(tmp_path, monkeypatch)
    before = (sdir / "log.jsonl").read_bytes()
    result = CliRunner().invoke(app, ["session", "temporal-pass", "g"])
    _refused(result, sdir, before)
    assert "[ERR]" in result.output, "erbt von ValueError, `fail_on` greift"


def test_model_read_refuses(tmp_path, monkeypatch):
    from chesslab import occluded_model

    sdir, _ = _session(tmp_path, monkeypatch)
    monkeypatch.setattr(occluded_model, "check_not_circular", lambda *_a: None)
    monkeypatch.setattr(occluded_model, "load_profile", lambda _name: object())
    monkeypatch.setattr(occluded_model, "model_classes", lambda _d: ["empty"])
    before = (sdir / "log.jsonl").read_bytes()
    result = CliRunner().invoke(app, ["realgames", "model-read", "g", "--model", str(tmp_path)])
    _refused(result, sdir, before)
    assert not (sdir / occluded_model.READS_FILE).exists()


def test_slice_refuses(tmp_path, monkeypatch):
    sdir, _ = _session(tmp_path, monkeypatch)
    before = (sdir / "log.jsonl").read_bytes()
    result = CliRunner().invoke(app, ["slice", "--session", "rg-g"])
    assert result.exit_code == 1 and "[FAIL] rg-g" in result.output, result.output
    assert "export was interrupted" in result.output
    assert (sdir / "log.jsonl").read_bytes() == before


def test_adopt_dirty_refuses(tmp_path, monkeypatch):
    sdir, notes = _session(tmp_path, monkeypatch)
    _note(notes, "000144")
    before = (sdir / "log.jsonl").read_bytes()
    _refused(CliRunner().invoke(app, ["realgames", "adopt-dirty", "g"]), sdir, before)
    assert (sdir / "boards" / "000144.webp").is_file()


def test_the_marker_setters_and_a_human_verdict_read_past_it(tmp_path, monkeypatch):
    """`rewarp` raeumt den Marker, `flag_frame` ist ein Urteil, das der Export hinueber traegt."""
    sdir, _ = _session(tmp_path, monkeypatch)
    assert len(store_log.read_log(sdir, under_export=True)) == 3
    with pytest.raises(sessions.NothingToDo, match="candidate.json"):
        session_boards.rewarp_boards_session("rg-g")
    assert "error" in session_boards.write_boards_session("rg-g"), "kommt bis zur Quellbild-Pruefung"
    assert store_log.flag_frame("rg-g", 0, True)["unusable"] is True
    assert (sdir / store_log.EXPORT_MARKER).is_file()


# --- W5 place_board: erst das bewachte Log, dann die Bretter ------------------------------------

def test_a_contested_adopt_leaves_the_board_where_the_log_says(tmp_path, monkeypatch):
    sdir, notes = _session(tmp_path, monkeypatch, marker=False)
    _note(notes, "000144")
    real = store_log.backup_log

    def backup_then_foreign_write(path):
        name = real(path)
        rows = ioutil.read_jsonl(path)
        rows[1]["unusable"] = True
        ioutil.write_rows(path, rows)
        return name

    monkeypatch.setattr(store_log, "backup_log", backup_then_foreign_write)
    with pytest.raises(ioutil.Contested):
        rg_export.adopt_reported_dirty("g")
    rows = ioutil.read_jsonl(sdir / "log.jsonl")
    assert rows[0]["board"] == "boards/000144.webp" and rows[1]["unusable"] is True
    assert (sdir / "boards" / "000144.webp").is_file(), "BUG: Brett verschoben, Log nicht"
    assert not (sdir / "dirty" / "000144.webp").exists()


# --- adopt-dirty: die Meldung nennt beide Richtungen --------------------------------------------

def test_the_cli_counts_reports_and_retractions_apart(tmp_path, monkeypatch):
    sdir, notes = _session(tmp_path, monkeypatch, marker=False)
    _note(notes, "000144")
    assert rg_export.adopt_reported_dirty("g")["set"] == 1
    _note(notes, "000900")
    result = CliRunner().invoke(app, ["realgames", "adopt-dirty", "g"])
    assert result.exit_code == 0, result.output
    assert "1 von 1 gemeldeten Frames auf `occluded` gesetzt, 1 widerrufene" in result.output
    assert "[OK] 1 neu gemeldete Frames" in result.output
    assert (sdir / "boards" / "000144.webp").is_file() and (sdir / "dirty" / "000900.webp").is_file()


# --- W4: `dirty_source` wird beim Export neu abgeleitet, nicht getragen -------------------------

CANDIDATE = {
    "geometry": {"corners": [[0, 0], [8, 0], [8, 8], [0, 8]]},
    "created_at": "2026-08-21T00:00:00Z", "clock": {"fps": 30.0}, "frames": 400,
    "start_fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "reviewed_plies": [1],
    "moves": [{"ply": 1, "san": "e4", "frame": 100, "t": 3.33,
               "fen_after": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"}],
}


def test_the_plan_marks_only_what_the_report_promoted(monkeypatch):
    from chesslab import framescan

    scan = [{"idx": i, "person": 0.0, "skin_patch": 0.0, "cells": [200.0] * 64}
            for i in range(100, 200, 3)]
    verdict = {103: "stale", 109: "occluded"}
    monkeypatch.setattr(framescan, "classify",
                        lambda seg, rows, **kw: {r["idx"]: verdict.get(r["idx"], "clean") for r in rows})
    rows = rg_timeline.plan_scanned(CANDIDATE, scan, margin_frames=30, reported={103, 106, 109})
    by = {int(Path(r["frame"]).stem): r for r in rows}
    assert by[106].get("dirty_source") == "reported", "BUG: nach dem Export erreicht kein Widerruf 106"
    assert "dirty_source" not in by[103] and "dirty_source" not in by[109], "Scan-Urteile bleiben"


def test_a_report_made_while_the_export_ran_lands_after_it(tmp_path, monkeypatch):
    """`adopt-dirty` verweigert unter dem Marker; der Export holt es hinter dem Marker nach."""
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    d = store_rec.game_dir("g")
    d.mkdir(parents=True)
    payload = {
        "name": "g", "video": "g.mp4", "confirmed": True, "created_at": "2026-08-08T00:00:00Z",
        "clock": {"fps": 30.0},
        "geometry": {"corners": [[20, 20], [300, 20], [300, 220], [20, 220]], "margin": 0.0,
                     "board_size": 128, "frame_size": [320, 240]},
        "source": {"crop": {"cell": 16.0, "pad_side": 0.05, "out_size": [80, 80]}},
        "moves": [{"ply": 1, "san": "e4", "frame": 100, "fen_after": CANDIDATE["moves"][0]["fen_after"]},
                  {"ply": 2, "san": "e5", "frame": 400,
                   "fen_after": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"}],
        "reviewed_plies": [1],
    }
    (d / "candidate.json").write_text(json.dumps(payload) + "\n", encoding="utf-8")
    (d / "video.mp4").write_bytes(b"")
    notes = config.DATA.labels / "review-notes.jsonl"
    notes.parent.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(rg_export, "ensure_export_profile", lambda *_a: None)
    monkeypatch.setattr(rg_export, "detect_rotation", lambda *_a: None)

    def decode_and_report(_v, wanted, _out, rotate=None):
        _note(notes, *(f"{i:06d}" for i in wanted))
        return set(wanted)

    monkeypatch.setattr(rg_export, "decode_frames", decode_and_report)
    rg_export.export_session("g", measure=False, fit=False, no_scan=True, workers=1)
    rows = store_log.read_log(d)
    hit = [r for r in rows if r.get("dirty_source") == "reported"]
    assert hit and all(r["dirty"] for r in rows), "BUG: die Meldung waehrend des Exports kam nie an"
    assert not (d / store_log.EXPORT_MARKER).exists()


# --- confirm: der md5 gehoert zu den Bytes, gegen die geurteilt wurde ---------------------------

def test_a_reference_replaced_during_the_prompt_is_refused(tmp_path, monkeypatch):
    import typer

    gdir = tmp_path / "rec"
    gdir.mkdir()
    cand = {"name": "rec", "moves": [{"ply": i + 1, "san": s, "frame": 10 * (i + 1)}
                                     for i, s in enumerate(("e4", "e5", "d4", "Nf3"))]}
    (gdir / "candidate.json").write_text(json.dumps(cand, indent=2), encoding="utf-8")
    (gdir / "reference.pgn").write_bytes(b"1. e4 e5 2. Nf3 *\n")
    for mod in (store_rec, rg_confirm):   # Kandidat/Referenz, und die Frame-Anker in `confirm`
        monkeypatch.setattr(mod, "game_dir", lambda name: gdir)
    before = (gdir / "candidate.json").read_bytes()

    def replaced_meanwhile(*_a, **_k):
        (gdir / "reference.pgn").write_bytes(b"1. d4 d5 *\n")
        return True

    monkeypatch.setattr(typer, "confirm", replaced_meanwhile)
    res = CliRunner().invoke(app, ["realgames", "confirm", "rec"])
    assert res.exit_code == 1 and "reference.pgn" in res.output, res.output
    assert (gdir / "candidate.json").read_bytes() == before, "BUG: Urteil mit dem md5 der neuen Datei"


# --- Berichte ueber ALLE Aufnahmen: eine abgebrochene ueberspringen und nennen, nicht abbrechen --

def test_position_flags_skips_and_names_an_interrupted_export(tmp_path, monkeypatch):
    from chesslab import position_flags

    _session(tmp_path, monkeypatch)
    r = position_flags.position_flags()
    assert r["export_interrupted"] == ["rg-g"]
    assert r["flags"] == 0


def test_frame_hands_skips_and_names_an_interrupted_export(tmp_path, monkeypatch):
    from chesslab import frame_hands, framescan

    _session(tmp_path, monkeypatch)
    monkeypatch.setattr(framescan, "read_scan", lambda name: [{"idx": 144, "gate": 0.0}])
    r = frame_hands.frame_hands()
    assert r["export_interrupted"] == ["g"]
    assert r["sessions"] == 0
