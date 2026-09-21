"""Ein geparkter Bugtest und sein Eintrag im Audit muessen dasselbe sagen.

Am 2026-09-21 fuehrte `docs/bug-audit-2026-09-13.md` drei Befunde als `[OFFEN]`, die laengst
gebaut waren — einer mit dem Satz "Kein roter Test: er braucht den Ruecksignal-Pfad, den es nicht
gibt", waehrend genau dieser Pfad seit `b7a9287d` existiert. Niemand haelt die Statusspalte nach.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "docs" / "bug-audit-2026-09-13.md"
KOTLIN = ROOT / "android"
SKIP = {"build", "bin", ".gradle"}

_PARKED = re.compile(r'@Disabled\("BUG:\s*([A-Z]\d+)')
_OFFEN = re.compile(r"^### ([A-Z]\d+) .*\[OFFEN", re.MULTILINE)
_NAMED = re.compile(r"`([A-Za-z0-9]+BugTest)`")


def _sources() -> list[Path]:
    return [p for p in KOTLIN.rglob("*Test.kt") if not SKIP & set(p.relative_to(KOTLIN).parts)]


def parked_in(text: str) -> list[str]:
    """Eigene Funktion, damit die Gegenprobe einen geparkten Test EINPFLANZEN kann."""
    return _PARKED.findall(text)


def offen_in(text: str) -> set[str]:
    return set(_OFFEN.findall(text))


def widersprueche_in(text: str, dateien: set[str], geparkt: set[str]) -> list[str]:
    """Offene Eintraege, die eine vorhandene und NICHT geparkte `*BugTest`-Datei nennen.

    Eine solche Datei laeuft gruen in der Suite mit — der Befund ist also gebaut, nicht offen.
    """
    out: list[str] = []
    for block in re.split(r"^### ", text, flags=re.MULTILINE)[1:]:
        kopf, _, rest = block.partition("\n")
        if "[OFFEN" not in kopf:
            continue
        kennung = block.split(" ", 1)[0]
        out += [
            f"{kennung}: {name} ist vorhanden und nicht geparkt"
            for name in _NAMED.findall(kopf + rest)
            if f"{name}.kt" in dateien and f"{name}.kt" not in geparkt
        ]
    return out


def parked() -> dict[str, str]:
    found: dict[str, str] = {}
    for p in _sources():
        for kennung in parked_in(p.read_text(encoding="utf-8")):
            found[kennung] = p.name
    return found


def test_ein_geparkter_bugtest_steht_im_audit_als_offen():
    offen = offen_in(AUDIT.read_text(encoding="utf-8"))
    verwaist = {k: d for k, d in parked().items() if k not in offen}

    assert verwaist == {}, f"geparkt, aber im Audit nicht mehr offen: {verwaist}"


def test_ein_offener_befund_mit_testdatei_laeuft_nicht_gruen_mit():
    widerspruch = widersprueche_in(
        AUDIT.read_text(encoding="utf-8"), {p.name for p in _sources()}, set(parked().values())
    )

    assert widerspruch == [], "gebaut, aber weiter als offen gefuehrt: " + "; ".join(widerspruch)


def test_die_erkenner_sehen_einen_eingepflanzten_verstoss():
    """Eine Ratsche ohne Gegenprobe ist eine Behauptung."""
    assert parked_in('@Disabled("BUG: Z9 - erfunden")\nclass X') == ["Z9"]
    assert parked_in('@Disabled("kein Befund, nur muede")') == []

    assert offen_in("### Z9 - irgendwas  **[OFFEN]**\n") == {"Z9"}
    assert offen_in("### Z9 - irgendwas  **[ERLEDIGT]**\n") == set()

    audit = "### Z9 - irgendwas  **[OFFEN]**\nRoter Test: `ErfundenBugTest`.\n"
    assert widersprueche_in(audit, {"ErfundenBugTest.kt"}, set()) != []
    assert widersprueche_in(audit, {"ErfundenBugTest.kt"}, {"ErfundenBugTest.kt"}) == []
    assert widersprueche_in(audit, set(), set()) == []
