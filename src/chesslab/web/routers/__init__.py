"""Router registration in the order they are included in ``create_app()``.

ALL routers must be registered BEFORE the SPA catch-all — otherwise the catch-all
consumes the API paths. The order among them does not matter (unique paths), but
alphabetical sorting helps with discovery.
"""

from __future__ import annotations

from .collect import router as collect_router
from .datasets import router as datasets_router
from .realgames import router as realgames_router
from .scan import router as scan_router
from .sessions import router as sessions_router
from .training import router as training_router

ALL_ROUTERS = [
    collect_router,
    datasets_router,
    realgames_router,
    scan_router,
    sessions_router,
    training_router,
]
