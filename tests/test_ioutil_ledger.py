"""Die Treuhand `chesslab.ioutil`: eine Tuer fuer jeden Schreibvorgang, und was sie zusagt."""

from __future__ import annotations

import json
from pathlib import Path

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
    monkeypatch.undo()
    assert not list(tmp_path.glob("*.tmp")), "die Nebendatei darf nicht liegen bleiben"


def test_a_failed_write_leaves_nothing_behind(tmp_path, monkeypatch):
    """Die volle Platte trifft die Nebendatei — und die muss danach weg sein."""
    path = tmp_path / "matte.jsonl"
    ledger.write_rows(path, [{"a": 1}])
    real = Path.write_text

    def full_disk(self, *a, **kw):
        real(self, *a, **kw)
        raise OSError(28, "No space left on device")

    monkeypatch.setattr("pathlib.Path.write_text", full_disk)
    with pytest.raises(OSError):
        ledger.write_rows(path, [{"b": 2}])

    monkeypatch.undo()
    assert read_jsonl(path) == [{"a": 1}], "das Original muss unberuehrt sein"
    assert not list(tmp_path.glob("*.tmp")), "die halbe Nebendatei muss weg sein"


def test_a_torn_tail_without_the_repair_really_would_corrupt(tmp_path):
    """Gegenprobe zu `test_io_policy_parity::test_9_appending_mends_the_torn_tail`."""
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


def test_a_torn_line_with_a_line_after_it_is_corruption(tmp_path):
    """Die LAUTE Haelfte der Schwanz-Regel: was nicht ganz hinten steht, ist kein Schreiber.

    Der Fehler faellt erst auf, wenn doch noch eine Zeile folgt — bis dahin koennte es der
    Schwanz sein. Ohne diese Stelle schluckt `read_jsonl` eine kaputte Datei stillschweigend.
    """
    path = tmp_path / "matte.jsonl"
    path.write_bytes(b'{"a": 1}\r\n{"b":\r{"c": 3}\r\n')

    with pytest.raises(ValueError):
        read_jsonl(path)


def test_the_same_torn_line_at_the_very_end_is_tolerated(tmp_path):
    """Gegenstueck: dieselbe halbe Zeile, nur ganz hinten — der Schreiber laeuft noch."""
    path = tmp_path / "matte.jsonl"
    path.write_bytes(b'{"a": 1}\r\n{"b":')

    assert read_jsonl(path) == [{"a": 1}]


def test_the_guard_also_watches_the_window_while_writing_the_tmp(tmp_path, monkeypatch):
    """Der zweite Blick: zwischen der ersten Pruefung und dem Umhaengen liegt das Schreiben
    der Nebendatei selbst, und das sind bei einer grossen `matte.jsonl` Sekunden.
    """
    path = tmp_path / "matte.jsonl"
    ledger.write_rows(path, [{"a": 1}])
    stamp = ledger.stamp_of(path)
    real = Path.write_text

    def write_meanwhile(self, *a, **kw):
        if self.suffix == ".tmp":
            ledger.append_rows(path, [{"fremd": True}])
        return real(self, *a, **kw)

    monkeypatch.setattr("pathlib.Path.write_text", write_meanwhile)
    with pytest.raises(ledger.Contested):
        ledger.write_rows_guarded(path, [{"neu": 1}], stamp, what="Probe")

    monkeypatch.undo()
    assert read_jsonl(path) == [{"a": 1}, {"fremd": True}], "die fremde Zeile bleibt stehen"
    assert not list(tmp_path.glob("*.tmp")), "die Nebendatei muss weg sein"


def test_a_stamp_of_nothing_is_none(tmp_path):
    """`None` heisst 'die Datei gab es nicht' — so bewacht `write_rows_guarded` eine Neuanlage."""
    assert ledger.stamp_of(tmp_path / "gibt-es-nicht.jsonl") is None


def test_a_same_size_writer_in_the_same_tick_moves_the_stamp(tmp_path):
    """Zwei gleich lange Umhaenge-Schreiber tragen dieselbe Mtime; der Riegel sah den zweiten nicht."""
    path = tmp_path / "log.jsonl"
    ledger.write_rows(path, [{"a": 1}])
    stamp = ledger.stamp_of(path)
    ledger.write_rows(path, [{"a": 2}])
    with pytest.raises(ledger.Contested):
        ledger.write_rows_guarded(path, [{"a": 3}], stamp, what="Probe")
    assert read_jsonl(path) == [{"a": 2}]


def test_a_refused_writer_does_not_remove_the_running_ones_side_file(tmp_path):
    """Zwei Schreiber teilten sich eine Nebendatei `<name>.tmp`: der Abbrecher raeumte die halbe
    Nebendatei des anderen weg, der dann sein Umhaengen verlor. Dieselbe Form wie in
    `lib/atomic.ts`.
    """
    path = tmp_path / "matte.jsonl"
    ledger.write_rows(path, [{"a": 1}])
    fremd = next(tmp_path.glob("*.jsonl")).with_suffix(".jsonl.tmp")
    fremd.write_text("der andere schreibt gerade", encoding="utf-8")

    with pytest.raises(ledger.Contested):
        ledger.write_rows_guarded(path, [{"b": 2}], (0, 0), what="Probe")

    assert fremd.is_file(), "die Nebendatei des laufenden Schreibers wurde weggeraeumt"
