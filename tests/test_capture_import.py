"""Phase 01: ein Erfassungs-Buendel wird zu Brettern, und der Frame-Name kommt aus `capture.json`."""

import json
from pathlib import Path

import pytest

from chesslab import config
from chesslab.capture_import import import_capture

FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
#: Die wahren Brettecken im Testbild, und das grobe Quad, das das Buendel-Log statt dessen fuehrt
#: — der Grid-Fit muss es auf die Rillen zurueckziehen, sonst schneidet der Import daneben.
CORNERS = [[40, 40], [600, 40], [600, 440], [40, 440]]
COARSE = [[x + 4, y] for x, y in CORNERS]
BOARD_SIZE = 256
REFERENCE_LOG = Path("data/recordings/2026-09-06-21-29-35/log.jsonl")


def _profile(name="desktop"):
    from chesslab.calibration import (
        CalibrationProfile,
        CropParams,
        compute_homography,
        profile_path,
    )

    prof = CalibrationProfile(
        profile=name, camera_index=-1, frame_size=(640, 480), board_size=BOARD_SIZE,
        image_corners=CORNERS, homography=compute_homography(CORNERS, BOARD_SIZE, 0.0),
        white_pov=True, crop=CropParams.default(BOARD_SIZE), margin=0.0, source="test")
    prof.save(profile_path(name))


def _board():
    """Ein Brett mit lesbaren Rillen — der Grid-Fit misst genau die 18 Linien, nichts sonst."""
    import numpy as np

    img = np.full((480, 640, 3), 170, np.uint8)
    (x0, y0), w, h = CORNERS[0], 560, 400
    for k in range(9):
        x, y = x0 + k * w // 8, y0 + k * h // 8
        img[y0 - 10:y0 + h + 10, x - 3:x + 3] = 30
        img[y - 3:y + 3, x0 - 10:x0 + w + 10] = 30
    return img


def _video(path, frames):
    import cv2

    board = _board()
    w = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), 10, (640, 480))
    for _ in range(frames):
        w.write(board)
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


def test_the_grid_fit_runs_before_the_boards_are_cut(tmp_path, monkeypatch):
    """Ohne ihn blieben die Ecken das grobe Quad, keine Zeile truege `grid_lines`, und ohne die
    findet `meshes_for_boards` nichts — jedes Brett kaeme gebogen heraus."""
    from chesslab.realgames import FIT_SOURCE

    _bundle(tmp_path, monkeypatch)
    res = import_capture("g")

    assert res["fit"][FIT_SOURCE] == 3, "jeder Frame wurde auf seine eigenen Rillen gezogen"
    assert res["no_mesh"] == 0
    for row in res["rows"]:
        assert row["grid_lines"]["x"] and row["grid_lines"]["y"]
        assert row["board_straightened"] is True
        assert row["corners"] != COARSE, "das ArUco-Quad darf nicht stehenbleiben"
