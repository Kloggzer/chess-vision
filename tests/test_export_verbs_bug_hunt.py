"""Bug hunt over the export / game-record verbs: `session`, `realgames`, the board store, retime.

Every test here FAILS today and its message names the defect.
"""

import json

import cv2
import numpy as np
import yaml

from chesslab import config

FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
CORNERS = [[10.0, 10.0], [190.0, 10.0], [190.0, 150.0], [10.0, 150.0]]
BOARD_SIZE = 128
NS = 1_000_000_000
SYNC_BASE = 187_635_000_000_000


def _picture(h=160, w=200):
    y, x = np.mgrid[0:h, 0:w]
    return np.stack([(x % 251), (y % 251), ((x + y) % 251)], axis=-1).astype(np.uint8)


def _profile(name="desktop", board_size=BOARD_SIZE, corners=None, frame_size=(200, 160)):
    from chesslab.calibration import (
        CalibrationProfile,
        CropParams,
        compute_homography,
        profile_path,
    )

    quad = corners or CORNERS
    prof = CalibrationProfile(
        profile=name, camera_index=-1, frame_size=frame_size, board_size=board_size,
        image_corners=quad, homography=compute_homography(quad, board_size, 0.0),
        white_pov=True, crop=CropParams.default(board_size), margin=0.0, source="test")
    prof.save(profile_path(name))
    return prof


def _session(tmp_path, monkeypatch, rows, *, frame=True, board=False):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    prof = _profile()
    sdir = config.DATA.recordings / "g"
    (sdir / "frames").mkdir(parents=True)
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "rg-g", "profile": "desktop", "mode": "track"}),
        encoding="utf-8")
    (sdir / "log.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    if frame:
        cv2.imwrite(str(sdir / "frames" / "000001.png"), _picture())
    if board:
        (sdir / "boards").mkdir()
        cv2.imwrite(str(sdir / "boards" / "000001.webp"), _picture())
    return sdir, prof


def _first_row(sdir):
    return json.loads((sdir / "log.jsonl").read_text(encoding="utf-8").splitlines()[0])


def test_session_boards_keeps_a_dirty_rows_board_out_of_the_clean_stock(tmp_path, monkeypatch):
    from chesslab import sessions

    row = {"frame": "frames/000001.png", "ply": 1, "fen": FEN, "corners": CORNERS,
           "dirty": True, "dirty_reason": "occluded"}
    sdir, _prof = _session(tmp_path, monkeypatch, [row])

    sessions.write_boards_session("rg-g")

    assert _first_row(sdir).get("board") == "dirty/000001.webp", (
        "`session boards` (sessions.write_boards_session -> realgames.board_from_frame) never "
        "passes the row's `dirty` flag to write_board, so a hand frame's board lands in boards/ "
        "— the directory temporal_matte.bracketing and sensor_audit.audit read as the CLEAN "
        "reference stock, and the old dirty/ file is orphaned")


def test_session_boards_leaves_a_parked_sessions_board_pointers_alone(tmp_path, monkeypatch):
    from chesslab import sessions

    row = {"frame": "frames/000001.png", "ply": 1, "fen": FEN, "corners": CORNERS,
           "board": "boards/000001.webp", "board_size": BOARD_SIZE, "board_border": 8,
           "board_straightened": True}
    sdir, _prof = _session(tmp_path, monkeypatch, [row], frame=False, board=True)

    sessions.write_boards_session("rg-g")

    assert _first_row(sdir).get("board") == "boards/000001.webp", (
        "`session boards` has no missing_source_frames() guard (scan, autofix, fit-mesh and "
        "mark-hands all have one), so on a `session park-frames` session it pops every row's "
        "board keys, fails to rewrite them, and leaves a log pointing at nothing while the "
        "boards are still on disk")


def test_frame_anchor_names_the_picture_retime_actually_wrote(tmp_path, monkeypatch):
    from chesslab.realgames import frame_anchor, game_dir

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    frames = game_dir("g") / "frames"
    frames.mkdir(parents=True)
    (frames / "000130.webp").write_bytes(b"not-really-a-webp")

    line = frame_anchor("g", {"ply": 1, "san": "e4", "frame": 100, "frame_review": 130})

    assert "000130.webp" in line, (
        "retime._write_boards writes the review boards at `frame_review` +-2 and deletes the "
        "old set, but frame_anchor still resolves `frames/<move.frame>.webp` — so after a "
        "retime every `realgames confirm` report line points at a file that does not exist "
        "(platform/app/lib/review-cards.ts:147 reads `frame_review ?? frame`)")


def test_model_read_warps_a_row_that_has_no_stored_board(tmp_path, monkeypatch):
    from chesslab.labeling import crops_for_frame
    from chesslab.occluded_model import frame_cells

    row = {"frame": "frames/000001.png", "ply": 1, "fen": FEN, "corners": CORNERS}
    sdir, prof = _session(tmp_path, monkeypatch, [row])
    frame = cv2.imread(str(sdir / "frames" / "000001.png"))

    got = frame_cells(sdir, row, prof)

    assert np.array_equal(got[0], crops_for_frame(frame, CORNERS, prof)[0]), (
        "occluded_model.frame_cells falls back to `row['frame']` and hands the RAW camera "
        "frame to crops_for_frame as `board=`, which skips the warp entirely — a session "
        "exported with --no-fit is read at 64 wrong places and written to model-reads.jsonl "
        "without a word")


def _capture_bundle(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    _profile(board_size=256, corners=[[40, 40], [600, 40], [600, 440], [40, 440]],
             frame_size=(640, 480))
    bundle = config.DATA.recordings / "g" / "files" / "sessions" / "20260913-000000"
    bundle.mkdir(parents=True)
    bundle.joinpath("log.jsonl").write_text(json.dumps(
        {"frame": "frames/0000.jpg", "ply": 1, "fen": FEN, "ts": "2026-09-13T10:00:00Z",
         "corners": [[44, 40], [604, 40], [604, 440], [44, 440]]}) + "\n", encoding="utf-8")
    bundle.joinpath("capture.json").write_text(json.dumps(
        {"shot_id": "t", "steps": [{"ply": 1, "orientation_deg": 0,
                                    "elapsed_ns": SYNC_BASE + NS}]}), encoding="utf-8")
    bundle.joinpath("timeline.jsonl").write_text(json.dumps(
        {"seq": 0, "kind": "video_sync", "elapsedNs": SYNC_BASE, "durationNs": 0}) + "\n",
        encoding="utf-8")
    writer = cv2.VideoWriter(str(bundle / "video.mp4"),
                             cv2.VideoWriter_fourcc(*"mp4v"), 30, (640, 480))
    for _ in range(40):
        writer.write(_picture(480, 640))
    writer.release()
    return bundle


def test_capture_import_leaves_a_session_the_rest_of_the_pipeline_can_read(tmp_path, monkeypatch):
    from chesslab.capture_import import import_capture

    _capture_bundle(tmp_path, monkeypatch)

    res = import_capture("g")

    assert (res["session_dir"] / "session.yaml").is_file(), (
        "`chesslab capture import` writes log.jsonl and boards/ but no session.yaml, while "
        "realgames.write_session does — so slice, session boards, settle-scan and model-read "
        "all die in read_session_meta, and position_flags/frame_hands skip the recording "
        "silently because they test for that very file")
