"""`chesslab realgames confirm` stempelt seine Referenz wie `/confirm` und ersetzt kein
fremdes Urteil."""
from __future__ import annotations

import json

import pytest
import typer
from typer.testing import CliRunner

from chesslab import ioutil, realgames
from chesslab.cli import app

# BOM und CRLF: wer normalisiert statt die rohen Bytes zu hashen, rechnet hier etwas anderes.
PGN = b'\xef\xbb\xbf[Event "W2"]\r\n\r\n1. e4 e5 *\r\n'
PGN_MD5 = "5c6da1fbf57ec1d48056dff3958c2080"
WEB = {"confirmed": True, "confirmed_at": "2026-09-23T12:00:00Z", "reviewed_plies": [1, 2, 3]}


@pytest.fixture
def game(monkeypatch, tmp_path):
    gdir = tmp_path / "rec"
    gdir.mkdir()
    cand = {"name": "rec", "moves": [{"ply": i + 1, "san": s, "frame": 10 * (i + 1)}
                                     for i, s in enumerate(("e4", "e5", "Nf3"))]}
    (gdir / "candidate.json").write_text(json.dumps(cand, indent=2), encoding="utf-8")
    (gdir / "reference.pgn").write_bytes(PGN)
    monkeypatch.setattr(realgames, "game_dir", lambda name: gdir)
    return gdir


def _doc(gdir) -> dict:
    return json.loads((gdir / "candidate.json").read_text(encoding="utf-8"))


def test_the_cli_confirmation_stamps_the_raw_reference_bytes(game):
    res = CliRunner().invoke(app, ["realgames", "confirm", "rec", "--yes"])
    assert res.exit_code == 0, res.output
    doc = _doc(game)
    assert doc["confirmed_reference"] == {"md5": PGN_MD5, "at": doc["confirmed_at"]}


def test_without_a_reference_the_stamp_says_null(game):
    (game / "reference.pgn").unlink()
    realgames.write_confirmation("rec", _doc(game), [1])
    doc = _doc(game)
    assert doc["confirmed_reference"] == {"md5": None, "at": doc["confirmed_at"]}


def test_a_web_confirmation_during_the_prompt_survives_and_the_cli_refuses(game, monkeypatch):
    def web_confirms_meanwhile(*_a, **_k):
        (game / "candidate.json").write_text(json.dumps({**_doc(game), **WEB}, indent=2), encoding="utf-8")
        return False

    monkeypatch.setattr(typer, "confirm", web_confirms_meanwhile)
    res = CliRunner().invoke(app, ["realgames", "confirm", "rec"])

    assert res.exit_code == 1, res.output
    assert "candidate.json" in res.output
    doc = _doc(game)
    assert doc["reviewed_plies"] == [1, 2, 3]
    assert "confirmed_reference" not in doc


def test_write_json_guarded_refuses_a_moved_stamp_and_leaves_no_side_file(tmp_path):
    path = tmp_path / "c.json"
    path.write_text('{"a": 1}\n', encoding="utf-8")
    stamp = ioutil.stamp_of(path)
    path.write_text('{"a": 2, "human": true}\n', encoding="utf-8")
    with pytest.raises(ioutil.Contested):
        ioutil.write_json_guarded(path, {"a": 3}, stamp, what="x")
    assert json.loads(path.read_text(encoding="utf-8")) == {"a": 2, "human": True}
    assert [p.name for p in tmp_path.iterdir()] == ["c.json"]
    ioutil.write_json_guarded(path, {"a": 3}, ioutil.stamp_of(path), what="x")
    assert json.loads(path.read_text(encoding="utf-8")) == {"a": 3}
