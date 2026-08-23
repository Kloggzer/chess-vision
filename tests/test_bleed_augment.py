"""Neighbour-bleed countermeasures: targeted bleed FENs (synth/fens.py) and the
neighbour-paste train augmentation (training/torch_data.py). Headless, no bpy."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

# fens.py lives in synth/ outside the package → temporarily add to path (same pattern
# as test_synth_cli.py).
_SYNTH_DIR = Path(__file__).resolve().parents[1] / "synth"
sys.path.insert(0, str(_SYNTH_DIR))
from fens import bleed_fens  # noqa: E402

sys.path.pop(0)

_TALL = set("QKBRNPqkbrnp")


def _grid(placement: str) -> list[list[str | None]]:
    grid: list[list[str | None]] = [[None] * 8 for _ in range(8)]
    for r_idx, row in enumerate(placement.split("/")):
        rank, f = 7 - r_idx, 0
        for ch in row:
            if ch.isdigit():
                f += int(ch)
            else:
                grid[rank][f] = ch
                f += 1
    return grid


def test_bleed_fens_deterministic_and_parse():
    a = bleed_fens(16, seed=7)
    b = bleed_fens(16, seed=7)
    assert a == b
    import chess

    for fen in a:
        chess.Board(f"{fen} w - - 0 1")  # every placement must be FEN-parsable


def test_bleed_fens_every_empty_square_has_orthogonal_neighbour():
    # occupy_p=1.0 -> full stripes: every empty square borders an occupied line.
    for fen in bleed_fens(32, seed=3, occupy_p=1.0):
        g = _grid(fen)
        for r in range(8):
            for c in range(8):
                if g[r][c] is not None:
                    continue
                orth = [g[r2][c2] for r2, c2 in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1))
                        if 0 <= r2 < 8 and 0 <= c2 < 8]
                assert any(p in _TALL for p in orth if p), (fen, r, c)


def test_bleed_fens_covers_all_squares_and_both_colors():
    fens = bleed_fens(64, seed=42)
    empty_seen, occupied_seen = set(), set()
    colors_of_empty = set()
    for fen in fens:
        g = _grid(fen)
        for r in range(8):
            for c in range(8):
                if g[r][c] is None:
                    empty_seen.add((r, c))
                    colors_of_empty.add((r + c) % 2)
                else:
                    occupied_seen.add((r, c))
    assert len(empty_seen) == 64      # every square appears empty somewhere in the list
    assert len(occupied_seen) == 64   # ... and occupied somewhere
    assert colors_of_empty == {0, 1}  # empties on both square colors


def test_paste_neighbour_strip_changes_edge_keeps_centre():
    import random

    from chesslab.training.torch_data import paste_neighbour_strip

    random.seed(0)
    empty = Image.new("RGB", (128, 128), (90, 60, 30))
    donor = Image.new("RGB", (128, 128), (10, 200, 220))
    out = paste_neighbour_strip(empty, donor, (0.2, 0.3))
    assert out.size == empty.size
    a, o = np.asarray(empty, np.int32), np.asarray(out, np.int32)
    # centre stays (essentially) the empty board ...
    assert np.abs(a[48:80, 48:80] - o[48:80, 48:80]).mean() < 2.0
    # ... while some edge strip carries donor pixels
    border = np.concatenate([o[:8].ravel(), o[-8:].ravel(),
                             o[:, :8].ravel(), o[:, -8:].ravel()])
    a_border = np.concatenate([a[:8].ravel(), a[-8:].ravel(),
                               a[:, :8].ravel(), a[:, -8:].ravel()])
    assert np.abs(border - a_border).mean() > 5.0


def test_square_dataset_neighbour_paste_smoke(tmp_path):
    import random

    from chesslab import config
    from chesslab.training.torch_data import SquareDataset, build_transform

    random.seed(1)
    p_empty = tmp_path / "e.png"
    p_piece = tmp_path / "q.png"
    Image.new("RGB", (128, 128), (90, 60, 30)).save(p_empty)
    Image.new("RGB", (128, 128), (10, 10, 10)).save(p_piece)
    rows = [{"path": str(p_empty), "label": "empty"},
            {"path": str(p_piece), "label": "bQ"}]
    policy = config.AugmentPolicy(neighbour_p=1.0)
    ds = SquareDataset(rows, config.CLASSES, build_transform((128, 128), train=False),
                       augment=True, policy=policy)
    assert ds.neighbour_paste and ds.piece_pool == [str(p_piece)]
    x, y = ds[0]                      # empty crop passes through the paste path
    assert x.shape[-2:] == (128, 128) and y == config.CLASSES.index("empty")
    # eval dataset (augment=False) must never paste
    ds_eval = SquareDataset(rows, config.CLASSES, build_transform((128, 128), train=False),
                            augment=False, policy=policy)
    assert not ds_eval.neighbour_paste
