"""`unknown_squares` reaches the SLICE — the poison path that was open until 2026-08-09."""

import json

import numpy as np
import pytest

from chesslab import config
from chesslab.labeling import slice_session

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
           "corners": [[20, 20], [300, 20], [300, 220], [20, 220]],
           "unknown_squares": ["e2", "e4"]}
    (sdir / "log.jsonl").write_text(json.dumps(row) + "\n", encoding="utf-8")

    from chesslab.calibration import CalibrationProfile, CropParams, compute_homography
    corners = row["corners"]
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


def test_a_square_the_fen_cannot_vouch_for_writes_no_crop(session):
    """Until today `slice` did not read the field at all, so these crops went into training under
    a label measured to be stale by up to 4.6 s — always the same wrong label on the same square."""
    res = _slice(session)

    assert res["unknown_dropped"] == 2
    assert res["crops"] == 62, "the other 62 squares are unaffected"
    written = {p.name for p in (session[2] / "squares").rglob("*.png")}
    assert not [n for n in written if n.endswith(("_e2.png", "_e4.png"))]


def test_a_human_ruling_outranks_the_doubt(session):
    """The between-commit window is where the hands are, so it is the richest `occluded` material
    there is. A person who says `occluded` knows something the FEN does not."""
    res = _slice(session, label_overrides={("s1", "000001", "e2"): "occluded"})

    assert res["unknown_dropped"] == 1, "only e4 is still unruled"
    assert res["crops"] == 63
    written = {p.name for p in (session[2] / "squares" / "occluded").glob("*.png")}
    assert written == {"s1_000001_e2.png"}
