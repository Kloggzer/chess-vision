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
    """Read JSONL file, missing file → [], skip empty lines.

    Streams line by line on purpose: reading the whole file into one string and then splitting it
    held ~3 extra copies of a multi-GB manifest in memory at once (whole text + list of lines +
    parsed dicts) and hit MemoryError on the million-crop synthetic manifests.
    """
    p = Path(path)
    if not p.exists():
        return []
    # TextIO already yields Unicode. Calling the decoder directly avoids repeating the public
    # json.loads type/encoding dispatch for every line of large manifests.
    decode = json.JSONDecoder().decode
    with p.open(encoding="utf-8") as fh:
        return [decode(line) for line in fh if line.strip()]
