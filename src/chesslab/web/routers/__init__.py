"""Router-Registrierung in der Reihenfolge, wie sie in ``create_app()`` inkludiert werden.

ALLE Router müssen VOR dem SPA-Catch-all registriert sein — sonst frisst der Catch-all
die API-Pfade. Die Reihenfolge untereinander ist egal (eindeutige Pfade), aber die
alphabetische Sortierung hilft beim Auffinden.
"""

from __future__ import annotations

from .calibrate import router as calibrate_router
from .collect import router as collect_router
from .datasets import router as datasets_router
from .inference import router as inference_router
from .manual import router as manual_router
from .scan import router as scan_router
from .sessions import router as sessions_router
from .training import router as training_router

ALL_ROUTERS = [
    calibrate_router,
    collect_router,
    datasets_router,
    inference_router,
    manual_router,
    scan_router,
    sessions_router,
    training_router,
]
