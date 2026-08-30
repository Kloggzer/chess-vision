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
