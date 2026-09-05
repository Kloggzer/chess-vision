# Phase 04 — Parity on one real session, then the docs

## Why

Phases 01–03 were each proven on fixtures. Nobody has yet trained from packs, and the pack path
cuts crops ONCE from the board store where the pool path resamples twice — so pixels differ by
design and the proof must say by how much, and that labels and row sets are the same.

## Design (decided — do not redesign)

Session: `rg-2026-08-08-11-59-12` if its `log.jsonl` rows carry `board_straightened`, else the
first session `chesslab session list` shows with one. Recipe: `--class-mode pieces13 --seed 42`,
defaults otherwise. ONE session, ONE worker, one epoch. Never fan out.

Script `scripts/pack_parity.py` (new, argparse: `--session`, `--size 80`):

1. `session pack --session S --size 80` (skip if the pack exists).
2. `dataset build sp-parity-pool --sessions S --pack-size 80x80` (legacy path) and
   `dataset build sp-parity-packs --sessions S --from-packs`.
3. Row parity: same `(session_id, frame, square, label)` set in both `manifest.jsonl` → print
   both counts and the symmetric difference size; assert empty.
4. Pixel parity: for every common key read both crops (`pack.py:row_window` for the pool pack,
   the `MultiPack` files for the pack path), print mean abs diff over all cells and the 99th
   percentile; assert mean ≤ 6/255; print the five worst keys.
5. `train --dataset <each> --epochs 1 --num-workers 1 --model <smallest listed by train --help>`,
   then `eval --dataset sp-parity-pool` on both checkpoints; print `val_visible_piece_acc` side by
   side. Expected: within seed noise (`docs/seed-noise-floor.md`). A gap > 1 point is a finding to
   record, not a failure.

Docs (durable facts — this phase's deliverable):

- `docs/data-pipeline.md` §4 (starts at the line `## 4. What a dataset is`): replace the
  `dataset pack --from` paragraph with the pack model — layout, `session pack`, `pack import`,
  `--from-packs`, the frozen-geometry rule, the measured parity numbers, one resample vs two.
- `README.md`: the two new commands in the CLI table.
- `TODO.md`: move "Sessions direkt in eine Memmap" to „Erledigt" with the numbers.

## Steps

1. `feat(scripts): pack_parity.py measures pool vs packs on one session`.
2. `docs(data-pipeline): session packs — layout, commands, parity numbers`.

## Tests

`uv run pytest -q tests/test_packs.py tests/test_session_pack.py tests/test_dataset_build.py tests/test_pack.py`
once. The integration seam is the script's run, recorded in `STATUS.md`.

## Acceptance

- `uv run python scripts/pack_parity.py --session <S>` completes; its printed table (row counts,
  mean/p99 pixel diff, both accuracies) is pasted into `STATUS.md` → Session log.
- `grep -n "from-packs" README.md docs/data-pipeline.md` hits in both.
- `TODO.md` no longer lists the memmap item under open work.

## Do NOT

- No corpus-wide packing, no multi-session training, no worker fan-out.
- Do not delete any existing dataset memmap; that is the user's call after reading the numbers.
