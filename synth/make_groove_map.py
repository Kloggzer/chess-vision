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


def ring_line(profile: np.ndarray, lo: int, hi: int, cell: float) -> float | None:
    """Find a milled channel inside the coordinate band, or report that there is none.

    The band's two boundaries are not the same thing. Toward the field there is a real cut; toward
    the outside there is only where the dark stain of the rim stops. `detect_lines` cannot tell them
    apart because it snaps to the darkest point in a window, and the stained rim is darker than the
    channel over a much wider span - so it would place a groove on a boundary that has none.

    What separates them is WIDTH: a cut is dark relative to its immediate surroundings, a stained
    rim is not dark relative to itself. Subtracting a baseline half a cell wide leaves a spike for
    the first and nothing for the second. Returns None when no spike clears the bar, and the caller
    then simply has no line there - which is the correct description of this board.
    """
    if hi - lo < 8:
        return None
    seg = profile[lo:hi].astype(np.float32)
    k = max(3, int(cell * 0.5) | 1)
    baseline = cv2.blur(seg.reshape(1, -1), (k, 1)).ravel()
    dip = baseline - seg
    i = int(np.argmax(dip))
    span = float(profile.max() - profile.min())
    if span <= 0 or dip[i] < 0.12 * span:
        return None
    # Sub-pixel by the same intensity centroid the field lines use, over the spike only.
    w = np.clip(dip - dip[i] * 0.35, 0.0, None)
    a = max(0, i - int(cell * 0.15))
    b = min(len(seg), i + int(cell * 0.15) + 1)
    w = w[a:b]
    if w.sum() <= 0:
        return float(lo + i)
    return float(lo + a + (np.arange(len(w)) * w).sum() / w.sum())


def _channel_masks(grey: np.ndarray, frac: float, width_frac: float, ring: bool,
                   flat: float = 0.0) -> tuple[np.ndarray, np.ndarray]:
    """1 on the square faces, 0 at the centre of a channel, kept SEPARATE per axis.

    Vertical and horizontal channels have to stay apart: anything averaged along a channel has to
    know which way that channel runs, and their combination (the min of the two) has thrown that
    away.
    """
    size = grey.shape[0]
    field = size * frac
    origin = (size - field) / 2.0
    cell = field / 8.0
    expected = [origin + i * cell for i in range(9)]
    # Profiles over the FIELD only, so the surroundings cannot drag the minima.
    a, b = int(origin + cell * 0.5), int(origin + field - cell * 0.5)
    pcols = grey[a:b, :].mean(axis=0)
    prows = grey[:, a:b].mean(axis=1)
    cols = detect_lines(pcols, expected, search=cell * 0.18)
    rows = detect_lines(prows, expected, search=cell * 0.18)

    # The outer boundary of the coordinate band, MEASURED - previously it was assumed to sit one
    # cell beyond the field, which on this board lands 128 px outside the texture entirely. The
    # search window was then empty and detect_lines handed the assumption straight back, so the two
    # ring lines were the only ones in the whole map that were never measured, and the outer edge
    # rendered with a channel where the board has none.
    if ring:
        for profile, lines in ((pcols, cols), (prows, rows)):
            outer = ring_line(profile, 0, int(lines[0] - cell * 0.25), cell)
            inner = ring_line(profile, int(lines[-1] + cell * 0.25), size, cell)
            if outer is not None:
                lines.insert(0, outer)
            if inner is not None:
                lines.append(inner)

    half = max(1.0, cell * width_frac / 2.0)
    coord = np.arange(size, dtype=np.float32)

    def mask_1d(lines):
        dist = np.full(size, np.inf, np.float32)
        for ln in lines:
            dist = np.minimum(dist, np.abs(coord - ln))
        t = np.clip(dist / half, 0.0, 1.0)
        # A FLAT-BOTTOMED cut, not a parabolic one: the bit leaves an even floor with rounded
        # fillets and steep walls, "eher so |__|". Without the plateau the profile bottoms out at a
        # single point, which reads as a gouge however smooth the curve through it is.
        if flat > 0.0:
            t = np.clip((t - flat) / max(1.0 - flat, 1e-6), 0.0, 1.0)
        return t * t * (3.0 - 2.0 * t)            # 1 on the face, 0 in the cut, rounded between

    return mask_1d(cols)[None, :], mask_1d(rows)[:, None]


def _channel_mask(grey: np.ndarray, frac: float, width_frac: float, ring: bool,
                  flat: float = 0.0) -> np.ndarray:
    """Both axes combined: 1 on a square face, 0 in any channel."""
    mx, my = _channel_masks(grey, frac, width_frac, ring, flat)
    return np.minimum(mx, my)


def groove_map(colour: np.ndarray, frac: float, width_frac: float, ring: bool,
               smooth: float = 0.0, shoulder: float = 0.0,
               texture: float = 0.0, flat: float = 0.0) -> np.ndarray:
    """The milled channels: one fixed cross-section, modulated along each channel by the photo.

    The split matters and two attempts got it wrong. Driving the cross-section from the photo's
    luminance made the cut a V, because inside a channel that luminance has a narrow, very dark
    core and the core became a point. Blurring the photo isotropically to fix that mixed the bright
    square faces in ACROSS the channel, which lifted its floor until the cut all but vanished and
    left only a slow residual undulation - a "Wellenschliff".

    So the photo is averaged strictly ALONG each channel, over face-free pixels only, which is why
    the two axes are handled separately. What comes out varies over the length of a channel and is
    constant across it, which is exactly what a photograph of a cut can honestly tell you: the bit
    is the same everywhere, the wood it went through is not.
    """
    grey = cv2.cvtColor(colour, cv2.COLOR_BGR2GRAY).astype(np.float32)
    size = grey.shape[0]
    cell = size * frac / 8.0
    channel_px = cell * width_frac
    mx, my = _channel_masks(grey, frac, width_frac, ring, flat)

    # How far the amplitude may drop where the cut photographs palest. Never to zero: a channel
    # that fades out entirely reads as a break in the line, and the board has no such breaks.
    floor = 0.55
    across = max(3, int(channel_px * 0.8) | 1)
    along = max(3, int(cell * max(smooth, 0.02)) | 1)

    depth = np.zeros_like(grey)
    tex = np.zeros_like(grey)
    for mask_1d, ksize in ((mx, (across, along)), (my, (along, across))):
        w = np.broadcast_to(1.0 - mask_1d, grey.shape).astype(np.float32)
        if w.max() <= 0.0:
            continue
        # Normalised convolution over channel pixels: long along the channel, barely wider than the
        # channel across it. The weight keeps the square faces out of the average entirely.
        num = cv2.blur(grey * w, ksize)
        den = np.maximum(cv2.blur(w, ksize), 1e-6)
        lit = num / den
        core = w > 0.5
        if core.any():
            lo, hi = np.percentile(lit[core], 4), np.percentile(lit[core], 96)
            amp = 1.0 - np.clip((lit - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
        else:
            amp = np.zeros_like(lit)
        # The cut's own SURFACE, which the shape above deliberately does not carry: the deviation
        # of the photograph from that same along-channel average, bright high and dark deep. It is
        # added to the round profile rather than replacing it - replacing it is what produced a
        # gouged V, but leaving it out entirely dropped the milled texture the channel really has.
        det = np.clip((grey - lit) / max(hi - lo, 1e-6), -1.0, 1.0) if core.any() else lit * 0.0

        best = w * (floor + (1.0 - floor) * amp)
        take = best > depth
        depth = np.where(take, best, depth)
        tex = np.where(take, w * det, tex)

    # Riding the surface on top of the profile makes the deepest points overshoot the bottom of the
    # range, and clipping there eats the gain instead of showing it - at 2.2 a sixth of the channel
    # pixels sat on the floor and the texture had stopped growing. Rescaling the DEPTH keeps the
    # square faces exactly where they are (they are 1.0 and stay 1.0) and simply gives the cut the
    # room it needs. Above 1.0 is a different matter and is clipped: that would be the inside of
    # the cut standing proud of the board.
    out = np.minimum(1.0 - depth + texture * tex, 1.0)
    lowest = float(out.min())
    if lowest < 0.0:
        out = 1.0 - (1.0 - out) / (1.0 - lowest)

    # One blur cannot serve both ends of the profile: enough to settle the cut's interior also
    # erases the rim, and a rim sharp enough to read leaves the interior glittering. The shoulder
    # gets its OWN, wider blur, weighted by the mask - 0 in the cut and 1 on the flat - so the
    # profile survives at the centre and the normal runs out gradually into the square instead of
    # stopping at a wall.
    if shoulder > 0.0:
        face = np.minimum(mx, my)
        wide = cv2.GaussianBlur(out, (0, 0), max(1.0, shoulder * channel_px))
        out = out * (1.0 - face) + wide * face
    return np.clip(out, 0.0, 1.0).astype(np.float32)


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
    ap.add_argument("--groove-shoulder", type=float, default=0.15,
                    help="A SECOND, wider Gaussian at the channel's rim, as a fraction of the "
                         "channel width. MEASURED (2026-07-28): from 0.3 up it stops being a rim "
                         "treatment and ramps the square FACES - 0.011 of the full depth at 0.3, "
                         "0.209 at 1.2, a slow undulation across every square. The rim is already "
                         "rounded by the mask's own smoothstep, so this stays small.")
    ap.add_argument("--groove-flat", type=float, default=0.4,
                    help="Share of the channel's half-width that is an even FLOOR, before the "
                         "fillet rises to the face. CHOSEN on the plotted cross-section "
                         "(2026-07-28): 0 bottoms out at a point and reads as a gouge, 0.7 is a "
                         "wide floor with near-vertical walls, 0.4 is the flat bottom with "
                         "rounded fillets the board actually has.")
    ap.add_argument("--groove-texture", type=float, default=1.0,
                    help="How much of the cut's photographed SURFACE rides on the round profile, "
                         "bright high and dark deep. 0 leaves a bare machined bowl.")
    ap.add_argument("--groove-smooth", type=float, default=0.25,
                    help="Averaging length ALONG each channel, as a fraction of a cell. Sets how "
                         "quickly the cut may vary over its length; it never averages ACROSS the "
                         "channel, which is what used to lift the floor and erase the cut.")
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
                   shoulder=a.groove_shoulder, texture=a.groove_texture,
                   flat=a.groove_flat)
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
