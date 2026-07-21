"""Web UI of the Move-Tracker: left side the live camera with what the computer BELIEVES (pieces +
last move overlay), right side the reconstructed board (python-chess SVG) + move list.

Start:  chesslab track --profile phone --source https://<PHONE-IP>:4444/video/m.jpeg
        (or --source 0 for local camera). Then http://127.0.0.1:8001
        python -m chesslab.move_tracker.app works as well.
"""

from __future__ import annotations

from pathlib import Path

import chess
import chess.svg

from ..web.state import LockedState
from .tracker import MoveTracker

_STATIC = Path(__file__).parent / "static"
_STATE = LockedState(tracker=None, default_profile="phone", default_source="0")


def _live_tuning_kwargs(
    *,
    motion_thr: float | None = None,
    z_thr: float | None = None,
    census_thr: float | None = None,
    census_z_weight: float | None = None,
    occl_census_thr: float | None = None,
    occlusion_color_thr: float | None = None,
    min_grid_line_coverage: float | None = None,
    motion_margin: float | None = None,
    overhang: float | None = None,
    motion_hold_s: float | None = None,
    diff_clahe_clip: float | None = None,
    commit_ll_floor: float | None = None,
) -> dict:
    vals = {
        "motion_thr": motion_thr,
        "z_thr": z_thr,
        "census_thr": census_thr,
        "census_z_weight": census_z_weight,
        "occl_census_thr": occl_census_thr,
        "occlusion_color_thr": occlusion_color_thr,
        "min_grid_line_coverage": min_grid_line_coverage,
        "motion_margin": motion_margin,
        "overhang": overhang,
        "motion_hold_s": motion_hold_s,
        "diff_clahe_clip": diff_clahe_clip,
        "commit_ll_floor": commit_ll_floor,
    }
    return {k: v for k, v in vals.items() if v is not None}


def _apply_live_tuning(tracker, kwargs: dict) -> dict:
    with tracker.lock:
        for key, value in kwargs.items():
            setattr(tracker, key, value)
        if "motion_margin" in kwargs:
            tracker._prev_roi = None
        if "overhang" in kwargs:
            tracker._ref_census_for = None
        if "diff_clahe_clip" in kwargs:
            tracker._clahe = None           # rebuilt on next _gray call
        tracker.note = "tracker tuning updated live"
        return {
            "motion_thr": tracker.motion_thr,
            "z_thr": tracker.z_thr,
            "census_thr": tracker.census_thr,
            "census_z_weight": tracker.census_z_weight,
            "occl_census_thr": tracker.occl_census_thr,
            "occlusion_color_thr": tracker.occlusion_color_thr,
            "min_grid_line_coverage": tracker.min_grid_line_coverage,
            "motion_margin": tracker.motion_margin,
            "overhang": tracker.overhang,
            "motion_hold_s": tracker.motion_hold_s,
            "diff_clahe_clip": tracker.diff_clahe_clip,
        }


def create_app(default_profile: str = "phone", default_source: str = "0",
               tracker_kwargs: dict | None = None):
    """Creates the FastAPI app with fixed defaults for profile/source/tracker parameters."""
    from fastapi import Body, FastAPI
    from fastapi.responses import FileResponse, Response, StreamingResponse

    # Tracker tunable defaults (for the start API)
    tk = tracker_kwargs or {}

    # Update module-level state with this app's defaults
    _STATE.update(default_profile=default_profile, default_source=default_source)

    app = FastAPI(title="chess move-tracker")

    # Optional Stockfish analysis (eval bar + best moves). Disabled cleanly if no engine found.
    from .. import config as _cfg
    _engine_path = _cfg.find_stockfish()
    analyzer = None
    if _engine_path:
        from .analysis import StockfishAnalyzer

        def _current_fen():
            t = _STATE.get("tracker")
            return None if t is None else t.current_fen()

        analyzer = StockfishAnalyzer(_current_fen, _engine_path)
        analyzer.start()

    @app.on_event("shutdown")
    def _shutdown():
        # Signal the /warped.mjpg generator to stop, then tear down the worker threads so
        # Ctrl+C exits within the graceful window (see chesslab/serve.py).
        from ..serve import SHUTDOWN
        SHUTDOWN.set()
        if analyzer is not None:
            analyzer.stop()
        t = _STATE.get("tracker")
        if t is not None:
            _STATE.update(tracker=None)
            try:
                t.stop()          # sets _running=False, joins the capture thread (2s timeout)
            except Exception:  # noqa: BLE001 — best-effort teardown
                pass

    @app.get("/")
    def index():
        return FileResponse(str(_STATIC / "index.html"))

    @app.get("/api/analysis")
    def analysis():
        """Latest Stockfish evaluation + top moves for the current position."""
        if analyzer is None:
            return {"available": False}
        res = analyzer.get()
        return {"available": True, **(res or {})}

    @app.post("/api/start")
    def start(profile: str = Body("phone"), source: str = Body("0"),
              motion_thr: float | None = Body(None), z_thr: float | None = Body(None),
              cnn_run: str | None = Body(None), device: str | None = Body(None),
              census_thr: float | None = Body(None),
              occlusion_color_thr: float | None = Body(None),
              min_grid_line_coverage: float | None = Body(None),
              motion_margin: float | None = Body(None),
              overhang: float | None = Body(None),
               motion_hold_s: float | None = Body(None),
               diff_clahe_clip: float | None = Body(None),
               record_inventory_filter: bool | None = Body(None),
               res: str | None = Body(None)):
        # Atomic swap: take old tracker out under lock, stop+join OUTSIDE lock,
        # start new one, put in under lock. Double-start leaves exactly one thread.
        old = _STATE.get("tracker")
        if old is not None:
            _STATE.update(tracker=None)
        if old is not None:
            old.stop()

        kwargs = dict(tk)
        # Body values override CLI defaults in `tk` (otherwise duplicate keyword argument):
        kwargs.update(_live_tuning_kwargs(
            motion_thr=motion_thr,
            z_thr=z_thr,
            census_thr=census_thr,
            occlusion_color_thr=occlusion_color_thr,
            min_grid_line_coverage=min_grid_line_coverage,
            motion_margin=motion_margin,
            overhang=overhang,
            motion_hold_s=motion_hold_s,
            diff_clahe_clip=diff_clahe_clip,
        ))
        if cnn_run is not None:                      # Body overrides CLI default ("" = off)
            kwargs["cnn_run"] = cnn_run or None
        if device is not None:
            kwargs["device"] = device
        if record_inventory_filter is not None:
            kwargs["record_inventory_filter"] = record_inventory_filter
        if res is not None:                          # named capture mode (config.CAMERA_MODES)
            kwargs["res"] = res
        t = MoveTracker(profile=profile, source=source, **kwargs)
        t.reset_to_start()
        t.start()
        _STATE.update(tracker=t)
        return {"ok": True, "profile": profile, "source": source,
                "cnn_run": kwargs.get("cnn_run"), "res": t.res}

    @app.post("/api/settings")
    def settings(motion_thr: float | None = Body(None), z_thr: float | None = Body(None),
                 census_thr: float | None = Body(None),
                 occlusion_color_thr: float | None = Body(None),
                 min_grid_line_coverage: float | None = Body(None),
                 motion_margin: float | None = Body(None),
                 overhang: float | None = Body(None),
                 motion_hold_s: float | None = Body(None),
                 diff_clahe_clip: float | None = Body(None),
                 commit_ll_floor: float | None = Body(None)):
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "not started"}
        kwargs = _live_tuning_kwargs(
            motion_thr=motion_thr,
            z_thr=z_thr,
            census_thr=census_thr,
            occlusion_color_thr=occlusion_color_thr,
            min_grid_line_coverage=min_grid_line_coverage,
            motion_margin=motion_margin,
            overhang=overhang,
            motion_hold_s=motion_hold_s,
            diff_clahe_clip=diff_clahe_clip,
            commit_ll_floor=commit_ll_floor,
        )
        return {"ok": True, "settings": _apply_live_tuning(t, kwargs)}

    @app.post("/api/view")
    def set_view(mode: str = Body(..., embed=True)):
        """Toggle overlay view: full | motion | shadow | occlusion | raw."""
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "not started"}
        valid = {"full", "motion", "shadow", "occlusion", "raw"}
        if mode not in valid:
            return {"ok": False, "error": f"invalid mode (use: {', '.join(sorted(valid))})"}
        with t.lock:
            t._view_mode = mode
        return {"ok": True, "view_mode": mode}

    @app.post("/api/resync_cnn")
    def resync_cnn():
        """Manual CNN check: check board occupancy against the game state;
        an unambiguously explaining move is adopted directly, otherwise report conflict squares."""
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "not started"}
        return t.resync_cnn()

    @app.post("/api/accept_cnn")
    def accept_cnn():
        """Adopt the CNN-observed position as the new game state (illegal-move correction:
        history is cleared, the alarm latch is released, the reference is re-captured)."""
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "not started"}
        return t.accept_cnn_position()

    @app.post("/api/reset")
    def reset(fen: str = Body(None, embed=True)):
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "not started"}
        try:
            t.reset_to_start(fen or None)
        except ValueError as e:
            return {"ok": False, "error": f"invalid FEN: {e}"}
        # Immediately capture a baseline from the current frame to avoid stale reference
        return t.capture_baseline()

    @app.post("/api/baseline")
    def baseline():
        """Take a new baseline from the current camera frame (FEN stays as-is)."""
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "not started"}
        return t.capture_baseline()

    @app.post("/api/promote")
    def promote(piece: str = Body(..., embed=True)):
        """Choose promotion piece (promotion without CNN waits for user input, Spec 10)."""
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "not started"}
        return t.choose_promotion(piece)

    @app.post("/api/undo")
    def undo():
        t = _STATE.get("tracker")
        if t is not None:
            t.undo()
        return {"ok": True}

    @app.get("/api/camera/modes")
    def camera_modes():
        """Selectable capture modes (from `config.CAMERA_MODES`) + the active one. The UI
        builds its resolution dropdown from this — never from a hardcoded list."""
        from ..camera import camera_modes as _modes

        t = _STATE.get("tracker")
        return {"modes": _modes(), "default": _cfg.DEFAULT_CAMERA_MODE,
                "active": None if t is None else t.res}

    @app.post("/api/reattach")
    def reattach(res: str | None = Body(None, embed=True)):
        """Rebuild the camera capture without restarting the session (recover a dead feed).
        With `res` this also switches the capture mode LIVE — the game/history survive; the
        board profile is recalibrated automatically if the frame size actually changed."""
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "not started"}
        return t.reattach_camera(res)

    @app.post("/api/record/start")
    def record_start(notes: str = Body("", embed=True),
                     record_inventory_filter: bool | None = Body(None, embed=True)):
        """Start recording the tracked game as a capture session (auto-labeled via slice)."""
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "not started"}
        if record_inventory_filter is not None:
            with t.lock:
                t.record_inventory_filter = record_inventory_filter
        return t.start_recording(notes)

    @app.post("/api/record/stop")
    def record_stop():
        t = _STATE.get("tracker")
        if t is None:
            return {"ok": False, "error": "not started"}
        return t.stop_recording()

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
            from .. import config as _cfg

            return {
                "active": False,
                "default_profile": _STATE.get("default_profile", default_profile),
                "default_source": _STATE.get("default_source", default_source),
                "track_defaults": dict(_cfg.TRACK_DEFAULTS),
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
    def warped(view: str = "board"):
        from ..serve import SHUTDOWN
        from ..serve import sleep as _serve_sleep

        def gen():
            boundary = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
            while not SHUTDOWN.is_set():          # ends the stream cleanly on server shutdown
                t = _STATE.get("tracker")
                if t is not None:
                    t.mark_viewer()
                    jpg = t.overlay_jpeg(view)
                    if jpg:
                        yield boundary + jpg + b"\r\n"
                if not _serve_sleep(0.05):        # interruptible idle (Ctrl+C exits at once)
                    break
        return StreamingResponse(gen(), media_type="multipart/x-mixed-replace; boundary=frame")

    return app


def run(host: str = "127.0.0.1", port: int = 8001,
        default_profile: str = "phone", default_source: str = "0",
        tracker_kwargs: dict | None = None) -> int:
    _STATE.update(default_profile=default_profile, default_source=default_source)
    print(f"move-tracker UI: http://{host}:{port}")
    # /warped.mjpg is an endless stream — `serve.run` sets a process-wide shutdown flag in
    # the signal handler so the generator and the tracker thread stop within the graceful
    # window instead of blocking Ctrl+C (see chesslab/serve.py).
    from ..serve import run as serve_run
    app = create_app(default_profile=default_profile, default_source=default_source,
                     tracker_kwargs=tracker_kwargs)
    return serve_run(app, host=host, port=port)


if __name__ == "__main__":
    import argparse

    from .. import config as _config

    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", default="phone")
    ap.add_argument("--source", default="0")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8001)
    ap.add_argument("--motion-thr", type=float, default=_config.TRACK_DEFAULTS["motion_thr"])
    ap.add_argument("--z-thr", type=float, default=_config.TRACK_DEFAULTS["z_thr"])
    ap.add_argument("--confirm-frames", type=int, default=None)
    ap.add_argument("--settle-frames", type=int, default=None)
    ap.add_argument("--max-changed", type=int, default=_config.TRACK_DEFAULTS["max_changed"])
    ap.add_argument("--avg-frames", type=int, default=None)
    ap.add_argument("--no-live-align", action="store_true")
    ap.add_argument("--cnn-conf-thr", type=float, default=_config.TRACK_DEFAULTS["cnn_conf_thr"])
    ap.add_argument("--census-thr", type=float, default=_config.TRACK_DEFAULTS["census_thr"])
    ap.add_argument("--motion-margin", type=float, default=_config.TRACK_DEFAULTS["motion_margin"])
    ap.add_argument("--overhang", type=float, default=_config.TRACK_DEFAULTS["overhang"])
    ap.add_argument("--motion-hold", type=float, default=_config.TRACK_DEFAULTS["motion_hold_s"])
    ap.add_argument("--min-grid-line-coverage", type=float,
                    default=_config.TRACK_DEFAULTS["min_grid_line_coverage"])
    ap.add_argument("--no-cnn-verify", dest="cnn_verify", action="store_false")
    ap.set_defaults(cnn_verify=True)
    ap.add_argument("--device", default="auto", help="Torch device for CNN: auto|cpu|cuda")
    ap.add_argument("--cnn-run", default=_config.default_tracker_run() or "",
                    help="Model run for CNN verification/recovery ('' = off)")
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
         "motion_margin": a.motion_margin, "overhang": a.overhang,
         "motion_hold_s": a.motion_hold,
         "min_grid_line_coverage": a.min_grid_line_coverage,
         "cnn_run": (a.cnn_run or None), "cnn_conf_thr": a.cnn_conf_thr,
         "device": a.device, "census_thr": a.census_thr, "cnn_verify": a.cnn_verify}

    run(host=a.host, port=a.port, default_profile=a.profile, default_source=a.source,
        tracker_kwargs=runner_tk)
