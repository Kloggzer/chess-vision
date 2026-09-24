"""Audit der Session-/Export-Module."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

from chesslab import config, session_lifecycle
from chesslab import sessions as S
from conftest import write_jsonl


def _recording(paths: config.Paths, name: str) -> Path:
    d = paths.recordings / name
    write_jsonl(d / "log.jsonl", [{"frame": "frames/000000.png", "ply": 1, "fen": "8/8/8/8/8/8/8/8",
                    "corners": [[0, 0], [10, 0], [10, 10], [0, 10]]}])
    (d / "session.yaml").write_text(
        yaml.safe_dump({"session_id": f"rg-{name}", "mode": "track", "profile": "export"}),
        encoding="utf-8")
    return d


# --- 1. Die drei Korpus-Sweeps sehen die Aufnahmen nicht -------------------------------------

@pytest.mark.parametrize("sweep", ["fit_mesh_all", "repair_mesh_all", "mark_hands_all"])
def test_the_all_sweeps_skip_every_recording(tmp_path, monkeypatch, sweep):
    """`sessions.py` iteriert in den drei `*_all` nur `paths.sessions` — der Korpus liegt in
    `paths.recordings`. `all_sessions()` existiert genau dafuer und warnt in seinem Docstring
    vor diesem Fehler ("wie `slice --all` keine der 43 Aufnahmen sah").

    Fix: die drei Sweeps ueber `all_sessions(paths)` laufen lassen statt ueber
    `paths.sessions.iterdir()` — das liefert auch die `rg-`-Id, die `session_dir` braucht.
    """
    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    _recording(paths, "2026-01-01-00-00-00")
    paths.sessions.mkdir(parents=True, exist_ok=True)

    seen = {row["session_id"] for row in getattr(S, sweep)(paths)}

    assert "rg-2026-01-01-00-00-00" in seen, (
        f"{sweep} hat die Aufnahme nicht einmal angefasst — der Sweep meldet "
        f"{seen or 'nichts'} und laesst den ganzen Aufnahme-Korpus stumm liegen.")


# --- 2. `trim_session` laesst das zweite Ledger stehen ----------------------------------------

def test_trim_session_also_purges_unusable_cells(tmp_path, monkeypatch):
    """`trim_session` raeumt `corrections.jsonl` und `matte.jsonl` fuer entfernte Frames,
    aber nicht `unusable-cells.jsonl` — dasselbe Ledger, derselbe Schluessel
    `(session_id, frame, square)` (`labeling.read_unusable_cells`).

    Die Frames heissen nach ihrem Quell-Index: ein Re-Export vergibt dieselben Stems wieder,
    und die stehengebliebenen Urteile unterdruecken dann stumm fremde Zellen.

    Fix: in `trim_session` denselben `_filter_jsonl_frames`-Aufruf auch fuer
    `unusable-cells.jsonl` ausfuehren.
    """
    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    sid = "s1"
    d = paths.sessions / sid
    write_jsonl(d / "log.jsonl", [{"frame": "frames/0000.png", "ply": 0, "fen": "f"},
                   {"frame": "frames/0001.png", "ply": 1, "fen": "f"}])
    (d / "session.yaml").write_text(yaml.safe_dump({"session_id": sid}), encoding="utf-8")
    for name, key in (("corrections.jsonl", {"label": "wK"}), ("unusable-cells.jsonl", {"unusable": True})):
        (d / name).write_text(
            json.dumps({"session_id": sid, "frame": "0001", "square": "e1", **key}) + "\n",
            encoding="utf-8")

    session_lifecycle.trim_session(sid, 1, paths)

    left = [json.loads(x) for x in
            (d / "unusable-cells.jsonl").read_text(encoding="utf-8").splitlines() if x.strip()]
    assert left == [], (
        "das `unusable`-Urteil zu Frame 0001 hat den Schnitt ueberlebt, waehrend die Korrektur "
        f"zur selben Zelle entfernt wurde: {left}")


# --- 3. `matte_status` haelt eine uebersprungene Matte fuer eine Matte -------------------------

def test_matte_status_counts_a_skipped_row_as_missing(tmp_path, monkeypatch):
    """`matte.matte_status` existiert, um die LUECKE zu finden ("ein Crop ohne Matte bekommt
    Coverage 0 und sieht aus wie ein freies Feld"). Es zaehlt aber jede Zeile mit `frame` als
    vorhanden — auch `{"skipped": "zone too big"}`, die gar keine `coverage` traegt.
    `labeling.read_matte` verwirft genau diese Zeile, der Frame hat also keine Matte.

    Fix: `have` auf Zeilen mit `coverage` einschraenken, wie `read_matte` es tut.
    """
    from chesslab import matte
    from chesslab.session_store.matte import read_matte

    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    name = "2026-01-02-00-00-00"
    d = paths.recordings / name
    write_jsonl(d / "log.jsonl", [{"frame": "frames/000001.png", "board": "dirty/000001.webp",
                    "dirty": True, "dirty_reason": "occluded", "ply": 1, "fen": "f"}])
    (d / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "ply": 1, "skipped": "zone too big"}) + "\n",
        encoding="utf-8")

    assert read_matte(d) == {}, "Vorbedingung: der Slice sieht hier keine Matte"

    status = matte.matte_status(name)

    assert status["missing"] == ["000001"] and status["matted"] == 0, (
        f"uebersprungene Zeile als Matte gezaehlt: {status}")


# --- 4. `ref_provisional` wird in jede Zeile geschrieben und von niemandem gelesen -------------

def test_ref_provisional_never_reaches_a_reader():
    """`_export_row` schreibt `ref_provisional: true` in die Log-Zeile. Gelesen wird es nirgends:
    weder in `src/`, `scripts/`, `tests/` noch im Labeler (`platform/app/lib/session.ts` mappt
    die Zeile Feld fuer Feld und kennt es nicht). TODO.md behauptet, es laufe "bis in den
    Export, damit der Labeler die Frames kennt" — die Kette endet an der Zeile.

    Fix: entweder den Leser nachziehen oder die zwei Zeilen in `_export_row` entfernen.
    """
    from datetime import datetime

    from chesslab.realgames.timeline import _export_row

    seg = {"ply": 3, "fen": "8/8/8/8/8/8/8/8 w - - 0 1", "ref_provisional": True}
    row = _export_row(seg, 42, [[0, 0], [1, 0], [1, 1], [0, 1]],
                      datetime(2026, 1, 1), 30.0, 30, None)

    assert "ref_provisional" not in row, (
        "die Zeile traegt ein Feld, das kein Leser auswertet — `grep -rn ref_provisional` "
        "findet nur den Schreiber in realgames.py und den Kotlin-Kandidaten.")
