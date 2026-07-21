"""FastAPI backend for the local chesslab web UI.

Serves the four tabs via JSON APIs: collect, scan, datasets (sessions +
curated datasets + stats) and training.
Reuses the existing chesslab logic (dataset, labeling, training). Images are served
as static files from `data/`.

Endpoint logic lives in ``web/routers/`` (feature routers, one file per tab) and
``web/util.py`` (shared helpers). This file only contains the app setup:
mounts, router includes, and the SPA catch-all.
"""

from __future__ import annotations

import logging
from pathlib import Path

_STATIC = Path(__file__).parent / "static"


def create_app():
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    from .. import config

    config.ensure_dirs(config.DATA)
    app = FastAPI(title="chesslab", docs_url="/api/docs")

    app.mount("/static", StaticFiles(directory=str(_STATIC)), name="static")
    app.mount("/img", StaticFiles(directory=str(config.DATA.root)), name="img")

    @app.get("/")
    def index():
        return FileResponse(str(_STATIC / "index.html"))

    # Pre-warm the manifest cache on startup so /api/sessions responds instantly
    # even on first load (avoids scanning a 300k-line JSONL on the first request).
    @app.on_event("startup")
    def _warm_cache():
        from ..manifest_cache import manifest_stats
        manifest_stats(config.DATA.manifests / "squares.jsonl")

    # Clean shutdown: signal the streaming generators to stop and release every camera
    # handle + capture thread. Without this, the scan grab-thread keeps re-opening a dead
    # camera and the collect stream holds a capture, blocking Ctrl+C (see chesslab/serve.py).
    @app.on_event("shutdown")
    def _shutdown():
        from ..serve import SHUTDOWN
        SHUTDOWN.set()
        try:
            from .camera import CAMERA
            CAMERA.release()
        except Exception:  # noqa: BLE001 — best-effort teardown
            logging.getLogger("chesslab.web").debug("camera release on shutdown failed", exc_info=True)
        try:
            from .scan import SCANNER
            SCANNER.close()
        except Exception:  # noqa: BLE001 — best-effort teardown
            logging.getLogger("chesslab.web").debug("scanner close on shutdown failed", exc_info=True)

    # Lazy-import routers (cv2-lazy convention: no router opens a camera on import).
    from .routers import ALL_ROUTERS

    for router in ALL_ROUTERS:
        app.include_router(router)

    # SPA catch-all (MUST be last): deep links / F5 on client routes (/datensaetze ...)
    # serve index.html; React-Router handles them. /api/* is unknown here -> 404.
    @app.get("/{full_path:path}")
    def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404, "unknown API endpoint")
        return FileResponse(str(_STATIC / "index.html"))

    return app


def run(host: str | None = None, port: int | None = None) -> int:
    from .. import config

    host = host or config.DEFAULT_WEB_HOST
    port = port or config.DEFAULT_WEB_PORT
    try:
        import uvicorn  # noqa: F401 — presence check; the real serve happens in serve.run
    except ImportError:
        print("[FAIL] fastapi/uvicorn missing. Install with:  uv sync --extra web")
        return 1
    # For direct starts without CLI (python -m …): make logger visible (no-op if already configured).
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    print(f"chesslab web UI: http://{host}:{port}")
    # The MJPEG camera streams are endless generators; `serve.run` sets a process-wide
    # shutdown flag in the signal handler so they terminate within the graceful window
    # instead of being force-cancelled on Ctrl+C.
    from ..serve import run as serve_run
    return serve_run(create_app(), host=host, port=port)
