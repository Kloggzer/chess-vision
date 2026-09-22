"""Die Zahlen in CLAUDE.md gegen die Platte.

Am 2026-09-22 wurden rund 45 Zahlen der Datei nachgezaehlt. Weggedriftet sind AUSNAHMSLOS die,
die keine Ratsche haelt; die vier Ratschen-Zahlen stimmten Ziffer fuer Ziffer. Diese Datei gibt
den drift-anfaelligsten Nennern eine Ratsche. Rot heisst hier nicht "kaputt", sondern
"nachziehen" -- CLAUDE.md wird jede Sitzung ungeprueft gelesen.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CLAUDE = ROOT / "CLAUDE.md"
RECORDINGS = ROOT / "data" / "recordings"


def _text() -> str:
    return CLAUDE.read_text(encoding="utf-8")


def _claimed(muster: str) -> int:
    treffer = re.search(muster, _text())
    assert treffer, f"CLAUDE.md traegt die Aussage nicht mehr: {muster}"
    return int(treffer.group(1).replace(" ", "").replace(" ", ""))


def _matte_dirs() -> list[Path]:
    # `_pre-scan-20260906/` sind Sicherungen derselben Aufnahmen, keine eigenen.
    return [p.parent for p in RECORDINGS.glob("*/matte.jsonl") if "_pre-scan" not in str(p)]


@pytest.mark.skipif(not RECORDINGS.is_dir(), reason="ohne data/ nicht messbar")
def test_die_zahl_der_gematteten_aufnahmen_stimmt():
    behauptet = _claimed(r"tragen \*\*(\d+)\*\* Aufnahmeverzeichnisse eine `matte.jsonl`")
    gezaehlt = len(_matte_dirs())
    assert behauptet == gezaehlt, (
        f"CLAUDE.md sagt {behauptet} gemattete Aufnahmen, auf der Platte sind {gezaehlt}. "
        "Dieser Nenner traegt die Coverage-Drift, die Val-Wahl und mehrere Aussagen zur Kette."
    )


@pytest.mark.skipif(not RECORDINGS.is_dir(), reason="ohne data/ nicht messbar")
def test_die_sicherungen_zaehlen_nicht_als_eigene_aufnahmen():
    alle = list(RECORDINGS.glob("*/matte.jsonl")) + list(RECORDINGS.glob("*/*/matte.jsonl"))
    assert len(alle) >= len(_matte_dirs()), "die Sicherungen sind der Grund fuer den Abzug"
