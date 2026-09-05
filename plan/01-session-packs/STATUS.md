# STATUS — plan/01-session-packs

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-contract.md | done 2026-09-05 | `feat/sp-00`: `0731df2c`, `ba4c9bd7`, `c502c356`, `1f93efa2`, merge `410a3990`, `4e2016df` (step 3) — 9 tests |
| 01 | 01-writer.md | done | 2026-09-05 on `feat/sp-01` (`ffdc45b5`, `b80ca090`, `7fccebe5`, `e7d8148c`); `tests/test_session_pack.py` 5 passed, the five labeling files 35 passed unchanged, `test_comment_budget` green |
| 02 | 02-loader.md | todo | |
| 03 | 03-builder.md | done 2026-09-05 | `feat/sp-03`: `ce94b864`, `7a7f0c8e` — `tests/test_dataset_build.py` 11, `tests/test_pack.py` 27 (38 passed together) |
| 01 | 01-writer.md | todo | |
| 02 | 02-loader.md | done 2026-09-05 | `feat/sp-02`: `47fa87ec`, `0c738036`, `60d31f12` — `test_packs.py` 15 (9 + 6 new), `test_pack.py` 26, `test_synth_build.py` 2 |
| 03 | 03-builder.md | todo | |
| 04 | 04-parity.md | done 2026-09-05 | `feat/sp-04`: `7ae5cd45`, `3d0b1e01`, `d67cd3b4` — `test_packs_integration` 2, the five-file list 60 passed; rows 50310/50310 diff 0, mean 1.684/255, p99 2.299, `visible_piece_acc` 0.1875 (pool) / 0.2068 (packs) |

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
- Phase 03: the spec puts the `--like` inheritance at `_donor_policy` (`from_packs` from a
  non-empty `PACKS_KEY`) — done, but note `_donor_policy` needs its own local `packs` import; a
  module-level one in `dataset_build.py` is not circular today, yet the local import is what
  entry.md mandates and what the rest of the file already does.
- Phase 03: `_preflight_disk_check` still runs for a pack build and `cv2.imread`s up to 32
  `mm://` rows before giving up ("could not read any sample crop"). Harmless — it returns early
  and nothing is projected — but it prints OpenCV `findDecoder` warnings. The Design only names
  the pool-lock check as skipped, so it was left as is. Candidate for Phase 04's TODO lines.
- Phase 03: with `val_frac=0` / `test_frac=0` the assigner still places a session in `val`, so
  `rows` (train + holdout) is not source order. `dataset.yaml[packs]` is therefore first-seen
  order OF THE BUILT MANIFEST, which is what `resolve_packs` numbers by — the test asserts that
  relation rather than a hardcoded order.
- Phase 03 touched no `tests/comment_budget.txt` entry: `dataset_build.py`, `pack.py` and
  `cli.py` keep their worst blocks (21 / 15 / 10); the new comments are 2–4 lines.
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
- Phase 04, five deviations from the Design, all forced by the code and all in the script:
  1. **The Design's pool arm cannot be compared.** `data/crops/default/` is a cut from whenever the
     session was last sliced; for `11-59-12` that is 2026-08-22, and the log moved on 2026-09-04
     (a3/a4 swapped from ply 65 — `TODO.md` names it). Measured against that pool: 45,567 pool rows
     against 50,310 pack rows, 53 frames missing, 8 labels disagreeing, symmetric difference 5,357.
     The script therefore slices the ONE session into its own tag (`data/crops/sp-parity/`, 128 px,
     427 MB) and builds `sp-parity-pool` with `--source-manifest` from it. Then both arms read the
     same log at the same moment and only the resampling differs, which is what §4 wanted measured.
  2. **`pack.row_window` cannot read.** The Design names it for the pool side, but it opens `r+`
     and yields a `put(row, rgb)` setter — a WRITE window. The script reads through
     `pack.open_packed_memmap`, which is what the loader itself uses.
  3. **One session leaves val and test empty.** `assign_sessions_to_splits` never splits a session
     and its "never emit an empty holdout" pass needs two sessions in train, so both builds need
     `--allow-degenerate` and `train` would build an empty val loader. Both arms therefore train
     against a `split-parity.json` the script writes, whose `val` IS the train session. The
     accuracies compare the two pixel paths against each other and nothing else.
  4. **`--no-empty-cap` on both trainings.** The empty cap protects the mined hard empties by CROP
     PATH (`data/reports/hard_empty.jsonl`, 5,653 rows here) — no `mm://` row can match one, so
     with the cap on the two arms would train on different rows. It does not touch the manifests:
     `subsample_classes` runs inside `make_split` and at train time, never on the written rows.
  5. `chesslab eval` takes `--run` and needs `--split-file`; the Design's `eval --dataset <each>`
     is `eval --run <arm> --dataset sp-parity-pool --split train --split-file split-parity.json`.
     The metric key in `eval_*.json` is `visible_piece_acc` (train's `metrics.jsonl` calls the same
     number `val_visible_piece_acc`).
- Phase 04 finding, per the Design's "> 1 point is a finding": the two arms are 1.9 points apart
  (0.1875 pool, 0.2068 packs). Both models are ONE warm-up epoch old and nowhere near converged —
  `val_acc` 0.45, board accuracy 0.0 on both — so the gap is not attributable to the pixel path.
  The packs arm is also evaluated cross-domain (trained on direct 80 px cuts, measured on the
  pool's 128→80 pixels) and still comes out higher. Re-measure on a converged run.
- Phase 04 left `data/crops/sp-parity/` (427 MB), `data/packs/rg-2026-08-08-11-59-12-80/` (942 MB),
  `sp-parity-pool` (944 MB), `sp-parity-packs` (18 MB) and two `data/models/sp-parity-*` runs on
  disk. Nothing else was deleted. The 944 MB against 18 MB IS the feature's point.
- Phase 04 touched no `tests/comment_budget.txt` entry — both new files are new-file-limit clean
  (worst block 2 lines) and no existing file's comments changed.

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
- 2026-09-05, Phase 03 steps 1–2 on `feat/sp-03` (off `feat/session-packs` at `1121000c`):
  `ce94b864` adds `build_dataset(..., from_packs=)` with `_pack_manifests`, the skipped pool
  lock, the `packs` key in `dataset.yaml`, the suppressed `pack_dataset` call and the `--like`
  inheritance, plus `--from-packs` on `chesslab dataset build`; `7a7f0c8e` puts the pack-built
  refusal immediately before `pack_dataset`'s fused-synth check. Gate from the worktree with the
  root `.venv` and `PYTHONPATH=src`: `tests/test_dataset_build.py` + `tests/test_pack.py`
  38 passed (11 + 27, five new), `ruff check` on the five touched files clean, `vulture src tests
  --min-confidence 80` silent, `tests/test_comment_budget.py` 1 passed.
  **Exact next step:** the orchestrator merges `feat/sp-03` into `feat/session-packs` (after or
  before 01/02 — `cli.py` and `pack.py` hunks are disjoint), then Phase 04 runs the end-to-end
  parity on one real session from the root checkout.
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
- 2026-09-05, Phase 04 on `feat/sp-04` (off `feat/session-packs` at `d3354af7`, ROOT checkout —
  no worktree, `uv run` works there): `7ae5cd45` `tests/test_packs_integration.py` (the 02↔03 seam:
  two packs with real pixels through `build_dataset(..., from_packs=True)`, `resolve_dataset_packs`
  and `PackedSquareDataset`), `3d0b1e01` `scripts/pack_parity.py`, `d67cd3b4` the docs.
  `uv run pytest -q tests/test_packs_integration.py tests/test_packs.py tests/test_session_pack.py
  tests/test_dataset_build.py tests/test_pack.py` → **60 passed** (2 + 15 + 5 + 11 + 27);
  `tests/test_comment_budget.py` 1 passed; `uv run ruff check` on the two new files clean;
  `uv run vulture src tests synth --min-confidence 80` silent.
  The script ran end to end once, exit 0 (`chesslab session pack` was skipped — the pack already
  existed from the same script's first, mis-logged launch; the slice, both builds, both trainings
  and both evals ran fresh). Its printed table, verbatim:

  ```
  === pack parity: rg-2026-08-08-11-59-12 @ 80 px ===
  rows (pool / packs)          50310 / 50310
  symmetric difference         0 (pool-only 0, packs-only 0)
  common rows compared         50310
  mean abs diff                1.684 / 255
  p99 per-crop mean diff       2.299 / 255   (max 2.435)
    worst                      rg-2026-08-08-11-59-12/000768/g1/wN  2.435
    worst                      rg-2026-08-08-11-59-12/000771/g1/wN  2.427
    worst                      rg-2026-08-08-11-59-12/000759/g1/wN  2.421
    worst                      rg-2026-08-08-11-59-12/000765/g1/wN  2.420
    worst                      rg-2026-08-08-11-59-12/000747/g1/wN  2.413
  visible_piece_acc pool       0.1875
  visible_piece_acc packs      0.2068
  ```

  Acceptance greps all hit: `from-packs` in `README.md` (3) and `docs/data-pipeline.md` (2);
  `Memmap` in `TODO.md` only at :148, below `## Erledigt` (:146); the four deferred-debt lines
  under `## Daten / Training / Labeling`.
  **Exact next step:** the orchestrator merges `feat/sp-04` into `feat/session-packs` and runs the
  full gate (`uv run pytest -q`, ruff, vulture, `test_comment_budget`). Nothing in the pack is
  left open; the one thing worth doing next is re-measuring the two accuracies on a converged run,
  and the user decides whether any existing dataset memmap goes.
