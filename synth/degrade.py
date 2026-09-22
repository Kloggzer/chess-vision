"""Camera-look degradation for synthetic board renders (makes them "webcam-real").

The EEVEE render is razor-sharp, cool and contrasty; the real webcam delivers soft, warm,
slightly noisy JPEGs. This step closes exactly that gap — the single biggest sim-to-real lever
(otherwise the model can tell synth from real by sharpness/colour alone). Runs AFTER rendering,
BEFORE the build (on the ~n board PNGs, not on the crops → cheap; crops inherit it via the warp).

All effects are mild and fixed (no statistics matching, hence background-robust) and varied
deterministically per image (seed from the filename) → domain randomization is preserved.

    uv run python synth/degrade.py <dir>   # rewrites <dir>/*.png in place

WARNING: this is destructive and NOT idempotent — running it twice double-degrades.

Noise calibration (2026-07-28, ``synth/measure_noise.py``, `empty` crops only, metric = std of
the residual after a sigma=1.2 blur, measured at CROP level, 128x128):

| high-frequency energy                                   |  p10 |  p50 |  p90 |
|---|---:|---:|---:|
| real reference (`occ-real3`, sessions 20260630/20260722)| 5.62 | 7.44 | 9.16 |
| synth as shipped (`occ-synth`, renders NOT degraded)    | 3.72 | 5.90 | 7.88 |
| synth, renders re-cut from a 24-render sample           | 4.06 | 5.84 | 7.72 |
| the same sample, old range sigma 2.0-6.0                | 3.33 | 5.21 | 6.76 |
| the same sample, calibrated sigma 16.0-22.0             | 6.06 | 7.12 | 8.24 |
| held-out sample (shard-2), calibrated sigma 16.0-22.0   | 5.74 | 7.00 | 8.50 |

Two things this measurement corrected:

1. **The old range made the crops CLEANER, not noisier.** Steps 1-3 and 5 (contrast, defocus,
   JPEG) remove more high-frequency energy than sigma 2-6 puts back — 4.06 -> 3.33 at p10. The
   EEVEE render already carries its own sampling grain (~7.2 at board level), against which
   sigma 2-6 is negligible.
2. **Board-level sigma is heavily attenuated on the way to the crop.** The warp resamples
   1280 framed render px onto an 1100 px board and `crop_square` letterboxes a 165 px box into
   128 px; only ~0.26 of the injected sigma survives to the crop. A sigma chosen to look right
   on the board is not the sigma the classifier sees.

sigma 16-22 puts the crop p10 (6.06 / 5.74 on two disjoint samples) at or above the real p10 of
5.62 while the p50 stays 4-6 % BELOW real's 7.44 — inside the +-10 % band, and deliberately on
the low side so the median is never over-noised. Note what this does NOT claim: the p50 gap it
closes is small (5.84 -> 7.12); the number this exists for is the p10 floor.

The range is calibrated for the current render->crop scale (renders at ``--res 1600``,
``--frame-frac 0.80``, warped at ``config.SYNTH.warp_board_size`` = 1100, 128x128 crops).
**Re-measure with ``measure_noise.py`` if the render resolution or the board size changes** —
the same sigma buys a different crop-level floor at a different scale.
"""

from __future__ import annotations

import argparse
import glob
import hashlib
import os

import cv2
import numpy as np

#: Sensor-noise sigma range at BOARD resolution, drawn uniformly per image. Calibrated at crop
#: level — see the module docstring for the measured before/after table.
#: Board-level sigma of the injected sensor noise.
#:
#: REVERTED from the crop-level calibration (16.0, 22.0) on 2026-07-28, on sight. That range made
#: the crop-level HF energy match real (p50 7.41 vs 7.55) and looked, in the user's words, "als
#: hätte man ne Kartoffelkamera benutzt" — visible coloured speckle, where real crops are smooth
#: and get their high-frequency energy from DIRECTIONAL WOOD GRAIN. Matching a scalar by adding
#: the wrong texture is not domain alignment; it trades one tell for a louder one.
#:
#: Keep `synth/measure_noise.py`: the measurement was right that the tail is too clean
#: (synth p10 3.72 vs real 5.62). What was wrong is the lever. Structure, not amplitude, is what
#: is missing — a finer board texture at render scale, or luminance-only grain, both of which are
#: render-side changes.
#:
#: Measured the same day and NOT addressed here: synth dark squares sit ~45 grey levels brighter
#: than real (p50 128.8 vs 83.3) with far wider spread. That is a larger domain gap than the noise
#: and it belongs to the render, not to this file.
NOISE_SIGMA = (2.0, 6.0)


def degrade_image(bgr: np.ndarray, rng: np.random.Generator,
                  noise_sigma: tuple[float, float] = NOISE_SIGMA) -> np.ndarray:
    im = bgr.astype(np.float32)
    # 1) Lower the contrast slightly (real is flatter) around the mean 128.
    c = rng.uniform(0.82, 0.94)
    im = (im - 128.0) * c + 128.0
    # 2) Slight warm shift (real is marginally warmer): R up, B down (BGR: [0]=B, [2]=R).
    # Kept mild — too much warmth yellows the white pieces.
    im[:, :, 2] *= rng.uniform(1.0, 1.03)
    im[:, :, 0] *= rng.uniform(0.97, 1.0)
    # 3) Defocus / soft optics (real is markedly less sharp than EEVEE).
    k = rng.uniform(0.2, 0.6)
    im = cv2.GaussianBlur(im, (0, 0), k)
    # 4) Sensor noise. The low end sets the crop-level FLOOR after the warp downscale.
    im = im + rng.normal(0.0, rng.uniform(*noise_sigma), im.shape)
    im = np.clip(im, 0, 255).astype(np.uint8)
    # 5) JPEG artefacts (a real camera stores JPEG).
    q = int(rng.integers(70, 88))
    ok, enc = cv2.imencode(".jpg", im, [int(cv2.IMWRITE_JPEG_QUALITY), q])
    return cv2.imdecode(enc, cv2.IMREAD_COLOR) if ok else im


def _seed_from_name(path: str) -> int:
    """Stable per FILENAME, because the module promises "deterministically per image".

    `hash()` on a str is salted per process, so a non-numeric name degraded differently on every
    run — the one thing a seed-from-the-filename exists to prevent.
    """
    stem = os.path.splitext(os.path.basename(path))[0]
    try:
        return int(stem)
    except ValueError:
        return int.from_bytes(hashlib.blake2s(stem.encode("utf-8"), digest_size=4).digest(),
                              "big") % (2**31)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("dir", help="Directory of rendered board images (replaced IN PLACE).")
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.dir, "*.png")) + glob.glob(os.path.join(a.dir, "*.jpg")))
    n = 0
    for f in files:
        img = cv2.imread(f)
        if img is None:
            continue
        rng = np.random.default_rng(_seed_from_name(f))
        out = degrade_image(img, rng)
        cv2.imwrite(f, out)
        n += 1
    print(f"degraded {n} images in {a.dir}")


if __name__ == "__main__":
    main()
