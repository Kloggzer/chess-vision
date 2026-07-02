"""Inference-Router: /api/inference/*, /api/camera/inference.mjpg"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Body, HTTPException

from ..camera import CAMERA, BoardTracker, mjpeg
from ..state import INFER
from ..util import (
    _camera_error_frame, _capture_frame_corners, _img_url, _manifest,
    _NONE_FRAME_LIMIT, label_to_fen_char, labels_to_fen,
)

router = APIRouter()
log = logging.getLogger("chesslab.web")


@router.post("/api/inference/start")
def inference_start(run: str = Body(...), profile: str = Body("default"), camera: int = Body(0)):
    from ... import config
    from ... import serving
    from ...calibration import load_profile

    try:
        prof = load_profile(profile)
    except FileNotFoundError as e:
        raise HTTPException(400, str(e))
    if not (config.DATA.models / run / "config.json").exists():
        raise HTTPException(400, f"Modell-Run '{run}' nicht gefunden.")
    CAMERA.ensure(camera)
    spec = serving.run_spec(config.DATA.models / run)
    INFER.update(profile=prof, board=BoardTracker(prof),
                 run=run, camera=camera, last=None,
                 geometry=spec.geometry, photometry=spec.photometry,
                 piece_height=spec.piece_height_cells)
    log.info("Inference '%s': geometry=%s photometry=%s", run, spec.geometry, spec.photometry)
    return {"ok": True, "run": run, "geometry": spec.geometry, "photometry": spec.photometry}


@router.get("/api/inference/state")
def inference_state():
    s = INFER.snapshot()
    last = s.get("last")
    return {"active": s["run"] is not None, "run": s["run"],
            "fen": last["fen"] if last else None, "mean_conf": last["mean_conf"] if last else None}


@router.get("/api/camera/inference.mjpg")
def camera_inference():
    import cv2

    from ... import serving
    from ...calibration import draw_board_grid, square_center

    def frames():
        CONF_COL = lambda c: (0, 200, 0) if c >= 0.8 else (0, 215, 255) if c >= 0.5 else (0, 0, 255)
        none_count = 0
        try:
          while True:
            f = CAMERA.read()
            s = INFER.snapshot()   # genau EIN Snapshot pro Frame (H1)
            prof, board, run = s["profile"], s["board"], s["run"]
            if f is None:
                none_count += 1
                yield _camera_error_frame() if none_count == _NONE_FRAME_LIMIT else None
                if none_count >= _NONE_FRAME_LIMIT:
                    none_count = 0
                continue
            none_count = 0
            if prof is None or board is None or run is None:
                yield None
                continue
            warped, corners = board.process(f)   # geteilter BoardTracker (Ecken/Warp, edge-to-edge fürs Display)
            if warped is None or corners is None:
                img = f.copy()
                cv2.putText(img, "warte auf Marker...", (10, 28), cv2.FONT_HERSHEY_SIMPLEX,
                            0.6, (0, 0, 255), 2, cv2.LINE_AA)
                yield img
                continue
            # Crops + Vorhersage: kanonische Pipeline aus `serving.predict_frame`.
            # (Inference bewusst OHNE Lock — Locks schützen nur den Zustands-Zugriff.)
            try:
                preds = serving.predict_frame(config.DATA.models / run, f, corners, prof, device="cpu")
            except Exception as e:  # noqa: BLE001 — Fehler wird im Stream sichtbar gemacht
                log.warning("Live-Inference fehlgeschlagen: %s", e)
                img = warped.copy()
                cv2.putText(img, f"Modell-Fehler: {e}", (10, 28), cv2.FONT_HERSHEY_SIMPLEX,
                            0.6, (0, 0, 255), 2, cv2.LINE_AA)
                yield img
                continue
            labels = {p["square"]: p["pred_label"] for p in preds}
            img = draw_board_grid(warped, prof)
            for p in preds:
                sq, lab, conf = p["square"], p["pred_label"], p["confidence"]
                if lab == "empty":
                    continue
                ch = "#" if lab == "occluded" else label_to_fen_char(lab) or "?"
                cx, cy = square_center(sq, prof)
                cv2.putText(img, ch, (cx - 8, cy + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                            CONF_COL(conf), 2, cv2.LINE_AA)
            fen = labels_to_fen(labels)
            cv2.putText(img, fen, (8, prof.board_size - 10), cv2.FONT_HERSHEY_SIMPLEX,
                        0.5, (255, 255, 0), 1, cv2.LINE_AA)
            INFER.update(last={"corners": corners, "frame": f.copy(), "labels": labels,
                               "fen": fen, "mean_conf": round(sum(p["confidence"] for p in preds) / len(preds), 3)})
            yield img
        finally:
            log.info("Stream beendet: inference")

    return mjpeg(frames())


@router.post("/api/inference/capture")
def inference_capture():
    from ... import config
    from ... import labeling as labeling_mod
    from ...collect import SessionWriter, generate_session_id

    s = INFER.snapshot()
    last = s.get("last")
    if not last:
        raise HTTPException(400, "noch keine Vorhersage — Stream offen lassen, bis Marker stehen.")
    prof = s["profile"]
    sid = generate_session_id() + "-inf"
    w = SessionWriter(config.DATA.sessions / sid, session_id=sid, profile="default", mode="inference",
                      camera_index=s["camera"], frame_size=prof.frame_size, notes=f"inference:{s['run']}")
    w.capture(last["frame"], ply=0, fen=labels_to_fen(last["labels"]) + " w - - 0 1",
              corners=last["corners"], labels=last["labels"])
    w.close()
    labeling_mod.run_slice(session=sid)
    crops = sum(1 for r in _manifest() if r.get("session_id") == sid)
    return {"ok": True, "session": sid, "crops": crops,
            "hint": "Im Review die verdeckten Felder als 'occluded' korrigieren, dann neu slicen."}
