"""Tests für die Serving-Facade (specs/rework/01-serving-facade.md).

Headless, kein echtes Modell nötig — bestimmt nur, dass die Crop-/Photometrie-Pipeline
mit dem RunSpec-Vertrag übereinstimmt und der slice_session-Umbau byte-identisch bleibt.
"""

from __future__ import annotations

import json

import cv2
import numpy as np
import pytest
import yaml

from chesslab import config, labeling, serving
from chesslab.calibration import CalibrationProfile, CropParams, compute_homography

# ---------------------------------------------------------------------------
# Helfer
# ---------------------------------------------------------------------------

def _identity_profile(bs: int = 800):
    """Identity calibration profile (image corners = board corners)."""
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    return CalibrationProfile(
        profile="t", camera_index=0, frame_size=(bs, bs), board_size=bs,
        image_corners=corners, homography=compute_homography(corners, bs),
        white_pov=True, crop=CropParams.default(bs),
    )


def _synthetic_frame(bs: int = 800) -> np.ndarray:
    """Simple color board: each square has its own color (col,row) → orientation checkable."""
    cell = bs // 8
    img = np.zeros((bs, bs, 3), dtype=np.uint8)
    for col in range(8):
        for row in range(8):
            color = (col * 30 + 10, row * 30 + 10, 100)
            img[row * cell:(row + 1) * cell, col * cell:(col + 1) * cell] = color
    return img


def _cell_color(col: int, row: int) -> tuple[int, int, int]:
    return (col * 30 + 10, row * 30 + 10, 100)


def _synthetic_session(tmp_path, bs: int = 800):
    """Session mit EINEM identitätsgemappten Farbbrett-Frame + Start-FEN."""
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    frame = _synthetic_frame(bs)
    sdir = tmp_path / "sessions" / "s1"
    (sdir / "frames").mkdir(parents=True)
    cv2.imwrite(str(sdir / "frames" / "0000.png"), frame)
    import chess
    (sdir / "log.jsonl").write_text(
        json.dumps({"frame": "frames/0000.png", "ply": 0, "fen": chess.Board().fen(),
                    "corners": corners}) + "\n", encoding="utf-8")
    (sdir / "session.yaml").write_text(yaml.safe_dump(
        {"session_id": "s1", "profile": "t", "mode": "live", "created_at": "t",
         "camera_index": 0, "frame_size": [bs, bs]}), encoding="utf-8")
    return sdir


# ---------------------------------------------------------------------------
# Test 1: crops_for_model
# ---------------------------------------------------------------------------

def test_crops_for_model_count_and_order(tmp_path):
    """crops_for_model returns 64 crops in all_squares() order, each with spec.out_size."""
    bs = 640
    prof = _identity_profile(bs)
    frame = _synthetic_frame(bs)
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]

    spec = serving.RunSpec(
        run_dir=tmp_path, classes=config.CLASSES, out_size=(96, 128),
        geometry="warp", photometry="none", piece_height_cells=1.6,
    )
    crops = serving.crops_for_model(frame, corners, prof, spec)
    assert len(crops) == 64
    for c in crops:
        assert c.shape[1] == 96 and c.shape[0] == 128   # (W=96, H=128)

    # check order: a1 should be col=0,row=7
    squares = labeling.all_squares()
    a8_crop = crops[squares.index("a8")]
    h1_crop = crops[squares.index("h1")]
    # a8 = (col=0, row=0) → blau=0*30+10=10, grün=0*30+10=10
    assert a8_crop[64, 48, 0] < 30    # B ≈ 10
    # h1 = (col=7, row=7) → blau=7*30+10=220, grün=7*30+10=220
    assert h1_crop[64, 48, 0] > 200   # B ≈ 220


# ---------------------------------------------------------------------------
# Test 2: Identity guard
# ---------------------------------------------------------------------------

def test_photometry_none_is_identical(tmp_path):
    """photometry='none' → Crops bit-identisch zum direkten crops_for_frame(photometry='none')."""
    bs = 640
    prof = _identity_profile(bs)
    frame = _synthetic_frame(bs)
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]

    spec = serving.RunSpec(
        run_dir=tmp_path, classes=config.CLASSES, out_size=(96, 128),
        geometry="warp", photometry="none", piece_height_cells=1.6,
    )
    via_model = serving.crops_for_model(frame, corners, prof, spec)
    direct = labeling.crops_for_frame(
        frame, corners, prof, geometry="warp", photometry="none",
        piece_height_cells=1.6, out_size=(96, 128),
    )
    assert len(via_model) == len(direct)
    for i, (a, b) in enumerate(zip(via_model, direct, strict=False)):
        assert np.array_equal(a, b), f"Crop {i} ({labeling.all_squares()[i]}) nicht identisch"


# ---------------------------------------------------------------------------
# Test 3: Skew fix effective
# ---------------------------------------------------------------------------

def test_photometry_clahe_differs_from_raw(tmp_path):
    """photometry='clahe' → Crops unterscheiden sich vom Roh-Pfad (none)."""
    bs = 640
    prof = _identity_profile(bs)
    frame = _synthetic_frame(bs)
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]

    spec_none = serving.RunSpec(
        run_dir=tmp_path, classes=config.CLASSES, out_size=(96, 128),
        geometry="warp", photometry="none", piece_height_cells=1.6,
    )
    spec_clahe = serving.RunSpec(
        run_dir=tmp_path, classes=config.CLASSES, out_size=(96, 128),
        geometry="warp", photometry="clahe", piece_height_cells=1.6,
    )
    raw_crops = serving.crops_for_model(frame, corners, prof, spec_none)
    clahe_crops = serving.crops_for_model(frame, corners, prof, spec_clahe)
    # Mindestens ein Crop muss sich unterscheiden (nicht alle Felder sind gleich einfarbig)
    diffs = sum(1 for a, b in zip(raw_crops, clahe_crops, strict=False) if not np.array_equal(a, b))
    assert diffs > 0, "CLAHE sollte sich von none unterscheiden"


# ---------------------------------------------------------------------------
# Test 4: Slice parity (BEFORE the slice_session refactoring)
# ---------------------------------------------------------------------------

def test_slice_parity_crops_vs_slice_session(tmp_path):
    """crops_for_frame(with_meta=True) liefert pixel-identische Crops zu slice_session-PNGs,
    und used_box3d-Zählung ist konsistent mit n_fallback."""
    sdir = _synthetic_session(tmp_path, bs=640)
    prof = _identity_profile(640)
    out_size = (96, 128)

    # 1. Slice session with OLD logic (warp, none — the default)
    manifest = tmp_path / "m.jsonl"
    squares_root = tmp_path / "sq"
    stats = labeling.slice_session(
        sdir, profile=prof, manifest_path=manifest, squares_root=squares_root,
        geometry_mode="warp", photometry="none", out_size=out_size,
    )

    # 2. crops_for_frame mit with_meta=True aufrufen (das existiert NOCH nicht —
    #    this test is the sentinel: it will FAIL until crops_for_frame gets the
    #    with_meta parameter. After the refactoring it must be GREEN.)
    frame = cv2.imread(str(sdir / "frames" / "0000.png"))
    corners = [[0, 0], [640, 0], [640, 640], [0, 640]]
    try:
        crops, meta = labeling.crops_for_frame(
            frame, corners, prof, geometry="warp", photometry="none",
            out_size=out_size, with_meta=True,
        )
    except TypeError:
        pytest.fail(
            "crops_for_frame hat noch keinen with_meta-Parameter. "
            "Erst labeling.py refactoren (Schritt 5), dann diesen Test wiederholen."
        )

    assert len(crops) == 64
    assert len(meta["used_box3d"]) == 64
    # warp mode → all used_box3d are False, n_fallback counts 0
    assert all(not v for v in meta["used_box3d"])

    # 3. Each crop must be pixel-identical to the PNG written by slice_session
    squares = labeling.all_squares()
    manifest_rows = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
    by_sq = {r["square"]: r for r in manifest_rows}
    for i, sq in enumerate(squares):
        png = cv2.imread(by_sq[sq]["path"])
        crop = crops[i]
        assert np.array_equal(png, crop), f"Feld {sq}: PNG vs crop_for_frame nicht identisch"

    # 4. used_box3d Konsistenz: bei warp sind alle False → n_fallback muss 0 sein
    assert stats["fallback"] == 0
    assert stats["crops"] == 64


def test_slice_parity_with_clahe(tmp_path):
    """Slice parity also with photometry='clahe' — photometry is applied IN crops_for_frame
    angewandt, also muss sie in den PNGs und in den crops identisch sein."""
    sdir = _synthetic_session(tmp_path, bs=640)
    prof = _identity_profile(640)
    out_size = (96, 128)

    manifest = tmp_path / "m.jsonl"
    squares_root = tmp_path / "sq"
    labeling.slice_session(
        sdir, profile=prof, manifest_path=manifest, squares_root=squares_root,
        geometry_mode="warp", photometry="clahe", out_size=out_size,
    )

    frame = cv2.imread(str(sdir / "frames" / "0000.png"))
    corners = [[0, 0], [640, 0], [640, 640], [0, 640]]
    try:
        crops, meta = labeling.crops_for_frame(
            frame, corners, prof, geometry="warp", photometry="clahe",
            out_size=out_size, with_meta=True,
        )
    except TypeError:
        pytest.fail("crops_for_frame with_meta fehlt noch — labeling.py refactoren (Schritt 5).")

    squares = labeling.all_squares()
    manifest_rows = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
    by_sq = {r["square"]: r for r in manifest_rows}
    for i, sq in enumerate(squares):
        png = cv2.imread(by_sq[sq]["path"])
        crop = crops[i]
        assert np.array_equal(png, crop), f"Feld {sq} (clahe): PNG vs crop_for_frame nicht identisch"


# ---------------------------------------------------------------------------
# Test 5: run_spec
# ---------------------------------------------------------------------------

def test_run_spec_with_variant_field(tmp_path):
    """config.json with 'variant' → read directly (no fallback)."""
    run_dir = tmp_path / "run1"
    run_dir.mkdir()
    (run_dir / "config.json").write_text(json.dumps({
        "classes": config.CLASSES,
        "out_size": [96, 128],
        "variant": {"geometry": "box3d", "photometry": "clahe", "piece_height_cells": 2.0},
    }), encoding="utf-8")

    spec = serving.run_spec(run_dir)
    assert spec.geometry == "box3d"
    assert spec.photometry == "clahe"
    assert spec.piece_height_cells == 2.0
    assert spec.out_size == (96, 128)
    assert spec.classes == config.CLASSES


def test_run_spec_legacy_fallback(tmp_path):
    """config.json without 'variant' + manifest with tags → fallback via variant_of_run kicks in."""
    run_dir = tmp_path / "run2"
    run_dir.mkdir()
    (run_dir / "config.json").write_text(json.dumps({
        "classes": config.CLASSES,
        "out_size": [96, 128],
        "dataset": None,   # → squares.jsonl (default)
    }), encoding="utf-8")

    # Manifest with tags (as labeling.variant_of_run expects)
    manifests_dir = tmp_path / "manifests"
    manifests_dir.mkdir(parents=True)
    (manifests_dir / "squares.jsonl").write_text(
        json.dumps({"geometry": "warp", "photometry": "gamma", "piece_height_cells": 1.8}) + "\n",
        encoding="utf-8",
    )

    # Monkeypatch: config.DATA.manifests points to our temp dir
    import chesslab.config
    from chesslab import config as cfg_mod
    orig = chesslab.config.DATA
    try:
        chesslab.config.DATA = cfg_mod.Paths(root=tmp_path)
        spec = serving.run_spec(run_dir)
        assert spec.geometry == "warp"
        assert spec.photometry == "gamma"
        assert spec.piece_height_cells == 1.8
    finally:
        chesslab.config.DATA = orig


def test_run_spec_no_variant_no_manifest(tmp_path):
    """Neither variant nor manifest → default (warp, none, EXP_PIECE_HEIGHT_CELLS) without exception."""
    run_dir = tmp_path / "run3"
    run_dir.mkdir()
    (run_dir / "config.json").write_text(json.dumps({
        "classes": config.CLASSES,
        "out_size": [96, 128],
        "dataset": None,
    }), encoding="utf-8")

    import chesslab.config
    from chesslab import config as cfg_mod
    orig = chesslab.config.DATA
    try:
        chesslab.config.DATA = cfg_mod.Paths(root=tmp_path)
        # no manifest → fallback-fallback
        spec = serving.run_spec(run_dir)
        assert spec.geometry == "warp"
        assert spec.photometry == "none"
        assert spec.piece_height_cells == config.EXP_PIECE_HEIGHT_CELLS
    finally:
        chesslab.config.DATA = orig


def test_run_spec_missing_config(tmp_path):
    """No config.json → FileNotFoundError."""
    with pytest.raises(FileNotFoundError):
        serving.run_spec(tmp_path / "gibt_es_nicht")


# ---------------------------------------------------------------------------
# Test 6: torch-abhängig (load_run, predict_arrays)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(pytest.importorskip("torch", reason="torch nicht installiert") is None,
                    reason="torch nicht installiert")
def test_load_run_and_predict_arrays(tmp_path):
    """Mini-Run bauen → load_run-Roundtrip, predict_arrays auf 2 Crops liefert Labels."""
    import torch

    from chesslab.training.model import build_model

    run_dir = tmp_path / "run_t"
    run_dir.mkdir()
    backbone = "smallcnn"
    classes = config.CLASSES
    out_size = (96, 128)

    model = build_model(backbone, len(classes), norm="batchnorm", head="combined", classes=classes)
    torch.save(model.state_dict(), str(run_dir / "best.pt"))
    (run_dir / "config.json").write_text(json.dumps({
        "backbone": backbone,
        "classes": classes,
        "out_size": [96, 128],
        "norm": "batchnorm",
        "head": "combined",
        "variant": {"geometry": "warp", "photometry": "none", "piece_height_cells": 1.6},
    }), encoding="utf-8")

    # load_run Roundtrip
    serving.clear_cache()
    model2, cfg2 = serving.load_run(run_dir, device="cpu")
    assert cfg2["classes"] == classes
    assert tuple(cfg2["out_size"]) == out_size
    assert model2.training is False

    # predict_arrays auf 2 Dummy-Crops
    crop1 = np.random.randint(0, 255, (128, 96, 3), dtype=np.uint8)
    crop2 = np.random.randint(0, 255, (128, 96, 3), dtype=np.uint8)
    preds = serving.predict_arrays(run_dir, [crop1, crop2], device="cpu")
    assert len(preds) == 2
    for p in preds:
        assert "pred_label" in p
        assert "confidence" in p
        assert p["pred_label"] in classes
        assert 0 <= p["confidence"] <= 1

    # return_probs=True
    preds2 = serving.predict_arrays(run_dir, [crop1], device="cpu", return_probs=True)
    assert "probs" in preds2[0]
    probs = preds2[0]["probs"]
    assert len(probs) == len(classes)
    assert abs(sum(probs) - 1.0) < 0.01


# ---------------------------------------------------------------------------
# Test 7: model_classes
# ---------------------------------------------------------------------------

def test_model_classes(tmp_path):
    """model_classes liefert die Klassen aus der Run-config."""
    run_dir = tmp_path / "run_mc"
    run_dir.mkdir()
    (run_dir / "config.json").write_text(json.dumps({
        "classes": ["empty", "wK", "bK"],
        "out_size": [96, 128],
        "variant": {"geometry": "warp", "photometry": "none", "piece_height_cells": 1.6},
    }), encoding="utf-8")

    cls = serving.model_classes(run_dir)
    assert cls == ["empty", "wK", "bK"]
