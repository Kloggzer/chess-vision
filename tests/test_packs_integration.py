"""The seam: `dataset build --from-packs` writes `packs:`, the loader reads real pixels back."""

from __future__ import annotations

import numpy as np

from chesslab import config, dataset_build
from chesslab.dataset import load_manifest, load_split
from chesslab.training import pack_session, packs
from chesslab.training.data import filter_rows_by_split
from chesslab.training.packs import resolve_dataset_packs
from conftest import write_jsonl

SIDE = 8
CELLS = (("wP", "0000", "e2"), ("wK", "0001", "e1"), ("empty", "0002", "c4"))


def _pixels(pack_no: int, row_no: int) -> np.ndarray:
    """A crop nothing else can produce: every channel keyed to the pack and the row."""
    a = np.zeros((SIDE, SIDE, 3), dtype=np.uint8)
    a[:, :, 0] = 10 * pack_no + 1
    a[:, :, 1] = 20 * row_no + 2
    a[:, :, 2] = 3
    return a


def _write_pack(paths: config.Paths, name: str, sid: str, pack_no: int) -> list[dict]:
    d = paths.packs / name
    d.mkdir(parents=True)
    rows = [{"path": f"mm://{name}/{frame}/{square}", "label": label, "session_id": sid,
             "frame": frame, "ply": int(frame), "square": square, "square_color": "light",
             "fen": "x", "out_size": [SIDE, SIDE], "coverage": 0.0}
            for label, frame, square in CELLS]
    write_jsonl(d / "manifest.jsonl", rows)
    pack_session.write_meta(d, rows, SIDE, SIDE)
    (d / packs._IMAGE).write_bytes(
        b"".join(_pixels(pack_no, i).tobytes() for i in range(len(rows))))
    return rows


def test_build_from_packs_resolves_back_to_the_packs_pixels(tmp_path):
    paths = config.Paths(root=tmp_path)
    _write_pack(paths, "s1-8", "s1", 0)
    _write_pack(paths, "s2-8", "s2", 1)

    dataset_build.build_dataset("seam", ["s1", "s2"], rotations=(0,), phash_enabled=False,
                                val_frac=0.0, test_frac=0.0, paths=paths, pack_size=(SIDE, SIDE),
                                allow_degenerate=True, from_packs=True)

    dd = paths.datasets / "seam"
    rows = load_manifest(dd / "manifest.jsonl")
    mp = resolve_dataset_packs("seam", paths, manifest_rows=rows)
    assert mp is not None and mp.n == len(rows) == 6 and mp.hw() == (SIDE, SIDE)
    assert sorted(map(tuple, mp.idx.tolist())) == [(p, r) for p in (0, 1) for r in range(3)]

    from chesslab.training.torch_data import PackedSquareDataset

    train = filter_rows_by_split(rows, load_split(dd / "split.json"), "train")
    assert train, "the build put nothing in train"
    ds = PackedSquareDataset(train, ["empty", "wP", "wK"], np.asarray, mp)
    # The expectation comes from the row's OWN pack, not from `_pack_at`: the MultiPack numbers
    # packs in first-seen manifest order, which need not be the order they were written in.
    keyed = {"s1-8": 0, "s2-8": 1}
    for i, row in enumerate(train):
        want = _pixels(keyed[packs.pack_name_of(row["path"])], row["_pack_at"][1])
        assert np.array_equal(ds[i][0], want), row["path"]


def test_resolve_dataset_packs_ignores_a_classic_dataset(tmp_path):
    paths = config.Paths(root=tmp_path)
    dd = paths.datasets / "classic"
    dd.mkdir(parents=True)
    (dd / "dataset.yaml").write_text("session_ids: [s1]\n", encoding="utf-8")
    assert resolve_dataset_packs("classic", paths, manifest_rows=[]) is None
