"""API contract freeze: The React frontend (and move_tracker docs) depend on exactly these
routes. The test freezes the inventory as a literal — any removed or renamed route
fails here (sentinel for the router split, Rework 05). New routes are allowed
(Obermenge), fehlende nicht.

Recorded on 2026-07-03 after the scan pipeline cleanup (Turntable/Reconstruct/Crop removed).
"""

import pytest

pytest.importorskip("fastapi")

# (Methode, Pfad) — eingefroren. NEVER delete entries to make the test pass;
# a missing route is a real frontend break.
EXPECTED_API_ROUTES = {
    ("DELETE", "/api/datasets/{name}"),
    ("DELETE", "/api/runs/{run}"),
    ("DELETE", "/api/sessions/{sid}"),
    ("GET", "/api/camera/collect.mjpg"),
    ("GET", "/api/class/{cls}"),
    ("GET", "/api/collect/state"),
    ("GET", "/api/datasets"),
    ("GET", "/api/datasets/{name}"),
    ("GET", "/api/runs"),
    ("GET", "/api/runs/{run}/eval"),
    ("GET", "/api/runs/{run}/metrics"),
    ("GET", "/api/sessions"),
    ("GET", "/api/sessions/{sid}/board/{idx}"),
    ("GET", "/api/sessions/{sid}/frame/{idx}"),
    ("GET", "/api/sessions/manage"),
    ("GET", "/api/sessions/{sid}/overlay/{idx}"),
    ("GET", "/api/sessions/{sid}/review"),
    ("GET", "/api/stats"),
    ("GET", "/api/train/status"),
    ("POST", "/api/collect/finish"),
    ("POST", "/api/collect/shoot"),
    ("POST", "/api/collect/skip"),
    ("POST", "/api/collect/start"),
    ("POST", "/api/collect/undo"),
    ("POST", "/api/datasets"),
    ("POST", "/api/datasets/{name}/rebuild"),
    ("POST", "/api/reslice"),
    ("POST", "/api/sessions/{sid}/archive"),
    ("POST", "/api/sessions/{sid}/restore"),
    ("POST", "/api/sessions/{sid}/slice"),
    ("POST", "/api/sessions/{sid}/trim"),
    ("POST", "/api/slice"),
    ("POST", "/api/split"),
    ("POST", "/api/train"),
    ("POST", "/api/train/stop"),
}


def _current_routes() -> set[tuple[str, str]]:
    from fastapi.routing import _IncludedRouter

    from chesslab.web.app import create_app

    app = create_app()
    result: set[tuple[str, str]] = set()
    for r in app.routes:
        if isinstance(r, _IncludedRouter):
            # APIRouter-Routen, die via include_router ohne Prefix registriert wurden.
            for child in r.original_router.routes:
                if hasattr(child, "methods") and child.path.startswith("/api"):
                    result |= {(m, child.path) for m in child.methods if m != "HEAD"}
        elif hasattr(r, "methods") and r.path.startswith("/api"):
            result |= {(m, r.path) for m in r.methods if m != "HEAD"}
    return result - {("GET", "/api/docs")}


def test_no_api_route_lost():
    """Every frozen route still exists (rename/loss = frontend break)."""
    current = _current_routes()
    missing = EXPECTED_API_ROUTES - current
    assert not missing, f"API-Routen verloren/umbenannt: {sorted(missing)}"


def test_new_routes_are_intentional():
    """Neue Routen sind erlaubt, sollen aber bewusst ins Inventar aufgenommen werden.
    (Kein Fehler — nur ein sichtbarer Hinweis in der Testausgabe.)"""
    current = _current_routes()
    extra = current - EXPECTED_API_ROUTES
    if extra:
        print(f"[WARN] new API routes (update inventory in test_web_contract.py): {sorted(extra)}")


def test_spa_catch_all_last():
    """SPA catch-all returns index.html for client routes, unknown /api/* return 404."""
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from chesslab.web.app import create_app

    client = TestClient(create_app())
    r = client.get("/api/nope-does-not-exist")
    assert r.status_code == 404
    r = client.get("/datasets")   # Client route -> index.html (SPA)
    assert r.status_code == 200
    assert "html" in r.headers.get("content-type", "")
