"""`_PreadRows` muss denselben Schnitt koennen wie die Memmap — sonst liest der Pfad,
den grosse Packs waehlen, etwas anderes als der Pfad, gegen den getestet wurde."""

import numpy as np
import pytest

from chesslab.training.pack import _PreadRows, open_packed_memmap

H, W, N = 8, 6, 40


@pytest.fixture
def pack(tmp_path):
    rng = np.random.default_rng(3)
    data = rng.integers(0, 256, (N, H, W, 3), dtype=np.uint8)
    f = tmp_path / "packed_images.u8"
    f.write_bytes(data.tobytes())
    return str(f), data


def test_single_row_matches_the_memmap(pack):
    path, data = pack
    reader = _PreadRows(path, (N, H, W))
    for i in (0, 1, 17, N - 1):
        assert np.array_equal(reader[i], data[i])


def test_a_slice_reads_the_same_bytes_as_64_single_griffe(pack):
    """Der Brett-Schnitt: EIN Lesevorgang statt 64 Suchlaeufen, und beide muessen gleich sein."""
    path, data = pack
    reader = _PreadRows(path, (N, H, W))
    for start, stop in ((0, 8), (5, 21), (N - 4, N)):
        got = reader[start:stop]
        assert got.shape == (stop - start, H, W, 3)
        assert np.array_equal(got, data[start:stop])
        assert np.array_equal(got, np.stack([reader[i] for i in range(start, stop)]))


def test_a_strided_slice_is_refused_not_silently_wrong(pack):
    path, _ = pack
    with pytest.raises(ValueError, match="zusammenhaengende"):
        _ = _PreadRows(path, (N, H, W))[0:10:2]


def test_the_env_override_picks_the_reader(pack, monkeypatch):
    """`CHESSLAB_PACK_READER` ist der Schalter, mit dem ein Lauf die Heuristik ueberstimmt."""
    path, data = pack
    monkeypatch.setenv("CHESSLAB_PACK_READER", "pread")
    assert isinstance(open_packed_memmap(path, (N, H, W)), _PreadRows)
    monkeypatch.setenv("CHESSLAB_PACK_READER", "memmap")
    mm = open_packed_memmap(path, (N, H, W))
    assert isinstance(mm, np.memmap)
    # Und beide liefern dieselben Pixel — sonst haengt das Ergebnis am Speicherstand der Maschine.
    monkeypatch.setenv("CHESSLAB_PACK_READER", "pread")
    assert np.array_equal(open_packed_memmap(path, (N, H, W))[3:11], np.asarray(mm[3:11]))
