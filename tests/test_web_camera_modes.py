"""The Collect page's capture resolution + lens undistortion (`chesslab.web.camera`).

No hardware: the public opener is faked at the `web.camera` seam, or — where the point IS
the lens wiring — `cv2.VideoCapture` is replaced and a synthetic `calib.npz` written, the
same pattern `tests/test_lens.py` uses.

The behavioural crux: (a) the shared capture goes through `open_capture`, which is the only
place undistortion is installed, (b) a MODE change reopens the capture just like a SOURCE
change, and (c) what the UI reports is the size the camera DELIVERS, never the request.
"""

from __future__ import annotations

from dataclasses import replace

import numpy as np
import pytest

from chesslab import camera as cam
from chesslab import config, lens
from chesslab.web import camera as web_cam


class FakeCap:
    """cv2.VideoCapture stand-in that delivers frames of a fixed, possibly unrequested size."""

    def __init__(self, w=640, h=480) -> None:
        self.w, self.h = w, h
        self.released = False

    def isOpened(self):
        return True

    def read(self):
        return True, np.full((self.h, self.w, 3), 128, np.uint8)

    def release(self):
        self.released = True

    def set(self, prop, val):
        return True

    def get(self, prop):
        return 0.0


@pytest.fixture(autouse=True)
def _fresh_camera(monkeypatch, tmp_path):
    """A released singleton and a lens path pointing at an empty dir (no undistortion)."""
    monkeypatch.setattr(config, "LENS", replace(config.LENS, path=str(tmp_path / "calib.npz")))
    monkeypatch.setattr(lens, "_warned", True)          # keep the log quiet
    lens._MAP_CACHE.clear()
    web_cam.CAMERA.release()
    yield
    web_cam.CAMERA.release()
    lens._MAP_CACHE.clear()


@pytest.fixture
def opened(monkeypatch):
    """Records every CameraSpec `Camera.ensure` opens; frames are 640x480 unless changed."""
    specs: list = []
    caps: list[FakeCap] = []
    box = {"w": 640, "h": 480}

    def _open(spec):
        specs.append(spec)
        c = FakeCap(box["w"], box["h"])
        caps.append(c)
        return c

    monkeypatch.setattr(web_cam, "open_capture", _open)
    return {"specs": specs, "caps": caps, "size": box}


# --- the endpoint ---------------------------------------------------------------------

def test_camera_modes_endpoint_is_config_derived():
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from chesslab.web.app import create_app

    body = TestClient(create_app()).get("/api/camera/modes").json()
    assert [m["name"] for m in body["modes"]] == list(config.CAMERA_MODES)
    assert body["default"] == config.DEFAULT_CAMERA_MODE
    assert body["camera"]["open"] is False           # nothing opened by asking
    assert body["camera"]["modes_apply"] is True     # no URL override in this env


# --- reopen semantics -----------------------------------------------------------------

def test_a_mode_change_reopens_the_capture(opened):
    """Comparing only the source would silently keep the old resolution."""
    web_cam.CAMERA.ensure(0)
    web_cam.CAMERA.ensure(0, "1080p")
    assert len(opened["specs"]) == 2
    assert (opened["specs"][-1].width, opened["specs"][-1].height) == (1920, 1080)
    assert opened["caps"][0].released is True        # old handle let go before reopening


def test_the_same_mode_does_not_reopen(opened):
    web_cam.CAMERA.ensure(0, "1080p")
    web_cam.CAMERA.ensure(0, "1080p")
    web_cam.CAMERA.ensure(0, config.DEFAULT_CAMERA_MODE)   # "default" == "" (same request)
    web_cam.CAMERA.ensure(0, "")
    assert len(opened["specs"]) == 2                 # 1080p, then the default — that is all


# --- delivered vs requested -----------------------------------------------------------

def test_status_reports_the_delivered_size_not_the_requested_one(opened):
    opened["size"].update(w=640, h=480)              # driver picks its own mode
    web_cam.CAMERA.ensure(0, "4k")
    s = web_cam.CAMERA.status()
    assert s["requested"] == [3840, 2160]
    assert s["delivered"] == [640, 480]
    assert s["matches"] is False
    assert s["mode"] == "4k"


def test_status_matches_when_the_camera_obeys(opened):
    opened["size"].update(w=1920, h=1080)
    web_cam.CAMERA.ensure(0, "1080p")
    assert web_cam.CAMERA.status()["matches"] is True


def test_read_keeps_the_delivered_size_current(opened):
    web_cam.CAMERA.ensure(0, "1080p")
    web_cam.CAMERA.cap = FakeCap(1280, 720)          # source switched mode behind our back
    web_cam.CAMERA.read()
    assert web_cam.CAMERA.status()["delivered"] == [1280, 720]


# --- URL sources ----------------------------------------------------------------------

def test_a_url_source_takes_no_resolution(opened, monkeypatch):
    """The env override wins over the UI index, and a URL gets no width pushed at it."""
    monkeypatch.setenv(web_cam.CAMERA_SOURCE_ENV, "https://phone:4444/video/snapshot")
    web_cam.CAMERA.ensure(0, "4k")
    spec = opened["specs"][-1]
    assert spec.source == "https://phone:4444/video/snapshot"
    assert (spec.width, spec.height) == (None, None)
    s = web_cam.CAMERA.status()
    assert s["modes_apply"] is False and s["mode"] == ""
    assert s["requested"] is None                    # nothing was requested, so claim nothing
    assert s["url_source"] == "https://phone:4444/video/snapshot"


# --- lens undistortion ----------------------------------------------------------------

def _write_calib(path, w=640, h=480, k1=-0.25):
    k = np.array([[float(w), 0.0, w / 2.0], [0.0, float(w), h / 2.0], [0.0, 0.0, 1.0]])
    d = np.array([k1, 0.05, 0.0, 0.0, 0.0])
    calib = lens.LensCalibration(camera_matrix=k, dist_coeffs=d, image_size=(w, h), rms=0.42,
                                 created_at="2026-07-19T00:00:00+00:00",
                                 id=lens.calib_id(k, d))
    return lens.save(path, calib, n_frames=15)


@pytest.fixture
def fake_videocapture(monkeypatch):
    """Patch the REAL opener's hardware layer, so `open_capture`'s wiring is exercised."""
    monkeypatch.setattr(cam.cv2, "VideoCapture", lambda index, backend=None: FakeCap())
    return None


def test_collect_capture_is_undistorted_when_a_calibration_exists(fake_videocapture, tmp_path):
    _write_calib(tmp_path / "calib.npz")
    web_cam.CAMERA.ensure(0, "1080p")
    assert isinstance(web_cam.CAMERA.cap, cam._UndistortCapture)
    assert web_cam.CAMERA.status()["undistort"] is True
    assert web_cam.CAMERA.read().shape == (480, 640, 3)      # size preserved by the remap


def test_no_calibration_means_no_wrapper_and_no_claim(fake_videocapture):
    """The zero-calibration case is a plain capture — undistortion is a no-op, not a branch."""
    web_cam.CAMERA.ensure(0, "1080p")
    assert not isinstance(web_cam.CAMERA.cap, cam._UndistortCapture)
    assert web_cam.CAMERA.status()["undistort"] is False
    assert web_cam.CAMERA.read() is not None


# --- the collect start plumbing -------------------------------------------------------

def test_collect_start_opens_the_selected_mode_and_logs_the_delivered_size(
        opened, tmp_path, monkeypatch):
    """`res` reaches the capture, and the session log states the size the camera really
    delivers — not the profile's and not the request."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    import yaml
    from fastapi.testclient import TestClient

    from chesslab import calibration
    from chesslab.calibration import CalibrationProfile, CropParams, compute_homography
    from chesslab.web.app import create_app

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    bs = 96
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    prof = CalibrationProfile(profile="t", camera_index=0, frame_size=(bs, bs), board_size=bs,
                              image_corners=corners, homography=compute_homography(corners, bs),
                              white_pov=True, crop=CropParams.default(bs))
    seen: list = []

    def _ensure_profile(profile, source=None, **kwargs):
        seen.append(kwargs.get("camera_mode"))
        return prof

    monkeypatch.setattr(calibration, "ensure_profile", _ensure_profile)
    opened["size"].update(w=1280, h=720)             # the camera answers 720p, not 1440p

    client = TestClient(create_app())
    st = client.post("/api/collect/start",
                     json={"strategy": "random", "max_plies": 2, "res": "1440p"}).json()

    assert seen == ["1440p"]                         # auto-calibration would use the same mode
    assert (opened["specs"][-1].width, opened["specs"][-1].height) == (2560, 1440)
    assert st["camera"]["delivered"] == [1280, 720] and st["camera"]["matches"] is False

    meta = yaml.safe_load((config.DATA.sessions / st["session_id"] / "session.yaml")
                          .read_text(encoding="utf-8"))
    assert meta["frame_size"] == [1280, 720]         # delivered, not the profile's 96x96
    assert "res=1440p" in meta["notes"]
    client.post("/api/collect/finish")
