"""Red proofs from the unaudited core-module bug hunt."""

from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import config, dataset, dataset_build, retime, serving, synth_build
from chesslab.ioutil import read_jsonl


def test_serving_cuda_graph_rejects_run_specific_fixed_normalization():
    cfg = {
        "classes": ["empty"],
        "input_repr": "rgb",
        "normalize": {"mode": "fixed", "mean": [0.1, 0.2, 0.3], "std": [0.9, 0.8, 0.7]},
    }

    assert not serving._is_plain_rgb(cfg), (
        "the CUDA graph bakes config.NORMALIZE_MEAN/STD, so a run with different config.json "
        "statistics must use the config-aware path"
    )


def test_jsonl_reader_ignores_only_a_half_written_last_line(tmp_path):
    path = tmp_path / "ledger.jsonl"
    path.write_text('{"committed": 1}\n{"half":', encoding="utf-8")

    assert read_jsonl(path) == [{"committed": 1}]


def test_lock_claim_is_atomic_between_simultaneous_processes(tmp_path):
    lock = tmp_path / "writer.lock"
    gate = tmp_path / "go"
    ready = [tmp_path / f"ready-{i}" for i in range(2)]
    results = [tmp_path / f"result-{i}" for i in range(2)]
    script = r'''
import pathlib, sys, time
from chesslab import locks
lock, ready, gate, result = map(pathlib.Path, sys.argv[1:])
def synchronized_check(_path):
    ready.write_text("ready", encoding="utf-8")
    deadline = time.monotonic() + 10
    while not gate.exists():
        if time.monotonic() > deadline:
            raise TimeoutError("parent never opened gate")
        time.sleep(0.001)
    return None
locks.held_by = synchronized_check
result.write_text("won" if locks.acquire(lock, "test", ready.name) is None else "lost",
                  encoding="utf-8")
'''
    procs = [
        subprocess.Popen(
            [sys.executable, "-c", script, str(lock), str(ready[i]), str(gate), str(results[i])],
            cwd=Path.cwd(),
        )
        for i in range(2)
    ]
    deadline = time.monotonic() + 10
    while not all(path.exists() for path in ready):
        if time.monotonic() > deadline:
            for proc in procs:
                proc.kill()
            raise AssertionError("lock contenders did not reach the acquisition barrier")
        time.sleep(0.005)
    gate.write_text("go", encoding="utf-8")
    for proc in procs:
        proc.wait(timeout=10)

    assert [path.read_text(encoding="utf-8") for path in results].count("won") == 1


def test_occluded_sight_state_does_not_set_the_piece_class_cap():
    rows = [
        *({"label": "wP", "path": f"wp-{i}"} for i in range(10)),
        *({"label": "wK", "path": f"wk-{i}"} for i in range(10)),
        {"label": "occluded", "path": "hand"},
    ]

    kept = dataset.subsample_classes(rows, max_class_ratio=2.0, seed=42)

    counts = {label: sum(row["label"] == label for row in kept) for label in ("wP", "wK")}
    assert counts == {"wP": 10, "wK": 10}


def test_metadata_cap_is_independent_of_manifest_group_order():
    rows = [
        {"session_id": sid, "square": "a1", "label": "wR", "frame": f"{i:02d}",
         "path": f"{sid}-{i}"}
        for sid in ("a", "b") for i in range(10)
    ]

    forward = dataset_build.dedup_metadata(rows, cap=2, seed=42)
    reversed_groups = dataset_build.dedup_metadata(rows[10:] + rows[:10], cap=2, seed=42)

    assert {row["path"] for row in forward} == {row["path"] for row in reversed_groups}


@pytest.mark.parametrize("name", ["CON", "nul", "COM1", "dataset."])
def test_dataset_names_reject_windows_aliases_and_device_names(name):
    with pytest.raises(ValueError, match="invalid dataset name"):
        dataset_build._safe_name(name)


def test_split_validation_rejects_a_session_in_train_and_val():
    rows = [{"label": "wP", "session_id": sid} for sid in ("s1", "s2", "s3")]
    split = {
        "classes": ["wP"],
        "splits": {"train": ["s1"], "val": ["s1", "s2"], "test": ["s3"]},
        "counts": {"train": 1, "val": 2, "test": 1},
        "warnings": [],
    }

    errors, _warnings = dataset.validate_split(split, rows)

    assert any("s1" in error and "train" in error and "val" in error for error in errors)


def test_synth_pieces13_pack_count_matches_rows_after_occluded_drop(tmp_path):
    paths = config.Paths(root=tmp_path / "root")
    renders = tmp_path / "renders"
    renders.mkdir()
    image = np.full((160, 160, 3), 127, dtype=np.uint8)
    cv2.imwrite(str(renders / "000000.jpg"), image)
    corners = [[16.0, 16.0], [144.0, 16.0], [144.0, 144.0], [16.0, 144.0]]
    (renders / "000000.json").write_text(
        json.dumps({
            "fen": "8/8/8/8/8/8/8/8",
            "corners": corners,
            "occluded_squares": ["a1"],
        }),
        encoding="utf-8",
    )

    result = synth_build.build_synth_dataset(
        "drop-check",
        renders,
        board_size=160,
        per_cell_cap=0,
        val_frac=0.0,
        test_frac=0.0,
        workers=1,
        allow_degenerate=True,
        paths=paths,
        class_mode="pieces13",
    )
    dataset_dir = paths.datasets / "drop-check"
    manifest_rows = read_jsonl(dataset_dir / "manifest.jsonl")
    packed_meta = json.loads((dataset_dir / "packed_meta.json").read_text(encoding="utf-8"))

    assert result["counts"]["final"] == len(manifest_rows) == packed_meta["n"] == 63


def test_retime_crops_raw_frames_at_the_models_infer_size(tmp_path, monkeypatch):
    import chesslab.calibration as calibration
    import chesslab.labeling as labeling
    import chesslab.occluded_model as occluded_model
    import chesslab.realgames as realgames
    import chesslab.recording as recording

    run = tmp_path / "run"
    run.mkdir()
    classes = list(config.IDENTITY_CLASSES)
    (run / "config.json").write_text(
        json.dumps({"classes": classes, "out_size": [128, 128], "infer_size": [80, 80],
                    "head": "occlusion"}),
        encoding="utf-8",
    )
    candidate = {
        "moves": [{"frame": 3, "fen_after": retime.STARTPOS}],
        "geometry": {"corners": [[0, 0], [8, 0], [8, 8], [0, 8]]},
    }
    seen_sizes = []

    monkeypatch.setattr(realgames, "load_candidate", lambda _name: candidate)
    monkeypatch.setattr(realgames, "video_fps", lambda _candidate: 30.0)
    monkeypatch.setattr(realgames, "video_path", lambda _name: tmp_path / "video.mp4")
    monkeypatch.setattr(realgames, "detect_rotation", lambda *_args: 0)
    monkeypatch.setattr(calibration, "load_profile", lambda _name: object())
    monkeypatch.setattr(labeling, "effective_profile", lambda profile, _pad: profile)

    def fake_crops(_frame, _corners, _profile, out_size):
        seen_sizes.append(tuple(out_size))
        return [np.zeros((out_size[1], out_size[0], 3), dtype=np.uint8) for _ in range(64)]

    monkeypatch.setattr(labeling, "crops_for_frame", fake_crops)
    monkeypatch.setattr(occluded_model, "model_classes", lambda _run: classes)
    monkeypatch.setattr(
        occluded_model,
        "all_reads",
        lambda *_args, **_kwargs: [
            {"probs": [1.0 / len(classes)] * len(classes), "coverage": 0.0} for _ in range(64)
        ],
    )

    class FakeRecording:
        def __init__(self, _path):
            pass

        def take(self, _wanted, _rotate):
            yield 3, np.zeros((8, 8, 3), dtype=np.uint8)

    monkeypatch.setattr(recording, "Recording", FakeRecording)

    retime.retime("game", run, write=False, progress=False)

    assert seen_sizes == [(80, 80)]
