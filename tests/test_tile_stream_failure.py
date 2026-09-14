"""Background work announces its failure — a dead pump must not look like slow work.

`tile_stream` pumps from its own thread. When that thread raised, nothing reached the consumer
and `q.get()` blocked forever: the composite build hung with no message, which is the defect the
standing rule names (memory: "Hintergrundarbeit meldet ihr Scheitern").
"""

import threading

import pytest

from chesslab.composite import tile_stream


def _drain(tiles, box):
    def run():
        try:
            for _ in tile_stream(tiles, (1, 1), seed=1, stride=1, depth=1, workers=1):
                box.append("item")
                return
        except BaseException as e:  # noqa: BLE001 - the point is that SOMETHING arrives
            box.append(e)

    t = threading.Thread(target=run, daemon=True)
    t.start()
    t.join(timeout=10)
    return t


def test_a_pump_that_dies_reaches_the_consumer_instead_of_hanging():
    box: list = []

    t = _drain([], box)

    assert not t.is_alive(), (
        "tile_stream blocked on an empty queue after its pump thread died — the composite build "
        "hangs with no message instead of failing"
    )
    assert box and isinstance(box[0], BaseException), f"expected the failure to surface, got {box}"


def test_a_working_stream_still_yields(tmp_path, monkeypatch):
    import numpy as np

    from chesslab import composite

    monkeypatch.setattr(composite, "read_tile",
                        lambda p: (np.zeros((2, 2, 3), np.uint8), np.zeros((2, 2), np.uint8)))
    tile = tmp_path / "a.png"
    tile.write_bytes(b"")

    idx, items = next(iter(tile_stream([tile], (1, 1), seed=1, stride=1, depth=1, workers=1)))

    assert idx == 0 and len(items) == 1 and items[0][0] == "a.png"


if __name__ == "__main__":
    pytest.main([__file__])
