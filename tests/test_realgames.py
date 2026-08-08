"""`chesslab realgames confirm` — the candidate is checked against the game that was played.

The comparison has to behave exactly like `RealGameScore.scoreMoves` on the Kotlin side, because
both sides report the same three numbers about the same runs; and the write has to leave
everything the tracker owns alone, because `moves[]`, `geometry` and `effective_config` are the
record of what happened, not of what a human thought about it.
"""

import json

import cv2
import numpy as np
import pytest

from chesslab import config
from chesslab.realgames import (
    confirm,
    ensure_export_profile,
    export_session,
    lcs_report,
    plan_rows,
    write_session,
)


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


# --- export-session -------------------------------------------------------------------------

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1"
AFTER_1 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
AFTER_2 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"


def _export_candidate(tmp_path, monkeypatch, *, confirmed=True, frames=(100, 400, 700)):
    """A candidate with three commits 10 s apart, of which the first two are reviewed."""
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    d = tmp_path / "data" / "realgames" / "g"
    d.mkdir(parents=True)
    payload = {
        "name": "g",
        "video": "g.mp4",
        "confirmed": confirmed,
        "created_at": "2026-08-08T00:00:00Z",
        "clock": {"fps": 30.0},
        "geometry": {
            "corners": [[20, 20], [300, 20], [300, 220], [20, 220]],
            "margin": 0.0,
            "board_size": 128,
            "frame_size": [320, 240],
        },
        "source": {"crop": {"cell": 16.0, "pad_up": 0.0, "pad_side": 0.05, "out_size": [80, 80]}},
        "moves": [
            {"ply": i, "san": s, "frame": f, "fen_after": fen}
            for i, (s, f, fen) in enumerate(
                zip(("e4", "e5", "Nf3"), frames, (AFTER_1, AFTER_2, AFTER_2), strict=True), 1
            )
        ],
        "reviewed_plies": [1, 2],
    }
    (d / "candidate.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return payload


def test_export_refuses_unconfirmed(tmp_path, monkeypatch):
    _export_candidate(tmp_path, monkeypatch, confirmed=False)
    with pytest.raises(ValueError, match="not confirmed"):
        export_session("g", report_only=True)


def test_intervals_respect_the_margin(tmp_path, monkeypatch):
    cand = _export_candidate(tmp_path, monkeypatch)
    rows = plan_rows(cand, margin_frames=30, every=3, dirty=True)

    quiet = [int(r["frame"][7:13]) for r in rows if not r.get("dirty")]
    assert quiet, "the two reviewed intervals are 300 frames long — they must yield quiet rows"
    for idx in quiet:
        assert min(abs(idx - f) for f in (100, 400, 700)) >= 30, idx
    # Ply 3 is unreviewed AND last: its position has no known end, so nothing is exported past it.
    assert max(int(r["frame"][7:13]) for r in rows) < 700


def test_dirty_rows_carry_the_flag_and_the_interval_fen(tmp_path, monkeypatch):
    cand = _export_candidate(tmp_path, monkeypatch)
    rows = plan_rows(cand, margin_frames=30, every=3, dirty=True)

    by_frame = {int(r["frame"][7:13]): r for r in rows}
    assert by_frame[102]["dirty"] is True and by_frame[102]["fen"] == AFTER_1  # post-commit hand
    assert by_frame[381]["dirty"] is True and by_frame[381]["fen"] == AFTER_1  # pre-commit hand
    assert "dirty" not in by_frame[300] and by_frame[300]["fen"] == AFTER_1
    assert all(not r.get("dirty") for r in plan_rows(cand, margin_frames=30, every=3, dirty=False))


def test_slice_runs_unmodified(tmp_path, monkeypatch):
    """The exporter conforms to slice: its rows go through `labeling.slice_session` untouched."""
    from chesslab.calibration import load_profile
    from chesslab.labeling import slice_session

    cand = _export_candidate(tmp_path, monkeypatch)
    rows = plan_rows(cand, margin_frames=30, every=3, dirty=True)[:3]
    session_dir = config.DATA.sessions / "rg-g"
    (session_dir / "frames").mkdir(parents=True)
    for row in rows:
        img = np.random.default_rng(0).integers(0, 255, (240, 320, 3), dtype=np.uint8)
        cv2.imwrite(str(session_dir / row["frame"]), img)
    write_session(session_dir, "g", cand, rows)
    ensure_export_profile("desktop", cand)

    stats = slice_session(
        session_dir,
        profile=load_profile("desktop"),
        manifest_path=tmp_path / "squares.jsonl",
        squares_root=tmp_path / "sq",
    )

    assert stats == {
        "session_id": "rg-g",
        "frames": 3,
        "crops": 192,
        "overrides": 0,
        "skipped": 0,
        "unusable": 0,
        "fallback": 0,
    }
    manifest = (tmp_path / "squares.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(manifest) == 192
    first = json.loads(manifest[0])
    assert first["session_id"] == "rg-g" and first["frame"] == rows[0]["frame"][7:13]
