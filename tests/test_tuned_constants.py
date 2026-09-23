"""Ratsche ueber die Engine-Zahlen: `UNGEPRUEFT` schrumpft nur (`docs/engine-fuzz.md`)."""

from __future__ import annotations

from pathlib import Path

from conftest import load_script

ROOT = Path(__file__).resolve().parents[1]
LIST = ROOT / "android/config/tuned-constants.txt"

#: Darf nur kleiner werden: wer eine Zahl misst, notiert die Messung an ihrem Feld, regeneriert die
#: Liste und zieht diese Zahl nach.
UNGEPRUEFT_BUDGET = 27


def _rows():
    return load_script("tuned_constants", "android/scripts").classify((ROOT / "android/core-engine/src/main/kotlin/com/chesslab/engine/"
                               "api/TrackerConfig.kt").read_text(encoding="utf-8"))


def test_liste_ist_aktuell():
    mod = load_script("tuned_constants", "android/scripts")
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
    mod = load_script("tuned_constants", "android/scripts")
    quelle = "data class TrackerConfig(\n    val frischErfunden: Double = 0.42,\n)\n"
    kinds = [k for k, _, _ in mod.classify(quelle)]
    assert kinds == ["UNGEPRUEFT"], f"eingepflanzte Zahl nicht erkannt: {kinds}"
