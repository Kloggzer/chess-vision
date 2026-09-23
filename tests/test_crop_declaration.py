"""specs/45: the crop belongs to the model; crops, runs and serving declare how it was cut."""

from __future__ import annotations

import json

from chesslab import config, labeling, serving
from chesslab.training.data import crop_of_rows
from chesslab.training.evaluate import crop_of_dataset
from conftest import make_profile

# --- what a crop row says about itself ---------------------------------------------------

def test_slice_records_the_pads_it_cut_with(tmp_path):
    """A row that only says `out_size` cannot be reconciled with any model later: the profile it
    was cut with is mutable and stamped nowhere else."""
    from test_labeling import _make_session

    sdir = _make_session(tmp_path)
    manifest = tmp_path / "manifests" / "crops.jsonl"
    prof = make_profile()
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
    # An old row still carries the retired `pad_up`; it is not read and must not split the set.
    assert crop_of_rows([*unanimous, {"pad_side": 0.05, "pad_up": 0.0}]) == 0.05
    # An old row carries no pads at all: nothing may be inferred from its neighbours.
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
