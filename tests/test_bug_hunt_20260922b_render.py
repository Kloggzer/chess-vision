"""Der Blender-Renderer `synth/render_board_v2.py` ueber `tests/bpy_stub`: Pixel je Feld."""

from __future__ import annotations

import math
import random
import statistics

import pytest

from bpy_stub import Euler, StubGap, install, load

RES = 1024
AXIS_ALIGNED_PX = 102.4
DIAGONAL_PX = 72.41


@pytest.fixture
def board():
    """Szene, Kamera und das frisch geladene Modul — je Test eigene Modul-Globals."""
    bpy = install()
    rb = load("render_board_v2")
    scene = bpy.context.scene
    scene.render.resolution_x = scene.render.resolution_y = RES
    return rb, scene, rb.setup_camera()


def _overhead(cam, roll_deg=0.0, height=94.0):
    cam.location = [0.0, 0.0, height]
    cam.rotation_euler = Euler((0.0, 0.0, math.radians(roll_deg)))
    return cam


def _px_per_cell(rb, scene, cam) -> float:
    c = rb.corners_px(scene, cam)
    return sum(math.dist(c[i], c[(i + 1) % 4]) for i in range(4)) / 4.0 / 8.0


# --- 1. Die Achse px je Feld -----------------------------------------------------------------

def test_the_declared_framing_is_still_zero_point_eight(board):
    rb, _, _ = board
    assert rb.BOARD_FRAME_FRAC == 0.80


def test_an_axis_aligned_board_gets_102_4_px_per_cell(board):
    """`res * 0,80 / 8` — die arithmetische OBERGRENZE, die nur senkrecht ausgerichtet faellt."""
    rb, scene, cam = board
    rb.frame_board(scene, _overhead(cam), 0.80)
    assert _px_per_cell(rb, scene, cam) == pytest.approx(AXIS_ALIGNED_PX, abs=0.05)


def test_a_45_degree_roll_costs_the_root_two(board):
    """Geregelt wird die ACHSENPARALLELE Bounding-Box, die Brett-SEITE ist um bis zu √2 kuerzer."""
    rb, scene, cam = board
    rb.frame_board(scene, _overhead(cam, roll_deg=45.0), 0.80)
    got = _px_per_cell(rb, scene, cam)
    assert got == pytest.approx(DIAGONAL_PX, abs=0.1)
    assert got == pytest.approx(AXIS_ALIGNED_PX / math.sqrt(2.0), abs=0.1)


def test_the_pose_distribution_lands_at_79_px_per_cell(board):
    """Die gemessene Mitte der echten Posen — NICHT die 102,4, die die Obergrenze suggeriert."""
    rb, scene, cam = board
    rng = random.Random(7)
    vals = []
    for _ in range(400):
        rb.place_camera(cam, rng, 0.20, 0.0)
        rb.frame_board(scene, cam, 0.80)
        vals.append(_px_per_cell(rb, scene, cam))
    assert statistics.mean(vals) == pytest.approx(79.0, abs=1.5)
    assert max(vals) <= AXIS_ALIGNED_PX + 0.1
    assert min(vals) > 60.0


def test_the_module_default_frames_exactly_like_the_literal(board):
    """Ohne Argument muss `frame_board` dieselbe Rahmung liefern wie die Zahl 0,80."""
    rb, scene, cam = board
    _overhead(cam, roll_deg=20.0)
    assert rb.frame_board(scene, cam) == pytest.approx(rb.frame_board(scene, cam, 0.80))


# --- 2. Was `frame_board` sonst verspricht ---------------------------------------------------

def test_no_corner_leaves_the_image_over_the_pose_band(board):
    rb, scene, cam = board
    rng = random.Random(11)
    for _ in range(200):
        rb.place_camera(cam, rng, 0.45, 0.35)
        rb.frame_board(scene, cam, 0.80)
        for x, y in rb.corners_px(scene, cam):
            assert 0.0 <= x <= RES and 0.0 <= y <= RES


def test_the_base_focal_length_is_remembered_not_multiplied(board):
    """Ohne den Anker multipliziert sich die Korrektur ueber die Frames auf."""
    rb, scene, cam = board
    _overhead(cam, roll_deg=30.0)
    first = rb.frame_board(scene, cam, 0.80)
    again = first
    for _ in range(5):
        again = rb.frame_board(scene, cam, 0.80)
    assert again == pytest.approx(first, abs=1e-9)
    assert rb._BASE_CAM_LENS[cam.name] == 28.0


def test_the_pose_is_never_perfectly_overhead_but_still_varies(board):
    """Untergrenze 0,04 (nie senkrecht) — und sie darf eine KLEINERE Obergrenze nicht anheben."""
    rb, _, cam = board
    rng = random.Random(3)
    drawn = [rb.place_camera(cam, rng, 0.20, 0.0)["obliqueness"] for _ in range(300)]
    assert min(drawn) < 0.06 and max(drawn) > 0.19
    tight = [rb.place_camera(cam, rng, 0.02, 0.0)["obliqueness"] for _ in range(50)]
    assert max(tight) <= 0.02


def test_framing_off_restores_the_base_lens(board):
    rb, scene, cam = board
    _overhead(cam)
    rb.frame_board(scene, cam, 0.80)
    assert rb.frame_board(scene, cam, 0.0) == 28.0
    assert cam.data.lens == 28.0


# --- 3. Ecken, Felder, FEN --------------------------------------------------------------------

def test_corners_px_keeps_the_a8_h8_h1_a1_order_and_flips_y(board):
    """Bildkoordinaten zaehlen y nach UNTEN; die Reihenfolge ist die Konvention des Repos."""
    rb, scene, cam = board
    rb.frame_board(scene, _overhead(cam), 0.80)
    a8, h8, h1, a1 = rb.corners_px(scene, cam)
    assert a8[0] > RES / 2 and a8[1] > RES / 2
    assert h8[0] > RES / 2 and h8[1] < RES / 2
    assert h1[0] < RES / 2 and h1[1] < RES / 2
    assert a1[0] < RES / 2 and a1[1] > RES / 2


def test_every_square_centre_sits_inside_its_own_corner(board):
    rb, _, _ = board
    half = rb.CELL / 2.0
    for name, (cx, cy) in rb.BOARD_CORNERS_3D.items():
        fi, ri = ord(name[0]) - ord("a"), int(name[1]) - 1
        sx, sy = rb.square_center(fi, ri)
        assert (abs(sx - cx), abs(sy - cy)) == (half, half)
        assert abs(sx) < abs(cx) and abs(sy) < abs(cy)


def test_the_64_centres_tile_the_board_on_a_six_unit_grid(board):
    rb, _, _ = board
    centres = {rb.square_center(fi, ri) for fi in range(8) for ri in range(8)}
    assert len(centres) == 64
    xs = sorted({x for x, _ in centres})
    assert xs == [-21.0, -15.0, -9.0, -3.0, 3.0, 9.0, 15.0, 21.0]
    assert rb.square_center(0, 0) == (-21.0, -21.0)
    assert rb.square_center(7, 0) == (-21.0, 21.0)


def test_parse_fen_placement_puts_the_white_rook_on_a1(board):
    rb, _, _ = board
    got = rb.parse_fen_placement("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
    assert len(got) == 32
    assert (0, 0, "R") in got and (4, 0, "K") in got
    assert (0, 7, "r") in got and (4, 7, "k") in got
    assert all(ri in (0, 1, 6, 7) for _, ri, _ in got)


def test_parse_fen_placement_counts_the_digits_as_skips(board):
    rb, _, _ = board
    assert rb.parse_fen_placement("8/8/8/8/8/8/8/4Q3 w - - 0 1") == [(4, 0, "Q")]


# --- 4. Occluder: der Fussabdruck ist der im BILD, nicht der in der Brettebene ----------------

def _footprint(rb, scene, cam, fi=3, ri=3, angle=0.0):
    fx, fy = rb.square_center(fi, ri)
    return rb.occluder_footprint_image(scene, cam, fx, fy, angle)


def test_the_fist_hides_the_square_it_stands_on_when_seen_from_above(board):
    rb, scene, cam = board
    rb.frame_board(scene, _overhead(cam), 0.80)
    occluded, ambiguous = _footprint(rb, scene, cam)
    assert "d4" in occluded
    assert not set(occluded) & set(ambiguous)


def test_an_oblique_camera_shifts_the_footprint_off_the_fists_own_square(board):
    """Der Arm schwebt ARM_Z ueber dem Brett — die Parallaxe verschiebt, was er im Bild deckt."""
    rb, scene, cam = board
    rb.frame_board(scene, _overhead(cam), 0.80)
    straight = set(_footprint(rb, scene, cam)[0])
    cam.location = [40.0, 0.0, 70.0]
    cam.rotation_euler = Euler((0.0, math.radians(30.0), 0.0))
    rb.frame_board(scene, cam, 0.80)
    tilted = set(_footprint(rb, scene, cam)[0])
    assert tilted and tilted != straight


def test_the_middle_band_is_returned_as_ambiguous_not_as_occluded(board):
    """Eine Schwelle kann ein Feld nicht labeln, das halb Arm und halb Turm ist."""
    rb, scene, cam = board
    rb.frame_board(scene, _overhead(cam), 0.80)
    occluded, ambiguous = _footprint(rb, scene, cam)
    wide, _ = rb.occluder_footprint_image(scene, cam, *rb.square_center(3, 3), 0.0, hi=0.10)
    assert ambiguous, "kein Feld faellt in das Band zwischen lo und hi"
    assert set(occluded) | set(ambiguous) <= set(wide)
    assert len(wide) > len(occluded)


def test_the_fist_is_wider_than_the_shaft_and_takes_its_neighbour(board):
    """Die Faust ist 1,3x dicker als der Schaft — ohne das bleibt c4 beim Figuren-Label."""
    rb, scene, cam = board
    rb.frame_board(scene, _overhead(cam), 0.80)
    occluded, _ = _footprint(rb, scene, cam)
    assert {"d4", "c4"} <= set(occluded)


def test_the_arm_reaches_the_board_edge_along_its_angle(board):
    rb, scene, cam = board
    rb.frame_board(scene, _overhead(cam), 0.80)
    east = set(_footprint(rb, scene, cam, angle=0.0)[0])
    west = set(_footprint(rb, scene, cam, angle=math.pi)[0])
    assert east != west
    assert east and west


# --- 5. Der Stub ist ehrlich: was er nicht nachbildet, wirft ----------------------------------

def test_the_stub_refuses_the_degenerate_track_quat(board):
    """Genau senkrecht ist die Rolle in Blender intern entschieden — hier wird nicht geraten."""
    from bpy_stub import Vector

    with pytest.raises(StubGap):
        Vector((0.0, 0.0, -1.0)).to_track_quat("-Z", "Y")
