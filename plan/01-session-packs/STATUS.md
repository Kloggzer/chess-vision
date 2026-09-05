# STATUS — plan/01-session-packs

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-contract.md | todo | |
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

## Session log

(empty)
