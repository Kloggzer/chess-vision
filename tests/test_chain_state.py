"""`chain_state`: was die Web-Kette seit 2026-09-23 von Python liest (`docs/web-ruft-python.md`, Schritt 2).

Die Lesefehler-Faelle standen als fs-Mocks in `platform/app/lib/chain/chain.test.ts`; ein TS-Mock
erreicht Python nicht, also stehen sie hier. Nur FEHLEND ist "nie gelaufen" — jeder andere Fehler wirft.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from chesslab import chain_state, config, provenance
from chesslab.session_store import recording
from conftest import write_jsonl

NAME = "g"


@pytest.fixture
def game(monkeypatch, tmp_path) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    chain_state._CACHE.clear()
    gdir = recording.game_dir(NAME)
    gdir.mkdir(parents=True)
    write_jsonl(gdir / "log.jsonl", [
        {"frame": f"{i}.png", "board": f"dirty/{i}.webp", "ply": 1, "dirty": True,
         "dirty_reason": "occluded", "settle_dev": [1.0]} for i in range(5)])
    return gdir


def _status(model: str | None = None) -> dict:
    return chain_state.chain_status(NAME, target=80, model=model)


def _deny(monkeypatch, suffix: str) -> None:
    """EACCES auf jede Datei, die auf `suffix` endet — fuer `stat` UND `open`."""
    real_stat, real_open = Path.stat, Path.open

    def stat(self, *a, **k):
        if str(self).endswith(suffix):
            raise PermissionError(13, "EACCES", str(self))
        return real_stat(self, *a, **k)

    def open_(self, *a, **k):
        if str(self).endswith(suffix):
            raise PermissionError(13, "EACCES", str(self))
        return real_open(self, *a, **k)

    monkeypatch.setattr(Path, "stat", stat)
    monkeypatch.setattr(Path, "open", open_)


def test_a_fresh_recording_reads_as_exported_and_settled(game):
    got = _status()
    assert got["session"] == {"exported": True, "settled": True, "interrupted": False}
    assert got["mattes"]["total"] == 5 and got["pass"]["state"] == "absent" and got["reads"]["state"] == "absent"


@pytest.mark.parametrize("suffix", ["log.jsonl", "model-reads.jsonl", "pass.json", "p.yaml"])
def test_a_read_error_is_no_absence(game, monkeypatch, suffix):
    stamp = provenance.file_stamp(game / "log.jsonl")
    (game / "model-reads.jsonl").write_text(json.dumps({"_source": {"log": stamp}}) + "\n", encoding="utf-8")
    (game / "session.yaml").write_text("session_id: rg-g\nprofile: p\n", encoding="utf-8")
    config.DATA.calibration.mkdir(parents=True)
    (config.DATA.calibration / "p.yaml").write_text("margin: 0.045\n", encoding="utf-8")
    pass_file = chain_state.pass_path(NAME)
    pass_file.parent.mkdir(parents=True)
    pass_file.write_text(json.dumps({"_source": {"log": stamp},
                                     "_inputs": {"scan": [["profile:p", 14, 1]]}}), encoding="utf-8")
    _deny(monkeypatch, suffix)
    with pytest.raises(PermissionError):
        _status()


def test_a_half_written_head_closes_no_rung(game):
    (game / "model-reads.jsonl").write_text('{"_model": "runs/p4a-80-cl', encoding="utf-8")
    chain_state.pass_path(NAME).parent.mkdir(parents=True)
    chain_state.pass_path(NAME).write_text('{"_source": {"log"', encoding="utf-8")
    got = _status()
    assert got["reads"]["state"] == "absent" and got["pass"]["state"] == "absent"


def test_an_empty_reads_file_is_no_run(game):
    (game / "model-reads.jsonl").write_text("", encoding="utf-8")
    assert _status()["reads"]["state"] == "absent"


def test_an_unstamped_run_under_another_model_still_counts(game):
    """Altbestand ohne Log-Stempel gilt weiter — erst ein Stempel macht das Modell vergleichbar."""
    (game / "model-reads.jsonl").write_text(json.dumps({"_source": {"model": "p4-128"}}) + "\n", encoding="utf-8")
    assert _status("runs/p4a-80-clahe")["reads"]["state"] == "fresh"
    stamp = provenance.file_stamp(game / "log.jsonl")
    (game / "model-reads.jsonl").write_text(json.dumps({"_source": {"log": stamp, "model": "p4-128"}}) + "\n",
                                            encoding="utf-8")
    assert _status("runs/p4a-80-clahe")["reads"] == {"state": "other_model", "model": "p4-128"}


def test_the_board_files_are_not_statted_for_the_pass(game, monkeypatch):
    """Nur Profil und `session.yaml`: das Log prueft `_source`, und jedes Brett-Schreiben schreibt es."""
    stamp = provenance.file_stamp(game / "log.jsonl")
    chain_state.pass_path(NAME).parent.mkdir(parents=True)
    chain_state.pass_path(NAME).write_text(json.dumps({
        "_source": {"log": stamp}, "_inputs": {"scan": [["dirty/0.webp", 1, 1]]}}), encoding="utf-8")
    assert _status()["pass"] == {"state": "fresh", "inputs_known": True}


def test_an_interrupted_export_is_neither_exported_nor_settled(game):
    (game / ".export-running").write_text("", encoding="utf-8")
    assert _status()["session"] == {"exported": False, "settled": False, "interrupted": True}


def test_the_cache_follows_the_file(game):
    assert _status()["mattes"]["done"] == 0
    write_jsonl(game / "matte.jsonl", [{"frame": "0", "coverage": {}}])
    os.utime(game / "matte.jsonl", (1, 1))
    assert _status()["mattes"]["done"] == 1


@pytest.mark.parametrize(("doc", "md5", "want"), [
    ({"confirmed_at": "t", "confirmed_reference": {"md5": "a", "at": "t"}}, "a", "same"),
    ({"confirmed_at": "t", "confirmed_reference": {"md5": "a", "at": "t"}}, "b", "moved"),
    ({"confirmed_at": "t", "confirmed_reference": {"md5": None, "at": "t"}}, None, "same"),
    ({"confirmed_at": "t", "confirmed_reference": {"at": "t"}}, None, "moved"),
    ({"confirmed_at": "u", "confirmed_reference": {"md5": "a", "at": "t"}}, "a", "unknown"),
    ({"confirmed_at": "t"}, "a", "unknown"),
])
def test_confirmation_against(doc, md5, want):
    assert recording.confirmation_against(doc, md5) == want


@pytest.mark.parametrize("value", [
    "boards/000117.webp", r"a\b\c.png", "000001", "x.tar.gz", ".hidden", "name.", "a/b/", "a/.", "..", "",
    "dir/.png", "a//b.c", "C:/x/y.z", 3, None, "a.b/c", " sp .x", "a/..", "x..y",
])
def test_the_fast_stem_is_paths_stem(value):
    assert chain_state._stem(value) == Path(str(value).replace("\\", "/")).stem
