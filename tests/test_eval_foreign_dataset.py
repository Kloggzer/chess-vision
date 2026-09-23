"""`chesslab eval --dataset X`: measuring a run against a corpus it was not trained on."""

from __future__ import annotations

import json

import numpy as np
from PIL import Image

from chesslab.training.data import per_session_metrics
from chesslab.training.evaluate import run_eval

CLASSES = ["empty", "wP"]
CROP = 64


def _dataset(root, name, sessions, *, classes=CLASSES):
    """A tiny file-backed dataset: one frame of two squares per session."""
    dd = root / "datasets" / name
    (dd / "squares").mkdir(parents=True)
    rows = []
    for sid in sessions:
        for i, sq in enumerate(("a1", "a2")):
            p = dd / "squares" / f"{sid}_{sq}.png"
            Image.fromarray(np.full((CROP, CROP, 3), 40 * i, dtype=np.uint8)).save(p)
            rows.append({"path": p.as_posix(), "label": classes[i % len(classes)],
                         "session_id": sid, "frame": "000001", "square": sq,
                         "out_size": [CROP, CROP]})
    (dd / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    (dd / "split.json").write_text(json.dumps({
        "classes": list(classes),
        "splits": {"train": sessions[:1], "val": [], "test": sessions[1:]},
    }), encoding="utf-8")
    return dd


def _run(tmp_path, dataset, *, classes=CLASSES, name="run_a", head="combined"):
    import torch

    from chesslab.training.model import build_model

    run_dir = tmp_path / name
    run_dir.mkdir()
    occluding = head == "occlusion"
    model = build_model("smallcnn", len(classes) + occluding, norm="batchnorm", head="combined")
    torch.save(model.state_dict(), str(run_dir / "best.pt"))
    (run_dir / "config.json").write_text(json.dumps({
        "backbone": "smallcnn", "classes": classes, "out_size": [CROP, CROP],
        "norm": "batchnorm", "head": head, "dataset": dataset}), encoding="utf-8")
    return run_dir


def test_a_foreign_dataset_is_measured_without_touching_the_runs_own_numbers(tmp_path, paths):
    _dataset(tmp_path, "home", ["s1", "s2"])
    _dataset(tmp_path, "guest", ["g1", "g2"])
    run_dir = _run(tmp_path, "home")
    (run_dir / "eval_test.json").write_text('{"board_acc": 0.42}', encoding="utf-8")

    assert run_eval(str(run_dir), split_name="all", dataset="guest") == 0

    out = json.loads((run_dir / "eval_all__guest.json").read_text(encoding="utf-8"))
    assert out["dataset"] == "guest"
    assert set(out["per_session"]) == {"g1", "g2"}
    assert json.loads((run_dir / "eval_test.json").read_text())["board_acc"] == 0.42


def test_a_dataset_with_a_different_class_list_is_refused(tmp_path, paths):
    _dataset(tmp_path, "home", ["s1", "s2"])
    _dataset(tmp_path, "guest", ["g1", "g2"], classes=["empty", "wP", "bK"])
    run_dir = _run(tmp_path, "home")

    assert run_eval(str(run_dir), split_name="all", dataset="guest") == 1


def test_sessions_narrows_the_split_and_rejects_unknown_ones(tmp_path, paths):
    _dataset(tmp_path, "home", ["s1", "s2"])
    _dataset(tmp_path, "guest", ["g1", "g2"])
    run_dir = _run(tmp_path, "home")

    assert run_eval(str(run_dir), split_name="all", dataset="guest", sessions=["g2"]) == 0
    out = json.loads((run_dir / "eval_all__guest.json").read_text(encoding="utf-8"))
    assert set(out["per_session"]) == {"g2"}

    assert run_eval(str(run_dir), split_name="all", dataset="guest", sessions=["nope"]) == 1


def test_sessions_the_run_trained_on_are_named_out_loud(tmp_path, paths, capsys):
    """The circularity the whole step exists to avoid: a pretrain scoring its own train split."""
    _dataset(tmp_path, "home", ["s1", "s2"])
    _dataset(tmp_path, "guest", ["s1", "g2"])
    run_dir = _run(tmp_path, "home")

    assert run_eval(str(run_dir), split_name="all", dataset="guest") == 0

    warn = [ln for ln in capsys.readouterr().out.splitlines() if ln.startswith("[WARN]")]
    assert warn and "s1" in warn[0] and "g2" not in warn[0]


def test_per_session_metrics_separate_a_good_session_from_a_bad_one():
    rows = [{"session_id": "a", "frame": "1"}, {"session_id": "a", "frame": "1"},
            {"session_id": "b", "frame": "1"}, {"session_id": "b", "frame": "1"}]
    trues, preds = [0, 1, 0, 1], [0, 1, 0, 0]

    m = per_session_metrics(rows, CLASSES, trues, preds)

    assert m["a"] == {"crops": 2, "square_acc": 1.0, "visible_piece_acc": 1.0,
                      "board_acc": 1.0, "occupied_board_acc": 1.0}
    assert m["b"]["square_acc"] == 0.5 and m["b"]["board_acc"] == 0.0
    # `visible_piece_acc` je Session streut am staerksten (0,584 bis 0,993); ohne sie liest man den
    # Korpuswert fuer bare Muenze.
    assert m["b"]["visible_piece_acc"] == 0.0


def test_an_occlusion_run_is_scored_over_its_classes_only(tmp_path, paths):
    """Its last logit is the coverage sigmoid. Argmaxing over it indexes past the class list.

    Every run this project ships uses `--head occlusion`, so `chesslab eval` raised IndexError
    on all of them once it got past the occupancy line.
    """
    _dataset(tmp_path, "home", ["s1", "s2"])
    run_dir = _run(tmp_path, "home", head="occlusion")

    assert run_eval(str(run_dir), split_name="all") == 0

    out = json.loads((run_dir / "eval_all.json").read_text(encoding="utf-8"))
    assert set(out["recall"]) == set(CLASSES)
