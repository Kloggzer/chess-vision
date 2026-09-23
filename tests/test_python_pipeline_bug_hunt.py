import json
from types import SimpleNamespace

import numpy as np
import pytest

from chesslab import config, dataset_build
from chesslab import dataset as dataset_mod
from chesslab.training import pack_session, packs
from chesslab.training.data import checkpoint_score
from chesslab.training.pack_session import _write_rows
from conftest import write_jsonl


def test_zero_holdout_fractions_leave_every_session_in_train():
    splits = dataset_mod.assign_sessions_to_splits(
        {"s1": 64, "s2": 64, "s3": 64}, val_frac=0.0, test_frac=0.0, seed=42)

    correct = not splits["val"] and not splits["test"]
    assert correct and set(splits["train"]) == {"s1", "s2", "s3"}, (
        "zero val/test fractions created holdout sessions instead of disabling both holdouts")


def test_checkpoint_tiebreakers_ignore_cells_masked_out_of_the_loss():
    classes = ["empty", "wP"]
    rows = [
        {"session_id": "s", "frame": "1", "coverage": 0.0},
        {"session_id": "s", "frame": "1", "coverage": 1.0},
    ]

    rank = checkpoint_score(rows, classes, [0, 0], [0, 1])

    assert rank[1:] == (1.0, 1.0), (
        "a fully covered wrong cell lowered occupied-board accuracy or macro recall even though "
        "the classification loss masks that cell")


def test_eval_records_visible_metrics_when_every_cell_is_visible(tmp_path, monkeypatch):
    pytest.importorskip("torch")
    from chesslab.training import engine, evaluate, torch_data

    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    dataset_dir = paths.datasets / "ds"
    dataset_dir.mkdir(parents=True)
    rows = [
        {"path": "unused-a", "label": "empty", "session_id": "s", "frame": "1",
         "square": "a1", "out_size": [8, 8], "coverage": 0.0},
        {"path": "unused-b", "label": "wP", "session_id": "s", "frame": "1",
         "square": "a2", "out_size": [8, 8], "coverage": 0.0},
    ]
    write_jsonl(dataset_dir / "manifest.jsonl", rows)
    (dataset_dir / "split.json").write_text(json.dumps({
        "classes": ["empty", "wP"],
        "splits": {"train": [], "val": [], "test": ["s"]},
    }), encoding="utf-8")
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    (run_dir / "config.json").write_text("{}", encoding="utf-8")
    model = SimpleNamespace(to=lambda _device: None)
    cfg = {"classes": ["empty", "wP"], "dataset": "ds", "out_size": [8, 8],
           "backbone": "smallcnn", "head": "combined"}
    result = {"trues": np.array([0, 1]), "preds": np.array([0, 1]),
              "conf": [0.9, 0.9], "conf_wrong": 0.0, "board_acc": 1.0,
              "square_acc": 1.0}
    monkeypatch.setattr(evaluate, "_load_run", lambda _path: (model, cfg))
    monkeypatch.setattr(torch_data, "eval_transform_for", lambda _cfg: object())
    monkeypatch.setattr(engine, "get_device", lambda require_gpu: "cpu")
    monkeypatch.setattr(engine, "evaluate_dataset", lambda *args, **kwargs: result)
    monkeypatch.setattr(engine, "confusion_matrix", lambda *args: np.eye(2, dtype=int))
    monkeypatch.setattr(engine, "per_class_recall", lambda _cm: [1.0, 1.0])
    monkeypatch.setattr(engine, "render_confusion_text", lambda *_args: "ok")
    monkeypatch.setattr(engine, "save_confusion_png", lambda *_args: None)

    assert evaluate.run_eval(str(run_dir)) == 0
    summary = json.loads((run_dir / "eval_test.json").read_text(encoding="utf-8"))
    assert summary["visible_piece_acc"] == 1.0, (
        "all-visible evaluation wrote null visible metrics instead of reusing the full metrics")


def test_board_dataset_rejects_duplicate_square_in_a_64_row_frame():
    pytest.importorskip("torch")
    from chesslab.training.torch_data import PackedBoardDataset

    squares = [f"{file}{rank}" for rank in range(1, 9) for file in "abcdefgh"]
    squares[-1] = "a1"
    rows = [{"path": f"p{i}", "label": "empty", "session_id": "s", "frame": "1",
             "square": square} for i, square in enumerate(squares)]
    packed = ("unused", (64, 1, 1), {row["path"]: i for i, row in enumerate(rows)})

    try:
        PackedBoardDataset(rows, ["empty"], lambda image: image, packed)
    except ValueError:
        return
    pytest.fail(
        "PackedBoardDataset accepted 64 rows with duplicate a1 and missing h8 as a complete board")


def test_session_pack_rejects_crops_with_inconsistent_shapes(tmp_path):
    out_dir = tmp_path / "pack"
    out_dir.mkdir()
    crops = [
        (np.zeros((2, 3, 3), dtype=np.uint8), {"frame": "1", "square": "a1"}),
        (np.zeros((3, 2, 3), dtype=np.uint8), {"frame": "1", "square": "a2"}),
    ]

    try:
        _write_rows("pack", out_dir, 2, iter(crops), "test input")
    except ValueError:
        return
    pytest.fail(
        "session pack accepted crops with different shapes and published one shape for both rows")


def test_read_pack_validates_every_rows_pack_name(tmp_path):
    paths = config.Paths(root=tmp_path)
    out_dir = paths.packs / "good"
    out_dir.mkdir(parents=True)
    rows = [{"path": "mm://good/1/a1"}, {"path": "mm://other/1/a2"}]
    pack_session.write_meta(out_dir, rows, 1, 1)
    (out_dir / packs._IMAGE).write_bytes(bytes(6))

    try:
        packs.read_pack("good", paths)
    except ValueError:
        return
    pytest.fail(
        "read_pack accepted a later row that names another pack because it checked only row zero")


def test_dataset_build_does_not_duplicate_overlapping_source_rows(tmp_path):
    paths = config.Paths(root=tmp_path)
    row = {"path": "unused", "label": "wP", "session_id": "s1", "frame": "1",
           "ply": 1, "square": "a1", "square_color": "dark", "fen": "x",
           "out_size": [8, 8]}
    source = tmp_path / "pool.jsonl"
    source.write_text(json.dumps(row) + "\n", encoding="utf-8")

    result = dataset_build.build_dataset(
        "ds", ["s1"], source_manifest=[source, source], per_cell_cap=0,
        phash_enabled=False, val_frac=0.0, test_frac=0.0, allow_degenerate=True,
        write_pack=False, paths=paths)

    assert result["counts"]["final"] == 1, (
        "listing an overlapping source manifest duplicated one physical crop in the dataset")
