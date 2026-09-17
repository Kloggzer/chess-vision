"""Tests for the canonical JSONL reader `chesslab.ioutil.read_jsonl` (Rework 05)."""

from __future__ import annotations

import json

from chesslab.ioutil import read_jsonl


def test_read_jsonl_empty_file(tmp_path):
    p = tmp_path / "empty.jsonl"
    p.write_text("", encoding="utf-8")
    assert read_jsonl(p) == []


def test_read_jsonl_missing_file(tmp_path):
    p = tmp_path / "does_not_exist.jsonl"
    assert read_jsonl(p) == []


def test_read_jsonl_blank_lines(tmp_path):
    p = tmp_path / "blanks.jsonl"
    p.write_text('\n{"a":1}\n\n{"b":2}\n', encoding="utf-8")
    assert read_jsonl(p) == [{"a": 1}, {"b": 2}]


def test_read_jsonl_normal(tmp_path):
    p = tmp_path / "data.jsonl"
    rows = [{"square": "e4", "label": "wP"}, {"square": "d5", "label": "bN"}]
    p.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    assert read_jsonl(p) == rows


def test_read_jsonl_invalid_line_raises(tmp_path):
    p = tmp_path / "bad.jsonl"
    p.write_text('{"ok": 1}\nnot-json\n', encoding="utf-8")
    try:
        read_jsonl(p)
    except json.JSONDecodeError:
        pass
    else:
        raise AssertionError("json.JSONDecodeError expected for invalid line")


def test_read_jsonl_pools_repeated_strings(tmp_path):
    """Wiederholte Schluessel und Werte zeigen auf EIN Objekt — der Grund, warum ein Manifest
    gepoolt halb so viel Speicher kostet (`read_jsonl`)."""
    p = tmp_path / "pool.jsonl"
    p.write_text('{"label": "wP", "path": "a.webp"}\n{"label": "wP", "path": "b.webp"}\n',
                 encoding="utf-8")
    first, second = read_jsonl(p)
    assert first["label"] == second["label"] == "wP"
    assert first["label"] is second["label"]
    keys = list(zip(first, second, strict=True))
    assert all(a is b for a, b in keys), keys
    assert first["path"] != second["path"]


def test_read_jsonl_pool_does_not_alter_values(tmp_path):
    """Der Pool darf nur Identitaet teilen, nie Werte oder Typen verbiegen."""
    p = tmp_path / "types.jsonl"
    rows = [{"a": "1", "b": 1, "c": 1.0, "d": True, "e": None, "f": ["x", "x"], "g": {"h": "x"}}]
    p.write_text(json.dumps(rows[0]) + "\n", encoding="utf-8")
    got = read_jsonl(p)
    assert got == rows
    assert type(got[0]["b"]) is int and type(got[0]["d"]) is bool


def test_append_repairs_a_torn_tail_without_mangling_the_other_line_ends(tmp_path):
    """Der Schwanz-Reparatur las die ECHTEN Bytes (`newline=""`) und schrieb sie im
    Uebersetzungsmodus zurueck: aus jedem `\r\n` der ueberlebenden Zeilen wurde `\r\r\n`.
    1127 der 1329 Dateien tragen CRLF, und jede Reparatur haengt ein weiteres CR an."""
    from chesslab.ioutil import append_rows

    p = tmp_path / "torn.jsonl"
    p.write_bytes(b'{"a": 1}\r\n{"b": 2}\r\n{"c":')
    append_rows(p, [{"d": 4}])
    raw = p.read_bytes()
    assert b"\r\r\n" not in raw, raw
    assert read_jsonl(p) == [{"a": 1}, {"b": 2}, {"d": 4}]


def test_iter_jsonl_stops_before_it_reads_the_whole_file(tmp_path):
    """Der Grund, warum es `iter_jsonl` gibt: wer nur die erste Zeile braucht, zahlt keine Liste.

    Eine kaputte Zeile HINTER dem Abbruch darf den Abbrecher nicht treffen — sonst steht jede
    zaehlende Stelle wieder vor der Wahl zwischen Politik und Speicher.
    """
    from chesslab.ioutil import iter_jsonl

    p = tmp_path / "big.jsonl"
    p.write_text('{"n": 0}\n{"n": 1}\nKAPUTT\n', encoding="utf-8")
    assert next(iter_jsonl(p)) == {"n": 0}


def test_iter_jsonl_carries_the_same_tail_policy(tmp_path):
    """Halbe LETZTE Zeile faellt weg, eine kaputte MITTENDRIN bleibt laut — wie `read_jsonl`."""
    import pytest

    from chesslab.ioutil import iter_jsonl

    torn = tmp_path / "torn.jsonl"
    torn.write_bytes(b'{"a": 1}\r\n{"b":')
    assert list(iter_jsonl(torn)) == [{"a": 1}]

    broken = tmp_path / "broken.jsonl"
    broken.write_bytes(b'{"a": 1}\r\nKAPUTT\r\n{"b": 2}\r\n')
    with pytest.raises(ValueError):
        list(iter_jsonl(broken))


def test_a_held_iter_jsonl_blocks_the_rewrite_on_windows(tmp_path):
    """Der Preis des Stroemens: solange der Generator LEBT, haelt er die Datei offen.

    Gemessen 2026-09-17: ein festgehaltener Generator laesst `write_rows` mit `WinError 5`
    scheitern. Kein Aufrufer tut das heute — jeder verbraucht ihn in einer Schleife oder verlaesst
    die Funktion, was ihn in CPython sofort schliesst. Der Test haelt die Falle sichtbar.
    """
    import sys

    import pytest

    from chesslab.ioutil import iter_jsonl, write_rows

    # Nur Windows sperrt eine offene Datei gegen das Umhaengen; anderswo gaebe es nichts zu fangen.
    if sys.platform != "win32":
        pytest.skip("die Sperre gibt es nur auf Windows")

    p = tmp_path / "m.jsonl"
    write_rows(p, [{"n": i} for i in range(5)])

    def first_only():
        for row in iter_jsonl(p):
            return row
        return None

    assert first_only() == {"n": 0}
    # Abgebrochen und losgelassen: CPython schliesst den Generator sofort.
    write_rows(p, [{"n": 99}])

    held = iter_jsonl(p)
    next(held)
    with pytest.raises(OSError):
        write_rows(p, [{"n": 1}])
    held.close()
    write_rows(p, [{"n": 1}])
