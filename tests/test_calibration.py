"""Stage 1 headless tests: profile round-trip + square_to_crop_box geometry.

The interactive new/check flows need a camera + display and are exercised on the rig.
"""

import numpy as np

from chesslab.calibration import (
    CalibrationProfile,
    CropParams,
    compute_homography,
    square_to_crop_box,
)


def _make_profile(board_size: int = 800, white_pov: bool = True) -> CalibrationProfile:
    corners = [[100.0, 50.0], [700.0, 50.0], [760.0, 650.0], [40.0, 650.0]]  # a8,h8,h1,a1
    H = compute_homography(corners, board_size)
    return CalibrationProfile(
        profile="test",
        camera_index=0,
        frame_size=(1280, 720),
        board_size=board_size,
        image_corners=corners,
        homography=H,
        white_pov=white_pov,
        crop=CropParams.default(board_size),
    )


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
    """pad_up=pad_side=0: die Box ist exakt die quadratische Zelle (board_size/8)."""
    prof = _make_profile()
    prof.crop.pad_side = 0.0
    prof.crop.pad_up = 0.0
    bs = prof.board_size
    cell = bs / 8.0
    x0, y0, x1, y1 = square_to_crop_box("e2", prof)
    assert 0 <= x0 < x1 <= bs and 0 <= y0 < y1 <= bs
    assert abs((x1 - x0) - cell) <= 1 and abs((y1 - y0) - cell) <= 1   # quadratisch, eine Zelle


def test_crop_box_pad_side_symmetric():
    """pad_side weitet die Zelle SYMMETRISCH in alle 4 Richtungen (Default 0.05 = 5% je Seite)."""
    prof = _make_profile()
    prof.crop.pad_side = 0.05
    prof.crop.pad_up = 0.0
    cell = prof.board_size / 8.0
    x0, y0, x1, y1 = square_to_crop_box("e4", prof, clamp=False)   # Innenfeld -> kein Clamp
    assert abs((x1 - x0) - cell * 1.10) <= 1 and abs((y1 - y0) - cell * 1.10) <= 1


def test_crop_extends_upward_when_pad_up_set():
    """Mit pad_up>0 wird die Box nach oben verlängert (für hohe 3D-Figuren bei schräger Kamera)."""
    prof = _make_profile()
    prof.crop.pad_up = 1.0
    bs = prof.board_size
    cell = bs / 8.0
    x0, y0, x1, y1 = square_to_crop_box("e2", prof)          # e2: nicht am oberen Rand
    assert (y1 - y0) > cell                                   # nach oben verlängert
    # roh (clamp=False) darf über den Rand ragen; crop_square füllt dann auf
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

    # inner mode -> each point pulled toward the board centroid (für Kleben neben das Feld)
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
    assert 0 < t.last[0][0] < 40                    # geglättet, liegt zwischen alt und neu


def test_marker_tracker_rejects_then_confirms_jump():
    """Ausreißer (ein Frame) wird gehalten; ein echtes Verschieben (mehrere Frames) gesetzt."""
    from chesslab.calibration import MarkerTracker

    t = MarkerTracker()
    t.update({0: [10, 10]})
    t.update({0: [300, 300]})                       # >jump_reject_px, einmalig -> verworfen
    assert t.last[0] == [10, 10]
    t.update({0: [300, 300]})                       # zweiter Frame bestätigt -> jetzt übernehmen (EMA)
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
        CalibrationProfile,
        CropParams,
        MarkerTracker,
        compute_homography,
        make_tracker,
    )

    t = MarkerTracker()
    t.seed({0: [0, 0], 1: [100, 0], 2: [100, 100], 3: [0, 100]})
    assert set(t.points()) == {0, 1, 2, 3}
    assert all(s == "seed" for s in t.status().values())
    t.update({0: [0, 0]})                           # marker 0 live bestätigt
    assert t.status()[0] == "live" and t.status()[1] == "seed"

    corners = [[0, 0], [100, 0], [100, 100], [0, 100]]
    prof = CalibrationProfile(
        profile="t", camera_index=0, frame_size=(200, 200), board_size=100,
        image_corners=corners, homography=compute_homography(corners, 100, 0.0),
        white_pov=True, crop=CropParams.default(100), margin=0.0,
    )
    seeded = make_tracker(prof)
    assert set(seeded.points()) == {0, 1, 2, 3}     # aus dem Profil vorbelegt


def test_resolve_board_corners_too_few():
    from chesslab.calibration import resolve_board_corners

    assert resolve_board_corners({0: [0, 0]}) is None
    assert resolve_board_corners({}) is None


def test_board_corners_for_frame_and_warp_from_corners():
    import cv2

    from chesslab.calibration import (
        CalibrationProfile,
        CropParams,
        MarkerTracker,
        board_corners_for_frame,
        compute_homography,
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
    prof = CalibrationProfile(profile="t", camera_index=0, frame_size=(800, 600), board_size=bs,
                              image_corners=[list(known[i]) for i in range(4)],
                              homography=compute_homography([list(known[i]) for i in range(4)], bs),
                              white_pov=True, crop=CropParams.default(bs), margin=0.0)
    corners = board_corners_for_frame(frame, prof, MarkerTracker())
    assert corners is not None and len(corners) == 4
    for i, (x, y) in enumerate(corners):                 # ~ Marker-Zentren
        assert abs(x - known[i][0]) < 3 and abs(y - known[i][1]) < 3
    warped = warp_from_corners(frame, prof, corners)      # reine Transformation, keine Detektion
    assert warped.shape[:2] == (bs, bs)


def test_homography_margin_insets_playing_field():
    import cv2
    import numpy as np

    from chesslab.calibration import compute_homography

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
