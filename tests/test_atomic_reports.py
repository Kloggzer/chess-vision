"""Ein abgebrochener Lauf darf keine halbe Datei hinterlassen, die als fertig gelesen wird.

`hand_flags.write_flags` schreibt den GLOBALEN Bericht — eine getoetete Ausfuehrung beschaedigt die
Strittig-Lane fuer ALLE Sessions, und `present: true` verbirgt es. `occluded_model.read_session`
schreibt `model-reads.jsonl`, und die Kette prueft davon nur die EXISTENZ (`chain.ts`): eine halbe
Datei haelt die Sprosse fuer immer geschlossen. Beides ist `tmp` + `os.replace`, das Muster steht
in `sessions._write_log`.
"""
from __future__ import annotations

import json

import pytest

from chesslab import hand_flags


def _rows(n: int) -> list[dict]:
    return [{"session_id": "s", "frame": f"{i:06d}", "square": "e4", "fen_label": "wP",
             "model_cov": 0.8, "matte_cov": 0.0, "matted": True} for i in range(n)]


def test_a_killed_write_leaves_the_previous_report_intact(tmp_path, monkeypatch):
    path = tmp_path / "reports" / "hand-flags.jsonl"
    hand_flags.write_flags(path, _rows(3), {"_cut": 0.5})
    before = path.read_text(encoding="utf-8")

    # Der Schreiber stirbt mitten in der Datei — Platte voll, Prozess getoetet, egal.
    real = json.dumps
    calls = {"n": 0}

    def dies_halfway(obj, *a, **kw):
        calls["n"] += 1
        if calls["n"] > 3:
            raise OSError("no space left on device")
        return real(obj, *a, **kw)

    monkeypatch.setattr(hand_flags.json, "dumps", dies_halfway)

    with pytest.raises(OSError):
        hand_flags.write_flags(path, _rows(20), {"_cut": 0.5})

    assert path.read_text(encoding="utf-8") == before, (
        "der alte Bericht ist beschaedigt — und er gilt fuer ALLE Sessions, nicht nur diese")


def test_no_temp_file_survives_the_failure(tmp_path, monkeypatch):
    path = tmp_path / "reports" / "hand-flags.jsonl"
    hand_flags.write_flags(path, _rows(2), {"_cut": 0.5})
    real = json.dumps
    calls = {"n": 0}

    def dies_halfway(obj, *a, **kw):
        calls["n"] += 1
        if calls["n"] > 2:
            raise OSError("boom")
        return real(obj, *a, **kw)

    monkeypatch.setattr(hand_flags.json, "dumps", dies_halfway)
    with pytest.raises(OSError):
        hand_flags.write_flags(path, _rows(9), {"_cut": 0.5})

    leftovers = [p.name for p in path.parent.iterdir() if p.name != path.name]
    assert not leftovers, f"Reste im Berichtsverzeichnis: {leftovers}"


def test_a_clean_write_still_replaces_the_file(tmp_path):
    path = tmp_path / "reports" / "hand-flags.jsonl"
    hand_flags.write_flags(path, _rows(2), {"_cut": 0.5})

    hand_flags.write_flags(path, _rows(5), {"_cut": 0.7})

    lines = path.read_text(encoding="utf-8").splitlines()
    assert json.loads(lines[0])["_cut"] == 0.7
    assert len(lines) == 6, "Kopfzeile plus fuenf Zeilen"
