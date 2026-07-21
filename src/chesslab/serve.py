"""Uvicorn serving helpers shared by the web UI (`web/app.py`) and the move-tracker
UI (`move_tracker/app.py`).

Both apps expose endless MJPEG generators (`/warped.mjpg`, `/api/camera/collect.mjpg`,
`/api/scan/preview.mjpg`). On Ctrl+C uvicorn stops accepting connections and waits for
the in-flight requests to finish, up to `timeout_graceful_shutdown`. An endless
``while True`` streaming generator never returns on its own, so that wait always times
out and uvicorn force-cancels the streaming tasks — the "Cancel N running task(s),
timeout graceful shutdown exceeded" message plus the CancelledError storm — while the
camera capture/reconnect threads keep logging retries.

The fix has two halves that live here:

1. A process-wide `SHUTDOWN` event that is set the INSTANT the signal arrives — inside
   the signal handler (`GracefulServer.handle_exit`), which runs BEFORE the ASGI lifespan
   "shutdown" hook. Streaming generators poll `SHUTDOWN` and idle on `SHUTDOWN.wait(dt)`
   (never a bare `time.sleep`), so a shutdown breaks them out of their loop immediately and
   the connection closes well within the graceful window — no forced cancel, no storm.

2. `run()` wires that up: it builds the uvicorn server with the graceful timeout and a
   `handle_exit` override, so callers just say `serve.run(app, host, port)`.
"""

from __future__ import annotations

import threading

# Set the moment SIGINT/SIGTERM arrives (see GracefulServer.handle_exit), i.e. before the
# ASGI lifespan shutdown runs. Streaming generators check `SHUTDOWN.is_set()` in their loop
# condition and idle via `serve.sleep(dt)` so the wait is interrupted at once on shutdown.
SHUTDOWN = threading.Event()


def sleep(seconds: float) -> bool:
    """Idle for up to `seconds`, returning early if shutdown was signalled.

    Returns True if the caller should keep going, False if a shutdown is in progress.
    Use this in streaming generators instead of `time.sleep(seconds)` so Ctrl+C is not
    swallowed by an idle sleep."""
    return not SHUTDOWN.wait(seconds)


def run(app, host: str, port: int, *, timeout_graceful_shutdown: int = 3) -> int:
    """Serve `app` with uvicorn, wired so Ctrl+C exits cleanly within the graceful window.

    Overrides `handle_exit` to set `SHUTDOWN` immediately (the streaming generators watch
    it), so the endless MJPEG streams terminate before uvicorn's graceful-shutdown timeout
    rather than being force-cancelled."""
    import uvicorn

    SHUTDOWN.clear()

    class GracefulServer(uvicorn.Server):
        def handle_exit(self, sig, frame):  # noqa: D401 — uvicorn signal-handler hook
            SHUTDOWN.set()                  # unblock streaming generators at once
            super().handle_exit(sig, frame)

    config = uvicorn.Config(app, host=host, port=port, log_level="warning",
                            timeout_graceful_shutdown=timeout_graceful_shutdown)
    GracefulServer(config).run()
    return 0
