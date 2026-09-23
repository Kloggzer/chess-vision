"""Leser von `matte.jsonl` pruefen `coverage` auf `None`; die Liste der Verstoesse schrumpft nur."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

#: LEER seit 2026-09-16: alle acht Leser pruefen auf `None`. Nur kleiner werden lassen — also
#: bleibt sie leer, und jede neue truthy-Stelle macht die Suite rot.
BUDGET: dict[str, int] = {}

#: `or {}` ist eine VORGABE und kein Wahrheitstest; `is None` ist die richtige Frage.
#: Erkannt wird das IDIOM (`if ... r.get("coverage")`), nicht jede denkbare Umschreibung -
#: ein `bool(...)` drumherum rutscht durch. Ein Netz, keine Norm.
_OK = r"\s*is\s+(?:not\s+)?None|\s*or\s*(?:\{\}|\[\]|0\.0|0\b)"
_TRUTHY = re.compile(r"[.]get\(\"coverage\"\)(?!" + _OK + r")")
_BOOL = re.compile(r"(?:\bif\b|\band\b|\bor\b|\bnot\b|\bwhile\b)[^\n]*$")


def _sites() -> dict[str, int]:
    found: dict[str, int] = {}
    for base in ("src/chesslab", "scripts"):
        for file in sorted((ROOT / base).rglob("*.py")):
            n = 0
            for line in file.read_text(encoding="utf-8").splitlines():
                n += sum(1 for m in _TRUTHY.finditer(line) if _BOOL.search(line[:m.start()]))
            if n:
                found[file.relative_to(ROOT).as_posix()] = n
    return found


def test_no_new_reader_tests_coverage_for_truthiness() -> None:
    assert sorted(set(_sites()) - set(BUDGET)) == [], (
        "pruef `coverage` auf `None` - eine leere Messung ist eine Messung, SAMs Absage nicht")


def test_a_known_reader_does_not_gain_another() -> None:
    seen = _sites()
    for file, budget in BUDGET.items():
        assert seen.get(file, 0) <= budget, f"{file}: {seen.get(file, 0)} statt hoechstens {budget}"


def test_the_list_carries_no_finished_line() -> None:
    stale = {f: n for f, n in BUDGET.items() if _sites().get(f, 0) < n}

    assert stale == {}, f"schreib die Zahl herunter, die Ratsche darf nur schrumpfen: {stale}"
