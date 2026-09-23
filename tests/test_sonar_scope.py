"""Der SonarCloud-Analyseumfang (`sonar-project.properties`) passt unter das ncloc-Kontingent."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
PROPS = ROOT / "sonar-project.properties"
#: Bei 50 000 lehnt SonarCloud ab. Wir schlagen frueher an, weil die Zaehlung nur eine
#: Naeherung ist und ein Scan-Ausfall teurer waere als ein roter Test.
LIMIT = 47_000  # 2026-09-23: Modulaufteilung kostet Kopfzeilen; web-ruft-python baut ~1450 ab
CODE = {".kt", ".kts", ".py", ".ts", ".tsx", ".js", ".jsx"}
_COMMENT = re.compile(r"^\s*(//|#|\*|/\*|\*/|<!--|--)")


def sources() -> list[str]:
    """`sonar.sources` aus der Properties-Datei, Fortsetzungszeilen aufgeloest."""
    text = PROPS.read_text(encoding="utf-8")
    text = re.sub(r"\\s*\n\s*", "", text)
    for line in text.splitlines():
        if line.startswith("sonar.sources="):
            return [p.strip() for p in line.split("=", 1)[1].split(",") if p.strip()]
    return []


def ncloc(path: Path) -> int:
    try:
        body = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return 0
    return sum(1 for line in body.splitlines()
               if line.strip() and not _COMMENT.match(line.strip()))


def test_properties_name_the_organisation():
    assert PROPS.is_file(), "sonar-project.properties fehlt"
    assert "sonar.organization=kloggzer" in PROPS.read_text(encoding="utf-8")


def test_every_named_source_exists():
    """Ein Pfad, den es nicht gibt, schrumpft den Umfang lautlos — genau so zeigte die alte
    `sonar-project.properties` einmal auf ein zwei Wochen zuvor geloeschtes Verzeichnis."""
    fehlt = [s for s in sources() if not (ROOT / s).exists()]
    assert fehlt == [], f"in sonar.sources genannt, aber nicht vorhanden: {fehlt}"


def test_the_scope_stays_under_the_quota():
    roots = sources()
    if not roots:
        pytest.skip("keine sonar.sources")
    total = 0
    for root in roots:
        for path in (ROOT / root).rglob("*"):
            if path.suffix.lower() not in CODE or not path.is_file():
                continue
            name = path.as_posix()
            if ".test." in name or ".spec." in name or "__pycache__" in name:
                continue
            total += ncloc(path)
    assert total < LIMIT, (
        f"Analyse-Umfang {total} ncloc, Schwelle {LIMIT} (SonarCloud lehnt ab 50 000 ab) — "
        "entweder einen Bereich aus `sonar.sources` nehmen oder das Kontingent erhoehen")
