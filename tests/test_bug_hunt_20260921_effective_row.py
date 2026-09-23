"""Punkt 28 gilt je FRAME, nicht je ZEILE: `matte.jsonl` ist eine Historie."""
from __future__ import annotations

import json

import numpy as np
import pytest
import yaml

cv2 = pytest.importorskip("cv2")

from tests.test_geometry_bug_hunt import SIDE, _profile, _session  # noqa: E402

from chesslab import config, matte, temporal_matte  # noqa: E402
from chesslab.calibration import crop_border_px  # noqa: E402

FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def _seam(side: int) -> np.ndarray:
    """Zwei Bloecke mit einer Luecke dazwischen — genau das, was `solid` schliessen wuerde."""
    alpha = np.zeros((side, side), np.uint8)
    alpha[100:140, 100:140] = 255
    alpha[100:140, 142:182] = 255
    return alpha


def _seam_session(tmp_path, monkeypatch, count: int = 1):
    prof = _profile()
    pad = crop_border_px(prof)
    side = SIDE + 2 * pad
    rows = [{"frame": f"frames/{i:06d}.png", "board": f"dirty/{i:06d}.webp", "ply": 1, "fen": FEN,
             "dirty": True, "dirty_reason": "occluded", "corners": prof.image_corners,
             "board_size": SIDE, "board_border": pad} for i in range(1, count + 1)]
    sdir = _session(tmp_path, monkeypatch, rows, (side, side))
    (sdir / "mattes").mkdir()
    for i in range(1, count + 1):
        cv2.imwrite(str(sdir / "mattes" / f"{i:06d}.webp"), _seam(side))
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)
    return sdir


def _written(sdir):
    return [json.loads(line) for line
            in (sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]


def test_close_seams_skips_a_measurement_a_later_row_retracted(tmp_path, monkeypatch):
    """Die Absage ist die wirksame Zeile: der Frame ist NICHT gemessen, also gibt es hier nichts
    zu schliessen. Roh gelesen wurde die ueberholte Zeile weiter gerechnet und ihr Alpha ersetzt —
    die Pixel auf der Platte gehoeren danach zu keiner gueltigen Messung."""
    pytest.importorskip("torch")
    sdir = _seam_session(tmp_path, monkeypatch)
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.9}}) + "\n"
        + json.dumps({"frame": "000001", "skipped": "zone too big"}) + "\n", encoding="utf-8")
    before = (sdir / "mattes" / "000001.webp").read_bytes()

    out = matte.close_seams("s1", progress=False)

    assert out["closed"] == 0, "eine zurueckgenommene Messung wurde nachgerechnet"
    assert (sdir / "mattes" / "000001.webp").read_bytes() == before, (
        "das Alpha eines nicht gemessenen Frames wurde ersetzt")


def test_close_seams_survives_two_older_rows_for_the_same_frame(tmp_path, monkeypatch):
    """Zwei gemessene Zeilen desselben Frames ergeben ZWEIMAL denselben `*.tmp.webp`. Nach dem
    ersten `replace()` ist die Zwischendatei weg und der zweite stirbt — und zwar NACHDEM
    `matte.jsonl` schon ersetzt wurde, also mit halbem Zustand auf der Platte."""
    pytest.importorskip("torch")
    sdir = _seam_session(tmp_path, monkeypatch)
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.1}}) + "\n"
        + json.dumps({"frame": "000001", "coverage": {"a8": 0.9}}) + "\n", encoding="utf-8")

    out = matte.close_seams("s1", progress=False)

    assert out["closed"] == 1, "nur die wirksame Zeile wird geschlossen"
    assert not list((sdir / "mattes").glob("*.tmp.webp")), "die Zwischendatei blieb liegen"
    assert _written(sdir)[-1]["coverage"] != {"a8": 0.9}, "die wirksame Zeile bekam keine Naht"


def test_the_limit_does_not_spend_budget_on_a_retracted_measurement(tmp_path, monkeypatch):
    """`--limit` zaehlt ERFOLGREICHE Alphas. Ein Frame, dessen Messung eine spaetere Absage
    zurueckgenommen hat, traegt keinen — als Erfolg gezaehlt kuerzt er das Budget fuer Frames,
    die wirklich noch eines brauchen."""
    pad = crop_border_px(_profile())
    rows = [{"frame": f"frames/{i:06d}.png", "board": f"dirty/{i:06d}.webp", "ply": 1, "fen": FEN,
             "dirty": True, "dirty_reason": "occluded", "corners": _profile().image_corners,
             "board_size": SIDE, "board_border": pad} for i in range(1, 7)]
    sdir = _session(tmp_path, monkeypatch, rows, (SIDE + 2 * pad, SIDE + 2 * pad))
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.9}}) + "\n"
        + json.dumps({"frame": "000001", "skipped": "zone too big"}) + "\n", encoding="utf-8")
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.zeros(b.shape[:2], np.float32), {}))
    monkeypatch.setattr(matte, "coverage_of", lambda *a, **k: {"a8": 0.9})
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())

    out = matte.alpha_worker("s1", limit=3, progress=False)

    assert out["alphas"] == 3, "die zurueckgenommene Messung zaehlte als Erfolg und nahm ein Budget"


def test_prune_keeps_our_rows_when_sams_last_word_is_a_refusal(tmp_path, monkeypatch):
    """`prune_dead_rows` loescht `temporal`/`upsert`, WEIL SAM den Frame inzwischen geschnitten
    hat. Eine spaetere Absage nimmt genau das zurueck — sonst bleibt nur die Absage stehen, und
    der Frame geht ohne jedes Alpha und mit `coverage = 0.0` ins Training."""
    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    rec = paths.recordings / "r1"
    rec.mkdir(parents=True)
    (rec / "session.yaml").write_text(yaml.safe_dump({"session_id": "rg-r1", "profile": "p"}),
                                      encoding="utf-8")
    (rec / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a1": 0.9}}) + "\n"
        + json.dumps({"frame": "000001", "source": "temporal", "coverage": {"a1": 0.8}}) + "\n"
        + json.dumps({"frame": "000002", "coverage": {"a1": 0.9}}) + "\n"
        + json.dumps({"frame": "000002", "source": "upsert", "coverage": {"a1": 0.8}}) + "\n"
        + json.dumps({"frame": "000001", "skipped": "zone too big"}) + "\n"
        + json.dumps({"frame": "000002", "skipped": "zone too big"}) + "\n", encoding="utf-8")

    res = temporal_matte.prune_dead_rows("rg-r1")

    assert res["dropped"] == 0, (
        "SAMs Absage ist kein Schnitt — die eigenen Zeilen sind das einzige Alpha, das der "
        "Frame noch hat")
