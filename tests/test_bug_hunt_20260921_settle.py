"""Stille Rueckfallebenen, die einen UNGEMESSENEN Fall als gemessenen ausgeben."""

import json

import cv2
import numpy as np
import yaml

from chesslab import config, session_boards, sessions
from chesslab.calibration import CalibrationProfile, crop_border_px, profile_path
from chesslab.session_store import recording as store_rec
from conftest import make_profile, write_jsonl

SIDE = 320
CELL = SIDE // 8


def _profile(bs: int = SIDE) -> CalibrationProfile:
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    return make_profile(bs, corners=corners, profile="t", out_size=(32, 32))


def test_the_settle_scan_keeps_an_unmeasured_hand_frame_out_of_the_reference(
        tmp_path, monkeypatch):
    """`settle_for_ply` haelt ungemessene dirty-Frames aus dem Median — der AUFRUFER hob das auf.

    `settle_scan_session` baute die Matte als `{stem: matte.get(stem, {}) ...}` ueber ALLE Zeilen
    des Plys. Damit trug jeder Stem einen Schluessel, `set(mattes)` war die ganze Reihe, und die
    Menge der ungemessenen Frames war per Konstruktion leer: ein nie gemattetes Hand-Brett galt
    als "gemessen, nichts verdeckt" und ging in die gesetzte Stellung ein.
    """
    prof = _profile()
    pad = crop_border_px(prof)
    side = SIDE + 2 * pad
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = store_rec.game_dir("s1")
    (sdir / "boards").mkdir(parents=True)

    rows = []
    #: Fuenf saubere Frames sind genau `SETTLE_MIN_FRAMES`, sechs Hand-Frames die MEHRHEIT der elf.
    for i in range(11):
        board = np.full((side, side, 3), 90, np.uint8)
        hand = i >= 5
        if hand:
            board[pad:pad + CELL, pad:pad + CELL // 2] = 200
        assert cv2.imwrite(str(sdir / "boards" / f"{i:06d}.png"), board)
        rows.append({"frame": f"frames/{i:06d}.png", "board": f"boards/{i:06d}.png", "ply": 1,
                     "fen": "8/8/8/8/8/8/8/8 w - - 0 1", "corners": prof.image_corners,
                     "board_size": SIDE, "board_border": pad,
                     **({"dirty": True, "dirty_reason": "occluded"} if hand else {})})
    write_jsonl(sdir / "log.jsonl", rows)
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "rg-s1", "profile": "t", "mode": "track"}), encoding="utf-8")
    # SAM hat nur die sauberen gemessen; die Hand-Frames fehlen in der Datei.
    (sdir / "matte.jsonl").write_text(
        "".join(json.dumps({"frame": f"{i:06d}", "coverage": {}}) + "\n" for i in range(5)),
        encoding="utf-8")
    prof.save(profile_path("t"))

    session_boards.settle_scan_session("rg-s1")

    from chesslab.labeling import SETTLE_LIMIT, all_squares
    from chesslab.session_store.log import read_log_rows as read_log

    a8 = all_squares().index("a8")
    first = next(r for r in read_log(sdir) if r["frame"] == "frames/000000.png")
    assert first["settle_dev"][a8] < SETTLE_LIMIT, (
        "die ungemessenen Hand-Bretter stehen im Median: ein sauberer Frame weicht jetzt von der "
        "'gesetzten' Stellung ab")


def test_the_teacher_set_reads_the_matte_as_a_history(tmp_path, monkeypatch) -> None:
    """`matte.jsonl` ist eine HISTORIE (Punkt 28) — `gate_rows` las jede Zeile einzeln.

    Eine spaetere Absage von SAM (`skipped`, ohne `coverage`) verdraengte die fruehere Messung
    nicht: das Brett lehrte den Schueler weiter als Hand. Und zwei Messungen desselben Frames
    gingen zweimal in den Satz, was den Nenner jeder Karte verschiebt.
    """
    from tests.test_gate_respects_the_human import _corpus, _hand

    from chesslab import hand_gate

    monkeypatch.setattr(config, "DATA", _corpus(
        tmp_path,
        [_hand("000001"), _hand("000002"),
         {"frame": "000001", "skipped": "zone too big"},
         _hand("000002")],
        []))

    rows = hand_gate.gate_rows()

    assert [r["stem"] for r in rows] == ["000002"], (
        "die zurueckgenommene Messung lehrt weiter, und die doppelte zaehlt doppelt")


def test_the_alignment_scan_drops_the_number_it_could_not_measure(tmp_path, monkeypatch) -> None:
    """Ein Frame, den `worst_offset` nicht lesen kann (Hand auf den Rillen), behielt die
    `align_worst_px` des vorigen Laufs — und der Bericht mittelte sie mit den frischen.

    `measured` zaehlte nur die neu gemessenen, `median`/`max` aber JEDE Zeile mit einer Zahl: zwei
    Nenner auf einer Zeile, und der Median beschrieb einen Lauf, den es so nie gab. `merge_fit_stats`
    haelt auf der Export-Seite genau deshalb `FIT_FAILED`-Zeilen heraus.
    """
    prof = _profile()
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = store_rec.game_dir("s1")
    (sdir / "frames").mkdir(parents=True)
    rows = []
    for i in range(4):
        # Ein leeres Bild: keine Rillen, also misst `worst_offset` NaN.
        assert cv2.imwrite(str(sdir / "frames" / f"{i:06d}.png"),
                           np.full((SIDE, SIDE, 3), 90, np.uint8))
        rows.append({"frame": f"frames/{i:06d}.png", "corners": prof.image_corners,
                     "align_worst_px": 99.0})
    write_jsonl(sdir / "log.jsonl", rows)
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "rg-s1", "profile": "t", "mode": "track"}), encoding="utf-8")
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)

    got = sessions.scan_alignment("rg-s1")

    assert got["measured"] == 0, "das Fixture muss wirklich unmessbar sein"
    assert got["median"] is None and got["max"] is None, (
        f"der Bericht meldet {got['median']} aus Zahlen des VORIGEN Laufs")


def _geometry_session(tmp_path, monkeypatch, rows):
    prof = _profile()
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = store_rec.game_dir("s1")
    (sdir / "frames").mkdir(parents=True)
    for r in rows:
        assert cv2.imwrite(str(sdir / r["frame"]), np.full((SIDE, SIDE, 3), 90, np.uint8))
    write_jsonl(sdir / "log.jsonl", rows)
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "rg-s1", "profile": "t", "mode": "track"}), encoding="utf-8")
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)
    return sdir, prof


def test_an_adopted_quad_does_not_keep_the_previous_quads_alignment(tmp_path, monkeypatch) -> None:
    """`align_worst_px` beschreibt EINEN Quad — wird der ersetzt, ist die Zahl nicht mehr gemessen.

    `write_corner_rows` schrieb den fremden Quad und liess die Zahl stehen. Damit trug eine Zeile
    eine Ausrichtung, die nie an ihren Ecken gemessen wurde, und jeder Leser (Badge, `median`,
    `carry_repaired_geometry` ueber `REPAIRED_KEYS`) las sie als frisch.
    """
    prof = _profile()
    rows = [{"frame": f"frames/{i:06d}.png", "corners": prof.image_corners,
             "align_worst_px": 2.5} for i in range(3)]
    sdir, _prof = _geometry_session(tmp_path, monkeypatch, rows)

    sessions.adopt_corners("rg-s1", from_index=0, scope="all", overwrite=True)

    from chesslab.session_store.log import read_log

    moved = [r for r in read_log(sdir) if r.get("corners_source") == "adopted"]
    assert moved, "das Fixture hat keinen Quad ersetzt"
    assert all("align_worst_px" not in r for r in moved), (
        "die Zeilen tragen die Ausrichtung des ERSETZTEN Quads weiter")


def test_the_autofix_reports_the_alignment_of_the_quad_it_wrote(tmp_path, monkeypatch) -> None:
    """Nach `autofix` stand die Zahl des Quads davor in der Zeile — genau die, die den Fix
    ausgeloest hat. `improve_quad` misst `after` an derselben Stelle; das ist die gemessene Zahl
    des neuen Quads, wie sie `fit_rows_to_grid` schreibt."""
    prof = _profile()
    better = [[1.0, 1.0], [SIDE, 0.0], [SIDE, SIDE], [0.0, SIDE]]
    rows = [{"frame": "frames/000000.png", "corners": prof.image_corners,
             "align_worst_px": 12.0}]
    sdir, _prof = _geometry_session(tmp_path, monkeypatch, rows)
    monkeypatch.setattr("chesslab.alignment.worst_offset", lambda *a, **k: 12.0)
    monkeypatch.setattr(sessions, "autofix_one", lambda _sdir, _entry: (better, 12.0, 1.4))

    got = sessions.autofix_corners("rg-s1")

    from chesslab.session_store.log import read_log

    assert got["changed"] == 1, got
    assert read_log(sdir)[0]["align_worst_px"] == 1.4, (
        "die Zeile meldet die Ausrichtung des Quads von VORHER")
