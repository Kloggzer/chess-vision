# Phase 02 — Loader: many memmaps in one Dataset

## Why

`PackedSquareDataset`/`PackedBoardDataset` (`torch_data.py:560`, `:642`) hold exactly one
`(path, shape, path2idx)`. A dataset whose rows point into several packs needs one memmap per
pack, opened lazily per worker.

`load_packed` (`pack.py:332`) returns that bare 3-tuple, and **ten call sites unpack it
positionally** — `train.py:510`, `gradcam.py:39`, and `scripts/{audit_montage:45,
audit_sessions:42, fix_ply_offset:70, fold_per_session:32, mine_hard_coverage:40,
mine_hard_empty:92, scan_ply_offset:60, session_colour:28}`. Widening its return type in place
would break all ten silently. So `load_packed` keeps its contract and gains a refusal; the pack
path gets its own entry point.

## Design (decided — do not redesign)

**1. `pack.py` — a second entry point, and one honest refusal.**

```python
def resolve_dataset_packs(name: str, paths: config.Paths = config.DATA,
                          manifest_rows: list[dict] | None = None) -> MultiPack | None:
    """None for a classic dataset; a MultiPack when dataset.yaml carries `packs:` (Phase 03)."""
    from .packs import PACKS_KEY, resolve_packs   # local import: packs.py imports pack.py at module level
    dd = dataset_dir(name, paths)
    cfg = dd / "dataset.yaml"
    if not (cfg.exists() and (yaml.safe_load(cfg.read_text(encoding="utf-8")) or {}).get(PACKS_KEY)):
        return None
    rows = manifest_rows if manifest_rows is not None else _manifest_rows(dd)
    return resolve_packs(rows, paths)        # KeyError/ValueError propagate — never None
```

In `load_packed` (`:332`), before the `measure(...)` block: if `resolve_dataset_packs` would
return a MultiPack, raise
`ValueError("dataset '<name>' is built from session packs — its pixels live in data/packs/…; "
"use training.pack.resolve_dataset_packs (train/eval do)")`.
That turns the ten positional unpackers into one clear error instead of a `TypeError` or a
wrong "fused synth build" message. `_load_packed` and the legacy path are unchanged.

**2. `torch_data.py` — the `packed` argument becomes a union.**

```python
PackedArg = tuple[str, tuple[int, int, int], dict | None] | MultiPack   # MultiPack from .packs

def _pack_index(rows, packed: PackedArg) -> tuple[list[tuple[str, tuple[int, int, int]]], np.ndarray]:
    """(files, idx) for both forms. Legacy: files=[(path, shape)], idx (N,2) with pack_no 0,
    row_no from r["_packed_idx"] or path2idx[r["path"]] — the ONE place that resolution lives."""

class PackedSquareDataset(Dataset):
    def __init__(self, rows, classes, transform, packed: PackedArg, ...):
        self._files, self.idx = _pack_index(rows, packed)
        self._mm: list | None = None
    def _memmap(self, pack_no: int):   # opens self._files[pack_no] via open_packed_memmap
                                       # (pack.py:514), caches per worker in self._mm
    def __getitem__(self, i): p, j = self.idx[i]; arr = np.array(self._memmap(p)[j]); ...
```

Same for `PackedBoardDataset` (`idx` becomes `(boards, 64, 2)`; it calls the same `_pack_index`
then groups). `__getstate__` (`:597`, `:681`) keeps dropping `_mm` and `rows`. The donor pool
(`self.donors`, `:593`) stores `(pack_no, row_no)` pairs. `_PreadRows` (`:456`) and
`open_packed_memmap` are reused per file, so the pread heuristic keeps working per pack.

**3. `train.py`** — `_load_training_pack` (`:43-49`) tries `resolve_dataset_packs(dataset,
manifest_rows=...)` first and falls back to `load_packed`. The print at `:510-511`
(`n, h, w = packed[1]`) becomes `n, h, w = packs.packed_shape(packed)` (Phase 00). The
`fused` branch (`:479-483`) keeps its logic but its message must name both causes ("a fused
synth build or a pack-built dataset"). `_require_pack` (`:52`) is untouched — it only runs on
the `packed is None` arm.

**4. `evaluate.py`** — `:149-150` calls `resolve_dataset_packs` first, then `load_packed`; the
message at `:169-172` gets the same both-causes wording. Nothing else changes; `:165`/`:168`
pass `packed` straight into the datasets.

Out of scope, by `entry.md` → Known non-goal: `gradcam.py` and the eight scripts stay unchanged
and now fail with the message from step 1.

## Steps

1. `feat(loader): PackedSquareDataset and PackedBoardDataset read from a MultiPack`.
2. `feat(pack): resolve_dataset_packs, and load_packed refuses a pack-built dataset`.
3. `feat(train): train and eval resolve a pack-built dataset to its packs`.

## Tests — append to `tests/test_packs.py` (Phase 00 owns the file; append below its tests)

Fixture: two fake packs with REAL pixels (small `(n,4,4,3)` arrays), rows across both.

- `test_square_dataset_serves_pixels_from_the_right_pack` — a row from pack B returns B's bytes.
- `test_board_dataset_groups_64_cells_across_packs` — 64 rows of one frame split over two packs
  come back as one `(64, C, H, W)` item in `a1..h8` order.
- `test_legacy_tuple_still_works` — the existing `(path, shape, None)` + `_packed_idx` path.
- `test_dataset_pickles_without_memmaps` — `pickle.dumps(ds)` after one `__getitem__`; the
  unpickled copy serves the same item (Windows spawn contract).
- `test_resolve_dataset_packs_reads_the_yaml_key` — `dataset.yaml` with `packs:` → MultiPack;
  without it → None.
- `test_load_packed_refuses_a_pack_built_dataset` — ValueError whose message contains
  `data/packs`, so the ten positional callers get a readable failure.

Commands (from the worktree, entry.md): `PYTHONPATH=src <root>/.venv/Scripts/python.exe -m pytest -q
tests/test_packs.py`, then the same for `tests/test_pack.py` and `tests/test_synth_build.py`
(legacy contract, counts unchanged). The 02↔03 seam (`PACKS_KEY` written by a real
`build_dataset`, read by `resolve_dataset_packs`) is tested by Phase 04's
`tests/test_packs_integration.py`, not here.

## Acceptance

- All three commands green; `tests/test_pack.py` and `tests/test_synth_build.py` counts unchanged.
- `grep -n 'path2idx\[r\["path"\]\]' src/chesslab/training/torch_data.py` hits exactly once
  (inside `_pack_index`) — it hits twice today (`:580`, `:671`).
- `grep -n "packed\[1\]" src/chesslab/training/train.py` hits 0.
- `uv run ruff check src/chesslab/training/torch_data.py src/chesslab/training/pack.py
  src/chesslab/training/train.py src/chesslab/training/evaluate.py` clean.

## Do NOT

- Do not write packs (01), do not touch `dataset_build.py` or `cli.py` (03), do not edit
  `training/packs.py` (frozen after 00) or the `pack_dataset` head (03 owns `pack.py:160-170`).
- Do not change transforms, augmentation, `board_collate` or the `_PreadRows` heuristic.
- Do not "fix" `gradcam.py` or `scripts/*.py`.
