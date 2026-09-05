# Phase 03 — Builder: `dataset build --from-packs`

## Why

`build_dataset` (`dataset_build.py:364`) reads crop-pool manifests and ends by calling
`pack_dataset` (`:564-569`), which decodes files. A pack-built dataset has no files: its rows
already carry `mm://` paths, and its "pack" is the list of packs they come from.

## Design (decided — do not redesign)

`build_dataset(..., from_packs: bool = False)` (the existing `pack_size` argument selects the
pack size, default `(80, 80)` when `from_packs`):

- `from_packs=True`: sources are `paths.packs/<pack>/manifest.jsonl` for every pack whose
  `session_id` (first row) is in `session_ids` AND whose `(h, w)` equals `pack_size`;
  a session with no pack of that size → `ValueError` naming the session and the
  `chesslab session pack --session <id> --size <W>` command that makes one. The pool lock check
  (`:450-455`) is skipped for packs (immutable). Everything from "Assign whole sessions" to
  `stats.json` runs unchanged — packs are just another source manifest.
- No `pack_dataset` call. `dataset.yaml` gets `packs: [<pack names in first-seen order>]`
  (this is the key Phase 02's `load_packed` reads) and `source_manifest` lists the pack manifests.
- `--like` (`:317`) inherits it: a donor built from packs makes a twin from packs.

`pack.py:pack_dataset`: refuse a pack-built dataset (`dataset.yaml["packs"]` present) with
`ValueError("dataset '<name>' is built from session packs — it has no crop files; its pixels live
in data/packs/…")`, next to the existing fused-synth refusal (`:166-170`). `link_pack` unchanged.

CLI (`cli.py`, `@dataset_app.command("build")` at `:1268`): `--from-packs` flag; the existing
`--pack-size` option selects the pack size.

## Steps

1. `feat(dataset): build --from-packs takes session packs as the source`.
2. `feat(pack): pack_dataset refuses a pack-built dataset`.

## Tests

Append to `tests/test_dataset_build.py` (its helpers build tiny pools; add a pack builder that
writes `manifest.jsonl` + `packed_meta.json` via `packs.write_meta` + a zero image):

- `test_build_from_packs_writes_packs_into_dataset_yaml` — two sessions, two packs, split rows
  keep their `mm://` paths, `dataset.yaml["packs"]` lists both, and the dataset dir holds no
  `packed_images.u8`, `packed_meta.json` or `packed_progress.json`.
- `test_build_from_packs_refuses_a_session_without_a_pack_of_that_size` — message names the
  session and `session pack`.
- `test_like_inherits_from_packs`.

Append to `tests/test_pack.py`:

- `test_pack_dataset_refuses_a_pack_built_dataset`.

Command: `uv run pytest -q tests/test_dataset_build.py tests/test_pack.py`.

## Acceptance

- Both files green; existing counts unchanged plus the four above.
- `grep -n "from_packs" src/chesslab/dataset_build.py src/chesslab/cli.py` hits in both.
- `uv run ruff check src/chesslab/dataset_build.py src/chesslab/training/pack.py src/chesslab/cli.py` clean.

## Do NOT

- Do not touch `torch_data.py`, `train.py`, `labeling.py`, or the types in `packs.py`.
- Do not change split assignment, dedup, class collapse or `make_split`.
