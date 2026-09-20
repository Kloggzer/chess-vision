"""Punkt 28 an zwei Stellen, die ihn nicht anwenden: eine Zeile OHNE `coverage` ist SAMs Absage.

Beide lesen `matte.jsonl` roh. `close_seams` schreibt einer Absage eine frisch gerechnete
Coverage zu, `upsert_proposals` laesst eine ZURUECKGEZOGENE Messung als "SAM fand eine Hand"
gelten. Die Geschwister derselben Datei (`recut_coverage`, `sam_matte`, `matted_frames`) pruefen
genau das schon.
"""
from __future__ import annotations

import json

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from tests.test_geometry_bug_hunt import SIDE, _profile, _session  # noqa: E402

from chesslab import config, matte, temporal_matte  # noqa: E402
from chesslab.calibration import crop_border_px  # noqa: E402


def test_close_seams_leaves_a_row_without_coverage_unmeasured(tmp_path, monkeypatch):
    """Eine Absage-Zeile, deren Alpha noch auf der Platte liegt (`matte_status` nennt solche
    Waisen). `close_seams` schneidet daraus eine Coverage und schreibt sie in die Zeile — aus
    "nicht gemessen" wird eine Messung, und `read_matte` liefert sie ans Training aus."""
    pytest.importorskip("torch")
    prof = _profile()
    pad = crop_border_px(prof)
    side = SIDE + 2 * pad
    rows = [{"frame": "frames/000001.png", "board": "dirty/000001.webp", "ply": 1,
             "dirty": True, "dirty_reason": "occluded", "corners": prof.image_corners,
             "board_size": SIDE, "board_border": pad}]
    sdir = _session(tmp_path, monkeypatch, rows, (side, side))
    (sdir / "mattes").mkdir()
    seamed = np.zeros((side, side), np.uint8)
    seamed[100:140, 100:140] = 255
    seamed[100:140, 142:182] = 255            # die Naht, die `solid` schliessen wuerde
    cv2.imwrite(str(sdir / "mattes" / "000001.webp"), seamed)
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "skipped": "board unreadable"}) + "\n", encoding="utf-8")
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)

    matte.close_seams("s1", progress=False)

    written = [json.loads(line) for line
               in (sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    assert written[-1].get("coverage") is None, (
        "der Absage wurde eine Coverage angerechnet: "
        f"{written[-1].get('coverage')} — `recut_coverage` laesst genau diese Zeile in Ruhe")


@pytest.fixture
def upsert_session(tmp_path, monkeypatch):
    rec = tmp_path / "recordings" / "g"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-g\nprofile: p\n", encoding="utf-8")
    (rec / "log.jsonl").write_text(json.dumps({
        "frame": "frames/000001.png", "ply": 1, "board": "boards/000001.webp",
    }) + "\n", encoding="utf-8")
    proposals = tmp_path / "reports" / "temporal-mattes" / "g" / "local"
    proposals.mkdir(parents=True)
    cv2.imwrite(str(proposals / "000001.alpha.png"), np.full((8, 8), 255, np.uint8))
    (proposals / "proposals.jsonl").write_text(json.dumps({
        "frame": "000001", "alpha": "000001.alpha.png", "fraction_above_half": 1.0,
    }) + "\n", encoding="utf-8")
    (proposals / "proposals.meta.json").write_text(json.dumps({
        "source": temporal_matte.source_stamp(rec),
    }), encoding="utf-8")
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda _name: object())
    monkeypatch.setattr("chesslab.matte.coverage_of",
                        lambda _alpha, _entry, _profile: {"a1": 1.0})
    return rec


def test_upsert_does_not_count_a_retracted_measurement_as_a_find(upsert_session):
    """`sam_found` heisst "SAM hat hier eine Hand gemessen". Eine spaetere Absage nimmt die
    Messung zurueck; die alte Zahl weiter zu befragen meldet einen Fund, den niemand gemessen hat.
    """
    (upsert_session / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a1": 0.9}}) + "\n"
        + json.dumps({"frame": "000001", "skipped": "board unreadable"}) + "\n",
        encoding="utf-8")

    out = temporal_matte.upsert_proposals("rg-g")

    assert out["sam_found"] == 0, (
        "eine zurueckgezogene Messung wurde als SAM-Fund gezaehlt — `sam_matte` und "
        "`matted_frames` loeschen sie an derselben Stelle")


def test_recut_coverage_says_so_when_a_session_could_not_be_recut(monkeypatch):
    """Dieselbe Schleife wie `close-seams`, nur ohne dessen `_exit_on_bulk_failures`: eine
    Aufnahme, die nicht neu geschnitten werden konnte, wird gemeldet und dann ueberzaehlt — der
    Lauf endet mit 0, und die Drift, gegen die der Befehl existiert, steht weiter auf der Platte.
    """
    from pathlib import Path

    from typer.testing import CliRunner

    from chesslab import matte as matte_mod
    from chesslab import sessions
    from chesslab.cli import app

    monkeypatch.setattr(sessions, "all_sessions",
                        lambda *a, **k: [("rg-a", Path("a")), ("rg-b", Path("b"))])

    def recut(one, progress=True):
        if one == "a":
            raise FileNotFoundError(f"{one}: no matte.jsonl")
        return {"name": one, "frames": 1, "recut": 1, "crossed": 0}

    monkeypatch.setattr(matte_mod, "recut_coverage", recut)

    result = CliRunner().invoke(app, ["occluders", "recut-coverage", "--all"])

    assert result.exit_code == 1, (
        "eine ungeschnittene Aufnahme ging als Erfolg durch — `close-seams` zaehlt dieselben "
        "Fehler und endet mit 1")
