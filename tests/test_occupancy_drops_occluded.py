"""`occluded` is neither empty nor occupied, so an occupancy build must drop it — loudly."""

from chesslab import dataset_build

ROWS = [{"label": "empty"}, {"label": "wR"}, {"label": "occluded"}, {"label": "bP"}]


def test_occluded_rows_are_dropped():
    out = dataset_build.collapse_labels(ROWS, "occupancy")
    assert len(out) == 3
    assert {r["label"] for r in out} == {"empty", "occupied"}


def test_the_drop_is_reported(capsys):
    dataset_build.collapse_labels(ROWS, "occupancy")
    assert "dropped 1" in capsys.readouterr().out


def test_pieces_mode_is_untouched():
    out = dataset_build.collapse_labels(ROWS, "pieces")
    assert out is ROWS


def test_a_pool_without_occluded_says_nothing(capsys):
    dataset_build.collapse_labels([{"label": "empty"}], "occupancy")
    assert capsys.readouterr().out == ""
