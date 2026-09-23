"""`corpus_pool`: der POOL auf `/corpus`, seit 2026-09-23 in Python (`docs/web-ruft-python.md`, Schritt 3)."""
from __future__ import annotations

from pathlib import Path

import pytest

from chesslab import config, corpus_pool
from chesslab.session_store import recording
from conftest import write_jsonl

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


@pytest.fixture
def game(monkeypatch, tmp_path) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    gdir = recording.game_dir("g")
    gdir.mkdir(parents=True)
    write_jsonl(gdir / "log.jsonl", [{"frame": "frames/000234.png", "fen": START, "dirty": True},
                                     {"frame": "frames/000237.png", "fen": START}])
    return gdir


def test_a_retracted_verdict_reopens_the_cell(game):
    row = {"session_id": "rg-g", "frame": "000234", "square": "e2", "label": "bQ"}
    write_jsonl(game / "corrections.jsonl", [row, row | {"retract": True}])
    pool = corpus_pool.corpus_pool(["g"])
    assert pool["classes"]["bQ"] == 2 and pool["classes"]["wP"] == 16 and pool["orphans"] == 0


def test_the_dirty_ratio_counts_log_rows(game):
    assert corpus_pool.session_dirty(["g", "fehlt"]) == [{"sessionId": "rg-g", "rows": 2, "dirty": 1}]


def test_an_unreadable_log_is_no_recording_without_cells(game, monkeypatch):
    real = Path.stat

    def stat(self, *a, **k):
        if self.name == "log.jsonl":
            raise PermissionError(24, "EMFILE", str(self))
        return real(self, *a, **k)

    monkeypatch.setattr(Path, "stat", stat)
    with pytest.raises(PermissionError):
        corpus_pool.corpus_pool(["g"])


def test_the_answer_follows_the_ledger(game):
    assert corpus_pool.corpus_pool(["g"])["classes"].get("bQ") == 2
    write_jsonl(game / "corrections.jsonl", [{"session_id": "rg-g", "frame": "000237", "square": "a1",
                                              "label": "bQ"}])
    assert corpus_pool.corpus_pool(["g"])["classes"]["bQ"] == 3
