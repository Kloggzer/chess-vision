"""`chesslab calibrate` — board geometry: profiles, markers, markerless search."""

from __future__ import annotations

import typer

from .. import calibration as calibration_mod
from ._common import fail_on

calibrate_app = typer.Typer(help="Stage 1 — Calibrate camera/board geometry.", no_args_is_help=True)


@calibrate_app.command("list")
def calibrate_list() -> None:
    """List existing calibration profiles."""
    raise typer.Exit(calibration_mod.calibrate_list())


@calibrate_app.command("markerless")
def calibrate_markerless(
    source: str = typer.Option(..., "--source", help="Video oder Bild, aus dem das Brett gesucht wird."),
    frame: int = typer.Option(0, "--frame", help="Frame-Nummer, wenn --source ein Video ist."),
    profile: str = typer.Option("desktop", "--profile", help="Profil, gegen dessen Raster geprueft wird."),
    out: str = typer.Option(None, "--out", help="PNG mit dem gefundenen Quad."),
) -> None:
    """Das Brett OHNE ArUco finden — Ecken plus das Urteil des Grid-Fits (`docs/markerless.md`)."""
    raise typer.Exit(calibration_mod.run_markerless(source, frame, profile, out))


@calibrate_app.command("markers")
def calibrate_markers(
    out: str = typer.Option("data/calibration/markers.png", "--out", help="Target PNG of the marker sheet."),
    dict_name: str = typer.Option("DICT_4X4_50", "--dict", help="ArUco-Dictionary."),
    marker_px: int = typer.Option(300, "--marker-px"),
) -> None:
    """Generate printable ArUco marker sheet (glue onto a8/h8/h1/a1)."""
    with fail_on(ValueError):
        p = calibration_mod.generate_markers(out, dict_name=dict_name, marker_px=marker_px)
    print(f"[OK] Marker sheet: {p} — print out, cut out, glue one marker centered on each "
          "corner a8/h8/h1/a1.")
