"""`unknown_squares` reaches the SLICE — the poison path that was open until 2026-08-09."""


import pytest

from chesslab.labeling import CROP_SUFFIX, slice_session
from conftest import START_FEN


@pytest.fixture
def session(slice_fixture):
    return slice_fixture([{"frame": "frames/000001.png", "fen": START_FEN, "ply": 1,
                           "unknown_squares": ["e2", "e4"]}])


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


def test_a_square_the_fen_cannot_vouch_for_writes_no_crop(session):
    """Until today `slice` did not read the field at all, so these crops went into training under
    a label measured to be stale by up to 4.6 s — always the same wrong label on the same square."""
    res = _slice(session)

    assert res["unknown_dropped"] == 2
    assert res["crops"] == 62, "the other 62 squares are unaffected"
    written = {p.name for p in (session[2] / "squares").rglob(f"*{CROP_SUFFIX}")}
    assert not [n for n in written if n.endswith((f"_e2{CROP_SUFFIX}", f"_e4{CROP_SUFFIX}"))]


def test_a_human_ruling_outranks_the_doubt(session):
    """The between-commit window is where the hands are. A person who names the cell knows
    something the FEN does not, and that ruling outranks the gate."""
    _corrections(session[0], {"e2": "empty"}, "000001")

    res = _slice(session)

    assert res["unknown_dropped"] == 1, "only e4 is still unruled"
    assert res["crops"] == 63
    assert (session[2] / "squares" / "empty" / f"s1_000001_e2{CROP_SUFFIX}").exists()
