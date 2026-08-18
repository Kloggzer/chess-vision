"""The session matte: the grid decides whether, the model decides where, the cut is the crop's."""

from dataclasses import replace

import cv2
import numpy as np
import pytest

from chesslab import matte
from chesslab.calibration import CalibrationProfile, CropParams, compute_homography, crop_border_px

SIDE = 320
CELL = SIDE // 8


def _profile() -> CalibrationProfile:
    corners = [[0, 0], [SIDE, 0], [SIDE, SIDE], [0, SIDE]]
    return CalibrationProfile(
        profile="t", camera_index=0, frame_size=(SIDE, SIDE), board_size=SIDE,
        image_corners=corners, homography=compute_homography(corners, SIDE),
        white_pov=True, crop=replace(CropParams.default(SIDE), out_size=(32, 32)),
    )


def _board(pad: int) -> np.ndarray:
    """White board with all 9 grid lines per axis — the clean case the groove read expects."""
    img = np.full((SIDE + 2 * pad, SIDE + 2 * pad, 3), 255, np.uint8)
    for i in range(9):
        p = pad + i * CELL
        img[:, p - 1:p + 2] = 0
        img[p - 1:p + 2, :] = 0
    return img


def _entry(pad: int) -> dict:
    return {"board": "boards/000001.webp", "board_size": SIDE, "board_border": pad,
            "corners": _profile().image_corners, "ply": 3}


def test_a_clean_board_is_vetoed_before_the_model_runs():
    """No grooves missing, no hand — and the model must not even be asked (it is not loaded)."""
    pad = crop_border_px(_profile())
    assert matte.veto(_board(pad), _entry(pad)) == "no grid hand"


def test_an_erased_block_passes_the_veto():
    pad = crop_border_px(_profile())
    board = _board(pad)
    board[pad + 5 * CELL - 4:pad + 7 * CELL + 4, pad + 6 * CELL - 4:pad + 8 * CELL + 4] = 255
    assert matte.veto(board, _entry(pad)) == ""


def test_coverage_lands_on_the_squares_the_alpha_covers():
    """The alpha is cut by `crops_for_frame`, so a covered cell reads 1.0 and its neighbour 0.0."""
    prof = _profile()
    pad = crop_border_px(prof)
    alpha = np.zeros((SIDE + 2 * pad, SIDE + 2 * pad), np.float32)
    alpha[pad:pad + CELL, pad:pad + CELL] = 1.0          # a8, top-left in white POV
    cov = matte.coverage_of(alpha, _entry(pad), prof)
    assert cov["a8"] > 0.5
    assert cov["h1"] == 0.0


def test_a_zone_over_the_cap_is_dropped(monkeypatch):
    """A matte covering most of the board is a light change, not an arm — ply 55 covered 97 %."""
    prof = _profile()
    pad = crop_border_px(prof)
    board = _board(pad)
    board[pad:pad + 2 * CELL, pad:pad + 2 * CELL] = 255
    monkeypatch.setattr(matte, "alpha_for",
                        lambda b: (np.ones(b.shape[:2], np.float32), {"person": 0.9}))
    alpha, row = matte.matte_frame(board, _entry(pad), prof)
    assert alpha is None
    assert row["skipped"] == "zone too big"


def test_a_plausible_matte_is_kept_with_its_scores(monkeypatch):
    prof = _profile()
    pad = crop_border_px(prof)
    board = _board(pad)
    board[pad:pad + 2 * CELL, pad:pad + 2 * CELL] = 255
    mask = np.zeros((SIDE + 2 * pad, SIDE + 2 * pad), np.float32)
    mask[pad:pad + 2 * CELL, pad:pad + 2 * CELL] = 1.0
    monkeypatch.setattr(matte, "alpha_for", lambda b: (mask, {"person": 0.98}))
    alpha, row = matte.matte_frame(board, _entry(pad), prof)
    assert alpha is not None
    assert row["concepts"] == {"person": 0.98}
    assert row["cells_over_half"] == 4


@pytest.mark.parametrize("share, kept", [(0.5, True), (0.7, False)])
def test_the_cap_is_a_share_of_the_board(monkeypatch, share, kept):
    prof = _profile()
    pad = crop_border_px(prof)
    board = _board(pad)
    board[pad:pad + 2 * CELL, pad:pad + 2 * CELL] = 255
    h = board.shape[0]
    mask = np.zeros((h, h), np.float32)
    mask[:int(h * share)] = 1.0
    monkeypatch.setattr(matte, "alpha_for", lambda b: (mask, {}))
    assert (matte.matte_frame(board, _entry(pad), prof)[0] is not None) is kept


def test_the_alpha_survives_the_webp_roundtrip(tmp_path):
    """Written as 8-bit grey: a matte that comes back binarised would lose every soft edge."""
    alpha = np.linspace(0, 1, 256, dtype=np.float32).reshape(16, 16)
    path = tmp_path / "a.webp"
    cv2.imwrite(str(path), (alpha * 255).astype(np.uint8))
    back = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
    assert np.abs(back - alpha).max() < 0.02


def test_the_slice_carries_the_matte_into_the_manifest(tmp_path, monkeypatch):
    """Coverage under the drop threshold reaches the row the trainer reads, and only there."""
    import json

    import yaml

    from chesslab import config
    from chesslab.labeling import read_matte, slice_session

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = tmp_path / "data" / "sessions" / "s1"
    (sdir / "frames").mkdir(parents=True)
    corners = [[20, 20], [300, 20], [300, 220], [20, 220]]
    cv2.imwrite(str(sdir / "frames" / "000001.png"), np.full((240, 320, 3), 128, np.uint8))
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    (sdir / "log.jsonl").write_text(
        json.dumps({"frame": "frames/000001.png", "fen": fen, "ply": 1, "corners": corners}) + "\n",
        encoding="utf-8")
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "s1", "profile": "p", "mode": "track"}), encoding="utf-8")
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.12, "h1": 0.0}}) + "\n"
        + json.dumps({"frame": "000002", "skipped": "no grid hand"}) + "\n", encoding="utf-8")

    assert read_matte(sdir) == {"000001": {"a8": 0.12, "h1": 0.0}}

    prof = replace(_profile(), profile="p", frame_size=(320, 240), board_size=128,
                   image_corners=corners,
                   homography=compute_homography(corners, 128, 0.0),
                   crop=CropParams(cell=16.0, pad_up=0.0, pad_side=0.05, out_size=(32, 32)),
                   margin=0.0)
    slice_session(sdir, profile=prof, manifest_path=tmp_path / "m.jsonl",
                  squares_root=tmp_path / "squares", out_size=(32, 32))
    lines = (tmp_path / "m.jsonl").read_text(encoding="utf-8").splitlines()
    rows = {r["square"]: r for r in (json.loads(line) for line in lines)}
    assert rows["a8"]["coverage"] == 0.12
    assert rows["h1"]["coverage"] == 0.0
    assert rows["d4"]["coverage"] == 0.0, "a square the matte does not name is uncovered, not absent"


def test_a_hand_the_tracker_missed_still_takes_the_frame_out(tmp_path, monkeypatch):
    """The settle detector reacts to pieces moving; a resting arm moves none. The matte does."""
    import json

    import yaml

    from chesslab import config
    from chesslab.labeling import slice_session

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = tmp_path / "data" / "sessions" / "s1"
    (sdir / "frames").mkdir(parents=True)
    corners = [[20, 20], [300, 20], [300, 220], [20, 220]]
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    rows = []
    for stem in ("000001", "000002"):
        cv2.imwrite(str(sdir / "frames" / f"{stem}.png"), np.full((240, 320, 3), 128, np.uint8))
        rows.append({"frame": f"frames/{stem}.png", "fen": fen, "ply": 1, "corners": corners})
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "s1", "profile": "p", "mode": "track"}), encoding="utf-8")
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.9}}) + "\n", encoding="utf-8")

    prof = replace(_profile(), profile="p", frame_size=(320, 240), board_size=128,
                   image_corners=corners, homography=compute_homography(corners, 128, 0.0),
                   crop=CropParams(cell=16.0, pad_up=0.0, pad_side=0.05, out_size=(32, 32)),
                   margin=0.0)
    res = slice_session(sdir, profile=prof, manifest_path=tmp_path / "m.jsonl",
                        squares_root=tmp_path / "squares", out_size=(32, 32))

    assert res["dirty_dropped"] == 64, "the matted frame leaves, the clean one stays"
    assert res["crops"] == 64


def test_the_export_samples_by_position_not_by_time():
    """A position that stood ten seconds and one that stood two must weigh the same."""
    from chesslab.realgames import spread_indices

    assert spread_indices(100, 200, 8) == [100, 114, 128, 142, 157, 171, 185, 199]
    assert spread_indices(0, 3, 8) == [0, 1, 2], "never more boards than frames"
    assert spread_indices(5, 6, 4) == [5]
    assert spread_indices(7, 7, 4) == []
