"""Wer eine `.jsonl` selbst in Zeilen schneidet, beantwortet drei Fragen neu.

Die Leerzeile, die halbe LETZTE Zeile (ein Schreiber laeuft noch) und die kaputte Zeile
MITTENDRIN (Beschaedigung, muss laut sein). `chesslab.ioutil.read_jsonl` ist die eine Antwort;
diese Liste sind die Stellen davor und darf nur SCHRUMPFEN. Der Zwilling der Web-App steht in
`platform/app/lib/jsonl-ratchet.test.ts`.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / "src" / "chesslab"
LEDGER = Path(__file__).with_name("jsonl_readers.txt")

_CUT = re.compile(r"\.splitlines\(\)|\.split\(chr\(10\)\)")


def readers() -> dict[str, int]:
    """Zeilenschnitt UND `json.loads` in derselben Datei — das ist die Form, die die Politik neu erfindet."""
    found: dict[str, int] = {}
    for file in sorted(LIB.rglob("*.py")):
        if file.name == "ioutil.py":
            continue
        text = file.read_text(encoding="utf-8")
        if "json.loads(" not in text:
            continue
        hits = sum(1 for line in text.splitlines() if _CUT.search(line))
        if hits:
            found[file.relative_to(LIB).as_posix()] = hits
    return found


def budget() -> dict[str, int]:
    out: dict[str, int] = {}
    for line in LEDGER.read_text(encoding="utf-8").splitlines():
        line = line.split("#")[0].strip()
        if line:
            count, name = line.split(None, 1)
            out[name.strip()] = int(count)
    return out


def test_keine_neue_stelle_schneidet_jsonl_selbst():
    fresh = sorted(set(readers()) - set(budget()))
    assert fresh == [], f"nimm `read_jsonl` aus chesslab.ioutil: {fresh}"


def test_eine_bekannte_stelle_waechst_nicht():
    seen = readers()
    for name, allowed in budget().items():
        assert seen.get(name, 0) <= allowed, name


def test_die_liste_traegt_keine_erledigte_zeile_mehr():
    seen = readers()
    stale = {n: b for n, b in budget().items() if seen.get(n, 0) < b}
    assert stale == {}, f"schreib die Zahl herunter — die Ratsche darf nur schrumpfen: {stale}"
