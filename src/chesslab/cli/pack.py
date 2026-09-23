"""`chesslab pack` — session packs: one memmap per session under data/packs/."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from ._common import fail_on

pack_app = typer.Typer(help="Session packs: one memmap per session under data/packs/.",
                       no_args_is_help=True)


@pack_app.command("import")
def pack_import_cmd(
    src: Annotated[
        Path, typer.Argument(help="Directory a Kotlin `labeled-video-pack` wrote."),
    ],
) -> None:
    """Move a pack the desktop tool wrote under `data/packs/`, keeping the name its rows say."""
    from ..training import pack_session

    with fail_on(OSError, ValueError, KeyError):
        res = pack_session.import_pack(src)
    print(f"[OK] pack {res['pack']}: {res['n']} crops, {res['h']}x{res['w']}, {res['gb']} GB")
