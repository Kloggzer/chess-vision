"""Headless tests: profile round-trip and square_to_crop_box geometry."""

import cv2
import numpy as np
import pytest

from chesslab.calibration import (
    CalibrationProfile,
    CropParams,
    compute_homography,
    square_to_crop_box,
)
from conftest import make_profile


def _make_profile(board_size: int = 800, white_pov: bool = True) -> CalibrationProfile:
    corners = [[100.0, 50.0], [700.0, 50.0], [760.0, 650.0], [40.0, 650.0]]  # a8,h8,h1,a1
    return make_profile(board_size, corners=corners, frame_size=(1280, 720),
                        white_pov=white_pov)


def test_crop_border_covers_the_pad_on_every_edge():
    """The border must reach as far past the board as an edge square's crop box does: one symmetric
    `pad_side` drives both, and a border trailing the pad gave rank 8 replicated border.
    """
    from chesslab.calibration import crop_border_px

    prof = _make_profile(board_size=800)
    prof.crop = CropParams(cell=100.0, pad_side=0.30, out_size=(128, 128))
    border = crop_border_px(prof)

    x0, y0, _x1, _y1 = square_to_crop_box("a8", prof, clamp=False)
    _x0, _y0, x1, y1 = square_to_crop_box("h1", prof, clamp=False)
    reach = max(-x0, -y0, x1 - prof.board_size, y1 - prof.board_size)
    assert border >= reach, f"the box reaches {reach} px past the board, only {border} px are warped"


def test_profile_roundtrip_without_camera(tmp_path):
    prof = _make_profile()
    path = tmp_path / "default.yaml"
    prof.save(path)
    loaded = CalibrationProfile.load(path)
    assert loaded.to_dict() == prof.to_dict()
    assert loaded.board_size == 800
    assert loaded.white_pov is True


def test_a8_and_h1_are_opposite_corners():
    prof = _make_profile(white_pov=True)
    bs = prof.board_size
    a8 = square_to_crop_box("a8", prof)
    h1 = square_to_crop_box("h1", prof)
    # a8 in the top-left, h1 in the bottom-right of the rectified board.
    assert a8[0] == 0                      # left edge, clamped
    assert a8[1] == 0                      # top edge (upward extension clamped)
    assert h1[2] == bs                     # right edge, clamped
    assert h1[3] == bs                     # bottom edge
    assert a8[0] < h1[0] and a8[1] < h1[1]


def test_white_pov_false_flips_board():
    pov = _make_profile(white_pov=True)
    flipped = _make_profile(white_pov=False)
    # With POV flipped, a8 lands where h1 was (opposite corner).
    a8_flipped = square_to_crop_box("a8", flipped)
    h1_pov = square_to_crop_box("h1", pov)
    assert a8_flipped == h1_pov


def test_crop_box_zero_pad_is_square_cell():
    """pad_side=0: die Box ist exakt die quadratische Zelle (board_size/8)."""
    prof = _make_profile()
    prof.crop.pad_side = 0.0
    bs = prof.board_size
    cell = bs / 8.0
    x0, y0, x1, y1 = square_to_crop_box("e2", prof)
    assert 0 <= x0 < x1 <= bs and 0 <= y0 < y1 <= bs
    assert abs((x1 - x0) - cell) <= 1 and abs((y1 - y0) - cell) <= 1   # quadratisch, eine Zelle


def test_crop_box_pad_side_symmetric():
    """pad_side weitet die Zelle SYMMETRISCH in alle 4 Richtungen (Default 0.05 = 5% je Seite)."""
    prof = _make_profile()
    prof.crop.pad_side = 0.05
    cell = prof.board_size / 8.0
    x0, y0, x1, y1 = square_to_crop_box("e4", prof, clamp=False)   # Innenfeld -> kein Clamp
    assert abs((x1 - x0) - cell * 1.10) <= 1 and abs((y1 - y0) - cell * 1.10) <= 1


def test_the_box_stays_square_at_every_pad():
    """No pad can make the box taller than wide."""
    prof = _make_profile()
    cell = prof.board_size / 8.0
    for pad in (0.0, 0.05, 0.5, 1.0):
        prof.crop.pad_side = pad
        x0, y0, x1, y1 = square_to_crop_box("e2", prof, clamp=False)
        assert (x1 - x0) == (y1 - y0)
        assert abs((y1 - y0) - cell * (1 + 2 * pad)) <= 1
    # raw (clamp=False) may extend beyond the edge; crop_square fills in
    _, y0u, _, _ = square_to_crop_box("e8", prof, clamp=False)
    assert y0u < 0


def test_generate_markers_writes_sheet(tmp_path):
    import cv2

    from chesslab.calibration import generate_markers

    p = generate_markers(tmp_path / "markers.png", marker_px=120)
    img = cv2.imread(str(p))
    assert img is not None and img.shape[0] > 0 and img.shape[1] > 0


def test_aruco_detect_corners_roundtrip():
    import cv2
    import numpy as np

    from chesslab.calibration import detect_board_corners_aruco

    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    frame = np.full((600, 800, 3), 255, dtype=np.uint8)
    # known centers for a8(id0), h8(id1), h1(id2), a1(id3)
    known = {0: (150, 120), 1: (650, 120), 2: (650, 480), 3: (150, 480)}
    s = 80
    for mid, (cx, cy) in known.items():
        m = cv2.cvtColor(cv2.aruco.generateImageMarker(d, mid, s), cv2.COLOR_GRAY2BGR)
        frame[cy - s // 2:cy + s // 2, cx - s // 2:cx + s // 2] = m

    # center mode -> exact marker centers, order [a8, h8, h1, a1]
    pts_c = detect_board_corners_aruco(frame, corner="center")
    assert pts_c is not None and len(pts_c) == 4
    for i, (x, y) in enumerate(pts_c):
        kx, ky = known[i]
        assert abs(x - kx) < 3 and abs(y - ky) < 3

    # inner mode -> each point pulled toward the board centroid (for gluing next to the square)
    import math
    pts_i = detect_board_corners_aruco(frame, corner="inner")
    cen = (sum(k[0] for k in known.values()) / 4, sum(k[1] for k in known.values()) / 4)
    for i, (x, y) in enumerate(pts_i):
        kx, ky = known[i]
        assert math.hypot(x - cen[0], y - cen[1]) < math.hypot(kx - cen[0], ky - cen[1])

    # missing a marker -> None
    frame2 = np.full((600, 800, 3), 255, dtype=np.uint8)
    m = cv2.cvtColor(cv2.aruco.generateImageMarker(d, 0, s), cv2.COLOR_GRAY2BGR)
    frame2[80:160, 110:190] = m
    assert detect_board_corners_aruco(frame2) is None


def test_resolve_board_corners_3_markers_parallelogram():
    from chesslab.calibration import resolve_board_corners

    # a8(id0), h8(id1), a1(id3) known; h1(id2) missing -> parallelogram completion
    pts = {0: [0, 0], 1: [100, 0], 3: [0, 100]}
    corners, n = resolve_board_corners(pts)
    assert n == 3
    assert abs(corners[2][0] - 100) < 1 and abs(corners[2][1] - 100) < 1   # h1 reconstructed


def test_resolve_board_corners_2_adjacent_square():
    from chesslab.calibration import resolve_board_corners

    pts = {0: [0, 0], 1: [100, 0]}                 # top edge a8,h8
    corners, n = resolve_board_corners(pts)
    assert n == 2
    assert abs(corners[3][0] - 0) < 1 and abs(corners[3][1] - 100) < 1     # a1
    assert abs(corners[2][0] - 100) < 1 and abs(corners[2][1] - 100) < 1   # h1


def test_resolve_board_corners_2_diagonal_square():
    from chesslab.calibration import resolve_board_corners

    pts = {0: [0, 0], 2: [100, 100]}               # diagonal a8,h1
    corners, n = resolve_board_corners(pts)
    assert n == 2
    # the other diagonal h8/a1 sits on the perpendicular through the centre
    assert {tuple(round(v) for v in corners[1]), tuple(round(v) for v in corners[3])} == {(100, 0), (0, 100)}


def test_marker_tracker_holds_and_deadzone():
    from chesslab.calibration import MarkerTracker

    t = MarkerTracker()
    t.update({0: [10, 10], 1: [20, 20]})
    merged = t.update({0: [10, 10]})              # marker 1 weg -> letzte Position bleibt (hold)
    assert merged[1] == [20, 20]
    assert t.status()[0] == "live" and t.status()[1] == "held"
    t.update({0: [11, 11]})                        # 2px Jitter < Dead-Zone -> Position einfrieren
    assert t.last[0] == [10, 10]
    assert t.n_held() == 1                          # marker 1 weiterhin nur gehalten


def test_marker_tracker_smooths_real_motion():
    from chesslab import config
    from chesslab.calibration import MarkerTracker

    t = MarkerTracker()
    t.update({0: [0, 0]})
    t.update({0: [40, 0]})                          # echte Bewegung (>Dead-Zone, <Sprung) -> EMA
    a = config.TRACKER.smooth_alpha
    assert abs(t.last[0][0] - 40 * a) < 1e-6
    assert 0 < t.last[0][0] < 40                    # smoothed, lies between old and new


def test_marker_tracker_rejects_then_confirms_jump():
    """Outlier (one frame) is held; a true shift (multiple frames) is committed."""
    from chesslab.calibration import MarkerTracker

    t = MarkerTracker()
    t.update({0: [10, 10]})
    t.update({0: [300, 300]})                       # >jump_reject_px, einmalig -> verworfen
    assert t.last[0] == [10, 10]
    t.update({0: [300, 300]})                       # second frame confirmed -> now adopt (EMA)
    assert t.last[0][0] > 10                         # Selbstkorrektur greift


def test_marker_tracker_ages_to_stale():
    from chesslab import config
    from chesslab.calibration import MarkerTracker

    t = MarkerTracker()
    t.update({0: [10, 10], 1: [20, 20]})
    for _ in range(config.TRACKER.max_held_frames):
        t.update({0: [10, 10]})                     # marker 1 dauerhaft verdeckt
    assert t.status()[1] == "stale"                 # gehaltene Ecke wird als veraltet markiert
    assert t.status()[0] == "live"


def test_marker_tracker_seed_and_make_tracker():
    """Geseedeter Tracker kennt alle 4 Ecken sofort; Live-Detektion ersetzt den Seed."""
    from chesslab.calibration import (
        MarkerTracker,
        make_tracker,
    )

    t = MarkerTracker()
    t.seed({0: [0, 0], 1: [100, 0], 2: [100, 100], 3: [0, 100]})
    assert set(t.points()) == {0, 1, 2, 3}
    assert all(s == "seed" for s in t.status().values())
    t.update({0: [0, 0]})                           # marker 0 confirmed live
    assert t.status()[0] == "live" and t.status()[1] == "seed"

    corners = [[0, 0], [100, 0], [100, 100], [0, 100]]
    prof = make_profile(100, corners=corners, frame_size=(200, 200), profile="t")
    seeded = make_tracker(prof)
    assert set(seeded.points()) == {0, 1, 2, 3}     # aus dem Profil vorbelegt


def test_resolve_board_corners_too_few():
    from chesslab.calibration import resolve_board_corners

    assert resolve_board_corners({0: [0, 0]}) is None
    assert resolve_board_corners({}) is None


def test_board_corners_for_frame_and_warp_from_corners():
    import cv2

    from chesslab.calibration import (
        MarkerTracker,
        board_corners_for_frame,
        warp_from_corners,
    )

    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    frame = np.full((600, 800, 3), 255, dtype=np.uint8)
    known = {0: (150, 120), 1: (650, 120), 2: (650, 480), 3: (150, 480)}
    s = 80
    for mid, (cx, cy) in known.items():
        m = cv2.cvtColor(cv2.aruco.generateImageMarker(d, mid, s), cv2.COLOR_GRAY2BGR)
        frame[cy - s // 2:cy + s // 2, cx - s // 2:cx + s // 2] = m

    bs = 800
    prof = make_profile(bs, corners=[list(known[i]) for i in range(4)],
                        frame_size=(800, 600), profile="t")
    corners = board_corners_for_frame(frame, prof, MarkerTracker())
    assert corners is not None and len(corners) == 4
    for i, (x, y) in enumerate(corners):                 # ~ Marker-Zentren
        assert abs(x - known[i][0]) < 3 and abs(y - known[i][1]) < 3
    warped = warp_from_corners(frame, prof, corners)      # reine Transformation, keine Detektion
    assert warped.shape[:2] == (bs, bs)


def test_homography_margin_insets_playing_field():
    import cv2


    # marker box = a 100x100 image square; field should sit inset for margin>0
    corners = [[0, 0], [100, 0], [100, 100], [0, 100]]
    h_inv = np.linalg.inv(np.array(compute_homography(corners, 800, margin=0.1)))
    a8 = cv2.perspectiveTransform(np.array([[[0.0, 0.0]]], dtype=np.float32), h_inv).reshape(2)
    # inset fraction = margin/(1+2*margin) = 0.1/1.2 -> 8.33% of the 100-px span
    assert abs(a8[0] - 8.333) < 0.5 and abs(a8[1] - 8.333) < 0.5

    # margin=0 -> field corner coincides with the marker corner (backward compatible)
    h0 = np.linalg.inv(np.array(compute_homography(corners, 800, margin=0.0)))
    a8_0 = cv2.perspectiveTransform(np.array([[[0.0, 0.0]]], dtype=np.float32), h0).reshape(2)
    assert abs(a8_0[0]) < 0.5 and abs(a8_0[1]) < 0.5


def test_homography_maps_clicked_corner_to_origin():
    prof = _make_profile()
    H = np.array(prof.homography)
    a8 = np.array([*prof.image_corners[0], 1.0])
    mapped = H @ a8
    mapped = mapped[:2] / mapped[2]
    assert np.allclose(mapped, [0.0, 0.0], atol=1e-3)
def _marker_frame():
    """Synthetic frame with all 4 ArUco markers at known centers."""
    import cv2
    import numpy as np

    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    frame = np.full((600, 800, 3), 255, dtype=np.uint8)
    known = {0: (150, 120), 1: (650, 120), 2: (650, 480), 3: (150, 480)}
    s = 80
    for mid, (cx, cy) in known.items():
        m = cv2.cvtColor(cv2.aruco.generateImageMarker(d, mid, s), cv2.COLOR_GRAY2BGR)
        frame[cy - s // 2:cy + s // 2, cx - s // 2:cx + s // 2] = m
    return frame


def test_profile_save_is_atomic_and_leaves_no_temp_file(tmp_path):
    from chesslab.calibration import CalibrationProfile

    prof = make_profile(800, corners=[[0, 0], [1, 0], [1, 1], [0, 1]],
                        homography=[[1, 0, 0], [0, 1, 0], [0, 0, 1]],
                        frame_size=(640, 480), profile="atomic")
    p = tmp_path / "atomic.yaml"
    prof.save(p)
    assert not p.with_suffix(".yaml.tmp").exists()
    assert not p.with_suffix(".yaml.bak").exists()      # nothing to back up on first write

    prof.board_size = 900
    prof.save(p, backup=True)
    assert CalibrationProfile.load(p).board_size == 900
    assert CalibrationProfile.load(p.with_suffix(".yaml.bak")).board_size == 800


# =======================================================================================
# per-corner margin
# =======================================================================================

def test_margins4_broadcasts_a_scalar_and_passes_four_through():
    from chesslab.calibration import margins4

    assert margins4(0.05) == [0.05] * 4
    assert margins4([0.04, 0.05, 0.045, 0.06]) == [0.04, 0.05, 0.045, 0.06]
    assert margins4((0.0, 0.0, 0.0, 0.0)) == [0.0] * 4
    with pytest.raises(ValueError):
        margins4([0.04, 0.05])


def test_a_scalar_margin_still_produces_the_square_it_always_did():
    """The four-value form must be a strict generalisation — one number, same homography."""

    quad = [[10.0, 12.0], [210.0, 8.0], [214.0, 208.0], [6.0, 204.0]]
    scalar = np.array(compute_homography(quad, 160, 0.05))
    spread = np.array(compute_homography(quad, 160, [0.05] * 4))
    assert np.allclose(scalar, spread)


def test_one_corner_moves_only_its_own_corner():
    """A re-glued marker must not drag the other three: that is the whole point of per-corner.

    The board corner a8 maps to (0,0). Raising ONLY a8's margin pushes that marker further
    out, so the playing-field corner it implies moves — while h1, diagonally opposite, stays.
    """

    bs = 160
    quad = [[10.0, 12.0], [210.0, 8.0], [214.0, 208.0], [6.0, 204.0]]
    field = np.array([[0.0, 0.0], [bs, 0.0], [bs, bs], [0.0, bs]], dtype=np.float32).reshape(-1, 1, 2)

    def corners_for(margin):
        h = np.array(compute_homography(quad, bs, margin), dtype=np.float64)
        return cv2.perspectiveTransform(field, np.linalg.inv(h)).reshape(-1, 2)

    base = corners_for([0.05] * 4)
    tilted = corners_for([0.09, 0.05, 0.05, 0.05])
    moved = np.linalg.norm(tilted - base, axis=1)
    assert moved[0] > 2.0, "a8 must follow its own margin"
    assert moved[2] < 0.5, "h1 is diagonally opposite and must not move"


def test_a_profile_written_before_per_corner_margins_still_loads():
    """Old YAML stored ONE number. It must broadcast, not crash and not silently become 0."""
    from chesslab.calibration import CalibrationProfile

    prof = make_profile(160, corners=[[0, 0], [1, 0], [1, 1], [0, 1]],
                        homography=[[1, 0, 0], [0, 1, 0], [0, 0, 1]],
                        frame_size=(640, 480), profile="legacy")
    d = prof.to_dict()
    d["margin"] = 0.06                                   # what every profile on disk looks like
    assert CalibrationProfile.from_dict(d).margin == [0.06] * 4


def test_the_margin_default_has_exactly_one_source():
    """`config.DEFAULT_MARKER_MARGIN` is authoritative — a second literal would drift from it."""
    import inspect

    from chesslab import config
    from chesslab.realgames.stored import fit_stored_session

    assert config.DEFAULT_MARKER_MARGIN == pytest.approx(0.045)
    assert inspect.signature(fit_stored_session).parameters["margin"].default == config.DEFAULT_MARKER_MARGIN
