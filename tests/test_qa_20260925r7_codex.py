"""QA 2026-09-25 Runde 7: Web-Stift und -Leser gegen den Matte-Publish-Lock."""

from __future__ import annotations

import base64
from pathlib import Path
from threading import Event, Thread

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, ioutil, matte, web_cuts


def _recording(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "g"
    (rec / "boards").mkdir(parents=True)
    (rec / "mattes").mkdir()
    (rec / "candidate.json").write_text('{"source":{"crop":{"pad_side":0.05}}}', encoding="utf-8")
    (rec / "session.yaml").write_text("session_id: rg-g\nprofile: p\n", encoding="utf-8")
    row = {"frame": "frames/000001.png", "ply": 1, "board": "boards/000001.webp",
           "board_size": 8, "board_border": 0, "board_straightened": True}
    ioutil.write_rows(rec / "log.jsonl", [row])
    ioutil.write_rows(rec / "matte.jsonl", [
        {"frame": "000001", "concepts": {"hand": 0.9}, "coverage": {"a1": 0.0}},
    ])
    assert cv2.imwrite(str(rec / "boards" / "000001.webp"), np.zeros((8, 8, 3), np.uint8))
    assert cv2.imwrite(str(rec / "mattes" / "000001.webp"), np.zeros((8, 8), np.uint8))
    monkeypatch.setattr(calibration, "load_profile", lambda _name: object())
    monkeypatch.setattr(matte, "usable_board", lambda *_args: True)
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, *_args: {"a1": float(alpha.mean())})
    return rec


def _raise_mask() -> str:
    rgba = np.full((8, 8, 4), (0, 0, 255, 255), np.uint8)
    ok, encoded = cv2.imencode(".png", rgba)
    assert ok
    return base64.b64encode(encoded.tobytes()).decode("ascii")


def test_pen_during_recut_is_either_included_or_left_pending(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    rec = _recording(tmp_path, monkeypatch)
    fixed = rec / "mattes" / f"000001{matte.FIXED_SUFFIX}"
    assert cv2.imwrite(str(fixed), np.zeros((8, 8), np.uint8))
    read_fixed, pen_done = Event(), Event()
    real_imread = matte.cv2.imread

    def paused_imread(path: str, mode: int):
        image = real_imread(path, mode)
        if Path(path) == fixed:
            read_fixed.set()
            pen_done.wait(0.5)
        return image

    monkeypatch.setattr(matte.cv2, "imread", paused_imread)
    errors: list[BaseException] = []

    def recut() -> None:
        try:
            matte.recut_fixed("g", progress=False)
        except BaseException as error:
            errors.append(error)

    worker = Thread(target=recut)
    worker.start()
    assert read_fixed.wait(2)
    try:
        web_cuts.pen_stroke("g", "000001", _raise_mask())
    finally:
        pen_done.set()
        worker.join(2)

    assert not worker.is_alive() and errors == []
    coverage = ioutil.read_jsonl(rec / "matte.jsonl")[0]["coverage"]["a1"]
    pixels = float(cv2.imread(str(fixed), cv2.IMREAD_GRAYSCALE).mean() / 255.0)
    assert coverage == pytest.approx(pixels) or fixed.stat().st_mtime_ns > (rec / "matte.jsonl").stat().st_mtime_ns, (
        "der Recut veroeffentlicht alte Coverage nach dem neueren Stiftbild und markiert sie damit als aktuell"
    )


@pytest.mark.skipif(__import__("os").name != "nt", reason="Windows verweigert replace bei offenem Leser")
def test_web_cut_during_alpha_publish_keeps_ledger_and_pixels_in_step(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    rec = _recording(tmp_path, monkeypatch)
    alpha = rec / "mattes" / "000001.webp"
    reading = Event()
    real_raster = web_cuts._raster

    def slow_raster(path: Path):
        if path == alpha:
            with path.open("rb"):
                reading.set()
                Event().wait(0.3)
        return real_raster(path)

    monkeypatch.setattr(web_cuts, "_raster", slow_raster)
    monkeypatch.setattr(matte, "solid", lambda image: np.full_like(image, 255))
    cut_errors: list[BaseException] = []

    def cut() -> None:
        try:
            web_cuts.cut_matte("g", "000001", 8)
        except BaseException as error:
            cut_errors.append(error)

    reader = Thread(target=cut)
    reader.start()
    assert reading.wait(2)
    publish_error: BaseException | None = None
    try:
        matte.close_seams("g", progress=False)
    except BaseException as error:
        publish_error = error
    reader.join(2)

    assert not reader.is_alive() and cut_errors == []
    # Web-Leser bleiben ausserhalb des Locks (sonst serialisierte er die Schnitte): das Umbenennen darf
    # scheitern, aber nur laut und mit zurueckgenommener Zeile.
    assert publish_error is None or "retracted" in str(publish_error), publish_error
    assert not list((rec / "mattes").glob("*.tmp*"))
    row = ioutil.read_jsonl(rec / "matte.jsonl")[0]
    pixels = float(cv2.imread(str(alpha), cv2.IMREAD_GRAYSCALE).mean() / 255.0)
    assert row["coverage"]["a1"] == pytest.approx(pixels)


def test_pen_waits_for_the_matte_ledger_lock(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    from chesslab import locks

    rec = _recording(tmp_path, monkeypatch)
    fixed = rec / "mattes" / f"000001{matte.FIXED_SUFFIX}"
    pen = Thread(target=web_cuts.pen_stroke, args=("g", "000001", _raise_mask()))
    with locks.matte_ledger(rec, "recut-fixed"):
        pen.start()
        pen.join(0.3)
        assert pen.is_alive() and not fixed.exists(), "der Stift schreibt waehrend ein Ledger-Schreiber prueft"
    pen.join(2)
    assert not pen.is_alive() and fixed.exists()
