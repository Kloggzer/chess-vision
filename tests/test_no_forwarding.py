"""Ein Name wird beim Besitzer geholt, nicht bei einem Modul, das ihn nur selbst importiert.

Weitergereichte Namen (`x as x`, `__all__`, Aliase) liessen `training.occlusion` fuer die Zellregel
torch ziehen und hielten drei Namen fuer `PIECE_VISIBLE_MAX` am Leben.
"""
from __future__ import annotations

import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
# `chesslab.cli.app` ist der Einstieg (registriert erst beim Paket-Import).
ALLOWED = {("chesslab.cli", "app")}


def _module(path: Path) -> str:
    parts = path.relative_to(SRC).with_suffix("").parts
    return ".".join(parts[:-1] if parts[-1] == "__init__" else parts)


def _package(path: Path) -> list[str]:
    mod = _module(path).split(".")
    return mod if path.name == "__init__.py" else mod[:-1]


def _top_level(tree: ast.Module):
    for node in tree.body:
        yield from ([node, *ast.walk(node)] if isinstance(node, (ast.If, ast.Try)) else [node])


def _inventory() -> dict[str, tuple[set[str], set[str]]]:
    out = {}
    for path in (SRC / "chesslab").rglob("*.py"):
        defined, imported = set(), set()
        for node in _top_level(ast.parse(path.read_text(encoding="utf-8"))):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                defined.add(node.name)
            elif isinstance(node, (ast.Assign, ast.AnnAssign)):
                targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                defined |= {n.id for t in targets for n in ast.walk(t) if isinstance(n, ast.Name)}
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                imported |= {(a.asname or a.name).split(".")[0] for a in node.names}
        out[_module(path)] = (defined, imported - defined)
    return out


def _target(path: Path, node: ast.ImportFrom) -> str | None:
    if not node.level:
        return node.module
    if not path.is_relative_to(SRC):
        return None
    pkg = _package(path)
    base = pkg[:len(pkg) - node.level + 1]
    return ".".join(base + ([node.module] if node.module else []))


def _forwarded_fetches() -> list[str]:
    modules = _inventory()
    found = []
    for area in (SRC / "chesslab", ROOT / "scripts", ROOT / "tests"):
        for path in area.rglob("*.py"):
            rel = path.relative_to(ROOT).as_posix()
            if (rel, None) in ALLOWED or ".tmp" in rel:
                continue
            for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
                if not isinstance(node, ast.ImportFrom) or (mod := _target(path, node)) not in modules:
                    continue
                for alias in node.names:
                    if f"{mod}.{alias.name}" in modules or (mod, alias.name) in ALLOWED:
                        continue
                    if alias.name in modules[mod][1]:
                        found.append(f"{rel}:{node.lineno} {mod}.{alias.name}")
    return found


def test_names_are_fetched_from_their_owner():
    assert _forwarded_fetches() == []


def test_no_module_re_exports():
    reexports = []
    for path in (SRC / "chesslab").rglob("*.py"):
        for node in _top_level(ast.parse(path.read_text(encoding="utf-8"))):
            if isinstance(node, ast.ImportFrom) and any(a.asname == a.name for a in node.names):
                reexports.append(f"{path.relative_to(ROOT).as_posix()}:{node.lineno}")
            if isinstance(node, ast.Assign) and any(getattr(t, "id", "") == "__all__" for t in node.targets):
                reexports.append(f"{path.relative_to(ROOT).as_posix()}:{node.lineno} __all__")
    assert reexports == []
