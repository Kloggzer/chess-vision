"""Ein Brett, das der Schueler nicht lesen konnte, FEHLT in `gate.jsonl` — richtig so.

Der Bericht muss es aber sagen. Ohne die Zahl liest sich ein halber Lauf wie ein ganzer, und
`docs/sensor-audit.md` vergleicht genau diese Zeilenzahlen gegen die Matte.
"""

from __future__ import annotations

import json

import numpy as np
import yaml

from chesslab import config


def _session(paths: config.Paths, boards: list[str], written: list[str]):
    import cv2

    rec = paths.recordings / "r1"
    (rec / "boards").mkdir(parents=True)
    (rec / "session.yaml").write_text(yaml.safe_dump({"session_id": "rg-r1", "profile": "p"}),
                                      encoding="utf-8")
    (rec / "log.jsonl").write_text("".join(
        json.dumps({"frame": f"frames/{b}.png", "board": f"boards/{b}.webp", "ply": 1}) + "\n"
        for b in boards), encoding="utf-8")
    for b in written:
        cv2.imwrite(str(rec / "boards" / f"{b}.webp"), np.full((80, 80, 3), 120, np.uint8))
    return rec


def test_the_report_names_the_boards_it_could_not_read(tmp_path, monkeypatch) -> None:
    from chesslab import hand_gate

    paths = config.Paths(root=tmp_path / "data")
    monkeypatch.setattr(config, "DATA", paths)
    _session(paths, ["000001", "000002"], ["000001"])

    monkeypatch.setattr(hand_gate, "load_gate",
                        lambda tag="": (None, {"size": 64, "perfect_recall": {"thr": 0.5}}, "cpu"))
    monkeypatch.setattr(hand_gate, "_forward",
                        lambda model, device, images, batch: [[0.9] + [0.0] * 64 for _ in images])

    res = hand_gate.gate_scan("r1")

    assert res["frames"] == 1, "nur das lesbare Brett steht in der Datei"
    assert res["unreadable"] == 1, "und der Bericht sagt, dass eines fehlt"
