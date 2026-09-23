"""Tests for training/packs.py: the pack layout contract and the mm:// resolver."""

from __future__ import annotations

import json
import random
import re

import numpy as np
import pytest

from chesslab import config
from chesslab.training import pack_session
from chesslab.training import packs as packs_mod
from conftest import write_jsonl

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
    pack_session.write_meta(d, rows, crop, crop)
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


# --- Phase 02: the loader side — one memmap per pack, several packs per dataset ---

SIDE = 4


def _to_tensor(img):
    import torch

    return torch.from_numpy(np.asarray(img).copy()).permute(2, 0, 1).float()


def _pixel_pack(paths: config.Paths, name: str, n: int, base: int) -> list[dict]:
    """A pack whose row j holds the constant `base + j`, so a served crop names its own pack."""
    d, rows = _make_pack(paths, name, n, crop=SIDE)
    data = np.stack([np.full((SIDE, SIDE, 3), base + j, np.uint8) for j in range(n)])
    (d / "packed_images.u8").write_bytes(data.tobytes())
    return rows


def _pack_built_dataset(paths: config.Paths, name: str, rows: list[dict], packs: str = "[A]"):
    from chesslab.dataset_build import dataset_dir

    dd = dataset_dir(name, paths)
    dd.mkdir(parents=True)
    write_jsonl(dd / "manifest.jsonl", rows)
    (dd / "dataset.yaml").write_text(f"{packs_mod.PACKS_KEY}: {packs}\n", encoding="utf-8")
    return dd


def test_square_dataset_serves_pixels_from_the_right_pack(paths):
    from chesslab.training.torch_data import PackedSquareDataset

    a = _pixel_pack(paths, "A", 3, base=10)
    b = _pixel_pack(paths, "B", 3, base=50)
    rows = [b[2], a[0], b[1]]

    ds = PackedSquareDataset(rows, ["empty"], _to_tensor, packs_mod.resolve_packs(rows, paths))

    assert len(ds._files) == 2
    assert [int(ds[i][0].max()) for i in range(3)] == [52, 10, 51]


def test_board_dataset_groups_64_cells_across_packs(paths):
    from chesslab.training.boardnet import CELLS, square_index
    from chesslab.training.torch_data import PackedBoardDataset

    a = _pixel_pack(paths, "A", 32, base=1)
    b = _pixel_pack(paths, "B", 32, base=101)
    squares = sorted((f"{f}{r}" for f in "abcdefgh" for r in range(1, 9)), key=square_index)
    rows = [{**(a[k] if k < 32 else b[k - 32]), "session_id": "s", "frame": "f0", "square": sq}
            for k, sq in enumerate(squares)]
    random.Random(0).shuffle(rows)

    ds = PackedBoardDataset(rows, ["empty"], _to_tensor, packs_mod.resolve_packs(rows, paths))

    x, y = ds[0]
    # Drei Zielspalten: Klasse, Coverage, Helligkeit.
    assert len(ds) == 1 and x.shape == (CELLS, 3, SIDE, SIDE) and y.shape == (CELLS, 3)
    assert [int(c.max()) for c in x] == [1 + k if k < 32 else 69 + k for k in range(CELLS)]


def test_legacy_tuple_still_works(tmp_path):
    from chesslab.training.torch_data import PackedSquareDataset

    data = np.stack([np.full((SIDE, SIDE, 3), 7 * j, np.uint8) for j in range(4)])
    img = tmp_path / "packed_images.u8"
    img.write_bytes(data.tobytes())
    rows = [{"path": f"p{j}", "label": "empty", "_packed_idx": j} for j in (3, 1)]

    ds = PackedSquareDataset(rows, ["empty"], _to_tensor, (str(img), (4, SIDE, SIDE), None))

    assert ds.idx.tolist() == [[0, 3], [0, 1]]
    assert [int(ds[i][0].max()) for i in range(2)] == [21, 7]


def test_dataset_pickles_without_memmaps(paths):
    import pickle

    import torch

    from chesslab.training.torch_data import PackedSquareDataset

    rows = _pixel_pack(paths, "A", 2, base=20)
    ds = PackedSquareDataset(rows, ["empty"], _to_tensor, packs_mod.resolve_packs(rows, paths))
    first = ds[1][0]

    clone = pickle.loads(pickle.dumps(ds))

    assert clone.__getstate__()["_mm"] is None and clone.rows is None
    assert torch.equal(clone[1][0], first)


def test_resolve_dataset_packs_reads_the_yaml_key(paths):
    from chesslab.training.packs import resolve_dataset_packs

    rows = _pixel_pack(paths, "A", 3, base=5)
    dd = _pack_built_dataset(paths, "ds", rows)

    mp = resolve_dataset_packs("ds", paths, manifest_rows=rows)

    assert mp is not None and mp.n == 3
    assert [r["_pack_at"] for r in rows] == [(0, 0), (0, 1), (0, 2)]
    (dd / "dataset.yaml").write_text("classes: pieces13\n", encoding="utf-8")
    assert resolve_dataset_packs("ds", paths) is None


def test_load_packed_refuses_a_pack_built_dataset(paths):
    from chesslab.training.packs import load_packed

    rows = _pixel_pack(paths, "A", 2, base=1)
    _pack_built_dataset(paths, "ds", rows)

    with pytest.raises(ValueError, match="data/packs"):
        load_packed("ds", paths)
