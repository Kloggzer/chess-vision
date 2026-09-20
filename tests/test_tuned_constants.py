"""Die Ratsche ueber die Engine-Zahlen: `UNGEPRUEFT` darf nur schrumpfen.

Warum die Liste und nicht die Kommentarpflicht: eine Zahl ohne Herkunft ist nicht falsch, sie ist
unbelegt — und genau das soll man vor einem Release-Kandidaten aufzaehlen koennen, statt es aus
63 Feldern zusammenzusuchen. `docs/magische-zahlen.md` nennt die Kosten je Messung.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIST = ROOT / "android/config/tuned-constants.txt"

#: Stand 2026-09-19. Darf nur kleiner werden — wer eine Zahl misst, notiert die Messung an ihrem
#: Feld, regeneriert die Liste und zieht diese Zahl nach.
UNGEPRUEFT_BUDGET = 27


def _module():
    spec = importlib.util.spec_from_file_location(
        "tuned_constants", ROOT / "android/scripts/tuned_constants.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _rows():
    return _module().classify((ROOT / "android/core-engine/src/main/kotlin/com/chesslab/engine/"
                               "api/TrackerConfig.kt").read_text(encoding="utf-8"))


def test_liste_ist_aktuell():
    mod = _module()
    assert LIST.read_text(encoding="utf-8") == mod.render(_rows()), (
        "tuned-constants.txt ist veraltet — uv run python android/scripts/tuned_constants.py")


def test_ungeprueft_schrumpft_nur():
    offen = sorted(name for kind, name, _ in _rows() if kind == "UNGEPRUEFT")
    assert len(offen) <= UNGEPRUEFT_BUDGET, (
        f"{len(offen)} Zahlen ohne Herkunft, Budget {UNGEPRUEFT_BUDGET}. Eine NEUE Zahl kommt mit "
        f"ihrer Messung oder mit einer Notiz, warum sie geraten ist: {offen}")
    if len(offen) < UNGEPRUEFT_BUDGET:
        raise AssertionError(f"Budget auf {len(offen)} senken (Fortschritt festschreiben).")


def test_gegenprobe_eine_neue_zahl_faellt_auf():
    mod = _module()
    quelle = "data class TrackerConfig(\n    val frischErfunden: Double = 0.42,\n)\n"
    kinds = [k for k, _, _ in mod.classify(quelle)]
    assert kinds == ["UNGEPRUEFT"], f"eingepflanzte Zahl nicht erkannt: {kinds}"
