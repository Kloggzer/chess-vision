"""Extract the board's GROOVE height map FROM THE PHOTO, masked to where the channels actually are.

    uv run python synth/make_groove_map.py COLOUR_TEXTURE.png OUT.png [--frac 0.850]

Why this exists, and why it is not just a drawn grid.

Driving the relief from the texture's luminance alone could not work: the milled channels and the
dark squares occupy the same luminance range, so deepening the grooves also roughened the squares
and no setting was acceptable. Drawing the channels as computed lines fixed the separation but
threw the real thing away — a cut in wood is not a uniform stroke, it varies along its length, and
the assumed positions drifted against the board's actual, unevenly spaced lines.

So both halves come from where they belong:

  WHERE  the channels are is MEASURED off this texture — the row and column luminance profiles have
         a clear minimum at every line, and those minima are used, not an assumed 1/8 division.
  WHAT   the channel looks like is the PHOTOGRAPH's own luminance inside that mask, normalised per
         channel, so the real profile and its variation survive.

Everything outside the mask is flat surface, which is what keeps the squares out of it.
"""

from __future__ import annotations

import argparse

import cv2
import numpy as np


def detect_lines(profile: np.ndarray, expected: list[float], search: float) -> list[float]:
    """Snap each expected line to the darkest column within `search` px of it.

    Sub-pixel by intensity centroid over the trough, because a half-pixel error is visible as a
    doubled edge once the map drives a normal.
    """
    out = []
    for e in expected:
        lo, hi = int(max(0, e - search)), int(min(len(profile), e + search + 1))
        if hi - lo < 3:
            out.append(e)
            continue
        window = profile[lo:hi]
        weight = window.max() - window            # deeper = heavier
        weight = np.clip(weight - weight.max() * 0.35, 0.0, None)
        out.append(lo + float((np.arange(len(window)) * weight).sum() / weight.sum())
                   if weight.sum() > 0 else e)
    return out


def _channel_mask(grey: np.ndarray, frac: float, width_frac: float, ring: bool) -> np.ndarray:
    """1 on the square faces, 0 at the centre of a channel. The one definition both maps use."""
    size = grey.shape[0]
    field = size * frac
    origin = (size - field) / 2.0
    cell = field / 8.0
    expected = [origin + i * cell for i in range(9)]
    if ring:
        expected = [origin - cell] + expected + [origin + field + cell]
    # Profiles over the FIELD only, so the surroundings cannot drag the minima.
    a, b = int(origin + cell * 0.5), int(origin + field - cell * 0.5)
    cols = detect_lines(grey[a:b, :].mean(axis=0), expected, search=cell * 0.18)
    rows = detect_lines(grey[:, a:b].mean(axis=1), expected, search=cell * 0.18)

    half = max(1.0, cell * width_frac / 2.0)
    coord = np.arange(size, dtype=np.float32)

    def mask_1d(lines):
        dist = np.full(size, np.inf, np.float32)
        for ln in lines:
            dist = np.minimum(dist, np.abs(coord - ln))
        t = np.clip(dist / half, 0.0, 1.0)
        return t * t * (3.0 - 2.0 * t)            # 1 on the face, 0 at the line, rounded between

    return np.minimum(mask_1d(cols)[None, :], mask_1d(rows)[:, None])


def groove_map(colour: np.ndarray, frac: float, width_frac: float, ring: bool,
               smooth: float = 0.0, shoulder: float = 0.0) -> np.ndarray:
    grey = cv2.cvtColor(colour, cv2.COLOR_BGR2GRAY).astype(np.float32)
    mask = _channel_mask(grey, frac, width_frac, ring)

    # The channel's own depth, from the photograph. Normalised over the masked pixels so the cut
    # uses the full range regardless of how this board was lit, then blended by the mask so the
    # squares stay perfectly flat.
    inside = mask < 0.999
    if inside.any():
        v = grey[inside]
        lo, hi = np.percentile(v, 2), np.percentile(v, 98)
        photo = np.clip((grey - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    else:
        photo = np.ones_like(grey)
    out = mask + (1.0 - mask) * photo

    # A milled channel is rounded, and its walls are a millimetre of wood, not a step function.
    # Straight out of the photo the map carries the sensor's own noise inside the cut and the mask's
    # hard shoulder at its rim; driving a normal with that renders the edge as a comb of teeth
    # ("die kanten sind zu scharf", 2026-07-28). Blurring by a fraction of the channel's own width
    # rounds the profile without moving where the channel is.
    channel_px = grey.shape[0] * frac / 8.0 * width_frac
    if smooth > 0.0:
        out = cv2.GaussianBlur(out, (0, 0), max(1.0, smooth * channel_px))

    # One sigma cannot serve both ends of the profile: enough blur to settle the cut's interior
    # also erases the rim, and a rim sharp enough to read leaves the interior glittering. So the
    # shoulder gets its OWN, wider blur, applied only where the channel meets the face - the mask
    # is the weight, 0 in the cut and 1 on the flat, so the crisp profile survives at the centre
    # and the normal runs out gradually into the square instead of stopping at a wall.
    if shoulder > 0.0:
        wide = cv2.GaussianBlur(out, (0, 0), max(1.0, shoulder * channel_px))
        out = out * (1.0 - mask) + wide * mask
    return out.astype(np.float32)


def grain_map(colour: np.ndarray, frac: float, width_frac: float, ring: bool,
              detail_frac: float, axis: str, along: int) -> np.ndarray:
    """The SQUARE FACES' own relief: wood grain only, with the albedo step removed.

    Feeding raw luminance to a bump was wrong and this map exists to fix it: a light square and a
    dark square differ in ALBEDO, not in height — they are milled from one plank and are coplanar —
    yet the raw signal makes every square boundary a cliff. So the per-square mean is subtracted
    (a box blur wider than the grain but narrower than a square) and only what is left is relief.

    The channels are excluded, flat at mid-grey, because `groove_map` owns them; layering both
    without this would double their depth.
    """
    size = colour.shape[0]
    grey = cv2.cvtColor(colour, cv2.COLOR_BGR2GRAY).astype(np.float32)
    cell = size * frac / 8.0
    k = max(3, int(cell * detail_frac) | 1)
    mask = _channel_mask(grey, frac, width_frac, ring)

    # NORMALISED convolution, not a plain blur: the local mean is taken over face pixels ONLY, so
    # it never reaches across a square boundary. A plain blur does, and the light/dark albedo step
    # it straddles there is orders of magnitude stronger than grain — the residue rings along every
    # edge and the directional pass below draws it out into a comb of teeth, clearly visible in the
    # render. This works because the kernel's half-width is under the channel's, so a face pixel's
    # window stops at the channel centre and the neighbouring square never enters it.
    faces = (mask > 0.999).astype(np.float32)
    local = cv2.blur(grey * faces, (k, k)) / np.maximum(cv2.blur(faces, (k, k)), 1e-6)
    detail = (grey - local) * faces

    # Normalise over the SQUARE FACES ONLY, and robustly. A global span is dominated by the
    # branded coordinate letters and the square boundaries, which are an order of magnitude
    # stronger than grain — normalising by those crushed the grain to a std of 11/255 and the map
    # came out flat. The interior is eroded so the box blur's bleed across a boundary (visible as
    # a halo ring) does not set the scale either.
    # Grain is DIRECTIONAL, sensor noise is not — that is the only thing separating them at this
    # scale, and without using it the map "sieht eher aus wie noise" (2026-07-28). Averaging ALONG
    # the fibre cancels isotropic speckle while leaving a line's cross-section untouched, because
    # the line is constant in exactly that direction.
    if along > 1:
        detail = cv2.blur(detail, (along, 1) if axis == "x" else (1, along))

    interior = cv2.erode(faces.astype(np.uint8), np.ones((k, k), np.uint8)) > 0
    sample = np.abs(detail[interior]) if interior.any() else np.abs(detail)
    span = max(float(np.percentile(sample, 96)), 1e-6)
    out = np.clip(0.5 + 0.5 * detail / span, 0.0, 1.0)
    return (out * mask + 0.5 * (1.0 - mask)).astype(np.float32)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("colour", help="The rectified board colour texture the map must align with.")
    ap.add_argument("out")
    ap.add_argument("--frac", type=float, default=0.850,
                    help="Fraction of the texture the 8x8 field occupies (2 * BOARD_PLAY_HALF_FRAC).")
    ap.add_argument("--width", type=float, default=0.081,
                    help="Channel width as a fraction of one square. MEASURED off the rectified "
                         "photo (2026-07-28): 0.0809 mean over the nine field lines, consistent "
                         "0.071-0.094, the outer two wider where the coordinate band adjoins. The "
                         "previous 0.055 was a guess and rendered the channels ~47 % too narrow.")
    ap.add_argument("--no-ring", action="store_true")
    ap.add_argument("--groove-shoulder", type=float, default=1.2,
                    help="A SECOND, wider Gaussian applied only at the channel's rim, as a "
                         "fraction of the channel width. Lets the normal run out gradually into "
                         "the square while --groove-smooth keeps governing the cut itself.")
    ap.add_argument("--groove-smooth", type=float, default=0.06,
                    help="Gaussian sigma applied to the groove profile, as a fraction of the "
                         "channel width. CHOSEN on rendered close-ups (2026-07-28): 0.30 was tried "
                         "first and rejected as too smooth - the cut dissolved into a diffuse "
                         "shimmer - and by 0.60 it is gone entirely. 0.06 keeps the cut, and the "
                         "glitter that made 0 look broken is handled by --groove-shoulder instead, "
                         "which is the knob that actually belonged there.")
    ap.add_argument("--grain-axis", choices=("x", "y"), default="x",
                    help="Direction the fibre runs in the rectified texture. This board's light "
                         "squares show horizontal lines, hence x.")
    ap.add_argument("--grain-along", type=int, default=15,
                    help="Averaging length ALONG the fibre, in px. Cancels isotropic sensor noise "
                         "while leaving the line's cross-section, which is what separates grain "
                         "from speckle. MEASURED on a light square (2026-07-28): at 1 the map is "
                         "pure speckle, at 15 the directional streaks stand alone, at 45 they "
                         "smear into bands and pull artefacts onto the square boundary.")
    ap.add_argument("--grain-out", help="Also write the square-face grain map here.")
    ap.add_argument("--detail", type=float, default=0.08,
                    help="Box-blur width for removing the per-square mean, as a fraction of a "
                         "square. MEASURED on a light square (2026-07-28): 0.08 resolves the "
                         "directional grain the photo actually shows; 0.20 already smooths it "
                         "away and 0.35 replaces it with a blur halo bleeding across the square "
                         "boundary. Dark squares carry almost no grain either way - they are "
                         "stained nearly uniform - so calibrate on a LIGHT one.")
    a = ap.parse_args()
    colour = cv2.imread(a.colour)
    if colour is None:
        raise SystemExit(f"cannot read {a.colour}")
    h = groove_map(colour, a.frac, a.width, ring=not a.no_ring, smooth=a.groove_smooth,
                   shoulder=a.groove_shoulder)
    cv2.imwrite(a.out, (h * 255.0).round().astype(np.uint8))
    print(f"wrote {a.out}  {colour.shape[1]}x{colour.shape[0]}  from {a.colour}  "
          f"field {a.frac:.3f}  channel {a.width:.3f} of a square")
    if a.grain_out:
        g = grain_map(colour, a.frac, a.width, ring=not a.no_ring, detail_frac=a.detail,
                      axis=a.grain_axis, along=a.grain_along)
        cv2.imwrite(a.grain_out, (g * 255.0).round().astype(np.uint8))
        print(f"wrote {a.grain_out}  square-face grain, albedo step removed at {a.detail:.2f} of a square")


if __name__ == "__main__":
    main()
