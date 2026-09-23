"""Die Schnittregeln aus `docs/python-architektur.md`, und was beim Umzug ohne Test dastand."""

from __future__ import annotations

import ast
from pathlib import Path

from chesslab.realgames import progress

SRC = Path(__file__).resolve().parents[1] / "src" / "chesslab"


def _imports(path: Path) -> set[str]:
    """Jedes importierte Modul der Datei, absolut aufgeloest — auch die lazy Importe."""
    pkg = ".".join(path.relative_to(SRC.parent).with_suffix("").parts[:-1])
    out = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            out |= {a.name for a in node.names}
        elif isinstance(node, ast.ImportFrom):
            base = pkg.split(".")[: len(pkg.split(".")) - node.level + 1] if node.level else []
            mod = ".".join([*base, node.module] if node.module else base)
            out |= {mod} | {f"{mod}.{a.name}" for a in node.names}
    return out


def test_the_store_imports_neither_realgames_nor_the_session_verbs():
    banned = ("chesslab.realgames", "chesslab.sessions", "chesslab.session_lifecycle",
              "chesslab.session_boards")
    hits = {p.name: sorted(m for m in _imports(p) if m.startswith(banned))
            for p in sorted((SRC / "session_store").glob("*.py"))}
    assert {k: v for k, v in hits.items() if v} == {}, "session_store liegt UNTER den Verben"


def test_package_inits_carry_no_reexport():
    for pkg in ("session_store", "realgames"):
        tree = ast.parse((SRC / pkg / "__init__.py").read_text(encoding="utf-8"))
        assert [type(n).__name__ for n in tree.body] == ["Expr"], f"{pkg}/__init__.py: nur Docstring"


def test_a_serial_run_prints_every_hundredth_frame(capsys):
    for done in range(1, 2 * progress.PROGRESS_EVERY + 1):
        progress.say_progress(None, done, f"line {done}")
    assert capsys.readouterr().out.split() == ["line", "100", "line", "200"]


def test_a_worker_only_counts_and_never_prints(capsys):
    counted = []
    for done in range(1, 3 * progress.WORKER_PROGRESS_EVERY + 1):
        progress.say_progress(counted.append, done, "never")
    assert counted == [progress.WORKER_PROGRESS_EVERY] * 3
    assert capsys.readouterr().out == ""
