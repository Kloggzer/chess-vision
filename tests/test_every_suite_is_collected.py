"""Eine Testdatei, die kein Sammler findet, ist die stillste Luege im Projekt.

Gemessen 2026-09-21: Python 230 von 230, Web 174 von 174, alle sieben Kotlin-Module eingebunden.
Der Waechter haelt die Faelle, die das brechen koennten, ohne dass eine Suite rot wird — ein
Kotlin-Modul, das aus `settings.gradle.kts` faellt, und ein `exclude` in der vitest-Konfiguration.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ANDROID = ROOT / "android"
SKIP = {"build", "bin", ".gradle", "third_party"}


def modules_with_tests() -> set[str]:
    """Jedes `android/<modul>`, das eine Kotlin-Testquelle traegt."""
    out = set()
    for p in ANDROID.glob("*/src/test"):
        if not SKIP & set(p.relative_to(ANDROID).parts) and any(p.rglob("*.kt")):
            out.add(p.relative_to(ANDROID).parts[0])
    return out


def included_modules(text: str) -> set[str]:
    """Eigene Funktion, damit die Gegenprobe ein Modul EINPFLANZEN kann."""
    return set(re.findall(r'^\s*include\("\:([\w-]+)"\)', text, re.MULTILINE))


def test_every_kotlin_module_with_tests_is_built():
    settings = (ANDROID / "settings.gradle.kts").read_text(encoding="utf-8")
    vergessen = sorted(modules_with_tests() - included_modules(settings))

    assert vergessen == [], (
        "diese Module tragen Tests, die `gradlew test` nie faehrt — "
        f"in `settings.gradle.kts` aufnehmen: {vergessen}"
    )


def test_the_web_runner_excludes_nothing_but_the_usual():
    """Ein `exclude` in der vitest-Konfiguration nimmt Dateien lautlos aus dem Lauf."""
    cfg = ROOT / "platform" / "app" / "vitest.config.ts"
    if not cfg.is_file():
        return
    text = cfg.read_text(encoding="utf-8")
    verdaechtig = [
        line.strip()
        for line in text.splitlines()
        if "exclude" in line and "node_modules" not in line and ".next" not in line
    ]

    assert verdaechtig == [], "ein eigenes `exclude` nimmt Testdateien aus dem Lauf: " + "; ".join(verdaechtig)


def test_the_guard_sees_a_planted_violation():
    """Eine Ratsche ohne Gegenprobe ist eine Behauptung."""
    assert included_modules('include(":core-engine")\ninclude(":app")\n') == {"core-engine", "app"}
    assert included_modules('// include(":arena")\n') == set()
    assert modules_with_tests(), "der Scanner findet ueberhaupt keine Module — dann prueft er nichts"
