"""TODO sweep 2026-09-15 — the defects the `# TODO:` markers in `src/chesslab` named.

One case per fund, each red before its fix. Ordered like the report: the four that destroy data
first, the smaller ones after.
"""

from __future__ import annotations

import json
import threading
import types
from pathlib import Path

import numpy as np
import pytest

# --- occluders._sample: a failed decode must not enter the median -----------------------


class _Cap:
    """Enough of a `cv2.VideoCapture` for the plate samplers: `set`, `read`, nothing else."""

    def __init__(self, frame: np.ndarray, fail_every: int = 0):
        self.frame, self.fail_every, self.n = frame, fail_every, 0

    def set(self, *_a) -> bool:
        return True

    def read(self):
        self.n += 1
        if self.fail_every and self.n % self.fail_every == 0:
            return False, None
        return True, self.frame.copy()


def test_sample_drops_failed_decodes_instead_of_stacking_black():
    """Every second read fails: the black filler halves the plate's median (200 -> 100)."""
    from chesslab import occluders

    frame = np.full((16, 16, 3), 200, np.uint8)
    stack = occluders._sample(_Cap(frame, fail_every=2), 96, (8, 8))
    assert float(np.median(stack)) == pytest.approx(200.0)
    assert int(stack.min()) > 0


def test_sample_says_so_when_nothing_decoded():
    from chesslab import occluders

    with pytest.raises(ValueError, match="no frame"):
        occluders._sample(_Cap(np.zeros((16, 16, 3), np.uint8), fail_every=1), 96, (8, 8))


# --- retime._write_boards: the old review set survives a broken decode -------------------


def test_write_boards_keeps_the_old_set_when_the_decoder_dies(tmp_path, monkeypatch):
    """A decoder abort mid-run used to leave the folder empty: old deleted, new never written."""
    import cv2

    from chesslab import calibration, recording, retime

    out = tmp_path / "frames"
    out.mkdir()
    (out / "000001.webp").write_bytes(b"old")

    class _Rec:
        def __init__(self, _video):
            pass

        def take(self, _wanted, _rotate):
            yield 1, np.zeros((4, 4, 3), np.uint8)
            raise RuntimeError("decoder died")

    monkeypatch.setattr(recording, "Recording", _Rec)
    monkeypatch.setattr(calibration, "warp_padded", lambda *a, **k: np.zeros((4, 4, 3), np.uint8))
    monkeypatch.setattr(cv2, "imwrite", lambda *a, **k: True)
    profile = types.SimpleNamespace(board_size=4)
    plies = [types.SimpleNamespace(frame=1, frame_review=1)]

    with pytest.raises(RuntimeError):
        retime._write_boards(out, tmp_path / "v.mp4", None, plies, [None], profile, 0, [])
    assert (out / "000001.webp").read_bytes() == b"old"
    assert not list(out.glob("*.tmp"))


def test_write_boards_replaces_the_set_on_success(tmp_path, monkeypatch):
    import cv2

    from chesslab import calibration, recording, retime

    out = tmp_path / "frames"
    out.mkdir()
    (out / "000099.webp").write_bytes(b"old")

    class _Rec:
        def __init__(self, _video):
            pass

        def take(self, _wanted, _rotate):
            yield 1, np.zeros((4, 4, 3), np.uint8)

    monkeypatch.setattr(recording, "Recording", _Rec)
    monkeypatch.setattr(calibration, "warp_padded", lambda *a, **k: np.zeros((4, 4, 3), np.uint8))
    monkeypatch.setattr(cv2, "imwrite", lambda p, *a, **k: bool(Path(p).write_bytes(b"new") or True))
    profile = types.SimpleNamespace(board_size=4)
    plies = [types.SimpleNamespace(frame=1, frame_review=1)]

    assert retime._write_boards(out, tmp_path / "v.mp4", None, plies, [None], profile, 0, []) == 1
    assert sorted(p.name for p in out.iterdir()) == ["000001.webp"]


# --- session_writer.capture: no log line for a frame that was never written -------------


def _writer(tmp_path):
    from chesslab.session_writer import SessionWriter

    return SessionWriter(tmp_path / "s", session_id="s", profile="p", mode="play",
                         camera_index=-1, frame_size=(4, 4))


def test_capture_refuses_to_log_a_frame_it_could_not_write(tmp_path, monkeypatch):
    """The directory vanishes under the writer: `log.jsonl` used to gain a row for a ghost file."""
    import cv2

    w = _writer(tmp_path)
    before = w.log_path.read_text(encoding="utf-8") if w.log_path.exists() else ""
    monkeypatch.setattr(cv2, "imwrite", lambda *a, **k: False)
    with pytest.raises(OSError, match="could not write frame"):
        w.capture(np.zeros((4, 4, 3), np.uint8), ply=0, fen="x")
    after = w.log_path.read_text(encoding="utf-8") if w.log_path.exists() else ""
    assert after == before
    assert w.entries == []


# --- composite.read_forward: leaving the generator early releases the capture ------------


def test_read_forward_releases_its_capture_when_the_consumer_leaves(monkeypatch):
    """Without a stop event the pump blocks in `q.put` forever and never releases the video."""
    from chesslab import composite

    released = threading.Event()

    class _Video:
        def grab(self) -> bool:
            return True

        def retrieve(self):
            return True, np.zeros((2, 2, 3), np.uint8)

        def release(self) -> None:
            released.set()

    monkeypatch.setattr(composite.cv2, "VideoCapture", lambda _p: _Video())
    gen = composite.read_forward(Path("x.mp4"), 1, depth=1)
    next(gen)
    gen.close()
    assert released.wait(3.0), "pump thread still holds the VideoCapture"


# --- sessions.adopt_corners: an out-of-range --from-index must not clamp silently --------


def test_adopt_corners_refuses_an_out_of_range_from_index(tmp_path, monkeypatch):
    """`--from-index 500` on 2 rows used to adopt row 1 and report it as `from_index`."""
    from chesslab import sessions

    sdir = tmp_path / "sess"
    sdir.mkdir()
    rows = [{"frame": "frames/0000.png", "corners": [[0, 0], [1, 0], [1, 1], [0, 1]]},
            {"frame": "frames/0001.png"}]
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    monkeypatch.setattr(sessions, "session_dir", lambda _s: (sdir, False))

    with pytest.raises(ValueError, match="out of range"):
        sessions.adopt_corners("sess", from_index=500)


# --- train: `--balance` is a closed set, not free text -----------------------------------


def test_balance_rejects_a_typo():
    """A typo fell through to `situation` silently and was written to `config.json` as the typo."""
    from chesslab.training import train

    with pytest.raises(ValueError, match="situaton"):
        train.check_balance("situaton")
    for good in train.BALANCE_MODES:
        assert train.check_balance(good) == good


# --- manifest_cache: a caller must not be able to poison every later answer --------------


def test_manifest_stats_hands_out_a_copy(tmp_path):
    from chesslab import manifest_cache

    path = tmp_path / "m.jsonl"
    path.write_text(json.dumps({"session_id": "a"}) + "\n", encoding="utf-8")
    manifest_cache.manifest_stats(path)["crops_by_session"]["a"] = 999
    assert manifest_cache.manifest_stats(path)["crops_by_session"] == {"a": 1}


# --- quantize: `mm://` rows are named, not a bare OSError --------------------------------


def test_quantize_names_the_packed_rows_it_cannot_open():
    from chesslab.training import quantize

    with pytest.raises(ValueError, match="mm://"):
        quantize._make_reader([{"path": "mm://p/0/e2"}], "input", {})


# --- dataset.validate_split: one finding, not two --------------------------------------


def test_validate_split_does_not_report_the_same_finding_twice():
    """`make_split` and `validate_split` word the same finding differently, so the `w not in
    errors` filter never matched and an empty val split was printed as error AND warning."""
    from chesslab import dataset

    split = {"classes": ["wP"], "splits": {"train": ["a"], "val": [], "test": []},
             "counts": {"train": 1, "val": 0, "test": 0},
             "warnings": ["val split is empty (too few sessions).",
                          "test split is empty (too few sessions).",
                          "Class wP only in one session -> clean evaluation impossible."]}
    rows = [{"label": "wP", "session_id": "a"}]
    errors, warnings = dataset.validate_split(split, rows)
    assert len(errors) == 3
    assert warnings == []


# --- plan_scanned: the profile's point of view has to reach `classify` -------------------


def test_plan_scanned_forwards_white_pov_to_classify(monkeypatch):
    """`classify` never saw anything but True, so a black-POV profile mapped `next_touches`
    onto the squares rotated by 180 degrees — `cell_sharpness` had the same defect."""
    from chesslab import framescan, realgames

    seen = {}

    def _classify(_segment, _scan, **kw):
        seen.update(kw)
        return {}

    monkeypatch.setattr(framescan, "classify", _classify)
    monkeypatch.setattr(framescan, "blurred_indices", lambda _s: set())
    monkeypatch.setattr(framescan, "dark_indices", lambda _s: set())
    monkeypatch.setattr(realgames, "known_segments", lambda _c: [{"start": 0, "end": 1}])
    monkeypatch.setattr(realgames, "base_time", lambda _c: __import__("datetime").datetime(2026, 1, 1))
    monkeypatch.setattr(realgames, "video_fps", lambda _c: 30.0)
    candidate = {"geometry": {"corners": [[0, 0], [1, 0], [1, 1], [0, 1]]}}

    realgames.plan_scanned(candidate, [{"idx": 0}], margin_frames=0, white_pov=False)
    assert seen.get("white_pov") is False


# --- merge_fit_stats: a FIT_FAILED row was never measured --------------------------------


def test_merge_fit_stats_ignores_a_carried_align_worst_px():
    """`--workers 4` reported a spread the serial run does not: a FIT_FAILED row keeps the
    `align_worst_px` `carry_repaired_geometry` copied from the last export."""
    from chesslab import realgames

    part = {realgames.FIT_SOURCE: 1, realgames.FIT_KEPT: 0, realgames.FIT_FAILED: 1,
            "mesh": 0, "hands": 0, "late": 0,
            "arrived": [{"corners_source": realgames.FIT_SOURCE, "align_worst_px": 1.0},
                        {"corners_source": realgames.FIT_FAILED, "align_worst_px": 99.0}]}
    merged = realgames.merge_fit_stats([part])
    assert (merged["median"], merged["max"]) == (1.0, 1.0)


# --- scan_discover: one mesh rule, not two ----------------------------------------------


def test_discover_scans_and_pick_mesh_agree(tmp_path):
    """The `.glb` branch went past `pick_mesh`, so the two disagreed on the same folder."""
    from chesslab import scan_discover

    d = tmp_path / "wP"
    d.mkdir()
    (d / "m.glb").write_bytes(b"x")
    (d / "cropped.obj").write_bytes(b"x")
    (d / "wP_diffuse.png").write_bytes(b"x")
    items, _warnings = scan_discover.discover_scans(tmp_path)
    assert [i.obj for i in items] == [scan_discover.pick_mesh(d)]


# --- trim_session: the matte rows it drops are counted once and reported ------------------


def test_trim_session_reports_the_matte_rows_it_dropped(tmp_path, monkeypatch):
    from chesslab import config, sessions

    paths = config.Paths(root=tmp_path)
    sdir = paths.recordings / "s1"
    (sdir / "frames").mkdir(parents=True)
    rows = [{"frame": "frames/0000.png", "ply": 0, "fen": "x"},
            {"frame": "frames/0001.png", "ply": 1, "fen": "x"}]
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    (sdir / "matte.jsonl").write_text("".join(json.dumps({"frame": f"{i:04d}"}) + "\n"
                                              for i in (0, 1)), encoding="utf-8")
    monkeypatch.setattr(sessions, "session_dir", lambda _sid, _p=None: (sdir, False))

    res = sessions.trim_session("s1", 1, paths=paths)
    assert res["removed_matte_rows"] == 1


# --- temporal_matte.bracketing: corrupt metadata is named, not swallowed -----------------


def _board_row(idx: int, ply: int, ts: str, folder: str = "boards") -> dict:
    return {"frame": f"frames/{idx:06d}.png", "board": f"{folder}/{idx:06d}.webp",
            "ply": ply, "fen": "x", "ts": ts}


def test_bracketing_names_corrupt_metadata_instead_of_reporting_no_evidence():
    """A broken `ts` returned `None`, which reads as `no clean neighbour` — the matte then simply
    had one frame fewer and nobody learned the row was damaged."""
    from chesslab import temporal_matte

    rows = [_board_row(0, 0, "2026-01-01T00:00:00"), _board_row(2, 1, "2026-01-01T00:00:02")]
    target = {**_board_row(1, 0, "not-a-timestamp", folder="dirty")}
    with pytest.raises(ValueError, match="corrupt metadata"):
        temporal_matte.bracketing(rows + [target], target)


def test_bracketing_still_reports_a_row_without_a_board_as_no_evidence():
    from chesslab import temporal_matte

    rows = [{"frame": "frames/000000.png", "ply": 0, "fen": "x", "ts": "2026-01-01T00:00:00"}]
    target = _board_row(1, 0, "2026-01-01T00:00:01", folder="dirty")
    assert temporal_matte.bracketing(rows + [target], target) is None


# --- occluders.extract: the reported tile box is in source pixels either way --------------


class _Clip:
    def __init__(self, side: int, n: int):
        self.side, self.n = side, n

    def get(self, prop):
        import cv2
        return {cv2.CAP_PROP_FRAME_COUNT: self.n, cv2.CAP_PROP_FPS: 30.0,
                cv2.CAP_PROP_FRAME_WIDTH: self.side, cv2.CAP_PROP_FRAME_HEIGHT: self.side}[prop]

    def set(self, *_a):
        return True

    def read(self):
        return True, np.full((self.side, self.side, 3), 180, np.uint8)

    def release(self):
        pass


def test_extract_reports_the_same_tile_box_whether_or_not_a_tile_was_written(tmp_path, monkeypatch):
    """`scale` only got its value inside the write loop: a clip where every pose is skipped
    reported `tile` in MASK pixels while claiming it is what was written."""
    from chesslab import occluders

    monkeypatch.setattr(occluders, "WORK_SIZE", (200, 200))
    monkeypatch.setattr(occluders.cv2, "VideoCapture", lambda _p: _Clip(400, 6))
    wrote = occluders.extract(Path("c.mp4"), tmp_path / "a", min_cover=0.0, pair_blur=False)
    none = occluders.extract(Path("c.mp4"), tmp_path / "b", min_cover=2.0, pair_blur=False)
    assert wrote["written"] > 0 and none["written"] == 0
    assert none["tile"] == wrote["tile"]
