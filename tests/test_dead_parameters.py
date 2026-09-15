"""Was am 2026-09-14 als wirkungslos entfernt wurde, bleibt entfernt.

Neun Nur-Schlüsselwort-Parameter trugen immer ihren Default: kein Aufrufer in `src/`, `tests/`
oder `scripts/` hat sie je gesetzt. Ein Parameter, der nie einen anderen Wert sieht, liest sich
wie eine Stellschraube und ist keine — und der Zweig dahinter ist toter Code (Nutzer, 2026-09-14:
"code ohne wirkung brauche ich nämlich nicht").

`method` ist die Ausnahme: dort fehlte der AUFRUFER, nicht die Wirkung. `--method difference`
schrieb Vorschläge, die kein Verb adoptieren konnte. `temporal-adopt`, `temporal-upsert` und
`temporal-pass` reichen ihn seitdem durch.
"""
from __future__ import annotations

import inspect

import pytest

#: (Modul, Funktion, entfernter Parameter) — jeweils samt dem Zweig, den er steuerte.
REMOVED = [
    ("chesslab.framescan", "cell_means", "work_key"),
    ("chesslab.occluders", "read_plate", "refine"),
    ("chesslab.temporal_matte", "propose_session", "frames"),
    ("chesslab.temporal_matte", "upsert_proposals", "solid"),
    ("chesslab.meshprep", "prepare_scan", "process"),
    ("chesslab.calibration", "board_corners_for_frame", "detect_scale"),
    ("chesslab.calibration", "warp_from_corners", "target_size"),
    # 2026-09-15: `tex_fallback` war ein Zweig, den kein Aufrufer je betreten konnte (der eine
    # uebergab `None`); `min_depth` und `erode` trugen immer die Modulkonstante.
    ("chesslab.meshprep", "_save_texture", "tex_fallback"),
    ("chesslab.alignment", "_notch_centre", "min_depth"),
    ("chesslab.occluders", "stage_of", "erode"),
]


@pytest.mark.parametrize(("module", "func", "param"),
                         REMOVED, ids=[f"{f}-{p}" for _, f, p in REMOVED])
def test_the_removed_parameter_stays_removed(module, func, param):
    import importlib

    fn = getattr(importlib.import_module(module), func)

    assert param not in inspect.signature(fn).parameters, (
        f"{func}(..., {param}=…) ist zurück. Wer ihn wiederbelebt, schreibt den Aufrufer dazu, "
        f"der ihn braucht — sonst trägt er wieder nur seinen Default.")


def test_method_reaches_adopt_and_upsert():
    """Der Gegenfall: hier war der Aufrufer die Lücke, nicht der Parameter."""
    from chesslab.cli import session_temporal_adopt, session_temporal_pass, session_temporal_upsert

    for verb in (session_temporal_adopt, session_temporal_upsert, session_temporal_pass):
        assert "method" in inspect.signature(verb).parameters, (
            f"{verb.__name__} reicht `--method` nicht durch — `--method difference` schreibt dann "
            f"Vorschläge, die kein Verb adoptieren kann.")
