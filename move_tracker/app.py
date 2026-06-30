"""Web-UI des Move-Trackers: links die Live-Kamera mit dem, was der Computer GLAUBT (Figuren +
letzter Zug eingeblendet), rechts das rekonstruierte Brett (python-chess-SVG) + Zugliste.

Start:  python -m move_tracker.app --profile phone --source https://192.168.178.23:4444/video/m.jpeg
        (oder --source 0 für lokale Kamera). Dann http://127.0.0.1:8001
"""

from __future__ import annotations

import time
from pathlib import Path

import chess
import chess.svg

from .tracker import MoveTracker

_STATIC = Path(__file__).parent / "static"
_STATE: dict = {"tracker": None}


def create_app():
    from fastapi import Body, FastAPI
    from fastapi.responses import FileResponse, Response, StreamingResponse

    app = FastAPI(title="chess move-tracker")

    @app.get("/")
    def index():
        return FileResponse(str(_STATIC / "index.html"))

    @app.post("/api/start")
    def start(profile: str = Body("phone"), source: str = Body("0"),
              motion_thr: float = Body(3.0), change_thr: float = Body(16.0)):
        t = _STATE.get("tracker")
        if t is not None:
            t.stop()
        t = MoveTracker(profile=profile, source=source, motion_thr=motion_thr, change_thr=change_thr)
        t.reset_to_start()
        t.start()
        _STATE["tracker"] = t
        return {"ok": True, "profile": profile, "source": source}

    @app.post("/api/reset")
    def reset(fen: str = Body(None, embed=True)):
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "nicht gestartet"}
        try:
            t.reset_to_start(fen or None)
        except ValueError as e:
            return {"ok": False, "error": f"ungültige FEN: {e}"}
        return {"ok": True}

    @app.post("/api/undo")
    def undo():
        t = _STATE.get("tracker")
        if t is not None:
            t.undo()
        return {"ok": True}

    @app.get("/api/status")
    def status():
        t = _STATE.get("tracker")
        if t is None:
            return {"active": False}
        s = t.status()
        s["active"] = True
        return s

    @app.get("/board.svg")
    def board_svg():
        t = _STATE.get("tracker")
        board = t.board if t is not None else chess.Board()
        last = chess.Move.from_uci(t.last_move) if (t and t.last_move) else None
        svg = chess.svg.board(board, lastmove=last, size=480,
                              check=board.king(board.turn) if board.is_check() else None)
        return Response(svg, media_type="image/svg+xml")

    @app.get("/calib.jpg")
    def calib():
        t = _STATE.get("tracker")
        jpg = t.calib_overlay_jpeg() if t is not None else None
        if not jpg:
            return Response(status_code=204)
        return Response(jpg, media_type="image/jpeg")

    @app.get("/warped.mjpg")
    def warped():
        def gen():
            boundary = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
            while True:
                t = _STATE.get("tracker")
                jpg = t.overlay_jpeg() if t is not None else None
                if jpg:
                    yield boundary + jpg + b"\r\n"
                time.sleep(0.05)
        return StreamingResponse(gen(), media_type="multipart/x-mixed-replace; boundary=frame")

    return app


def run(host: str = "127.0.0.1", port: int = 8001) -> int:
    import uvicorn

    print(f"move-tracker UI: http://{host}:{port}")
    uvicorn.run(create_app(), host=host, port=port, log_level="warning")
    return 0


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", default="phone")
    ap.add_argument("--source", default="0")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8001)
    a = ap.parse_args()
    # Quelle vorab als Default in die Start-API legen, damit der „Start"-Button sie nutzt.
    _STATE["default_source"] = a.source
    _STATE["default_profile"] = a.profile
    run(host=a.host, port=a.port)
