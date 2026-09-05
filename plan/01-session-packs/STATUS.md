# STATUS — plan/01-session-packs

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-contract.md | done 2026-09-05 | `feat/sp-00`: `0731df2c`, `ba4c9bd7`, `c502c356`, `1f93efa2`, merge `410a3990`, `4e2016df` (step 3) — 9 tests |
| 01 | 01-writer.md | done | 2026-09-05 on `feat/sp-01` (`ffdc45b5`, `b80ca090`, `7fccebe5`, `e7d8148c`); `tests/test_session_pack.py` 5 passed, the five labeling files 35 passed unchanged, `test_comment_budget` green |
| 02 | 02-loader.md | todo | |
| 03 | 03-builder.md | todo | |
| 04 | 04-parity.md | todo | |

## Dependencies

00 first, alone. 01 ∥ 02 ∥ 03 after 00 is merged into `feat/session-packs`. 04 after all three.
Shared files: `cli.py` (01 + 03) and `pack.py` (02 + 03), disjoint regions named in entry.md.

## Manual steps

- Phase 04 trains on real data: one session, `--num-workers 1`, one epoch, on the user's machine.
- Phase 01 step 1 baseline, measured in the `sp-01` worktree at `1121000c` BEFORE the seam
  (cv2 4.13.0, Python 3.12.7), pinned in `tests/test_session_pack.py`:
  crops `fccc9558548fc52072acbf33f56b065c9c1e4e98a77cd2a4abe480370f9a4418`,
  manifest rows minus `ts` `04d762c22fac139458dac626c47f0bbc4b14a9510cfec974eaca9c0af0b94351`.
  Both unchanged after the seam.

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
- Phase 00 worktree ran the gate with the root `.venv` and `PYTHONPATH` (not `uv run`), and did
  not run `ruff format` (would rewrite ~150 unrelated lines of `config.py`) — both now the rule.
- Phase 01, spec deviations (all four small, none redesigns anything):
  - `iter_session_crops` gained one optional keyword, `stats: dict | None`. The slice's run
    counters (`skipped`, `dirty_dropped`, `mesh_frames`, …) are the CUT's knowledge, not the
    writer's, and a generator cannot return them through a `for` loop. The dict never leaves
    `labeling.py`; `pack_session` does not pass it.
  - `_slice_session` needed a per-frame flush of the WebP futures, which the old inline loop got
    for free. It is `_write_crop_batch`, a second private helper in `labeling.py`; the frame
    boundary is read off `row["frame"]`.
  - Telemetry only, measured nowhere: a frame whose cells are ALL dropped used to record an empty
    `WebP crop batches` entry and no longer does, and the batch's clock now starts at its first
    crop instead of before the cell loop. Crops and manifest rows are byte-identical (the pinned
    hashes above).
  - `packs.py` exposes no public name for `packed_images.u8`; `pack_session` writes
    `packs._IMAGE` rather than retyping the literal. A public constant in Phase 00 would be
    cleaner — recorded, not fixed, because `packs.py` is frozen.
- Phase 01 ran `tests/test_ingest.py` once beyond the spec's list: it asserts the two WebP audit
  operations that the seam moved into `_write_crop_batch`. 6 passed.

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
- 2026-09-05, Phase 01 (`feat/sp-01` off `feat/session-packs` at `1121000c`, worktree
  `.claude/worktrees/sp-01`): `ffdc45b5` the `iter_session_crops` seam + parity test, `b80ca090`
  `write_session_pack`, `7fccebe5` `import_pack`, `e7d8148c` the two CLI commands.
  `tests/test_session_pack.py` 5 passed; `test_labeling`, `test_matte`, `test_corrections`,
  `test_labeling_dirty`, `test_labeling_settle` 35 passed, unchanged; `test_comment_budget` and
  `test_ingest` (6, it asserts the WebP audit counters this touched) green. `ruff check` on
  `labeling.py`, `training/pack_session.py`, `cli.py`, `tests/test_session_pack.py` clean,
  `vulture src tests --min-confidence 80` silent, `comment_budget.txt` untouched. Acceptance
  greps: `def iter_session_crops` 1, `write_pool.submit` 1; both `--help` screens render.
  **Exact next step:** the orchestrator merges `feat/sp-01` into `feat/session-packs` and re-runs
  the full gate — nothing in Phase 01 is left open.
