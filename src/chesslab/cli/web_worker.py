"""`chesslab web-worker` — the web app's warm Python; the body lives in `chesslab.web_serve`."""

from __future__ import annotations

from ..web_serve import answer, serve
from ._app import app

__all__ = ["answer", "serve", "web_worker"]


@app.command("web-worker")
def web_worker() -> None:
    """Serve `web_ops` to the web app over stdin/stdout until stdin closes. Never loads torch."""
    from ..web_serve import main

    main()
