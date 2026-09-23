"""`hand_audit._jsonl` duldet die halbe LETZTE Zeile wie `ioutil.read_jsonl`."""

from __future__ import annotations

import json

from conftest import load_script


def test_hand_audit_tolerates_the_half_last_line(tmp_path):
    hand_audit = load_script("hand_audit")
    path = tmp_path / "corrections.jsonl"
    path.write_text(json.dumps({"frame": "f1", "square": "e4"}) + "\n" + '{"frame": "f2", "squ',
                    encoding="utf-8")

    assert list(hand_audit._jsonl(path)) == [{"frame": "f1", "square": "e4"}]
