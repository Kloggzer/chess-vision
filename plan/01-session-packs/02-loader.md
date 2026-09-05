# Phase 02 — Loader: many memmaps in one Dataset

## Why

`PackedSquareDataset`/`PackedBoardDataset` (`torch_data.py:560`, `:642`) hold exactly one
`(path, shape, path2idx)`. `load_packed` (`pack.py:332`) resolves one dataset directory. A dataset
whose rows point into several packs needs one memmap per pack, opened lazily per worker.

## Design (decided — do not redesign)

`packed` argument becomes a union; the legacy tuple stays for every existing dataset:

```python
# torch_data.py
PackedArg = tuple[str, tuple[int, int, int], dict | None] | MultiPack   # MultiPack from training.packs

class PackedSquareDataset(Dataset):
    def __init__(self, rows, classes, transform, packed: PackedArg, ...):
        # legacy: self._files = [(path, shape)], idx (N,) → stored as (N,2) with pack_no 0
        # MultiPack: self._files = packed.files, self.idx = packed.idx  (already (N,2))
        self._mm: list | None = None
    def _memmap(self, pack_no: int):      # opens self._files[pack_no] lazily, caches per worker
    def __getitem__(self, i): p, j = self.idx[i]; arr = np.array(self._memmap(p)[j]); ...
```

Same for `PackedBoardDataset` (`idx` becomes `(boards, 64, 2)`). `__getstate__` keeps dropping
`_mm` and `rows`. The donor pool (`donors`) stores `(pack_no, row_no)` pairs. One helper
`_pack_index(rows, packed) -> (files, idx)` serves both classes.

`pack.py:load_packed(name, paths, manifest_rows)`:

```python
# before the packed_meta lookup:
cfg = dataset_dir(name, paths) / "dataset.yaml"
if cfg.exists() and yaml.safe_load(cfg.read_text(encoding="utf-8")).get("packs"):   # key written by Phase 03
    rows = manifest_rows if manifest_rows is not None else _manifest_rows(dd)
    return resolve_packs(rows, paths)          # MultiPack; KeyError/ValueError propagate — never None
```

Legacy path unchanged. `train.py:_require_pack` accepts a `MultiPack` (it only sees
`packed is None`); `evaluate.py:149-168` needs no change beyond the union type — verify by test.
`open_packed_memmap` (`pack.py:514`) is reused per file, so `_PreadRows` keeps working per pack.

## Steps

1. `feat(loader): PackedSquareDataset and PackedBoardDataset read from a MultiPack`.
2. `feat(loader): load_packed resolves a pack-built dataset to its packs`.

## Tests — append to `tests/test_packs.py` (Phase 00 owns the file; append below its tests)

Fixture: two fake packs with REAL pixels (write small `(n,4,4,3)` arrays), rows across both.

- `test_square_dataset_serves_pixels_from_the_right_pack` — a row from pack B returns B's bytes.
- `test_board_dataset_groups_64_cells_across_packs` — 64 rows of one frame split over two packs
  come back as one `(64, C, H, W)` item in `a1..h8` order.
- `test_legacy_tuple_still_works` — the existing `(path, shape, None)` + `_packed_idx` path.
- `test_dataset_pickles_without_memmaps` — `pickle.dumps(ds)` after one `__getitem__`; the
  unpickled copy serves the same item (Windows spawn contract).
- `test_load_packed_returns_a_multipack_for_a_pack_built_dataset` — `dataset.yaml` with `packs:`.

Commands: `uv run pytest -q tests/test_packs.py`; also `uv run pytest -q tests/test_pack.py`
(legacy contract, must stay green with its count unchanged).

## Acceptance

- Both commands green; `tests/test_pack.py` count unchanged.
- `grep -n 'path2idx\[r\["path"\]\]' src/chesslab/training/torch_data.py` hits 0 (index
  resolution lives in `_pack_index`, used by both datasets).
- `uv run ruff check src/chesslab/training/torch_data.py src/chesslab/training/pack.py` clean.

## Do NOT

- Do not write packs (01), do not touch `dataset_build.py` or `cli.py` (03).
- Do not change transforms, augmentation, `board_collate` or the `_PreadRows` heuristic.
