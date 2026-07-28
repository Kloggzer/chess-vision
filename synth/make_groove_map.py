"""Generate the board's GROOVE height map from its geometry, not from its photograph.

    uv run python synth/make_groove_map.py OUT.png [--size 4096] [--frac 0.850]

Why this exists. The relief was driven by the texture's own luminance, which works for wood grain —
an albedo photo of wood is approximately its height field — but NOT for the milled channels: the
grid lines and the dark squares share a luminance range, so deepening the grooves also roughened
the dark squares, and the two could not be separated. Every render in that round was rejected on
sight for exactly that reason.

The channels are geometry the user measured (~1 mm deep, rounded, ball-nose), and their positions
are known exactly: the playing field occupies the centred `frac` of the texture, divided 8x8. So
the map is COMPUTED rather than extracted, and the grain map stays free to be weak.

White = surface, black = groove floor; the profile is a smoothstep across the channel so the cut is
round rather than square-edged. Consumed as a second bump in `render_board_v2.make_textured_board_material`.
"""

from __future__ import annotations

import argparse

import cv2
import numpy as np


def groove_map(size: int, frac: float, width_frac: float, ring: bool) -> np.ndarray:
    """Height in [0, 1]: 1 on the square faces, 0 at the bottom of each channel.

    `width_frac` is the channel width as a fraction of ONE SQUARE, which is how the real board is
    made — the cutter is the same for every line, so the channel does not scale with the board.
    """
    height = np.ones((size, size), np.float32)
    field = size * frac
    origin = (size - field) / 2.0
    cell = field / 8.0
    half = max(1.0, cell * width_frac / 2.0)

    # Distance to the nearest grid line, per axis, then combined — a channel runs along BOTH axes
    # and the deepest point is where two of them cross.
    coords = np.arange(size, dtype=np.float32)
    lines = [origin + i * cell for i in range(9)]
    if ring:
        # The coordinate band outside the field has its own boundary channel.
        lines = [origin - cell] + lines + [origin + field + cell]
    dist = np.full(size, np.inf, np.float32)
    for ln in lines:
        dist = np.minimum(dist, np.abs(coords - ln))
    # smoothstep from the channel floor up to the surface over the channel's half width.
    t = np.clip(dist / half, 0.0, 1.0)
    profile = t * t * (3.0 - 2.0 * t)          # 0 at the line, 1 at the face, rounded between
    height = np.minimum(profile[None, :], profile[:, None])
    return height


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--size", type=int, default=4096, help="Must match the colour texture.")
    ap.add_argument("--frac", type=float, default=0.850,
                    help="Fraction of the texture the 8x8 field occupies (2 * BOARD_PLAY_HALF_FRAC).")
    ap.add_argument("--width", type=float, default=0.055,
                    help="Channel width as a fraction of one square.")
    ap.add_argument("--no-ring", action="store_true", help="Omit the coordinate band's boundary.")
    a = ap.parse_args()
    h = groove_map(a.size, a.frac, a.width, ring=not a.no_ring)
    cv2.imwrite(a.out, (h * 255.0).round().astype(np.uint8))
    print(f"wrote {a.out}  {a.size}x{a.size}  field {a.frac:.3f}  channel {a.width:.3f} of a square")


if __name__ == "__main__":
    main()
