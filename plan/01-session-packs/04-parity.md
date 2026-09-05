# Phase 04 — Parity on one real session, then the docs

## Why

Phases 01–03 were each proven on fixtures. Nobody has yet trained from packs, and the pack path
cuts crops ONCE from the board store where the pool path resamples twice — so pixels differ by
design and the proof must say by how much, and that labels and row sets are the same.

## Design (decided — do not redesign)

Session: `rg-2026-08-08-11-59-12` if its `log.jsonl` rows carry `board_straightened`, else the
first session `uv run chesslab session list` shows with one. ONE session, ONE worker, one epoch,
the DEFAULT backbone (`config.DEFAULT_BACKBONE`; never `--backbone smallcnn` — it hard-crashes
ROCm-Windows, `cli.py:1507`). Never fan out.

Runs from the ROOT checkout after 01–03 are merged into `feat/session-packs` (`uv run` works
there; it does not in a worktree, entry.md).

**Seam test first — `tests/test_packs_integration.py` (new):** two fake packs (`packs.write_meta`
+ real small pixels), `build_dataset(..., from_packs=True)` on them, then
`resolve_dataset_packs(name)` → a `MultiPack` whose `idx` covers every manifest row, and a
`PackedSquareDataset` over the train split serves the pixels the packs hold. This is the ONE test
that crosses Phase 02 and Phase 03 through `PACKS_KEY`.

Script `scripts/pack_parity.py` (new, argparse: `--session`, `--size` default
`packs.DEFAULT_PACK_SIDE`):

1. `uv run chesslab session pack --session S --size 80` (skip if the pack exists).
2. `uv run chesslab dataset build sp-parity-pool --sessions S --classes pieces13
   --pack-size 80x80` (legacy path) and `uv run chesslab dataset build sp-parity-packs
   --sessions S --classes pieces13 --from-packs`.
3. Row parity: same `(session_id, frame, square, label)` set in both `manifest.jsonl` → print
   both counts and the symmetric difference size; assert empty.
4. Pixel parity: for every common key read both crops (`pack.row_window` (`:74`) for the pool
   pack, the `MultiPack` files for the pack path), print mean abs diff over all cells and the
   99th percentile; assert mean ≤ 6/255; print the five worst keys.
5. `uv run chesslab train --dataset <each> --epochs 1 --num-workers 1 --seed 42`, then
   `uv run chesslab eval --dataset sp-parity-pool` on both checkpoints; print
   `val_visible_piece_acc` side by side. Expected: within seed noise
   (`docs/seed-noise-floor.md`). A gap > 1 point is a finding to record, not a failure.

Docs (durable facts — this phase's deliverable):

- `docs/data-pipeline.md` §4 (`## 4. What a dataset is`, `:313`): after the `dataset pack --from`
  paragraph (`:337-341`) add the pack model — layout, `session pack`, `pack import`,
  `--from-packs`, the naming invariant, the frozen-geometry rule, the measured parity numbers,
  one resample vs two. State plainly that `gradcam` and the `scripts/*.py` readers do NOT read
  pack-built datasets and say what they raise instead (`entry.md` → Known non-goal).
- `README.md`: add the two commands to the `### Datasets` block (`:281-287`) and the session
  block (`:368-372`) — those are fenced command lists, there is no CLI table.
- `TODO.md`: move "Sessions direkt in eine Memmap" (`:82`) into `## Erledigt` (`:140`) as ONE
  line with the numbers, and add the four deferred-debt items from `entry.md` → "Debt this pack
  pays down — and what it defers" as ONE line each under `## Daten / Training / Labeling`
  (`load_packed` bare tuple; eight scripts copying the index expression; two `mm://` builders;
  `packed_meta.json` hand-written at four Python sites).

## Steps

1. `test(packs): build --from-packs and resolve_dataset_packs meet on PACKS_KEY`.
2. `feat(scripts): pack_parity.py measures pool vs packs on one session`.
3. `docs(data-pipeline): session packs — layout, commands, parity numbers, deferred debt`.

## Tests

`uv run pytest -q tests/test_packs_integration.py tests/test_packs.py tests/test_session_pack.py
tests/test_dataset_build.py tests/test_pack.py` once. The real-data seam is the script's run,
recorded in `STATUS.md`.

## Acceptance

- `uv run python scripts/pack_parity.py --session <S>` exits 0; its printed table (row counts,
  mean/p99 pixel diff, both accuracies) is pasted into `STATUS.md` → Session log.
- `grep -n "from-packs" README.md docs/data-pipeline.md` hits in both.
- `grep -n "Memmap" TODO.md` shows the item only below the `## Erledigt` heading;
  `grep -c "load_packed\|_virtual_path\|packed_meta.json\|_packed_idx" TODO.md` ≥ 4.

## Do NOT

- No corpus-wide packing, no multi-session training, no worker fan-out.
- Do not delete any existing dataset memmap; that is the user's call after reading the numbers.
- Do not repair `gradcam.py` or `scripts/*.py` — document the limitation instead.
