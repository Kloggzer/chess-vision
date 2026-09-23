"""Guards on `synth/degrade.py`'s sensor-noise floor, measured through the crop resampling
chain the classifier sees (warp + `crop_square`), not on the degraded board."""

from __future__ import annotations

import cv2
import numpy as np
import pytest
from synth.degrade import NOISE_SIGMA, degrade_image
from synth.measure_noise import hf_energy

from chesslab.calibration import square_to_crop_box
from chesslab.imgops import resize_keep_aspect
from chesslab.ingest import ingestion_profile

RENDER_RES, FRAME_FRAC = 1600, 0.80
OUT = (128, 128)
TILE = 256
N_SEEDS = 200

#: Ceiling for noise-only crop energy: above this the injection reads as speckle, not sensor
#: noise. The former FLOOR_MIN is retired - see the test below.
MEDIAN_MAX = 6.4


@pytest.fixture(scope="module")
def profile():
    return ingestion_profile("degrade-test", 1100, OUT)


def crop_chain(board_img, profile):
    """Flat board patch -> the warp's scale step -> the crop box letterbox -> 128x128."""
    x0, y0, x1, y1 = square_to_crop_box("d4", profile)
    bw, bh = x1 - x0, y1 - y0
    scale = profile.board_size / (RENDER_RES * FRAME_FRAC)   # render px -> board px
    n = int(board_img.shape[0] * scale)
    warped = cv2.resize(board_img, (n, n), interpolation=cv2.INTER_LINEAR)
    return resize_keep_aspect(warped[:bh, :bw], OUT)


def flat_crop_energies(profile, noise_sigma, n_seeds=N_SEEDS):
    flat = np.full((TILE, TILE, 3), 128, np.uint8)
    return [hf_energy(crop_chain(degrade_image(flat, np.random.default_rng(s),
                                               noise_sigma=noise_sigma), profile))
            for s in range(n_seeds)]


def test_the_noise_stays_mild_and_the_reason_is_recorded(profile):
    """The floor claim is RETIRED, and this pins what replaced it.

    A range calibrated to make crop-level HF energy match real (16-22) did match the scalar and
    looked, on sight, like a broken camera: visible coloured speckle where real crops are smooth and
    carry their energy as DIRECTIONAL WOOD GRAIN. Matching a number with the wrong texture trades one
    tell for a louder one, so the range went back to the mild 2-6.

    What survives is the measurement, not the lever: `synth/measure_noise.py` still shows the
    synthetic tail is too clean (p10 3.72 against real 5.62). Closing that is a RENDER-side change -
    board micro-structure - and it is deliberately not this file's job. This test exists so nobody
    re-raises sigma without reading why it was lowered.
    """
    assert NOISE_SIGMA == (2.0, 6.0), (
        f"sigma is {NOISE_SIGMA}: raising it was tried on 2026-07-28 and rejected on sight. "
        "The missing quantity is structure, not amplitude - see the constant's docstring.")
    values = flat_crop_energies(profile, NOISE_SIGMA)
    assert max(values) <= MEDIAN_MAX, (
        f"noisiest of {N_SEEDS} crops has hf {max(values):.2f} > {MEDIAN_MAX} - that is speckle "
        "territory, which is what this range exists to stay out of")


def test_median_is_not_inflated(profile):
    """Over-noising is a regression too, and it is the one that was actually committed."""
    med = float(np.median(flat_crop_energies(profile, NOISE_SIGMA)))
    assert med <= MEDIAN_MAX, (
        f"noise-only median {med:.2f} above {MEDIAN_MAX} - pushing synth PAST real on a scalar "
        "while looking worse than real is the trade this range was reverted to avoid")


def test_deterministic_per_seed():
    """Same seed, identical output - the per-file seed is what keeps a re-run reproducible."""
    src = np.random.default_rng(7).integers(0, 256, (64, 64, 3), dtype=np.uint8)
    a = degrade_image(src, np.random.default_rng(1234))
    b = degrade_image(src, np.random.default_rng(1234))
    c = degrade_image(src, np.random.default_rng(1235))
    assert np.array_equal(a, b)
    assert not np.array_equal(a, c)
