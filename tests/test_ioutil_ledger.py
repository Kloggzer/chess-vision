"""Die Treuhand: eine Tuer fuer jeden Schreibvorgang, und was sie zusagt.

Jede Zusage hier hat ihren Anlass in einem echten Fund: eine gekuerzte Datei nach einem Abbruch,
eine halbe letzte Zeile, an die der naechste Lauf blind angeklebt hat, und zwei Schreiber, die
sich gegenseitig ueberschreiben und beide Erfolg melden.
"""

from __future__ import annotations

import json

import pytest

from chesslab import ioutil as ledger
from chesslab.ioutil import read_jsonl


def test_a_replaced_file_is_never_half_there(tmp_path, monkeypatch):
    """Der Abbruch trifft die NEBENdatei, nicht das Original."""
    path = tmp_path / "matte.jsonl"
    ledger.write_rows(path, [{"a": 1}])

    def boom(self, target):
        raise KeyboardInterrupt

    # `write_atomic` haengt die Nebendatei mit `Path.replace` um — genau dort schlagen wir zu.
    monkeypatch.setattr("pathlib.Path.replace", boom)
    with pytest.raises(KeyboardInterrupt):
        ledger.write_rows(path, [{"b": 2}])

    assert read_jsonl(path) == [{"a": 1}], "das Original muss unberuehrt sein"


def test_appending_repairs_a_torn_tail_first(tmp_path):
    path = tmp_path / "matte.jsonl"
    ledger.write_rows(path, [{"a": 1}])
    # Ein erschlagener Schreiber: halbe Zeile, kein Umbruch.
    with path.open("a", encoding="utf-8") as fh:
        fh.write('{"b": ')

    ledger.append_rows(path, [{"c": 3}])

    assert read_jsonl(path) == [{"a": 1}, {"c": 3}], (
        "blind angehaengt klebt die neue Zeile an der halben und macht echte Beschaedigung daraus")


def test_a_torn_tail_without_the_repair_really_would_corrupt(tmp_path):
    """Die Gegenprobe zur Zusage darueber — sonst glaubt man sie nur."""
    path = tmp_path / "matte.jsonl"
    path.write_text('{"a": 1}\n{"b": ', encoding="utf-8")
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({"c": 3}) + "\n")

    with pytest.raises(ValueError):
        read_jsonl(path)


def test_appending_to_a_clean_file_touches_nothing_else(tmp_path):
    path = tmp_path / "matte.jsonl"
    ledger.write_rows(path, [{"a": 1}])

    ledger.append_rows(path, [{"b": 2}])

    assert read_jsonl(path) == [{"a": 1}, {"b": 2}]


def test_a_second_writer_is_refused_instead_of_silently_winning(tmp_path):
    path = tmp_path / "matte.jsonl"
    ledger.write_rows(path, [{"a": 1}])

    def slow(rows):
        # Waehrend wir "rechnen", schreibt jemand anders.
        ledger.write_rows(path, [{"fremd": True}])
        return rows + [{"meins": True}]

    with pytest.raises(ledger.Contested):
        ledger.update_rows(path, slow)

    assert read_jsonl(path) == [{"fremd": True}], "die fremde Arbeit bleibt stehen"


def test_an_uncontested_update_goes_through(tmp_path):
    path = tmp_path / "matte.jsonl"
    ledger.write_rows(path, [{"a": 1}])

    ledger.update_rows(path, lambda rows: [*rows, {"b": 2}])

    assert read_jsonl(path) == [{"a": 1}, {"b": 2}]


def test_json_is_written_the_same_way(tmp_path):
    path = tmp_path / "pass.json"
    ledger.write_json(path, {"upserted": 3})

    assert json.loads(path.read_text(encoding="utf-8")) == {"upserted": 3}
    assert not list(tmp_path.glob("*.tmp")), "die Nebendatei muss weg sein"
