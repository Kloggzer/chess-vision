"""Every matte writer stores the same measured-coverage fields, and every recut refuses a missing ledger."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, ioutil, matte, temporal_matte

COVERAGE = {"a1": 0.9, "b1": 0.51, "c1": 0.5, "d1": 0.2}


def _recording(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, *, ledger: bool = True) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "t"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-t\nprofile: p\n", encoding="utf-8")
    ioutil.write_rows(rec / "log.jsonl", [{
        "frame": f"frames/{index:06d}.png", "board": f"boards/{index:06d}.webp", "board_size": 8,
        "board_border": 0, "board_straightened": True, "dirty": True, "dirty_reason": "occluded",
        "fen": "8/8/8/8/8/8/8/8 w - - 0 1",
    } for index in range(3)])
    if ledger:
        ioutil.write_rows(rec / "matte.jsonl", [{
            "frame": "000000", "concepts": {"hand": 0.9}, "coverage": {"a1": 0.0},
        }])
    holed = np.full((32, 32), 255, np.uint8)
    holed[14:18, 14:18] = 0
    assert cv2.imwrite(str(rec / "mattes" / "000000.webp"), holed)
    assert cv2.imwrite(str(rec / "mattes" / f"000000{matte.FIXED_SUFFIX}"), holed)
    monkeypatch.setattr(calibration, "load_profile", lambda _name: object())
    monkeypatch.setattr(matte, "usable_board", lambda *_args: True)
    monkeypatch.setattr(matte, "coverage_of", lambda *_args: dict(COVERAGE))
    return rec


def _row(rec: Path, frame: str) -> dict:
    return [r for r in ioutil.read_jsonl(rec / "matte.jsonl") if r["frame"] == frame][-1]


@pytest.mark.parametrize("verb", [matte.recut_coverage, matte.recut_fixed, matte.close_seams])
def test_a_recut_stores_how_many_cells_are_over_half(tmp_path, monkeypatch, verb):
    rec = _recording(tmp_path, monkeypatch)

    result = verb("t", progress=False)

    row = _row(rec, "000000")
    assert row["coverage"] == COVERAGE and row["cells_over_half"] == 2
    assert result.get("crossed", 4) == 4


@pytest.mark.parametrize("verb", [matte.recut_coverage, matte.recut_fixed, matte.close_seams])
def test_a_recut_refuses_a_recording_without_a_ledger(tmp_path, monkeypatch, verb):
    _recording(tmp_path, monkeypatch, ledger=False)

    with pytest.raises(FileNotFoundError, match=r"t: no matte\.jsonl — run `occluders alpha-worker` first"):
        verb("t", progress=False)


def test_the_alpha_worker_stores_how_many_cells_are_over_half(tmp_path, monkeypatch):
    rec = _recording(tmp_path, monkeypatch, ledger=False)
    (rec / "boards").mkdir()
    for index in range(3):
        assert cv2.imwrite(str(rec / "boards" / f"{index:06d}.webp"), np.full((8, 8, 3), 90, np.uint8))
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.ones(b.shape[:2], np.float32), {"hand": 1.0}))

    matte.alpha_worker("t", frames={"000001"}, progress=False)

    row = _row(rec, "000001")
    assert row["coverage"] == COVERAGE and row["cells_over_half"] == 2


@pytest.mark.parametrize("verb, source", [(temporal_matte.adopt_proposals, "temporal"),
                                          (temporal_matte.upsert_proposals, "upsert")])
def test_a_proposal_row_stores_how_many_cells_are_over_half(tmp_path, monkeypatch, verb, source):
    rec = _recording(tmp_path, monkeypatch)
    if source == "upsert":
        ioutil.write_rows(rec / "matte.jsonl", [{"frame": "000001", "coverage": {"a1": 0.0}}])
    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    assert cv2.imwrite(str(proposals / "000001.alpha.png"), np.full((8, 8), 255, np.uint8))
    ioutil.write_rows(proposals / "proposals.jsonl", [{
        "frame": "000001", "alpha": "000001.alpha.png", "fraction_above_half": 1.0,
    }])
    (proposals / "proposals.meta.json").write_text(json.dumps({
        "source": temporal_matte.source_stamp(rec),
    }), encoding="utf-8")

    verb("rg-t")

    row = _row(rec, "000001")
    assert row["source"] == source
    assert row["coverage"] == COVERAGE and row["cells_over_half"] == 2
