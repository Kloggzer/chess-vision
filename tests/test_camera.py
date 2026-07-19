"""Tests for the camera library (`chesslab.camera`).

These exercise the driver-quirk logic without any real hardware by patching
`cv2.VideoCapture` with a fake that records every `set()` call in order — which is exactly
where the important behavior lives (FOURCC must be set BEFORE the resolution, autofocus off
BEFORE manual focus, config defaults when the caller specifies nothing).
"""

from __future__ import annotations

import cv2
import numpy as np
import pytest

from chesslab import camera as cam
from chesslab import config


class FakeCap:
    """Minimal cv2.VideoCapture stand-in that records set() calls in order."""

    def __init__(self, index=0, backend=None, *, opened=True,
                 w=2560, h=1440, fourcc="MJPG", fps=30.0):
        self.index = index
        self.backend = backend
        self.sets: list[tuple[int, float]] = []
        self.reads = 0
        self._opened = opened
        self._props = {
            cv2.CAP_PROP_FRAME_WIDTH: float(w),
            cv2.CAP_PROP_FRAME_HEIGHT: float(h),
            cv2.CAP_PROP_FOURCC: float(cv2.VideoWriter_fourcc(*fourcc)),
            cv2.CAP_PROP_FPS: float(fps),
        }

    def isOpened(self):
        return self._opened

    def set(self, prop, val):
        self.sets.append((int(prop), val))
        self._props[int(prop)] = val
        return True

    def get(self, prop):
        return self._props.get(int(prop), 0.0)

    def read(self):
        self.reads += 1
        if not self._opened:
            return False, None
        return True, np.zeros((4, 4, 3), np.uint8)

    def release(self):
        self._opened = False


@pytest.fixture
def fake_vc(monkeypatch):
    """Patch cv2.VideoCapture; return the list of created FakeCaps (in creation order)."""
    created: list[FakeCap] = []

    def factory(index, backend=None):
        c = FakeCap(index, backend)
        created.append(c)
        return c

    monkeypatch.setattr(cam.cv2, "VideoCapture", factory)
    return created


def _prop_order(cap: FakeCap) -> list[int]:
    return [p for p, _ in cap.sets]


# --- ordering: the crux of why USB cams cap at 640x480 --------------------------------

def test_fourcc_is_set_before_resolution(fake_vc):
    cam.open_capture(cam.CameraSpec(source=0, width=800, height=600, warmup=0))
    order = _prop_order(fake_vc[0])
    assert cv2.CAP_PROP_FOURCC in order
    assert order.index(cv2.CAP_PROP_FOURCC) < order.index(cv2.CAP_PROP_FRAME_WIDTH)
    assert order.index(cv2.CAP_PROP_FRAME_WIDTH) < order.index(cv2.CAP_PROP_FRAME_HEIGHT)


def test_defaults_come_from_config_when_unspecified(fake_vc):
    cam.open_capture(cam.CameraSpec(source=0, warmup=0))
    d = dict(fake_vc[0].sets)
    assert d[cv2.CAP_PROP_FRAME_WIDTH] == config.CAMERA.width
    assert d[cv2.CAP_PROP_FRAME_HEIGHT] == config.CAMERA.height


def test_warmup_reads_are_issued(fake_vc):
    cam.open_capture(cam.CameraSpec(source=0, warmup=3))
    assert fake_vc[0].reads == 3


# --- backend selection ----------------------------------------------------------------

def test_explicit_msmf_backend_is_passed(fake_vc):
    cam.open_capture(cam.CameraSpec(source=0, backend="msmf", warmup=0))
    assert fake_vc[0].backend == cv2.CAP_MSMF


def test_resolve_backend_names():
    assert cam._resolve_backend("dshow") == getattr(cv2, "CAP_DSHOW", None)
    assert cam._resolve_backend("msmf") == getattr(cv2, "CAP_MSMF", None)
    assert cam._resolve_backend("any") == getattr(cv2, "CAP_ANY", None)


# --- optics controls ------------------------------------------------------------------

def test_autofocus_off_before_manual_focus(fake_vc):
    cam.open_capture(cam.CameraSpec(source=0, focus=12.0, warmup=0))
    order = _prop_order(fake_vc[0])
    assert order.index(cv2.CAP_PROP_AUTOFOCUS) < order.index(cv2.CAP_PROP_FOCUS)


def test_manual_exposure_mode_before_value(fake_vc):
    cam.open_capture(cam.CameraSpec(source=0, exposure=-6.0, warmup=0))
    order = _prop_order(fake_vc[0])
    assert order.index(cv2.CAP_PROP_AUTO_EXPOSURE) < order.index(cv2.CAP_PROP_EXPOSURE)


def test_extra_props_passthrough(fake_vc):
    cam.open_capture(cam.CameraSpec(source=0, warmup=0, extra_props={cv2.CAP_PROP_SATURATION: 40}))
    assert (cv2.CAP_PROP_SATURATION, 40) in fake_vc[0].sets


# --- URL / file-path dispatch ---------------------------------------------------------

def test_url_dispatch_snapshot_vs_mjpeg(monkeypatch):
    monkeypatch.setattr(cam, "_UrlSnapshotCapture", lambda url, **k: ("snap", url))
    monkeypatch.setattr(cam, "_UrlMjpegCapture", lambda url, **k: ("mjpeg", url))
    assert cam._open_url("https://x/video/snapshot")[0] == "snap"
    assert cam._open_url("https://x/video/m.jpeg")[0] == "mjpeg"
    assert cam._open_url("https://x/stream", "snapshot")[0] == "snap"   # explicit override


def test_file_path_opened_plainly_without_forcing(fake_vc):
    cam.open_capture(cam.CameraSpec(source="clip.mp4", warmup=3))
    c = fake_vc[0]
    assert c.index == "clip.mp4"
    assert c.sets == []       # no MJPG/resolution forcing on a file
    assert c.reads == 0       # and no warmup grabs


def test_latest_wraps_in_grab_latest(fake_vc):
    cap = cam.open_capture(cam.CameraSpec(source=0, warmup=0, latest=True))
    try:
        assert isinstance(cap, cam.LatestFrame)
    finally:
        cap.release()


# --- back-compat + wrapper ------------------------------------------------------------

def test_open_camera_backcompat_returns_capture(fake_vc):
    cap = cam.open_camera(0)
    assert cap is fake_vc[0]


def test_open_source_local_index_uses_open_camera(fake_vc):
    cap = cam.open_source(0)
    assert cap is fake_vc[0]


def test_camera_wrapper_introspection(fake_vc):
    with cam.Camera(cam.CameraSpec(source=0, warmup=0)) as c:
        assert c.frame_size == (2560, 1440)
        s = c.settings()
        assert s["codec"] == "MJPG"
        assert s["width"] == 2560 and s["height"] == 1440
        assert isinstance(c.measure_fps(n=3, warmup=0), float)


def test_fourcc_to_str_roundtrip():
    assert cam.fourcc_to_str(cv2.VideoWriter_fourcc(*"MJPG")) == "MJPG"


# --- enumeration ----------------------------------------------------------------------

def test_list_devices_labels_and_skips_closed(monkeypatch):
    monkeypatch.setattr(cam, "_pnp_camera_names", lambda: ["4K U3 Camera", "Kiyo"])

    def factory(index, backend=None):
        return FakeCap(index, backend, opened=(index < 2))   # only 0 and 1 are live

    monkeypatch.setattr(cam.cv2, "VideoCapture", factory)
    devs = cam.list_devices(max_index=4)
    assert [d.index for d in devs] == [0, 1]
    assert [d.name for d in devs] == ["4K U3 Camera", "Kiyo"]
    assert all(d.present for d in devs)


def test_probe_reports_delivered_mode(monkeypatch):
    def factory(index, backend=None):
        return FakeCap(index, backend, w=1920, h=1080)

    monkeypatch.setattr(cam.cv2, "VideoCapture", factory)
    results = cam.probe(0, modes=[(1920, 1080)], backends=["dshow"], grab=2)
    assert len(results) == 1
    r = results[0]
    assert r.delivered == (1920, 1080)
    assert r.ok


# --- named capture modes (config.CAMERA_MODES) ----------------------------------------

def test_spec_for_mode_default_leaves_resolution_unset():
    """'default' must not pin a resolution — open_capture then falls back to config.CAMERA."""
    spec = cam.spec_for_mode("default", source=1)
    assert (spec.width, spec.height, spec.fps) == (None, None, None)
    assert spec.source == 1


@pytest.mark.parametrize("mode,size", [
    ("720p", (1280, 720)),
    ("1080p", (1920, 1080)),
    ("1440p", (2560, 1440)),
    ("4k", (3840, 2160)),
])
def test_spec_for_mode_maps_presets(mode, size):
    spec = cam.spec_for_mode(mode, source=0)
    assert (spec.width, spec.height) == size
    assert cam.mode_size(mode) == size


def test_spec_for_mode_is_case_insensitive_and_none_safe():
    assert cam.spec_for_mode("4K").width == 3840
    for unknown in (None, "", "8k", "nonsense"):
        spec = cam.spec_for_mode(unknown)
        assert (spec.width, spec.height) == (None, None)
        assert cam.mode_size(unknown) is None


def test_spec_for_mode_passes_extra_fields_through():
    spec = cam.spec_for_mode("1080p", source=2, latest=True, warmup=0)
    assert spec.latest is True and spec.warmup == 0


def test_camera_modes_are_derived_from_config():
    modes = cam.camera_modes()
    assert [m["name"] for m in modes] == list(config.CAMERA_MODES)
    by_name = {m["name"]: m for m in modes}
    assert by_name["default"]["width"] is None
    assert (by_name["4k"]["width"], by_name["4k"]["height"]) == (3840, 2160)
    assert "3840" in by_name["4k"]["label"]


def test_spec_for_mode_drives_the_real_open_path(fake_vc):
    cam.open_capture(cam.spec_for_mode("4k", source=0, warmup=0))
    sets = dict(fake_vc[0].sets)
    assert sets[cv2.CAP_PROP_FRAME_WIDTH] == 3840
    assert sets[cv2.CAP_PROP_FRAME_HEIGHT] == 2160
