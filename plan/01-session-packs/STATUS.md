# STATUS — plan/01-session-packs

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-contract.md | done 2026-09-05 | `feat/sp-00`: `0731df2c`, `ba4c9bd7`, `c502c356`, `1f93efa2`, merge `410a3990`, `4e2016df` (step 3) — 9 tests |
| 01 | 01-writer.md | todo | |
| 02 | 02-loader.md | done 2026-09-05 | `feat/sp-02`: `47fa87ec`, `0c738036`, `60d31f12` — `test_packs.py` 15 (9 + 6 new), `test_pack.py` 26, `test_synth_build.py` 2 |
| 03 | 03-builder.md | todo | |
| 04 | 04-parity.md | todo | |

## Dependencies

00 first, alone. 01 ∥ 02 ∥ 03 after 00 is merged into `feat/session-packs`. 04 after all three.
Shared files: `cli.py` (01 + 03) and `pack.py` (02 + 03), disjoint regions named in entry.md.

## Manual steps

- Phase 04 trains on real data: one session, `--num-workers 1`, one epoch, on the user's machine.
- Phase 01 step 1 needs baseline hashes measured on `main` BEFORE the seam — record them here.

## Notes / discrepancies

- Pack reviewed and revised 2026-09-05 against the repo. Corrections carried in: the crop loop
  is in `_slice_session`, not `slice_session`; the session resolver is `sessions.session_dir`;
  `synth_build.mm_path` does not exist (`_virtual_path`); `crop_fingerprint` is not part of the
  pack schema; Kotlin packs carry `mm://<session_id>/…` without a size suffix; `pack_dataset`
  already refuses `mm://` rows as "fused synth"; `dataset build` takes `--classes`, `train`
  takes `--backbone`; `README.md` has no CLI table.
- `load_packed` is read positionally at ten sites; only `train.py` and `evaluate.py` are in
  scope. `gradcam.py` and eight `scripts/*.py` will refuse pack-built datasets by design.
- Second review 2026-09-05 (fresh agent, pack + `feat/sp-00`): six blockers, all folded in —
  `uv run` fails in worktrees (gate now uses the root venv with `PYTHONPATH=src`); one branch
  per phase (`feat/sp-0N`), orchestrator merges; `packed_shape` was specced but not implemented
  (Phase 00 step 3 reconciles: `read_pack` with `dir_`, no `__iter__`, no `crop_fingerprint`,
  `DEFAULT_PACK_SIDE`, `PACKS_KEY`, `list_packs`, `packed_shape`); circular import `pack.py`
  ↔ `packs.py` (local imports mandated); `pack_size` axis order fixed as `(W, H)`; the deferred
  debt lines are now Phase 04's deliverable; Kotlin-side debt cut from the pack; the 02↔03 seam
  gets `tests/test_packs_integration.py` (04); vacuous `_write_crop` grep replaced.
- Phase 02, three gaps the Design left open, all decided in the loader and none in `packs.py`:
  1. **A MultiPack's `idx` cannot be read positionally.** Train resolves the WHOLE manifest but
     builds datasets from split rows, and `PackedBoardDataset` re-sorts its rows by square — both
     break `packed.idx`'s row order. So `resolve_dataset_packs` marks each resolved row with
     `_pack_at = (pack_no, row_no)` (the `_packed_idx` pattern of `_load_packed`), and
     `_pack_index` resolves per ROW: `_pack_at` when present, else a lookup rebuilt from the
     packs' own `paths` via `read_pack(name, dir_=…)`. `resolve_packs` stayed untouched.
  2. `train.py:371` read `packed[1]` a SECOND time (the pack's crop size, not only the banner at
     `:510`); both now go through `packs.packed_shape`, which is what the acceptance grep wants.
  3. `tests/test_pack.py:474` asserted the old flat `ds.idx` (`[2, 3, 4, 5]`); with `(pack_no,
     row_no)` it is `[[0, 2], …]`. One assertion changed in a file Phase 03 only appends to —
     the alternative was leaving it red.
- Phase 02 used a local `import yaml` inside `resolve_dataset_packs` (pack.py has no module-level
  yaml, and the region belongs to 02 while the import block is shared with 03).
- `tests/comment_budget.txt` unchanged: the worst blocks of `torch_data.py` (33), `pack.py` (15),
  `train.py` (13) and `evaluate.py` (12) are all still their budgeted ones after the edits.
- Phase 00 worktree ran the gate with the root `.venv` and `PYTHONPATH` (not `uv run`), and did
  not run `ruff format` (would rewrite ~150 unrelated lines of `config.py`) — both now the rule.

## Session log

- 2026-09-05, Phase 00 steps 1–2: `training/packs.py` and `Paths.packs` landed on `feat/sp-00`
  (`0731df2c` contract types, `ba4c9bd7` resolver + tests, `c502c356` docstring inside the comment
  budget, `1f93efa2` status). `tests/test_packs.py` 7 passed, `ruff check` clean, `vulture` silent.
  Step 3 (reconcile with the reviewed contract) open.
- 2026-09-05, Phase 00 step 3 (`4e2016df`, after merging `main` at `c219bdb6` as `410a3990`):
  `read_pack`/`dir_`, five-key `write_meta`, no `__iter__`, plus `DEFAULT_PACK_SIDE`, `PACKS_KEY`,
  `packed_shape`, `list_packs`. `packs.py` is 139 lines, `tests/test_packs.py` 9 passed,
  `tests/test_comment_budget.py` 1 passed (no `comment_budget.txt` entry needed), `ruff check` on
  the three files clean, `vulture src tests --min-confidence 80` silent. Acceptance greps all hit:
  `def packs` once, `self.packs` 0, 9 `def test_`, `__iter__`/`memmap`/`crop_fingerprint` 0.
  **Exact next step:** the orchestrator merges `feat/sp-00` into `feat/session-packs`, then 01, 02
  and 03 start in parallel off it.
- 2026-09-05, Phase 02 steps 1–3 on `feat/sp-02` (off `feat/session-packs` at `1121000c`):
  `47fa87ec` `_pack_index`/`_multi_index` + both packed datasets on a list of memmaps,
  `0c738036` `resolve_dataset_packs` + `load_packed`'s refusal, `60d31f12` train/eval resolve
  packs first and read `packed_shape`. `tests/test_packs.py` 15 passed, `tests/test_pack.py` +
  `tests/test_synth_build.py` 28 passed together (26 + 2, counts unchanged), `ruff check` on the
  four sources and the two test files clean, `vulture src tests --min-confidence 80` silent.
  Acceptance greps: `path2idx[r["path"]]` 1 hit (inside `_pack_index`), `packed[1]` in `train.py`
  0. Nothing outside `torch_data.py`, `pack.py`'s `load_packed` region, `train.py`, `evaluate.py`
  and the two test files was touched.
  **Exact next step:** the orchestrator merges `feat/sp-02` into `feat/session-packs` (after or
  alongside 01 and 03); Phase 04 then measures the 02↔03 seam with
  `tests/test_packs_integration.py` — no `dataset build --from-packs` exists yet, so no end-to-end
  run has ever fed `resolve_dataset_packs` a real `packs:` key.
