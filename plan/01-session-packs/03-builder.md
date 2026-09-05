# Phase 03 — Builder: `dataset build --from-packs`

## Why

`build_dataset` (`dataset_build.py:364`) reads crop-pool manifests and ends by calling
`pack_dataset` (`:563-569`), which decodes files. A pack-built dataset has no files: its rows
already carry `mm://` paths, and its "pack" is the list of packs they come from.

## Design (decided — do not redesign)

`build_dataset(..., from_packs: bool = False)`. The existing `pack_size` argument (`(W, H)`,
the `--pack-size` order) selects the pack size and defaults to
`(packs.DEFAULT_PACK_SIDE, packs.DEFAULT_PACK_SIDE)` when `from_packs` and the caller passed
`None` (the CLI passes `_out_size(None)` → `None`).

- `from_packs=True`: candidates are `packs.list_packs(paths)`; keep a `PackRef` whose
  `manifest.jsonl` first row's `session_id` is in `session_ids` AND whose
  `(shape[2], shape[1]) == pack_size` (meta stores `h, w`; compare as `(w, h)`). Never parse
  `packed_meta.json` or `paths.packs.iterdir()` here — `list_packs` owns the layout.
  A session with no pack of that size → `ValueError` naming the session and the command
  `chesslab session pack --session <id> --size <W>`.
- The pool lock check (`:450-455`) is skipped for packs — a pack is immutable, and
  `locks.pool_lock_path` points at a crop pool that does not exist here.
- Everything from "Assign whole sessions" onward runs unchanged: packs are just another source
  manifest. No `pack_dataset` call, so `res["packed"]` stays `None` (the `dataset build` CLI
  never prints it — `cli.py:1356-1357`).
- `dataset.yaml` gets `packs.PACKS_KEY: [<pack names in first-seen order>]` — the key Phase
  02's `resolve_dataset_packs` reads (import `PACKS_KEY`, never the literal) — and
  `source_manifest` (`:546`) lists the pack manifests.
- `--like`: add `from_packs` to `_donor_policy`'s returned dict (`:269-293`, it is a fixed
  whitelist) sourced from the donor's `dataset.yaml[PACKS_KEY]` being non-empty, and apply it at
  the call site (`:413`, `pol = _donor_policy(like, paths)`) the way the other keys are applied.

`pack.py:pack_dataset`: refuse a pack-built dataset. **Placement matters** — the existing check
at `:166-170` fires on `rows[0]["path"].startswith("mm://")` and would claim "fused synth build"
for a pack-built one. Put the new check IMMEDIATELY BEFORE it (after `rows` is loaded at `:163`),
keyed on `dataset.yaml[PACKS_KEY]` being present (local import of `packs`, entry.md):
`ValueError("dataset '<name>' is built from session packs — it has no crop files; its pixels
live in data/packs/…")`. `link_pack` unchanged.

CLI (`cli.py`, `@dataset_app.command("build")` at `:1268`): add `--from-packs` beside
`--pack-size` (`:1292-1294`) and pass it through at `:1342-1351`. Extend the `--pack-size` help
text to say it also selects WHICH pack `--from-packs` takes.

## Steps

1. `feat(dataset): build --from-packs takes session packs as the source`.
2. `feat(pack): pack_dataset refuses a pack-built dataset`.

## Tests

Append to `tests/test_dataset_build.py` (helpers `_write_crop`/`_row`/`_global_manifest` at
`:13-44` build tiny pools; add a pack builder that writes `manifest.jsonl` + `packed_meta.json`
via `packs.write_meta` + a zero image of the right size):

- `test_build_from_packs_writes_packs_into_dataset_yaml` — two sessions, two packs, split rows
  keep their `mm://` paths, `dataset.yaml["packs"]` lists both, and the dataset dir holds no
  `packed_images.u8`, `packed_meta.json` or `packed_progress.json`.
- `test_build_from_packs_refuses_a_session_without_a_pack_of_that_size` — message names the
  session and `session pack`.
- `test_build_from_packs_ignores_a_pack_of_another_size` — same session, packs at 80 and 96,
  `pack_size=(80,80)` picks one.
- `test_like_inherits_from_packs`.

Append to `tests/test_pack.py`:

- `test_pack_dataset_refuses_a_pack_built_dataset` — the message says `data/packs`, NOT
  "fused synth build".

Command (from the worktree, entry.md): `PYTHONPATH=src <root>/.venv/Scripts/python.exe -m pytest -q
tests/test_dataset_build.py tests/test_pack.py`.

## Acceptance

- Both files green; existing counts unchanged plus the five above.
- `grep -n "from_packs" src/chesslab/dataset_build.py src/chesslab/cli.py` hits in both.
- `uv run ruff check src/chesslab/dataset_build.py src/chesslab/training/pack.py
  src/chesslab/cli.py` clean.

## Do NOT

- Do not touch `torch_data.py`, `train.py`, `labeling.py`, `training/packs.py`, or the
  `load_packed` region of `pack.py` (`:332-352`, Phase 02).
- Do not change split assignment, dedup, class collapse or `make_split`.
