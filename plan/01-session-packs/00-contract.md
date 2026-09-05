# Phase 00 — Contract: pack layout and the resolver

## Why

Three phases run in parallel and all need the same three things: where a pack lives, what its
meta says, and how a manifest row's `mm://` path becomes `(pack, index)`. Today that knowledge is
spread over `pack.py` (meta written at `:202-205`, read in `_load_packed` `:373-410`),
`synth_build._virtual_path` (`:36-38`) and `LabeledVideoPack.kt`. This phase lands ALONE and
first; 01–03 import it and never write to it.

**State of play:** an earlier version of this contract is already implemented on `feat/sp-00`
(`0731df2c`…`1f93efa2`, worktree `.claude/worktrees/sp-00`). Step 3 below reconciles that code
with THIS file; the diff is listed there. Do not start from scratch.

## Design (decided — do not redesign)

Layout. `<pack>` is the pack directory name AND the first `mm://` segment of every row —
`<session_id>-<W>` for Python-written packs, plain `<session_id>` for Kotlin ones:

```
data/packs/<pack>/
  packed_images.u8   # (N, H, W, 3) uint8 RGB, row i == manifest row i
  manifest.jsonl     # slice rows (labeling.py:541-563 keys), "path": "mm://<pack>/<frame>/<square>"
  packed_meta.json   # {"n","h","w","digest","paths":[...]} required; extra keys ignored
```

New file `src/chesslab/training/packs.py`:

```python
MM_PREFIX = "mm://"
DEFAULT_PACK_SIDE = 80          # the one crop side every default uses (01 CLI, 03 filter, 04 script)
PACKS_KEY = "packs"             # the dataset.yaml key: written by 03, read by 02

@dataclass(frozen=True)
class PackRef:
    name: str
    image: Path                      # packed_images.u8
    shape: tuple[int, int, int]      # (n, h, w)
    paths: list[str]                 # meta["paths"], memmap order

@dataclass(frozen=True)
class MultiPack:
    files: list[tuple[str, tuple[int, int, int]]]   # (image path str, (n, h, w)) per pack
    idx: np.ndarray                                 # int64 (len(rows), 2): [pack_no, row_no]
    @property
    def n(self) -> int: ...          # len(self.idx)
    def hw(self) -> tuple[int, int]  # (h, w), equal across files by construction

def pack_dir(name: str, paths: config.Paths = config.DATA) -> Path
def pack_name_of(mm_path: str) -> str
    # "mm://<pack>/…" -> "<pack>". ValueError when the prefix or the pack segment is missing.
def read_pack(name: str, paths: config.Paths = config.DATA, *, dir_: Path | None = None) -> PackRef
    # dir_ overrides pack_dir(name): Phase 01 validates a source directory BEFORE moving it.
    # Named read_pack, not load_pack: `load_packed` (pack.py) is one letter away and means a dataset.
    # FileNotFoundError (no meta / no image); ValueError on size != n*h*w*3, len(paths) != n,
    # or pack_name_of(paths[0]) != name (the naming invariant, entry.md) — message names both.
def list_packs(paths: config.Paths = config.DATA) -> list[PackRef]
    # every direct child of paths.packs that read_pack accepts, sorted by name; a child that
    # fails read_pack is skipped with log.warning(...) naming the reason (never raises).
def resolve_packs(rows: list[dict], paths: config.Paths = config.DATA) -> MultiPack
    # packs in first-seen order; every row["path"] must start with MM_PREFIX (ValueError);
    # KeyError names the first mm path absent from its pack; ValueError when two packs
    # disagree on (h, w), naming both packs and both sizes.
def write_meta(dir_: Path, rows: list[dict], h: int, w: int) -> None
    # writes EXACTLY {"n","h","w","digest","paths"} — no crop_fingerprint (entry.md: a pack has
    # no crop files); digest via training.pack._manifest_digest(rows); paths = [r["path"] …]
def packed_shape(packed) -> tuple[int, int, int]
    # (n, h, w) for BOTH a legacy (path, shape, path2idx) tuple and a MultiPack — the one
    # place that knows the union, so no caller unpacks positionally (02 uses it).
```

`config.Paths` gets `packs` → `self.root / "packs"`. Deliberately NOT in `all()`; the docstring
says why in one line, like `lens` (`config.py:320-325`): `ensure_dirs` would create an empty
`data/packs/` for everyone. No `MultiPack.__iter__` and no TypeError trick: `load_packed`
(Phase 02) refuses a pack-built dataset before any positional reader sees a `MultiPack`.

No memmap is opened here (Windows spawn: `pack.py:_load_packed` docstring `:355-359`).

## Steps

1. `feat(packs): Paths.packs and the pack layout contract` — `config.py`, `packs.py` with the
   types, `pack_dir`/`pack_name_of`/`load_pack`/`write_meta`/`packed_shape`.
2. `feat(packs): resolve_packs maps mm rows onto (pack, index)` — `resolve_packs`, tests.
3. `refactor(packs): reconcile with the reviewed contract` — on `feat/sp-00`, the delta between
   the code there and this file: rename `load_pack` → `read_pack` (keep `dir_=`, rename the
   `dir` parameter of `write_meta` to `dir_`); delete `MultiPack.__iter__`; `write_meta` drops
   `crop_fingerprint`; add `DEFAULT_PACK_SIDE`, `PACKS_KEY`, `packed_shape`, `list_packs`;
   reword the `Paths.packs` docstring; rename/rewrite the two tests named below; add the two
   new tests. Commit message body lists each item.

## Tests — `tests/test_packs.py` (new)

Fixture: `paths = config.Paths(root=tmp_path)`; a helper writes a fake pack (meta + zero file of
the right size) — mirror `tests/test_pack.py:_make_dataset` (`:23`).

- `test_pack_name_of_rejects_file_paths` — `data/crops/x.webp` → ValueError; synth's
  `mm://name/sid/frame_square.png` resolves to `name` (4 segments are fine).
- `test_load_pack_refuses_a_short_image` — size − 1 byte → ValueError.
- `test_load_pack_refuses_a_name_the_rows_disagree_with` — dir `a-80`, rows `mm://b/…`
  → ValueError naming both.
- `test_resolve_packs_orders_packs_by_first_sight` — rows from B, A, B → files `[B, A]`,
  idx rows `[0,i],[1,j],[0,k]`.
- `test_resolve_packs_refuses_mixed_crop_sizes` — 80 and 96 → ValueError.
- `test_resolve_packs_names_the_missing_row` — KeyError message contains the mm path.
- `test_packed_shape_reads_both_forms` — legacy tuple and MultiPack give the same `(n, h, w)`.
- `test_list_packs_skips_a_broken_dir_and_keeps_the_rest` — two valid packs and one with a
  truncated image → two `PackRef`s, sorted by name.
- `test_write_meta_writes_exactly_the_five_keys` — `set(json.load(...)) == {"n","h","w","digest","paths"}`.

Command (from the worktree, see entry.md): `PYTHONPATH=src <root>/.venv/Scripts/python.exe -m pytest -q tests/test_packs.py`.

## Acceptance

- `grep -n "def packs" src/chesslab/config.py` hits once; `Paths(root=tmp).packs == tmp/"packs"`;
  `grep -n "self.packs" src/chesslab/config.py` hits 0 (not in `all()`).
- `tests/test_packs.py` → 9 passed, and `grep -c "def test_" tests/test_packs.py` → 9 with
  exactly the nine names above (`grep -n "__iter__\|tuple_unpacking" src/chesslab/training/packs.py tests/test_packs.py` → 0).
- `uv run ruff check src/chesslab/training/packs.py src/chesslab/config.py tests/test_packs.py` clean.
- `packs.py` ≤ 160 lines, no function opens a memmap
  (`grep -n "memmap" src/chesslab/training/packs.py` hits 0).

## Do NOT

- Do not touch `pack.py`, `torch_data.py`, `dataset_build.py`, `labeling.py`, `cli.py`.
- Do not write a pack (Phase 01) or read one into a Dataset (Phase 02).
