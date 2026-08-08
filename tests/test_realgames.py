"""`chesslab realgames confirm` — the candidate is checked against the game that was played.

The comparison has to behave exactly like `RealGameScore.scoreMoves` on the Kotlin side, because
both sides report the same three numbers about the same runs; and the write has to leave
everything the tracker owns alone, because `moves[]`, `geometry` and `effective_config` are the
record of what happened, not of what a human thought about it.
"""

import json

from chesslab import config
from chesslab.realgames import confirm, lcs_report


def test_lcs_matches_the_kotlin_semantics():
    matched, invented, missed = lcs_report(["a", "b", "c", "d"], ["a", "x", "c"])
    assert len(matched) == 2
    assert invented == [1]  # "x"
    assert missed == [1, 3]  # "b", "d"


def _candidate(tmp_path, monkeypatch, sans):
    """A minimal candidate next to a four-ply reference game (1. e4 e5 2. Nf3 Nc6)."""
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    d = tmp_path / "data" / "realgames" / "g"
    d.mkdir(parents=True)
    (d / "reference.pgn").write_text('[Event "t"]\n\n1. e4 e5 2. Nf3 Nc6 *\n', encoding="utf-8")
    payload = {
        "name": "g",
        "confirmed": False,
        "geometry": {"board_size": 928},
        "moves": [
            {"ply": i, "san": san, "frame": 100 * i, "decider": "cnn_occupancy"}
            for i, san in enumerate(sans, 1)
        ],
    }
    (d / "candidate.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return d / "candidate.json"


def test_confirm_writes_only_the_three_keys(tmp_path, monkeypatch):
    path = _candidate(tmp_path, monkeypatch, ["e4", "d4", "Nf3", "Nc6"])
    before = json.loads(path.read_text(encoding="utf-8"))

    confirm("g", yes=True)

    after = json.loads(path.read_text(encoding="utf-8"))
    assert set(after) - set(before) == {"confirmed_at", "reviewed_plies"}
    assert before["confirmed"] is False and after["confirmed"] is True
    assert after["confirmed_at"].endswith("Z")
    for key in set(before) - {"confirmed"}:
        assert after[key] == before[key], key


def test_yes_mode_keeps_matched_and_drops_unmatched(tmp_path, monkeypatch):
    path = _candidate(tmp_path, monkeypatch, ["e4", "d4", "Nf3", "Nc6"])

    r = confirm("g", yes=True)

    assert r["matched"] == 3 and r["invented"] == [1] and r["missed"] == [1]  # d4 / e5
    assert r["kept"] == [] and r["reviewed"] == [1, 3, 4]
    assert json.loads(path.read_text(encoding="utf-8"))["reviewed_plies"] == [1, 3, 4]

    # The human keeps the candidate-only ply; only then does it enter the timeline.
    kept = confirm("g", yes=False, ask=lambda move: move["san"] == "d4")
    assert kept["reviewed"] == [1, 2, 3, 4]
