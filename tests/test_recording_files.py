"""Jede Datei einer Aufnahme hat EINEN Besitzer: `session_store/` — Zwilling von `lib/recording-files.test.ts`.

Wer den Namen selbst schreibt, baut sich eine zweite Tuer an den Schutzregeln des Stores vorbei.
Ueber den Syntaxbaum: Docstrings, Kommentare und Meldungstext (mit Leerzeichen) zaehlen nicht.
"""
from __future__ import annotations

import ast
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src" / "chesslab"
OWNER = SRC / "session_store"

FILES = frozenset({"log.jsonl", "matte.jsonl", "candidate.json", "reference.pgn", "session.yaml",
                   "model-reads.jsonl", "unusable-cells.jsonl", "corrections.jsonl",
                   "reviewed.jsonl", "interval-check.jsonl"})
DIRS = frozenset({"boards", "dirty", "mattes"})


def _prose(tree: ast.AST) -> set[int]:
    """Docstrings und andere Ausdrucks-Anweisungen aus nur einem String — Text, kein Pfad."""
    return {id(n.value) for n in ast.walk(tree)
            if isinstance(n, ast.Expr) and isinstance(n.value, ast.Constant)}


def _path_use(node: ast.Constant, parent: ast.AST | None) -> bool:
    """`sdir / "boards"`, `Path(..., "mattes")`, `p.parent.name == "boards"` — der Ordner als Pfad.

    Als Schluessel (`row["dirty"]`, `{"boards": n}`) oder CLI-Wert ist das Wort kein Pfad.
    """
    if isinstance(parent, ast.BinOp) and isinstance(parent.op, ast.Div):
        return True
    if isinstance(parent, ast.Call) and node in parent.args:
        f = parent.func
        return (isinstance(f, ast.Name) and f.id == "Path") or (
            isinstance(f, ast.Attribute) and f.attr in ("joinpath", "join"))
    if isinstance(parent, ast.Compare):
        return any(isinstance(side, ast.Attribute) and side.attr == "name"
                   for side in (parent.left, *parent.comparators))
    return False


def named_in(text: str) -> list[str]:
    """Die Aufnahme-Namen, die `text` als Pfad-Literal traegt."""
    tree = ast.parse(text)
    prose = _prose(tree)
    parents = {id(c): n for n in ast.walk(tree) for c in ast.iter_child_nodes(n)}
    out = []
    for node in ast.walk(tree):
        if not (isinstance(node, ast.Constant) and isinstance(node.value, str)) or id(node) in prose:
            continue
        value = node.value
        if any(ch.isspace() for ch in value):
            continue
        parts = value.replace("\\", "/").split("/")
        out += [p for p in parts if p in FILES]
        out += [f"{p}/" for p in parts[:-1] if p in DIRS]
        if value in DIRS and _path_use(node, parents.get(id(node))):
            out.append(f"{value}/")
    return out


def test_nur_session_store_nennt_die_dateien_einer_aufnahme():
    offences = []
    for file in sorted(SRC.rglob("*.py")):
        if OWNER in file.parents:
            continue
        rel = file.relative_to(SRC).as_posix()
        offences += [f"{rel}: {name}" for name in named_in(file.read_text(encoding="utf-8"))]
    assert offences == [], "hol den Namen aus chesslab.session_store.names (oder eine Store-Funktion)"


def test_gegenprobe_der_erkenner_sieht_pfad_glob_und_fstring():
    assert named_in('p = sdir / "log.jsonl"\n') == ["log.jsonl"]
    assert named_in('ps = root.glob("*/matte.jsonl")\n') == ["matte.jsonl"]
    assert named_in("rel = f'boards/{stem}.webp'\n") == ["boards/"]
    assert named_in('known = {"session.yaml", "candidate.json"}\n') == ["session.yaml", "candidate.json"]
    assert named_in('d = session_dir / "mattes"\n') == ["mattes/"]
    assert named_in('ok = Path(r["board"]).parent.name == "boards"\n') == ["boards/"]


def test_gegenprobe_text_und_schluessel_zaehlen_nicht():
    assert named_in('def f():\n    """liest `log.jsonl`"""\n') == []
    assert named_in("# sdir / 'log.jsonl'\nx = 1\n") == []
    assert named_in('raise FileNotFoundError("Session has no log.jsonl.")\n') == []
    assert named_in('if row.get("dirty"):\n    row["dirty"] = True\n') == []
    assert named_in('out = {"boards": 3, "mattes": 0}\n') == []
    assert named_in('name = "log.jsonl.bak"\n') == []
