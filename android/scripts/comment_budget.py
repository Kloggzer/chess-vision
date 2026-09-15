"""Regenerate config/comment-budget.txt from the current tree.

The budget is a RATCHET, not a config: CommentBudgetTest fails both when a file gains blocks
and when a listed count is now too generous. So this script is what you run after cleaning a
file up -- the diff then shows the debt going down, which is the only direction it may move.

    uv run python android/scripts/comment_budget.py
"""

from __future__ import annotations

import sys
from pathlib import Path

LIMIT = 5  # consecutive comment lines; keep in sync with CommentBudgetTest.LIMIT
ROOT = Path(__file__).resolve().parent.parent
SKIP = {"build", "bin", "third_party", ".gradle"}


def blocks(path: Path) -> int:
    """Runs of >= LIMIT consecutive comment lines. `//`, `/*` and KDoc continuations all count."""
    found = run = 0
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.lstrip().startswith(("//", "*", "/*")):
            run += 1
        else:
            found += run >= LIMIT
            run = 0
    return found + (run >= LIMIT)


def sources() -> list[Path]:
    return sorted(
        p
        for p in ROOT.rglob("*.kt")
        if not SKIP & set(p.relative_to(ROOT).parts) and "src" in p.parts
    )


def main() -> int:
    rows = [(p.relative_to(ROOT).as_posix(), n) for p in sources() if (n := blocks(p))]
    body = "".join(f"{path} {n}\n" for path, n in rows)
    out = ROOT / "config" / "comment-budget.txt"
    header = (
        f"# Comment blocks of >= {LIMIT} lines, per file. Enforced by CommentBudgetTest.\n"
        "# Regenerate with: uv run python android/scripts/comment_budget.py\n"
        "# This list may only ever shrink. Unlisted files must have none.\n"
    )
    out.write_text(header + body, encoding="utf-8")
    print(f"{len(rows)} files, {sum(n for _, n in rows)} blocks -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
