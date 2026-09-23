"""`chesslab perf` — semantic performance audits."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from ._common import fail_on

perf_app = typer.Typer(
    help="Semantic performance audits: repeated work, bytes, ranges and call paths.",
    no_args_is_help=True,
)


@perf_app.command("fuzz")
def perf_fuzz(
    seed: int = typer.Option(847291, "--seed", help="Deterministic workload seed."),
    frames: int = typer.Option(500, "--frames", min=1),
    board_revisions: int = typer.Option(2, "--board-revisions", min=1),
    json_out: Annotated[
        Path | None, typer.Option("--json", help="Optional JSON report path.")
    ] = None,
) -> None:
    """Run the deterministic profiler self-test with changing frame/board revisions."""
    from ..work_audit import run_fuzzy

    with fail_on(ValueError):
        audit = run_fuzzy(seed=seed, frames=frames, board_revisions=board_revisions)
    print(audit.format_text())
    if json_out is not None:
        print(f"[OK] Work audit: {audit.write_json(json_out)}")
