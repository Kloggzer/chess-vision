"""`hand_audit` liest die Urteile ueber `judged` und duldet die halbe LETZTE Zeile wie `ioutil.read_jsonl`."""

from __future__ import annotations

import json

from conftest import load_script


def test_hand_audit_tolerates_the_half_last_line(tmp_path):
    hand_audit = load_script("hand_audit")
    (tmp_path / "reviewed.jsonl").write_text("", encoding="utf-8")
    (tmp_path / "corrections.jsonl").write_text(
        json.dumps({"frame": "f1", "square": "e4"}) + "\n" + '{"frame": "f2", "squ', encoding="utf-8")

    assert hand_audit.judged(tmp_path) == {("f1", "e4")}
