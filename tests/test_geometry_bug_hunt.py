"""Bug hunt over the geometry / frame-selection half: crop border, scan orientation, warp
interpolation and the matte's stored-board contract. Every test here FAILS on today's code."""

import json
from dataclasses import replace

import cv2
import numpy as np
import pytest
import yaml

from chesslab import config, grid_occlusion, matte, realgames
from chesslab.calibration import (
    CalibrationProfile,
    CropParams,
    GridMesh,
    compute_homography,
    crop_border_px,
    warp_board_for_crops,
)
from chesslab.framescan import cell_sharpness

SIDE = 320
CELL = SIDE // 8


def _profile(**crop_kw) -> CalibrationProfile:
    corners = [[0, 0], [SIDE, 0], [SIDE, SIDE], [0, SIDE]]
    return CalibrationProfile(
        profile="t", camera_index=0, frame_size=(SIDE, SIDE), board_size=SIDE,
        image_corners=corners, homography=compute_homography(corners, SIDE),
        white_pov=True,
        crop=replace(CropParams.default(SIDE), out_size=(32, 32), **crop_kw),
    )


def test_there_is_only_one_crop_border_and_one_padded_warp():
    """Der Scan und der Crop muessen denselben Rand schneiden — und das haelt am billigsten, wenn
    es nur EINE Funktion gibt.

    `grid_occlusion` trug bis 2026-09-15 eigene Kopien: `crop_border_px` nahm einst das MAXIMUM der
    beiden Pads, `calibration`s nimmt ihre SUMME, und `warp_padded` hatte dort sogar die Argumente
    VERTAUSCHT (`frame, corners, profile` gegen `frame, profile, corners`). Beide sind entfernt.
    """
    assert not hasattr(grid_occlusion, "crop_border_px"), (
        "die Kopie ist zurueck — der Scan misst dann auf einem anderen Raster als der Crop schneidet")
    assert not hasattr(grid_occlusion, "warp_padded"), (
        "die Kopie ist zurueck, und ihre Argumentreihenfolge war die vertauschte")
    assert crop_border_px(_profile(pad_side=0.05)) > 0


def test_the_sharpness_masks_the_squares_the_hand_sensor_actually_named():
    """`scan_video` names hands with `profile.white_pov` and `cell_sharpness` re-derives the
    square names with `white_pov=True` hardcoded, so it ignored the side it was told and masked
    the 180-degree mirror of the hand, measuring focus ON the hand instead."""
    size = 64
    step = size // 8
    rng = np.random.default_rng(0)
    gray = np.zeros((size, size), np.uint8)
    gray[5 * step:] = rng.integers(0, 256, (size - 5 * step, size), dtype=np.uint8)
    hands = [f"{f}{r}" for r in range(1, 6) for f in "abcdefgh"]

    sharp = cell_sharpness(gray, size, hands, white_pov=False)

    assert sharp > 0.0, (
        "the five flat ranks the sensor flagged as a hand were kept and the five sharp ones "
        f"dropped: the board reads {sharp} when only its hand-free cells are anything but flat"
    )


def test_both_warp_paths_resample_the_same_way():
    """Der CROP-Warp resampelt gleich, ob ein Mesh-Fit geklappt hat oder nicht.

    War bis 2026-09-14 verletzt: ohne Mesh bilinear, mit Mesh kubisch — 63 Graustufen, zwei
    Schaerfe-Domaenen aus derselben Geometrie. Der GITTER-Warp weicht weiterhin ab, und das
    ist Absicht: kubisch gemessen verschob er das gefittete Quad um 2,78 px
    (`docs/warp-resampling.md`).
    """
    prof = _profile()
    pad = crop_border_px(prof)
    rng = np.random.default_rng(1)
    frame = rng.integers(0, 256, (400, 400, 3), dtype=np.uint8)
    corners = [[10.5, 12.5], [330.5, 14.5], [332.5, 300.5], [8.5, 298.5]]
    identity = GridMesh([k / 8.0 for k in range(9)], [k / 8.0 for k in range(9)])

    plain = warp_board_for_crops(frame, prof, corners)
    meshed = warp_board_for_crops(frame, prof, corners, mesh=identity)
    inner = (slice(pad + 8, pad + SIDE - 8), slice(pad + 8, pad + SIDE - 8))
    worst = int(np.abs(plain[inner].astype(int) - meshed[inner].astype(int)).max())

    assert worst <= 12, (
        f"an identity mesh moves a pixel by {worst} grey levels: the two warp paths no longer "
        "resample alike, so a crop's sharpness depends on whether a mesh fit happened to succeed"
    )


def _session(tmp_path, monkeypatch, rows, board_shape):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = realgames.game_dir("s1")
    (sdir / "dirty").mkdir(parents=True)
    for row in rows:
        cv2.imwrite(str(sdir / row["board"]), np.full((*board_shape, 3), 128, np.uint8))
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "rg-s1", "profile": "t", "mode": "track"}), encoding="utf-8")
    return sdir


def test_the_matte_refuses_a_board_that_is_not_the_crop_raster(tmp_path, monkeypatch):
    """`labeling.usable_board` exists because a stored board may be in another scale than the
    profile's; every other stored-board reader asks it first. `matte.alpha_worker` does not, so
    `coverage_of` cuts the alpha at the profile's cells and writes the result as a label."""
    prof = _profile()
    small, border = SIDE // 2, 2
    rows = [{"frame": "frames/000001.png", "board": "dirty/000001.webp", "ply": 1,
             "dirty": True, "dirty_reason": "occluded", "corners": prof.image_corners,
             "board_size": small, "board_border": border}]
    sdir = _session(tmp_path, monkeypatch, rows, (small + 2 * border, small + 2 * border))
    alpha = np.zeros((small + 2 * border, small + 2 * border), np.float32)
    alpha[border:border + small // 8, border:border + small // 8] = 1.0
    monkeypatch.setattr(matte, "alpha_sam3", lambda board: (alpha, {"hand": 1.0}))
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)

    matte.alpha_worker("s1", progress=False)
    written = [json.loads(line) for line in
               (sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]

    assert written[0].get("coverage") is None, (
        f"a board stored at {small} px was cut with the {SIDE} px profile and coverage was "
        f"written anyway: a8 reads {written[0]['coverage']['a8']} where the alpha covers the "
        "whole square"
    )


def test_closing_the_seams_leaves_a_human_corrected_alphas_coverage_alone(tmp_path, monkeypatch):
    """`recut_fixed` writes the coverage a person painted and stamps the row `alpha: fixed`.
    `close_seams` then re-reads SAM's own `.webp`, and any row whose seam it closes has that
    coverage replaced by the model's — while the row keeps saying `fixed`."""
    pytest.importorskip("torch")
    prof = _profile()
    pad = crop_border_px(prof)
    rows = [{"frame": "frames/000001.png", "board": "dirty/000001.webp", "ply": 1,
             "dirty": True, "dirty_reason": "occluded", "corners": prof.image_corners,
             "board_size": SIDE, "board_border": pad}]
    sdir = _session(tmp_path, monkeypatch, rows, (SIDE + 2 * pad, SIDE + 2 * pad))
    seamed = np.zeros((SIDE + 2 * pad, SIDE + 2 * pad), np.uint8)
    seamed[100:140, 100:140] = 255
    seamed[100:140, 142:182] = 255
    (sdir / "mattes").mkdir()
    cv2.imwrite(str(sdir / "mattes" / "000001.webp"), seamed)
    human = {"a8": 0.42, "h1": 0.0}
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": human, "alpha": "fixed"}) + "\n",
        encoding="utf-8")
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)

    matte.close_seams("s1", progress=False)
    back = json.loads((sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines()[0])

    assert back["coverage"] == human, (
        "the row still claims alpha='fixed' but its coverage now comes from SAM's un-corrected "
        f"matte: a8 went from {human['a8']} to {back['coverage'].get('a8')}"
    )
