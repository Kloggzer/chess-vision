"""Phase 01 — the cut/write seam and the session pack writer."""

import hashlib
import json
from pathlib import Path

import chess
import cv2
import numpy as np
import pytest
import yaml

from chesslab import config
from chesslab.calibration import CalibrationProfile, CropParams, compute_homography
from chesslab.labeling import slice_session
from chesslab.training import pack_session, packs

START_FEN = chess.Board().fen()

#: Measured on `feat/session-packs` BEFORE `iter_session_crops` existed (cv2 4.13.0, Python
#: 3.12.7). The seam only moves the cut; the pool bytes and the manifest rows must not move with
#: it. `ts` is `datetime.now` and is dropped before hashing.
CROPS_SHA = "fccc9558548fc52072acbf33f56b065c9c1e4e98a77cd2a4abe480370f9a4418"
ROWS_SHA = "04d762c22fac139458dac626c47f0bbc4b14a9510cfec974eaca9c0af0b94351"


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


def _make_session(tmp_path, session_id="sess1", board_size=800, bgr=None):
    sdir = tmp_path / "sessions" / session_id
    (sdir / "frames").mkdir(parents=True)
    frame = _frame_with_markers(board_size)
    entry = {"frame": "frames/0000.png", "ply": 0, "fen": START_FEN, "ts": "t", "move_san": None}
    if bgr is not None:
        # A flat colour makes the channel order readable; the warp then needs the corners from
        # the log, because the markers are gone with the white ground they were drawn on.
        frame[:] = bgr
        entry["corners"] = [[0, 0], [board_size, 0], [board_size, board_size], [0, board_size]]
    cv2.imwrite(str(sdir / "frames" / "0000.png"), frame)
    (sdir / "log.jsonl").write_text(json.dumps(entry) + "\n", encoding="utf-8")
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": session_id, "profile": "test", "mode": "live",
                        "created_at": "t", "camera_index": 0, "frame_size": [board_size, board_size]}),
        encoding="utf-8",
    )
    return sdir


def test_slice_output_is_byte_identical_after_the_seam(tmp_path):
    sdir = _make_session(tmp_path)
    manifest = tmp_path / "manifests" / "crops.jsonl"
    squares_root = tmp_path / "squares"
    stats = slice_session(sdir, profile=_identity_profile(), manifest_path=manifest,
                          squares_root=squares_root)
    assert stats["crops"] == 64 and stats["session_id"] == "sess1"

    crops = hashlib.sha256()
    for p in sorted(squares_root.rglob("*.webp")):
        crops.update(p.relative_to(squares_root).as_posix().encode())
        crops.update(p.read_bytes())
    rows = hashlib.sha256()
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if line.strip():
            row = json.loads(line)
            row.pop("ts", None)
            row["path"] = Path(row["path"]).name     # tmp_path is not part of the output
            rows.update(json.dumps(row, sort_keys=True, ensure_ascii=False).encode() + b"\n")
    assert crops.hexdigest() == CROPS_SHA
    assert rows.hexdigest() == ROWS_SHA


def _pack_paths(tmp_path, monkeypatch) -> config.Paths:
    from chesslab import labeling

    monkeypatch.setattr(labeling, "_profile_for_session",
                        lambda meta, profile: _identity_profile())
    return config.Paths(root=tmp_path)


def _pack_rows(name: str, paths: config.Paths) -> list[dict]:
    text = (packs.pack_dir(name, paths) / "manifest.jsonl").read_text(encoding="utf-8")
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def _cell(row: dict) -> tuple:
    return (row["frame"], row["square"], row["label"], row["pad_side"], row["pad_up"])


def test_session_pack_rows_match_slice_rows(tmp_path, monkeypatch):
    sdir = _make_session(tmp_path)
    paths = _pack_paths(tmp_path, monkeypatch)
    manifest = tmp_path / "manifests" / "crops.jsonl"
    slice_session(sdir, profile=_identity_profile(), manifest_path=manifest,
                  squares_root=tmp_path / "squares")
    slice_rows = [json.loads(line) for line in
                  manifest.read_text(encoding="utf-8").splitlines() if line.strip()]

    res = pack_session.write_session_pack("sess1", paths=paths)

    assert res == {"pack": "sess1-80", "n": 64, "h": 80, "w": 80, "gb": 0.0}
    rows = _pack_rows("sess1-80", paths)
    assert [_cell(r) for r in rows] == [_cell(r) for r in slice_rows]
    assert {r["out_size"][0] for r in rows} == {80}
    assert {r["out_size"][0] for r in slice_rows} == {128}
    assert rows[0]["path"] == "mm://sess1-80/0000/a1"
    ref = packs.read_pack("sess1-80", paths)
    assert ref.shape == (64, 80, 80) and ref.paths == [r["path"] for r in rows]


def test_session_pack_is_rgb(tmp_path, monkeypatch):
    _make_session(tmp_path, bgr=(50, 100, 200))
    paths = _pack_paths(tmp_path, monkeypatch)

    pack_session.write_session_pack("sess1", paths=paths)

    ref = packs.read_pack("sess1-80", paths)
    mm = np.memmap(ref.image, dtype=np.uint8, mode="r", shape=ref.shape + (3,))
    centre = mm[ref.paths.index("mm://sess1-80/0000/d4"), 40, 40]
    assert tuple(int(v) for v in centre) == (200, 100, 50)


def test_session_pack_refuses_to_overwrite(tmp_path, monkeypatch):
    _make_session(tmp_path)
    paths = _pack_paths(tmp_path, monkeypatch)
    pack_session.write_session_pack("sess1", paths=paths)

    with pytest.raises(ValueError, match="already exists"):
        pack_session.write_session_pack("sess1", paths=paths)
