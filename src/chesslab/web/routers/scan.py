"""Scanner-Router: /api/scan/*"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Body, HTTPException

from ..camera import mjpeg
from ..scan import SCANNER

router = APIRouter()
log = logging.getLogger("chesslab.web")


@router.get("/api/scan/status")
def scan_status():
    return SCANNER.status()


@router.post("/api/scan/open")
def scan_open(source: str = Body(...), width: int = Body(3840), height: int = Body(2160)):
    try:
        return SCANNER.open(source, width, height)
    except Exception as e:  # noqa: BLE001 — Nutzerfehler (Quelle/URL) sauber ans Frontend
        raise HTTPException(400, str(e))


@router.post("/api/scan/config")
def scan_config(crop: list[int] | None = Body(None), interval: float | None = Body(None),
                count: int | None = Body(None), quality: int | None = Body(None),
                out: str | None = Body(None)):
    return SCANNER.configure(crop=crop, interval=interval, count=count, quality=quality, out=out)


@router.post("/api/scan/start")
def scan_start(out: str | None = Body(None, embed=True)):
    try:
        return SCANNER.start(out)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, str(e))


@router.post("/api/scan/stop")
def scan_stop():
    return SCANNER.stop()


@router.post("/api/scan/close")
def scan_close():
    SCANNER.close()
    return SCANNER.status()


@router.get("/api/scan/preview.mjpg")
def scan_preview():
    def frames():
        last = -1
        try:
            while True:
                img, fid = SCANNER.preview(last_id=last)
                last = fid
                yield img      # None -> mjpeg wartet kurz (kein neuer Frame, kein Fehlerbild:
                               # der Scanner liefert bewusst nur bei neuen Frames)
        finally:
            log.info("Stream beendet: scan-preview")
    return mjpeg(frames())
