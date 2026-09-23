"""A3 Restpunkte (2026-09-23): kein menschliches Urteil geht an Export oder Trim verloren.

a) Ein `unusable` auf einem Frame, den der Export nicht mehr waehlt, lebte nur noch in der `.bak`.
   Der Export verweigert jetzt; `drop_verdicts=True` ist der ausdrueckliche Schalter.
b) `trim_session` verschob die Frames, BEVOR es das Log bewacht schrieb.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

from chesslab import config, ioutil, realgames, sessions

AFTER_1 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
AFTER_2 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"


@pytest.fixture
def game(tmp_path, monkeypatch) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    d = realgames.game_dir("g")
    d.mkdir(parents=True)
    payload = {
        "name": "g", "video": "g.mp4", "confirmed": True, "created_at": "2026-08-08T00:00:00Z",
        "clock": {"fps": 30.0},
        "geometry": {"corners": [[20, 20], [300, 20], [300, 220], [20, 220]], "margin": 0.0,
                     "board_size": 128, "frame_size": [320, 240]},
        "source": {"crop": {"cell": 16.0, "pad_side": 0.05, "out_size": [80, 80]}},
        "moves": [{"ply": i, "san": s, "frame": f, "fen_after": fen}
                  for i, (s, f, fen) in enumerate(zip(("e4", "e5", "Nf3"), (100, 400, 700),
                                                      (AFTER_1, AFTER_2, AFTER_2), strict=True), 1)],
        "reviewed_plies": [1, 2],
    }
    (d / "candidate.json").write_text(json.dumps(payload) + "\n", encoding="utf-8")
    (d / "video.mp4").write_bytes(b"")
    monkeypatch.setattr(realgames, "ensure_export_profile", lambda *_a: None)
    monkeypatch.setattr(realgames, "detect_rotation", lambda *_a: None)
    monkeypatch.setattr(realgames, "decode_frames", lambda _v, wanted, _out, rotate=None: set(wanted))
    return d


def _export(**kw) -> list[dict]:
    realgames.export_session("g", measure=False, fit=False, no_scan=True, workers=1, **kw)
    return sessions.read_log(realgames.game_dir("g"))


def _add_orphan(game: Path, **verdict) -> str:
    rows = sessions.read_log(game)
    ioutil.write_rows(game / "log.jsonl", [*rows, dict(rows[0], frame="frames/999999.png",
                                                        **verdict)])
    return (game / "log.jsonl").read_text(encoding="utf-8")


@pytest.mark.parametrize("verdict", [True, False])
def test_an_orphaned_verdict_refuses_the_export(game, monkeypatch, verdict):
    """`false` zaehlt mit: eine Ruecknahme ist ebenso ein Urteil, und nur die Zeile traegt sie."""
    _export()
    before = _add_orphan(game, unusable=verdict)
    decoded = []
    monkeypatch.setattr(realgames, "decode_frames",
                        lambda _v, wanted, _out, rotate=None: decoded.append(1) or set(wanted))
    with pytest.raises(realgames.VerdictsWouldDrop, match="999999"):
        _export()
    assert (game / "log.jsonl").read_text(encoding="utf-8") == before
    assert not decoded, "verweigert, bevor ein Brett angefasst wird"
    assert not realgames.export_interrupted(game)


def test_drop_verdicts_is_the_explicit_way_through(game, capsys):
    _export()
    _add_orphan(game, unusable=True)
    rows = _export(drop_verdicts=True)
    assert all(Path(r["frame"]).stem != "999999" for r in rows)
    out = capsys.readouterr().out
    assert "--drop-verdicts" in out and "999999" in out
    assert any("999999" in b.read_text(encoding="utf-8") for b in game.glob("log.jsonl.bak.*"))


def test_a_verdict_on_an_unpicked_frame_set_during_the_export_refuses(game, monkeypatch):
    """Die fruehe Pruefung sah kein Urteil; das frische Lesen vor dem Schreiben sieht es."""
    _export()
    _add_orphan(game)
    orphan = len(sessions.read_log(game)) - 1
    real = realgames.carry_repaired_geometry

    def carry_then_human_flags(session_dir, rows):
        got = real(session_dir, rows)
        sessions.flag_frame("rg-g", orphan, True)
        return got

    monkeypatch.setattr(realgames, "carry_repaired_geometry", carry_then_human_flags)
    with pytest.raises(realgames.VerdictsWouldDrop, match="999999"):
        _export()
    assert sessions.read_log(game, under_export=True)[orphan].get("unusable") is True


@pytest.fixture
def trimmable(tmp_path, monkeypatch):
    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    sdir = paths.sessions / "s1"
    (sdir / "frames").mkdir(parents=True)
    (sdir / "session.yaml").write_text(yaml.safe_dump({"session_id": "s1"}), encoding="utf-8")
    rows = [{"frame": f"frames/{i:04d}.png", "ply": i, "fen": "f"} for i in range(6)]
    ioutil.write_rows(sdir / "log.jsonl", rows)
    for i in range(6):
        (sdir / "frames" / f"{i:04d}.png").write_bytes(b"x")
    return paths, sdir


def test_a_verdict_during_the_trim_is_contested_and_nothing_moves(trimmable, monkeypatch):
    paths, sdir = trimmable
    real = sessions._reject_dir
    made = []

    def reject_dir_then_human_flags(p, sid):
        out = real(p, sid)
        made.append(out)
        sessions.flag_frame("s1", 1, True)
        return out

    monkeypatch.setattr(sessions, "_reject_dir", reject_dir_then_human_flags)
    with pytest.raises(ioutil.Contested):
        sessions.trim_session("s1", 3, paths)
    log = sessions.read_log(sdir)
    assert len(log) == 6 and log[1].get("unusable") is True
    assert sorted(p.name for p in (sdir / "frames").iterdir()) == [f"{i:04d}.png" for i in range(6)]
    assert not made[0].exists(), "der Reject-Ordner war nur Ablage und ist wieder weg"


def test_the_retried_trim_keeps_the_verdict(trimmable):
    paths, sdir = trimmable
    sessions.flag_frame("s1", 1, True)
    r = sessions.trim_session("s1", 3, paths)
    log = sessions.read_log(sdir)
    assert [Path(e["frame"]).stem for e in log] == ["0000", "0001", "0002"]
    assert log[1].get("unusable") is True
    assert (Path(r["reject_dir"]) / "frames" / "0005.png").exists()
