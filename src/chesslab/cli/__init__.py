"""Typer entrypoint. One CLI `chesslab`; each stage adds its own subcommands.

Every sub-app lives in its own module; importing `dataset` and `train` registers the root verbs.
"""

from __future__ import annotations

import logging
import sys

from . import dataset, train  # noqa: F401 - in this order: they register the root verbs on `app`
from ._app import app
from .calibrate import calibrate_app
from .capture import capture_app
from .dataset import dataset_app
from .occluders import occluders_app
from .pack import pack_app
from .perf import perf_app
from .realgames import realgames_app
from .session import session_app
from .synth import synth_app

app.add_typer(calibrate_app, name="calibrate")
app.add_typer(session_app, name="session")
app.add_typer(realgames_app, name="realgames")
app.add_typer(dataset_app, name="dataset")
app.add_typer(capture_app, name="capture")
app.add_typer(pack_app, name="pack")
app.add_typer(occluders_app, name="occluders")
app.add_typer(synth_app, name="synth")
app.add_typer(perf_app, name="perf")

__all__ = ["app", "main"]


def main() -> None:
    # Ensure non-ASCII report glyphs (—, umlauts) render on Windows consoles too.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except Exception:  # noqa: BLE001 - best effort; default encoding is fine elsewhere
            pass
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    app()
