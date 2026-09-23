"""The CUDA-graph cache keys on the checkpoint, like the model cache."""

from pathlib import Path

from chesslab.serving import graph_key


def test_two_checkpoints_of_one_run_do_not_share_a_graph():
    run = Path("data/models/some-run")

    assert graph_key(run, "cuda", None) != graph_key(run, "cuda", "swa.pt")
    assert graph_key(run, "cuda", "swa.pt") != graph_key(run, "cuda", "best_piece.pt")


def test_the_same_checkpoint_on_the_same_device_still_shares_one():
    run = Path("data/models/some-run")

    assert graph_key(run, "cuda", "swa.pt") == graph_key(run, "cuda", "swa.pt")
    assert graph_key(run, "cuda", None) != graph_key(run, "cuda:1", None)
