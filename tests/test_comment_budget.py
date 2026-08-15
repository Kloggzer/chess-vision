"""The Python twin of android's CommentBudgetTest: comment/docstring blocks over LIMIT lines
fail unless listed in tests/comment_budget.txt, and a listed value may only shrink."""

import ast
from pathlib import Path

LIMIT = 5
ROOT = Path(__file__).resolve().parents[1]
BUDGET_FILE = Path(__file__).with_name("comment_budget.txt")
SCAN = ROOT / "src" / "chesslab"


def hash_runs(text: str) -> int:
    worst = run = 0
    for raw in text.splitlines():
        if raw.strip().startswith("#"):
            run += 1
            worst = max(worst, run)
        else:
            run = 0
    return worst


def docstring_blocks(text: str) -> int:
    worst = 0
    tree = ast.parse(text)
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if not (node.body and isinstance(node.body[0], ast.Expr)):
                continue
            expr = node.body[0].value
            if isinstance(expr, ast.Constant) and isinstance(expr.value, str):
                worst = max(worst, expr.end_lineno - expr.lineno + 1)
    return worst


def budget() -> dict[str, int]:
    if not BUDGET_FILE.is_file():
        return {}
    pairs = (line.split() for line in BUDGET_FILE.read_text(encoding="utf-8-sig").splitlines() if line.strip())
    return {file: int(n) for file, n in pairs}


def test_comment_blocks_stay_inside_the_shrinking_budget():
    allowed = budget()
    seen, over = set(), []
    for path in sorted(SCAN.rglob("*.py")):
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding="utf-8")
        worst = max(hash_runs(text), docstring_blocks(text))
        cap = allowed.get(rel)
        if cap is not None:
            seen.add(rel)
            if worst > cap:
                over.append(f"{rel}: block of {worst} lines, budget says {cap} — shrink the comment")
            if worst < cap:
                over.append(f"{rel}: worst block is {worst}, budget says {cap} — lower the budget line")
        elif worst > LIMIT:
            over.append(f"{rel}: block of {worst} lines, limit is {LIMIT} — cut it or say why in <= {LIMIT}")
    over += [f"{file}: budgeted but gone — remove its budget line" for file in allowed if file not in seen]
    assert not over, "\n" + "\n".join(over)
