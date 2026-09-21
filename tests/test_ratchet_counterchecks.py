"""Fangen die Ratschen, was sie behaupten? Je eine EINGEPFLANZTE Gegenprobe.

Das Projekt verlangt sie ausdrücklich, und heute Nacht hat sie sich zweimal ausgezahlt: der
TypeScript-Zwilling der JSONL-Ratsche suchte VIER Schreibweisen des Zeilenumbruchs und liess drei
weitere durch, und sein Kommentarzähler schaltete an einem `/*` in einem STRING in den Blockmodus.
Eine Ratsche ohne Gegenprobe ist eine Behauptung.

Geprüft wird der ERKENNER, nicht die Liste: jede Probe pflanzt einen Verstoss und verlangt, dass
er gezählt wird — und einen erlaubten Fall, der NICHT gezählt werden darf.
"""

from __future__ import annotations

import test_comment_budget as budget
import test_json_doors as doors
import test_jsonl_readers as readers

# --- Kommentar-Budget ---------------------------------------------------------------------


def test_ein_langer_kommentarblock_wird_gezaehlt():
    text = "\n".join(["# eins", "# zwei", "# drei", "# vier", "# fuenf", "# sechs", "x = 1"])

    assert budget.hash_runs(text) == 6


def test_eine_leerzeile_bricht_den_block():
    text = "\n".join(["# eins", "# zwei", "", "# drei", "x = 1"])

    assert budget.hash_runs(text) == 2


def test_ein_gitter_im_STRING_ist_kein_kommentar():
    """Der TS-Zwilling zaehlte an derselben Stelle Code als Kommentar (`/*` im String)."""
    text = 'MUSTER = """\n# eins\n# zwei\n# drei\n# vier\n# fuenf\n# sechs\n"""\n'

    assert budget.hash_runs(text) == 0, "eine Zeile in einem String ist kein Kommentarblock"


def test_ein_langer_docstring_wird_gezaehlt():
    text = 'def f():\n    """eins\n    zwei\n    drei\n    vier\n    fuenf\n    sechs\n    """\n'

    assert budget.docstring_blocks(text) >= 6


# --- JSON-Treuhand ------------------------------------------------------------------------


def test_ein_roher_json_schreiber_wird_gesehen(tmp_path):
    p = tmp_path / "x.py"
    p.write_text('import json\np.write_text(json.dumps({"a": 1}))\n', encoding="utf-8")

    assert doors.doors_in(p.read_text(encoding='utf-8')) == 1


def test_der_treuhaender_selbst_wird_nicht_gezaehlt(tmp_path):
    p = tmp_path / "x.py"
    p.write_text('from chesslab.ioutil import write_json\nwrite_json(p, {"a": 1})\n', encoding="utf-8")

    assert doors.doors_in(p.read_text(encoding='utf-8')) == 0


def test_eine_yaml_zeile_ist_keine_json_tuer(tmp_path):
    p = tmp_path / "x.py"
    p.write_text('p.write_text(yaml.safe_dump({"a": 1}))\n', encoding="utf-8")

    assert doors.doors_in(p.read_text(encoding='utf-8')) == 0


# --- JSONL-Leser --------------------------------------------------------------------------


def test_jede_schreibweise_des_zeilenschnitts_wird_gesehen(tmp_path):
    """Der TS-Zwilling suchte vier Schreibweisen und liess drei durch."""
    formen = [
        'for line in fh.read().splitlines():\n    json.loads(line)\n',
        'rows = [json.loads(x) for x in text.split("\\n")]\n',
        'for i, line in enumerate(fh):\n    json.loads(line)\n',
        'for line in text.split("\\r\\n"):\n    json.loads(line)\n',
    ]
    for i, quelle in enumerate(formen):
        p = tmp_path / f"f{i}.py"
        p.write_text("import json\n" + quelle, encoding="utf-8")

        assert readers.readers_in(p.read_text(encoding='utf-8')) >= 1, quelle
