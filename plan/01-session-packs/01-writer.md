# Phase 01 — Writer: `chesslab session pack` and `chesslab pack import`

## Why

The only way from a session to training crops is `chesslab slice` → 128 px pool →
`dataset pack` → resize to 80 (two resamples, `docs/data-pipeline.md` §3.1). A session pack cuts
ONCE from the board store at the model size. Kotlin already writes the target format
(`LabeledVideoPack.kt`), but nothing in Python registers those directories.

## Design (decided — do not redesign)

**Seam in `labeling.py`.** `slice_session` (`labeling.py:589-621`) is the pool wrapper; the loop
that builds every crop and its row is `_slice_session` (`labeling.py:380-587`; row dict at
541-563; `_write_crop` defined at :299, submitted at :538). Split `_slice_session`:

```python
def iter_session_crops(session_dir: Path, *, profile, pad_up=None, pad_side=None,
                       out_size=None, flat_field=False) -> Iterator[tuple[np.ndarray, dict]]
    # yields (crop BGR HxWx3 uint8, row) — the SAME selection and rows slice_session produces,
    # with row["path"] = "" (the consumer sets it). Frame/cell gating, matte coverage, pads: unchanged.
```

`_slice_session` becomes the file-writing consumer of `iter_session_crops` (sets `path` to the
webp path, keeps `write_pool`, `manifest_batch`). Byte-identical output is a test below.

**Writer in a NEW file `src/chesslab/training/pack_writer.py`** (imports `packs.write_meta`,
`packs.load_pack`, `packs.pack_dir`, `packs.pack_name_of`; `packs.py` itself is frozen):

```python
def write_session_pack(session_id: str, size: int, *, paths=config.DATA, profile=None,
                       pad_side: float | None = None, pad_up: float | None = None) -> dict
    # pack name f"{session_id}-{size}"; refuses an existing dir (ValueError) — a pack is immutable;
    # writes packed_images.u8.partial first (Kotlin does the same), converts BGR→RGB, then
    # manifest.jsonl (path = f"mm://{pack}/{frame}/{square}"), then write_meta, then renames.
    # returns {"pack", "n", "h", "w", "gb"}
def import_pack(src: Path, *, paths=config.DATA) -> dict
    # name = pack_name_of(first manifest row path) (entry.md invariant); load_pack(name, dir=src)
    # validates the SOURCE, then shutil.move to pack_dir(name); refuses an existing target.
    # Kotlin `labeled-video-pack`/`turntable-pack` output — their `id=` option is the pack name.
```

Session lookup: `chesslab.sessions.session_dir`, imported in `labeling.py:675` as `_resolve` — use
the same import. Profile: the same default as `slice` (`labeling.py:54-65`, `ingestion_profile`).

**CLI (`cli.py`, `session_app`, next to `@session_app.command("boards")` at line 253):**

```
chesslab session pack --session <id> --size 80 [--pad-side x] [--pad-up y]
chesslab pack import <dir>                        # new top-level group `pack_app`
```

Both print `[OK] pack <name>: N crops, HxW, G GB` or `[FAIL] <reason>` + exit 1 like
`dataset pack` (`cli.py:1414-1450`).

Heavy-compute: the writer runs single-process (crops are cheap; the board store is already
warped). No `multiprocessing.Pool`.

## Steps

1. `refactor(labeling): iter_session_crops separates cutting from writing` + parity test.
2. `feat(packs): write_session_pack cuts a session once at model size`.
3. `feat(packs): import_pack registers a Kotlin memmap under data/packs`.
4. `feat(cli): session pack and pack import`.

## Tests — `tests/test_session_pack.py` (new)

Session fixture: run `grep -ln "slice_session" tests/*.py`; take the FIRST file in that list that
builds a session directory under `tmp_path` and import its builder. If none builds one, write
`_tiny_session(tmp_path)` in the new test file: one straightened board webp and one `log.jsonl`
row with `fen`, `corners`, `board`, `board_size`, `board_border`, `board_straightened: true`
(the keys `labeling.py:440-470` reads).

- `test_slice_output_is_byte_identical_after_the_seam` — measure sha256 of every webp and of
  `manifest.jsonl` on the fixture BEFORE step 1 (on `main`), pin them in the test, record the
  hashes in `STATUS.md`; after the seam they must match.
- `test_session_pack_rows_match_slice_rows` — same session: row keys/labels/frames/squares equal,
  only `path` and `out_size` differ.
- `test_session_pack_is_rgb` — a crop with a known BGR pixel lands as RGB in the memmap.
- `test_session_pack_refuses_to_overwrite`.
- `test_import_pack_moves_a_valid_dir_and_refuses_a_short_one`.

Command: `uv run pytest -q tests/test_session_pack.py`.

## Acceptance

- `uv run pytest -q tests/test_session_pack.py` → 5 passed; the slice tests found by the grep
  above still pass (`uv run pytest -q <those files>`).
- `chesslab session pack --help` and `chesslab pack import --help` render.
- `grep -c "_write_crop(" src/chesslab/labeling.py` → 2 (the definition and the one submit in `_slice_session`).
- `grep -c "def write_session_pack\|def import_pack" src/chesslab/training/pack_writer.py` → 2;
  `git diff --stat main -- src/chesslab/training/packs.py` prints nothing.

## Do NOT

- Do not change the selection rules, pads, matte handling or the pool format.
- Do not read packs into a Dataset (02) or build datasets from them (03).
