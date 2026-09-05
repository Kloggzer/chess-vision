# STATUS — plan/01-session-packs

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-contract.md | done 2026-09-05 | `feat/sp-00`: 0731df2c, ba4c9bd7, c502c356 — `tests/test_packs.py` 7 passed |
| 01 | 01-writer.md | todo | |
| 02 | 02-loader.md | todo | |
| 03 | 03-builder.md | todo | |
| 04 | 04-parity.md | todo | |

## Dependencies

00 first, alone. 01 ∥ 02 ∥ 03 after 00 is merged into `feat/session-packs`. 04 after all three.

## Manual steps

- Phase 04 trains on real data: one session, `--num-workers 1`, one epoch, on the user's machine.

## Notes / discrepancies

- Pack review 2026-09-05 (fresh Opus agent, pack only): 15 findings, all phases "not alone
  implementable". Fixed in the pack: `load_packed` consumers (`train.py:510`, `gradcam.py`,
  `scripts/*`) → `MultiPack.__iter__` message + `packed_nhw`; Kotlin `mm://$id` vs dir name →
  invariant dir == first segment, `import_pack` without `--name`; `pack_dataset` refusal BEFORE
  the `mm://` check; session lookup `sessions.session_dir`; seam is `_slice_session` :380-587;
  `--like` via `_donor_policy`; Phase 04 flags `--classes`, `--backbone smallcnn`; README has
  command blocks, no table; `Paths.packs` not in `all()`; meta schema = required keys, Kotlin
  extras optional; writer moved to `pack_writer.py` so 01/02 share no file; registry gained
  `gradcam.py`, `scripts/`, `pack_parity.py`, `TODO.md`; seam rule limited to new types.
- Phase 00, `uv run` does NOT work inside a worktree: `wheels/` is gitignored, so `uv sync` dies on
  `rocm==7.2.1 @ path+wheels/rocm-7.2.1.tar.gz` and starts building a fresh env instead of reusing
  the main one. Ran everything with the main checkout's `.venv/Scripts/python.exe` and
  `PYTHONPATH=<worktree>/src`, verified `chesslab.__file__` points into the worktree. Later phases
  either do the same or junction `wheels/` into their worktree.
- Phase 00, `ruff format` is not this repo's style: on `config.py` it wants to rewrite ~150 unrelated
  lines (aligned trailing comments, hanging-indent call sites). The repo gate is `ruff check`
  (`AGENTS.md`), which is clean, so the new files keep the surrounding hand style.
- Phase 00 decision: `pack_name_of` requires a segment AFTER the pack name, so a bare `mm://name` is
  rejected — every writer in the repo emits `mm://<pack>/<frame>/<square>`.

## Session log

- 2026-09-05, Phase 00: `training/packs.py` (121 lines, no memmap) and `Paths.packs` landed on
  `feat/sp-00` in three commits (0731df2c contract types, ba4c9bd7 resolver + tests, c502c356
  docstring inside the comment budget). `tests/test_packs.py` 7 passed, `tests/test_comment_budget.py`
  1 passed, `ruff check` clean on the three touched files, `vulture src --min-confidence 80` silent.
  **Exact next step:** merge `feat/sp-00` into `feat/session-packs`, then start 01, 02 and 03 in
  parallel off it — each imports `chesslab.training.packs` and none edits `packs.py`.
