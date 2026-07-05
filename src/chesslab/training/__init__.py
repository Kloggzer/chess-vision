"""Stage 5 — Training handoff: train, evaluate, export per-square CNN.

Torch is only imported at top level in the executing modules (`model`, `torch_data`, `engine`).
`data.py` is deliberately torch-free (board accuracy reconstruction,
split filtering, model card) and importable and testable without PyTorch.
"""

from .evaluate import load_run  # noqa: F401  — öffentlich, von `chesslab.serving` verwendet
