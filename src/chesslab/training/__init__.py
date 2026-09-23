"""Stage 5 — training, evaluation, export of the per-square CNN. `data.py` stays torch-free and
testable without PyTorch.
"""

from .worker_rng import install_epoch_seeded_loader

install_epoch_seeded_loader()

from .evaluate import load_run  # noqa: E402, F401  — öffentlich, von `chesslab.serving` verwendet
