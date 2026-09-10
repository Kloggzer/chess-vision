"""Checkpoint ranking must follow the trained visible identities."""
from chesslab.training.train import _checkpoint_rank, _compact_metrics


def test_visible_identity_wins_over_hidden_identity_and_confidence():
    a = {"visible_piece_acc": 0.96, "visible_occupied_acc": 0.99, "piece_acc": 0.8}
    b = {"visible_piece_acc": 0.94, "visible_occupied_acc": 1.0, "piece_acc": 0.99}
    assert _checkpoint_rank(a, 0.5) > _checkpoint_rank(b, 0.99)


def test_confidence_breaks_equal_accuracy_ties():
    bd = {"visible_piece_acc": 0.96, "visible_occupied_acc": 0.99}
    assert _checkpoint_rank(bd, 0.9) > _checkpoint_rank(bd, 0.8)
    assert _checkpoint_rank(bd, None)[2] == 0.0


def test_compact_metrics_keep_visibility_and_diagnostics():
    rec = {"val_piece_acc": 0.8, "val_acc": 0.9, "val_visible_piece_acc": 0.96,
           "val_coverage_mae": 0.01, "val_loss": 0.2, "t_data_s": 1.2}
    assert _compact_metrics(rec) == {
        "val_visible_piece_acc": 0.96, "val_coverage_mae": 0.01,
        "val_loss": 0.2, "t_data_s": 1.2}
    assert "val_piece_acc" in rec
