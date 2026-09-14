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

# Der Pool haelt wiederholte Strings zusammen, der Deckel haelt EINMALIGE draussen: `path` ist
# je Zeile verschieden und wuerde den Pool sonst mit 600k Eintraegen fuellen, die nie ein zweites
# Mal getroffen werden. 200 000 reichen fuer jedes kategorische Feld eines Manifests.
_STR_POOL_CAP = 200_000


def read_jsonl(path: Path) -> list[dict]:
    """Read JSONL file, missing file → [], skip empty lines.

    Streams line by line on purpose: reading the whole file into one string and then splitting it
    held ~3 extra copies of a multi-GB manifest in memory at once (whole text + list of lines +
    parsed dicts) and hit MemoryError on the million-crop synthetic manifests.

    Wiederholte Schluessel und Werte zeigen auf EIN Objekt: ein Manifest ist fast nur
    Wiederholung, und `real13-mix-v4` kostet so 0,51 statt 1,12 GB (gemessen 2026-08-29) —
    je LAUF, denn Prozesse teilen keine Python-Objekte, nur die Memmap des Packs.
    """
    p = Path(path)
    if not p.exists():
        return []
    pool: dict[str, str] = {}

    def pooled(pairs: list[tuple[str, object]]) -> dict:
        row = {}
        for key, value in pairs:
            key = pool.setdefault(key, key)
            if type(value) is str:
                seen = pool.get(value)
                if seen is not None:
                    value = seen
                elif len(pool) < _STR_POOL_CAP:
                    pool[value] = value
            row[key] = value
        return row

    # TextIO already yields Unicode. Calling the decoder directly avoids repeating the public
    # json.loads type/encoding dispatch for every line of large manifests.
    decode = json.JSONDecoder(object_pairs_hook=pooled).decode
    # TODO: Ignore only an invalid unterminated tail; a killed append must not poison prior rows.
    with p.open(encoding="utf-8") as fh:
        return [decode(line) for line in fh if line.strip()]
