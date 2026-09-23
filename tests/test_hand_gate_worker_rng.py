"""Jeder Loader-Worker des Hand-Gates zieht eine eigene, aus `seed` reproduzierbare Folge."""

from __future__ import annotations

from chesslab.hand_gate import BoardSet, worker_seed


class _Info:
    def __init__(self, ident: int) -> None:
        self.id = ident


def _as_worker(monkeypatch, ident: int | None) -> None:
    import torch.utils.data

    monkeypatch.setattr(torch.utils.data, "get_worker_info",
                        lambda: None if ident is None else _Info(ident))


def test_each_worker_gets_its_own_seed(monkeypatch) -> None:
    seen = []
    for ident in (None, 0, 1, 2, 3):
        _as_worker(monkeypatch, ident)
        seen.append(worker_seed(7))

    assert len(set(seen)) == len(seen), f"zwei Worker teilen sich eine Folge: {seen}"


def test_two_workers_draw_different_numbers(monkeypatch) -> None:
    draws = []
    for ident in (0, 1):
        _as_worker(monkeypatch, ident)
        draws.append(BoardSet([], size=8, train=True, seed=7).rng.uniform(0, 1))

    assert draws[0] != draws[1]


def test_the_same_worker_stays_reproducible(monkeypatch) -> None:
    _as_worker(monkeypatch, 2)
    a = BoardSet([], size=8, train=True, seed=7).rng.uniform(0, 1)
    b = BoardSet([], size=8, train=True, seed=7).rng.uniform(0, 1)

    assert a == b, "derselbe Worker und derselbe Seed muessen dieselbe Folge geben"
