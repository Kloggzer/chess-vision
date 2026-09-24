"""Frische eines Laufs: `provenance.check` und die Kette (`chain_state.pass_state`) urteilen gleich.

Bis 2026-09-24 rechneten beide `_inputs` getrennt nach; die Kette liess Bretter aus, `check` nicht.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from chesslab import chain_state, config, provenance, temporal_matte
from conftest import write_jsonl


@pytest.fixture
def rec(tmp_path: Path, monkeypatch) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    chain_state._CACHE.clear()
    rec = tmp_path / "recordings" / "g"
    (rec / "boards").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-g\nprofile: p\n", encoding="utf-8")
    config.DATA.calibration.mkdir(parents=True)
    (config.DATA.calibration / "p.yaml").write_text("margin: 0.045\n", encoding="utf-8")
    (rec / "boards" / "000001.webp").write_bytes(b"x")
    write_jsonl(rec / "log.jsonl", [{"frame": "frames/000001.png", "ply": 1,
                                     "board": "boards/000001.webp"}])
    write_jsonl(rec / "matte.jsonl", [{"frame": "000001", "coverage": {"a1": 0.0}}])
    return rec


def _later(path: Path, text: str | None = None, *, s: int = 5) -> None:
    if text is not None:
        path.write_text(text, encoding="utf-8")
    ns = path.stat().st_mtime_ns + s * 10**9
    os.utime(path, ns=(ns, ns))


def _write_pass(rec: Path, head: dict | None = None) -> Path:
    if head is None:
        return temporal_matte.write_pass_report("rg-g", {"adopted": 0})
    path = config.DATA.reports / "temporal-mattes" / rec.name / "pass.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(head), encoding="utf-8")
    return path


def _verdicts(rec: Path, report: Path) -> tuple[str, bool]:
    state = chain_state.pass_state(rec, rec.name, provenance.file_stamp(rec / "log.jsonl"))["state"]
    try:
        provenance.check(rec, report)
    except provenance.Stale:
        return state, False
    return state, True


def _matte_row(rec):
    with (rec / "matte.jsonl").open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({"frame": "000002", "coverage": {"a1": 0.0}}) + "\n")


CASES = {
    "fresh": (lambda rec: None, "fresh"),
    "matte": (_matte_row, "matte_moved"),
    "profile": (lambda rec: _later(config.DATA.calibration / "p.yaml", "margin: 0.05\n"), "input_moved"),
    "meta": (lambda rec: _later(rec / "session.yaml", "session_id: rg-g\nprofile: p\n#\n"), "input_moved"),
    "board": (lambda rec: _later(rec / "boards" / "000001.webp"), "fresh"),
    "log": (lambda rec: _later(rec / "log.jsonl"), "stale"),
}


@pytest.mark.parametrize("case", sorted(CASES))
def test_check_and_the_chain_judge_a_pass_alike(rec, case):
    move, want = CASES[case]
    report = _write_pass(rec)
    move(rec)
    assert _verdicts(rec, report) == (want, want == "fresh")


def test_an_old_pass_without_inputs_stays_current(rec):
    report = _write_pass(rec, {"_source": provenance.source(rec)})
    _matte_row(rec)
    _later(config.DATA.calibration / "p.yaml", "margin: 0.05\n")
    assert _verdicts(rec, report) == ("fresh", True)


def test_a_file_missing_at_the_pass_and_now_is_no_change(rec):
    (config.DATA.calibration / "p.yaml").unlink()
    (rec / "matte.jsonl").unlink()
    report = _write_pass(rec)
    head = json.loads(report.read_text(encoding="utf-8"))
    assert head["_inputs"]["matte"] is None and ["profile:p", None, None] in head["_inputs"]["scan"]
    assert _verdicts(rec, report) == ("fresh", True)


def test_a_millisecond_of_rounding_is_no_change(rec):
    """`ms:bytes` aus JS-Zeiten: die Millisekunde darf um eins abweichen, die Groesse nie."""
    report = _write_pass(rec)
    head = json.loads(report.read_text(encoding="utf-8"))
    ms, size = head["_inputs"]["matte"].split(":")
    head["_inputs"]["matte"] = f"{int(ms) + 1}:{size}"
    report.write_text(json.dumps(head), encoding="utf-8")
    assert _verdicts(rec, report) == ("fresh", True)
    head["_inputs"]["matte"] = f"{int(ms) + 2}:{size}"
    report.write_text(json.dumps(head), encoding="utf-8")
    assert _verdicts(rec, report) == ("matte_moved", False)


def test_the_scan_stamp_keeps_its_stored_form(rec):
    """`[name, Groesse, mtime_ns]` steht in Berichten und `pass.json`; alte Stempel muessen gleich bleiben."""
    from chesslab.temporal_flags import source_stamp

    (rec / "boards" / "000001.webp").unlink()
    meta = (rec / "session.yaml").stat()
    stamp = source_stamp(rec)
    assert ["session.yaml", meta.st_size, meta.st_mtime_ns] in stamp
    assert ["boards/000001.webp", None, None] in stamp
    assert [e[0] for e in stamp] == ["boards/000001.webp", "log.jsonl", "session.yaml", "profile:p"]
