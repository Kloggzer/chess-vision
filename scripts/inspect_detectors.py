"""Visualize what the move-tracker's SHADOW and OCCLUSION detectors actually see, so you can
tune (crank) their thresholds against real footage.

Given a REFERENCE board view (clear) and a CURRENT view (with a shadow/hand), it warps both and
renders a montage of the detector internals:
  1. current board — per-square overlay: magenta=changed(diff), cyan=shadow-veto, orange=occlusion
  2. occlusion heatmap — per-square Mahalanobis distance from the reference colour gamut
  3. census heatmap    — structural change (0..255); low = pure brightness (shadow), high = piece
  4. shadow-candidate mask — squares passing the HSV cast-shadow test

Also prints a per-square table and shows how the current thresholds would flag each square, so you
can see the effect of --census-thr / --occlusion-color-thr / --shadow-frac before editing configs.

Usage (two raw camera frames, warped via a profile):
  uv run python scripts/inspect_detectors.py --profile phone --ref ref.jpg --cur cur.jpg --out insp
Usage (two timestamps of a clip):
  uv run python scripts/inspect_detectors.py --profile phone --clip game.mp4 --ref-sec 1 --cur-sec 4 --out insp
Add --warped if --ref/--cur are ALREADY rectified board images (skip warping).
"""

from __future__ import annotations

import argparse
import sys

import cv2
import numpy as np

from chesslab.calibration import (
    board_corners_for_frame,
    load_profile,
    make_tracker,
    warp_from_corners,
)
from chesslab.move_tracker.tracker import (
    _ALL,
    board_color_gamut,
    hsv_shadow_squares,
    normalize_diffs,
    per_square_census_change,
    per_square_diff,
    square_region,
)


def _warp(frame, prof):
    corners = board_corners_for_frame(frame, prof, make_tracker(prof))
    use = corners if corners is not None else prof.image_corners
    return warp_from_corners(frame, prof, use)


def _grab(clip, sec):
    cap = cv2.VideoCapture(clip)
    cap.set(cv2.CAP_PROP_POS_MSEC, sec * 1000.0)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise SystemExit(f"could not read {clip} at {sec}s")
    return frame


def _occlusion_distances(cur_bgr, gamut, board_size, white_pov):
    """Per-square Mahalanobis distance (sigma) from the reference colour gamut — the raw signal
    behind the occlusion veto (higher = more foreign colour, i.e. a hand/arm)."""
    mu, inv = gamut
    lab = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    sat = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)[..., 1]
    out = {}
    for sq in _ALL:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov)
        reg = lab[y0:y1, x0:x1]
        if reg.size == 0:
            out[sq] = 0.0
            continue
        s = sat[y0:y1, x0:x1]
        f = np.array([float(reg[..., 1].mean()), float(reg[..., 2].mean()), float(s.mean())],
                     np.float32) - mu
        out[sq] = float(np.sqrt(max(0.0, f @ inv @ f)))
    return out


def _heatmap(values: dict, board_size, white_pov, vmax, label):
    """Render a per-square heatmap (dict sq->value) as a BGR board image with the value printed."""
    img = np.zeros((board_size, board_size, 3), np.uint8)
    for sq in _ALL:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov, inset=0.0)
        v = values.get(sq, 0.0)
        t = 0.0 if vmax <= 0 else min(1.0, v / vmax)
        # blue (low) → red (high)
        img[y0:y1, x0:x1] = (int(255 * (1 - t)), 0, int(255 * t))
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        cv2.putText(img, f"{v:.0f}" if vmax > 20 else f"{v:.1f}", (cx - 18, cy + 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
    cv2.putText(img, label, (6, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2, cv2.LINE_AA)
    return img


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", default="phone")
    ap.add_argument("--ref", help="reference frame/board image (clear board)")
    ap.add_argument("--cur", help="current frame/board image (with shadow/hand)")
    ap.add_argument("--clip", help="video clip (use with --ref-sec/--cur-sec)")
    ap.add_argument("--ref-sec", type=float)
    ap.add_argument("--cur-sec", type=float)
    ap.add_argument("--warped", action="store_true", help="--ref/--cur are already rectified boards")
    ap.add_argument("--out", default="inspect")
    ap.add_argument("--census-thr", type=float, default=70.0)
    ap.add_argument("--occlusion-color-thr", type=float, default=3.0)
    ap.add_argument("--shadow-frac", type=float, default=0.5)
    a = ap.parse_args()

    prof = load_profile(a.profile)
    bs, pov = prof.board_size, prof.white_pov

    if a.clip:
        ref_bgr = _warp(_grab(a.clip, a.ref_sec), prof)
        cur_bgr = _warp(_grab(a.clip, a.cur_sec), prof)
    elif a.ref and a.cur:
        ref_bgr = cv2.imread(a.ref)
        cur_bgr = cv2.imread(a.cur)
        if not a.warped:
            ref_bgr, cur_bgr = _warp(ref_bgr, prof), _warp(cur_bgr, prof)
        else:
            ref_bgr = cv2.resize(ref_bgr, (bs, bs))
            cur_bgr = cv2.resize(cur_bgr, (bs, bs))
    else:
        raise SystemExit("provide --clip with --ref-sec/--cur-sec, or --ref and --cur images")

    ref_gray = cv2.cvtColor(ref_bgr, cv2.COLOR_BGR2GRAY)
    cur_gray = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2GRAY)

    # --- The four signals the detectors use ---
    diffs = normalize_diffs(per_square_diff(ref_gray, cur_gray, bs, pov))
    census = per_square_census_change(ref_gray, cur_gray, bs, pov)
    changed = {s for s, v in diffs.items() if v >= 8.0}          # rough "changed" (no noise model here)
    shadows = hsv_shadow_squares(ref_bgr, cur_bgr, bs, pov, changed, frac=a.shadow_frac)
    shadow_veto = {s for s in changed if s in shadows and census[s] < a.census_thr}
    gamut = board_color_gamut(ref_bgr, bs, pov)
    occ_dist = _occlusion_distances(cur_bgr, gamut, bs, pov) if gamut else dict.fromkeys(_ALL, 0.0)
    occ_veto = {s for s in changed if occ_dist[s] > a.occlusion_color_thr}

    # --- Panel 1: current board with the live-overlay colours ---
    p1 = cur_bgr.copy()
    for i in range(9):
        p = int(i * bs / 8)
        cv2.line(p1, (p, 0), (p, bs), (0, 120, 0), 1)
        cv2.line(p1, (0, p), (bs, p), (0, 120, 0), 1)
    for sq in changed:
        x0, y0, x1, y1 = square_region(sq, bs, pov, inset=0.06)
        col = (0, 140, 255) if sq in occ_veto else (255, 255, 0) if sq in shadow_veto else (255, 0, 255)
        cv2.rectangle(p1, (x0, y0), (x1, y1), col, 2)
    cv2.putText(p1, "changed=magenta shadow=cyan occlusion=orange", (6, 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

    p2 = _heatmap(occ_dist, bs, pov, vmax=max(a.occlusion_color_thr * 2, 6.0),
                  label=f"occlusion sigma (thr {a.occlusion_color_thr})")
    p3 = _heatmap(census, bs, pov, vmax=255.0, label=f"census (shadow if < {a.census_thr})")
    p4 = _heatmap(diffs, bs, pov, vmax=40.0, label="normalized diff")

    top = np.hstack([cv2.resize(p1, (bs, bs)), p2])
    bot = np.hstack([p3, p4])
    montage = np.vstack([top, bot])
    out = f"{a.out}_detectors.jpg"
    cv2.imwrite(out, montage)

    # --- Console summary ---
    from math import inf
    strong = sorted(changed, key=lambda s: -diffs[s])[:12]
    print(f"\nprofile={a.profile}  board={bs}px  changed_squares={len(changed)}")
    print(f"thresholds: census<{a.census_thr}  occlusion>{a.occlusion_color_thr}  shadow_frac>={a.shadow_frac}")
    print(f"{'sq':>4} {'diff':>6} {'census':>7} {'occ_sig':>8}  flags")
    for s in strong:
        flags = []
        if s in shadow_veto:
            flags.append("SHADOW")
        if s in occ_veto:
            flags.append("OCCLUSION")
        print(f"{s:>4} {diffs[s]:6.1f} {census[s]:7.1f} {occ_dist[s]:8.2f}  {' '.join(flags) or '-'}")
    lo = min((occ_dist[s] for s in changed), default=inf)
    hi = max((occ_dist[s] for s in changed), default=0.0)
    print(f"\nocclusion sigma over changed squares: min={lo:.2f} max={hi:.2f}")
    print("-> set --occlusion-color-thr between the board's max and the hand's min to separate them.")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
