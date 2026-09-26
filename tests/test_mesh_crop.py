"""The Python mesh cut against `parity/_geometry/mesh_crop_parity.json`."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from chesslab.calibration import (
    CalibrationProfile,
    GridMesh,
    crop_border_px,
    mesh_from_lines,
    mesh_point,
    profile_path,
    smooth_mesh_curvature,
    straighten_board,
)
from conftest import make_profile, write_jsonl

FIXTURE = (Path(__file__).resolve().parents[1]
           / "android/core-engine/src/test/resources/parity/_geometry/mesh_crop_parity.json")
TOL = 1e-9


@pytest.fixture(scope="module")
def fx() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def _profile(fx: dict, out_size=(96, 128)) -> CalibrationProfile:
    bs = int(fx["boardSize"])
    corners = [[0.0, 0.0], [float(bs), 0.0], [float(bs), float(bs)], [0.0, float(bs)]]
    return make_profile(bs, corners=corners, profile="__mesh-parity__", camera_index=-1,
                        white_pov=bool(fx["whitePov"]), pad_side=float(fx["padSide"]),
                        out_size=out_size)


def _mesh(fx: dict, *, curved: bool) -> GridMesh:
    m = fx["mesh"]
    return GridMesh(m["x"], m["y"], m["tx"], m["ty"],
                    m["cx"] if curved else None, m["cy"] if curved else None)


@pytest.mark.parametrize("key,curved", [("meshPoints", False), ("curvedMeshPoints", True)])
def test_the_mesh_map_matches_the_shared_fixture(fx, key, curved):
    """The one map all three straighteners run — the per-cell boxes it replaced are gone."""
    mesh = _mesh(fx, curved=curved)
    assert len(fx[key]) == 100
    for u, v, wx, wy in fx[key]:
        assert mesh_point(u, v, mesh) == pytest.approx((wx, wy), abs=TOL)


def test_the_nominal_mesh_moves_no_point(fx):
    nominal = GridMesh([k / 8.0 for k in range(9)], [k / 8.0 for k in range(9)])
    for u in (0.0, 0.0625, 0.5, 0.9375, 1.0):
        assert mesh_point(u, 1.0 - u, nominal) == pytest.approx((u, 1.0 - u), abs=TOL)


def test_a_mesh_without_tilts_still_moves_by_its_offsets(fx):
    """The scalar stage: offsets alone ARE a correction, and dropping them would be a silent loss."""
    shifted = [k / 8.0 + 0.01 for k in range(9)]
    scalar = GridMesh(shifted, list(shifted))
    assert mesh_point(0.5, 0.5, scalar) == pytest.approx((0.51, 0.51), abs=TOL)


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


def test_the_trend_heal_matches_the_shared_fixture():
    """The REAL poisoned mesh (rg-2026-08-15-22-57-06) healed identically on every side —
    `CurvatureTrendParityTest.kt` reads the same file."""
    fx = json.loads((FIXTURE.parent / "curvature_trend_parity.json").read_text(encoding="utf-8"))
    healed = smooth_mesh_curvature(mesh_from_lines(fx["mesh"]))
    assert healed.cx == pytest.approx(fx["healedCx"], abs=1e-9)
    assert healed.cy == pytest.approx(fx["healedCy"], abs=1e-9)
    lin = fx["linearCurv"]
    m = fx["mesh"]
    untouched = smooth_mesh_curvature(GridMesh(m["x"], m["y"], m["tx"], m["ty"], list(lin), list(lin)))
    assert untouched.cx == pytest.approx(lin, abs=1e-9)


def test_a_poisoned_curvature_line_takes_the_cross_line_trend(fx):
    """The 7/6 defect: pawn feet fake -0.07 curvature on ONE line; the trend replaces exactly it."""
    mesh = mesh_from_lines(fx["mesh"])
    poisoned = smooth_mesh_curvature(GridMesh(
        mesh.x, mesh.y, mesh.tx, mesh.ty,
        cx=[0.001 * k for k in range(9)],
        cy=[0.001 * k if k != 2 else -0.07 for k in range(9)]))
    assert poisoned.cx == pytest.approx([0.001 * k for k in range(9)], abs=1e-9)
    assert poisoned.cy[2] == pytest.approx(0.002, abs=1e-3)
    assert poisoned.cy[3:] == pytest.approx([0.001 * k for k in range(3, 9)], abs=1e-9)


def test_a_genuinely_linear_curvature_profile_is_left_alone():
    """A rig's real bow runs linearly across the lines (±0.046 at the edges) and must survive."""
    lin = [round(-0.046 + k * 0.0115, 5) for k in range(9)]
    xs = [k / 8.0 for k in range(9)]
    mesh = GridMesh(xs, list(xs), [0.0] * 9, [0.0] * 9, list(lin), list(lin))
    healed = smooth_mesh_curvature(mesh)
    assert healed.cx == pytest.approx(lin, abs=1e-9)
    assert smooth_mesh_curvature(None) is None
    assert smooth_mesh_curvature(GridMesh(xs, list(xs))).cx is None


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
    prof = make_profile(bs)
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


def test_slice_counts_a_stored_board_nobody_pulled_straight(tmp_path):
    """Nothing in a crop says whether its board still carries the barrel — so the slice must."""
    import cv2

    from chesslab import labeling

    bs = 800
    prof = make_profile(bs)
    border = crop_border_px(prof)
    for flag, want in ((False, 1), (True, 0)):
        sdir = _session_with_mesh(tmp_path / f"b{flag}", None)
        (sdir / "boards").mkdir()
        rng = np.random.default_rng(5)
        cv2.imwrite(str(sdir / "boards" / "0000.webp"),
                    rng.integers(0, 255, (bs + 2 * border, bs + 2 * border, 3), dtype=np.uint8))
        row = json.loads((sdir / "log.jsonl").read_text(encoding="utf-8").strip())
        row.update(board="boards/0000.webp", board_size=bs, board_border=border)
        if flag:
            row["board_straightened"] = True
        (sdir / "log.jsonl").write_text(json.dumps(row) + chr(10), encoding="utf-8")
        stats = labeling.slice_session(sdir, profile=prof,
                                       manifest_path=tmp_path / f"m{flag}.jsonl",
                                       squares_root=tmp_path / f"sq{flag}")
        assert stats["bowed_boards"] == want, f"board_straightened={flag}"


def test_fit_mesh_replaces_a_stale_mesh_and_backs_the_log_up(tmp_path, monkeypatch):
    """A re-fit must not leave a mesh from an older geometry standing — it would cut somewhere else."""
    from chesslab import config, sessions
    from chesslab.realgames import mesh as rg_mesh
    from chesslab.session_store import log as store_log

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = _session_with_mesh(tmp_path, {"x": [1] * 9, "y": [1] * 9})
    (tmp_path / "data" / "sessions").mkdir(parents=True)
    sdir.rename(tmp_path / "data" / "sessions" / "meshy")
    x = [k / 8.0 for k in range(9)]
    fresh = {"x": x, "y": list(x), "tx": [0.01] * 9, "ty": [0.0] * 9}
    answers = iter([fresh, None])
    monkeypatch.setattr(rg_mesh, "grid_line_fracs", lambda *a, **k: next(answers))
    _profile({"boardSize": 800, "padSide": 0.05, "whitePov": True}).save(
        profile_path("test"))

    first = sessions.fit_mesh_session("meshy")
    rows = store_log.read_log(tmp_path / "data" / "sessions" / "meshy")
    assert (first["measured"], first["tilted"], rows[0]["grid_lines"]) == (1, 1, fresh)

    second = sessions.fit_mesh_session("meshy")
    rows = store_log.read_log(tmp_path / "data" / "sessions" / "meshy")
    assert second["measured"] == 0 and "grid_lines" not in rows[0]
    assert first["backup"] != second["backup"], "never overwrite a backup"


def _log_rows(sdir: Path) -> list[dict]:
    return [json.loads(line) for line in (sdir / "log.jsonl").read_text(encoding="utf-8").splitlines()
            if line.strip()]


def _measured_session(tmp_path, monkeypatch, answers):
    """A 4-row session whose fit returns `answers` in order — the rest is the sweep under test."""
    import yaml

    from chesslab import config
    from chesslab.realgames import mesh as rg_mesh

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = tmp_path / "data" / "sessions" / "carry"
    (sdir / "frames").mkdir(parents=True)
    import cv2

    rows = []
    for i in range(4):
        cv2.imwrite(str(sdir / "frames" / f"{i:04d}.png"), np.full((8, 8, 3), 9, np.uint8))
        rows.append({"frame": f"frames/{i:04d}.png", "ply": i, "fen": "f",
                     "corners": [[0, 0], [8, 0], [8, 8], [0, 8]]})
    write_jsonl(sdir / "log.jsonl", rows)
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "carry", "profile": "test", "mode": "live"}), encoding="utf-8")
    it = iter(answers)
    monkeypatch.setattr(rg_mesh, "grid_line_fracs", lambda *a, **k: next(it, None))
    _profile({"boardSize": 8, "padSide": 0.05, "whitePov": True}).save(profile_path("test"))
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
