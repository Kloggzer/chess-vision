"""Web-UI des Move-Trackers: links die Live-Kamera mit dem, was der Computer GLAUBT (Figuren +
letzter Zug eingeblendet), rechts das rekonstruierte Brett (python-chess-SVG) + Zugliste.

Start:  chesslab track --profile phone --source https://<PHONE-IP>:4444/video/m.jpeg
        (oder --source 0 für lokale Kamera). Dann http://127.0.0.1:8001
        python -m chesslab.move_tracker.app funktioniert ebenfalls.
"""

from __future__ import annotations

import time
from pathlib import Path

import chess
import chess.svg

from ..web.state import LockedState
from .tracker import MoveTracker

_STATIC = Path(__file__).parent / "static"
_STATE = LockedState(tracker=None, default_profile="phone", default_source="0")


def create_app(default_profile: str = "phone", default_source: str = "0",
               tracker_kwargs: dict | None = None):
    """Erzeugt die FastAPI-App mit festen Defaults für Profil/Quelle/Tracker-Parameter."""
    from fastapi import Body, FastAPI
    from fastapi.responses import FileResponse, Response, StreamingResponse

    # Tracker-Tunable-Defaults (für die Start-API)
    tk = tracker_kwargs or {}

    # Update module-level state with this app's defaults
    _STATE.update(default_profile=default_profile, default_source=default_source)

    app = FastAPI(title="chess move-tracker")

    @app.get("/")
    def index():
        return FileResponse(str(_STATIC / "index.html"))

    @app.post("/api/start")
    def start(profile: str = Body("phone"), source: str = Body("0"),
              motion_thr: float | None = Body(None), z_thr: float | None = Body(None),
              cnn_run: str | None = Body(None), device: str | None = Body(None)):
        # Atomic swap: take old tracker out under lock, stop+join OUTSIDE lock,
        # start new one, put in under lock. Double-start leaves exactly one thread.
        old = _STATE.get("tracker")
        if old is not None:
            _STATE.update(tracker=None)
        if old is not None:
            old.stop()

        kwargs = dict(tk)
        # Body-Werte gewinnen über die CLI-Defaults in `tk` (sonst doppeltes Keyword-Argument):
        if motion_thr is not None:
            kwargs["motion_thr"] = motion_thr
        if z_thr is not None:
            kwargs["z_thr"] = z_thr
        if cnn_run is not None:                      # Body überschreibt CLI-Default ("" = aus)
            kwargs["cnn_run"] = cnn_run or None
        if device is not None:
            kwargs["device"] = device
        t = MoveTracker(profile=profile, source=source, **kwargs)
        t.reset_to_start()
        t.start()
        _STATE.update(tracker=t)
        return {"ok": True, "profile": profile, "source": source,
                "cnn_run": kwargs.get("cnn_run")}

    @app.post("/api/resync_cnn")
    def resync_cnn():
        """Manuelle CNN-Kontrolle: Occupancy des Bretts gegen den Spielzustand prüfen;
        ein EINDEUTIG erklärender Zug wird direkt übernommen, sonst Konflikt-Felder melden."""
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "nicht gestartet"}
        return t.resync_cnn()

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

    @app.post("/api/promote")
    def promote(piece: str = Body(..., embed=True)):
        """Umwandlungsfigur wählen (Promotion ohne CNN wartet auf Nutzer-Input, Spec 10)."""
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "nicht gestartet"}
        return t.choose_promotion(piece)

    @app.post("/api/undo")
    def undo():
        t = _STATE.get("tracker")
        if t is not None:
            t.undo()
        return {"ok": True}

    @app.get("/api/runs")
    def runs():
        """Selectable CNN model runs (weights on disk), newest first + the active one."""
        from .. import config as _cfg

        active = None
        t = _STATE.get("tracker")
        if t is not None:
            active = getattr(t, "cnn_run", None)
        return {"runs": [r["run"] for r in _cfg.list_model_runs()],
                "default": _cfg.default_tracker_run(), "active": active}

    @app.get("/api/status")
    def status():
        t = _STATE.get("tracker")
        if t is None:
            return {
                "active": False,
                "default_profile": _STATE.get("default_profile", default_profile),
                "default_source": _STATE.get("default_source", default_source),
            }
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


def run(host: str = "127.0.0.1", port: int = 8001,
        default_profile: str = "phone", default_source: str = "0",
        tracker_kwargs: dict | None = None) -> int:
    import uvicorn

    _STATE.update(default_profile=default_profile, default_source=default_source)
    print(f"move-tracker UI: http://{host}:{port}")
    uvicorn.run(create_app(default_profile=default_profile, default_source=default_source,
                           tracker_kwargs=tracker_kwargs),
                host=host, port=port, log_level="warning")
    return 0


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", default="phone")
    ap.add_argument("--source", default="0")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8001)
    ap.add_argument("--motion-thr", type=float, default=3.0)
    ap.add_argument("--z-thr", type=float, default=3.0)
    ap.add_argument("--confirm-frames", type=int, default=None)
    ap.add_argument("--settle-frames", type=int, default=None)
    ap.add_argument("--max-changed", type=int, default=6)
    ap.add_argument("--avg-frames", type=int, default=None)
    ap.add_argument("--no-live-align", action="store_true")
    ap.add_argument("--cnn-conf-thr", type=float, default=0.85)
    ap.add_argument("--census-thr", type=float, default=55.0)
    ap.add_argument("--no-cnn-verify", dest="cnn_verify", action="store_false")
    ap.set_defaults(cnn_verify=True)
    ap.add_argument("--device", default="auto", help="Torch-Device fürs CNN: auto|cpu|cuda")
    from .. import config as _config
    ap.add_argument("--cnn-run", default=_config.default_tracker_run() or "",
                    help="Modell-Run für CNN-Verifikation/-Recovery ('' = aus)")
    a = ap.parse_args()

    runner_tk = {
        k: v for k, v in {
            "confirm_frames": a.confirm_frames,
            "settle_frames": a.settle_frames,
            "max_changed": a.max_changed,
            "avg_frames": a.avg_frames,
            "live_align": not a.no_live_align,
        }.items() if v is not None
    } | {"motion_thr": a.motion_thr, "z_thr": a.z_thr,
         "cnn_run": (a.cnn_run or None), "cnn_conf_thr": a.cnn_conf_thr,
         "device": a.device, "census_thr": a.census_thr, "cnn_verify": a.cnn_verify}

    run(host=a.host, port=a.port, default_profile=a.profile, default_source=a.source,
        tracker_kwargs=runner_tk)
