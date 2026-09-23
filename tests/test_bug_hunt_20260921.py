"""Der Geberpool fuers Mesh (ohne Handframes) und der Riegel gegen das zweite Geradeziehen."""
from __future__ import annotations

import cv2
import numpy as np
import pytest

from chesslab import config, session_boards, sessions
from chesslab.realgames.mesh import meshes_for_boards
from chesslab.session_store.log import EXPORT_MARKER
from conftest import write_jsonl

BS, BORDER, TILT, SHIFT = 400, 20, 0.04, 0.02
EIGHTHS = [k / 8.0 for k in range(9)]


def _lines(shift: float) -> dict:
    return {"x": [e + shift for e in EIGHTHS], "y": list(EIGHTHS),
            "tx": [TILT] * 9, "ty": [0.0] * 9}


def _row(idx: int, shift: float | None, reason: str | None = None) -> dict:
    row = {"frame": f"frames/{idx:06d}.png", "board": f"boards/{idx:06d}.webp",
           "board_size": BS, "board_border": BORDER,
           "corners": [[0, 0], [BS, 0], [BS, BS], [0, BS]]}
    if shift is not None:
        row["grid_lines"] = _lines(shift)
    if reason is not None:
        row["dirty"], row["dirty_reason"] = True, reason
    return row


def test_a_gate_flagged_frame_gives_no_mesh_to_the_pool():
    """Die Rillen benennen Felder, das Gate benennt nur den Frame: eine `occluded`-Zeile traegt
    kein `hand_squares` und kam damit als sauberer Geber durch."""
    rows = ([_row(i, 0.0) for i in (0, 3, 6)]
            + [_row(i, SHIFT, reason="occluded") for i in (9, 12, 15)])
    assert meshes_for_boards(rows)[0].x == pytest.approx(EIGHTHS)


def test_a_late_hand_gives_no_mesh_to_the_pool():
    """`grid-late` ist der Fit-Befund selbst — die Zeile, bei der `skin_patch` die Hand sieht und
    die Rillen kein Feld benennen (263 von 7 358 Frames, 2026-08-16)."""
    rows = ([_row(i, 0.0) for i in (0, 3, 6)]
            + [_row(i, SHIFT, reason="grid-late") for i in (9, 12, 15)])
    assert meshes_for_boards(rows)[0].x == pytest.approx(EIGHTHS)


def test_a_mesh_gap_is_filled_from_clean_frames_only():
    """`_fill_mesh_gaps` nimmt die fuenf naechsten GEMESSENEN — gemessen heisst nicht sauber."""
    rows = ([_row(i, 0.0) for i in range(5)]
            + [_row(5 + i, SHIFT, reason="occluded") for i in range(5)]
            + [_row(10, None)])
    assert sessions._fill_mesh_gaps(rows) == 1
    assert rows[-1]["grid_lines"]["x"] == pytest.approx(EIGHTHS)


def _store(tmp_path, monkeypatch, rows: list[dict]):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = config.DATA.recordings / "rec"
    (sdir / "boards").mkdir(parents=True)
    for row in rows:
        cv2.imwrite(str(sdir / row["board"]),
                    np.zeros((BS + 2 * BORDER, BS + 2 * BORDER, 3), np.uint8))
    (sdir / "session.yaml").write_text("session_id: rg-rec\nprofile: t\n", encoding="utf-8")
    write_jsonl(sdir / "log.jsonl", rows)
    monkeypatch.setattr(session_boards, "session_dir", lambda sid, paths=None: (sdir, False))
    return sdir


def test_an_interrupted_export_stops_the_straightening(tmp_path, monkeypatch):
    """Der Marker sagt: Bretter neu, Log alt. Genau dann fehlt `board_straightened` auf Brettern,
    die der Export schon gerade geschrieben hat — und dieser Aufruf zieht sie ein zweites Mal."""
    rows = [_row(i * 3, 0.0) for i in range(3)]
    sdir = _store(tmp_path, monkeypatch, rows)
    (sdir / EXPORT_MARKER).write_text("export started\n", encoding="utf-8")

    with pytest.raises(sessions.NothingToDo, match="export"):
        session_boards.straighten_boards_session("rg-rec")


def test_a_killed_straightening_leaves_the_marker(tmp_path, monkeypatch):
    """Ohne Marker sieht niemand mehr, dass das Log juenger sein muesste als die Bretter."""
    from chesslab import calibration

    rows = [_row(i * 3, 0.0) for i in range(3)]
    sdir = _store(tmp_path, monkeypatch, rows)
    monkeypatch.setattr(calibration, "straighten_board",
                        lambda *a, **kw: (_ for _ in ()).throw(KeyboardInterrupt("killed")))
    with pytest.raises(KeyboardInterrupt):
        session_boards.straighten_boards_session("rg-rec")
    assert (sdir / EXPORT_MARKER).is_file()


def test_a_row_without_corners_gets_no_carried_mesh():
    """Mutationsprobe 2026-09-21: die Bedingung war ungedeckt. Ohne Ecken warpt nichts, ein Mesh
    auf so einer Zeile beschriebe ein Brett, das es nicht gibt."""
    rows = [_row(i, 0.0) for i in range(5)] + [_row(5, None)]
    rows[-1].pop("corners")
    assert sessions._fill_mesh_gaps(rows) == 0
    assert "grid_lines" not in rows[-1]
