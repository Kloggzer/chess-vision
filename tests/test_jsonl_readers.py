"""Wer `.jsonl` selbst in Zeilen schneidet statt `ioutil.read_jsonl`; die Liste schrumpft nur."""
from __future__ import annotations

import ast
from itertools import chain
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AREAS = (ROOT / "src" / "chesslab", ROOT / "scripts")
LEDGER = Path(__file__).with_name("jsonl_readers.txt")

# Nur Formgeber der ZEILE. `p.read_text()` gehoert bewusst nicht dazu: eine Glob-Schleife, die je
# Pfad eine ganze Datei liest, schneidet nichts und faellt sonst als Fehltreffer in die Ratsche.
_SHAPERS = frozenset({"strip", "rstrip", "lstrip", "decode"})
_NEWLINES = frozenset({"\n", "\r\n"})
_COMPS = (ast.ListComp, ast.SetComp, ast.GeneratorExp, ast.DictComp)


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


def _bound(target: ast.AST) -> set[str]:
    """Die Namen, die EIN Schleifenkopf bindet — `line`, aber auch `i, line`."""
    if isinstance(target, ast.Name):
        return {target.id}
    if isinstance(target, (ast.Tuple, ast.List)):
        return {n for e in target.elts for n in _bound(e)}
    return set()


_FUNCS = (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)


def _own(scope: ast.AST) -> list[ast.AST]:
    """Die Knoten EINES Scopes — ohne die inneren Funktionen, die ihre eigenen Namen binden."""
    out, todo = [], list(ast.iter_child_nodes(scope))
    while todo:
        node = todo.pop()
        out.append(node)
        if not isinstance(node, _FUNCS):
            todo.extend(ast.iter_child_nodes(node))
    return out


def _loops(nodes):
    """`(schleife, gebundene Namen, Quellen)` fuer jede Schleife und Comprehension."""
    for node in nodes:
        if isinstance(node, (ast.For, ast.AsyncFor)):
            yield node, _bound(node.target), [node.iter]
        elif isinstance(node, _COMPS):
            yield (node, {n for g in node.generators for n in _bound(g.target)},
                   [g.iter for g in node.generators])


def _loads_loop(loop: ast.AST, bound: set[str]) -> bool:
    return bool(bound) and any(_loads_arg(inner) in bound for inner in ast.walk(loop))


def _iterated_lines(text: str) -> int:
    """`for line in fh:` mit `json.loads(line)` darin — Schleife WIE Comprehension, auch mit
    `enumerate`. Ueber den Syntaxbaum, weil `json.loads(p.read_text())` in einer Glob-Schleife
    KEIN Schnitt ist.
    """
    return sum(1 for loop, bound, _ in _loops(ast.walk(ast.parse(text))) if _loads_loop(loop, bound))


def _is_open(node: ast.AST) -> bool:
    return isinstance(node, ast.Call) and (
        (isinstance(node.func, ast.Name) and node.func.id == "open")
        or (isinstance(node.func, ast.Attribute) and node.func.attr == "open"))


def _cut_source(node: ast.AST, handles: frozenset[str] = frozenset()) -> ast.AST | None:
    """Liefert `node` Zeilen einer Datei, dann den Ausdruck, aus dem sie kommen — sonst None.

    Die FORM zaehlt: `.splitlines()`, `.split("\\n")`, `.readlines()`, ein offenes Handle (auch
    hinter `enumerate`). `session_lifecycle.deletion_cost` schnitt so ein Manifest ohne
    `json.loads`, und die alte Textsuche sah es deshalb nie.
    """
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "enumerate":
        return _cut_source(node.args[0], handles) if node.args else None
    if isinstance(node, ast.Subscript):
        return _cut_source(node.value, handles)
    if _is_open(node) or (isinstance(node, ast.Name) and node.id in handles):
        return node
    if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)):
        return None
    attr, arg = node.func.attr, node.args[0] if node.args else None
    if attr in ("splitlines", "readlines"):
        return node.func.value
    if attr == "split" and ((isinstance(arg, ast.Constant) and arg.value in _NEWLINES) or (
            isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name) and arg.func.id == "chr")):
        return node.func.value
    return None


def _json_probe(loop: ast.AST, bound: set[str]) -> bool:
    """`'"session_id": "x"' in line` — ein JSON-Schluessel wird im rohen Zeilentext gesucht."""
    for node in ast.walk(loop):
        if not (isinstance(node, ast.Compare) and isinstance(node.ops[0], ast.In)):
            continue
        right = node.comparators[0]
        if not (isinstance(right, ast.Name) and right.id in bound):
            continue
        if any(isinstance(c, ast.Constant) and isinstance(c.value, str) and '":' in c.value
               for c in ast.walk(node.left)):
            return True
    return False


def _names_jsonl(expr: ast.AST, jsonl_names: set[str]) -> bool:
    """Zeigt der Ausdruck auf eine `.jsonl` — woertlich oder ueber einen so gebundenen Namen?"""
    for node in ast.walk(expr):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and ".jsonl" in node.value:
            return True
        if isinstance(node, ast.Name) and (node.id in jsonl_names or "jsonl" in node.id.lower()):
            return True
        if isinstance(node, ast.Attribute) and "jsonl" in node.attr.lower():
            return True
    return False


def _jsonl_names(nodes: list[ast.AST]) -> set[str]:
    """Namen, die an einen `.jsonl`-Pfad oder ein darauf geoeffnetes Handle gebunden werden."""
    names: set[str] = set()
    for _ in range(3):  # `p = d / "x.jsonl"`, dann `with p.open() as fh` — Ketten aufloesen
        for node in nodes:
            if isinstance(node, ast.Assign) and _names_jsonl(node.value, names):
                names |= {n for t in node.targets for n in _bound(t)}
            elif isinstance(node, (ast.With, ast.AsyncWith)):
                for item in node.items:
                    if item.optional_vars is not None and _names_jsonl(item.context_expr, names):
                        names |= _bound(item.optional_vars)
    return names


def _fed_to_loads(cut: ast.Call, nodes: list[ast.AST]) -> bool:
    """`json.loads(t.splitlines()[0])` oder `map(json.loads, t.splitlines())`."""
    for node in nodes:
        if not isinstance(node, ast.Call):
            continue
        func, args = node.func, node.args
        if isinstance(func, ast.Attribute) and func.attr == "loads":
            if any(n is cut for a in args for n in ast.walk(a)):
                return True
        elif (isinstance(func, ast.Name) and func.id == "map" and len(args) == 2
              and isinstance(args[0], ast.Attribute) and args[0].attr == "loads"
              and any(n is cut for n in ast.walk(args[1]))):
            return True
    return False


def readers_in(text: str) -> int:
    """Die Stellen, die eine `.jsonl` selbst in Zeilen schneiden — ueber den Syntaxbaum, je Scope.

    Ein Schnitt zaehlt, wenn er JSONL-Zeilen liefert: `json.loads` auf der Zeile, ein
    JSON-Schluessel im rohen Zeilentext, oder ein Pfad, der `.jsonl` nennt. Eine `.log`- oder
    `/proc/meminfo`-Zeile zaehlt nicht. Gegenproben: `tests/test_ratchet_counterchecks.py`.
    """
    tree = ast.parse(text)
    return sum(_readers_in_scope(_own(s)) for s in ast.walk(tree) if s is tree or isinstance(s, _FUNCS))


def _handles(nodes: list[ast.AST]) -> frozenset[str]:
    """Namen offener Dateien: `with p.open() as fh`, `fh = open(p)`."""
    out: set[str] = set()
    for node in nodes:
        if isinstance(node, (ast.With, ast.AsyncWith)):
            out |= {n for i in node.items if _is_open(i.context_expr) and i.optional_vars is not None
                    for n in _bound(i.optional_vars)}
        elif isinstance(node, ast.Assign) and _is_open(node.value):
            out |= {n for t in node.targets for n in _bound(t)}
    return frozenset(out)


def _readers_in_scope(nodes: list[ast.AST]) -> int:
    jsonl, handles = _jsonl_names(nodes), _handles(nodes)
    hits = 0
    consumed: set[int] = set()
    for loop, bound, sources in _loops(nodes):
        cuts = [c for c in (_cut_source(s, handles) for s in sources) if c is not None]
        if not (_loads_loop(loop, bound) or (cuts and (
                _json_probe(loop, bound) or any(_names_jsonl(c, jsonl) for c in cuts)))):
            continue
        hits += 1
        consumed |= {id(n) for s in sources for n in ast.walk(s)}
    for node in nodes:
        if id(node) in consumed or not isinstance(node, ast.Call) or _is_open(node):
            continue
        src = _cut_source(node)
        if src is not None and isinstance(node.func, ast.Attribute) and (
                _names_jsonl(src, jsonl) or _fed_to_loads(node, nodes)):
            hits += 1
    return hits


def readers() -> dict[str, int]:
    found: dict[str, int] = {}
    for file in sorted(chain.from_iterable(a.rglob("*.py") for a in AREAS)):
        if file.name == "ioutil.py":
            continue
        hits = readers_in(file.read_text(encoding="utf-8"))
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
