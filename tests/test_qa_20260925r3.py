"""QA 2026-09-25 Runde 3: das Alpha auf der Platte gehoert zur wirksamen Zeile in `matte.jsonl`."""

from __future__ import annotations

import json
import os
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, matte, temporal_matte
from chesslab.ioutil import read_jsonl
from chesslab.session_store.matte import effective_rows
from conftest import write_jsonl


def _recording(tmp_path: Path, monkeypatch, rows: list[dict]) -> Path:
    """`alpha_worker` ohne SAM: das neue Alpha ist ueberall 255."""
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "r1"
    (rec / "boards").mkdir(parents=True)
    (rec / "mattes").mkdir()
    assert cv2.imwrite(str(rec / "boards" / "000001.png"), np.zeros((8, 8, 3), np.uint8))
    log = [{"frame": "frames/000001.png", "ply": 1, "board": "boards/000001.png"}]
    write_jsonl(rec / "log.jsonl", log)
    write_jsonl(rec / "matte.jsonl", rows)
    monkeypatch.setattr(matte, "read_log_rows", lambda _d: log)
    (rec / "session.yaml").write_text("profile: p\n", encoding="utf-8")
    monkeypatch.setattr(matte, "usable_board", lambda *_a: True)
    monkeypatch.setattr(calibration, "load_profile", lambda _n: object())
    monkeypatch.setattr(matte, "alpha_sam3", lambda _b: (np.ones((8, 8), np.float32), {"hand": 0.9}))
    return rec


def test_a_kill_after_the_named_frames_pixels_leaves_the_old_row_its_old_pixels(tmp_path, monkeypatch):
    """`--temporal` nennt Frames MIT Zeile: das Alpha wurde an Ort und Stelle ueberschrieben, die Zeile
    folgte danach. Ein Kill dazwischen liess SAMs Pixel unter der temporalen Zeile und Coverage."""
    rec = _recording(tmp_path, monkeypatch, [{"frame": "000001", "source": "temporal", "coverage": {"a1": 0.4}}])
    assert cv2.imwrite(str(rec / "mattes" / "000001.webp"), np.full((8, 8), 100, np.uint8))

    def killed(*_a):
        raise KeyboardInterrupt

    monkeypatch.setattr(matte, "coverage_of", killed)
    with pytest.raises(KeyboardInterrupt):
        matte.alpha_worker("r1", frames={"000001"}, progress=False)
    assert effective_rows(read_jsonl(rec / "matte.jsonl"))["000001"]["source"] == "temporal"
    assert cv2.imread(str(rec / "mattes" / "000001.webp"), 0).max() == 100, \
        "BUG: neue SAM-Pixel unter der alten temporalen Zeile"
    assert not list((rec / "mattes").glob("*.tmp.webp"))


def test_a_named_upsert_frame_gets_its_sam_alpha_where_its_row_looks(tmp_path, monkeypatch):
    """Nach einem Upsert liegt SAMs Alpha unter `.sam.webp` (`alpha_for`). Der Worker schrieb das neue
    nach `<stem>.webp`: die neue SAM-Zeile zeigte auf die ALTEN Pixel, das Upsert-Alpha war weg."""
    rec = _recording(tmp_path, monkeypatch, [
        {"frame": "000001", "coverage": {"a1": 0.0}},
        {"frame": "000001", "source": "upsert", "coverage": {"a1": 0.4}},
    ])
    assert cv2.imwrite(str(rec / "mattes" / "000001.sam.webp"), np.full((8, 8), 10, np.uint8))
    assert cv2.imwrite(str(rec / "mattes" / "000001.webp"), np.full((8, 8), 100, np.uint8))
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, *_a: {"a1": float(alpha.mean())})

    matte.alpha_worker("r1", frames={"000001"}, progress=False)
    row = effective_rows(read_jsonl(rec / "matte.jsonl"))["000001"]
    assert row["coverage"] == {"a1": 1.0}
    assert cv2.imread(str(matte.alpha_for(rec, row)), 0).min() == 255, \
        "BUG: die neue SAM-Zeile zeigt auf SAMs alte Pixel"
    assert cv2.imread(str(rec / "mattes" / "000001.webp"), 0).max() == 100, "das Upsert-Alpha ist weg"


@pytest.mark.skipif(os.name != "nt", reason="nur Windows verweigert os.replace auf eine offene Datei")
def test_a_failed_rename_after_the_ledger_leaves_no_staged_alpha(tmp_path, monkeypatch):
    """Der Web-Worker haelt das Alpha beim Schneiden offen: `replace` scheitert NACH dem Ledger, und die
    noch nicht umgehaengten `<stem>.tmp.webp` blieben liegen (`straighten_boards` zog sie gerade)."""
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "t"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-t\nprofile: p\n", encoding="utf-8")
    stems = ("000001", "000002")
    write_jsonl(rec / "log.jsonl", [{"frame": f"frames/{s}.png", "ply": 1, "board": f"boards/{s}.webp"}
                                    for s in stems])
    write_jsonl(rec / "matte.jsonl", [{"frame": "000001", "source": "temporal", "coverage": {"a1": 0.5}}])
    cv2.imwrite(str(rec / "mattes" / "000001.webp"), np.full((8, 8), 100, np.uint8))
    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    for s in stems:
        cv2.imwrite(str(proposals / f"{s}.alpha.png"), np.full((8, 8), 255, np.uint8))
    write_jsonl(proposals / "proposals.jsonl", [{"frame": s, "alpha": f"{s}.alpha.png",
                                                 "fraction_above_half": 1.0} for s in stems])
    (proposals / "proposals.meta.json").write_text(
        json.dumps({"source": temporal_matte.source_stamp(rec)}), encoding="utf-8")
    monkeypatch.setattr(calibration, "load_profile", lambda _: "profile")
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, *_a: {"a1": float(alpha.mean())})

    with open(rec / "mattes" / "000001.webp", "rb"), pytest.raises(OSError, match="000001"):
        temporal_matte.adopt_proposals("rg-t")
    assert not list((rec / "mattes").glob("*.tmp.webp")), "BUG: gestapelte Alphas liegen nach dem Abbruch"
    assert [r["frame"] for r in read_jsonl(rec / "matte.jsonl")] == ["000002"],         "die Zeile ohne ihre Pixel bleibt nicht stehen"
    assert cv2.imread(str(rec / "mattes" / "000002.webp"), 0).min() == 255


@pytest.mark.skipif(os.name != "nt", reason="nur Windows verweigert os.replace auf eine offene Datei")
def test_a_failed_upsert_publish_leaves_no_staged_alpha(tmp_path, monkeypatch):
    """Dasselbe fuer `upsert_proposals`: `_publish_upserts` scheitert am offenen SAM-Alpha."""
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "t"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-t\nprofile: p\n", encoding="utf-8")
    stems = ("000001", "000002")
    write_jsonl(rec / "log.jsonl", [{"frame": f"frames/{s}.png", "ply": 1, "board": f"boards/{s}.webp"}
                                    for s in stems])
    write_jsonl(rec / "matte.jsonl", [{"frame": s, "coverage": {"a1": 0.0}} for s in stems])
    for s in stems:
        cv2.imwrite(str(rec / "mattes" / f"{s}.webp"), np.full((8, 8), 10, np.uint8))
    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    for s in stems:
        cv2.imwrite(str(proposals / f"{s}.alpha.png"), np.full((8, 8), 255, np.uint8))
    write_jsonl(proposals / "proposals.jsonl", [{"frame": s, "alpha": f"{s}.alpha.png",
                                                 "fraction_above_half": 1.0} for s in stems])
    (proposals / "proposals.meta.json").write_text(
        json.dumps({"source": temporal_matte.source_stamp(rec)}), encoding="utf-8")
    monkeypatch.setattr(calibration, "load_profile", lambda _: "profile")
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, *_a: {"a1": float(alpha.mean())})

    with open(rec / "mattes" / "000001.webp", "rb"), pytest.raises(OSError, match="000001.*retracted"):
        temporal_matte.upsert_proposals("rg-t")
    assert not list((rec / "mattes").glob("*.tmp.webp")), "BUG: gestapelte Alphas liegen nach dem Abbruch"
