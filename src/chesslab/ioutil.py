"""A single JSONL reader for all consumers in the project.

``read_jsonl(path) -> list[dict]`` is the canonical counterpart to the scattered
``[json.loads(l) for l in ...splitlines() if l.strip()]`` loops in labeling.py,
dataset.py, training/data.py and web/app.py. Semantics: missing file → [], empty
lines are skipped, every non-empty line must be valid JSON.

Consumers that need to throw an exception on a missing file (e.g.
``dataset.load_manifest``) retain a thin wrapper.
"""

from __future__ import annotations

import json
from pathlib import Path


def read_jsonl(path: Path) -> list[dict]:
    """Read JSONL file, missing file → [], skip empty lines."""
    p = Path(path)
    if not p.exists():
        return []
    return [json.loads(line) for line in p.read_text(encoding="utf-8").splitlines() if line.strip()]
