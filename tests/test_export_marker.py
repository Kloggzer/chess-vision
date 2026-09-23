"""Ein getoeteter Export hinterlaesst kein altes Log neben teilweise neuen Brettern."""
from __future__ import annotations

import pytest

from chesslab.session_store.log import EXPORT_MARKER, export_interrupted, mark_export


def test_a_session_says_when_an_export_did_not_finish(tmp_path):
    assert not export_interrupted(tmp_path), "ohne Marker ist nichts im Gange"

    with pytest.raises(RuntimeError, match="boom"):
        with mark_export(tmp_path):
            raise RuntimeError("boom")

    assert export_interrupted(tmp_path), (
        "der getoetete Export hinterlaesst keine Spur — das Log ist alt, die Bretter sind neu")
    assert (tmp_path / EXPORT_MARKER).is_file()


def test_a_finished_export_leaves_nothing_behind(tmp_path):
    with mark_export(tmp_path):
        pass

    assert not export_interrupted(tmp_path)
    assert not (tmp_path / EXPORT_MARKER).exists()


def test_the_marker_names_what_was_running(tmp_path):
    with pytest.raises(RuntimeError):
        with mark_export(tmp_path):
            raise RuntimeError("x")

    text = (tmp_path / EXPORT_MARKER).read_text(encoding="utf-8")
    assert "export" in text.lower(), text
    assert any(ch.isdigit() for ch in text), "ohne Zeitstempel weiss niemand, wie alt der Bruch ist"
