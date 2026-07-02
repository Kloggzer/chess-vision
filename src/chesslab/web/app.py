"""FastAPI-Backend der lokalen chesslab-Web-UI.

Bedient alle Tabs über JSON-APIs: Kalibrierung, Sammeln, Manuelles Labeln,
Inference, Scan, Sessions/Datensätze und Training.
Nutzt die vorhandene chesslab-Logik wieder (dataset, labeling, training). Bilder werden als
statische Dateien aus `data/` ausgeliefert.

Die Endpoint-Logik lebt in ``web/routers/`` (Feature-Router, eine Datei pro Tab) und
``web/util.py`` (gemeinsame Hilfen). Diese Datei enthält nur noch den App-Aufbau:
Mounts, Router-Includes und den SPA-Catch-all.
"""

from __future__ import annotations

import logging
from pathlib import Path

_STATIC = Path(__file__).parent / "static"


def labeling_predict(run: str, rows: list[dict]) -> list[dict]:
    """Wrapper, damit der torch-Import lazy bleibt (Web läuft auch ohne Modell-Ansicht)."""
    from .inference import predict_rows
    from .. import config

    return predict_rows(config.DATA.models / run, rows, device="cpu")


def create_app():
    from .. import config
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    config.ensure_dirs(config.DATA)
    app = FastAPI(title="chesslab", docs_url="/api/docs")

    app.mount("/static", StaticFiles(directory=str(_STATIC)), name="static")
    app.mount("/img", StaticFiles(directory=str(config.DATA.root)), name="img")

    @app.get("/")
    def index():
        return FileResponse(str(_STATIC / "index.html"))

    # Router lazy importieren (cv2-lazy-Konvention: kein Router öffnet beim Import eine Kamera).
    from .routers import ALL_ROUTERS

    for router in ALL_ROUTERS:
        app.include_router(router)

    # SPA-Catch-all (MUSS zuletzt stehen): Deep-Links/F5 auf Client-Routen (/datensaetze ...)
    # liefern index.html; React-Router übernimmt. /api/* hier ist unbekannt -> 404.
    @app.get("/{full_path:path}")
    def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404, "unbekannter API-Endpunkt")
        return FileResponse(str(_STATIC / "index.html"))

    return app


def run(host: str | None = None, port: int | None = None) -> int:
    from .. import config

    host = host or config.DEFAULT_WEB_HOST
    port = port or config.DEFAULT_WEB_PORT
    try:
        import uvicorn
    except ImportError:
        print("[FAIL] fastapi/uvicorn fehlen. Installieren mit:  uv sync --extra web")
        return 1
    # Für Direktstarts ohne CLI (python -m …): Logger sichtbar machen (no-op, wenn schon konfiguriert).
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    print(f"chesslab Web-UI: http://{host}:{port}")
    uvicorn.run(create_app(), host=host, port=port, log_level="warning")
    return 0
