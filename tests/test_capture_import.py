"""Phase 01: ein Erfassungs-Buendel wird zu Brettern, und der Frame-Name kommt aus `capture.json`."""

import json
from pathlib import Path

import pytest

from chesslab import config
from chesslab.capture_import import import_capture

FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
CORNERS = [[20, 20], [300, 20], [300, 220], [20, 220]]
REFERENCE_LOG = Path("data/recordings/2026-09-06-21-29-35/log.jsonl")


def _profile(name="desktop"):
    from chesslab.calibration import (
        CalibrationProfile,
        CropParams,
        compute_homography,
        profile_path,
    )

    prof = CalibrationProfile(
        profile=name, camera_index=-1, frame_size=(320, 240), board_size=128,
        image_corners=CORNERS, homography=compute_homography(CORNERS, 128, 0.0),
        white_pov=True, crop=CropParams.default(128), margin=0.0, source="test")
    prof.save(profile_path(name))


def _video(path, frames):
    import cv2
    import numpy as np

    w = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), 10, (320, 240))
    for i in range(frames):
        w.write(np.full((240, 320, 3), 30 + (i % 8) * 20, np.uint8))
    w.release()


def _bundle(tmp_path, monkeypatch, *, video_frame=(2, 5, 8), capture=True, drop_step=None):
    """Eine Aufnahme mit einem Buendel: `log.jsonl`, `capture.json`, Video, Kalibrierprofil."""
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    _profile()
    bundle = config.DATA.recordings / "g" / "files" / "sessions" / "20260913-000000"
    bundle.mkdir(parents=True)
    plies = list(range(1, len(video_frame) + 1))
    bundle.joinpath("log.jsonl").write_text("".join(
        json.dumps({"frame": f"frames/{i:04d}.jpg", "ply": ply, "fen": FEN, "move_san": "d4",
                    "ts": "2026-09-13T10:00:00Z", "corners": CORNERS}) + "\n"
        for i, ply in enumerate(plies)), encoding="utf-8")
    if capture:
        steps = [{"ply": ply, "orientation_deg": 45 * i, "video_frame": f}
                 for i, (ply, f) in enumerate(zip(plies, video_frame, strict=True))]
        if drop_step is not None:
            del steps[drop_step]["video_frame"]
        bundle.joinpath("capture.json").write_text(json.dumps(
            {"shot_id": "wq-light-sehr-hell", "height": "normal", "steps": steps}), encoding="utf-8")
    _video(bundle / "video.mp4", max(video_frame) + 1)
    return bundle


def test_three_frames_make_three_boards_and_three_rows(tmp_path, monkeypatch):
    _bundle(tmp_path, monkeypatch)
    res = import_capture("g")

    session = res["session_dir"]
    assert len(res["rows"]) == 3
    assert sorted(p.name for p in (session / "boards").iterdir()) == \
        ["000002.webp", "000005.webp", "000008.webp"]
    assert len((session / "log.jsonl").read_text(encoding="utf-8").strip().splitlines()) == 3


def test_without_capture_json_it_refuses_and_writes_nothing(tmp_path, monkeypatch):
    _bundle(tmp_path, monkeypatch, capture=False)
    with pytest.raises(FileNotFoundError, match="capture.json"):
        import_capture("g")

    session = config.DATA.recordings / "g"
    assert not (session / "log.jsonl").exists()
    assert not (session / "boards").exists()


def test_rows_carry_the_keys_of_an_exported_log(tmp_path, monkeypatch):
    """Nichts Eigenes: `slice` und alles danach duerfen keinen Unterschied sehen."""
    if not REFERENCE_LOG.is_file():
        pytest.skip(f"{REFERENCE_LOG} liegt nicht im Arbeitsbaum")
    known = set(json.loads(REFERENCE_LOG.read_text(encoding="utf-8").splitlines()[0]))
    _bundle(tmp_path, monkeypatch)
    res = import_capture("g")

    for row in res["rows"]:
        assert set(row) <= known, f"erfundene Schluessel: {set(row) - known}"
        assert {"frame", "ply", "fen", "corners", "board", "board_size", "board_border"} <= set(row)


def test_ply_is_carried_and_move_san_never_appears(tmp_path, monkeypatch):
    _bundle(tmp_path, monkeypatch)
    res = import_capture("g")

    assert [r["ply"] for r in res["rows"]] == [1, 2, 3]
    for row in res["rows"]:
        assert "move_san" not in row and "moveSan" not in row


def test_frame_names_come_from_capture_json_not_from_the_order(tmp_path, monkeypatch):
    """Die n-te Zeile ist NICHT der n-te Frame — der Video-Index steht in `capture.json`."""
    _bundle(tmp_path, monkeypatch, video_frame=(117, 193))
    res = import_capture("g")

    assert [r["frame"] for r in res["rows"]] == ["frames/000117.png", "frames/000193.png"]
    assert [r["board"] for r in res["rows"]] == ["boards/000117.webp", "boards/000193.webp"]


def test_a_step_without_video_frame_aborts_and_writes_nothing(tmp_path, monkeypatch):
    _bundle(tmp_path, monkeypatch, drop_step=1)
    with pytest.raises(ValueError, match="video_frame"):
        import_capture("g")

    session = config.DATA.recordings / "g"
    assert not (session / "log.jsonl").exists()
    assert not (session / "boards").exists()


def test_a_second_run_overwrites_cleanly(tmp_path, monkeypatch):
    _bundle(tmp_path, monkeypatch)
    first = (import_capture("g")["session_dir"] / "log.jsonl").read_text(encoding="utf-8")
    session = import_capture("g")["session_dir"]

    assert (session / "log.jsonl").read_text(encoding="utf-8") == first
    assert len(list((session / "boards").iterdir())) == 3
