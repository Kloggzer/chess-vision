"""SessionWriter tests (headless, synthetic frames)."""

import json

import numpy as np

from chesslab.session_writer import SessionWriter


def _frame():
    return np.full((48, 64, 3), 127, dtype=np.uint8)


def _writer(tmp_path):
    return SessionWriter(
        tmp_path / "20260625-201500",
        session_id="20260625-201500",
        profile="default",
        mode="live",
        camera_index=0,
        frame_size=(64, 48),
    )


def test_redact_source_drops_only_the_credentials():
    """A session's metadata is long-lived and copied around — an IP-cam URL's basic-auth
    credentials must not be in it, while host/port/path (the camera's identity) must."""
    from chesslab.session_writer import redact_source

    assert redact_source(0) == "0"
    assert redact_source(None) == ""
    assert redact_source("https://phone:4444/video/snapshot") == "https://phone:4444/video/snapshot"
    assert redact_source("https://bob:hunter2@phone:4444/v") == "https://phone:4444/v"
    assert redact_source("rtsp://u:p@host:554/live") == "rtsp://host:554/live"
    assert redact_source("https://phone/a@b") == "https://phone/a@b"    # @ in the path stays


def test_session_yaml_records_which_camera_took_it(tmp_path):
    """`camera_index` alone cannot tell a USB camera from a phone (a URL override leaves the
    index at 0 or -1), so the effective source is recorded — credential-free."""
    import yaml

    SessionWriter(tmp_path / "s", session_id="s", profile="p", mode="play", camera_index=-1,
                  camera_source="https://bob:hunter2@phone:4444/video/m.jpeg",
                  camera_capture_source="https://bob:hunter2@phone:4444/video/snapshot",
                  frame_size=(1080, 1920))
    text = (tmp_path / "s" / "session.yaml").read_text(encoding="utf-8")
    meta = yaml.safe_load(text)
    assert meta["camera_source"] == "https://phone:4444/video/m.jpeg"
    assert meta["camera_capture_source"] == "https://phone:4444/video/snapshot"
    assert "hunter2" not in text
    # A URL is not the calibrated rig lens, whatever the index says.


def test_an_unstated_source_is_omitted_not_invented(tmp_path):
    """Callers that do not tell the writer their source (e.g. the move tracker hardcodes
    camera_index=0) get no `camera_source` key — unknown must stay unknown."""
    import yaml

    w = _writer(tmp_path)
    meta = yaml.safe_load((w.dir / "session.yaml").read_text(encoding="utf-8"))
    assert "camera_source" not in meta and "camera_capture_source" not in meta


def test_frame_size_is_corrected_to_the_frames_actually_written(tmp_path):
    """The saved snapshot can be far larger than the preview it was measured on — the
    metadata must describe the files on disk, or 'what resolution is this session' is a guess."""
    import yaml

    w = SessionWriter(tmp_path / "s", session_id="s", profile="p", mode="play", camera_index=-1,
                      camera_source="https://phone/video/m.jpeg", frame_size=(1080, 1920))
    w.capture(np.zeros((4096, 3072, 3), np.uint8), 0, "8/8/8/8/8/8/8/8 w - - 0 1")
    w.close()
    meta = yaml.safe_load((tmp_path / "s" / "session.yaml").read_text(encoding="utf-8"))
    assert meta["frame_size"] == [3072, 4096]


def test_capture_writes_frames_and_log(tmp_path):
    w = _writer(tmp_path)
    w.capture(_frame(), ply=1, fen="fen-a", move_san="e4")
    w.capture(_frame(), ply=2, fen="fen-b", move_san="e5")
    assert (w.dir / "frames/0000.png").exists()
    assert (w.dir / "frames/0001.png").exists()
    lines = [line for line in w.log_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(lines) == 2
    assert json.loads(lines[0])["fen"] == "fen-a"
    assert w.count == 2
    assert (w.dir / "session.yaml").exists()


def test_capture_persists_corners(tmp_path):
    """The board geometry verified at capture time is written into the log."""
    w = _writer(tmp_path)
    corners = [[10, 10], [54, 10], [54, 38], [10, 38]]   # a8,h8,h1,a1 in frame pixels
    w.capture(_frame(), ply=1, fen="fen-a", corners=corners)
    w.capture(_frame(), ply=2, fen="fen-b")               # without geometry -> no corners
    lines = [json.loads(line) for line in w.log_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert lines[0]["corners"] == corners
    assert "corners" not in lines[1]
    # undo writes the entries back consistently (incl. corners)
    w.capture(_frame(), 3, "fen-c")
    w.undo()
    lines = [json.loads(line) for line in w.log_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert lines[0]["corners"] == corners and len(lines) == 2


def test_capture_persists_labels(tmp_path):
    """Explizite Per-Feld-Labels (Inference/Active-Learning) landen im Log (inkl. occluded)."""
    w = _writer(tmp_path)
    labels = {"e1": "wK", "e2": "empty", "d4": "occluded"}
    w.capture(_frame(), ply=0, fen="x", labels=labels)
    line = json.loads(w.log_path.read_text(encoding="utf-8").splitlines()[0])
    assert line["labels"] == labels


def test_undo_removes_frame_and_log_line(tmp_path):
    w = _writer(tmp_path)
    w.capture(_frame(), 1, "fen-a")
    w.capture(_frame(), 2, "fen-b")
    removed = w.undo()
    assert removed["fen"] == "fen-b"
    assert not (w.dir / "frames/0001.png").exists()
    assert (w.dir / "frames/0000.png").exists()
    lines = [line for line in w.log_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(lines) == 1
    assert w.count == 1
    # next capture reuses the freed index
    w.capture(_frame(), 2, "fen-c")
    assert (w.dir / "frames/0001.png").exists()


def test_undo_on_empty_returns_none(tmp_path):
    w = _writer(tmp_path)
    assert w.undo() is None


def test_session_yaml_has_metadata(tmp_path):
    import yaml

    w = _writer(tmp_path)
    w.capture(_frame(), ply=1, fen="fen-a")   # a session with nothing in it is discarded on close
    w.close(notes="Tageslicht")
    meta = yaml.safe_load((w.dir / "session.yaml").read_text(encoding="utf-8"))
    assert meta["mode"] == "live"
    assert meta["profile"] == "default"
    assert meta["frame_size"] == [64, 48]
    assert meta["notes"] == "Tageslicht"

# --- empty sessions are not kept -------------------------------------------------------

def test_close_discards_a_session_that_captured_nothing(tmp_path):
    """`__init__` writes the directory and session.yaml before anything is captured, so merely
    opening the collect page left a session behind. Nothing captured = nothing to park."""
    w = _writer(tmp_path)
    assert w.dir.is_dir() and (w.dir / "session.yaml").exists()
    assert w.close() is True
    assert not w.dir.exists()


def test_close_keeps_a_session_with_frames(tmp_path):
    w = _writer(tmp_path)
    w.capture(_frame(), ply=1, fen="fen-a")
    assert w.close() is False
    assert (w.dir / "session.yaml").exists()


def test_close_never_removes_a_directory_holding_anything_unexpected(tmp_path):
    """The one delete under `data/`, where the rule is park-never-delete: an unknown file means
    something is there, so the whole directory stays."""
    w = _writer(tmp_path)
    (w.dir / "notes.txt").write_text("keep me", encoding="utf-8")
    assert w.close() is False
    assert w.dir.is_dir() and (w.dir / "notes.txt").exists()


def test_close_survives_a_session_directory_that_vanished(tmp_path):
    """Deleting the session in the UI while a writer is open must not make Finish throw — that
    left `COLLECT['writer']` set forever and wedged the Collect page until a server restart."""
    import shutil

    w = _writer(tmp_path)
    w.capture(_frame(), ply=1, fen="fen-a")
    shutil.rmtree(w.dir)
    w.close()          # must not raise
    assert not w.dir.exists()
