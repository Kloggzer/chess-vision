"""Stage 3 — SessionWriter tests (headless, synthetic frames)."""

import json

import numpy as np

from chesslab.collect import SessionWriter


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


def test_capture_writes_frames_and_log(tmp_path):
    w = _writer(tmp_path)
    w.capture(_frame(), ply=1, fen="fen-a", move_san="e4")
    w.capture(_frame(), ply=2, fen="fen-b", move_san="e5")
    assert (w.dir / "frames/0000.png").exists()
    assert (w.dir / "frames/0001.png").exists()
    lines = [l for l in w.log_path.read_text(encoding="utf-8").splitlines() if l.strip()]
    assert len(lines) == 2
    assert json.loads(lines[0])["fen"] == "fen-a"
    assert w.count == 2
    assert (w.dir / "session.yaml").exists()


def test_capture_persists_corners(tmp_path):
    """Die zur Aufnahmezeit verifizierte Brett-Geometrie wird ins Log geschrieben."""
    w = _writer(tmp_path)
    corners = [[10, 10], [54, 10], [54, 38], [10, 38]]   # a8,h8,h1,a1 in Frame-Pixeln
    w.capture(_frame(), ply=1, fen="fen-a", corners=corners)
    w.capture(_frame(), ply=2, fen="fen-b")               # ohne Geometrie -> kein Feld
    lines = [json.loads(l) for l in w.log_path.read_text(encoding="utf-8").splitlines() if l.strip()]
    assert lines[0]["corners"] == corners
    assert "corners" not in lines[1]
    # undo schreibt die Einträge konsistent (inkl. corners) zurück
    w.capture(_frame(), 3, "fen-c")
    w.undo()
    lines = [json.loads(l) for l in w.log_path.read_text(encoding="utf-8").splitlines() if l.strip()]
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
    lines = [l for l in w.log_path.read_text(encoding="utf-8").splitlines() if l.strip()]
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
    w.close(notes="Tageslicht")
    meta = yaml.safe_load((w.dir / "session.yaml").read_text(encoding="utf-8"))
    assert meta["mode"] == "live"
    assert meta["profile"] == "default"
    assert meta["frame_size"] == [64, 48]
    assert meta["notes"] == "Tageslicht"
