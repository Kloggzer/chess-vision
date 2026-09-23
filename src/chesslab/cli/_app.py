"""The root `chesslab` app: its callback and the one root verb that belongs to no stage."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Annotated

import typer

from .. import doctor as doctor_mod

app = typer.Typer(
    name="chesslab",
    help="Build an auto-labeled chess-piece dataset and train a per-square model.",
    no_args_is_help=True,
    add_completion=False,
)


@app.callback()
def _root(
    ctx: typer.Context,
    work_audit: Annotated[
        Path | None,
        typer.Option("--work-audit", help="Write a semantic avoidable-work JSON report."),
    ] = None,
) -> None:
    """chesslab — staged tool; each stage adds subcommands. See `chesslab --help`."""
    if work_audit is None:
        return
    from ..work_audit import WorkAudit, activate, deactivate

    audit = WorkAudit(command=" ".join(sys.argv[1:]))
    token = activate(audit)

    def finish() -> None:
        deactivate(token)
        path = audit.write_json(work_audit)
        print(audit.format_text())
        print(f"[OK] Work audit: {path}")

    ctx.call_on_close(finish)


@app.command()
def doctor(
    gpu: bool = typer.Option(False, "--gpu", help="Also run ROCm/PyTorch GPU validation (required before training)."),
    json_out: bool = typer.Option(False, "--json", help="Also output machine-readable JSON report."),
) -> None:
    """Pre-flight: validate Python, app deps and optional GPU (ROCm)."""
    code = doctor_mod.run(gpu=gpu, json_out=json_out)
    raise typer.Exit(code)
