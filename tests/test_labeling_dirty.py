"""`dirty` reaches the SLICE — a hand in the frame means a move is in flight, so the whole board is
suspect until the commit, not just the cells under the hand (measured 2026-08-16: 5 132 of 15 417
exported rows are dirty and every one of them was sliced with a FEN label)."""

import json

import pytest

from chesslab.labeling import CROP_SUFFIX, slice_session
from conftest import START_FEN


@pytest.fixture
def session(slice_fixture):
    rows = [{"frame": "frames/000001.png", "fen": START_FEN, "ply": 1, "dirty": True},
            {"frame": "frames/000002.png", "fen": START_FEN, "ply": 1},
            {"frame": "frames/000003.png", "fen": START_FEN, "ply": 1,
             "grid_lines_source": "carried"}]
    return slice_fixture(rows)


def _corrections(session, by_square, frame="000001"):
    """A correction is a row in the session's own ledger now, not an argument."""

    (session[0] / "corrections.jsonl").write_text(
        "".join(json.dumps({"session_id": "s1", "frame": frame, "square": sq,
                           "label": lab}) + "\n"
                for sq, lab in by_square.items()), encoding="utf-8")


def _slice(session, **kw):
    sdir, prof, root = session
    return slice_session(sdir, profile=prof, manifest_path=root / "m.jsonl",
                         squares_root=root / "squares", out_size=(32, 32), **kw)


def test_a_dirty_frame_contributes_nothing_on_its_own(session):
    res = _slice(session)

    assert res["dirty_dropped"] == 128, "the carried frame counts too"
    assert res["crops"] == 64, "the quiet frame is untouched"
    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert not [n for n in written if n.startswith("s1_000001_")]


def test_labeling_recovers_the_cells_a_human_named(session):
    """The point of the gate: it holds material back for review, it does not burn it."""
    _corrections(session, {"e2": "empty", "d4": "wP"})

    res = _slice(session)

    assert res["dirty_dropped"] == 126
    assert res["crops"] == 66
    # From the DIRTY frame 000001, exactly the two named cells came back — nothing else did.
    recovered = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")
                 if p.name.startswith("s1_000001_")}
    assert recovered == {f"s1_000001_e2{CROP_SUFFIX}", f"s1_000001_d4{CROP_SUFFIX}"}
    assert (session[2] / "squares" / "empty" / f"s1_000001_e2{CROP_SUFFIX}").exists()
    assert (session[2] / "squares" / "wP" / f"s1_000001_d4{CROP_SUFFIX}").exists()


def test_a_carried_mesh_is_treated_as_a_hand(session):
    """The mesh is a neighbour's because THIS frame's grooves were unreadable — measured over
    2 228 frames that is a hand 94.5 % of the time, against 1.1 % on hand-free frames."""
    _slice(session)

    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert not [n for n in written if n.startswith("s1_000003_")]
