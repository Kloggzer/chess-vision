# Phase 00 — Contract: pack layout and the resolver

## Why

Three phases run in parallel and all need the same three things: where a pack lives, what its
meta says, and how a manifest row's `mm://` path becomes `(pack, index)`. Today that knowledge is
spread over `training/pack.py:_packed_paths`, `synth_build.mm_path` and `LabeledVideoPack.kt`.
This phase lands ALONE and first; 01–03 import it.

## Design (decided — do not redesign)

Layout, identical to what `LabeledVideoPack.kt` writes today:

```
data/packs/<pack>/            # <pack> = "<session_id>-<W>", e.g. rg-2026-08-08-11-59-12-80
  packed_images.u8            # (N, H, W, 3) uint8 RGB, row i == manifest row i
  manifest.jsonl              # slice rows (labeling.py:536-566 keys) with "path": "mm://<pack>/<frame>/<square>"
  packed_meta.json            # {"n","h","w","digest","crop_fingerprint":{},"paths":[...]} — pack.py:_packed_paths keys
```

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
    def hw(self) -> tuple[int, int]

def pack_dir(name: str, paths: config.Paths = config.DATA) -> Path
def pack_name_of(mm_path: str) -> str            # "mm://<pack>/…" -> "<pack>"; ValueError otherwise
def load_pack(name: str, paths: config.Paths = config.DATA) -> PackRef
    # raises FileNotFoundError (no meta / no image), ValueError (size != n*h*w*3, len(paths) != n)
def resolve_packs(rows: list[dict], paths: config.Paths = config.DATA) -> MultiPack
    # packs in first-seen order; KeyError names the first mm path absent from its pack;
    # ValueError when two packs disagree on (h, w); every row["path"] must start with MM_PREFIX
def write_meta(dir: Path, rows: list[dict], h: int, w: int) -> None
    # digest via training.pack._manifest_digest(rows); paths = [r["path"] for r in rows]
```

`config.Paths` gets `packs` → `self.root / "packs"`, docstring one line, added to `all()`.
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

Command: `uv run pytest -q tests/test_packs.py`.

## Acceptance

- `grep -n "def packs" src/chesslab/config.py` hits once; `Paths(root=tmp).packs == tmp/"packs"`.
- `uv run pytest -q tests/test_packs.py` → 5 passed.
- `uv run ruff check src/chesslab/training/packs.py src/chesslab/config.py tests/test_packs.py` clean.
- `packs.py` ≤ 120 lines, no function opens a memmap.

## Do NOT

- Do not touch `pack.py`, `torch_data.py`, `dataset_build.py`, `labeling.py`, `cli.py`.
- Do not write a pack (Phase 01) or read one into a Dataset (Phase 02).
