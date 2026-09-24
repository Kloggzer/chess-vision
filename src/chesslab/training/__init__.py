"""Stage 5 — training, evaluation, export of the per-square CNN. `data.py` stays torch-free and
testable without PyTorch.
"""

from .worker_rng import install_epoch_seeded_loader

install_epoch_seeded_loader()
