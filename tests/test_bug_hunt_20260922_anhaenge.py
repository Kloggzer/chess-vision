"""Der Erkenner der JSON-Treuhand sieht auch rohes ANHAENGEN an `.jsonl`."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

from chesslab.ioutil import append_rows, read_jsonl
from chesslab.session_writer import SessionWriter

sys.path.insert(0, str(Path(__file__).resolve().parent))

import test_json_doors as doors  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
UMGESTELLT = (
    "src/chesslab/session_writer.py",
    "src/chesslab/training/train_loop.py",
    "scripts/fix_ply_offset.py",
)

# --- der Erkenner ---------------------------------------------------------------------------


@pytest.mark.parametrize("quelle", [
    'open(p, "a")',
    'p.open("a")',
    'p.open("a+", encoding="utf-8")',
    'open(p, mode="a")',
    'io.open(p, "a")',
    'mode = "a"\nopen(p, mode)',
    'open(p, "a" + extra)',
])
def test_jede_form_des_anhaengens_wird_gesehen(quelle):
    """Die FORM zaehlt, nicht die Schreibweise — eine Textsuche haette fuenf davon verfehlt."""
    assert doors.append_lines(quelle), quelle


@pytest.mark.parametrize("quelle", ['p.open("r")', 'open(p, "w")', 'open(p)', "p.open()"])
def test_lesen_und_anlegen_sind_kein_anhaengen(quelle):
    assert doors.append_lines(quelle) == set(), quelle


def test_ein_roher_jsonl_anhang_ist_eine_tuer(tmp_path):
    """Die eingepflanzte Gegenprobe: genau die Form, die vier Stellen durchrutschen liess."""
    p = tmp_path / "x.py"
    quelle = 'import json\nwith out.open("a") as fh:\n    fh.write(json.dumps(row))\n'
    p.write_text(quelle, encoding="utf-8")

    assert doors.doors_in(p.read_text(encoding="utf-8")) == 1


def test_ein_log_anhang_ist_keine_json_tuer(tmp_path):
    p = tmp_path / "x.py"
    p.write_text('with (d / "run.log").open("a") as fh:\n    fh.write(json.dumps(row))\n', "utf-8")

    assert doors.doors_in(p.read_text(encoding="utf-8")) == 0


# --- die drei umgestellten Stellen ------------------------------------------------------------


@pytest.mark.parametrize("rel", UMGESTELLT)
def test_die_umgestellte_stelle_haengt_nicht_mehr_selbst_an(rel):
    """Gegenprobe je Fix: das alte `open("a")` zurueck, und diese Zeile ist rot."""
    assert doors.append_lines((ROOT / rel).read_text(encoding="utf-8")) == set()


def test_session_writer_schneidet_den_abgerissenen_schwanz_ab(tmp_path):
    w = SessionWriter(tmp_path / "s", session_id="s", profile="p", mode="manual",
                      camera_index=0, frame_size=(8, 8))
    frame = np.zeros((8, 8, 3), dtype=np.uint8)
    w.capture(frame, ply=1, fen="8/8/8/8/8/8/8/8 w - - 0 1")
    with w.log_path.open("a", encoding="utf-8") as fh:
        fh.write('{"frame": "frames/0001.png", "pl')

    w.capture(frame, ply=2, fen="8/8/8/8/8/8/8/8 b - - 0 1")

    rows = read_jsonl(w.log_path)
    assert [r["ply"] for r in rows] == [1, 2]


def test_eine_kaputte_zeile_mittendrin_wirft_weiter(tmp_path):
    """Der Schwanz ist toleriert, die Mitte nie — sonst verschwindet Beschaedigung still."""
    p = tmp_path / "corrections.jsonl"
    p.write_text('{"a": 1}\n{"kaputt"\n{"a": 2}\n', encoding="utf-8")

    with pytest.raises(ValueError):
        read_jsonl(p)


@pytest.mark.parametrize("zeilen", [
    [{"epoch": 1, "train_loss": 0.5}, {"epoch": 2, "train_loss": 0.4}],
    [{"session_id": "s", "square": "e4", "label": "wP"}],
])
def test_append_rows_haelt_die_schwanz_regel_fuer_beide_dateien(tmp_path, zeilen):
    """`train.py` (metrics.jsonl) und `fix_ply_offset.py` (corrections.jsonl) fahren hier durch."""
    p = tmp_path / "rows.jsonl"
    append_rows(p, zeilen[:1])
    with p.open("a", encoding="utf-8") as fh:
        fh.write('{"halb"')

    append_rows(p, zeilen)

    assert read_jsonl(p) == zeilen[:1] + zeilen
