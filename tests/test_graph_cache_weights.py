"""The CUDA-graph cache must key on the checkpoint, like the model cache already does.

A run holds several checkpoints (`swa.pt`, `best_piece.pt`) and the training picks no winner.
`load_run` puts `weights` in its key for exactly that reason; the graph cache did not, so on
GPU a graph captured for the run's DEFAULT replayed for every later `--weights` call — the
wrong model, silently, with no fallback to notice it.
"""

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
