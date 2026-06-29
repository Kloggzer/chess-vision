"""Stage 5 — torch-free training logic (board accuracy, split filtering, model card).

The actual train/eval/export need torch (ROCm build) and run on the rig; these cover the
logic that must be correct regardless of hardware.
"""

from chesslab import config
from chesslab.training.data import (
    board_accuracy,
    build_model_card,
    filter_rows_by_split,
    group_frames,
)


def _crop(session, frame, square, label):
    return {"session_id": session, "frame": frame, "square": square, "label": label,
            "out_size": [96, 128], "path": f"{session}_{frame}_{square}.png"}


def test_board_accuracy_all_or_nothing():
    # one frame, 64 squares all correct -> board correct
    perfect = [(("s0", "0"), True) for _ in range(64)]
    assert board_accuracy(perfect) == 1.0
    # flip a single square -> whole board wrong
    one_wrong = perfect[:-1] + [(("s0", "0"), False)]
    assert board_accuracy(one_wrong) == 0.0
    # two frames: one perfect, one broken -> 0.5
    two = [(("s0", "0"), True)] * 64 + [(("s0", "1"), True)] * 63 + [(("s0", "1"), False)]
    assert board_accuracy(two) == 0.5


def test_board_accuracy_empty_is_zero():
    assert board_accuracy([]) == 0.0


def test_filter_rows_by_split_respects_sessions():
    rows = [_crop("s0", "0", "e1", "wK"), _crop("s1", "0", "e1", "wK"), _crop("s2", "0", "e1", "wK")]
    split = {"splits": {"train": ["s0", "s2"], "val": ["s1"], "test": []}}
    train = filter_rows_by_split(rows, split, "train")
    val = filter_rows_by_split(rows, split, "val")
    assert {r["session_id"] for r in train} == {"s0", "s2"}
    assert {r["session_id"] for r in val} == {"s1"}
    assert filter_rows_by_split(rows, split, "test") == []


def test_group_frames_keys_on_session_and_frame():
    rows = [_crop("s0", "0", "a1", "empty"), _crop("s0", "0", "b1", "wN"),
            _crop("s0", "1", "a1", "empty")]
    groups = group_frames(rows)
    assert set(groups.keys()) == {("s0", "0"), ("s0", "1")}
    assert len(groups[("s0", "0")]) == 2


def test_build_model_card_has_required_fields():
    card = build_model_card(
        classes=config.CLASSES, out_size=(96, 128), backbone="smallcnn",
        metrics={"board_acc": 0.9}, torch_version="2.4.1+rocm6.2", hip_version="6.2",
        exported_formats=["torchscript", "onnx"],
    )
    assert card["classes"] == config.CLASSES
    assert card["out_size"] == [96, 128]
    assert card["normalize"]["mean"] == list(config.NORMALIZE_MEAN)
    assert card["normalize"]["std"] == list(config.NORMALIZE_STD)
    assert card["rocm_hip"] == "6.2"
    assert set(card["exported_formats"]) == {"torchscript", "onnx"}
    assert "created_at" in card
