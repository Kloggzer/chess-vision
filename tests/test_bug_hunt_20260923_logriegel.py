"""H5-Nebenbefund: ein Re-Export ersetzte das Log und liess `unusable` still fallen (2026-09-23).

Das Urteil setzt ein Mensch (`sessions.flag_frame`, `lib/frame-flag.ts`) nur im Log; kein Ledger
haelt es. Die Tests fahren den Weg der CLI (`realgames.export_session`), nur Video und Profil ersetzt.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

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


def _export() -> list[dict]:
    realgames.export_session("g", measure=False, fit=False, no_scan=True, workers=1)
    return sessions.read_log(realgames.game_dir("g"))


def _by_stem(rows: list[dict]) -> dict[str, dict]:
    return {Path(r["frame"]).stem: r for r in rows}


def test_a_re_export_keeps_the_human_unusable(game):
    first = _export()
    sessions.flag_frame("rg-g", 0, True)
    sessions.flag_frame("rg-g", 1, False)
    again = _by_stem(_export())
    assert again[Path(first[0]["frame"]).stem].get("unusable") is True
    assert again[Path(first[1]["frame"]).stem].get("unusable") is False, (
        "ein ausdrueckliches `false` ist auch ein Urteil (zurueckgenommen)")
    assert sum("unusable" in r for r in again.values()) == 2


def test_a_verdict_set_while_the_export_runs_survives(game, monkeypatch):
    """Der Export liest das alte Log fuer die Geometrie und schreibt Minuten spaeter."""
    first = _export()
    real = realgames.carry_repaired_geometry

    def carry_then_human_flags(session_dir, rows):
        got = real(session_dir, rows)
        sessions.flag_frame("rg-g", 2, True)
        return got

    monkeypatch.setattr(realgames, "carry_repaired_geometry", carry_then_human_flags)
    again = _by_stem(_export())
    assert again[Path(first[2]["frame"]).stem].get("unusable") is True


def test_a_write_racing_the_log_swap_is_contested(game, monkeypatch):
    """Im letzten Fenster (gelesen, noch nicht umgehaengt) hilft nur der Riegel."""
    _export()
    real = sessions.backup_log
    fired = []

    def backup_then_human_flags(path):
        name = real(path)
        if not fired:
            fired.append(1)
            sessions.flag_frame("rg-g", 0, True)
        return name

    monkeypatch.setattr(sessions, "backup_log", backup_then_human_flags)
    with pytest.raises(ioutil.Contested):
        _export()
    assert sessions.read_log(game, under_export=True)[0].get("unusable") is True


def test_a_verdict_without_a_new_row_is_named(game, capsys):
    rows = _export()
    orphan = dict(rows[0], frame="frames/999999.png", unusable=True)
    ioutil.write_rows(game / "log.jsonl", [*rows, orphan])
    realgames.export_session("g", measure=False, fit=False, no_scan=True, workers=1,
                             drop_verdicts=True)
    out = capsys.readouterr().out
    assert "999999" in out and "unusable" in out
