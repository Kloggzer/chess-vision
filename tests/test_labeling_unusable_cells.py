"""`unusable-cells.jsonl` reaches the SLICE: a crop a human called unlabelable is no manifest row.

Its own ledger beside `corrections.jsonl`, because every row THERE is one of the 13 identities and
`read_corrections` promises that to each of its readers.
"""

import json

import numpy as np
import pytest

from chesslab import config
from chesslab.labeling import CROP_SUFFIX, read_unusable_cells, slice_session

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


@pytest.fixture
def session(tmp_path, monkeypatch):
    import cv2
    import yaml

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = tmp_path / "data" / "sessions" / "s1"
    (sdir / "frames").mkdir(parents=True)
    (tmp_path / "data" / "calibration").mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(sdir / "frames" / "000001.png"), np.full((240, 320, 3), 128, np.uint8))
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "s1", "profile": "p", "mode": "track"}), encoding="utf-8"
    )
    row = {"frame": "frames/000001.png", "fen": START, "ply": 1,
           "corners": [[20, 20], [300, 20], [300, 220], [20, 220]]}
    (sdir / "log.jsonl").write_text(json.dumps(row) + "\n", encoding="utf-8")

    from chesslab.calibration import CalibrationProfile, CropParams, compute_homography
    prof = CalibrationProfile(
        profile="p", camera_index=-1, frame_size=(320, 240), board_size=128,
        image_corners=row["corners"], homography=compute_homography(row["corners"], 128, 0.0),
        white_pov=True, crop=CropParams(cell=16.0, pad_side=0.05, out_size=(32, 32)),
        margin=0.0, source=None,
    )
    return sdir, prof, tmp_path


def _ledger(sdir, rows):
    (sdir / "unusable-cells.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")


def _mark(square, unusable=True):
    return {"session_id": "s1", "frame": "000001", "square": square, "unusable": unusable}


def _slice(session):
    sdir, prof, root = session
    return slice_session(sdir, profile=prof, manifest_path=root / "m.jsonl",
                         squares_root=root / "squares", out_size=(32, 32))


def test_a_marked_cell_never_becomes_a_manifest_row(session):
    _ledger(session[0], [_mark("e2"), _mark("a1")])

    res = _slice(session)

    assert res["unusable_cells_dropped"] == 2
    assert res["crops"] == 62
    rows = [json.loads(line) for line in (session[2] / "m.jsonl").read_text(encoding="utf-8").splitlines()]
    assert {r["square"] for r in rows} & {"e2", "a1"} == set(), "the two cells left the manifest"
    assert len(rows) == 62
    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert not [n for n in written if n.endswith((f"_e2{CROP_SUFFIX}", f"_a1{CROP_SUFFIX}"))]


def test_a_label_on_the_same_cell_does_not_resurrect_it(session):
    """The two ledgers answer different questions: `corrections` says WHICH piece, this one says
    the picture shows none well enough to say. The second is the stronger word."""
    _ledger(session[0], [_mark("e2")])
    (session[0] / "corrections.jsonl").write_text(
        json.dumps({"session_id": "s1", "frame": "000001", "square": "e2", "label": "wQ"}) + "\n",
        encoding="utf-8")

    res = _slice(session)

    assert res["unusable_cells_dropped"] == 1
    assert res["crops"] == 63
    rows = [json.loads(line) for line in (session[2] / "m.jsonl").read_text(encoding="utf-8").splitlines()]
    assert "e2" not in {r["square"] for r in rows}


def test_the_last_line_wins_and_false_takes_it_back(session):
    _ledger(session[0], [_mark("e2"), _mark("a1"), _mark("e2", unusable=False)])

    assert read_unusable_cells(session[0]) == {("s1", "000001", "a1")}

    res = _slice(session)

    assert res["unusable_cells_dropped"] == 1
    assert res["crops"] == 63


def test_a_session_without_the_ledger_is_untouched(session):
    res = _slice(session)

    assert res["unusable_cells_dropped"] == 0
    assert res["crops"] == 64
    assert read_unusable_cells(session[0]) == set()
