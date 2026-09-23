"""`adopt-dirty` gleicht das Log gegen die Notizen ab — auch in Richtung Widerruf (Review 2026-09-23)."""

import json

import pytest

from chesslab import config


def _session(tmp_path, monkeypatch, *, extra=None):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = config.DATA.recordings / "g"
    (sdir / "boards").mkdir(parents=True)
    (sdir / "session.yaml").write_text("session_id: rg-g\nprofile: desktop\n", encoding="utf-8")
    rows = [{"frame": f"frames/{i:06d}.png", "board": f"boards/{i:06d}.webp", "ply": 1, "fen": "x"}
            for i in (144, 900)]
    rows.append({"frame": "frames/001000.png", "board": "dirty/001000.webp", "ply": 1, "fen": "x",
                 "dirty": True, "dirty_reason": "occluded", **(extra or {})})
    (sdir / "dirty").mkdir()
    for r in rows:
        (sdir / r["board"]).write_bytes(b"x")
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    notes = config.DATA.labels / "review-notes.jsonl"
    notes.parent.mkdir(parents=True, exist_ok=True)
    return sdir, notes


def _rows(sdir):
    return [json.loads(x) for x in (sdir / "log.jsonl").read_text(encoding="utf-8").splitlines()]


def test_a_retracted_report_leaves_the_log_and_the_pile(tmp_path, monkeypatch):
    from chesslab.realgames import adopt_reported_dirty

    sdir, notes = _session(tmp_path, monkeypatch)
    notes.write_text(json.dumps({"session_id": "rg-g", "frame": "000144", "verdict": "dirty-frame"}) + "\n",
                     encoding="utf-8")
    assert adopt_reported_dirty("g")["changed"] == 1
    assert (sdir / "dirty" / "000144.webp").is_file()

    notes.write_text("", encoding="utf-8")
    res = adopt_reported_dirty("g")
    rows = _rows(sdir)
    assert res["changed"] == 1, "BUG: ein Widerruf nach dem Lauf laesst dirty=true stehen"
    assert not any(k in rows[0] for k in ("dirty", "dirty_reason", "dirty_source", "dirty_set_at"))
    assert rows[0]["board"] == "boards/000144.webp" and (sdir / "boards" / "000144.webp").is_file()
    # Der Scan hat 001000 gemessen, kein Mensch gemeldet: das bleibt.
    assert rows[2]["dirty"] is True and rows[2]["board"] == "dirty/001000.webp"


def test_only_what_the_report_set_is_taken_back(tmp_path, monkeypatch):
    from chesslab.realgames import adopt_reported_dirty

    sdir, notes = _session(tmp_path, monkeypatch, extra={"dirty_source": "scan"})
    notes.write_text("", encoding="utf-8")
    assert adopt_reported_dirty("g")["changed"] == 0
    assert _rows(sdir)[2]["dirty"] is True


def test_refuses_under_an_interrupted_export(tmp_path, monkeypatch):
    from chesslab.realgames import EXPORT_MARKER, adopt_reported_dirty

    sdir, notes = _session(tmp_path, monkeypatch)
    notes.write_text(json.dumps({"session_id": "rg-g", "frame": "000144", "verdict": "dirty-frame"}) + "\n",
                     encoding="utf-8")
    (sdir / EXPORT_MARKER).write_text("export started x\n", encoding="utf-8")
    before = (sdir / "log.jsonl").read_bytes()
    with pytest.raises(ValueError, match="export"):
        adopt_reported_dirty("g")
    assert (sdir / "log.jsonl").read_bytes() == before
    assert (sdir / "boards" / "000144.webp").is_file()
