"""Je eine eingepflanzte Gegenprobe: fangen die Ratschen-Erkenner, was sie behaupten?"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import guard_ablation as ablation  # noqa: E402

import test_comment_budget as budget  # noqa: E402
import test_json_doors as doors  # noqa: E402
import test_jsonl_readers as readers  # noqa: E402

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


def test_der_zeilenschnitt_wird_an_der_FORM_erkannt_auch_ohne_json_loads():
    """`deletion_cost` zaehlte Manifest-Zeilen per Textsuche und rief nie `json.loads` — unsichtbar."""
    formen = {
        "splitlines + JSON-Schluessel": (
            "def f(m, sid):\n    return sum(1 for line in m.read_text().splitlines()\n"
            "               if f'\"session_id\": \"{sid}\"' in line)\n"),
        "split(newline) auf einer .jsonl": 'rows = (d / "log.jsonl").read_text().split("\\n")\n',
        "offenes Handle einer .jsonl": (
            'def f(d):\n    with (d / "matte.jsonl").open() as fh:\n'
            "        return [line for line in fh if line.strip()]\n"),
        "enumerate(offenes Handle)": (
            'def f(p):\n    for i, line in enumerate(open(p / "x.jsonl")):\n        print(i, line)\n'),
        "readlines auf einer .jsonl": 'def f(path_jsonl):\n    return path_jsonl.open().readlines()\n',
        "json.loads auf eine Zeile": "import json\nfirst = json.loads(text.splitlines()[0])\n",
        "map(json.loads, ...)": "import json\nrows = list(map(json.loads, text.splitlines()))\n",
    }
    for name, quelle in formen.items():
        assert readers.readers_in(quelle) == 1, name


def test_kein_jsonl_kein_treffer():
    """`/proc/meminfo`, ein `.log`, der eigene Docstring und ein Name aus einer ANDEREN Funktion."""
    quellen = [
        'for line in Path("/proc/meminfo").read_text().splitlines():\n    pass\n',
        'for line in open(log):\n    if NOTE.search(line):\n        pass\n',
        "ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])\n",
        'def a(d):\n    done = d / "matte.jsonl"\n'
        "def b(done):\n    return done.stdout.splitlines()\n",
    ]
    for quelle in quellen:
        assert readers.readers_in(quelle) == 0, quelle


# --- Wachen-Ablation ------------------------------------------------------------------------


def test_eine_bewegte_episode_ist_kein_nachweis():
    """Sonst meldet die Sonde still als gedeckt, wogegen sie gebaut wurde."""
    nur_episode = {"found": 0, "missed": 0, "invented": 0, "desync": 1}

    assert "keine Entscheidung" in ablation.befund(nur_episode)
    assert ablation.befund(dict.fromkeys(nur_episode, 0)) == "der Satz merkt NICHTS"
    assert ablation.befund({**nur_episode, "found": -11}) == "gedeckt"
