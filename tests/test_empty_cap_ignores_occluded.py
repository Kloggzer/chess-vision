"""`occluded` ist ein Sehzustand, keine Identitaet, auf beiden Seiten von `empty_cap`."""

from __future__ import annotations

from chesslab.dataset import subsample_classes


def _rows(label: str, n: int) -> list[dict]:
    return [{"label": label, "path": f"{label}/{i:05d}.webp"} for i in range(n)]


def test_empty_cap_follows_the_biggest_real_piece_class() -> None:
    rows = _rows("wP", 10) + _rows("occluded", 100) + _rows("empty", 500)

    kept = subsample_classes(rows, max_empty_ratio=1.0, seed=0)
    counts: dict[str, int] = {}
    for r in kept:
        counts[r["label"]] = counts.get(r["label"], 0) + 1

    assert counts["empty"] == 10, (
        "die Kappe gehoert an wP, die groesste echte Figurenklasse, nicht an occluded")


def test_a_pieces13_build_is_untouched() -> None:
    rows = _rows("wP", 10) + _rows("bQ", 40) + _rows("empty", 500)

    counts: dict[str, int] = {}
    for r in subsample_classes(rows, max_empty_ratio=1.0, seed=0):
        counts[r["label"]] = counts.get(r["label"], 0) + 1

    assert counts["empty"] == 40, "ohne occluded aendert sich nichts"
