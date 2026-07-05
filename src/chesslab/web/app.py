"""FastAPI backend for the local chesslab web UI.

Serves all tabs via JSON APIs: calibration, collect, manual labeling,
inference, scan, sessions/datasets and training.
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
        import uvicorn
    except ImportError:
        print("[FAIL] fastapi/uvicorn missing. Install with:  uv sync --extra web")
        return 1
    # For direct starts without CLI (python -m …): make logger visible (no-op if already configured).
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    print(f"chesslab web UI: http://{host}:{port}")
    # timeout_graceful_shutdown: the MJPEG camera streams are endless generators —
    # without a cap, Ctrl+C waits forever for those connections to finish.
    uvicorn.run(create_app(), host=host, port=port, log_level="warning",
                timeout_graceful_shutdown=2)
    return 0
