"""Benchmark tracker operations on a simulated 800² warp pair.

Loads one real session frame, builds a synthetic 800² board-warp pair, and
times the key per-frame operations. Prints a markdown table.
Run before and after each Stage-A step.
"""

from __future__ import annotations

import timeit
from pathlib import Path

import cv2
import numpy as np

# --- Load a real frame ---
_session_dir = Path("data/sessions/20260706-151603/frames")
_frame_files = sorted(_session_dir.glob("*.png"))
_frame = cv2.imdecode(np.fromfile(str(_frame_files[0]), dtype=np.uint8), cv2.IMREAD_COLOR)

# --- Build 800² warp pair ---
from chesslab.calibration import board_corners_for_frame, ensure_profile, make_tracker, warp_from_corners  # noqa: E402

profile = ensure_profile("phone")
mt = make_tracker(profile)
corners = board_corners_for_frame(_frame, profile, mt, detect_scale=0.5)
if corners is None:
    corners = profile.image_corners
warped = warp_from_corners(_frame, profile, corners)

# ref = the warped image; cur = same but with a dark square on e4
ref = warped.copy()
cur = ref.copy()
cell = 800 // 8
cur[4 * cell + 16:5 * cell - 16, 4 * cell + 16:5 * cell - 16] = (40, 40, 40)

gray_ref = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY)
gray_cur = cv2.cvtColor(cur, cv2.COLOR_BGR2GRAY)

N = 200  # iterations


def bench(stmt, setup="", n=N) -> float:
    t = timeit.timeit(stmt, setup, number=n, globals=globals())
    return t / n * 1000.0


# Pre-imports for shorter setup strings
from chesslab.move_tracker.tracker import (  # noqa: E402
    board_color_gamut,
    census_transform,
    hsv_shadow_squares,
    motion_score,
    per_square_census_change,
    per_square_diff,
)

results = []

results.append(("aruco full-res", bench(
    "board_corners_for_frame(_frame, profile, mt, detect_scale=1.0)")))
results.append(("aruco half-res", bench(
    "board_corners_for_frame(_frame, profile, mt, detect_scale=0.5)")))
results.append(("warpPerspective", bench(
    "warp_from_corners(_frame, profile, corners)")))
results.append(("gray+blur", bench(
    "cv2.GaussianBlur(cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY), (3,3), 0)")))
results.append(("motion_score", bench(
    "motion_score(gray_cur, gray_ref)")))
results.append(("buffer_mean (gray, 3 frm)", bench(
    "np.mean(np.stack([gray_cur]*3), axis=0).astype(np.uint8)")))
results.append(("per_square_diff", bench(
    "per_square_diff(gray_ref, gray_cur, 800, True)")))
results.append(("census_full (800²)", bench(
    "per_square_census_change(gray_ref, gray_cur, 800, True)")))

# census on a single rank band (e4 = rows 400..500)
results.append(("census band (1 rank)", bench(
    "per_square_census_change(gray_ref, gray_cur, 800, True, ref_codes=ref_codes)",
    setup="ref_codes = census_transform(gray_ref)",
)))

results.append(("hsv_shadow (1 sq)", bench(
    "hsv_shadow_squares(ref, cur, 800, True, {'e4'})")))
results.append(("occlusion gamut build", bench(
    "board_color_gamut(ref, 800, True)", n=N // 5)))
results.append(("JPEG encode (800²)", bench(
    "cv2.imencode('.jpg', warped, [cv2.IMWRITE_JPEG_QUALITY, 80])")))

# grid Canny - approximate the _occluded_by_grid cost
results.append(("grid Canny (800²)", bench(
    "cv2.Canny(gray_cur, 50, 150)", n=N // 3)))

print("| op | ms |")
print("|---|---|")
for name, ms in results:
    print(f"| {name} | {ms:.1f} |")
