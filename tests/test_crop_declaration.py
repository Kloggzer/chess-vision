"""specs/45 — the crop belongs to the model.

`pad_side` decides what a training example LOOKS like: 128 px of a 1.10-cell box and
128 px of a 1.20-cell box are different photographs of the same square, and nothing in the
pipeline notices the difference. These tests pin the CONTRACT that ends that — a crop says how
it was cut, a run declares it, and serving crops to what the model declares — never the values
themselves, which are a property of the corpus and may move.
"""

from __future__ import annotations

import json

import numpy as np
import pytest

from chesslab import config, labeling, serving
from chesslab.calibration import CalibrationProfile
from chesslab.training.data import crop_of_rows
from chesslab.training.evaluate import crop_of_dataset
from conftest import make_profile


def _identity_profile(board_size: int = 800) -> CalibrationProfile:
    return make_profile(board_size)


def _frame(board_size: int = 800) -> np.ndarray:
    """Every pixel distinct in at least one channel, so two crops of the same square with
    different pads cannot compare equal by accident."""
    y, x = np.mgrid[0:board_size, 0:board_size]
    return np.dstack([(x % 251), (y % 241), ((x // 100) * 8 + y // 100) * 3]).astype(np.uint8)


# --- what a crop row says about itself ---------------------------------------------------

def test_slice_records_the_pads_it_cut_with(tmp_path):
    """A row that only says `out_size` cannot be reconciled with any model later: the profile it
    was cut with is mutable and stamped nowhere else."""
    from test_labeling import _make_session

    sdir = _make_session(tmp_path)
    manifest = tmp_path / "manifests" / "crops.jsonl"
    prof = _identity_profile()
    prof.crop.pad_side = 0.05
    labeling.slice_session(sdir, profile=prof, manifest_path=manifest,
                           squares_root=tmp_path / "squares")
    rows = [json.loads(x) for x in manifest.read_text(encoding="utf-8").splitlines() if x.strip()]
    assert {r["pad_side"] for r in rows} == {0.05}

    # The OVERRIDE is what lands in the row, not the profile it overrode — otherwise
    # `slice --pad-side` would write rows describing crops it did not cut.
    labeling.slice_session(sdir, profile=prof, manifest_path=manifest,
                           squares_root=tmp_path / "squares", pad_side=0.12)
    rows = [json.loads(x) for x in manifest.read_text(encoding="utf-8").splitlines() if x.strip()]
    assert {r["pad_side"] for r in rows} == {0.12}


# --- what a dataset can and cannot claim -------------------------------------------------

def test_crop_of_rows_declares_only_what_is_unanimous():
    unanimous = [{"pad_side": 0.05} for _ in range(3)]
    assert crop_of_rows(unanimous) == 0.05
    # A row from before 2026-09-14 still carries the retired `pad_up`; it is not read and must
    # not split the set.
    assert crop_of_rows([*unanimous, {"pad_side": 0.05, "pad_up": 0.0}]) == 0.05
    # A pre-2026-08-06 row carries no pads at all: nothing may be inferred from its neighbours.
    assert crop_of_rows([*unanimous, {"out_size": [128, 128]}]) is None
    # Two profiles in one dataset: a wrong declaration is worse than an absent one, because a
    # consumer CROPS to what it is told.
    assert crop_of_rows([*unanimous, {"pad_side": 0.10}]) is None
    assert crop_of_rows([]) is None


def test_crop_of_dataset_reads_the_built_manifest(tmp_path):
    paths = config.Paths(root=tmp_path)
    ds = paths.datasets / "ds"
    ds.mkdir(parents=True)
    (ds / "manifest.jsonl").write_text(
        "\n".join(json.dumps({"pad_side": 0.05}) for _ in range(4)),
        encoding="utf-8")
    assert crop_of_dataset("ds", paths) == 0.05
    # A dataset that is not on this machine reads as legacy, never as an exception: an export
    # must stay possible without the corpus that produced it.
    assert crop_of_dataset("gone", paths) is None
    assert crop_of_dataset("", paths) is None


# --- what serving does with the declaration ----------------------------------------------

def _spec(run_dir, **kw) -> serving.RunSpec:
    return serving.RunSpec(run_dir=run_dir, classes=["empty", "occupied"], out_size=(128, 128),
                           infer_size=(128, 128), **kw)


def test_run_spec_reads_the_declared_crop(tmp_path):
    run = tmp_path / "run"
    run.mkdir()
    cfg = {"classes": ["empty", "occupied"], "out_size": [128, 128]}
    # `pad_up` is an archived key: still on disk in older runs, read by nobody.
    (run / "config.json").write_text(json.dumps({**cfg, "pad_side": 0.05, "pad_up": 0.0}),
                                     encoding="utf-8")
    spec = serving.run_spec(run)
    assert spec.pad_side == 0.05

    # No keys = LEGACY. It must read as "unknown", never as a default that happens to be in
    # `config.CROP` — a guess here is exactly the failure the declaration exists to end.
    (run / "config.json").write_text(json.dumps(cfg), encoding="utf-8")
    legacy = serving.run_spec(run)
    assert legacy.pad_side is None


def test_crops_for_model_crops_at_the_declared_pad(tmp_path):
    """The model supplies the box, the profile supplies the board."""
    prof = _identity_profile()
    prof.crop.pad_side = 0.10
    frame = _frame()
    corners = prof.image_corners

    declared = serving.crops_for_model(frame, corners, prof, _spec(tmp_path, pad_side=0.05))
    # The reference: the same call with a profile that ALREADY holds the declared pads.
    ref_prof = _identity_profile()
    ref_prof.crop.pad_side = 0.05
    reference = serving.crops_for_model(frame, corners, ref_prof, _spec(tmp_path))
    for i, (a, b) in enumerate(zip(declared, reference, strict=True)):
        assert np.array_equal(a, b), f"crop {i} is not the one the model asked for"

    # Not vacuous: the profile's own 0.10 produces different pixels, which is the whole point.
    profile_pads = serving.crops_for_model(frame, corners, prof, _spec(tmp_path))
    assert not np.array_equal(profile_pads[0], reference[0])

    # And the caller's profile is not mutated — the pads are applied to a copy, so the next
    # consumer of the same profile still sees the board's own geometry.
    assert prof.crop.pad_side == pytest.approx(0.10)


def test_legacy_model_keeps_the_profiles_pads(tmp_path):
    prof = _identity_profile()
    prof.crop.pad_side = 0.10
    frame = _frame()
    legacy = serving.crops_for_model(frame, prof.image_corners, prof, _spec(tmp_path))
    explicit = serving.crops_for_model(frame, prof.image_corners, prof,
                                       _spec(tmp_path, pad_side=0.10))
    for a, b in zip(legacy, explicit, strict=True):
        assert np.array_equal(a, b)
