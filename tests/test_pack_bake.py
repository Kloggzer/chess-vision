"""Gebacken muss dasselbe sein wie im Loader gerechnet — sonst ist es ein anderes Rezept."""

import json

import numpy as np
import pytest
import torch
from PIL import Image

from chesslab.training.pack_bake import bake_pack, baked_of, clahe_params, skip_baked
from chesslab.training.torch_data import _Clahe, build_transform

PARAMS = {"clip": 2.0, "tile": 8, "min_mean": 25.0, "max_mean": 40.0, "denoise": "off"}


def _crop(seed: int, size: int = 80) -> np.ndarray:
    rng = np.random.default_rng(seed)
    # Mitten im Band 25-40: nur dort fasst der Operator die Zelle ueberhaupt an.
    base = rng.integers(20, 44, (size, size, 3), dtype=np.uint8)
    base[20:60, 30:50] = rng.integers(30, 70, (40, 20, 3), dtype=np.uint8)
    return base


def test_baked_pixels_equal_the_loader_chain():
    """Die eine Behauptung, auf der das ganze Backen steht — Resize ist auf Packgroesse ein No-op."""
    clahe = _Clahe(**PARAMS)
    with_clahe = build_transform((80, 80), train=False, per_crop=True, clahe_clip=PARAMS["clip"],
                                 clahe_tile=PARAMS["tile"], clahe_min_mean=PARAMS["min_mean"],
                                 clahe_max_mean=PARAMS["max_mean"])
    without = build_transform((80, 80), train=False, per_crop=True)
    for seed in range(8):
        img = Image.fromarray(_crop(seed))
        assert torch.equal(with_clahe(img), without(clahe(img)))


def test_baked_pack_takes_the_eval_fast_path():
    """Der Nebengewinn: ohne CLAHE im Loader faellt das Eval wieder auf den Zero-PIL-Weg."""
    from chesslab.training.torch_data import _EvalRgbTransform

    assert not isinstance(build_transform((80, 80), train=False, clahe_clip=2.0), _EvalRgbTransform)
    assert isinstance(build_transform((80, 80), train=False, clahe_clip=0.0), _EvalRgbTransform)


def _dataset(tmp_path, name: str, crops: list[np.ndarray], folds: int = 2):
    dd = tmp_path / "datasets" / name
    dd.mkdir(parents=True)
    n, h, w = len(crops), crops[0].shape[0], crops[0].shape[1]
    mm = np.memmap(dd / "packed_images.u8", dtype=np.uint8, mode="w+", shape=(n, h, w, 3))
    mm[:] = np.stack(crops)
    mm.flush()
    del mm
    paths = [f"data/crops/default/empty/c{i}.webp" for i in range(n)]
    (dd / "packed_meta.json").write_text(json.dumps(
        {"n": n, "h": h, "w": w, "digest": "d", "paths": paths}), encoding="utf-8")
    (dd / "manifest.jsonl").write_text(
        "".join(json.dumps({"path": p, "label": "empty"}) + "\n" for p in paths), encoding="utf-8")
    (dd / "split.json").write_text(json.dumps({"train": paths}), encoding="utf-8")
    for i in range(folds):
        (dd / f"split-f{i}.json").write_text(json.dumps({"train": paths}), encoding="utf-8")
    return dd


@pytest.fixture
def paths(tmp_path, monkeypatch):
    from chesslab import config

    p = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", p)
    return p


def test_bake_writes_the_clahe_pixels_and_carries_the_folds(tmp_path, paths):
    crops = [_crop(i) for i in range(6)]
    _dataset(tmp_path, "src", crops)
    res = bake_pack("src", "dst", PARAMS, paths=paths)

    assert res["n"] == 6
    assert res["folds"] == 2
    dd = tmp_path / "datasets" / "dst"
    assert (dd / "split-f1.json").exists() and (dd / "manifest.jsonl").exists()
    baked = baked_of("dst", paths)
    assert baked["op"] == "clahe" and baked["clip"] == 2.0 and baked["from"] == "src"

    clahe = _Clahe(**PARAMS)
    out = np.memmap(dd / "packed_images.u8", dtype=np.uint8, mode="r", shape=(6, 80, 80, 3))
    for i, arr in enumerate(crops):
        assert np.array_equal(out[i], np.asarray(clahe(Image.fromarray(arr))))


def test_bake_refuses_to_bake_a_baked_pack(tmp_path, paths):
    _dataset(tmp_path, "src", [_crop(0)])
    bake_pack("src", "dst", PARAMS, paths=paths)
    # Zweimal CLAHE ist ein anderer Operator, kein schnellerer.
    with pytest.raises(ValueError, match="schon gebacken"):
        bake_pack("dst", "dst2", PARAMS, paths=paths)


def test_bake_refuses_an_existing_pack_without_force(tmp_path, paths):
    _dataset(tmp_path, "src", [_crop(0)])
    bake_pack("src", "dst", PARAMS, paths=paths)
    with pytest.raises(FileExistsError):
        bake_pack("src", "dst", PARAMS, paths=paths)
    bake_pack("src", "dst", PARAMS, paths=paths, force=True)


def test_skip_baked_only_when_the_recipe_matches():
    baked = {"op": "clahe", **PARAMS}
    assert skip_baked(baked, dict(PARAMS), (80, 80), (80, 80)) is True
    assert skip_baked(None, dict(PARAMS), (80, 80), (80, 80)) is False
    # Anderes Rezept: lieber abbrechen als still den falschen Operator fahren.
    with pytest.raises(ValueError, match="anderen Rezept"):
        skip_baked(baked, {**PARAMS, "clip": 3.0}, (80, 80), (80, 80))
    # Lauf ohne CLAHE auf gebackenem Pack — die Pixel traegen ihn trotzdem.
    with pytest.raises(ValueError, match="trainiert ohne"):
        skip_baked(baked, {**PARAMS, "clip": 0.0}, (80, 80), (80, 80))
    # Resize laeuft VOR CLAHE, also ist eine andere Trainingsgroesse ein anderes CLAHE.
    with pytest.raises(ValueError, match="input-size"):
        skip_baked(baked, dict(PARAMS), (128, 128), (80, 80))


def test_clahe_params_reads_a_run_config():
    assert clahe_params({"clahe_clip": 2.0, "clahe_tile": 8, "clahe_min_mean": 25.0,
                         "clahe_max_mean": 40.0, "clahe_denoise": "off"}) == PARAMS
    assert clahe_params({})["clip"] == 0.0


def test_bake_carries_the_pinned_split(tmp_path, paths):
    """Ohne den Pin faellt `train --dataset <gebacken>` still auf `split.json` zurueck.

    Der Riegel in `train`/`run_eval` haengt an der EXISTENZ der Datei, also schweigt er beim
    Zwilling — gemessen wird dann der Val, den der Pin gerade ersetzt hat.
    """
    sd = _dataset(tmp_path, "src", [_crop(0)])
    (sd / "split-pin.json").write_text(json.dumps({"splits": {"val": ["s1"]}}), encoding="utf-8")

    bake_pack("src", "dst", PARAMS, paths=paths)

    assert (tmp_path / "datasets" / "dst" / "split-pin.json").read_bytes() == \
        (sd / "split-pin.json").read_bytes()
