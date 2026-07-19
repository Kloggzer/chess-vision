"""Camera-resolution selector for `chesslab track` (config presets → tracker → web API).

The hardware is never touched: the capture openers are monkeypatched, so these tests pin
the CONTRACT — which `CameraSpec` a requested mode produces, that "no mode requested"
still takes the exact legacy code path, and that the tracker reports what the camera
REALLY delivers rather than what was asked for (UVC drivers fall back silently).
"""

from __future__ import annotations

import numpy as np
import pytest

from chesslab import config
from chesslab.move_tracker import tracker as tr
from test_move_tracker import FakeCapture, _bgr_frame, _make_identity_profile


def _tracker(monkeypatch, *, res=None, frame_size=(400, 400), board_size=400):
    """MoveTracker on an identity profile + FakeCapture. Records how the capture was opened
    in `mt._opened` = {"open_source": [src], "open_capture": [spec]}."""
    prof = _make_identity_profile(board_size=board_size)
    prof.frame_size = frame_size
    fake = FakeCapture([_bgr_frame(["e2"], board_size=board_size)])
    calls: dict[str, list] = {"open_source": [], "open_capture": []}

    def _src(source):
        calls["open_source"].append(source)
        return fake

    def _cap(spec):
        calls["open_capture"].append(spec)
        return fake

    monkeypatch.setattr(tr, "open_source", _src)
    monkeypatch.setattr(tr, "open_capture", _cap)
    monkeypatch.setattr(tr, "ensure_profile", lambda *a, **k: prof)
    kwargs = {"profile": "phone", "source": "0", "live_align": False,
              "auto_record": False, "detect_scale": 1.0}
    if res is not None:
        kwargs["res"] = res
    mt = tr.MoveTracker(**kwargs)
    mt._opened = calls
    return mt


# --- plumbing: requested mode → CameraSpec --------------------------------------------

def test_requested_mode_opens_with_a_matching_spec(monkeypatch):
    mt = _tracker(monkeypatch, res="4k")
    assert mt._opened["open_source"] == []          # spec path, not the legacy path
    spec = mt._opened["open_capture"][0]
    assert (spec.width, spec.height) == (3840, 2160)
    assert spec.source == 0                          # "0" normalised to an int index
    assert mt.res == "4k"


def test_no_mode_keeps_the_legacy_open_call_exactly(monkeypatch):
    """Regression guard: without a resolution nothing may change — no CameraSpec is built,
    `open_source(src)` is called just like before, and config.CAMERA stays in charge."""
    mt = _tracker(monkeypatch)
    assert mt._opened["open_capture"] == []
    assert mt._opened["open_source"] == [0]
    assert mt.res == config.DEFAULT_CAMERA_MODE
    assert mt._cam_requested is None


def test_explicit_default_mode_is_also_the_legacy_path(monkeypatch):
    mt = _tracker(monkeypatch, res="default")
    assert mt._opened["open_capture"] == []
    assert mt._opened["open_source"] == [0]


def test_set_camera_mode_applies_on_the_next_open(monkeypatch):
    mt = _tracker(monkeypatch)
    mt.set_camera_mode("1080p")
    assert mt._cam_requested == (1920, 1080)
    mt.reattach_camera()
    spec = mt._opened["open_capture"][-1]
    assert (spec.width, spec.height) == (1920, 1080)


def test_reattach_can_switch_the_mode_live(monkeypatch):
    """Live switch: the game/history survive, only the capture is rebuilt."""
    mt = _tracker(monkeypatch)
    mt.reset_to_start()
    fen_before = mt.board.fen()
    out = mt.reattach_camera("1440p")
    assert out["ok"] is True and out["res"] == "1440p"
    assert mt.board.fen() == fen_before
    assert (mt._opened["open_capture"][-1].width,
            mt._opened["open_capture"][-1].height) == (2560, 1440)


# --- actual vs requested ---------------------------------------------------------------

def test_status_reports_actual_mode_when_the_camera_obeys(monkeypatch):
    mt = _tracker(monkeypatch, res="720p", frame_size=(1280, 720))
    mt._note_frame_size(np.zeros((720, 1280, 3), np.uint8))
    camera = mt.status()["camera"]
    assert camera["requested"] == [1280, 720]
    assert camera["actual"] == [1280, 720]
    assert camera["match"] is True
    assert camera["profile_mismatch"] is None


def test_status_flags_a_silent_camera_fallback(monkeypatch, caplog):
    """Asked for 4K, got 1440p — the whole point of measuring the real frame."""
    mt = _tracker(monkeypatch, res="4k", frame_size=(2560, 1440))
    with caplog.at_level("WARNING"):
        mt._note_frame_size(np.zeros((1440, 2560, 3), np.uint8))
    camera = mt.status()["camera"]
    assert camera["requested"] == [3840, 2160]
    assert camera["actual"] == [2560, 1440]
    assert camera["match"] is False
    assert "delivers 2560x1440" in caplog.text


def test_match_is_none_before_the_first_frame(monkeypatch):
    mt = _tracker(monkeypatch, res="4k")
    camera = mt.status()["camera"]
    assert camera["actual"] is None and camera["match"] is None


def test_unrequested_mode_never_counts_as_a_mismatch(monkeypatch):
    mt = _tracker(monkeypatch, frame_size=(1280, 720))
    mt._note_frame_size(np.zeros((720, 1280, 3), np.uint8))
    assert mt.status()["camera"]["match"] is True


# --- profile invalidation (pixel corners vs frame size) --------------------------------

def test_profile_frame_size_mismatch_warns_and_survives(monkeypatch, caplog):
    """A resolution change invalidates the profile's PIXEL corners. Regeneration needs
    ArUco markers, which a blank frame has none of — the tracker must keep running and
    surface the mismatch instead of raising."""
    mt = _tracker(monkeypatch, res="4k", frame_size=(2560, 1440))
    with caplog.at_level("WARNING"):
        mt._note_frame_size(np.zeros((2160, 3840, 3), np.uint8))   # no markers in a blank frame
    note = mt.status()["camera"]["profile_mismatch"]
    assert note is not None
    assert "2560x1440" in note and "3840x2160" in note
    assert "no longer valid" in caplog.text


def test_profile_regeneration_failure_never_raises(monkeypatch):
    mt = _tracker(monkeypatch, frame_size=(1280, 720))

    def _boom(*a, **k):
        raise RuntimeError("aruco exploded")

    monkeypatch.setattr("chesslab.calibration.profile_from_frame", _boom)
    mt._note_frame_size(np.zeros((2160, 3840, 3), np.uint8))       # must not propagate
    assert "aruco exploded" in mt.status()["camera"]["profile_mismatch"]


def test_failed_regeneration_is_retried_on_the_next_frame(monkeypatch):
    """H3: the size must NOT be latched while the profile mismatch is unresolved.

    Regeneration typically fails because the user's hand covers the ArUco markers at the
    exact moment they hit "Apply resolution". With the size latched there was no second
    attempt ever — the tracker kept warping with old-resolution corners while `auto_record`
    wrote mislabeled frames into a session."""
    mt = _tracker(monkeypatch, frame_size=(1280, 720))
    blank = np.zeros((2160, 3840, 3), np.uint8)          # right size, no markers

    calls = []
    monkeypatch.setattr(mt, "_regenerate_profile", lambda f: calls.append(f))
    for _ in range(4):
        mt._note_frame_size(blank)
    assert len(calls) == 4, "a failed regeneration must be retried, not latched"
    assert mt.status()["camera"]["profile_mismatch"] is not None


def test_successful_regeneration_stops_the_retries(monkeypatch):
    mt = _tracker(monkeypatch, frame_size=(1280, 720))
    frame = np.zeros((2160, 3840, 3), np.uint8)
    calls = []

    def _succeed(f):
        calls.append(f)
        mt.profile.frame_size = (3840, 2160)             # what a real regeneration does
        mt._profile_size_note = None

    monkeypatch.setattr(mt, "_regenerate_profile", _succeed)
    for _ in range(5):
        mt._note_frame_size(frame)
    assert len(calls) == 1
    assert mt.status()["camera"]["profile_mismatch"] is None


def test_recording_is_suppressed_while_the_profile_size_is_unresolved(monkeypatch):
    """H3: recording captures frame + profile corners; with a mismatch those corners belong
    to another resolution, so `chesslab slice` would later cut correctly-labeled crops from
    the wrong pixels."""
    mt = _tracker(monkeypatch, frame_size=(1280, 720))
    mt.auto_record = True
    mt._note_frame_size(np.zeros((2160, 3840, 3), np.uint8))   # blank -> regeneration fails
    assert mt._profile_size_note is not None

    started = []
    monkeypatch.setattr(mt, "_start_recorder_locked", lambda *a, **k: started.append(1))
    mt._queue_session_capture("e4")
    assert mt._pending_capture is None
    mt._flush_session_capture()
    assert started == []
    assert "board geometry unresolved" in mt._record_skip_reason
    assert mt.start_recording()["ok"] is False


def test_frame_size_check_is_a_noop_while_the_size_is_stable(monkeypatch):
    mt = _tracker(monkeypatch, frame_size=(400, 400))
    frame = np.zeros((400, 400, 3), np.uint8)
    mt._note_frame_size(frame)
    calls = []
    monkeypatch.setattr(mt, "_regenerate_profile", lambda f: calls.append(f))
    for _ in range(5):
        mt._note_frame_size(frame)
    assert calls == []


# --- web API ---------------------------------------------------------------------------

@pytest.fixture
def client(monkeypatch):
    from fastapi.testclient import TestClient

    from chesslab.move_tracker import app as app_mod

    started: list[dict] = []

    class StubTracker:
        def __init__(self, **kwargs):
            started.append(kwargs)
            self.res = kwargs.get("res", config.DEFAULT_CAMERA_MODE)
            self.cnn_run = kwargs.get("cnn_run")

        def reset_to_start(self, fen=None):
            pass

        def start(self):
            pass

        def stop(self):
            pass

        def reattach_camera(self, res=None):
            if res is not None:
                self.res = res
            return {"ok": True, "res": self.res}

        def status(self):
            return {"camera": {"res": self.res}}

    monkeypatch.setattr(app_mod, "MoveTracker", StubTracker)
    app_mod._STATE.update(tracker=None)
    c = TestClient(app_mod.create_app())
    c.started = started
    yield c
    app_mod._STATE.update(tracker=None)


def test_api_camera_modes_is_config_derived(client):
    body = client.get("/api/camera/modes").json()
    assert [m["name"] for m in body["modes"]] == list(config.CAMERA_MODES)
    assert body["default"] == config.DEFAULT_CAMERA_MODE
    assert body["active"] is None              # nothing running yet


def test_api_start_forwards_the_resolution(client):
    r = client.post("/api/start", json={"profile": "phone", "source": "0", "res": "4k"}).json()
    assert r["ok"] is True and r["res"] == "4k"
    assert client.started[-1]["res"] == "4k"
    assert client.get("/api/camera/modes").json()["active"] == "4k"


def test_api_start_without_resolution_passes_no_res_kwarg(client):
    """Backwards compatibility at the API boundary: the tracker keeps its own default."""
    client.post("/api/start", json={"profile": "phone", "source": "0"})
    assert "res" not in client.started[-1]


def test_api_reattach_switches_the_mode_live(client):
    client.post("/api/start", json={"profile": "phone", "source": "0"})
    r = client.post("/api/reattach", json={"res": "1080p"}).json()
    assert r == {"ok": True, "res": "1080p"}


def test_api_reattach_without_resolution_keeps_the_mode(client):
    client.post("/api/start", json={"profile": "phone", "source": "0", "res": "1440p"})
    assert client.post("/api/reattach", json={}).json()["res"] == "1440p"
