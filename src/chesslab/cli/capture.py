"""`chesslab capture` — targeted recording: measured corpus gaps become shooting orders."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

import typer

from ._common import fail_on

capture_app = typer.Typer(
    help="Gezielte Erfassung: aus gemessenen Korpusluecken werden Aufnahmeauftraege.",
    no_args_is_help=True)


@capture_app.command("plan")
def capture_plan_cmd(
    dataset: str = typer.Option("real13-mix-v7-128", "--dataset", help="Woher die Luecken kommen."),
    limit: int = typer.Option(10, "--limit", help="Wie viele Auftraege."),
    gaps_file: Annotated[
        Path, typer.Option("--gaps", help="Der Bericht von `scripts/coverage_gaps.py`.")
    ] = Path("data/reports/coverage-gaps.json"),
    out: Annotated[
        Path, typer.Option("--out", help="Wohin der Plan geschrieben wird.")
    ] = Path("data/reports/capture-plan.json"),
    manifest: str = typer.Option("", "--manifest", help="Statt des Datensatz-Manifests lesen."),
) -> None:
    """Aus `coverage-gaps.json` konkrete Aufnahmeauftraege machen.

    Ein Auftrag ist ein BUENDEL: so viele Luecken auf einmal, wie Figurenset und Brettspanne
    hergeben. Die Felder sind Vorschlaege — das Band macht die Lampe, gemessen wird in der App
    (`docs/capture-axes.md`).
    """
    from ..capture_plan import board_spread, shots, square_stats
    from ..dataset_build import dataset_dir

    if not gaps_file.is_file():
        print(f"[FAIL] {gaps_file} fehlt — erst `uv run python scripts/coverage_gaps.py`.")
        raise typer.Exit(1)
    gaps = json.loads(gaps_file.read_text(encoding="utf-8")).get("gaps") or []
    stats = square_stats(manifest or dataset_dir(dataset) / "manifest.jsonl")
    if not stats:
        print(f"[FAIL] {dataset}: keine Zeile traegt `brightness` — erst "
              f"`uv run python scripts/backfill_brightness.py`.")
        raise typer.Exit(1)
    bright = {sq: s["median"] for sq, s in stats.items()}
    plan = shots(gaps, stats, limit=limit)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"generated_at": datetime.now(UTC).isoformat(), "dataset": dataset,
                               "gaps_from": str(gaps_file), "board_spread": board_spread(bright),
                               "shots": plan},
                              indent=1, ensure_ascii=False), encoding="utf-8")
    closed = sum(len(s["closes"]) for s in plan)
    print(f"[OK] {len(plan)} Aufnahmen fuer {closed} Luecken -> {out}")
    for s in plan:
        print(f"   {s['id']:28s} {s['reason']}, Hoehe {s['height']}, "
              f"{s['orientations']} Drehschritte")


@capture_app.command("import")
def capture_import_cmd(
    name: Annotated[str, typer.Argument(help="Die Aufnahme unter data/recordings/.")],
    profile: str = typer.Option("desktop", "--profile", help="Profil, durch das geschnitten wird."),
) -> None:
    """Ein Buendel MIT `capture.json` wird zu Brettern — ohne Kandidat und ohne Zugerkennung."""
    from ..capture_import import import_capture
    from ..realgames.boards import FIT_FAILED, FIT_KEPT, FIT_SOURCE

    with fail_on(OSError, ValueError, KeyError):
        res = import_capture(name, profile)
    fit = res["fit"]
    print(f"  Grid-Fit: {fit[FIT_SOURCE]} nachgezogen, {fit[FIT_KEPT]} schon auf dem Raster, "
          f"{fit[FIT_FAILED]} unlesbar — align_worst_px Median {fit['median']}, Mesh auf {fit['mesh']}")
    print(f"[OK] {len(res['rows'])} Bretter -> {res['session_dir']} bei {res['fps']:.2f} fps "
          f"({res['no_mesh']} ohne Mesh, {res['no_frame']} ohne Bild)")
