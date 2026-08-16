"""`chesslab realgames confirm` — the candidate is checked against the game that was played.

The comparison has to behave exactly like `RealGameScore.scoreMoves` on the Kotlin side, because
both sides report the same three numbers about the same runs; and the write has to leave
everything the tracker owns alone, because `moves[]`, `geometry` and `effective_config` are the
record of what happened, not of what a human thought about it.
"""

import json
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import config
from chesslab.occluded import interval_reference, score_cells, write_proposals
from chesslab.realgames import (
    LAST_INTERVAL_S,
    carry_repaired_geometry,
    confirm,
    decode_frames,
    ensure_export_profile,
    export_session,
    known_segments,
    lcs_report,
    plan_rows,
    unknown_for,
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


def test_the_pre_commit_window_names_what_it_cannot_vouch_for():
    """The user's find of 2026-08-09: a pawn plainly on e5 while the FEN still said empty.

    A commit lands after the move is physically over, so the window BEFORE it holds frames where
    the next move has already happened. Only that move's squares are in doubt — they are named
    `unknown_squares`, the rest of the board stays labelable, and the window AFTER a commit
    names nothing because its FEN is already true.
    """
    start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    after_e4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    after_e5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
    candidate = {
        "geometry": {"corners": [[0, 0], [1, 0], [1, 1], [0, 1]]},
        "clock": {"fps": 30.0},
        "created_at": "2026-08-09T00:00:00Z",
        "start_fen": start,
        "reviewed_plies": [1, 2],
        "moves": [
            {"ply": 1, "san": "e4", "frame": 0, "fen_after": after_e4},
            {"ply": 2, "san": "e5", "frame": 300, "fen_after": after_e5},
        ],
    }
    rows = plan_rows(candidate, margin_frames=30, every=10, dirty=True)
    trailing = [r for r in rows if 270 <= int(Path(r["frame"]).stem) < 300]
    leading = [r for r in rows if int(Path(r["frame"]).stem) < 30]
    assert trailing, "the pre-commit window must exist"
    assert all(r["unknown_squares"] == ["e5", "e7"] for r in trailing), trailing[0]
    assert all("unknown_squares" not in r for r in leading), "after a commit the FEN is true"
    assert all("unknown_squares" not in r for r in rows if not r.get("dirty"))


def test_a_pair_commit_marks_both_moves_squares_unknown():
    """The user's find of 2026-08-10: e4 and e5 committed on the SAME frame (a pair).

    The intermediate position never existed quietly — its zero-length segment is dropped — and
    the hand window BEFORE the pair contains BOTH moves' motion, so the previous segment's
    `unknown_squares` must span the whole same-frame group, not just its first move.
    """
    start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    after_e4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    after_e5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
    after_nf3 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"
    candidate = {
        "geometry": {"corners": [[0, 0], [1, 0], [1, 1], [0, 1]]},
        "clock": {"fps": 30.0},
        "created_at": "2026-08-10T00:00:00Z",
        "start_fen": start,
        "reviewed_plies": [1, 2, 3],
        "moves": [
            {"ply": 1, "san": "e4", "frame": 0, "fen_after": after_e4},
            {"ply": 2, "san": "e5", "frame": 300, "fen_after": after_e5},
            {"ply": 3, "san": "Nf3", "frame": 300, "fen_after": after_nf3},
        ],
    }
    rows = plan_rows(candidate, margin_frames=30, every=10, dirty=True)
    assert {r["ply"] for r in rows} == {1, 3}, "the zero-length pair segment contributes nothing"
    assert max(int(Path(r["frame"]).stem) for r in rows if r["ply"] == 3) < 300 + 30 * LAST_INTERVAL_S, (
        "ply 3 is last: its interval is the cap after the commit, not the rest of the video"
    )
    trailing = [r for r in rows if 270 <= int(Path(r["frame"]).stem) < 300]
    assert trailing and all(r["unknown_squares"] == ["e5", "e7", "f3", "g1"] for r in trailing), (
        "the window before a pair is in doubt about BOTH moves' squares"
    )


#: The commit frames of `2026-08-14-20-48-55`, whose 11th ply landed 713 frames before the end.
REAL_FRAMES = (133, 245, 395, 543, 993, 1129, 1235, 1405, 1609, 1813, 1987)
REAL_SANS = ("e4", "e5", "Nf3", "Nf6", "Nc3", "Nc6", "d3", "Bb4", "Bd2", "Nxe4", "Nxe4")


def _confirmed_eleven(*, frames=2700, reviewed=None):
    """`2026-08-14-20-48-55` in miniature: 11 plies, all confirmed, recording running well past
    the last commit — the players went on to play an untracked `Bxd2+` in that tail."""
    import chess

    board = chess.Board()
    moves = []
    for i, (san, frame) in enumerate(zip(REAL_SANS, REAL_FRAMES, strict=True), 1):
        board.push_san(san)
        moves.append({"ply": i, "san": san, "frame": frame, "fen_after": board.fen()})
    return {
        "clock": {"fps": 30.0},
        "created_at": "2026-08-14T20:16:41Z",
        "frames": frames,
        "geometry": {"corners": [[0, 0], [1, 0], [1, 1], [0, 1]]},
        "start_fen": chess.Board().fen(),
        "moves": moves,
        "reviewed_plies": list(range(1, 12)) if reviewed is None else reviewed,
    }


def test_every_confirmed_ply_owns_an_interval_including_the_last():
    """The defect of 2026-08-14: 11 confirmed plies, 10 exported intervals, ZERO rows for ply 11.

    The final position was the one the human had just vouched for and the only one never
    labelled, because the old rule needed a NEXT commit to close a segment and the last ply has
    none. It is closed by [LAST_INTERVAL_S] instead.
    """
    segs = known_segments(_confirmed_eleven())

    assert [s["ply"] for s in segs] == list(range(1, 12))
    assert segs[-1]["start"] == 1987 and segs[-1]["end"] == 1987 + 30 * LAST_INTERVAL_S
    assert segs[-1]["next_touches"] == [], "no next move, so nothing is in doubt"
    assert [s["end"] for s in segs[:-1]] == list(REAL_FRAMES[1:]), "the others still close on the next commit"


def test_nothing_is_exported_past_the_last_intervals_cap():
    """The tail after the final commit is unwitnessed — and on this recording it was WRONG.

    The tracker kept rejecting `Bxd2+` for 18 s while its own position still had the bishop on
    b4, so the players' 12th ply is in those frames and no interval may reach it. 2 s of video
    lost is the price for not labelling ~540 frames with a position that had ended.
    """
    cap = 1987 + 30 * LAST_INTERVAL_S
    rows = plan_rows(_confirmed_eleven(), margin_frames=30, every=3, dirty=True)

    assert [r for r in rows if r["ply"] == 11], "the last ply must reach the log"
    assert max(int(Path(r["frame"]).stem) for r in rows) < cap
    assert not [r for r in rows if int(Path(r["frame"]).stem) >= cap]


def test_a_capped_tail_never_runs_past_the_recording():
    """A commit in the last second: the cap is clamped to the frames the video actually holds."""
    segs = known_segments(_confirmed_eleven(frames=2000))

    assert segs[-1]["end"] == 2000


def test_a_reviewed_ply_naming_no_move_is_refused_loudly():
    """`reviewed_plies` is written from `moves[]` by both confirmers, so a ply that names no move
    means the two disagree about which ply is which — an off-by-one there shifts every position
    it stamps. Refuse rather than export the subset that happens to line up."""
    with pytest.raises(ValueError, match="reviewed_plies names ply"):
        known_segments(_confirmed_eleven(reviewed=list(range(2, 13))))


def test_decode_frames_applies_the_rotation(tmp_path):
    """Phone recordings: cv2 delivers a different orientation than the Kotlin reader the
    candidate geometry was measured in (2026-08-10) — `rotate` is `detect_rotation`'s verdict
    and every written frame must carry it."""
    import cv2
    import numpy as np

    from chesslab.realgames import decode_frames

    video = tmp_path / "v.avi"
    w = cv2.VideoWriter(str(video), cv2.VideoWriter_fourcc(*"MJPG"), 5, (64, 32))
    frame = np.zeros((32, 64, 3), np.uint8)
    frame[0:4, 0:4] = 255  # a corner dot that moves under rotation
    for _ in range(3):
        w.write(frame)
    w.release()

    out = tmp_path / "frames"
    arrived = decode_frames(video, {1}, out, rotate=cv2.ROTATE_90_COUNTERCLOCKWISE)
    assert arrived == {1}
    png = cv2.imread(str(out / "000001.png"))
    assert png.shape[:2] == (64, 32), "rotated 90°: width and height swap"
    assert png[-4:, 0:4].mean() > 100, "the top-left dot lands bottom-left under ccw"


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
    planned = plan_rows(cand, margin_frames=30, every=3, dirty=True)
    # Three quiet rows carry the conformance check; the dirty one pins the gate that holds a
    # hand-frame back until a human names its cells (tests/test_labeling_dirty.py).
    rows = [r for r in planned if not r.get("dirty")][:3] + [r for r in planned if r.get("dirty")][:1]
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
        "frames": 4,
        "crops": 192,
        "overrides": 0,
        "skipped": 0,
        "unusable": 0,
        # Zero here on purpose: this export names no `unknown_squares`, so the gate keeps proving
        # that a plain session still yields all 64 crops per frame (see tests/test_labeling_unknown).
        "unknown_dropped": 0,
        "dirty_dropped": 64,
        # No `grid_lines` in these rows, so every crop is cut at the nominal eighth.
        "mesh_frames": 0,
        "fallback": 0,
    }
    manifest = (tmp_path / "squares.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(manifest) == 192
    first = json.loads(manifest[0])
    assert first["session_id"] == "rg-g" and first["frame"] == rows[0]["frame"][7:13]


# --- propose-occluded (specs/53-02) -----------------------------------------------------------

E4 = 28  # `all_squares()` is a1..h1, a2..h2, ...


def _cells(seed, n, e4_seed=0):
    """`n` frames of ONE fixed 64-cell board plus sensor noise; `e4_seed` decides what is on e4."""
    base = np.random.default_rng(1000).integers(150, 255, (64, 32, 32, 3)).astype(float)
    if e4_seed:
        base[E4] = np.random.default_rng(e4_seed).integers(150, 255, (32, 32, 3))
    rng = np.random.default_rng(seed)
    return [
        [np.clip(c + rng.normal(0, 1.0, c.shape), 0, 255).astype(np.uint8) for c in base]
        for _ in range(n)
    ]


def _reference(frames):
    return interval_reference(frames, [[True] * 64] * len(frames))


def test_median_is_per_interval_not_global():
    """e4's new occupant is normal against ITS interval and an intruder against the previous one.

    A reference shared across intervals is the failure this guards: it would carry whatever piece
    stood on e4 before, and every square the game touched would read as occluded ever after.
    """
    first, second = _cells(1, 4, e4_seed=11), _cells(2, 4, e4_seed=22)
    dirty = _cells(3, 1, e4_seed=22)[0]

    own = score_cells(_reference(second), dirty)
    stale = score_cells(_reference(first), dirty)

    assert own[E4] < 0.3, "e4 is this interval's own normal"
    assert stale[E4] > 0.7, "against the previous interval's reference it is a change"
    assert max(v for i, v in enumerate(stale) if i != E4) < 0.3, "only e4 differs between them"


def test_a_replaced_cell_scores_high_a_darkened_cell_scores_low():
    """The phase's contract: an occluder replaces content, a shadow only darkens it."""
    clean = _cells(1, 4)
    reference = _reference(clean)
    replaced, shadow = _cells(5, 1)[0], _cells(6, 1)[0]
    replaced[E4] = _cells(7, 1, e4_seed=77)[0][E4]  # something else entirely
    shadow[E4] = (shadow[E4] * 0.5).astype(np.uint8)  # the same thing, in shade

    assert score_cells(reference, replaced)[E4] > 0.7
    assert score_cells(reference, shadow)[E4] < 0.3

    # RED against the naive scorer: absolute difference ranks the two the wrong way round, so any
    # threshold on it that catches the replacement catches the shadow first.
    ref = clean[0][E4].astype(int)
    naive_replaced = float(np.abs(replaced[E4].astype(int) - ref).mean())
    naive_shadow = float(np.abs(shadow[E4].astype(int) - ref).mean())
    assert naive_shadow > naive_replaced


def test_proposals_conform_to_the_pinned_schema(tmp_path):
    rows = [
        {
            "session_id": "rg-g",
            "frame": "004211",
            "square": "e2",
            "fen_label": "wQ",
            "proposed": "occluded",
            "score": 0.83,
        }
    ]

    path = write_proposals(tmp_path / "occluded-proposals.jsonl", rows, hi=0.7, lo=0.3)

    lines = path.read_text(encoding="utf-8").splitlines()
    assert json.loads(lines[0]) == {
        "_thresholds": {"hi": 0.7, "lo": 0.3, "model": None, "written_at": None}
    }
    row = json.loads(lines[1])
    assert list(row) == ["session_id", "frame", "square", "fen_label", "proposed", "score"]
    assert row["frame"] == "004211" and "/" not in row["frame"] and ".png" not in row["frame"]
    assert row["proposed"] in ("occluded", "keep") and 0.0 <= row["score"] <= 1.0
    assert isinstance(row["score"], float) and isinstance(row["fen_label"], str)


def test_decode_frames_walks_past_the_first_segment(tmp_path):
    """The recorder rotates its container once a minute (2026-08-13), and the candidate's frame
    indices count the WHOLE recording. Decoding only `video.mp4` cuts a confirmed game at minute
    one while the row counts still look healthy — so a wanted index that lives in `video-001.mp4`
    has to arrive, with the pixels of the second segment."""
    def write(path, value, n):
        w = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), 10, (32, 16))
        for _ in range(n):
            w.write(np.full((16, 32, 3), value, np.uint8))
        w.release()

    write(tmp_path / "video.mp4", 20, 4)
    write(tmp_path / "video-001.mp4", 200, 3)
    out = tmp_path / "frames"

    assert decode_frames(tmp_path / "video.mp4", {1, 5}, out) == {1, 5}
    assert cv2.imread(str(out / "000001.png")).mean() < 60, "index 1 is the first segment"
    assert cv2.imread(str(out / "000005.png")).mean() > 150, "index 5 is the second one"


def test_decode_frames_keeps_what_is_already_on_disk(tmp_path):
    """A re-export must not pay for pixels that cannot have changed.

    The video path here does NOT exist: if the decoder were entered at all it would raise, so
    returning the frames proves it was skipped. This is what makes re-running the export the way
    to pick up an exporter fix — two sessions sat on a pre-`unknown_squares` log because it was
    not (found 2026-08-09).
    """
    frames = tmp_path / "frames"
    frames.mkdir()
    for i in (30, 60):
        cv2.imwrite(str(frames / f"{i:06d}.png"), np.zeros((4, 4, 3), np.uint8))

    assert decode_frames(tmp_path / "no-such.mp4", {30, 60}, frames) == {30, 60}


def test_decode_frames_treats_an_empty_file_as_absent(tmp_path):
    """A truncated write must still repair — otherwise a half-written frame is permanent."""
    frames = tmp_path / "frames"
    frames.mkdir()
    (frames / "000030.png").write_bytes(b"")

    with pytest.raises(FileNotFoundError):
        decode_frames(tmp_path / "no-such.mp4", {30}, frames)


def _log(tmp_path, *rows):
    (tmp_path / "log.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8"
    )
    return tmp_path


def test_re_export_keeps_a_repaired_quad(tmp_path):
    """`session autofix` re-fits per frame; the exporter only knows the candidate's median.

    Measured 2026-08-09: a plain re-export put the median back over 11 fitted quads, moving
    corners by up to 16 px — a seventh of a cell, past the 4 % criterion.
    """
    fitted = [[1.0, 2.0], [3.0, 4.0], [5.0, 6.0], [7.0, 8.0]]
    _log(
        tmp_path,
        {
            "frame": "frames/000030.png",
            "corners": fitted,
            "corners_source": "auto-corrected",
            "align_worst_px": 2.1,
        },
    )
    planned = [{"frame": "frames/000030.png", "corners": [[0, 0]], "corners_source": "realgame-export"}]

    assert carry_repaired_geometry(tmp_path, planned) == 1
    assert planned[0]["corners"] == fitted
    assert planned[0]["corners_source"] == "auto-corrected"
    assert planned[0]["align_worst_px"] == 2.1


def test_a_measured_offset_is_carried_even_without_a_refit(tmp_path):
    """`scan` writes the verdict WITHOUT touching `corners_source` — keying on the source alone
    would silently drop every measurement it made."""
    _log(
        tmp_path,
        {"frame": "frames/000030.png", "corners": [[9, 9]], "corners_source": "realgame-export", "align_worst_px": 3.9},
    )
    planned = [{"frame": "frames/000030.png", "corners": [[0, 0]], "corners_source": "realgame-export"}]

    assert carry_repaired_geometry(tmp_path, planned) == 1
    assert planned[0]["align_worst_px"] == 3.9


def test_a_pristine_export_is_left_alone_so_new_candidate_geometry_flows_through(tmp_path):
    """Nothing was repaired, so the freshly planned quad wins — otherwise a re-measured candidate
    would be masked by its own earlier export."""
    _log(tmp_path, {"frame": "frames/000030.png", "corners": [[9, 9]], "corners_source": "realgame-export"})
    planned = [{"frame": "frames/000030.png", "corners": [[0, 0]], "corners_source": "realgame-export"}]

    assert carry_repaired_geometry(tmp_path, planned) == 0
    assert planned[0]["corners"] == [[0, 0]]


def test_the_export_fits_every_frame_and_marks_the_ones_it_cannot(tmp_path, monkeypatch):
    """rg-2026-08-13-19-34-23, 2026-08-14: the candidate's ONE median quad went out on all 137
    frames ~17 px off the board's own grooves, and only a hand-run `session scan` + `autofix`
    pulled it to 2.71 px. The same fit now runs per written frame at export time.

    A frame the fit cannot read keeps its inherited quad and says so — it must never vanish,
    because the unreadable ones are hands over the board and that is the material we are after.
    A frame whose quad the fit could not beat is a THIRD case and says so separately: 167 of
    20-48-55's 637 rows are that, and filing them under "failed" would invent damage.
    """
    from chesslab import alignment
    from chesslab.realgames import FIT_FAILED, FIT_KEPT, FIT_SOURCE, fit_rows_to_grid

    frames = tmp_path / "frames"
    frames.mkdir()
    cv2.imwrite(str(frames / "000030.png"), np.zeros((8, 8, 3), np.uint8))  # off the grid
    cv2.imwrite(str(frames / "000060.png"), np.full((8, 8, 3), 128, np.uint8))  # already on it
    cv2.imwrite(str(frames / "000090.png"), np.full((8, 8, 3), 255, np.uint8))  # hand over it
    fitted_quad = [[1.0, 1.0], [9.0, 1.0], [9.0, 9.0], [1.0, 9.0]]
    verdicts = {0.0: (fitted_quad, 17.4, 2.7), 128.0: (None, 1.9, float("nan"))}
    monkeypatch.setattr(
        alignment,
        "improve_quad",
        lambda frame, quad, profile: verdicts.get(
            frame.mean(), (None, float("nan"), float("nan"))
        ),
    )
    median = [[0.0, 0.0], [8.0, 0.0], [8.0, 8.0], [0.0, 8.0]]
    rows = [
        {"frame": f"frames/{i:06d}.png", "corners": median, "corners_source": "realgame-export"}
        for i in (30, 60, 90)
    ]

    from chesslab.realgames import _field_profile

    stats = fit_rows_to_grid(tmp_path, rows, _field_profile(median, (8, 8), 8))

    # `hands: 3` is the groove read's documented "full resolution or nothing": at 1 px per cell
    # every edge segment reads missing, so it accuses the whole board. Real exports run at 928+
    # (the 2026-08-16 sweep flagged 25 of 713 frames on 13-12-46-24), and a board this unreadable
    # has nothing labelable on it anyway — the flag only holds its crops back.
    assert stats == {FIT_SOURCE: 1, FIT_KEPT: 1, FIT_FAILED: 1, "mesh": 0, "hands": 3,
                     "median": 2.7, "max": 2.7}, "8x8 noise carries no grid lines"
    assert rows[0]["corners"] == fitted_quad and rows[0]["corners_source"] == FIT_SOURCE
    assert rows[0]["align_worst_px"] == 2.7, "the number a later `session scan` will confirm"
    assert rows[1]["corners"] == median and rows[1]["corners_source"] == FIT_KEPT
    assert rows[1]["align_worst_px"] == 1.9, "measurable, just not improvable"
    assert rows[2]["corners"] == median, "an unreadable frame keeps the quad it inherited"
    assert rows[2]["corners_source"] == FIT_FAILED and "align_worst_px" not in rows[2]


def test_a_re_export_backs_up_the_log_it_replaces(tmp_path, monkeypatch):
    """A session log can hold hand-set quads and a review's verdicts, and a re-export overwrites
    it whole. Same `log.jsonl.bak.<stamp>` convention as `session scan|autofix|adopt`."""
    cand = _export_candidate(tmp_path, monkeypatch)
    session_dir = config.DATA.sessions / "rg-g"
    session_dir.mkdir(parents=True)
    (session_dir / "log.jsonl").write_text('{"frame": "frames/000030.png"}\n', encoding="utf-8")

    write_session(session_dir, "g", cand, [{"frame": "frames/000060.png"}])

    backups = list(session_dir.glob("log.jsonl.bak.*"))
    assert len(backups) == 1
    assert "000030" in backups[0].read_text(encoding="utf-8"), "the replaced log, kept whole"
    assert "000060" in (session_dir / "log.jsonl").read_text(encoding="utf-8")


def test_decode_refuses_to_mix_raw_frames_into_an_undistorted_set(tmp_path):
    """A PNG does not say whether the barrel was taken out of it.

    Adding one raw frame to a set written by `:desktop undistort` yields a silently MIXED session
    — the failure specs/52 measured from the other side (lens-corrected inference against a
    distorted corpus took 003957 from 67 plies to 15).
    """
    frames = tmp_path / "frames"
    frames.mkdir()
    cv2.imwrite(str(frames / "000030.png"), np.zeros((4, 4, 3), np.uint8))
    (frames / "lens.json").write_text('{"undistorted": true}', encoding="utf-8")

    # 30 is present, 33 is not — the missing one is what must not be decoded raw.
    with pytest.raises(ValueError, match="undistorted"):
        decode_frames(tmp_path / "no-such.mp4", {30, 33}, frames)

    # With nothing missing there is nothing to refuse.
    assert decode_frames(tmp_path / "no-such.mp4", {30}, frames) == {30}


def _seg(ply=1, start=100, end=400, touches=("e5", "e7")):
    return {"ply": ply, "fen": AFTER_1, "start": start, "end": end, "next_touches": list(touches)}


def test_a_measured_settle_protects_earlier_than_the_margin(tmp_path):
    """The correction of 2026-08-09: the engine commits on QUIET, not on arrival.

    Measured on VID_20260726_233432: 5 of 15 changed squares were visibly moved for longer than
    the 1 s margin before their commit, `Nxe5`/f3 by 4.6 s. A constant margin cannot cover a
    number that varies by an order of magnitude per move, so the settle frame is measured and
    each square is unknown from ITS OWN.
    """
    seg = _seg(end=400)
    settle = {2: {"e5": 250, "e7": 380}}  # e5 changed 150 frames before the commit, e7 only 20

    # Well before the fixed window (which starts at 370) — the old rule named nothing here.
    assert unknown_for(seg, 300, margin_frames=30, settle=settle) == ["e5"]
    assert unknown_for(seg, 200, margin_frames=30, settle=settle) == []
    assert unknown_for(seg, 385, margin_frames=30, settle=settle) == ["e5", "e7"]


def test_without_a_measurement_the_fixed_window_still_applies(tmp_path):
    """A square whose before and after look alike yields no settle point. It must not fall through
    to 'vouched for' — the old rule is the floor, not a fallback nobody reaches."""
    seg = _seg(end=400)

    assert unknown_for(seg, 300, margin_frames=30, settle=None) == []
    assert unknown_for(seg, 375, margin_frames=30, settle=None) == ["e5", "e7"]
    assert unknown_for(seg, 375, margin_frames=30, settle={}) == ["e5", "e7"]


def test_a_segment_with_no_next_move_vouches_for_everything():
    assert unknown_for(_seg(touches=()), 399, margin_frames=30, settle={2: {"e5": 1}}) == []


# --- fit-stored -----------------------------------------------------------------------------

#: The synthetic session's true playing field (a8, h8, h1, a1) and the board rendered into it.
FIELD = [[240.0, 180.0], [1180.0, 200.0], [1150.0, 1060.0], [210.0, 1020.0]]
FIT_BS = 800
FIT_CELL = FIT_BS / 8
FIT_BORDER = int(round(0.8 * FIT_CELL))
#: The outset the markers really have here — the recorder logs its quad as if it were 0.045.
TRUE_MARGIN = 0.058


def _rendered_board():
    """A rectified board with a surround: alternating squares and a groove on every cell edge."""
    n = FIT_BS + 2 * FIT_BORDER
    img = np.full((n, n, 3), 175, np.uint8)
    img[FIT_BORDER:FIT_BORDER + FIT_BS, FIT_BORDER:FIT_BORDER + FIT_BS] = 205
    for f in range(8):
        for r in range(8):
            if (f + r) % 2 == 0:
                x, y = FIT_BORDER + int(f * FIT_CELL), FIT_BORDER + int(r * FIT_CELL)
                img[y:y + int(FIT_CELL), x:x + int(FIT_CELL)] = 70
    for k in range(9):
        p = FIT_BORDER + int(round(k * FIT_CELL))
        img[p - 2:p + 3, :] = 20
        img[:, p - 2:p + 3] = 20
    return cv2.GaussianBlur(img, (0, 0), 1.0)


def _board_points(margin: float):
    m = margin * FIT_BS
    return np.array([[-m, -m, 1.0], [FIT_BS + m, -m, 1.0],
                     [FIT_BS + m, FIT_BS + m, 1.0], [-m, FIT_BS + m, 1.0]]).T


def _to_image(points):
    from chesslab.calibration import compute_homography

    h = np.array(compute_homography(FIELD, FIT_BS, 0.0), np.float64)
    out = np.linalg.inv(h) @ points
    return [[float(x), float(y)] for x, y in (out[:2] / out[2]).T]


def _stored_session(tmp_path, monkeypatch):
    """A bundle whose stored session holds one clean frame and one with the board covered."""
    from chesslab.calibration import compute_homography

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    session = tmp_path / "data" / "realgames" / "g" / "files" / "sessions" / "20260812-222357"
    (session / "frames").mkdir(parents=True)
    h = np.array(compute_homography(FIELD, FIT_BS, 0.0), np.float64)
    shift = np.eye(3)
    shift[:2, 2] = (-FIT_BORDER, -FIT_BORDER)
    frame = cv2.warpPerspective(_rendered_board(), np.linalg.inv(h) @ shift, (1400, 1200))
    cv2.imwrite(str(session / "frames" / "0000.jpg"), frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
    cv2.imwrite(str(session / "frames" / "0001.jpg"), np.full_like(frame, 120))
    logged = _to_image(_board_points(TRUE_MARGIN))
    (session / "log.jsonl").write_text(
        "".join(json.dumps({"frame": f"frames/{s}.jpg", "ply": 1, "fen": START, "corners": logged})
                + "\n" for s in ("0000", "0001")),
        encoding="utf-8",
    )
    return session, logged


def _corner_error(quad) -> float:
    return float(np.abs(np.asarray(quad, float) - np.asarray(FIELD, float)).max())


def test_fit_stored_writes_the_field_quad_the_markers_missed(tmp_path, monkeypatch):
    """The logged quad carries the recorder's constant 0.045 outset, and the real one differs per
    session (measured 2026-08-15: up to 14 px, an eighth of a cell, in the crops that are trained
    on AND labelled). The board's own grid is the ruler that finds the playing field anyway."""
    from chesslab.realgames import (
        FIT_METHOD,
        QUAD_FIT_NAME,
        field_quad,
        fit_stored,
        measured_board_size,
    )

    session, logged = _stored_session(tmp_path, monkeypatch)
    size = measured_board_size(logged)
    assumed = field_quad(logged, size, config.DEFAULT_MARKER_MARGIN)
    assert _corner_error(assumed) > 5.0, "the fixture must actually be off, or it proves nothing"

    fit_stored("g")

    written = json.loads((session / QUAD_FIT_NAME).read_text(encoding="utf-8"))
    assert set(written) == {"margin", "frames", "failed", "method", "source_margin", "written_at"}
    assert written["margin"] == 0.0 and written["source_margin"] == config.DEFAULT_MARKER_MARGIN
    assert written["method"] == FIT_METHOD
    assert _corner_error(written["frames"]["0000"]["corners"]) < 2.0
    assert written["frames"]["0000"]["align_worst_px"] < 0.04 * size / 8

    # The mesh: offsets near k/8, tilts and curvatures near 0, on this clean rendered board.
    mesh = written["frames"]["0000"]["grid_lines"]
    assert sorted(mesh) == ["cx", "cy", "tx", "ty", "x", "y"]
    assert all(len(mesh[key]) == 9 for key in mesh)
    for axis in ("x", "y"):
        assert all(abs(v - k / 8) < 0.01 for k, v in enumerate(mesh[axis]))
    for axis in ("tx", "ty", "cx", "cy"):
        assert all(abs(v) < 0.01 for v in mesh[axis])


def test_grid_line_fracs_refuses_nan_and_unsorted_lines(monkeypatch):
    """A NaN in the JSON would break both consumer parsers on the WHOLE sidecar; a bad
    curvature only costs its own stage, never the linear mesh."""
    from chesslab.realgames import grid_line_fracs

    img = np.full((120, 120, 3), 128, np.uint8)
    quad = [[10.0, 10.0], [90.0, 10.0], [90.0, 90.0], [10.0, 90.0]]
    nominal_x = [round(k / 8, 5) for k in range(9)]

    def fake(slope=0.0, value=None, curl=(0.0, 0.0)):
        def lines_and_curls(warped, bs, *, pad=0, **kw):
            lines = [[(0.0, pad + k * bs / 8) for k in range(9)] for _ in range(2)]
            lines[0][3] = (slope, value if value is not None else lines[0][3][1])
            return lines, [[curl for _ in range(9)] for _ in range(2)]
        return lines_and_curls

    from chesslab import alignment

    def patch(f):
        monkeypatch.setattr(alignment, "grid_lines_with_curvature", f)
    patch(fake(value=float("nan")))
    assert grid_line_fracs(img, quad, 80) is None
    patch(fake(value=0.0))
    assert grid_line_fracs(img, quad, 80) is None
    patch(fake(slope=0.06))
    assert grid_line_fracs(img, quad, 80) is None
    patch(fake(slope=float("nan")))
    assert grid_line_fracs(img, quad, 80) is None

    linear = {"x": nominal_x, "y": nominal_x,
              "tx": [0.0, 0.0, 0.0, 0.03, 0.0, 0.0, 0.0, 0.0, 0.0], "ty": [0.0] * 9}
    patch(fake(slope=0.03, curl=None))
    assert grid_line_fracs(img, quad, 80) == linear
    patch(fake(slope=0.03, curl=(0.0, 80 * 0.09)))
    assert grid_line_fracs(img, quad, 80) == linear
    patch(fake(slope=0.03, curl=(0.0, float("nan"))))
    assert grid_line_fracs(img, quad, 80) == linear
    patch(fake(slope=0.03, curl=(0.8, 80 * 0.01)))
    assert grid_line_fracs(img, quad, 80) == {
        **linear, "x": [round(k / 8 + 0.01, 5) for k in range(9)],
        "y": [round(k / 8 + 0.01, 5) for k in range(9)],
        "cx": [0.01] * 9, "cy": [0.01] * 9}


def test_a_frame_whose_grid_cannot_be_read_is_named_not_patched(tmp_path, monkeypatch):
    """A hand over the board must fail LOUDLY: the consumer keeps the logged marker quad for it,
    and a silently invented quad would move every crop of that frame."""
    from chesslab.realgames import QUAD_FIT_NAME, fit_stored

    session, _ = _stored_session(tmp_path, monkeypatch)

    fit_stored("g")

    written = json.loads((session / QUAD_FIT_NAME).read_text(encoding="utf-8"))
    assert written["failed"] == ["0001"]
    assert "0001" not in written["frames"]


def test_a_re_run_replaces_the_sidecar_and_leaves_no_partial(tmp_path, monkeypatch):
    """Derived file: re-running is how a consumer picks up a fixed fit."""
    from chesslab.realgames import QUAD_FIT_NAME, fit_stored

    session, _ = _stored_session(tmp_path, monkeypatch)
    (session / QUAD_FIT_NAME).write_text('{"frames": {}}\n', encoding="utf-8")

    fit_stored("g")

    written = json.loads((session / QUAD_FIT_NAME).read_text(encoding="utf-8"))
    assert "0000" in written["frames"]
    assert list(session.glob("*.tmp")) == []


def test_fit_stored_says_so_when_a_bundle_has_no_stored_session(tmp_path, monkeypatch):
    from chesslab.realgames import fit_stored

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    (tmp_path / "data" / "realgames" / "g").mkdir(parents=True)

    with pytest.raises(FileNotFoundError):
        fit_stored("g")
