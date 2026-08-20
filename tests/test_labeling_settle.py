"""`settle_dev` reaches the SLICE: a cell whose pixels left the position it is labelled with.

The exporter's `unknown_squares` covers the NEXT move's footprint. Nothing covered a square that
already holds what was just played while the FEN still calls it empty — measured over the corpus,
the 60 worst such cells are fingers and standing pieces on squares labelled `empty`.
"""

import json

import numpy as np
import pytest

from chesslab import config
from chesslab.labeling import CROP_SUFFIX, SETTLE_LIMIT, all_squares, slice_session

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
#: a1 is index 0 in `all_squares()`; e4 is the one the tests move.
E4 = all_squares().index("e4")


@pytest.fixture
def session(tmp_path, monkeypatch):
    import cv2
    import yaml

    from chesslab.calibration import CalibrationProfile, CropParams, compute_homography

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = tmp_path / "data" / "sessions" / "s1"
    (sdir / "frames").mkdir(parents=True)
    corners = [[20, 20], [300, 20], [300, 220], [20, 220]]
    rows = []
    for stem, dev in (("000001", 0.0), ("000002", SETTLE_LIMIT + 5), ("000003", None)):
        cv2.imwrite(str(sdir / "frames" / f"{stem}.png"), np.full((240, 320, 3), 128, np.uint8))
        row = {"frame": f"frames/{stem}.png", "fen": START, "ply": 1, "corners": corners}
        if dev is not None:
            scores = [0.0] * 64
            scores[E4] = dev
            row["settle_dev"] = scores
        rows.append(row)
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "s1", "profile": "p", "mode": "track"}), encoding="utf-8")
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    prof = CalibrationProfile(
        profile="p", camera_index=-1, frame_size=(320, 240), board_size=128,
        image_corners=corners, homography=compute_homography(corners, 128, 0.0), white_pov=True,
        crop=CropParams(cell=16.0, pad_up=0.0, pad_side=0.05, out_size=(32, 32)),
        margin=0.0, source=None)
    return sdir, prof, tmp_path


def _corrections(sdir, by_square, frame):
    """A correction is a row in the session's own ledger now, not an argument."""
    import json as _json

    (sdir / "corrections.jsonl").write_text(
        "".join(_json.dumps({"session_id": "s1", "frame": frame, "square": sq,
                             "label": lab}) + "\n"
                for sq, lab in by_square.items()), encoding="utf-8")


def _slice(session, **kw):
    sdir, prof, root = session
    return slice_session(sdir, profile=prof, manifest_path=root / "m.jsonl",
                         squares_root=root / "squares", out_size=(32, 32), **kw)


def test_only_the_cell_over_the_limit_is_held_back(session):
    """One cell of one frame — the other 63 of that frame are as good as any other."""
    res = _slice(session)

    assert res["unsettled_dropped"] == 1
    assert res["crops"] == 3 * 64 - 1
    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert f"s1_000002_e4{CROP_SUFFIX}" not in written
    assert f"s1_000001_e4{CROP_SUFFIX}" in written, "the same square, settled, still counts"


def test_a_row_without_a_score_is_not_judged(session):
    """An interval too short for a median writes none, and guessing there would invert the point."""
    _slice(session)

    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert f"s1_000003_e4{CROP_SUFFIX}" in written


def test_a_human_correction_outranks_the_doubt(session):
    """Same rule as `dirty`: the gate is a doubt, and a person who looked knows more than it."""
    _corrections(session[0], {"e4": "empty"}, "000002")

    res = _slice(session)

    assert res["unsettled_dropped"] == 0
    assert res["crops"] == 3 * 64
    written = {p.name for p in (session[2] / "squares" / "empty").glob(f"*{CROP_SUFFIX}")}
    assert f"s1_000002_e4{CROP_SUFFIX}" in written
