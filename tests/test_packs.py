"""Tests for training/packs.py — the pack layout contract and the mm:// resolver.

Everything here is fake pixels: a pack is a meta file plus a zero-filled image of the size the
meta claims, which is all `load_pack`/`resolve_packs` ever look at.
"""

from __future__ import annotations

import json
import re

import pytest

from chesslab import config
from chesslab.training import packs as packs_mod

CROP = 8


def _mm(name: str, i: int) -> str:
    return f"mm://{name}/f{i:03d}/e4.png"


def _make_pack(paths: config.Paths, name: str, n: int, crop: int = CROP,
               row_paths: list[str] | None = None, size_delta: int = 0):
    """Write packs/<name>/ with a meta for n crops and an image file of the matching size."""
    d = packs_mod.pack_dir(name, paths)
    d.mkdir(parents=True)
    row_paths = row_paths or [_mm(name, i) for i in range(n)]
    rows = [{"path": p, "label": "empty", "out_size": [crop, crop]} for p in row_paths]
    packs_mod.write_meta(d, rows, crop, crop)
    with open(d / "packed_images.u8", "wb") as fh:
        fh.truncate(n * crop * crop * 3 + size_delta)
    return d, rows


@pytest.fixture
def paths(tmp_path):
    return config.Paths(root=tmp_path)


def test_pack_name_of_rejects_file_paths():
    with pytest.raises(ValueError):
        packs_mod.pack_name_of("data/crops/x.webp")
    assert packs_mod.pack_name_of("mm://name/sid/frame_square.png") == "name"


def test_load_pack_refuses_a_short_image(paths):
    _make_pack(paths, "a", 4, size_delta=-1)
    with pytest.raises(ValueError, match="bytes"):
        packs_mod.load_pack("a", paths)


def test_resolve_packs_orders_packs_by_first_sight(paths):
    _make_pack(paths, "A", 3)
    _make_pack(paths, "B", 3)
    rows = [{"path": _mm("B", 1)}, {"path": _mm("A", 2)}, {"path": _mm("B", 0)}]
    mp = packs_mod.resolve_packs(rows, paths)
    assert [p for p, _ in mp.files] == [
        str(packs_mod.pack_dir("B", paths) / "packed_images.u8"),
        str(packs_mod.pack_dir("A", paths) / "packed_images.u8"),
    ]
    assert mp.idx.tolist() == [[0, 1], [1, 2], [0, 0]]
    assert mp.n == 3 and mp.hw() == (CROP, CROP)


def test_resolve_packs_refuses_mixed_crop_sizes(paths):
    _make_pack(paths, "small", 2, crop=80)
    _make_pack(paths, "big", 2, crop=96)
    rows = [{"path": _mm("small", 0)}, {"path": _mm("big", 0)}]
    with pytest.raises(ValueError, match="big"):
        packs_mod.resolve_packs(rows, paths)


def test_resolve_packs_names_the_missing_row(paths):
    _make_pack(paths, "a", 2)
    missing = _mm("a", 9)
    with pytest.raises(KeyError, match=re.escape(missing)):
        packs_mod.resolve_packs([{"path": missing}], paths)


def test_load_pack_refuses_a_row_from_another_pack(paths):
    d, _ = _make_pack(paths, "a", 2)
    meta = json.loads((d / "packed_meta.json").read_text(encoding="utf-8"))
    meta["paths"][1] = _mm("other", 1)
    (d / "packed_meta.json").write_text(json.dumps(meta), encoding="utf-8")
    with pytest.raises(ValueError, match="another pack"):
        packs_mod.load_pack("a", paths)


def test_multipack_refuses_tuple_unpacking(paths):
    _make_pack(paths, "a", 2)
    mp = packs_mod.resolve_packs([{"path": _mm("a", 0)}], paths)
    with pytest.raises(TypeError, match="packs"):
        a, b, c = mp
