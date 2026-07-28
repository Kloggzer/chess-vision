"""A square that is neither hidden nor clear carries no true label — it must be dropped."""
import json

from chesslab import synth_build


def _entry(**over):
    e = {"frame": "0000.png",
         "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
         "ply": 0, "occluded_squares": [], "ambiguous_squares": []}
    e.update(over)
    return e


def test_ambiguous_squares_produce_no_row():
    full = synth_build._rows_for_entry("d", "s", _entry(), (32, 32))
    assert len(full) == 64

    dropped = synth_build._rows_for_entry("d", "s", _entry(ambiguous_squares=["e2", "d7"]),
                                          (32, 32))
    assert len(dropped) == 62
    assert not [r for r in dropped if r["path"].endswith(("_e2.png", "_d7.png"))]


def test_occluded_still_overrides_and_is_kept():
    rows = synth_build._rows_for_entry("d", "s", _entry(occluded_squares=["e2"]), (32, 32))
    assert len(rows) == 64
    e2 = [r for r in rows if r["path"].endswith("_e2.png")][0]
    assert e2["label"] == "occluded"


def test_a_square_cannot_be_both_and_ambiguous_wins():
    """Overlap would mean the renderer emitted nonsense; dropping is the safe reading."""
    rows = synth_build._rows_for_entry(
        "d", "s", _entry(occluded_squares=["e2"], ambiguous_squares=["e2"]), (32, 32))
    assert len(rows) == 63
    assert not [r for r in rows if r["path"].endswith("_e2.png")]


def test_synthetic_adapter_passes_both_lists(tmp_path):
    from chesslab.ingest_adapters.synthetic import iter_items
    (tmp_path / "000000.jpg").write_bytes(b"x")
    (tmp_path / "000000.json").write_text(json.dumps({
        "fen": "8/8/8/8/8/8/8/8", "corners": [[0, 0], [1, 0], [1, 1], [0, 1]],
        "occluded_squares": ["a1"], "ambiguous_squares": ["b1"]}), encoding="utf-8")
    it = list(iter_items(tmp_path))[0]
    assert it.meta["occluded_squares"] == ["a1"]
    assert it.meta["ambiguous_squares"] == ["b1"]
