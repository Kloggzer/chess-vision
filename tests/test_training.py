"""Stage 5 — torch-free training logic (board accuracy, split filtering, model card).

The actual train/eval/export need torch (ROCm build) and run on the rig; these cover the
logic that must be correct regardless of hardware.
"""

import pytest

from chesslab import config
from chesslab.training.data import (
    board_accuracy,
    build_model_card,
    checkpoint_score,
    filter_rows_by_split,
    group_frames,
    occupancy_board_acc,
    occupancy_piece_breakdown,
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


# --- Occupancy/piece diagnostics (head-independent, torch-free) --------------------------------

def _ci(label: str) -> int:
    return config.CLASSES.index(label)


def test_occupancy_piece_breakdown_splits_error_sources():
    pairs = [
        ("empty", "empty"),      # occ ok, leer
        ("empty", "wP"),         # occ falsch (leer -> besetzt)
        ("wP", "wP"),            # occ ok, Figur ok
        ("wB", "wN"),            # occ ok, TYP-Fehler (B->N, Farbe gleich)
        ("wB", "bB"),            # occ ok, FARB-Fehler (B==B, w->b)
        ("wK", "empty"),         # occ wrong (occupied -> empty), counts as type error
        ("occluded", "occluded"),  # occ ok, occupied, but no real piece -> no type/color counter
    ]
    trues = [_ci(t) for t, _ in pairs]
    preds = [_ci(p) for _, p in pairs]
    bd = occupancy_piece_breakdown(config.CLASSES, trues, preds)
    assert bd["occ_acc"] == pytest.approx(5 / 7)
    assert bd["n_occupied"] == 5            # wP,wB,wB,wK,occluded
    assert bd["piece_acc"] == pytest.approx(2 / 5)   # wP und occluded exakt richtig
    assert bd["n_pieces"] == 4              # echte Figuren: wP,wB,wB,wK
    assert bd["type_err"] == pytest.approx(2 / 4)    # wB->wN und wK->empty
    assert bd["color_err"] == pytest.approx(1 / 4)   # wB->bB


def test_occupancy_board_acc_is_easier_than_full_board():
    rows = [_crop("s0", "0", sq, "empty") for sq in ("a1", "a2")]
    classes = config.CLASSES
    # wahres Brett: a1 besetzt (wP), a2 leer. Vorhersage verwechselt nur die FIGUR auf a1 (wP->wN),
    # but hits occupancy everywhere -> full board-acc 0, occupancy-board-acc 1.
    trues = [_ci("wP"), _ci("empty")]
    preds = [_ci("wN"), _ci("empty")]
    assert occupancy_board_acc(rows, classes, trues, preds) == 1.0
    full = board_accuracy([((r["session_id"], str(r["frame"])), t == p)
                           for r, t, p in zip(rows, trues, preds, strict=False)])
    assert full == 0.0


# --- Zweistufiger Kopf (braucht torch) ----------------------------------------------------

def test_twostage_head_outputs_valid_logprobs():
    torch = pytest.importorskip("torch")
    from chesslab.training.model import build_model

    model = build_model("smallcnn", len(config.CLASSES), head="twostage", classes=config.CLASSES)
    out = model(torch.randn(4, 3, 128, 128))
    assert out.shape == (4, len(config.CLASSES))
    # valid log-probabilities: exp(out) sums to 1 per row
    assert torch.allclose(out.exp().sum(1), torch.ones(4), atol=1e-4)
    # softmax(out) == exp(out) and argmax matches (inference parity)
    assert torch.allclose(torch.softmax(out, dim=1), out.exp(), atol=1e-5)
    assert bool((out.argmax(1) == torch.softmax(out, dim=1).argmax(1)).all())


def test_twostage_piece_head_only_learns_on_occupied():
    torch = pytest.importorskip("torch")
    import torch.nn.functional as F

    from chesslab.training.model import build_model

    model = build_model("smallcnn", len(config.CLASSES), head="twostage", classes=config.CLASSES)
    x = torch.randn(4, 3, 128, 128)

    def piece_grad_for(label: str) -> float:
        model.zero_grad()
        F.cross_entropy(model(x), torch.full((4,), _ci(label), dtype=torch.long)).backward()
        return model.head.piece_head.weight.grad.abs().sum().item()

    g_empty = piece_grad_for("empty")
    g_piece = piece_grad_for("wP")
    # On occupied squares the piece head learns strongly; on empty ones practically not
    # (winziger Rest nur durch die CE-Renormierung der bereits normierten Log-Probs).
    assert g_piece > 1e-3
    assert g_empty < g_piece * 1e-3


# --- checkpoint_score (torch-frei) -------------------------------------------------------


def _crop_row(session="s0", frame=0, square="a1"):
    return {"session_id": session, "frame": frame, "square": square, "label": "empty",
            "out_size": [128, 128], "path": f"{session}_{frame}_{square}.png"}


def test_checkpoint_score_occ_perfect_types_wrong():
    """Occupancy perfect, all types wrong → occ_board_acc == 1.0 (high score)."""
    classes = config.CLASSES
    # 64 Felder, alle occupied, alle Figuren falsch geraten
    rows = [_crop_row(frame=0, square=f"{(chr(97+c//8))}{8-(c%8)}") for c in range(64)]
    # All truly occupied (wP), prediction guesses other pieces — occupancy remains correct
    trues = [classes.index("wP")] * 64
    preds = [classes.index("wN")] * 64
    occ_ba, occ_acc, mr = checkpoint_score(rows, classes, trues, preds)
    assert occ_ba == 1.0  # alle Felder occupancy-korrekt
    assert mr < 1.0       # Typen falsch → macro_recall nicht perfekt


def test_checkpoint_score_one_occ_flip_per_frame():
    """Exactly one occupancy flip per frame → occ_board_acc == 0.0."""
    classes = config.CLASSES
    # 4 frames, je 1 Feld. Alle 4 Frames haben einen occ-Flip (empty→besetzt).
    rows = [_crop_row(frame=i, square="a1") for i in range(4)]
    trues = [classes.index("empty")] * 4
    preds = [classes.index("wP")] * 4
    occ_ba, occ_acc, mr = checkpoint_score(rows, classes, trues, preds)
    assert occ_ba == 0.0
    assert occ_acc == 0.0  # alle Felder occupancy-falsch


def test_checkpoint_score_tuple_ordering_sortable():
    """Score-Tupel lassen sich korrekt vergleichen (lexikografisch)."""
    assert (1.0, 0.5, 0.3) > (0.9, 0.9, 0.9)  # occ_board_acc sticht
    assert (0.8, 0.9, 0.3) > (0.8, 0.8, 0.9)  # bei gleichem occ_ba: occ_acc sticht
    assert (0.8, 0.8, 0.5) > (0.8, 0.8, 0.3)  # macro_recall als letzter Tiebreaker
