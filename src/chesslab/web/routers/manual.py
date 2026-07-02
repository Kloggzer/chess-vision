"""Manueller Label-Router: /api/manual/*, /api/camera/manual.mjpg"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Body, HTTPException

from ..camera import CAMERA, BoardTracker, mjpeg
from ..state import MANUAL
from ..util import (
    _camera_error_frame, _capture_frame_corners, _img_url, _manifest,
    _NONE_FRAME_LIMIT, labels_to_fen,
)

router = APIRouter()
log = logging.getLogger("chesslab.web")


def _manual_state() -> dict:
    w = MANUAL.get("writer")
    return {"active": w is not None, "session": w.session_id if w else None,
            "captures": w.count if w else 0}


@router.post("/api/manual/start")
def manual_start(profile: str = Body("default"), camera: int = Body(0)):
    from ... import config
    from ...calibration import load_profile
    from ...collect import SessionWriter, generate_session_id

    try:
        prof = load_profile(profile)
    except FileNotFoundError as e:
        raise HTTPException(400, str(e))
    CAMERA.ensure(camera)
    sid = generate_session_id() + "-man"
    writer = SessionWriter(config.DATA.sessions / sid, session_id=sid, profile=profile,
                           mode="manual", camera_index=camera, frame_size=prof.frame_size,
                           notes="manual")
    MANUAL.update(profile=prof, board=BoardTracker(prof), camera=camera, writer=writer)
    return _manual_state()


@router.get("/api/manual/state")
def manual_state():
    return _manual_state()


@router.get("/api/camera/manual.mjpg")
def camera_manual():
    import cv2

    from ...calibration import draw_board_grid

    def frames():
        none_count = 0
        try:
          while True:
            f = CAMERA.read()
            m = MANUAL.snapshot()   # genau EIN Snapshot pro Frame (H1)
            prof, board = m["profile"], m["board"]
            if f is None:
                none_count += 1
                yield _camera_error_frame() if none_count == _NONE_FRAME_LIMIT else None
                if none_count >= _NONE_FRAME_LIMIT:
                    none_count = 0
                continue
            none_count = 0
            if prof is None or board is None:
                img = f.copy()
                cv2.putText(img, "keine Sitzung — Start druecken", (10, 28),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
            else:
                warped, _ = board.process(f)   # Ecken/Warp aus dem geteilten BoardTracker
                if warped is None:
                    img = f.copy()
                    cv2.putText(img, "Box aus Profil — warte auf Marker...", (10, 28),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
                else:
                    img = draw_board_grid(warped, prof)   # nur das 8x8-Raster, kein Zug-Pfeil
            yield img
        finally:
            log.info("Stream beendet: manual")

    return mjpeg(frames())


@router.post("/api/manual/capture")
def manual_capture(labels: dict = Body(default={}, embed=True)):
    m = MANUAL.snapshot()
    w, board = m["writer"], m["board"]
    if w is None:
        raise HTTPException(400, "keine aktive manuelle Sitzung — erst Start.")
    f, corners = _capture_frame_corners(m["profile"], board)
    if f is None:
        raise HTTPException(400, "kein Frame von der Kamera.")
    clean = {str(sq): str(lab) for sq, lab in (labels or {}).items() if lab and lab != "empty"}
    # FEN ist nur Platzhalter (slice nutzt die expliziten labels). Ecken: hochauflösender
    # Snapshot -> auf ihm neu erkannt, sonst die im Stream verifizierten.
    w.capture(f, ply=0, fen=labels_to_fen(clean) + " w - - 0 1",
              corners=corners, labels=clean)
    return _manual_state()


@router.post("/api/manual/undo")
def manual_undo():
    w = MANUAL.get("writer")
    if w is not None:
        w.undo()
    return _manual_state()


@router.post("/api/manual/finish")
def manual_finish():
    from ... import labeling as labeling_mod

    w = MANUAL.get("writer")
    if w is None:
        return {"ok": True, "captures": 0}
    w.close()
    n, sid = w.count, w.session_id
    MANUAL.update(writer=None, profile=None, board=None)
    sliced, sliced_error = 0, None
    if n > 0:
        try:
            labeling_mod.run_slice(session=sid)
            sliced = sum(1 for r in _manifest() if r.get("session_id") == sid)
        except Exception as e:  # noqa: BLE001 — Komfortschritt, aber der Fehler muss sichtbar sein (H2)
            log.exception("Auto-Slice nach Manual-Finish fehlgeschlagen (Session %s)", sid)
            sliced_error = f"Auto-Slice fehlgeschlagen: {e}"
    resp = {"ok": True, "captures": n, "session": sid, "sliced": sliced}
    if sliced_error:
        resp["sliced_error"] = sliced_error
    return resp
