"""Punkt 28 ("die juengere Zeile gewinnt") hat drei Stellen bekommen und zwei ausgelassen.

`labeling.read_matte`, `temporal_matte.sam_matte` und `hand_flags.measured_coverage` verwerfen
eine fruehere Messung, wenn SAM den Frame spaeter absagt. `matte.matte_status` und
`temporal_matte.adopt_proposals` fragen weiterhin nur, OB irgendeine Zeile `coverage` traegt.
Beide Tests hier fallen auf dem Code von heute.
"""

from __future__ import annotations

import json
from pathlib import Path

import yaml

from chesslab import config


def _write_log(directory: Path, rows: list[dict]) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "log.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")


def test_matte_status_counts_a_measured_then_cancelled_frame_as_matted(tmp_path, monkeypatch):
    """`--frames` haengt an: eine Absage NACH einer Messung ist genau der Fall, fuer den
    `labeling.read_matte` seit `cab16d50` die juengere Zeile gewinnen laesst. `matte_status`
    meldet den Frame trotzdem als gemattet und verschweigt damit die Luecke, die es melden soll.
    """
    from chesslab import matte
    from chesslab.labeling import read_matte

    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    name = "2026-01-02-00-00-00"
    d = paths.recordings / name
    _write_log(d, [{"frame": "frames/000001.png", "board": "dirty/000001.webp",
                    "dirty": True, "dirty_reason": "occluded", "ply": 1, "fen": "f"}])
    (d / "session.yaml").write_text(
        yaml.safe_dump({"session_id": f"rg-{name}", "mode": "track", "profile": "export"}),
        encoding="utf-8")
    (d / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "ply": 1, "coverage": {"a1": 0.0}}) + "\n"
        + json.dumps({"frame": "000001", "ply": 1, "skipped": "zone too big"}) + "\n",
        encoding="utf-8")

    assert read_matte(d) == {}, "Vorbedingung: der Slice sieht hier keine Matte"

    status = matte.matte_status(name)

    assert status["missing"] == ["000001"] and status["matted"] == 0, (
        f"die spaetere Absage wurde als Matte gezaehlt: {status}")


def test_sam_matte_and_the_adopt_gate_disagree_about_a_cancelled_frame(tmp_path):
    """`adopt_proposals` baut sein `have` selbst (`coverage is not None` ueber alle Zeilen)

    statt `sam_matte` zu fragen, das die Regel traegt. Genau das ist die Coverage-Matte-Falle:
    der Frame gilt als "schon gemattet", bekommt kein Alpha und geht mit `coverage = 0.0`
    ins Training.
    """
    from chesslab.ioutil import read_jsonl
    from chesslab.temporal_matte import matted_frames, sam_matte

    d = tmp_path / "rec"
    d.mkdir()
    (d / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a1": 0.0}}) + "\n"
        + json.dumps({"frame": "000001", "skipped": "zone too big"}) + "\n",
        encoding="utf-8")

    rows = read_jsonl(d / "matte.jsonl")
    kept_rows = [r for r in rows if r.get("source") != "temporal"]
    have = matted_frames(kept_rows)                                          # adopt_proposals

    assert have == set(sam_matte(d)), (
        f"`adopt_proposals` haelt {have} fuer gemattet, `sam_matte` {set(sam_matte(d))}")


def test_append_rows_throws_away_a_row_that_read_jsonl_accepts(tmp_path):
    """Die zwei Haelften der Treuhand sind sich uneins, wo eine Zeile endet.

    Ein Schreiber, der zwischen dem `\r` und dem `\n` stirbt, laesst `...{"b": 2}\r` zurueck.
    `read_jsonl` liest diese Zeile (im `newline=""`-Modus ist ein blankes `\r` ein Umbruch),
    die Schwanz-Reparatur in `append_rows` schneidet nur an `\n` und wirft sie weg. Bei 1127
    CRLF-Dateien ist das der haeufigste Abrissort, nicht der seltenste.
    """
    from chesslab.ioutil import append_rows, read_jsonl

    p = tmp_path / "torn_at_the_cr.jsonl"
    p.write_bytes(b'{"a": 1}\r\n{"b": 2}\r')
    before = read_jsonl(p)
    assert before == [{"a": 1}, {"b": 2}], before

    append_rows(p, [{"c": 3}])

    assert read_jsonl(p) == [{"a": 1}, {"b": 2}, {"c": 3}], (
        f"eine vollstaendige Zeile ging beim Anhaengen verloren: {read_jsonl(p)}")
