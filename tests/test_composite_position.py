"""Ein Komposit ist EINE Stellung: Feldlabels konstant ueber Frames und Schnitte einer Quelle."""

from __future__ import annotations

import collections
import re
from pathlib import Path

import pytest

from chesslab.ioutil import read_jsonl

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "datasets" / "real13-mix-v7-128" / "manifest.jsonl"


def source_of(session: str) -> str:
    """Nur Komposite tragen eine Schnittnummer. Ohne die erste Zeile frisst die Regex einem
    `rg-2026-09-11-20-00-52` sein `-52` weg und erfindet eine Aufnahme, die es nicht gibt."""
    if session.startswith("rg-"):
        return session
    return re.sub(r"-\d+$", "", session.removeprefix("p-").removeprefix("comp-"))


def composite_boards() -> dict[str, dict[str, str]]:
    rows = read_jsonl(MANIFEST)
    boards: dict[str, dict[str, str]] = collections.defaultdict(dict)
    for row in rows:
        session = str(row.get("session_id"))
        if not session.startswith("rg-"):
            boards[session][str(row.get("square"))] = row["label"]
    return boards


def test_source_of_strips_the_slice_number():
    assert source_of("p-VID_20260812_112853-02") == "VID_20260812_112853"
    assert source_of("comp-2026-08-09 20-48-50-05") == "2026-08-09 20-48-50"
    assert source_of("rg-2026-09-11-20-00-52") == "rg-2026-09-11-20-00-52"


def test_a_square_keeps_its_label_through_a_composite():
    """Waechst hier etwas, ist der Export kaputt — eine Figur kann sich nicht bewegt haben."""
    if not MANIFEST.is_file():
        pytest.skip("kein Datensatz auf dieser Maschine")
    per: dict[tuple[str, str], set[str]] = collections.defaultdict(set)
    for row in read_jsonl(MANIFEST):
        session = str(row.get("session_id"))
        if not session.startswith("rg-"):
            per[(session, str(row.get("square")))].add(row["label"])
    wandernd = {k: sorted(v) for k, v in per.items() if len(v) > 1}
    assert wandernd == {}, f"Label wechselt innerhalb eines Komposits: {list(wandernd)[:5]}"


def test_slices_of_one_source_share_their_position():
    if not MANIFEST.is_file():
        pytest.skip("kein Datensatz auf dieser Maschine")
    boards = composite_boards()
    per_source: dict[str, set[tuple]] = collections.defaultdict(set)
    for session, board in boards.items():
        per_source[source_of(session)].add(tuple(sorted(board.items())))
    geteilt = {src: len(v) for src, v in per_source.items() if len(v) > 1}
    assert geteilt == {}, f"Schnitte derselben Quelle zeigen verschiedene Stellungen: {geteilt}"
