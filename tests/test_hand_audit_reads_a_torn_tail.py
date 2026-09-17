"""ROT (Review 2026-09-17): `hand_audit._jsonl` schneidet selbst und wirft auf die halbe LETZTE
Zeile, die `chesslab.ioutil.read_jsonl` ausdruecklich duldet.

`corrections.jsonl` und `reviewed.jsonl` werden angehaengt; ein abgebrochener Schreiber laesst
genau diesen Schwanz zurueck. Der Auditor stirbt dann, statt das eine Urteil zu lesen, das da
ist. Die Leser-Ratsche sieht die Stelle nicht: sie sucht nur `.splitlines()`.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load(name: str):
    spec = importlib.util.spec_from_file_location(f"_review_{name}", ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_hand_audit_tolerates_the_half_last_line(tmp_path):
    hand_audit = _load("hand_audit")
    path = tmp_path / "corrections.jsonl"
    path.write_text(json.dumps({"frame": "f1", "square": "e4"}) + "\n" + '{"frame": "f2", "squ',
                    encoding="utf-8")

    assert list(hand_audit._jsonl(path)) == [{"frame": "f1", "square": "e4"}]
