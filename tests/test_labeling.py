"""Stage 3 — slicing & labeling integration (headless, synthetic session)."""

import json
from contextlib import nullcontext
from pathlib import Path

import chess
import cv2
import numpy as np
import pytest

from chesslab.calibration import CalibrationProfile, CropParams, compute_homography
from chesslab.labeling import (
    CROP_SUFFIX,
    _fen_labels,
    _replace_sessions_in_manifest,
    all_squares,
    parse_out_size,
    slice_session,
    square_color,
)
from chesslab.work_audit import WorkAudit, activate, deactivate

START_FEN = chess.Board().fen()


def test_square_color_anchor_and_alternation():
    assert square_color("a1") == "dark"
    assert square_color("h1") == "light"
    assert square_color("a8") == "light"
    assert square_color("h8") == "dark"
    colors = [square_color(s) for s in all_squares()]
    assert colors.count("dark") == 32
    assert colors.count("light") == 32


def test_parse_out_size():
    assert parse_out_size("96x128") == (96, 128)
    with pytest.raises(ValueError):
        parse_out_size("bad")


def test_fen_labels_are_expanded_once_per_position():
    squares = tuple(all_squares())
    cache = {}
    audit = WorkAudit()
    token = activate(audit)
    try:
        first = _fen_labels(START_FEN, squares, cache)
        second = _fen_labels(START_FEN, squares, cache)
    finally:
        deactivate(token)

    assert first is second and len(first) == 64
    op = audit.report()["operations"]["FEN label expansions"]
    assert (op["calls"], op["unique_keys"], op["avoidable_calls"]) == (1, 1, 0)


def test_manifest_batch_replaces_multiple_sessions_with_one_rewrite(tmp_path):
    manifest = tmp_path / "manifest.jsonl"
    manifest.write_text(
        '\n'.join(json.dumps({"session_id": sid, "value": "old"})
                  for sid in ("s1", "s2", "keep")) + '\n', encoding="utf-8")
    replacements = {
        "s1": [json.dumps({"session_id": "s1", "value": "new1"})],
        "s2": [json.dumps({"session_id": "s2", "value": "new2"})],
    }
    audit = WorkAudit()
    token = activate(audit)
    try:
        _replace_sessions_in_manifest(manifest, replacements)
    finally:
        deactivate(token)

    rows = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines()]
    assert rows == [
        {"session_id": "keep", "value": "old"},
        {"session_id": "s1", "value": "new1"},
        {"session_id": "s2", "value": "new2"},
    ]
    op = audit.report()["operations"]["full manifest rewrites"]
    assert (op["calls"], op["avoidable_calls"]) == (1, 0)


def test_slice_session_closes_its_owned_writer_pool(monkeypatch):
    from chesslab import labeling

    events = []

    class FakePool:
        def __init__(self, **kwargs):
            events.append(("created", kwargs))

        def __enter__(self):
            events.append(("entered", self))
            return self

        def __exit__(self, *args):
            events.append(("exited", self))

    monkeypatch.setattr(labeling, "ThreadPoolExecutor", FakePool)
    monkeypatch.setattr(labeling, "_slice_session", lambda *args, **kwargs: kwargs["write_pool"])

    pool = labeling.slice_session(
        Path("session"), profile=object(), manifest_path=Path("manifest"),
        squares_root=Path("squares"),
    )

    assert pool is events[1][1]
    assert [event[0] for event in events] == ["created", "entered", "exited"]


def test_run_slice_publishes_completed_batch_on_keyboard_interrupt(tmp_path, monkeypatch):
    from chesslab import labeling, locks, sessions

    published = []
    calls = 0

    def fake_slice_session(*args, manifest_batch, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise KeyboardInterrupt
        manifest_batch["first"] = ['{"session_id": "first"}']
        return {"frames": 1, "crops": 64}

    monkeypatch.setattr(labeling, "_session_ids_with_logs", lambda: ["first", "second"])
    monkeypatch.setattr(labeling, "variant_paths", lambda tag: (tmp_path / "manifest", tmp_path))
    monkeypatch.setattr(locks, "pool_lock", lambda *args, **kwargs: nullcontext())
    monkeypatch.setattr(sessions, "session_dir", lambda sid: (tmp_path / sid, sid))
    monkeypatch.setattr(labeling, "read_session_meta", lambda path: {"profile": "test"})
    monkeypatch.setattr(labeling, "_profile_for_session", lambda meta, profile: object())
    monkeypatch.setattr(labeling, "slice_session", fake_slice_session)
    monkeypatch.setattr(
        labeling, "_replace_sessions_in_manifest",
        lambda path, replacements: published.append(dict(replacements)),
    )

    with pytest.raises(KeyboardInterrupt):
        labeling.run_slice(slice_all=True)

    assert published == [{"first": ['{"session_id": "first"}']}]


def _identity_profile(board_size: int = 800) -> CalibrationProfile:
    corners = [[0, 0], [board_size, 0], [board_size, board_size], [0, board_size]]  # a8,h8,h1,a1
    return CalibrationProfile(
        profile="test",
        camera_index=0,
        frame_size=(board_size, board_size),
        board_size=board_size,
        image_corners=corners,
        homography=compute_homography(corners, board_size),
        white_pov=True,
        crop=CropParams.default(board_size),
    )


def _frame_with_markers(board_size=800):
    """Frame mit 4 ArUco-Markern an den Ecken (Slicing ist jetzt marker-basiert)."""
    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    frame = np.full((board_size, board_size, 3), 255, dtype=np.uint8)
    s, off = 80, 80
    for mid, (cx, cy) in {0: (off, off), 1: (board_size - off, off),
                          2: (board_size - off, board_size - off), 3: (off, board_size - off)}.items():
        m = cv2.cvtColor(cv2.aruco.generateImageMarker(d, mid, s), cv2.COLOR_GRAY2BGR)
        frame[cy - s // 2:cy + s // 2, cx - s // 2:cx + s // 2] = m
    return frame


def _make_session(tmp_path, session_id="sess1", board_size=800):
    sdir = tmp_path / "sessions" / session_id
    (sdir / "frames").mkdir(parents=True)
    cv2.imwrite(str(sdir / "frames" / "0000.png"), _frame_with_markers(board_size))
    (sdir / "log.jsonl").write_text(
        json.dumps({"frame": "frames/0000.png", "ply": 0, "fen": START_FEN, "ts": "t", "move_san": None}) + "\n",
        encoding="utf-8",
    )
    import yaml

    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": session_id, "profile": "test", "mode": "live",
                        "created_at": "t", "camera_index": 0, "frame_size": [board_size, board_size]}),
        encoding="utf-8",
    )
    return sdir


def test_slice_start_position(tmp_path):
    sdir = _make_session(tmp_path)
    manifest = tmp_path / "manifests" / "crops.jsonl"
    squares_root = tmp_path / "squares"
    stats = slice_session(sdir, profile=_identity_profile(), manifest_path=manifest, squares_root=squares_root)

    assert stats["session_id"] == "sess1" and stats["frames"] == 1 and stats["crops"] == 64
    rows = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(rows) == 64

    by_label = {}
    for r in rows:
        by_label.setdefault(r["label"], 0)
        by_label[r["label"]] += 1
    assert by_label["empty"] == 32                 # start position: 32 empty
    assert sum(v for k, v in by_label.items() if k != "empty") == 32

    e1 = next(r for r in rows if r["square"] == "e1")
    assert e1["label"] == "wK"
    assert e1["square_color"] == "dark"
    from chesslab import config

    assert e1["out_size"] == [config.CROP.out_w, config.CROP.out_h]  # follows CropDefaults (square since pad_up=0)
    # crop file actually written, ImageFolder-style
    assert (squares_root / "wK" / f"sess1_0000_e1{CROP_SUFFIX}").exists()


def test_crop_square_is_square_and_undistorted():
    """Ein quadratisches Feld bleibt quadratisch: ein Kreis im Feld wird zum Kreis (keine Ellipse)."""
    from chesslab.calibration import square_center
    from chesslab.labeling import crop_square

    prof = _identity_profile(800)
    # Pin a zero-pad square crop: this tests the pure undistortion invariant, independent of the
    # config default (which now uses pad_up>0 + a taller out_size to capture the piece top).
    prof.crop = CropParams(cell=800 / 8.0, pad_up=0.0, pad_side=0.0, out_size=(128, 128))
    board = np.zeros((800, 800, 3), dtype=np.uint8)
    cx, cy = square_center("e4", prof)
    cv2.circle(board, (cx, cy), 30, (255, 255, 255), -1)
    crop = crop_square(board, "e4", prof, (128, 128))
    assert crop.shape == (128, 128, 3)         # quadratisch
    ys, xs = np.where(crop[:, :, 0] > 127)
    w, h = xs.max() - xs.min(), ys.max() - ys.min()
    assert abs(int(w) - int(h)) <= 4           # Kreis bleibt Kreis -> kein Strecken


def test_slice_uses_explicit_labels_incl_occluded(tmp_path):
    """Log-Eintrag mit `labels` (statt FEN) liefert die Labels direkt — auch occluded."""
    board_size = 800
    sdir = tmp_path / "sessions" / "infsess"
    (sdir / "frames").mkdir(parents=True)
    cv2.imwrite(str(sdir / "frames" / "0000.png"), np.full((480, 640, 3), 200, dtype=np.uint8))
    corners = [[0, 0], [640, 0], [640, 480], [0, 480]]
    labels = dict.fromkeys(all_squares(), "empty")
    labels["e1"] = "wK"; labels["d4"] = "occluded"
    (sdir / "log.jsonl").write_text(
        json.dumps({"frame": "frames/0000.png", "ply": 0, "fen": "x", "move_san": None,
                    "corners": corners, "labels": labels}) + "\n", encoding="utf-8")
    import yaml
    (sdir / "session.yaml").write_text(yaml.safe_dump({"session_id": "infsess", "profile": "test",
        "mode": "inference", "created_at": "t", "camera_index": 0, "frame_size": [640, 480]}), encoding="utf-8")

    manifest = tmp_path / "manifests" / "crops.jsonl"
    stats = slice_session(sdir, profile=_identity_profile(board_size), manifest_path=manifest,
                          squares_root=tmp_path / "squares")
    rows = {r["square"]: r["label"] for r in
            (json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip())}
    assert stats["crops"] == 64
    assert rows["e1"] == "wK" and rows["d4"] == "occluded" and rows["a7"] == "empty"


def test_slice_uses_stored_corners_without_markers(tmp_path):
    """Mit gespeicherten Ecken slict eine Session auch dann, wenn der Frame KEINE Marker hat —
    Beweis, dass die Aufnahme-Geometrie genutzt wird (keine Re-Detektion, kein Skip)."""
    board_size = 800
    sdir = tmp_path / "sessions" / "sessC"
    (sdir / "frames").mkdir(parents=True)
    cv2.imwrite(str(sdir / "frames" / "0000.png"),
                np.full((480, 640, 3), 200, dtype=np.uint8))   # markerloser Frame
    corners = [[0, 0], [640, 0], [640, 480], [0, 480]]          # a8,h8,h1,a1 in Frame-Pixeln
    (sdir / "log.jsonl").write_text(
        json.dumps({"frame": "frames/0000.png", "ply": 0, "fen": START_FEN, "ts": "t",
                    "move_san": None, "corners": corners}) + "\n", encoding="utf-8")
    import yaml
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "sessC", "profile": "test", "mode": "live",
                        "created_at": "t", "camera_index": 0, "frame_size": [640, 480]}),
        encoding="utf-8")

    manifest = tmp_path / "manifests" / "crops.jsonl"
    stats = slice_session(sdir, profile=_identity_profile(board_size), manifest_path=manifest,
                          squares_root=tmp_path / "squares")
    assert stats["crops"] == 64 and stats["skipped"] == 0


def test_reslice_with_new_params_is_reproducible(tmp_path):
    sdir = _make_session(tmp_path)
    manifest = tmp_path / "manifests" / "crops.jsonl"
    squares_root = tmp_path / "squares"
    prof = _identity_profile()
    slice_session(sdir, profile=prof, manifest_path=manifest, squares_root=squares_root)

    # Re-slice with different crop params; no re-capture needed.
    slice_session(sdir, profile=prof, manifest_path=manifest, squares_root=squares_root,
                  pad_up=3.0, out_size=(64, 64))
    rows = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(rows) == 64                          # session replaced, not duplicated
    assert all(r["out_size"] == [64, 64] for r in rows)
    img = cv2.imread(str(squares_root / "wK" / f"sess1_0000_e1{CROP_SUFFIX}"))
    assert img.shape[:2] == (64, 64)                # (H, W)
