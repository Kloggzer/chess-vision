"""_diverse_sample: kings never move — the sample must span distinct (session, square)
combos before repeating near-identical frames, and be deterministic across reloads."""

from chesslab.training.gradcam import _diverse_sample


def _row(session: str, square: str, frame: str) -> dict:
    return {"label": "bK", "session_id": session, "square": square, "frame": frame,
            "path": f"data/squares/bK/{session}_{frame}_{square}.png"}


def _rows_3_groups() -> list[dict]:
    """3 distinct (session, square) combos, each with 10 near-identical frames —
    the recorded-session reality for static pieces. Manifest order: all frames of
    the first combo first, so a first-N picker would show one frame N times."""
    rows = []
    for session, square in [("s1", "e8"), ("s1", "d5"), ("s2", "e8")]:
        rows.extend(_row(session, square, f"{i:04d}") for i in range(10))
    return rows


def test_duplicates_last_covers_all_combos_first():
    rows = _rows_3_groups()
    picked = _diverse_sample(rows, per_class=3, seed=42)
    combos = {(r["session_id"], r["square"]) for r in picked}
    assert len(picked) == 3
    assert combos == {("s1", "e8"), ("s1", "d5"), ("s2", "e8")}


def test_repeats_spread_evenly_after_coverage():
    rows = _rows_3_groups()
    picked = _diverse_sample(rows, per_class=8, seed=42)
    assert len(picked) == 8
    counts: dict[tuple, int] = {}
    for r in picked:
        counts[(r["session_id"], r["square"])] = counts.get((r["session_id"], r["square"]), 0) + 1
    # round-robin: 8 picks over 3 groups -> per-group counts differ by at most 1 (3/3/2)
    assert sorted(counts.values()) == [2, 3, 3]
    # never the same frame twice
    assert len({(r["session_id"], r["square"], r["frame"]) for r in picked}) == 8


def test_deterministic_across_calls():
    rows = _rows_3_groups()
    a = _diverse_sample(rows, per_class=5, seed=42)
    b = _diverse_sample(rows, per_class=5, seed=42)
    assert [r["path"] for r in a] == [r["path"] for r in b]
    # input order must not change the coverage: same (session, square) combos either way
    c = _diverse_sample(list(reversed(rows)), per_class=5, seed=42)
    assert len(c) == 5
    assert {(r["session_id"], r["square"]) for r in c} == {(r["session_id"], r["square"]) for r in a}


def test_fewer_rows_than_per_class_returns_all():
    rows = [_row("s1", "e1", "0000"), _row("s1", "e1", "0001")]
    assert _diverse_sample(rows, per_class=8, seed=42) == rows
