"""Wer eine `.jsonl` selbst in Zeilen schneidet, beantwortet drei Fragen neu.

Die Leerzeile, die halbe LETZTE Zeile (ein Schreiber laeuft noch) und die kaputte Zeile
MITTENDRIN (Beschaedigung, muss laut sein). `chesslab.ioutil.read_jsonl` ist die eine Antwort;
diese Liste sind die Stellen davor und darf nur SCHRUMPFEN. Der Zwilling der Web-App steht in
`platform/app/lib/jsonl-ratchet.test.ts`.
"""
from __future__ import annotations

import ast
import re
from itertools import chain
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AREAS = (ROOT / "src" / "chesslab", ROOT / "scripts")
LEDGER = Path(__file__).with_name("jsonl_readers.txt")

_CUT = re.compile(r"\.splitlines\(\)|\.split\(chr\(10\)\)")

# Nur Formgeber der ZEILE. `p.read_text()` gehoert bewusst nicht dazu: eine Glob-Schleife, die je
# Pfad eine ganze Datei liest, schneidet nichts und faellt sonst als Fehltreffer in die Ratsche.
_SHAPERS = frozenset({"strip", "rstrip", "lstrip", "decode"})


def _loads_arg(node: ast.AST) -> str | None:
    """Der Name, den `json.loads(...)` bekommt — durch `.strip()` und Freunde hindurch."""
    if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)):
        return None
    if node.func.attr != "loads" or not node.args:
        return None
    arg = node.args[0]
    while isinstance(arg, ast.Call) and isinstance(arg.func, ast.Attribute) and arg.func.attr in _SHAPERS:
        arg = arg.func.value
    return arg.id if isinstance(arg, ast.Name) else None


def _iterated_lines(text: str) -> int:
    """`for line in fh:` mit `json.loads(line)` darin.

    Dieselbe Politik-Erfindung wie `splitlines()`, nur unsichtbar fuer eine Textsuche — die
    Ratsche uebersah so drei handkopierte Nachbauten von `read_jsonl`. Ueber den Syntaxbaum,
    weil `json.loads(p.read_text())` in einer Glob-Schleife KEIN Zeilenschnitt ist.
    """
    hits = 0
    for node in ast.walk(ast.parse(text)):
        if not isinstance(node, (ast.For, ast.AsyncFor)) or not isinstance(node.target, ast.Name):
            continue
        var = node.target.id
        if any(_loads_arg(inner) == var for inner in ast.walk(node)):
            hits += 1
    return hits


def readers() -> dict[str, int]:
    """Zeilenschnitt UND `json.loads` in derselben Datei — das ist die Form, die die Politik neu erfindet."""
    found: dict[str, int] = {}
    for file in sorted(chain.from_iterable(a.rglob("*.py") for a in AREAS)):
        if file.name == "ioutil.py":
            continue
        text = file.read_text(encoding="utf-8")
        if "json.loads(" not in text:
            continue
        hits = sum(1 for line in text.splitlines() if _CUT.search(line))
        hits += _iterated_lines(text)
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
