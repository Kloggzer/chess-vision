"""Zwei Berichte, die UNGEMESSENES als gemessen ausliefern — dieselbe Wurzel wie Punkt 28.

`frame_hands` sagt im Kopf ausdruecklich, nur fuer die Aufnahmen in `_sessions` heisse eine
fehlende Zeile "keine Hand". Je FRAME gilt das nicht: ein exportierter Frame ohne Scan-Zeile
faellt still weg und liest sich danach handfrei. `audit_flags --visible` verspricht dasselbe
und bricht es fuer jede Aufnahme ohne Matte: `covered_cells` ist dort leer, also gilt jede
Zelle als sichtbar gemessen.
"""
from __future__ import annotations

import json

import pytest
import yaml

from chesslab import audit_flags as af
from chesslab import config, frame_hands
from chesslab.ioutil import write_rows


def _recording(root, name: str, *, log: list[dict], scan=None, reads=None, matte=None):
    d = root / "recordings" / name
    d.mkdir(parents=True, exist_ok=True)
    (d / "session.yaml").write_text(yaml.safe_dump({"session_id": f"rg-{name}"}), encoding="utf-8")
    write_rows(d / "log.jsonl", log)
    if scan is not None:
        write_rows(d / "scan.jsonl", scan)
    if reads is not None:
        write_rows(d / "model-reads.jsonl", reads)
    if matte is not None:
        write_rows(d / "matte.jsonl", matte)
    return d


@pytest.fixture
def data_root(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    (config.DATA.reports).mkdir(parents=True, exist_ok=True)
    return config.DATA.root


def test_a_frame_without_a_scan_row_is_not_hand_free(data_root):
    """`--no-scan`/`spread_indices` exportiert Indizes, die der Scan (jeder 3.) nie gesehen hat.
    Die verschwinden aus dem Bericht, und die Aufnahme steht trotzdem unter den gemessenen."""
    _recording(data_root, "20-19", log=[{"frame": "frames/000000.png"},
                                        {"frame": "frames/000004.png"}],
               scan=[{"idx": 0, "gate": 0.9}, {"idx": 3, "gate": 0.9}])
    r = frame_hands.frame_hands()
    assert r["frames"] == 1
    # 000004 wurde NIE gemessen — der Bericht muss das sagen, sonst liest die Lane es als frei.
    assert r["unscanned_frames"] == {"20-19": 1}
    head = json.loads((config.DATA.reports / frame_hands.FLAGS_FILE).read_text(
        encoding="utf-8").splitlines()[0])
    assert head["_unscanned"] == {"20-19": 1}


def test_visible_scope_names_the_recordings_without_a_matte(data_root):
    """Ohne `matte.jsonl` ist `covered_cells` leer: jede Zelle ginge als sichtbar GEMESSEN durch."""
    cell = {"session_id": "rg-20-19", "frame": "000000", "bright": 120.0}
    reads = [{"_model": "runs/m", "_classes": ["empty", "wP"]},
             {**cell, "square": "a1", "fen_label": "empty", "probs": {"wP": 0.99, "empty": 0.01}},
             {**cell, "square": "a2", "fen_label": "wP", "probs": {"wP": 0.99, "empty": 0.01}}]
    _recording(data_root, "20-19", log=[{"frame": "frames/000000.png"}], reads=reads)
    r = af.audit_flags(visible_only=True)
    assert r["flags"] == 1
    assert r["coverage_scope"] == "visible"
    # Die Aufnahme hat keine Messung — der Bericht darf nicht so tun, als habe er gefiltert.
    assert r["without_matte"] == ["rg-20-19"]
