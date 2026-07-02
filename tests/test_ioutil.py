"""Tests für den kanonischen JSONL-Reader `chesslab.ioutil.read_jsonl` (Rework 05)."""

from __future__ import annotations

import json
from pathlib import Path

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
