"""Hand-set / adopted board geometry in the review UI (`web/routers/sessions.py`).

A session whose ArUco markers were not all detected has rows without `corners` and cannot be
sliced at all. Reconstructing the missing corner from the other three is NOT acceptable for
recorded data (measured: 78 px shift on a ~234 px square), so the geometry either comes from
another row of the same session (`adopt`) or from the user (`hand`).

What these tests pin down: the stored order stays `[a8, h8, h1, a1]` whatever the click order
was, rotation can always reach the right assignment, measured rows are never overwritten by
accident, provenance is recorded, and `log.jsonl` is backed up before being rewritten.
"""

from __future__ import annotations

import json

import numpy as np
import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")

from chesslab.web.routers.sessions import _quad_from_points, _shoelace  # noqa: E402

# A real detected quad from data/sessions/20260730-131607 row 0 (3072x4096 phone frame).
REAL_A8 = [563.06, 2649.24]
REAL_H8 = [577.63, 847.78]
REAL_H1 = [2438.33, 866.43]
REAL_A1 = [2353.66, 2702.32]
REAL_QUAD = [REAL_A8, REAL_H8, REAL_H1, REAL_A1]


def _same(a, b, tol=1e-6) -> bool:
    """Quad equality (pytest.approx cannot compare nested lists)."""
    return len(a) == len(b) and all(abs(p[0] - q[0]) < tol and abs(p[1] - q[1]) < tol
                                   for p, q in zip(a, b, strict=True))


def _rotation_that_matches(order, target) -> list[int]:
    """The rotate states of `order` that produce `target` — what the user finds by looking."""
    return [r for r in range(4) if _same(_quad_from_points(order, rotate=r, normalize=True), target)]


# --- pure geometry --------------------------------------------------------------------

def test_the_stored_order_of_a_real_detected_quad_is_clockwise_on_screen():
    """The convention `[a8, h8, h1, a1]` is clockwise in image coordinates — the fact the
    winding normalisation relies on. Checked against real recorded corners, not a guess."""
    assert _shoelace(REAL_QUAD) > 0


@pytest.mark.parametrize("order,name", [
    ([REAL_H1, REAL_A1, REAL_A8, REAL_H8], "rotated click start"),
    ([REAL_A1, REAL_H1, REAL_H8, REAL_A8], "counter-clockwise (mirrored)"),
    ([REAL_A8, REAL_H1, REAL_H8, REAL_A1], "diagonal (self-intersecting) order"),
    (REAL_QUAD, "already correct"),
])
def test_rotation_reaches_the_correct_assignment_from_any_click_order(order, name):
    """The user clicks four points in whatever order and presses `Rotate 90°` until the
    overlay reads right — so exactly one of the four states must BE the right one, for every
    way the four points could have been clicked (including mirrored and non-cyclic)."""
    assert len(_rotation_that_matches(order, REAL_QUAD)) == 1, name
    for r in range(4):                     # every state stays a proper clockwise quad
        assert _shoelace(_quad_from_points(order, rotate=r, normalize=True)) > 0


def test_seeded_order_is_kept_verbatim():
    """With marker ids the assignment is MEASURED, so normalisation must not reshuffle it."""
    assert _same(_quad_from_points(REAL_QUAD, rotate=0, normalize=False), REAL_QUAD)


def test_a_wrong_point_count_is_refused():
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as e:
        _quad_from_points([REAL_A8, REAL_H8, REAL_H1], normalize=True)
    assert "4 corner points" in str(e.value.detail)


# --- fixtures: a synthetic session on disk --------------------------------------------

def _session(tmp_path, monkeypatch, rows_with_corners, *, n=8, size=(400, 400)):
    """A session with `n` rows; `rows_with_corners` maps index -> quad."""
    import cv2

    from chesslab import config
    from chesslab.calibration import CalibrationProfile, CropParams, compute_homography

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    bs = 800
    prof_corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    prof = CalibrationProfile(profile="t", camera_index=-1, frame_size=size, board_size=bs,
                              image_corners=prof_corners,
                              homography=compute_homography(prof_corners, bs),
                              white_pov=True, crop=CropParams.default(bs))
    config.DATA.calibration.mkdir(parents=True)
    prof.save(config.DATA.calibration / "t.yaml")
    sid = "20260730-131226"
    sdir = config.DATA.sessions / sid
    (sdir / "frames").mkdir(parents=True)
    (sdir / "session.yaml").write_text(f"session_id: {sid}\nprofile: t\n", encoding="utf-8")
    frame = np.full((size[1], size[0], 3), 120, np.uint8)
    lines = []
    for i in range(n):
        cv2.imwrite(str(sdir / "frames" / f"{i:04d}.png"), frame)
        row = {"frame": f"frames/{i:04d}.png", "ply": i, "ts": "t",
               "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}
        if i in rows_with_corners:
            row["corners"] = rows_with_corners[i]
        lines.append(json.dumps(row))
    (sdir / "log.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return sid, sdir


def _client():
    from fastapi.testclient import TestClient

    from chesslab.web.app import create_app
    return TestClient(create_app())


# A quad on the 400x400 synthetic frames (covers ~56% of the frame, so it passes the
# plausibility floor) and its four corners in clockwise order.
QUAD = [[40.0, 40.0], [340.0, 55.0], [355.0, 350.0], [55.0, 335.0]]
QUAD2 = [[45.0, 45.0], [345.0, 60.0], [360.0, 355.0], [60.0, 340.0]]


def _rows(sdir):
    return [json.loads(x) for x in (sdir / "log.jsonl").read_text(encoding="utf-8").splitlines()
            if x.strip()]


# --- state / adopt --------------------------------------------------------------------

def test_corners_state_counts_rows_and_offers_the_agreed_quad(tmp_path, monkeypatch):
    """The 20260730-131607 shape: 7 measured rows, 1 without. Both UI actions are labelled
    with these counts, so they have to be right."""
    sid, _sdir = _session(tmp_path, monkeypatch, {i: QUAD for i in range(8) if i != 3})
    st = _client().get(f"/api/sessions/{sid}/corners").json()
    assert (st["n_with"], st["n_without"], st["indices_without"]) == (7, 1, [3])
    assert st["corner_names"] == ["a8", "h8", "h1", "a1"]
    assert st["frame_size"] == [400, 400]
    assert st["adopt"]["available"] is True
    assert st["adopt"]["n_same"] == 7 and st["adopt"]["n_target"] == 1
    assert st["adopt"]["from_index"] == 0
    assert st["rows"][0]["source"] == "detected" and st["rows"][3]["source"] is None


def test_a_single_outlier_row_does_not_become_the_template(tmp_path, monkeypatch):
    sid, _sdir = _session(tmp_path, monkeypatch,
                          {0: QUAD2, 1: QUAD, 2: QUAD, 3: QUAD, 4: QUAD})
    st = _client().get(f"/api/sessions/{sid}/corners").json()
    assert st["adopt"]["from_index"] == 1 and st["adopt"]["n_same"] == 4


def test_adopt_fills_only_the_rows_without_corners(tmp_path, monkeypatch):
    sid, sdir = _session(tmp_path, monkeypatch, {i: QUAD for i in range(8) if i != 3})
    r = _client().post(f"/api/sessions/{sid}/corners/adopt", json={"scope": "missing"}).json()
    assert r["changed"] == 1 and r["indices"] == [3]
    rows = _rows(sdir)
    assert rows[3]["corners"] == QUAD
    assert rows[3]["corners_source"] == "adopted" and rows[3]["corners_from"] == 0
    assert "corners_source" not in rows[0]          # measured rows stay untouched
    assert (sdir / r["backup"]).exists()            # log.jsonl was parked first


def test_adopt_without_any_detected_row_is_refused(tmp_path, monkeypatch):
    """The 20260730-131226 case: nothing to adopt, the user must place the box."""
    sid, _sdir = _session(tmp_path, monkeypatch, {})
    r = _client().post(f"/api/sessions/{sid}/corners/adopt", json={})
    assert r.status_code == 400 and "by hand" in r.json()["detail"]


def test_adopt_never_overwrites_measured_rows_silently(tmp_path, monkeypatch):
    sid, sdir = _session(tmp_path, monkeypatch, dict.fromkeys(range(8), QUAD))
    c = _client()
    r = c.post(f"/api/sessions/{sid}/corners/adopt", json={"scope": "all"})
    assert r.status_code == 409 and "overwrite" in r.json()["detail"]
    assert all("corners_source" not in row for row in _rows(sdir))


# --- hand-set ------------------------------------------------------------------------

def test_hand_set_writes_full_resolution_points_in_storage_order(tmp_path, monkeypatch):
    sid, sdir = _session(tmp_path, monkeypatch, {})
    c = _client()
    # clicked in an arbitrary order; the user rotates until the overlay reads right
    clicked = [QUAD[1], QUAD[2], QUAD[3], QUAD[0]]
    rot = _rotation_that_matches(clicked, QUAD)
    assert len(rot) == 1
    r = c.post(f"/api/sessions/{sid}/corners",
               json={"points": clicked, "index": 2, "rotate": rot[0], "normalize": True,
                     "scope": "frame", "frame_size": [400, 400]}).json()
    assert r["changed"] == 1 and r["indices"] == [2] and r["corners_source"] == "hand"
    rows = _rows(sdir)
    assert rows[2]["corners"] == QUAD                      # exact, unrounded
    assert rows[2]["corners_from"] == 2                    # the frame it was placed on
    assert rows[2]["corners_set_at"]
    assert not rows[3].get("corners")                      # scope=frame touched one row


def test_hand_set_can_fill_the_whole_session_but_only_on_request(tmp_path, monkeypatch):
    """A static sweep shares one quad legitimately — but that is its own explicit action,
    never a side effect of fixing one frame."""
    sid, sdir = _session(tmp_path, monkeypatch, {5: QUAD2})
    c = _client()
    body = {"points": QUAD, "index": 0, "normalize": False, "frame_size": [400, 400]}
    r = c.post(f"/api/sessions/{sid}/corners", json={**body, "scope": "missing"}).json()
    assert r["changed"] == 7 and 5 not in r["indices"]
    rows = _rows(sdir)
    assert rows[5]["corners"] == QUAD2                     # the measured row survived
    assert all(rows[i]["corners_source"] == "hand" for i in r["indices"])


def test_overwriting_a_measured_row_needs_the_flag(tmp_path, monkeypatch):
    sid, sdir = _session(tmp_path, monkeypatch, {0: QUAD2})
    c = _client()
    body = {"points": QUAD, "index": 0, "normalize": False, "scope": "frame",
            "frame_size": [400, 400]}
    r = c.post(f"/api/sessions/{sid}/corners", json=body)
    assert r.status_code == 409 and "overwrite=true" in r.json()["detail"]
    assert _rows(sdir)[0]["corners"] == QUAD2
    r = c.post(f"/api/sessions/{sid}/corners", json={**body, "overwrite": True}).json()
    assert r["changed"] == 1
    assert _rows(sdir)[0]["corners"] == QUAD


@pytest.mark.parametrize("points,frame_size,expect", [
    ([[p[0] / 4, p[1] / 4] for p in QUAD], None, "too small"),
    (QUAD, [100, 100], "measured against"),
    ([[10, 10], [20, 10], [20, 20], [10, 20]], None, "too small"),
    ([[40, 40], [40.5, 40.5], [340, 350], [40, 350]], None, "identical"),
])
def test_implausible_geometry_is_refused_with_the_reason(tmp_path, monkeypatch, points,
                                                        frame_size, expect):
    """Display pixels instead of frame pixels is THE mistake this UI can make (a 3072 px frame
    shown at ~700 px is a factor of four), so it must never reach the log."""
    sid, sdir = _session(tmp_path, monkeypatch, {})
    body = {"points": points, "index": 0, "normalize": True, "scope": "frame"}
    if frame_size:
        body["frame_size"] = frame_size
    r = _client().post(f"/api/sessions/{sid}/corners", json=body)
    assert r.status_code == 400 and expect in r.json()["detail"]
    assert not _rows(sdir)[0].get("corners")


# --- preview / review wiring ---------------------------------------------------------

def test_preview_renders_the_candidate_without_writing_it(tmp_path, monkeypatch):
    sid, sdir = _session(tmp_path, monkeypatch, {})
    c = _client()
    pts = ",".join(f"{v}" for p in QUAD for v in p)
    r = c.get(f"/api/sessions/{sid}/corners/preview/0",
              params={"pts": pts, "normalize": False, "fs": "400,400"})
    assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg"
    assert len(r.content) > 1000
    assert not _rows(sdir)[0].get("corners")               # preview writes nothing
    assert c.get(f"/api/sessions/{sid}/corners/preview/0",
                 params={"pts": "1,2,3"}).status_code == 400


def test_review_exposes_the_geometry_state_of_a_row(tmp_path, monkeypatch):
    sid, _sdir = _session(tmp_path, monkeypatch, {0: QUAD})
    c = _client()
    r0 = c.get(f"/api/sessions/{sid}/review", params={"idx": 0}).json()
    assert r0["entry"]["has_corners"] is True
    assert r0["entry"]["corners_source"] == "detected"
    r1 = c.get(f"/api/sessions/{sid}/review", params={"idx": 1}).json()
    assert r1["entry"]["has_corners"] is False and r1["overlay_available"] is False
    assert r1["entry"]["corners_source"] is None
    # after adopting, the row renders through the normal overlay path
    c.post(f"/api/sessions/{sid}/corners/adopt", json={"scope": "missing"})
    r1 = c.get(f"/api/sessions/{sid}/review", params={"idx": 1}).json()
    assert r1["overlay_available"] is True and r1["entry"]["corners_source"] == "adopted"
    img = c.get(f"/api/sessions/{sid}/overlay/1", params={"labels": True})
    assert img.status_code == 200 and img.headers["content-type"] == "image/jpeg"


# --- marker seeding -------------------------------------------------------------------

def test_seed_measures_the_markers_it_finds_and_names_the_missing_one(tmp_path, monkeypatch):
    """Three of four markers detected -> three corners are exact and only one needs a click.
    Marker 0 is left out on purpose: that is data/sessions/20260730-131226."""
    import cv2

    from chesslab import config
    sid, sdir = _session(tmp_path, monkeypatch, {}, n=2, size=(600, 600))
    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    at = {1: (440, 60), 2: (440, 440), 3: (60, 440)}        # h8, h1, a1 — no marker 0
    frame = np.full((600, 600, 3), 255, np.uint8)
    for mid, (x, y) in at.items():
        img = cv2.aruco.generateImageMarker(d, mid, 80)
        frame[y:y + 80, x:x + 80] = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    cv2.imwrite(str(sdir / "frames" / "0000.png"), frame)
    cv2.imwrite(str(sdir / "frames" / "0001.png"), np.full((600, 600, 3), 255, np.uint8))
    (config.DATA.calibration / "t.yaml").write_text(
        (config.DATA.calibration / "t.yaml").read_text(encoding="utf-8"), encoding="utf-8")

    s = _client().get(f"/api/sessions/{sid}/corners/seed/0").json()
    assert s["frame_size"] == [600, 600]
    assert s["found_here"] == [1, 2, 3] and s["missing"] == [0]
    slots = {x["name"]: x for x in s["slots"]}
    assert slots["a8"]["measured"] is False and slots["a8"]["point"] is None
    for name, mid in (("h8", 1), ("h1", 2), ("a1", 3)):
        assert slots[name]["measured"] is True and slots[name]["from_index"] == 0
        cx, cy = at[mid][0] + 39.5, at[mid][1] + 39.5      # marker centre
        assert slots[name]["point"] == pytest.approx([cx, cy], abs=1.0)


def test_seed_borrows_a_marker_from_another_frame_and_says_which(tmp_path, monkeypatch):
    """Same board, same tripod: a marker that this frame lost may be measured in the next
    one. That is the identical argument `adopt` rests on, so it is labelled the same way."""
    import cv2

    sid, sdir = _session(tmp_path, monkeypatch, {}, n=2, size=(600, 600))
    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)

    def _frame(ids):
        f = np.full((600, 600, 3), 255, np.uint8)
        for mid, (x, y) in ids.items():
            f[y:y + 80, x:x + 80] = cv2.cvtColor(cv2.aruco.generateImageMarker(d, mid, 80),
                                                 cv2.COLOR_GRAY2BGR)
        return f

    spots = {0: (60, 60), 1: (440, 60), 2: (440, 440), 3: (60, 440)}
    cv2.imwrite(str(sdir / "frames" / "0000.png"),
                _frame({k: v for k, v in spots.items() if k != 1}))
    cv2.imwrite(str(sdir / "frames" / "0001.png"), _frame(spots))
    s = _client().get(f"/api/sessions/{sid}/corners/seed/0").json()
    assert s["found_here"] == [0, 2, 3] and s["missing"] == []
    h8 = next(x for x in s["slots"] if x["name"] == "h8")
    assert h8["measured"] is True and h8["from_index"] == 1 and h8["here"] is False
