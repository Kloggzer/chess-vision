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
        run_dir=tmp_path, classes=config.CLASSES, out_size=(96, 128), infer_size=(96, 128),
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
        run_dir=tmp_path, classes=config.CLASSES, out_size=(96, 128), infer_size=(96, 128),
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
        run_dir=tmp_path, classes=config.CLASSES, out_size=(96, 128), infer_size=(96, 128),
        geometry="warp", photometry="none", piece_height_cells=1.6,
    )
    spec_clahe = serving.RunSpec(
        run_dir=tmp_path, classes=config.CLASSES, out_size=(96, 128), infer_size=(96, 128),
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

def assert_same_crop(stored, live, what: str) -> None:
    """The stored crop IS the live crop, through the store's own codec — still exact.

    Comparing raw pixels stopped working when the store became WebP, and a PSNR threshold cannot
    replace it: measured on this material a 1 px quad error scores 40.5 dB median while the codec's
    worst cell is 35.5, so no line separates them. Encoding the live crop the same way does.
    """
    ours = cv2.imdecode(cv2.imencode(labeling.CROP_SUFFIX, live, labeling.CROP_ENCODE)[1], cv2.IMREAD_COLOR)
    assert np.array_equal(stored, ours), f"{what}: store and crops_for_frame disagree"


def test_slice_parity_crops_vs_slice_session(tmp_path):
    """crops_for_frame(with_meta=True) cuts what slice_session stores, und die used_box3d-Zählung
    ist konsistent mit n_fallback."""
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
        assert_same_crop(cv2.imread(by_sq[sq]["path"]), crops[i], f"Feld {sq}")

    # 4. used_box3d Konsistenz: bei warp sind alle False → n_fallback muss 0 sein
    assert stats["fallback"] == 0
    assert stats["crops"] == 64


def test_slice_parity_with_clahe(tmp_path):
    """Slice parity also with photometry='clahe' — it is applied IN crops_for_frame, so it has to
    show up in the store and in the live crop alike."""
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
        assert_same_crop(cv2.imread(by_sq[sq]["path"]), crops[i], f"Feld {sq} (clahe)")


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
# Test 6b: CUDA-graph fast path (GPU only)
# ---------------------------------------------------------------------------


def _mini_run(tmp_path, out_size=(96, 128)):
    import torch

    from chesslab.training.model import build_model

    run_dir = tmp_path / "run_g"
    run_dir.mkdir()
    classes = config.CLASSES
    model = build_model("smallcnn", len(classes), norm="batchnorm", head="combined",
                        classes=classes)
    torch.save(model.state_dict(), str(run_dir / "best.pt"))
    (run_dir / "config.json").write_text(json.dumps({
        "backbone": "smallcnn", "classes": classes, "out_size": list(out_size),
        "norm": "batchnorm", "head": "combined",
        "variant": {"geometry": "warp", "photometry": "none", "piece_height_cells": 1.6},
    }), encoding="utf-8")
    return run_dir


def test_cuda_graph_path_matches_eager(tmp_path, monkeypatch):
    """GPU: the graph fast path returns the same predictions (within fp16 tolerance)
    as the eager path, for a full 64 batch and a partial batch."""
    torch = pytest.importorskip("torch")
    if not torch.cuda.is_available():
        pytest.skip("no CUDA/HIP device")

    run_dir = _mini_run(tmp_path)
    out_h, out_w = 128, 96
    rng = np.random.RandomState(3)
    crops = [rng.randint(0, 256, (out_h, out_w, 3), dtype=np.uint8) for _ in range(64)]

    # Eager reference (graph disabled)
    serving.clear_cache()
    monkeypatch.setenv("CHESSLAB_DISABLE_CUDA_GRAPH", "1")
    ref = serving.predict_arrays(run_dir, crops, device="cuda", return_probs=True)

    # Graph path
    serving.clear_cache()
    monkeypatch.delenv("CHESSLAB_DISABLE_CUDA_GRAPH", raising=False)
    got = serving.predict_arrays(run_dir, crops, device="cuda", return_probs=True)
    key = f"{run_dir.resolve()}|cuda"
    if serving._GRAPH_CACHE.get(key) is None:
        pytest.skip("CUDA-graph capture not supported on this stack (eager fallback active)")

    assert len(got) == 64
    for r, g in zip(ref, got, strict=True):
        assert np.allclose(r["probs"], g["probs"], atol=0.03), \
            f"probs diverge: {max(abs(a - b) for a, b in zip(r['probs'], g['probs'], strict=True))}"

    # Partial batch reuses the same captured graph
    part = serving.predict_arrays(run_dir, crops[:5], device="cuda", return_probs=True)
    assert len(part) == 5
    for p, g in zip(part, got[:5], strict=True):
        assert np.allclose(p["probs"], g["probs"], atol=1e-4)


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


# ---------------------------------------------------------------------------
# Test 8: vectorized crop preprocessing oracle (B4)
# ---------------------------------------------------------------------------


@pytest.mark.skipif(pytest.importorskip("torch", reason="torch nicht installiert") is None,
                    reason="torch nicht installiert")
def test_fast_path_equals_pil_oracle():
    """B4 oracle: fast-path batch tensor == PIL-path batch tensor for out_size crops."""
    import torch
    from PIL import Image

    from chesslab.training.torch_data import build_transform

    rng = np.random.RandomState(42)
    out_size = (96, 128)  # (W, H) — config convention
    out_h, out_w = out_size[1], out_size[0]
    crops = [rng.randint(0, 256, (out_h, out_w, 3), dtype=np.uint8) for _ in range(32)]

    # PIL path (current behaviour: build_transform for eval)
    tf = build_transform(out_size, train=False)
    pil_batch = torch.stack([tf(Image.fromarray(c[..., ::-1].copy())) for c in crops])

    # Numpy fast path
    stacked = np.stack([c[..., ::-1].copy() for c in crops])  # (N, H, W, 3) RGB uint8
    fast_batch = torch.from_numpy(stacked).permute(0, 3, 1, 2).contiguous()
    fast_batch = fast_batch.float().div_(255)
    mean_t = torch.tensor(config.NORMALIZE_MEAN, dtype=torch.float32).view(1, 3, 1, 1)
    std_t = torch.tensor(config.NORMALIZE_STD, dtype=torch.float32).view(1, 3, 1, 1)
    fast_batch = (fast_batch - mean_t) / std_t

    assert torch.allclose(pil_batch, fast_batch, atol=1e-6), \
        f"max diff: {(pil_batch - fast_batch).abs().max().item()}"


@pytest.mark.skipif(pytest.importorskip("torch", reason="torch nicht installiert") is None,
                    reason="torch nicht installiert")
def test_mixed_size_falls_back_to_pil(tmp_path):
    """One off-size crop -> PIL fallback path produces same predictions as pre-sized."""
    import torch

    from chesslab.training.model import build_model

    run_dir = tmp_path / "run_t"
    run_dir.mkdir()
    backbone = "smallcnn"
    classes = config.CLASSES
    out_size = (96, 128)  # (W, H)
    out_h, out_w = out_size[1], out_size[0]

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

    serving.clear_cache()
    rng = np.random.RandomState(7)

    # Create 8 crops: 7 at out_size, 1 at a different size
    small_crop = rng.randint(0, 256, (64, 64, 3), dtype=np.uint8)
    same_size_crops = [rng.randint(0, 256, (out_h, out_w, 3), dtype=np.uint8) for _ in range(7)]
    mixed_crops = same_size_crops + [small_crop]

    # Also create the same crops but with the small one manually resized to out_size
    import cv2
    resized_small = cv2.resize(small_crop, out_size, interpolation=cv2.INTER_LINEAR)
    all_sized_crops = same_size_crops + [resized_small]

    preds_mixed = serving.predict_arrays(run_dir, mixed_crops, device="cpu")
    preds_sized = serving.predict_arrays(run_dir, all_sized_crops, device="cpu")

    assert len(preds_mixed) == 8
    assert len(preds_sized) == 8
    # Predictions should match (resize semantics identical)
    for i, (pm, ps) in enumerate(zip(preds_mixed, preds_sized, strict=False)):
        assert pm["pred_label"] == ps["pred_label"], \
            f"Crop {i}: mixed={pm['pred_label']} sized={ps['pred_label']}"


# ---------------------------------------------------------------------------
# Test 9: infer_size — the size the GRAPH takes, vs out_size = the size the crops were built at
# (specs/22-inference-resolution)
# ---------------------------------------------------------------------------


def _export_run(tmp_path, *, out_size=(128, 128), scales=None, name="run_x"):
    """Minimal exportable run: smallcnn weights + the config keys `run_export` reads."""
    import torch

    from chesslab.training.model import build_model

    run_dir = tmp_path / name
    run_dir.mkdir()
    classes = config.CLASSES
    model = build_model("smallcnn", len(classes), norm="batchnorm", head="combined",
                        classes=classes)
    torch.save(model.state_dict(), str(run_dir / "best.pt"))
    cfg = {"backbone": "smallcnn", "classes": classes, "out_size": list(out_size),
           "norm": "batchnorm", "head": "combined",
           "variant": {"geometry": "warp", "photometry": "none", "piece_height_cells": 1.6}}
    if scales is not None:
        cfg["scales"] = list(scales)
    (run_dir / "config.json").write_text(json.dumps(cfg), encoding="utf-8")
    return run_dir


def test_infer_size_falls_back_to_out_size(tmp_path):
    """No `infer_size` key -> the crop size. The compatibility guarantee for every shipped model."""
    from chesslab.training.torch_data import infer_size_of

    assert infer_size_of({"out_size": [128, 128]}) == (128, 128)

    run_dir = tmp_path / "legacy"
    run_dir.mkdir()
    (run_dir / "config.json").write_text(json.dumps({
        "classes": config.CLASSES, "out_size": [96, 128],
        "variant": {"geometry": "warp", "photometry": "none", "piece_height_cells": 1.6},
    }), encoding="utf-8")
    spec = serving.run_spec(run_dir)
    assert spec.infer_size == spec.out_size == (96, 128)


def test_run_spec_reads_infer_size(tmp_path):
    """The two sizes are different facts and RunSpec carries both."""
    run_dir = tmp_path / "run_is"
    run_dir.mkdir()
    (run_dir / "config.json").write_text(json.dumps({
        "classes": config.CLASSES, "out_size": [128, 128], "infer_size": [96, 96],
        "scales": [32, 64, 96, 128],
        "variant": {"geometry": "warp", "photometry": "none", "piece_height_cells": 1.6},
    }), encoding="utf-8")

    spec = serving.run_spec(run_dir)
    assert spec.infer_size == (96, 96)
    assert spec.out_size == (128, 128)


def test_crops_for_model_uses_infer_size(tmp_path):
    """The frame is cropped straight to the inference size — no intermediate 128 px step."""
    bs = 640
    prof = _identity_profile(bs)
    frame = _synthetic_frame(bs)
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]

    spec = serving.RunSpec(
        run_dir=tmp_path, classes=config.CLASSES, out_size=(128, 128), infer_size=(96, 96),
        geometry="warp", photometry="none", piece_height_cells=1.6,
    )
    crops = serving.crops_for_model(frame, corners, prof, spec)
    assert len(crops) == 64
    for c in crops:
        assert c.shape[:2] == (96, 96), f"crop is {c.shape[:2]}, not the inference size"


@pytest.mark.skipif(pytest.importorskip("torch", reason="torch nicht installiert") is None,
                    reason="torch nicht installiert")
def test_export_rejects_an_untrained_size(tmp_path, capsys):
    """80 px sits between two trained scales and costs the champion 133 misses against 96's 19.
    The failure is silent at inference, so it has to be loud here (specs/22 phase 00)."""
    from chesslab.training.evaluate import run_export

    run_dir = _export_run(tmp_path, out_size=(128, 128), scales=[32, 64, 96, 128])
    rc = run_export(str(run_dir), fmt="onnx", infer_size=(80, 80))
    assert rc != 0
    out = capsys.readouterr().out
    assert "80x80" in out and "[32, 64, 96, 128]" in out
    # Rejected values do not reach the config, and nothing was exported.
    cfg = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))
    assert "infer_size" not in cfg
    assert not (run_dir / "model.onnx").exists()

    # A run without `scales` was trained at one size: only its out_size is allowed.
    single = _export_run(tmp_path, out_size=(128, 128), name="run_single")
    assert run_export(str(single), fmt="onnx", infer_size=(96, 96)) != 0
    assert "128x128" in capsys.readouterr().out


@pytest.mark.skipif(pytest.importorskip("torch", reason="torch nicht installiert") is None,
                    reason="torch nicht installiert")
def test_export_bakes_infer_size_into_the_graph(tmp_path):
    """Artifact authority: the graph is the schema and config.json describes it."""
    onnx = pytest.importorskip("onnx")

    from chesslab.training.evaluate import ONNX_BATCH, run_export

    run_dir = _export_run(tmp_path, out_size=(128, 128), scales=[32, 64, 96, 128])
    assert run_export(str(run_dir), fmt="onnx", infer_size=(96, 96)) == 0

    cfg = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))
    assert cfg["infer_size"] == [96, 96]
    assert cfg["out_size"] == [128, 128]     # untouched: the crops on disk are still 128 px

    m = onnx.load(str(run_dir / "model.onnx"))
    dims = [d.dim_value for d in m.graph.input[0].type.tensor_type.shape.dim]
    assert dims == [ONNX_BATCH, 3, 96, 96], f"graph declares {dims}"

    card = json.loads((run_dir / "model_card.json").read_text(encoding="utf-8"))
    assert card["infer_size"] == [96, 96] and card["out_size"] == [128, 128]

    # A second export with no --infer-size keeps what the model declares.
    assert run_export(str(run_dir), fmt="onnx") == 0
    m2 = onnx.load(str(run_dir / "model.onnx"))
    assert [d.dim_value for d in m2.graph.input[0].type.tensor_type.shape.dim] == dims