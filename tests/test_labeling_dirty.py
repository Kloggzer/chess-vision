"""`dirty` reaches the SLICE — a hand in the frame means a move is in flight, so the whole board is
suspect until the commit, not just the cells under the hand (measured 2026-08-16: 5 132 of 15 417
exported rows are dirty and every one of them was sliced with a FEN label)."""

import json

import numpy as np
import pytest

from chesslab import config
from chesslab.labeling import CROP_SUFFIX, slice_session

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


@pytest.fixture
def session(tmp_path, monkeypatch):
    import cv2
    import yaml

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = tmp_path / "data" / "sessions" / "s1"
    (sdir / "frames").mkdir(parents=True)
    (tmp_path / "data" / "calibration").mkdir(parents=True, exist_ok=True)
    corners = [[20, 20], [300, 20], [300, 220], [20, 220]]
    rows = []
    for stem, dirty in (("000001", True), ("000002", False)):
        cv2.imwrite(str(sdir / "frames" / f"{stem}.png"), np.full((240, 320, 3), 128, np.uint8))
        row = {"frame": f"frames/{stem}.png", "fen": START, "ply": 1, "corners": corners}
        if dirty:
            row["dirty"] = True
        rows.append(row)
    rows.append({"frame": "frames/000003.png", "fen": START, "ply": 1, "corners": corners,
                 "grid_lines_source": "carried"})
    cv2.imwrite(str(sdir / "frames" / "000003.png"), np.full((240, 320, 3), 128, np.uint8))
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "s1", "profile": "p", "mode": "track"}), encoding="utf-8"
    )
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")

    from chesslab.calibration import CalibrationProfile, CropParams, compute_homography
    prof = CalibrationProfile(
        profile="p", camera_index=-1, frame_size=(320, 240), board_size=128,
        image_corners=corners, homography=compute_homography(corners, 128, 0.0), white_pov=True,
        crop=CropParams(cell=16.0, pad_up=0.0, pad_side=0.05, out_size=(32, 32)),
        margin=0.0, source=None,
    )
    return sdir, prof, tmp_path


def _slice(session, **kw):
    sdir, prof, root = session
    return slice_session(sdir, profile=prof, manifest_path=root / "m.jsonl",
                         squares_root=root / "squares", out_size=(32, 32), **kw)


def test_a_dirty_frame_contributes_nothing_on_its_own(session):
    res = _slice(session)

    assert res["dirty_dropped"] == 128, "the carried frame counts too"
    assert res["crops"] == 64, "the quiet frame is untouched"
    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert not [n for n in written if n.startswith("s1_000001_")]


def test_labeling_recovers_the_cells_a_human_named(session):
    """The point of the gate: it holds material back for review, it does not burn it."""
    res = _slice(session, label_overrides={("s1", "000001", "e2"): "occluded",
                                           ("s1", "000001", "d4"): "wP"})

    assert res["dirty_dropped"] == 126
    assert res["crops"] == 66
    assert ({p.name for p in (session[2] / "squares" / "occluded").glob(f"*{CROP_SUFFIX}")}
            == {f"s1_000001_e2{CROP_SUFFIX}"})
    assert f"s1_000001_d4{CROP_SUFFIX}" in {p.name for p in (session[2] / "squares" / "wP").glob(f"*{CROP_SUFFIX}")}


def test_a_carried_mesh_is_treated_as_a_hand(session):
    """The mesh is a neighbour's because THIS frame's grooves were unreadable — measured over
    2 228 frames that is a hand 94.5 % of the time, against 1.1 % on hand-free frames."""
    _slice(session)

    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert not [n for n in written if n.startswith("s1_000003_")]
