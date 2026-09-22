"""Bug-Jagd 2026-09-22 ueber Frame-Auswahl, Hand-Gate und Matte.

Dieselbe Familie wie die Vorfaelle davor: etwas UNGEMESSENES wird als gemessener Normalwert
weitergereicht. Jeder Test hier faellt auf dem Code von vorher.
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
import pytest
import yaml

from chesslab import config
from chesslab.ioutil import read_jsonl


def _paths(tmp_path: Path) -> config.Paths:
    return config.Paths(root=tmp_path / "data")


# --- 1. matte.alpha_worker haengt roh an -------------------------------------------------

def _session_for_worker(paths: config.Paths, monkeypatch, stems: list[str]) -> Path:
    """Eine Aufnahme, in der `alpha_worker` ohne SAM bis zum Anhaengen laeuft."""
    from chesslab import matte

    rec = paths.recordings / "r1"
    (rec / "boards").mkdir(parents=True)
    rows = []
    for stem in stems:
        assert cv2.imwrite(str(rec / "boards" / f"{stem}.png"), np.zeros((8, 8, 3), np.uint8))
        rows.append({"frame": f"frames/{stem}.png", "board": f"boards/{stem}.png",
                     "dirty": True, "dirty_reason": "occluded"})
    (rec / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    monkeypatch.setattr(matte, "read_log", lambda _d: rows)
    monkeypatch.setattr(matte, "read_session_meta", lambda _d: {"profile": "p"})
    monkeypatch.setattr(matte, "usable_board", lambda *_a: True)
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda _n: object())
    monkeypatch.setattr(matte, "alpha_sam3",
                        lambda _b: (np.zeros((8, 8), np.float32), {"hand": 0.9}))
    monkeypatch.setattr(matte, "coverage_of", lambda *_a: {"a1": 0.0})
    return rec


def test_the_alpha_worker_does_not_glue_its_row_onto_a_torn_tail(tmp_path, monkeypatch):
    """Ein abgerissener Schwanz ist eine NICHT geschriebene Messung, keine Zeile zum Anwachsen.

    `alpha_worker` haengt ueber Minuten an `matte.jsonl` an und verlaesst den Prozess mit
    `os._exit` (`exit_with_parent`, und der CLI-Zweig am Ende) — die letzte Zeile bricht dabei
    erwartbar mitten im Puffer ab. `read_jsonl` verzeiht genau diesen Schwanz; wer blind
    anhaengt, macht daraus Korruption MITTENDRIN, auf die danach JEDES Lesen wirft.
    """
    from chesslab import matte

    paths = _paths(tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    rec = _session_for_worker(paths, monkeypatch, ["000001", "000002"])
    good = json.dumps({"frame": "000001", "coverage": {"a1": 0.0}})
    (rec / "matte.jsonl").write_text(good + '\n{"frame": "0000', encoding="utf-8")

    matte.alpha_worker("r1", progress=False)

    rows = read_jsonl(rec / "matte.jsonl")
    assert [r["frame"] for r in rows] == ["000001", "000002"]


# --- 2. framescan.scan_is_stale nennt einen LEEREN Scan gueltig --------------------------

def test_an_empty_scan_is_not_a_valid_scan(tmp_path, monkeypatch):
    """Eine leere `scan.jsonl` heisst "nichts gemessen", nicht "nichts gefunden".

    `scan_is_stale` prueft die erste Zeile auf `sharp` und gibt bei GAR KEINER Zeile `None`
    zurueck — der Scan gilt. `realgames.ensure_scan` reicht die leere Liste dann durch, und
    `export_session`s `if scan:` faellt still auf die Margin-Fenster zurueck: genau der
    Rueckfall, den `ensure_scan` mit einem Abbruch zu verhindern verspricht (23 % Haende im
    sauberen Vorrat, `docs/frame-scan.md`).
    """
    from chesslab import framescan

    paths = _paths(tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    stamp = {"video": [1, 2], "stride": framescan.SCAN_STRIDE, "extra": []}
    monkeypatch.setattr(framescan, "scan_provenance",
                        lambda name, *, stride, extra=(), tag="": dict(stamp, stride=stride))
    (paths.recordings / "r1").mkdir(parents=True)
    framescan.scan_path("r1").write_text("", encoding="utf-8")
    framescan.scan_meta_path("r1").write_text(json.dumps(stamp), encoding="utf-8")

    assert framescan.scan_is_stale("r1") is not None


# --- 3. hand_gate.gate_rows erfindet unter `unclear` eine Messung ------------------------

def test_gate_rows_never_teaches_a_row_sam_did_not_measure(tmp_path, monkeypatch):
    """`unclear=True` nahm auch SAMs ABSAGE mit — mit `hand=None` und 64 erfundenen Nullen.

    `coverage or {}` machte aus "nicht gemessen" einen freien Brett-Vektor, und `BoardSet`
    liest `float(bool(None))` als "keine Hand". Das ist derselbe Griff, der dem Schueler schon
    einmal die verdecktesten Bretter des Korpus als handfrei beibrachte.
    """
    from chesslab import hand_gate

    paths = _paths(tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    rec = paths.recordings / "r1"
    rec.mkdir(parents=True)
    (rec / "session.yaml").write_text(yaml.safe_dump({"session_id": "rg-r1", "profile": "p"}),
                                      encoding="utf-8")
    stems = ["000001", "000002"]
    (rec / "log.jsonl").write_text(
        "".join(json.dumps({"frame": f"frames/{s}.png", "board": f"boards/{s}.webp",
                            "board_border": 0}) + "\n" for s in stems), encoding="utf-8")
    (rec / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "concepts": {"hand": 0.9},
                    "coverage": {"a1": 0.9}}) + "\n"
        + json.dumps({"frame": "000002", "skipped": "board unreadable"}) + "\n",
        encoding="utf-8")

    rows = hand_gate.gate_rows(unclear=True)

    assert [r["stem"] for r in rows] == ["000001"]


@pytest.mark.parametrize("unclear", [False, True])
def test_gate_rows_keeps_the_genuinely_unclear_stripe_under_the_flag(tmp_path, monkeypatch,
                                                                    unclear):
    """Die Gegenprobe zu oben: der gemessene Zwischenstreifen bleibt, was er war."""
    from chesslab import hand_gate

    paths = _paths(tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    rec = paths.recordings / "r1"
    rec.mkdir(parents=True)
    (rec / "session.yaml").write_text(yaml.safe_dump({"session_id": "rg-r1", "profile": "p"}),
                                      encoding="utf-8")
    (rec / "log.jsonl").write_text(
        json.dumps({"frame": "frames/000003.png", "board": "boards/000003.webp",
                    "board_border": 0}) + "\n", encoding="utf-8")
    # Konzept da, Flaeche unter `GATE_AREA_MIN`: gemessen, aber kein Urteil.
    (rec / "matte.jsonl").write_text(
        json.dumps({"frame": "000003", "concepts": {"hand": 0.9},
                    "coverage": {"a1": 0.1}}) + "\n", encoding="utf-8")

    rows = hand_gate.gate_rows(unclear=unclear)

    assert [r["hand"] for r in rows] == ([None] if unclear else [])


# --- 4. Mutationsprobe: der Loch-Deckel in `matte.solid` war ungedeckt -------------------

def _blob_with_hole(side: int) -> np.ndarray:
    alpha = np.zeros((200, 200), np.uint8)
    alpha[20:180, 20:180] = 255
    alpha[100:100 + side, 100:100 + side] = 0
    return alpha


def test_solid_fills_the_small_hole_and_leaves_the_big_one_open():
    """`MAX_HOLE_FRAC` ist tragend und hielt kein Test — die Mutationsprobe liess ihn stumm fallen.

    Topologie allein ist zu gierig: eine gekruemmte Hand schliesst Hintergrund ein, der nach
    jedem Test ausser der GROESSE ein Loch ist (0,77 % einer Maske auf 222655/988,
    `docs/occluder-plates.md`). Zugeschuettet waeren das Coverage-Punkte, die SAM nie gemessen hat.
    """
    from chesslab.matte import solid

    # 25 600 px Maske, Deckel `MAX_HOLE_FRAC` = 51 px: 25 gehoeren zu, 6 400 offen.
    assert (solid(_blob_with_hole(5))[100:105, 100:105] > 127).all()
    big = solid(_blob_with_hole(80))[100:180, 100:180] > 127
    assert big.sum() < 0.02 * big.size, "das grosse Loch gehoert offen"
