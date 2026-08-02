"""`scripts/label_real_game.py` — the candidate a human still has to agree with.

What these pin down is the trap the pack exists for, not the arithmetic. The tracker's own
output is not ground truth: in the game that motivated this (83 plies, 2026-08-02) 55 of 91
commits came through `cnn_recovery` and the user corrected three by hand. So the invariants
under test are that a written candidate is UNCONFIRMED, that it records an illegal line rather
than hiding it, and that its video reference cannot point outside `data/`.

No footage required. The end-to-end run over a real video is marked `clips` and lives at the
bottom, so `uv run pytest -q` (which is `-m 'not clips'`) is unaffected and a fresh clone stays
green.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import pytest

_ROOT = Path(__file__).resolve().parents[1]


def _module():
    """Load the script by path — `scripts/` is not a package."""
    sys.path.insert(0, str(_ROOT / "scripts"))
    spec = importlib.util.spec_from_file_location(
        "label_real_game", _ROOT / "scripts" / "label_real_game.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


lrg = _module()

# A plausible phone quad in [a8, h8, h1, a1] order, taken from the shape of the 2026-08-02
# `phone` profile (1080x1920 portrait, board filling most of the frame).
QUAD = [[82.3, 1153.6], [93.5, 231.1], [997.2, 278.5], [986.0, 1201.0]]


def _perturb(quad, dx, dy, corner=0):
    out = [list(p) for p in quad]
    out[corner][0] += dx
    out[corner][1] += dy
    return out


# --- the median quad ------------------------------------------------------------------

def test_one_gross_outlier_does_not_move_the_median_quad():
    """The reason the reference is a median and not a mean.

    A single mis-resolved marker throws a corner by hundreds of pixels. With 20 clean frames and
    one such frame the mean corner moves by outlier/21 — tens of pixels — while the median does
    not move at all, because it is still bracketed by the clean values on both sides.
    """
    clean = [QUAD] * 20
    outlier = _perturb(QUAD, 400.0, -300.0)
    med = lrg.median_quad([*clean, outlier])
    assert np.allclose(med, QUAD, atol=1e-9)
    mean = np.mean(np.asarray([*clean, outlier], dtype=float), axis=0)
    assert np.linalg.norm(mean[0] - np.asarray(QUAD[0])) > 15.0


def test_median_quad_is_none_when_nothing_detected():
    assert lrg.median_quad([None, None]) is None


def test_quad_spread_is_zero_for_the_reference_and_grows_with_the_error():
    """A frame that IS the reference contributes no spread; a nudged corner shows up scaled
    into rectified pixels, where a cell is `board_size / 8` across."""
    zero = lrg.quad_spread([QUAD], QUAD, 800, 0.05)
    assert zero.shape == (1,)
    # 1e-3 and not 0: `compute_homography` solves in float32 (`getPerspectiveTransform` takes
    # CV_32F), so the round trip leaves ~2e-5 rectified px. Four orders of magnitude under the
    # measurement's own resolution and not worth a float64 reimplementation to remove.
    assert zero[0] == pytest.approx(0.0, abs=1e-3)
    moved = lrg.quad_spread([_perturb(QUAD, 10.0, 0.0)], QUAD, 800, 0.05)
    assert moved[0] > 1.0
    # Undetected frames contribute nothing rather than a zero, which would flatter the median.
    assert lrg.quad_spread([None, QUAD], QUAD, 800, 0.05).shape == (1,)


# --- the clock ------------------------------------------------------------------------

def test_the_clock_check_separates_a_uniform_source_from_a_jittery_one():
    """`fps` is the virtual clock's step, so a variable-rate source does not make the replay
    slightly wrong — it makes every wall-clock knob mean a different number of seconds in
    every second of the video."""
    uniform = [i * (1000.0 / 30.0) for i in range(300)]
    assert float(np.max(lrg.clock_error(uniform, 30.0))) == pytest.approx(0.0, abs=1e-9)
    jittery = list(uniform)
    for i in range(100, 300):
        jittery[i] += 25.0                       # a 25 ms step: nearly a whole frame period
    assert float(np.max(lrg.clock_error(jittery, 30.0))) > 20.0


def test_clock_error_of_a_single_frame_is_empty_rather_than_zero():
    assert lrg.clock_error([0.0], 30.0).size == 0


def test_the_ffmpeg_hint_names_the_source_rate_and_a_new_file():
    hint = lrg.ffmpeg_cfr_hint(Path("data/testclip-raw/g.mp4"), 30.0)
    assert "-r 30" in hint and "g-cfr.mp4" in hint and "-vsync cfr" in hint


# --- the video reference --------------------------------------------------------------

def _data_root(tmp_path, monkeypatch):
    from chesslab import config
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    (tmp_path / "data" / "testclip-raw").mkdir(parents=True)
    return tmp_path / "data"


def test_the_video_is_stored_relative_to_data_with_no_escape(tmp_path, monkeypatch):
    """The app has no authentication anywhere and already mounts the whole `data/` tree at
    `/img`. A candidate that could name a file outside it would be the one new way in."""
    root = _data_root(tmp_path, monkeypatch)
    video = root / "testclip-raw" / "g.mp4"
    video.write_bytes(b"")
    rel = lrg.relative_video(video)
    assert rel == "testclip-raw/g.mp4"
    assert ".." not in rel and ":" not in rel and not rel.startswith("/")


def test_a_video_outside_data_is_refused(tmp_path, monkeypatch):
    _data_root(tmp_path, monkeypatch)
    outside = tmp_path / "elsewhere.mp4"
    outside.write_bytes(b"")
    with pytest.raises(SystemExit) as e:
        lrg.relative_video(outside)
    assert "under" in str(e.value)


# --- the artefact ---------------------------------------------------------------------

def _candidate(**over) -> dict:
    base = {
        "name": "t", "video": "testclip-raw/g.mp4", "confirmed": False,
        "created_at": "2026-08-02T21:14:03Z",
        "source": {"cnn_run": "r", "obs_s": 0.3, "profile": "phone", "tracker": {}, "context": 2},
        "effective_config": {}, "geometry": {}, "clock": {}, "start_fen": None,
        "moves": [], "note": "", "observations": 0, "frames": 0, "frames_written": 0,
    }
    base.update(over)
    return base


def test_a_written_candidate_is_always_unconfirmed(tmp_path, monkeypatch):
    """Asserted on the FILE, not on an in-memory object: the invariant belongs to the artefact.

    `confirmed` is the whole defence against a fixture that freezes the tracker's mistakes and
    then asserts forever that it keeps making them. This script never writes anything else, the
    review page is the only thing that flips it, and `--adopt` is the only thing that reads it.
    """
    _data_root(tmp_path, monkeypatch)
    path = lrg.write_candidate(_candidate(confirmed=True))
    # Even handed a dict that claims otherwise, what lands on disk says false.
    assert json.loads(path.read_text(encoding="utf-8"))["confirmed"] is False


def test_an_illegal_line_is_still_written(tmp_path, monkeypatch):
    """**The script does not judge the line.** A candidate that refused to record an illegal
    sequence would hide the single most useful signal a reviewer has — the replay-impossible
    tier is the only one with no false positives."""
    _data_root(tmp_path, monkeypatch)
    impossible = [{"ply": 1, "san": "e4", "uci": "e2e4"},
                  {"ply": 2, "san": "e5", "uci": "e7e5"},
                  {"ply": 3, "san": "Qh8", "uci": "d1h8"}]     # not legal from that prefix
    path = lrg.write_candidate(_candidate(moves=impossible))
    written = json.loads(path.read_text(encoding="utf-8"))
    assert [m["san"] for m in written["moves"]] == ["e4", "e5", "Qh8"]
    assert written["confirmed"] is False


def test_writing_twice_replaces_rather_than_appends(tmp_path, monkeypatch):
    _data_root(tmp_path, monkeypatch)
    lrg.write_candidate(_candidate(moves=[{"ply": 1, "san": "e4"}]))
    path = lrg.write_candidate(_candidate(moves=[]))
    assert json.loads(path.read_text(encoding="utf-8"))["moves"] == []
    assert not list(path.parent.glob("*.tmp"))


# --- the review frames ----------------------------------------------------------------

class _FakeBoard:
    def __init__(self) -> None:
        self.move_stack: list[int] = []


class _FakeTracker:
    def __init__(self) -> None:
        self.board = _FakeBoard()


def test_review_frames_cover_a_symmetric_neighbourhood_of_every_commit(tmp_path):
    """A frame at the commit instant usually still shows the hand that caused it, so the
    reviewer needs the neighbours. They are written DURING the decode because h.264 seeking by
    index is approximate — a page that sought would show a nearby frame and claim it is the one.
    """
    frames = lrg._ReviewFrames(tmp_path / "frames", context=2)
    mt = _FakeTracker()
    frame = np.zeros((16, 16, 3), np.uint8)
    for i in range(12):
        if i == 5:
            mt.board.move_stack.append(1)
        frames.on_frame(0.0, mt, frame, i)
    written = sorted(int(p.stem) for p in (tmp_path / "frames").glob("*.jpg"))
    assert written == [3, 4, 5, 6, 7]


def test_a_bridge_shares_one_set_of_pictures(tmp_path):
    """Keyed by frame INDEX, not by ply: a recovery bridge commits several plies on one frame
    and there is only one picture of that moment."""
    frames = lrg._ReviewFrames(tmp_path / "frames", context=1)
    mt = _FakeTracker()
    frame = np.zeros((16, 16, 3), np.uint8)
    for i in range(6):
        if i == 3:
            mt.board.move_stack.extend([1, 2, 3])      # a three-move recovery, one frame
        frames.on_frame(0.0, mt, frame, i)
    assert sorted(int(p.stem) for p in (tmp_path / "frames").glob("*.jpg")) == [2, 3, 4]


def test_review_frames_near_the_start_write_what_exists(tmp_path):
    """A commit on frame 0 has no `before` context. Writing what there is beats refusing."""
    frames = lrg._ReviewFrames(tmp_path / "frames", context=3)
    mt = _FakeTracker()
    mt.board.move_stack.append(1)
    frames.on_frame(0.0, mt, np.zeros((8, 8, 3), np.uint8), 0)
    for i in range(1, 5):
        frames.on_frame(0.0, mt, np.zeros((8, 8, 3), np.uint8), i)
    assert sorted(int(p.stem) for p in (tmp_path / "frames").glob("*.jpg")) == [0, 1, 2, 3]


# --- end to end, needs footage --------------------------------------------------------

@pytest.mark.clips
def test_a_real_candidate_indexes_pictures_that_exist():
    """The one test that needs a video. Skips cleanly without one, as `test_clips.py` does."""
    from chesslab import config

    root = config.DATA.root / "realgames"
    found = sorted(root.glob("*/candidate.json")) if root.exists() else []
    if not found:
        pytest.skip("no candidate under data/realgames (built locally, never committed)")
    cand = json.loads(found[0].read_text(encoding="utf-8"))
    frames_dir = found[0].parent / "frames"
    assert cand["moves"], "a candidate with no moves says nothing about the replay"
    for m in cand["moves"]:
        assert (frames_dir / f"{m['frame']:06d}.jpg").exists(), f"ply {m['ply']} has no picture"
    assert [m["ply"] for m in cand["moves"]] == list(range(1, len(cand["moves"]) + 1))
    assert cand["confirmed"] is False
