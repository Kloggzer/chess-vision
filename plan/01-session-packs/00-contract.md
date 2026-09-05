# Phase 00 — Contract: pack layout and the resolver

## Why

Three phases run in parallel and all need the same three things: where a pack lives, what its
meta says, and how a manifest row's `mm://` path becomes `(pack, index)`. Today that knowledge is
spread over `training/pack.py:202-205` (meta writer), `synth_build._virtual_path` (:36-38) and
`LabeledVideoPack.kt:219-225`.
This phase lands ALONE and first; 01–03 import it.

## Design (decided — do not redesign)

Layout (the Kotlin `labeled-video-pack` output is a valid pack when its `id=` equals the dir name):

```
data/packs/<pack>/            # <pack> == first mm:// segment of every row; Python writes "<session_id>-<W>"
  packed_images.u8            # (N, H, W, 3) uint8 RGB, row i == manifest row i
  manifest.jsonl              # slice rows (labeling.py:541-563 keys) with "path": "mm://<pack>/<frame>/<square>"
  packed_meta.json            # REQUIRED keys: n, h, w, digest, paths (pack.py:202-205 writes them plus crop_fingerprint)
```

Optional meta keys (Kotlin adds `source`, `session_id`, …) are ignored. `write_meta` emits the five
required keys plus `"crop_fingerprint": {}` so `pack.py:_rewritten_since_pack` treats it as a
fingerprinted pack.

New file `src/chesslab/training/packs.py`:

```python
MM_PREFIX = "mm://"

@dataclass(frozen=True)
class PackRef:
    name: str
    image: Path                      # packed_images.u8
    shape: tuple[int, int, int]      # (n, h, w)
    paths: list[str]                 # meta["paths"], memmap order

@dataclass(frozen=True)
class MultiPack:
    files: list[tuple[str, tuple[int, int, int]]]   # (image path str, shape), one per pack
    idx: np.ndarray                                 # int64 (len(rows), 2): [pack_no, row_no]
    @property
    def n(self) -> int                              # len(idx)
    def hw(self) -> tuple[int, int]
    def __iter__(self):                             # raise TypeError("dataset is built from session packs — "
                                                    #   "read MultiPack.files/idx, not a (path, shape, path2idx) tuple")

def pack_dir(name: str, paths: config.Paths = config.DATA) -> Path
def pack_name_of(mm_path: str) -> str            # "mm://<pack>/…" -> "<pack>"; ValueError otherwise
def load_pack(name: str, paths: config.Paths = config.DATA, *, dir: Path | None = None) -> PackRef
    # dir overrides pack_dir(name) (Phase 01 validates a source dir before moving it)
    # raises FileNotFoundError (no meta / no image), ValueError (size != n*h*w*3, len(paths) != n,
    # or a paths entry whose pack_name_of() != name — the invariant from entry.md)
def resolve_packs(rows: list[dict], paths: config.Paths = config.DATA) -> MultiPack
    # packs in first-seen order; KeyError names the first mm path absent from its pack;
    # ValueError when two packs disagree on (h, w); every row["path"] must start with MM_PREFIX
def write_meta(dir: Path, rows: list[dict], h: int, w: int) -> None
    # digest via training.pack._manifest_digest(rows); paths = [r["path"] for r in rows]
```

`config.Paths` gets `packs` → `self.root / "packs"`, docstring one line, NOT added to `all()`
(`config.py:412-413` keeps `datasets`/`models` out for the same reason; see `lens` :321-325).
`MultiPack.__iter__` exists because 11 `scripts/*.py` and `gradcam.py` unpack `load_packed`'s
legacy tuple positionally; a clear message beats `cannot unpack non-iterable`.
No memmap is opened here (Windows spawn: `pack.py:_load_packed` docstring).

## Steps

1. `feat(packs): Paths.packs and the pack layout contract` — `config.py`, `packs.py` with the
   types and `pack_dir`/`pack_name_of`/`load_pack`/`write_meta`.
2. `feat(packs): resolve_packs maps mm rows onto (pack, index)` — `resolve_packs`, tests.

## Tests — `tests/test_packs.py` (new)

Fixture: `paths = config.Paths(root=tmp_path)`; helper writes a fake pack (meta + zero file of
the right size) — mirror `tests/test_pack.py:_make_dataset`.

- `test_pack_name_of_rejects_file_paths` — `data/crops/x.webp` → ValueError; synth's
  `mm://name/sid/frame_square.png` resolves to `name` (4 segments are fine).
- `test_load_pack_refuses_a_short_image` — size − 1 byte → ValueError.
- `test_resolve_packs_orders_packs_by_first_sight` — rows from B, A, B → files `[B, A]`,
  idx rows `[0,i],[1,j],[0,k]`.
- `test_resolve_packs_refuses_mixed_crop_sizes` — 80 and 96 → ValueError.
- `test_resolve_packs_names_the_missing_row` — KeyError message contains the mm path.
- `test_load_pack_refuses_a_row_from_another_pack` — a paths entry `mm://other/…` → ValueError.
- `test_multipack_refuses_tuple_unpacking` — `a, b, c = MultiPack(...)` → TypeError, message names packs.

Command: `uv run pytest -q tests/test_packs.py`.

## Acceptance

- `grep -n "def packs" src/chesslab/config.py` hits once; `Paths(root=tmp).packs == tmp/"packs"`.
- `uv run pytest -q tests/test_packs.py` → 7 passed.
- `uv run ruff check src/chesslab/training/packs.py src/chesslab/config.py tests/test_packs.py` clean.
- `packs.py` ≤ 140 lines; `grep -c "np.memmap" src/chesslab/training/packs.py` → 0.

## Do NOT

- Do not touch `pack.py`, `torch_data.py`, `dataset_build.py`, `labeling.py`, `cli.py`.
- Do not write a pack (Phase 01) or read one into a Dataset (Phase 02).
