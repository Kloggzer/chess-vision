"""Kalibrierungs-Router: /api/camera/calibrate.mjpg, /api/camera/status, /api/camera/release, /api/calibrate/*"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Body, HTTPException

from ..camera import CAMERA, mjpeg
from ..state import CALIB
from ..util import _NONE_FRAME_LIMIT, _camera_error_frame, _img_url

router = APIRouter()
log = logging.getLogger("chesslab.web")


def _build_profile(f, pts, board_size, margin, camera, name="_live"):
    from ...calibration import CalibrationProfile, CropParams, compute_homography

    return CalibrationProfile(
        profile=name, camera_index=camera, frame_size=(f.shape[1], f.shape[0]),
        board_size=board_size, image_corners=pts,
        homography=compute_homography(pts, board_size, margin),
        white_pov=True, crop=CropParams.default(board_size),
        margin=margin, marker_dict="DICT_4X4_50",
    )


@router.get("/api/camera/calibrate.mjpg")
def camera_calibrate(camera: int = 0, board_size: int = 1600):
    import cv2

    from ...calibration import (
        MarkerTracker,
        detect_board_markers,
        draw_calibration_overlay,
        resolve_board_corners,
    )

    CAMERA.ensure(camera)
    tracker = MarkerTracker()
    CALIB.update(tracker=tracker)

    def frames():
        none_count = 0
        try:
            while True:
                f = CAMERA.read()
                if f is None:
                    none_count += 1
                    yield _camera_error_frame() if none_count == _NONE_FRAME_LIMIT else None
                    if none_count >= _NONE_FRAME_LIMIT:
                        none_count = 0
                    continue
                none_count = 0
                tracker.update(detect_board_markers(f, "DICT_4X4_50", corner="center"))
                seen, held = len(tracker.last), tracker.n_held()
                CAMERA.markers_found = seen >= 4
                CAMERA.markers_count = seen
                CAMERA.markers_live = tracker.n_live()
                CAMERA.markers_held = held
                m = CALIB.get("margin")
                res = resolve_board_corners(tracker.last, board_size=board_size) if seen >= 4 else None
                if res is not None:
                    pts, n = res
                    img = draw_calibration_overlay(f, pts, _build_profile(f, pts, board_size, m, camera),
                                                   labels=True)
                    held_txt = f"  ({held} gehalten)" if held else ""
                    cv2.putText(img, f"margin={m:.3f}  {n}/4 Marker{held_txt}", (10, 28),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2, cv2.LINE_AA)
                else:
                    img = f.copy()
                    cv2.putText(img, f"Warte auf alle 4 Marker ({seen}/4)...", (10, 28),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
                yield img
        finally:
            log.info("Stream beendet: calibrate")

    return mjpeg(frames())


@router.get("/api/camera/status")
def camera_status():
    return {"open": CAMERA.cap is not None, "markers_found": CAMERA.markers_found,
            "markers_count": CAMERA.markers_count, "markers_live": CAMERA.markers_live,
            "markers_held": CAMERA.markers_held, "margin": CALIB.get("margin")}


@router.post("/api/camera/release")
def camera_release():
    CAMERA.release()
    return {"ok": True}


@router.post("/api/calibrate/margin")
def calibrate_margin(margin: float = Body(..., embed=True)):
    CALIB.update(margin=max(0.0, float(margin)))
    return {"margin": CALIB.get("margin")}


@router.post("/api/calibrate/markers")
def calibrate_markers():
    from ... import config
    from ...calibration import generate_markers

    p = generate_markers(config.DATA.calibration / "markers.png")
    return {"url": _img_url(p.as_posix())}


@router.post("/api/calibrate/save")
def calibrate_save(profile: str = Body("default"), board_size: int = Body(1600),
                   margin: float = Body(None), camera: int = Body(0)):
    from ...calibration import profile_path, resolve_board_corners

    tracker = CALIB.get("tracker")
    if tracker is None or len(tracker.last) < 4:
        raise HTTPException(400, "noch nicht alle 4 Marker erkannt (kurz die Hand wegnehmen).")
    f = CAMERA.read()
    if f is None:
        raise HTTPException(400, "Kamera nicht aktiv / kein Frame.")
    pts = resolve_board_corners(tracker.last, board_size=board_size)[0]
    m = CALIB.get("margin") if margin is None else float(margin)
    prof = _build_profile(f, pts, board_size, m, camera, name=profile)
    prof.save(profile_path(profile))
    return {"ok": True, "profile": profile, "margin": m}
