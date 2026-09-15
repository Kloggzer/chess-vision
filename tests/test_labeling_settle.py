"""`settle_dev` reaches the SLICE: a cell whose pixels left the position it is labelled with.

The exporter's `unknown_squares` covers the NEXT move's footprint. Nothing covered a square that
already holds what was just played while the FEN still calls it empty — measured over the corpus,
the 60 worst such cells are fingers and standing pieces on squares labelled `empty`.
"""

import json

import pytest

from chesslab.labeling import CROP_SUFFIX, SETTLE_LIMIT, all_squares, slice_session
from conftest import START_FEN

#: a1 is index 0 in `all_squares()`; e4 is the one the tests move.
E4 = all_squares().index("e4")


@pytest.fixture
def session(slice_fixture):
    rows = []
    for stem, dev in (("000001", 0.0), ("000002", SETTLE_LIMIT + 5), ("000003", None)):
        row = {"frame": f"frames/{stem}.png", "fen": START_FEN, "ply": 1}
        if dev is not None:
            scores = [0.0] * 64
            scores[E4] = dev
            row["settle_dev"] = scores
            # Das URTEIL, nicht die Messung, steuert den Schnitt — `realgames.departures` faellt es
            # ueber das ganze Intervall, `slice_session` liest nur noch die Liste.
            if dev >= SETTLE_LIMIT:
                row["settle_left"] = ["e4"]
        rows.append(row)
    return slice_fixture(rows)


def _corrections(sdir, by_square, frame):
    """A correction is a row in the session's own ledger now, not an argument."""
    import json as _json

    (sdir / "corrections.jsonl").write_text(
        "".join(_json.dumps({"session_id": "s1", "frame": frame, "square": sq,
                             "label": lab}) + "\n"
                for sq, lab in by_square.items()), encoding="utf-8")


def _slice(session, **kw):
    sdir, prof, root = session
    return slice_session(sdir, profile=prof, manifest_path=root / "m.jsonl",
                         squares_root=root / "squares", out_size=(32, 32), **kw)


def test_only_the_cell_over_the_limit_is_held_back(session):
    """One cell of one frame — the other 63 of that frame are as good as any other."""
    res = _slice(session)

    assert res["unsettled_dropped"] == 1
    assert res["crops"] == 3 * 64 - 1
    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert f"s1_000002_e4{CROP_SUFFIX}" not in written
    assert f"s1_000001_e4{CROP_SUFFIX}" in written, "the same square, settled, still counts"


def test_a_row_without_a_score_is_not_judged(session):
    """An interval too short for a median writes none, and guessing there would invert the point."""
    _slice(session)

    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert f"s1_000003_e4{CROP_SUFFIX}" in written


def test_a_human_correction_outranks_the_doubt(session):
    """Same rule as `dirty`: the gate is a doubt, and a person who looked knows more than it."""
    _corrections(session[0], {"e4": "empty"}, "000002")

    res = _slice(session)

    assert res["unsettled_dropped"] == 0
    assert res["crops"] == 3 * 64
    written = {p.name for p in (session[2] / "squares" / "empty").glob(f"*{CROP_SUFFIX}")}
    assert f"s1_000002_e4{CROP_SUFFIX}" in written


def _rows(sdir):
    return [json.loads(x) for x in (sdir / "log.jsonl").read_text(encoding="utf-8").splitlines() if x]


def _write_rows(sdir, rows):
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")


def _matte(sdir, frame, coverage):
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": frame, "coverage": coverage}) + "\n", encoding="utf-8")


def test_the_covered_cell_survives_the_gate_because_it_IS_the_target(session):
    """Under the hand the deviation is the hand. Dropping it would throw away exactly the material
    the occlusion head is trained on — the coverage takes it out of the piece loss instead."""
    sdir, _prof, root = session
    rows = _rows(sdir)
    rows[1].pop("settle_left", None)          # `departures` meldet eine verdeckte Zelle nie
    _write_rows(sdir, rows)
    _matte(sdir, "000002", {"e4": 0.9})

    res = _slice(session)

    assert res["unsettled_dropped"] == 0
    written = {p.name for p in (root / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert f"s1_000002_e4{CROP_SUFFIX}" in written
    rows = [json.loads(x) for x in (root / "m.jsonl").read_text(encoding="utf-8").splitlines()]
    assert next(r for r in rows if r["frame"] == "000002" and r["square"] == "e4")["coverage"] == 0.9


def test_a_cell_the_alpha_barely_saw_is_dropped_even_at_zero(session):
    """`settle_seen` is the difference between "unchanged" and "unseen": a cell measured on a fifth
    of its pixels agrees with nothing, and its coverage is too low to take it out of the loss."""
    sdir, _prof, root = session
    rows = _rows(sdir)
    seen = [1.0] * 64
    seen[E4] = 0.2
    rows[0]["settle_seen"] = seen
    rows[0]["settle_left"] = ["e4"]
    _write_rows(sdir, rows)
    _matte(sdir, "000001", {"e4": 0.1})

    res = _slice(session)

    assert res["unsettled_dropped"] == 2, "the barely seen cell, and the one over the limit"
    written = {p.name for p in (root / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert f"s1_000001_e4{CROP_SUFFIX}" not in written
