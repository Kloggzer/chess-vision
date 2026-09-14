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

#: Nachgezogen 2026-09-14: der Crop-Warp interpoliert kubisch statt bilinear, also aendern sich die
#: PIXEL — als einziges. Geometrie und Zeilen blieben, `ROWS_SHA` ist unveraendert und das Quad der
#: Paritaets-Fixtures wich um 0,0 px ab (`docs/warp-resampling.md`). Davor, seit `feat/session-packs`:
#: fccc9558548fc52072acbf33f56b065c9c1e4e98a77cd2a4abe480370f9a4418. `ts` faellt vorm Hashen weg.
CROPS_SHA = "d3e9b05e7888b090bb56849579991384d2fe4e4fdd88af96c416e20497237b75"
#: Nachgezogen 2026-09-14 aus ZWEI Gruenden, die sich hier ueberlagern: `pad_up` ist entfernt und
#: steht nicht mehr in der Zeile, und `brightness` wird aus den jetzt kubisch geschnittenen Pixeln
#: gerechnet. 2026-09-09 kam `brightness` dazu, ohne die Pixel zu bewegen.
ROWS_SHA = "fa07f95118afdd94191cd6e5444832caeaf71d49282100a361a3b920fb755e42"


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
    return (row["frame"], row["square"], row["label"], row["pad_side"])


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


def test_replace_rewrites_the_pack_and_leaves_nothing_behind(tmp_path, monkeypatch):
    _make_session(tmp_path)
    paths = _pack_paths(tmp_path, monkeypatch)
    first = pack_session.write_session_pack("sess1", paths=paths)

    again = pack_session.write_session_pack("sess1", paths=paths, replace=True)

    assert again["replaced"] and again["n"] == first["n"]
    assert packs.read_pack("sess1-80", paths).shape == (first["n"], 80, 80)
    assert [d.name for d in paths.packs.iterdir()] == ["sess1-80"]


def test_a_failed_replace_puts_the_old_pack_back(tmp_path, monkeypatch):
    _make_session(tmp_path)
    paths = _pack_paths(tmp_path, monkeypatch)
    pack_session.write_session_pack("sess1", paths=paths)
    before = packs.read_pack("sess1-80", paths)

    def boom(*_a, **_k):
        raise RuntimeError("cut died halfway")

    monkeypatch.setattr(pack_session, "_write_rows", boom)
    with pytest.raises(RuntimeError):
        pack_session.write_session_pack("sess1", paths=paths, replace=True)

    assert packs.read_pack("sess1-80", paths).shape == before.shape
    assert [d.name for d in paths.packs.iterdir()] == ["sess1-80"]


def _kotlin_pack(dir_: Path, name: str = "sid", side: int = 4, short: bool = False) -> None:
    """A `labeled-video-pack` as the desktop tool leaves it: rows without the `-<size>` suffix."""
    dir_.mkdir(parents=True)
    rows = [{"path": f"{packs.MM_PREFIX}{name}/0000/{sq}", "label": "empty",
             "out_size": [side, side]} for sq in ("a1", "a2", "a3")]
    (dir_ / "manifest.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    packs.write_meta(dir_, rows, side, side)
    raw = np.arange(len(rows) * side * side * 3, dtype=np.uint8).tobytes()
    (dir_ / packs._IMAGE).write_bytes(raw[:-1] if short else raw)


def test_import_pack_keeps_the_kotlin_name_and_refuses_a_short_one(tmp_path):
    paths = config.Paths(root=tmp_path)
    src = tmp_path / "incoming" / "sid"
    _kotlin_pack(src)

    assert pack_session.import_pack(src, paths=paths) == {
        "pack": "sid", "n": 3, "h": 4, "w": 4, "gb": 0.0}
    assert not src.exists()
    assert packs.read_pack("sid", paths).paths[0] == "mm://sid/0000/a1"

    truncated = tmp_path / "incoming" / "sid2"
    _kotlin_pack(truncated, name="sid2", short=True)
    with pytest.raises(ValueError, match="bytes"):
        pack_session.import_pack(truncated, paths=paths)
    assert truncated.exists()


# --- Packing a session that has no directory ------------------------------------------

def _pool_session(paths: config.Paths, session_id: str, tag: str, frames=("0000",),
                  squares=("a1", "b2"), side: int = 128) -> list[dict]:
    """A crop pool as `slice` leaves it: one webp per cell plus the pool manifest."""
    rows = []
    for frame in frames:
        for i, sq in enumerate(squares):
            p = paths.crops / tag / "empty" / f"{session_id}_{frame}_{sq}.webp"
            p.parent.mkdir(parents=True, exist_ok=True)
            img = np.full((side, side, 3), 0, dtype=np.uint8)
            img[:, :, 0], img[:, :, 1] = 10 + i, int(frame) + 1      # BGR, readable per cell
            cv2.imwrite(str(p), img, [cv2.IMWRITE_WEBP_QUALITY, 100])
            rows.append({"path": p.as_posix(), "label": "empty", "session_id": session_id,
                         "frame": frame, "square": sq, "square_color": "light", "fen": "x",
                         "out_size": [side, side], "pad_side": 0.05})
    m = paths.crops / tag / "manifest.jsonl"
    with m.open("a", encoding="utf-8") as fh:
        fh.writelines(json.dumps(r) + "\n" for r in rows)
    return rows


def test_pool_pack_takes_only_its_session_and_keeps_the_pool_rows(tmp_path):
    paths = config.Paths(root=tmp_path)
    rows = _pool_session(paths, "comp-x-00", "comp13-v3", frames=("0000", "0001"))
    _pool_session(paths, "comp-x-01", "comp13-v3", frames=("0000",))       # same pool, other id
    # The second pool must not be read: the same session sits in both with different pixels.
    _pool_session(paths, "comp-x-00", "comp13-v4", frames=("0000", "0001"))

    res = pack_session.write_pool_pack("comp-x-00", 128, pool="comp13-v3", paths=paths)

    assert res == {"pack": "comp-x-00-128", "n": 4, "h": 128, "w": 128,
                   "gb": _gb_of(4, 128)}
    packed = _pack_rows("comp-x-00-128", paths)
    assert [r["path"] for r in packed] == [f"mm://comp-x-00-128/{r['frame']}/{r['square']}"
                                           for r in rows]
    assert [_cell(r) for r in packed] == [_cell(r) for r in rows]
    ref = packs.read_pack("comp-x-00-128", paths)
    assert ref.shape == (4, 128, 128)


def test_pool_pack_pixels_are_the_decoder_the_monolithic_pack_used(tmp_path):
    """Bit-equality by construction: both writers go through `training.pack.decode_crop`."""
    from chesslab.training.pack import decode_crop

    paths = config.Paths(root=tmp_path)
    rows = _pool_session(paths, "comp-x-00", "comp13-v3", squares=("a1", "b2", "c3"))

    pack_session.write_pool_pack("comp-x-00", 80, pool="comp13-v3", paths=paths)

    ref = packs.read_pack("comp-x-00-80", paths)
    mm = np.memmap(ref.image, dtype=np.uint8, mode="r", shape=ref.shape + (3,))
    for i, row in enumerate(rows):
        assert np.array_equal(mm[i], decode_crop(row["path"], (80, 80))), row["path"]


def test_pool_pack_refuses_an_unknown_session_and_an_existing_pack(tmp_path):
    paths = config.Paths(root=tmp_path)
    _pool_session(paths, "comp-x-00", "comp13-v3")

    with pytest.raises(ValueError, match="no crops"):
        pack_session.write_pool_pack("comp-nobody", 80, pool="comp13-v3", paths=paths)
    assert not (paths.packs / "comp-nobody-80").exists(), "an empty pack dir was left behind"

    pack_session.write_pool_pack("comp-x-00", 80, pool="comp13-v3", paths=paths)
    with pytest.raises(ValueError, match="already exists"):
        pack_session.write_pool_pack("comp-x-00", 80, pool="comp13-v3", paths=paths)


def _gb_of(n: int, side: int) -> float:
    return round(n * side * side * 3 / 1e9, 2)
