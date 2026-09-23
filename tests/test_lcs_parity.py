"""`lcs_report` against the fixture `lib/lcs.test` reads too, including transpositions."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from chesslab.realgames import lcs_report, reviewed_plies

FIXTURE = Path(__file__).resolve().parent / "data/lcs_parity.json"


@pytest.fixture(scope="module")
def cases() -> list[dict]:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))["cases"]


def test_the_fixture_carries_a_transposition_and_a_repeat(cases):
    assert any(sorted(c["truth"]) == sorted(c["cand"]) and c["truth"] != c["cand"] for c in cases)
    assert any(len(set(c["truth"])) < len(c["truth"]) for c in cases)


def test_lcs_report_matches_the_shared_fixture(cases):
    for c in cases:
        matched, invented, missed = lcs_report(c["truth"], c["cand"])
        where = f"{c['truth']} vs {c['cand']}"
        assert [list(p) for p in matched] == c["matched"], where
        assert invented == c["invented"], where
        assert missed == c["missed"], where


def test_reviewed_plies_matches_the_shared_fixture(cases):
    for c in cases:
        moves = [{"ply": j + 1} for j in range(len(c["cand"]))]
        matched, _, _ = lcs_report(c["truth"], c["cand"])
        assert reviewed_plies(moves, matched, c["kept"]) == c["reviewedPlies"]
