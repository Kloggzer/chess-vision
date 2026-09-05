# Phase 01 — Writer: `chesslab session pack` and `chesslab pack import`

## Why

The only way from a session to training crops is `chesslab slice` → 128 px pool →
`dataset pack` → resize to 80 (two resamples, `docs/data-pipeline.md` §3.1). A session pack cuts
ONCE from the board store at the model size. Kotlin already writes the target format
(`LabeledVideoPack.kt`), but nothing in Python registers those directories.

## Design (decided — do not redesign)

**Seam in `labeling.py`.** The crop loop is in `_slice_session` (`labeling.py:380-587`), NOT in
the public `slice_session` (`:589-621`, a pool wrapper that delegates). The loop builds the crop
(`:531`), submits `_write_crop` (`:538`, defined `:299`) and builds the row (`:541-559`, plus the
optional `coverage` key `:560-563`). Split it:

```python
def iter_session_crops(session_dir: Path, *, profile, pad_up=None, pad_side=None,
                       out_size=None, flat_field=False) -> Iterator[tuple[np.ndarray, dict]]
    # yields (crop BGR HxWx3 uint8, row) — the SAME selection and rows _slice_session produces,
    # with row["path"] = "" (the consumer sets it). Frame/cell gating, corrections, matte
    # coverage, mesh/straighten handling and pads: unchanged, moved verbatim.
```

`_slice_session` becomes the file-writing consumer of `iter_session_crops`: it sets `path` to the
webp path, keeps `write_pool`/`_write_crop`, the audit block (`:569-576`) and
`manifest_batch`/`_replace_session_in_manifest` (`:579-581`). `slice_session` is untouched.
Byte-identical output is a test below.

**Writer — new module `src/chesslab/training/pack_session.py`** (`packs.py` is frozen after 00):

```python
def write_session_pack(session_id: str, size: int, *, paths=config.DATA, profile: str | None = None,
                       pad_side: float | None = None, pad_up: float | None = None) -> dict
    # pack name f"{session_id}-{size}"; refuses an existing dir (ValueError) — a pack is immutable.
    # Writes packed_images.u8.partial first (Kotlin does the same, LabeledVideoPack.kt:147),
    # converts BGR->RGB, then manifest.jsonl (path = f"mm://{pack}/{frame}/{square}"), then
    # packs.write_meta, then renames. Returns {"pack", "n", "h", "w", "gb"}.
def import_pack(src: Path, *, paths=config.DATA) -> dict
    # Target name = packs.pack_name_of(first manifest row) — the naming invariant (entry.md),
    # so a Kotlin pack keeps its plain <session_id>. Validates the SOURCE dir with
    # packs.load_pack semantics, then shutil.move under paths.packs; refuses an existing target.
    # Returns {"pack", "n", "h", "w", "gb"}.
```

Session lookup and profile, exactly as `run_slice` does it (`labeling.py:675`, `:686-688`):

```python
from ..sessions import session_dir            # -> (Path, archived: bool), sessions.py:464
session_path, _ = session_dir(session_id, paths)
meta = read_session_meta(session_path)
prof = _profile_for_session(meta, profile)    # labeling.py:48
```

**CLI (`cli.py`, next to `@session_app.command("boards")` at `:253`):**

```
chesslab session pack --session <id> --size 80 [--pad-side x] [--pad-up y]
chesslab pack import <dir>                       # new top-level group `pack_app`
```

Register `pack_app` beside the existing `app.add_typer(...)` calls. Both commands print
`[OK] pack <name>: N crops, HxW, G GB` or `[FAIL] <reason>` + `raise typer.Exit(1)`, exactly the
shape `dataset_pack_cmd` uses (`cli.py:1444-1449`).

Heavy-compute: the writer runs single-process (crops are cheap; the board store is already
warped). No `multiprocessing.Pool`.

## Steps

1. `refactor(labeling): iter_session_crops separates cutting from writing` + parity test.
2. `feat(packs): write_session_pack cuts a session once at model size`.
3. `feat(packs): import_pack registers a Kotlin memmap under data/packs`.
4. `feat(cli): session pack and pack import`.

## Tests — `tests/test_session_pack.py` (new)

Fixture: copy `_make_session` / `_identity_profile` / `_frame_with_markers` from
`tests/test_labeling.py` (`:145`, `:159`, `:171`) into the new file. Copy, do not import —
`tests/test_labeling.py` belongs to no phase and stays untouched.

- `test_slice_output_is_byte_identical_after_the_seam` — on `main`, BEFORE step 1, run the fixture
  and record sha256 of every webp and of `manifest.jsonl` minus the `ts` field (it is
  `datetime.now`, `labeling.py:558`); pin those hashes in the test and in `STATUS.md` → Notes.
  After the seam they must match.
- `test_session_pack_rows_match_slice_rows` — same session: the `(frame, square, label)` set and
  the `pad_side`/`pad_up` values are equal; only `path` and `out_size` differ.
- `test_session_pack_is_rgb` — a crop with a known BGR pixel lands as RGB in the memmap.
- `test_session_pack_refuses_to_overwrite`.
- `test_import_pack_keeps_the_kotlin_name_and_refuses_a_short_one` — a source dir whose rows say
  `mm://sid/…` lands at `data/packs/sid`; a truncated image raises ValueError.

Command: `uv run pytest -q tests/test_session_pack.py`.

## Acceptance

- `uv run pytest -q tests/test_session_pack.py` → 5 passed.
- `uv run pytest -q tests/test_labeling.py tests/test_matte.py tests/test_corrections.py
  tests/test_labeling_dirty.py tests/test_labeling_settle.py` still green, counts unchanged.
- `uv run chesslab session pack --help` and `uv run chesslab pack import --help` render.
- `grep -n "_write_crop" src/chesslab/labeling.py` hits exactly twice: the definition (`:299`)
  and the one submit inside `_slice_session` — none inside `iter_session_crops`.

## Do NOT

- Do not change the selection rules, pads, matte handling or the pool format.
- Do not edit `training/packs.py`, do not read packs into a Dataset (02) or build datasets
  from them (03).
