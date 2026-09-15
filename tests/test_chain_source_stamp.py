"""Beide Ketten-Artefakte sagen, zu welchem Export sie gehoeren.

Ohne Stempel haelt ein Reads-Lauf von VOR dem letzten Re-Export die Sprosse genauso geschlossen
wie ein frischer — derselbe Riss wie bei der driftenden `coverage`. `platform/app/lib/chain.ts`
rechnet genau diese Form nach.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from chesslab import occluded_model, provenance, temporal_matte


@pytest.fixture
def session(tmp_path, monkeypatch):
    sdir = tmp_path / "s"
    sdir.mkdir()
    (sdir / "log.jsonl").write_text("{}\n", encoding="utf-8")
    monkeypatch.setattr(occluded_model, "game_dir", lambda name: sdir, raising=False)
    monkeypatch.setattr("chesslab.realgames.game_dir", lambda name: sdir)
    monkeypatch.setattr(occluded_model, "read_session_meta",
                        lambda d: {"session_id": "rg-s", "profile": "p"})
    monkeypatch.setattr(occluded_model, "check_not_circular", lambda run, sid: None)
    monkeypatch.setattr(occluded_model, "load_profile", lambda name: object())
    monkeypatch.setattr(occluded_model, "model_classes", lambda run: ["empty", "wP"])
    monkeypatch.setattr(occluded_model, "read_log",
                        lambda d: [{"frame": "000001.webp", "fen": "8/8/8/8/8/8/8/8 w - - 0 1"}])
    monkeypatch.setattr(occluded_model, "frame_cells",
                        lambda d, row, prof: [np.zeros((4, 4, 3), np.uint8)] * 64)
    monkeypatch.setattr(occluded_model, "all_reads",
                        lambda run, cells, dev, w: [{"probs": [1.0, 0.0]}] * 64)
    return sdir


def test_stamp_is_the_millisecond_and_the_size_of_the_log(tmp_path):
    (tmp_path / "log.jsonl").write_text("x" * 17, encoding="utf-8")
    st = (tmp_path / "log.jsonl").stat()

    assert provenance.session_stamp(tmp_path) == f"{st.st_mtime_ns // 1_000_000}:{st.st_size}"


def test_a_session_without_a_log_carries_no_stamp(tmp_path):
    assert provenance.source(tmp_path) == {}, (
        "ein erfundener Stempel waere schlimmer als keiner — ohne Stempel gilt die Datei"
    )


def test_model_reads_name_the_export_and_the_model(session, tmp_path):
    occluded_model.read_session("s", tmp_path / "run")

    head = json.loads((session / occluded_model.READS_FILE).read_text(encoding="utf-8").splitlines()[0])
    assert head["_source"] == {"log": provenance.session_stamp(session), "model": "run"}, (
        "die Kette sieht sonst nur, DASS gelesen wurde, nie WORAUF"
    )


def test_the_pass_report_names_the_export_it_ran_on(session, tmp_path, monkeypatch):
    monkeypatch.setattr(temporal_matte, "session_dir", lambda sid: (session, False))
    monkeypatch.setattr(temporal_matte.config, "DATA", type(temporal_matte.config.DATA)(tmp_path))

    path = temporal_matte.write_pass_report("rg-s", {"upserted": 3})

    report = json.loads(Path(path).read_text(encoding="utf-8"))
    assert report["upserted"] == 3
    assert report["_source"] == {"log": provenance.session_stamp(session)}
