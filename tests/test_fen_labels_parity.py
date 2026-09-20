"""The 64 labels of a FEN, and the FEN back out of them — the fixture `lib/fen-labels-parity`
reads too. The web view labels a cell by parsing the string, the dataset asks python-chess.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from chesslab.labeling import labels_to_fen
from chesslab.state import GameState

FIXTURE = Path(__file__).resolve().parent / "data/fen_labels_parity.json"


@pytest.fixture(scope="module")
def cases() -> list[dict]:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))["cases"]


def test_labels_match_the_shared_fixture(cases):
    for c in cases:
        assert GameState(c["fen"]).labels() == c["labels"], c["fen"]


def test_the_labels_round_trip_back_to_the_board_part(cases):
    for c in cases:
        assert labels_to_fen(c["labels"]) == c["boardPart"] == c["fen"].split(" ")[0]
