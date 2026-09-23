"""`dirty` reaches the SLICE — a hand in the frame means a move is in flight, so the whole board is
suspect until the commit, not just the cells under the hand.
"""


import pytest

from chesslab.labeling import CROP_SUFFIX
from conftest import START_FEN, slice_small, write_jsonl


@pytest.fixture
def session(slice_fixture):
    rows = [{"frame": "frames/000001.png", "fen": START_FEN, "ply": 1, "dirty": True},
            {"frame": "frames/000002.png", "fen": START_FEN, "ply": 1},
            {"frame": "frames/000003.png", "fen": START_FEN, "ply": 1,
             "grid_lines_source": "carried"}]
    return slice_fixture(rows)


def test_a_dirty_frame_contributes_nothing_on_its_own(session):
    res = slice_small(session)

    assert res["dirty_dropped"] == 128, "the carried frame counts too"
    assert res["crops"] == 64, "the quiet frame is untouched"
    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert not [n for n in written if n.startswith("s1_000001_")]


def test_labeling_recovers_the_cells_a_human_named(session):
    """The point of the gate: it holds material back for review, it does not burn it."""
    write_jsonl(session[0] / "corrections.jsonl",
                [{"session_id": "s1", "frame": "000001", "square": sq, "label": lab}
                 for sq, lab in [("e2", "empty"), ("d4", "wP")]])

    res = slice_small(session)

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
    slice_small(session)

    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert not [n for n in written if n.startswith("s1_000003_")]
