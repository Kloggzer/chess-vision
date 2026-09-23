"""`audit_corrections` findet die Ledger unter `paths.recordings` mit `rg-`-Schluesseln."""
from __future__ import annotations

import json
from dataclasses import replace

from chesslab import config
from chesslab.label_audit import audit_corrections

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def _recording(root, name):
    d = root / "recordings" / name
    d.mkdir(parents=True)
    (d / "log.jsonl").write_text(
        json.dumps({"frame": "000100.png", "ply": 4, "fen": START}) + "\n", encoding="utf-8")
    (d / "corrections.jsonl").write_text(
        json.dumps({"session_id": f"rg-{name}", "frame": "000100", "square": "d8",
                    "label": "bK", "ts": "2026-09-01T00:00:00+00:00"}) + "\n", encoding="utf-8")
    return d


def test_the_rule_audit_sees_a_second_king_in_a_recording(tmp_path):
    """Genau der Fund vom 2026-08-16 (zwei schwarze Koenige), nur in `recordings/` statt
    `sessions/` — wo jede der 47 Aufnahmen heute liegt."""
    _recording(tmp_path, "2026-09-01-10-00-00")
    paths = replace(config.Paths(), root=tmp_path)

    report = audit_corrections(paths)

    assert report["frames"] == 1, (
        f"der Audit prueft {report['corrections_total']} Korrekturzeilen und findet "
        f"{report['frames']} Regelbrueche — er laeuft ueber `sessions/`, wo nichts mehr liegt")
    assert report["rows"][0]["violations"] == ["TOO_MANY_KINGS"]
