"""`packed_meta.json` hat EINEN Schreiber."""

from __future__ import annotations

import json

from chesslab.training.pack import write_packed_meta
from chesslab.training.packs import write_meta

ROWS = [{"path": "mm://p/1/a1", "label": "empty"}, {"path": "mm://p/1/b1", "label": "wP"}]


def _geschrieben(tmp_path, **kwargs) -> dict:
    write_packed_meta(tmp_path / "packed_meta.json", ROWS, 8, 8, **kwargs)
    return json.loads((tmp_path / "packed_meta.json").read_text(encoding="utf-8"))


def test_ohne_fingerabdruck_fehlt_der_schluessel(tmp_path):
    # None heisst NICHT GERECHNET — der Leser faellt dann bewusst auf die Mtime zurueck.
    assert "crop_fingerprint" not in _geschrieben(tmp_path)


def test_ein_leerer_fingerabdruck_steht_drin(tmp_path):
    # {} heisst GERECHNET und nichts zu vergleichen. Weglassen waere der andere Fall.
    assert _geschrieben(tmp_path, crop_fingerprint={})["crop_fingerprint"] == {}


def test_started_at_nur_wenn_gesetzt(tmp_path):
    assert "started_at" not in _geschrieben(tmp_path)
    assert _geschrieben(tmp_path, started_at=1.5)["started_at"] == 1.5


def test_die_pflichtschluessel_stehen_immer(tmp_path):
    meta = _geschrieben(tmp_path)

    assert set(meta) == {"n", "h", "w", "digest", "paths"}
    assert meta["n"] == len(ROWS)
    assert meta["paths"] == [r["path"] for r in ROWS]


def test_session_packs_bleiben_bytegleich(tmp_path):
    # Die Konsolidierung darf das Format NICHT aendern; `test_packs` pinnt diese fuenf Schluessel.
    write_meta(tmp_path, ROWS, 8, 8)

    meta = json.loads((tmp_path / "packed_meta.json").read_text(encoding="utf-8"))
    assert set(meta) == {"n", "h", "w", "digest", "paths"}
