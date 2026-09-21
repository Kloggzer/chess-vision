"""Wer eine `.json`/`.jsonl` selbst schreibt, beantwortet den Abbruch mitten im Schreiben neu.

`chesslab.ioutil` ist die eine Antwort — Nebendatei, dann umhaengen, und bei einem zweiten
Schreiber `Contested` statt stiller Ueberschreibung. Diese Liste sind die Stellen davor und darf
nur SCHRUMPFEN. Hinter jedem Pfad steht, WARUM die Stelle bleibt; ohne Grund gehoert sie umgestellt.
"""
from __future__ import annotations

import re
from itertools import chain
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AREAS = (ROOT / "src" / "chesslab", ROOT / "scripts")
LEDGER = Path(__file__).with_name("json_doors.txt")
CUSTODIAN = "ioutil.py"

# Die drei Schreibweisen, in denen dieses Projekt eine Datei anlegt.
_WRITE = re.compile(r"""\.write_text\(|\.open\(\s*["']w["']|open\(\s*[^,]+,\s*["']w["']""")
_JSON = re.compile(r"""json\.dumps?\(|\.jsonl?["']""")
# Ein Bericht, den nur ein Mensch liest, ist keine Datei, um die sich zwei Prozesse streiten.
_NOT_JSON = re.compile(r"""\.(yaml|yml|txt|obj|mtl|src|log|csv)["']|yaml\.safe_dump""")


def doors_in(text: str) -> int:
    """Schreibaufruf UND JSON in derselben Sichtweite — die Form, die die Politik neu erfindet.

    Eigene Funktion, damit `tests/test_ratchet_counterchecks.py` einen Verstoss EINPFLANZEN kann:
    eine Ratsche ohne Gegenprobe ist eine Behauptung.
    """
    lines = text.splitlines()
    return sum(
        1
        for i, line in enumerate(lines)
        if _WRITE.search(line)
        and not _NOT_JSON.search(line)
        and _JSON.search("\n".join(lines[i:i + 6]))
    )


def doors() -> dict[str, int]:
    found: dict[str, int] = {}
    for file in sorted(chain.from_iterable(a.rglob("*.py") for a in AREAS)):
        if file.name == CUSTODIAN:
            continue
        hits = doors_in(file.read_text(encoding="utf-8"))
        if hits:
            found[file.relative_to(ROOT).as_posix()] = hits
    return found


def budget() -> dict[str, int]:
    out: dict[str, int] = {}
    for line in LEDGER.read_text(encoding="utf-8").splitlines():
        line = line.split("#")[0].strip()
        if line:
            count, name = line.split(None, 1)
            out[name.strip()] = int(count)
    return out


def test_keine_neue_tuer_am_treuhaender_vorbei():
    fresh = sorted(set(doors()) - set(budget()))
    assert fresh == [], f"schreib ueber chesslab.ioutil: {fresh}"


def test_eine_bekannte_tuer_wird_nicht_breiter():
    seen = doors()
    for name, allowed in budget().items():
        assert seen.get(name, 0) <= allowed, name


def test_die_liste_traegt_keine_erledigte_zeile_mehr():
    seen = doors()
    stale = {n: b for n, b in budget().items() if seen.get(n, 0) < b}
    assert stale == {}, f"schreib die Zahl herunter — die Ratsche darf nur schrumpfen: {stale}"
