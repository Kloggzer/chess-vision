"""Wer eine `.json`/`.jsonl` selbst schreibt, beantwortet den Abbruch mitten im Schreiben neu.

`chesslab.ioutil` ist die eine Antwort — Nebendatei, dann umhaengen, und bei einem zweiten
Schreiber `Contested` statt stiller Ueberschreibung. Diese Liste sind die Stellen davor und darf
nur SCHRUMPFEN. Hinter jedem Pfad steht, WARUM die Stelle bleibt; ohne Grund gehoert sie umgestellt.
"""
from __future__ import annotations

import ast
import re
from itertools import chain
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AREAS = (ROOT / "src" / "chesslab", ROOT / "scripts")
LEDGER = Path(__file__).with_name("json_doors.txt")
CUSTODIAN = "ioutil.py"

# Die drei Schreibweisen, in denen dieses Projekt eine Datei ANLEGT. Das ANHAENGEN sieht diese
# Zeile nicht — es steht unten im Syntaxbaum, weil es in vier Schreibweisen vorkommt.
_WRITE = re.compile(r"""\.write_text\(|\.open\(\s*["']w["']|open\(\s*[^,]+,\s*["']w["']""")
_JSON = re.compile(r"""json\.dumps?\(|\.jsonl?["']""")
# Ein Bericht, den nur ein Mensch liest, ist keine Datei, um die sich zwei Prozesse streiten.
_NOT_JSON = re.compile(r"""\.(yaml|yml|txt|obj|mtl|src|log|csv)["']|yaml\.safe_dump""")


# `open(datei, modus)` gegen `Path.open(modus)`: dieselbe Schreibweise, anderer Platz des Modus.
_OPEN_MODULES = frozenset({"io", "os", "codecs", "gzip", "bz2", "lzma"})


def _string_consts(tree: ast.AST) -> dict[str, set[str]]:
    """Was ein Name an Zeichenketten zugewiesen bekommt — `mode = "a"` ist ein Modus."""
    out: dict[str, set[str]] = {}
    for node in ast.walk(tree):
        if not isinstance(node, (ast.Assign, ast.AnnAssign)):
            continue
        value = node.value
        if not (isinstance(value, ast.Constant) and isinstance(value.value, str)):
            continue
        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
        for target in targets:
            if isinstance(target, ast.Name):
                out.setdefault(target.id, set()).add(value.value)
    return out


def _mode_arg(call: ast.Call) -> ast.AST | None:
    for kw in call.keywords:
        if kw.arg == "mode":
            return kw.value
    attr = isinstance(call.func, ast.Attribute)
    module = attr and isinstance(call.func.value, ast.Name) and call.func.value.id in _OPEN_MODULES
    idx = 0 if attr and not module else 1
    return call.args[idx] if len(call.args) > idx else None


def _is_append(mode: ast.AST | None, consts: dict[str, set[str]]) -> bool:
    """Jede Zeichenkette IM Modus-Ausdruck zaehlt — Literal, Name, f-String, zusammengesetzt."""
    if mode is None:
        return False
    seen: set[str] = set()
    for node in ast.walk(mode):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            seen.add(node.value)
        elif isinstance(node, ast.Name):
            seen |= consts.get(node.id, set())
    return any("a" in s for s in seen)


def append_lines(text: str) -> set[int]:
    """Die Zeilen, in denen eine Datei zum ANHAENGEN geoeffnet wird (1-basiert).

    Ueber den Syntaxbaum, weil die FORM zaehlt: `open(p, "a")`, `p.open("a")`, `io.open(p, mode)`
    und ein gebautes Argument sind dieselbe Entscheidung. Rohes Anhaengen klebt die neue Zeile an
    eine halbe letzte — `ioutil.append_rows` schneidet den Schwanz vorher ab.
    """
    tree = ast.parse(text)
    consts = _string_consts(tree)
    return {
        node.lineno
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and ((isinstance(node.func, ast.Name) and node.func.id == "open")
             or (isinstance(node.func, ast.Attribute) and node.func.attr == "open"))
        and _is_append(_mode_arg(node), consts)
    }


def doors_in(text: str) -> int:
    """Schreibaufruf UND JSON in derselben Sichtweite — die Form, die die Politik neu erfindet.

    Eigene Funktion, damit `tests/test_ratchet_counterchecks.py` einen Verstoss EINPFLANZEN kann:
    eine Ratsche ohne Gegenprobe ist eine Behauptung.
    """
    lines = text.splitlines()
    appends = append_lines(text)
    return sum(
        1
        for i, line in enumerate(lines)
        if (_WRITE.search(line) or i + 1 in appends)
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
