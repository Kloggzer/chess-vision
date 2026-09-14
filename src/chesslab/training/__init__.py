"""Stage 5 — Training handoff: train, evaluate, export per-square CNN.

Torch is imported at top level only in executing modules, including `worker_rng` and `engine`.
`data.py` is deliberately torch-free (board accuracy reconstruction,
split filtering, model card) and importable and testable without PyTorch.
"""

from .worker_rng import install_epoch_seeded_loader

install_epoch_seeded_loader()

from .evaluate import load_run  # noqa: E402, F401  — öffentlich, von `chesslab.serving` verwendet
