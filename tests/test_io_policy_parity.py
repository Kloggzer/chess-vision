"""Die Politik der drei Treuhaender, Python-Seite. Zwillinge:
`platform/app/lib/io-policy-parity.test.ts` und `JsonlPolicyParityTest.kt`."""
from __future__ import annotations

import json
import re

import pytest

from chesslab.ioutil import append_rows, read_jsonl, write_rows


def _file(tmp_path, data: bytes):
    p = tmp_path / "rows.jsonl"
    p.write_bytes(data)
    return p


def test_1_half_last_line_without_newline_falls_away(tmp_path):
    assert read_jsonl(_file(tmp_path, b'{"a":1}\n{"a":')) == [{"a": 1}]


def test_2_broken_last_line_with_newline_is_damage(tmp_path):
    with pytest.raises(ValueError):
        read_jsonl(_file(tmp_path, b'{"a":1}\n{"a":\n'))


def test_3_broken_line_in_the_middle_throws(tmp_path):
    with pytest.raises(ValueError):
        read_jsonl(_file(tmp_path, b'{"a":1}\n{"a":\n{"b":2}\n'))


def test_4_blank_lines_are_skipped(tmp_path):
    assert read_jsonl(_file(tmp_path, b'\n{"a":1}\n\n\n')) == [{"a": 1}]


@pytest.mark.parametrize("line", [b"5", b"[1,2]", b"null", b'"hi"'])
def test_5_valid_json_that_is_no_object_is_skipped(tmp_path, line):
    assert read_jsonl(_file(tmp_path, line + b'\n{"a":1}\n')) == [{"a": 1}]


def test_6_a_leading_bom_is_swallowed(tmp_path):
    assert read_jsonl(_file(tmp_path, b'\xef\xbb\xbf{"a":1}\n')) == [{"a": 1}]


def test_7_crlf_and_lf_both_read(tmp_path):
    assert read_jsonl(_file(tmp_path, b'{"a":1}\r\n{"b":2}\n')) == [{"a": 1}, {"b": 2}]


def test_7b_written_lines_are_read_by_all_three(tmp_path):
    """Der Trenner darf `\\r?\\n` sein — was TS und Kotlin als Zeile schneiden."""
    p = tmp_path / "w.jsonl"
    write_rows(p, [{"a": 1}, {"b": 2}])
    lines = re.split(r"\r?\n", p.read_bytes().decode())
    assert [json.loads(x) for x in lines[:-1]] == [{"a": 1}, {"b": 2}]


def test_8_a_failed_write_leaves_no_side_file(tmp_path):
    (tmp_path / "gesperrt").mkdir()
    with pytest.raises(OSError):
        write_rows(tmp_path / "gesperrt", [{"a": 1}])
    assert not list(tmp_path.glob("gesperrt*.tmp"))


def test_9_appending_mends_the_torn_tail(tmp_path):
    p = _file(tmp_path, b'{"a":1}\n{"hal')
    append_rows(p, [{"c": 3}])
    assert read_jsonl(p) == [{"a": 1}, {"c": 3}]


def test_9b_a_torn_cr_keeps_its_row_and_gets_its_newline(tmp_path):
    """Die Zeile ist ganz, nur ihr CRLF halb — und dahinter darf nichts kleben."""
    p = _file(tmp_path, b'{"a":1}\r\n{"b":2}\r')
    append_rows(p, [{"c": 3}])
    assert read_jsonl(p) == [{"a": 1}, {"b": 2}, {"c": 3}]
    assert b"\r{" not in p.read_bytes()


def test_10_missing_and_empty_are_no_rows_a_directory_throws(tmp_path):
    assert read_jsonl(tmp_path / "gone.jsonl") == []
    assert read_jsonl(_file(tmp_path, b"")) == []
    (tmp_path / "adir.jsonl").mkdir()
    with pytest.raises(OSError):
        read_jsonl(tmp_path / "adir.jsonl")
