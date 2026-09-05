"""Tests for training/packs.py — the pack layout contract and the mm:// resolver.

Everything here is fake pixels: a pack is a meta file plus a zero-filled image of the size the
meta claims, which is all `read_pack`/`resolve_packs` ever look at.
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
    _make_pack(paths, "a-80", 4, size_delta=-1)
    with pytest.raises(ValueError, match="bytes"):
        packs_mod.read_pack("a-80", paths)


def test_load_pack_refuses_a_name_the_rows_disagree_with(paths):
    _make_pack(paths, "a-80", 2, row_paths=[_mm("b", 0), _mm("b", 1)])
    with pytest.raises(ValueError, match="a-80.*b"):
        packs_mod.read_pack("a-80", paths)


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
    with pytest.raises(ValueError, match="big.*small"):
        packs_mod.resolve_packs(rows, paths)


def test_resolve_packs_names_the_missing_row(paths):
    _make_pack(paths, "a", 2)
    missing = _mm("a", 9)
    with pytest.raises(KeyError, match=re.escape(missing)):
        packs_mod.resolve_packs([{"path": missing}], paths)


def test_packed_shape_reads_both_forms(paths):
    _make_pack(paths, "a", 3)
    mp = packs_mod.resolve_packs([{"path": _mm("a", i)} for i in range(3)], paths)
    legacy = ("packed_images.u8", (3, CROP, CROP), {})
    assert packs_mod.packed_shape(mp) == packs_mod.packed_shape(legacy) == (3, CROP, CROP)


def test_list_packs_skips_a_broken_dir_and_keeps_the_rest(paths):
    _make_pack(paths, "b-80", 2)
    _make_pack(paths, "a-80", 2)
    _make_pack(paths, "broken", 2, size_delta=-3)
    assert [p.name for p in packs_mod.list_packs(paths)] == ["a-80", "b-80"]


def test_write_meta_writes_exactly_the_five_keys(paths):
    d, _ = _make_pack(paths, "a", 2)
    meta = json.loads((d / "packed_meta.json").read_text(encoding="utf-8"))
    assert set(meta) == {"n", "h", "w", "digest", "paths"}
    assert (meta["n"], meta["h"], meta["w"]) == (2, CROP, CROP)
    assert meta["paths"] == [_mm("a", 0), _mm("a", 1)]
