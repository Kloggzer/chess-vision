"""The alpha worker: only what still carries its FEN, resumable, and cut like the crop."""

from dataclasses import replace

import cv2
import numpy as np

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


def _entry(pad: int) -> dict:
    return {"board": "boards/000001.webp", "board_size": SIDE, "board_border": pad,
            "corners": _profile().image_corners, "ply": 3}


def test_coverage_lands_on_the_squares_the_alpha_covers():
    """The alpha is cut by `crops_for_frame`, so a covered cell reads 1.0 and its neighbour 0.0."""
    prof = _profile()
    pad = crop_border_px(prof)
    alpha = np.zeros((SIDE + 2 * pad, SIDE + 2 * pad), np.float32)
    alpha[pad:pad + CELL, pad:pad + CELL] = 1.0          # a8, top-left in white POV
    cov = matte.coverage_of(alpha, _entry(pad), prof)
    assert cov["a8"] > 0.5
    assert cov["h1"] == 0.0


def _session(tmp_path, monkeypatch, rows):
    """A session carrying a dirty pile, the shape `alpha_worker` reads."""
    import json

    import yaml

    from chesslab import config

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = tmp_path / "data" / "sessions" / "rg-s1"
    (sdir / "dirty").mkdir(parents=True)
    for r in rows:
        cv2.imwrite(str(sdir / r["board"]), np.full((SIDE, SIDE, 3), 128, np.uint8))
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "rg-s1", "profile": "t", "mode": "track"}), encoding="utf-8")
    return sdir


def _dirty_rows(pad):
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    return [{"frame": f"frames/00000{i}.png", "board": f"dirty/00000{i}.webp", "ply": 1,
             "fen": fen, "dirty": True, "dirty_reason": reason, "corners": _profile().image_corners,
             "board_size": SIDE, "board_border": pad}
            for i, reason in enumerate(("occluded", "stale"), 1)]


def test_the_worker_only_mattes_what_still_carries_its_fen(tmp_path, monkeypatch):
    """A `stale` frame's alpha would mask a position nobody knows — SAM 3 time for nothing."""
    pad = crop_border_px(_profile())
    rows = _dirty_rows(pad)
    sdir = _session(tmp_path, monkeypatch, rows)
    seen = []
    monkeypatch.setattr(matte, "alpha_sam3",
                        lambda b: (seen.append(1), (np.zeros(b.shape[:2], np.float32), {}))[1])
    monkeypatch.setattr(matte, "coverage_of", lambda *a, **k: {"a8": 0.9})
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())

    res = matte.alpha_worker("s1", progress=False)

    assert res["frames"] == 1 and len(seen) == 1, "only the occluded row"
    assert (sdir / "mattes" / "000001.webp").exists()
    assert not (sdir / "mattes" / "000002.webp").exists()


def test_the_worker_resumes_where_it_was_killed(tmp_path, monkeypatch):
    """11.9 s a frame: a row lands the moment it is done, so a kill costs one frame, not the run."""
    pad = crop_border_px(_profile())
    _session(tmp_path, monkeypatch, _dirty_rows(pad))
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.zeros(b.shape[:2], np.float32), {}))
    monkeypatch.setattr(matte, "coverage_of", lambda *a, **k: {"a8": 0.9})
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())

    matte.alpha_worker("s1", progress=False)
    again = matte.alpha_worker("s1", progress=False)

    assert again["frames"] == 0 and again["already"] == 1, "the finished row is not redone"


def test_an_alpha_over_most_of_the_board_is_dropped(tmp_path, monkeypatch):
    """A matte covering the board is a light change, not an arm — ply 55 covered 97 %."""
    pad = crop_border_px(_profile())
    sdir = _session(tmp_path, monkeypatch, _dirty_rows(pad))
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.ones(b.shape[:2], np.float32), {}))
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())

    res = matte.alpha_worker("s1", progress=False)

    assert res["alphas"] == 0
    assert res["skipped"] == {"zone too big": 1}
    assert not (sdir / "mattes" / "000001.webp").exists()


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


def test_the_p8_slot_borrows_from_beside_it_when_its_own_frame_has_a_hand():
    """8 boards per position, spread — a slot the hand sits in takes the nearest clean neighbour."""
    from chesslab.realgames import pick_spread

    items = list(range(20))
    assert pick_spread(items, lambda i: True, 4) == [0, 6, 13, 19]
    assert pick_spread(items, lambda i: i % 2 == 0, 4) == [0, 6, 12, 18]
    assert pick_spread(items, lambda i: i > 15, 4) == [16, 17, 18, 19], "all four still arrive"
    assert pick_spread(items, lambda i: i == 3, 4) == [3], "never the same frame twice"
    assert pick_spread([], lambda i: True, 4) == []


def test_the_limit_is_a_target_not_a_batch(tmp_path, monkeypatch):
    """"Bring the frames to 80" on a session holding 40 means 40 more, never another 80."""
    import json

    pad = crop_border_px(_profile())
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    rows = [{"frame": f"frames/{i:06d}.png", "board": f"dirty/{i:06d}.webp", "ply": 1, "fen": fen,
             "dirty": True, "dirty_reason": "occluded", "corners": _profile().image_corners,
             "board_size": SIDE, "board_border": pad} for i in range(1, 7)]
    sdir = _session(tmp_path, monkeypatch, rows)
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.zeros(b.shape[:2], np.float32), {}))
    monkeypatch.setattr(matte, "coverage_of", lambda *a, **k: {"a8": 0.9})
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())

    assert matte.alpha_worker("s1", limit=2, progress=False)["alphas"] == 2
    second = matte.alpha_worker("s1", limit=4, progress=False)

    assert second["already"] == 2, "the two it already has are counted, not redone"
    assert second["alphas"] == 2, "it fills the gap to four"
    assert len(json.loads(json.dumps(
        [json.loads(x) for x in (sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines()]
    ))) == 4
    assert matte.alpha_worker("s1", limit=4, progress=False)["alphas"] == 0, "asking again is free"
