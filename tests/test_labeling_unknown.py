"""`unknown_squares` reaches the SLICE — the poison path this closes."""


import pytest

from chesslab.labeling import CROP_SUFFIX
from conftest import START_FEN, slice_small, write_jsonl


@pytest.fixture
def session(slice_fixture):
    return slice_fixture([{"frame": "frames/000001.png", "fen": START_FEN, "ply": 1,
                           "unknown_squares": ["e2", "e4"]}])


def test_a_square_the_fen_cannot_vouch_for_writes_no_crop(session):
    """Until today `slice` did not read the field at all, so these crops went into training under
    a label measured to be stale by up to 4.6 s — always the same wrong label on the same square."""
    res = slice_small(session)

    assert res["unknown_dropped"] == 2
    assert res["crops"] == 62, "the other 62 squares are unaffected"
    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert not [n for n in written if n.endswith((f"_e2{CROP_SUFFIX}", f"_e4{CROP_SUFFIX}"))]


def test_a_human_ruling_outranks_the_doubt(session):
    """The between-commit window is where the hands are. A person who names the cell knows
    something the FEN does not, and that ruling outranks the gate."""
    write_jsonl(session[0] / "corrections.jsonl",
                [{"session_id": "s1", "frame": "000001", "square": sq, "label": lab}
                 for sq, lab in [("e2", "empty")]])

    res = slice_small(session)

    assert res["unknown_dropped"] == 1, "only e4 is still unruled"
    assert res["crops"] == 63
    assert (session[2] / "squares" / "empty" / f"s1_000001_e2{CROP_SUFFIX}").exists()
