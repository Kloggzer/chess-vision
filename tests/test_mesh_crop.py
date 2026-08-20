"""The Python mesh cut against the fixture Kotlin and TS are pinned on.

`parity/_geometry/mesh_crop_parity.json` is written by neither side: MeshCropParityTest.kt and
`lib/warp.test.ts` read the same file, so all three consumers cut one board identically.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from chesslab.calibration import (
    CalibrationProfile,
    CropParams,
    GridMesh,
    compute_homography,
    crop_border_px,
    mesh_cell_quad,
    mesh_from_lines,
    square_to_crop_box,
    square_to_mesh_box,
    straighten_board,
)
from chesslab.labeling import all_squares, crop_square

FIXTURE = (Path(__file__).resolve().parents[1]
           / "android/core-engine/src/test/resources/parity/_geometry/mesh_crop_parity.json")
TOL = 1e-9


@pytest.fixture(scope="module")
def fx() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def _profile(fx: dict, out_size=(96, 128)) -> CalibrationProfile:
    bs = int(fx["boardSize"])
    corners = [[0.0, 0.0], [float(bs), 0.0], [float(bs), float(bs)], [0.0, float(bs)]]
    return CalibrationProfile(
        profile="__mesh-parity__", camera_index=-1, frame_size=(bs, bs), board_size=bs,
        image_corners=corners, homography=compute_homography(corners, bs, 0.0),
        white_pov=bool(fx["whitePov"]),
        crop=CropParams(cell=bs / 8.0, pad_up=float(fx["padUp"]), pad_side=float(fx["padSide"]),
                        out_size=out_size),
        margin=0.0,
    )


def _mesh(fx: dict, *, curved: bool) -> GridMesh:
    m = fx["mesh"]
    return GridMesh(m["x"], m["y"], m["tx"], m["ty"],
                    m["cx"] if curved else None, m["cy"] if curved else None)


def test_all_64_mesh_boxes_match_the_shared_fixture(fx):
    prof, mesh = _profile(fx), _mesh(fx, curved=False)
    assert len(fx["boxes"]) == 64
    for square, want in fx["boxes"].items():
        assert square_to_mesh_box(square, prof, mesh) == pytest.approx(want, abs=TOL)


@pytest.mark.parametrize("key,curved", [("quads", False), ("curvedQuads", True)])
def test_all_64_cell_quads_match_the_shared_fixture(fx, key, curved):
    prof, mesh = _profile(fx), _mesh(fx, curved=curved)
    assert len(fx[key]) == 64
    for square, want in fx[key].items():
        got = [c for corner in mesh_cell_quad(square, prof, mesh) for c in corner]
        assert got == pytest.approx([c for corner in want for c in corner], abs=TOL)


def test_zero_tilts_put_the_quads_corners_on_the_scalar_box(fx):
    prof = _profile(fx)
    flat = GridMesh(fx["mesh"]["x"], fx["mesh"]["y"], [0.0] * 9, [0.0] * 9)
    for square in all_squares():
        x0, y0, x1, y1 = square_to_mesh_box(square, prof, flat)
        got = [c for corner in mesh_cell_quad(square, prof, flat) for c in corner]
        assert got == pytest.approx([x0, y0, x1, y0, x1, y1, x0, y1], abs=TOL)


def test_zero_curvature_lands_on_the_closed_form_intersection(fx):
    """The iterated corner and the exact intersection agree far inside a pixel — CORNER_ITERATIONS."""
    prof = _profile(fx)
    m = fx["mesh"]
    tilted = GridMesh(m["x"], m["y"], m["tx"], m["ty"])
    zero = GridMesh(m["x"], m["y"], m["tx"], m["ty"], [0.0] * 9, [0.0] * 9)
    got = [c for corner in mesh_cell_quad("e4", prof, zero) for c in corner]
    want = [c for corner in mesh_cell_quad("e4", prof, tilted) for c in corner]
    assert got == pytest.approx(want, abs=1e-3)


def test_the_nominal_mesh_reproduces_square_to_crop_box(fx):
    prof = _profile(fx)
    nominal = GridMesh([k / 8.0 for k in range(9)], [k / 8.0 for k in range(9)])
    for square in all_squares():
        box = tuple(round(v) for v in square_to_mesh_box(square, prof, nominal))
        assert box == square_to_crop_box(square, prof, clamp=False)


def test_mesh_from_lines_drops_one_stage_per_defect(fx):
    m = fx["mesh"]
    assert mesh_from_lines(m).cx is not None
    assert mesh_from_lines({**m, "cx": [0.2] * 9}).tilted          # curvature over its limit
    assert mesh_from_lines({**m, "cx": [0.2] * 9}).cx is None
    assert mesh_from_lines({**m, "tx": [0.9] * 9}).tilted is False  # tilt over its limit
    assert mesh_from_lines({**m, "ty": m["ty"][:8]}).tilted is False
    assert mesh_from_lines({**m, "x": list(reversed(m["x"]))}) is None
    assert mesh_from_lines({**m, "y": [str(v) for v in m["y"]]}) is None
    assert mesh_from_lines(None) is None


def test_a_nominal_mesh_leaves_the_board_where_it_found_it(fx):
    """The identity case: lines exactly on the eighths must move no pixel worth seeing."""
    prof = _profile(fx)
    bs, b = prof.board_size, crop_border_px(prof)
    rng = np.random.default_rng(7)
    warped = rng.integers(0, 255, (bs + 2 * b, bs + 2 * b, 3), dtype=np.uint8)
    eighths = [k / 8.0 for k in range(9)]
    nominal = GridMesh(eighths, list(eighths), [0.0] * 9, [0.0] * 9)
    pulled = straighten_board(warped, nominal, bs, b)
    inner = (slice(b + 2, b + bs - 2), slice(b + 2, b + bs - 2))
    assert np.abs(pulled[inner].astype(int) - warped[inner].astype(int)).max() <= 1


def test_a_tilted_mesh_straightens_a_line_the_plain_cut_leaves_slanted(fx):
    """A board drawn with a tilted line: after `straighten_board` the plain cut finds it upright."""
    prof = _profile(fx, out_size=(128, 128))
    bs, b = prof.board_size, crop_border_px(prof)
    tilt = 0.02
    canvas = np.zeros((bs + 2 * b, bs + 2 * b, 3), np.uint8)
    for row in range(canvas.shape[0]):
        t = (row - b) / bs - 0.5
        x = b + int(round((0.5 + tilt * t) * bs))
        canvas[row, max(0, x - 2):x + 3] = 255
    x = [k / 8.0 for k in range(9)]
    mesh = GridMesh(x, list(x), [tilt if k == 4 else 0.0 for k in range(9)], [0.0] * 9)

    def spread(image):
        rows = range(b, b + bs)
        cols = [np.argmax(image[r, :, 0] > 0) for r in rows if image[r, :, 0].max() > 0]
        return max(cols) - min(cols)

    # The mutation check: a straightening that did nothing would pass the second assert alone.
    assert spread(canvas) > 15, "the raw board must SHOW the slant, or this proves nothing"
    assert spread(straighten_board(canvas, mesh, bs, b)) <= 2


def _session_with_mesh(tmp_path, lines: dict | None, board_size=800):
    import yaml

    sdir = tmp_path / "sessions" / "meshy"
    (sdir / "frames").mkdir(parents=True)
    rng = np.random.default_rng(3)
    frame = rng.integers(0, 255, (board_size, board_size, 3), dtype=np.uint8)
    import cv2

    cv2.imwrite(str(sdir / "frames" / "0000.png"), frame)
    row = {"frame": "frames/0000.png", "ply": 0, "ts": "t", "move_san": None,
           "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
           "corners": [[0, 0], [board_size, 0], [board_size, board_size], [0, board_size]]}
    if lines is not None:
        row["grid_lines"] = lines
    (sdir / "log.jsonl").write_text(json.dumps(row) + "\n", encoding="utf-8")
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "meshy", "profile": "test", "mode": "live",
                        "created_at": "t", "camera_index": 0,
                        "frame_size": [board_size, board_size]}), encoding="utf-8")
    return sdir


def test_slice_cuts_at_the_rows_own_grid_lines(tmp_path):
    from chesslab import labeling

    bs = 800
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    prof = CalibrationProfile(
        profile="test", camera_index=0, frame_size=(bs, bs), board_size=bs,
        image_corners=corners, homography=compute_homography(corners, bs), white_pov=True,
        crop=CropParams.default(bs))
    x = [k / 8.0 for k in range(9)]
    lines = {"x": x, "y": list(x), "tx": [0.01] * 9, "ty": [0.0] * 9}
    meshed = labeling.slice_session(_session_with_mesh(tmp_path, lines), profile=prof,
                                    manifest_path=tmp_path / "m.jsonl",
                                    squares_root=tmp_path / "sq")
    plain = labeling.slice_session(_session_with_mesh(tmp_path / "b", None), profile=prof,
                                   manifest_path=tmp_path / "b.jsonl",
                                   squares_root=tmp_path / "sqb")
    assert (meshed["mesh_frames"], plain["mesh_frames"]) == (1, 0)
    assert meshed["crops"] == plain["crops"] == 64


def test_fit_mesh_replaces_a_stale_mesh_and_backs_the_log_up(tmp_path, monkeypatch):
    """A re-fit must not leave a mesh from an older geometry standing — it would cut somewhere else."""
    from chesslab import config, realgames, sessions

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = _session_with_mesh(tmp_path, {"x": [1] * 9, "y": [1] * 9})
    (tmp_path / "data" / "sessions").mkdir(parents=True)
    sdir.rename(tmp_path / "data" / "sessions" / "meshy")
    x = [k / 8.0 for k in range(9)]
    fresh = {"x": x, "y": list(x), "tx": [0.01] * 9, "ty": [0.0] * 9}
    answers = iter([fresh, None])
    monkeypatch.setattr(realgames, "grid_line_fracs", lambda *a, **k: next(answers))
    monkeypatch.setattr("chesslab.labeling._profile_for_session", lambda meta, name: _profile(
        {"boardSize": 800, "padSide": 0.05, "padUp": 0.0, "whitePov": True}))

    first = sessions.fit_mesh_session("meshy")
    rows = sessions.read_log(tmp_path / "data" / "sessions" / "meshy")
    assert (first["measured"], first["tilted"], rows[0]["grid_lines"]) == (1, 1, fresh)

    second = sessions.fit_mesh_session("meshy")
    rows = sessions.read_log(tmp_path / "data" / "sessions" / "meshy")
    assert second["measured"] == 0 and "grid_lines" not in rows[0]
    assert first["backup"] != second["backup"], "never overwrite a backup"


def _log_rows(sdir: Path) -> list[dict]:
    return [json.loads(line) for line in (sdir / "log.jsonl").read_text(encoding="utf-8").splitlines()
            if line.strip()]


def _measured_session(tmp_path, monkeypatch, answers):
    """A 4-row session whose fit returns `answers` in order — the rest is the sweep under test."""
    import yaml

    from chesslab import config, realgames

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = tmp_path / "data" / "sessions" / "carry"
    (sdir / "frames").mkdir(parents=True)
    import cv2

    rows = []
    for i in range(4):
        cv2.imwrite(str(sdir / "frames" / f"{i:04d}.png"), np.full((8, 8, 3), 9, np.uint8))
        rows.append({"frame": f"frames/{i:04d}.png", "ply": i, "fen": "f",
                     "corners": [[0, 0], [8, 0], [8, 8], [0, 8]]})
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "carry", "profile": "test", "mode": "live"}), encoding="utf-8")
    it = iter(answers)
    monkeypatch.setattr(realgames, "grid_line_fracs", lambda *a, **k: next(it, None))
    monkeypatch.setattr("chesslab.labeling._profile_for_session", lambda meta, name: _profile(
        {"boardSize": 8, "padSide": 0.05, "padUp": 0.0, "whitePov": True}))
    return sdir


def _lines(offset: float, curved: bool = True) -> dict:
    x = [round(k / 8.0 + offset, 5) for k in range(9)]
    m = {"x": x, "y": list(x), "tx": [0.01] * 9, "ty": [0.0] * 9}
    return {**m, "cx": [0.02] * 9, "cy": [0.0] * 9} if curved else m


def test_an_unreadable_frame_takes_the_mesh_of_the_stable_ones_before_it(tmp_path, monkeypatch):
    from chesslab import sessions

    sdir = _measured_session(tmp_path, monkeypatch,
                             [_lines(0.0), _lines(0.002), None, _lines(0.001)])
    r = sessions.fit_mesh_session("carry")
    rows = _log_rows(sdir)

    assert (r["measured"], r["carried"]) == (3, 1)
    assert rows[2]["grid_lines_source"] == "carried"
    assert rows[2]["grid_lines"]["x"][0] == pytest.approx(0.001), "median of the two before it"
    assert rows[3]["grid_lines_source"] == "measured", "a measured frame keeps its own"


def test_a_carried_mesh_never_claims_a_stage_its_neighbours_disagree_on(tmp_path, monkeypatch):
    from chesslab import sessions

    _measured_session(tmp_path, monkeypatch,
                      [_lines(0.0), _lines(0.0, curved=False), None])
    sessions.fit_mesh_session("carry")
    rows = _log_rows(tmp_path / "data" / "sessions" / "carry")

    assert "cx" not in rows[2]["grid_lines"], "one neighbour measured no curvature"
    assert "tx" in rows[2]["grid_lines"]


def test_a_session_opening_with_a_hand_carries_backwards(tmp_path, monkeypatch):
    from chesslab import sessions

    _measured_session(tmp_path, monkeypatch, [None, None, _lines(0.003), _lines(0.003)])
    r = sessions.fit_mesh_session("carry")
    rows = _log_rows(tmp_path / "data" / "sessions" / "carry")

    assert (r["measured"], r["carried"]) == (2, 2)
    assert rows[0]["grid_lines"]["x"][0] == pytest.approx(0.003)
