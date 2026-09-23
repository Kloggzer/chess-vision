# CLAUDE.md — chesslab

> **Status:** maintenance. `specs/` is gone (`aacffaf7`); current state in `README.md`,
> `docs/architektur-review-python-2026-09-23.md` and `docs/offene-entscheidungen.md`.
> This file says WHAT holds and WHERE the reason is. History belongs in `docs/`.

## Mission
- **Goal:** auto-labeled image dataset of physical chess pieces (fixed camera); labels from FEN,
  64 examples per photo; trains a per-square classifier.
- **Tracker** lives in `android/` (Kotlin). Python is dataset building, training and export only
  (`chesslab track` deleted 2026-08-07, `track_feedback.py` and the capture rig 2026-08-20).

## Architecture & Data Flow
- **Path:** Camera -> Frame-Diff/Legacy Check -> Commit; the CNN path is asynchronous and sparse.
  `docs/tracker-flow.md` records a measured break ("no snapshot ever reached the engine"); a later
  replay saw `CnnSnapshot.gridOccluded` reach the verify ladder — unconfirmed live, re-measure first.
- **Data pipeline** (`docs/data-pipeline.md`): Sessions -> Slice -> Crop Pool -> Dataset. `unusable`
  is not retroactive; parking does not prune the pool.
- **Temporal pass:** `session temporal-pass` sits between `matte` and `model-read`. SAM is the base;
  the sensor only ADOPTS frames SAM never cut and UPSERTS whole frames — never a cell-level merge
  (user, 2026-09-11). `docs/session-mattes.md`.
- **Board store:** a session keeps `boards/*.webp` (rectified frame under its own quad), the raster
  BOTH `crop_square` and `/api/cell` cut from. The row carries `board_size`/`board_border`; a reader
  that assumes its own scale cuts up to 59 px off. Boards are written STRAIGHT
  (`board_straightened`), every later cut is a plain rectangle. **Never straighten a second time.**
  `meshes_for_boards` pools ONE median mesh over hand-free frames (`docs/data-pipeline.md`).
- **Calibration:** `calibrate` = ArUco (coarse only) + grid fit (accuracy). No markerless cold start.
  Optics: see Undistortion below.
- **Synth:** `build-synth` packs renders straight into memmap. Rotation-augment is train-time only.
- **Cell rule:** `chesslab.cell_rule` (torch-free) holds `PIECE_VISIBLE_MAX`, `CELL_DARK_MIN` and
  `classification_eligible` — the ONE rule that loss, labeling and evaluators share.

## Non-Goals & Tech Stack
- No deep-learning board detection (ArUco is coarse correction); no RL, supervised only.
- Python 3.11+ (dev 3.12), uv, Typer, OpenCV/NumPy/Pillow, python-chess, PyTorch (Windows: torch
  2.13 / ROCm 10 + `triton-windows` from AMD's index, see `pyproject.toml`), Android/Kotlin. GPL-3.0.

## Conventions
- **Classes:** `wP`..`bK` + `empty` (`config.IDENTITY_CLASSES`). `occluded` is a **regression
  target**, not a class: `dataset build` defaults to `pieces13`, `train` to `--head occlusion`,
  which masks every cell over `PIECE_VISIBLE_MAX = 0.15` out of the classification loss. Nobody
  paints occlusion; the human only checks alpha and position. `--classes` takes `pieces13` or
  `pieces` (the 2-class `occupancy` scheme is gone).
- **Android ships coverage:** seven bundled `p4*` models, `p4a-80-clahe` is `DEFAULT_MODEL`. All
  declare `coverage_output` (13 logits + independent coverage sigmoid in column 13). Then
  `TrackerService` switches the model-free arm OFF (`gridArmFor`); the desktop replay runs both.
  The regression set cannot judge this axis (24 occluded frames of 11 001) —
  `docs/regression-reference.md`.
- **Thresholds ride in the model, not the engine:** `coverage_gate`, `temperature` and
  `prior_lambda` in the model's `config.json`, read by `ModelSpec`. Gate chosen at **lambda = 3,
  because phantoms are the veto** (user, 2026-09-14) — lambda is a decision, not a measurement;
  DEFAULT gate **0,25**, 0,5 was too loose for all seven. `docs/occlusion-gate.md`.
- **`BUNDLED_MODELS` is hand-maintained:** a model dropped into `assets/cnn_model/` never appears in
  the picker. Staging (`scripts/stage_model_asset.py`) refuses a model without `temperature`,
  `coverage_gate` (if coverage) and `prior_lambda`, or with a mismatching `export_fingerprint`.
- **Geometry:** squares `a1`..`h8`; corners `[a8, h8, h1, a1]`.
- **Config:** paths/parameters in YAML; classes only in `config.CLASSES`.
- **Cache:** per-session crop counts via `manifest_cache.py` (mtime-keyed).
- **Comments:** target **3 lines**; say *why*, never what the code says; longer prose goes to
  `docs/` with a one-line pointer. **Default is NO comment** — a comment longer than its function is
  wrong, delete it (user, 2026-08-15). **The three guards are off by one:** Kotlin fails at
  `run >= LIMIT` (a block of exactly 5 already fails; KDoc `/**` and `*/` count), TS and Python at
  `worst > LIMIT` (5 passes, 6 fails). Write for the Kotlin rule. Budgets
  (`android/config/comment-budget.txt`, `platform/app/comment-budget.txt`,
  `tests/comment_budget.txt`) may only shrink; after cleaning a Kotlin file run
  `uv run python android/scripts/comment_budget.py`.

## Known Pitfalls (Critical)

### 0. Frame selection
- **Measure first, pick after.** `framescan.py` scans every 3rd frame (hand gate + grooves) before
  `classify` rules per frame. `docs/frame-scan.md`, `docs/session-mattes.md`.
- **The board is the witness, not the hand.** A hand over an unchanged board is `occluded` and KEEPS
  its FEN. Only `next_touches` decides `stale`.
- **`boards/` is the clean stock, `dirty/` the pile**, each row with `dirty_reason`.
- **`_persistent` takes the intersection** (union bug fixed 2026-09-14); files on disk from before
  were exported under the old rule.
- **The CELL decides, not the frame:** with `settle_dev` and a matte, a cell over
  `PIECE_VISIBLE_MAX` keeps its FEN label, a visible one is checked against the settled board, a
  departing one becomes a `Strittig` card (`docs/frame-scan.md`).
- **Settle threshold is 45, not 15** (since 2026-09-09). Lowering it floods the lane. The settle
  gate is blind in the dark corner; fix by normalising to the cell's own contrast, not the threshold
  (`docs/frame-scan.md`).

### 0.1 Crop sizes: 128 belongs to `board_size` 928, not to the pool
- `data/crops/<tag>/` at 128 px is for the HUMAN (labeling); `packed_images.u8` at target size is
  what the MODEL sees. Both are cut FROM THE SOURCE, never one from the other.
- 128 is the native box of the real export (928 board, cell 116, `pad_side` 0.05 -> 127.6 px). Do NOT
  change the pool size for 4K (176) or 1080p (90) sources — `docs/data-pipeline.md` 3.1.

### 1. Model & Normalization
- **Occlusion:** a model without coverage output (or `occluded` class) has `pOccluded = 0`; the CNN
  arm is blind there and hand verification needs the **model-free** arm (`gridOccluded`). That arm
  only runs for such models today (all bundled ones declare `coverage_output`). Its gate counts only
  HAND-SHAPED flags (>= 1 orthogonally adjacent pair): any-flag blanks a replay on one leaning piece,
  a count of 3 lets the leaving hand's 2-flag tail through (003957: 38/67 -> 67/67, 0 invented).
- **Normalization:** BatchNorm works; the learning rate is the critical factor. Never rank
  normalizers at one shared rate.
- **Metrics:** `val_acc` correlates inversely with the veto metric; use `sweep_infer_size.py`.
- **Bewertet wird nur, was der Verlust auch lernt (2026-08-24):** `CHECKPOINT_WEIGHTS`, `auroc`,
  `conf_wrong` and class weights count only `classification_eligible` cells (coverage AND
  `brightness < CELL_DARK_MIN`). Arms with differently cut val sets are not comparable on
  `piece_acc`; compare via `val_visible_piece_acc` and `chesslab eval --dataset <shared>`
  (`docs/evaluation.md`). Since 2026-09-22 `effective_class_weights` of an
  occlusion run on a pack WITH `brightness` differ from the archive (`docs/class-scheme.md`).
  `scripts/mine_hard_coverage.py` cuts on coverage alone on purpose.
- **0,15 is calibrated against the groove sensor, not the image:** the model still reads 74 % at
  0,15–0,25 and falls under chance only from 0,6. `train --coverage-weight soft` follows the curve;
  **default stays `hard`**, and the METRIC always stays on 0,15 (`docs/class-scheme.md`).
- **Stored `coverage` drifts against its crops** after a re-export.
  2026-09-21 tragen **27** Aufnahmeverzeichnisse eine `matte.jsonl` (backups under `_pre-scan-20260906/` excluded;
  `tests/test_claude_numbers.py` holds this number against the disk). Run
  `chesslab occluders recut-coverage --all` after every re-export; `matte.jsonl` rows carry a
  `_source` stamp and `chain.ts` reopens the matte rung. Rows WITHOUT a stamp stay valid.
- **Coverage Matte Trap:** `training/torch_data.py` (`coverage_of`) defaults unmatted crops to
  `coverage = 0.0`, indistinguishable from clear squares. Mixing matted and unmatted sessions in one
  occlusion-head build teaches that hands do not exist. Matted sessions only.
- **SAM's refusal is not a clean board:** a `skipped` row (`zone too big`) carries neither
  `concepts` nor `coverage`. **Wer `matte.jsonl` liest, prüft `coverage` auf `None`** — `None` means
  unmeasured, not zero (`docs/session-mattes.md`).

### 2. Data & Splits
- **No training without memmap:** `_require_pack` aborts; `--allow-unpacked` only for sets under the
  pack limit. Re-pack after every re-slice.
- **Hard-negative mining on training data finds almost only occluded cells** (98,6 %, masked out of
  the loss). Mine only on unseen material: `scripts/mine_hard_empty.py --dataset <name> [--fresh]`.
- **Choose val by CLASS COVERAGE, not image quality:** `2026-09-06-21-29-35` carries zero white
  knights, so `macro_recall`/`score` are noise on four classes. `docs/evaluation.md`.
- **Compare sharpness only within a resolution class** (4K / 1440p / 1080p differ 3x).
- **Reproducibility:** splits are not deterministic from params — **always use `split.json`**.
- **Geometry fix (2026-07-31):** old crops were 3–6 px off; old Path-A numbers are void.
- **Hard empties:** `hard_empty.jsonl` is global training input; **park** it (`data/_parked/`) when
  unused.
- **Datasets are built per session:** each recording once per size into
  `data/packs/<session>-<size>/`, cited via `--from-packs` (`mm://` paths). A pack is immutable but
  not automatically current: `_rewritten_since_pack` checks crop fingerprints (not for `mm://` rows
  or old packs) — after a re-slice, throw the recording's packs away anyway. `--from-packs` refuses
  packs older than a later human verdict; `train`/`eval` report `verdict_conflicts`
  (`--strict-verdicts` aborts). `docs/packs.md`, `docs/offene-entscheidungen.md`.

### 3. Android & Build
- **Inference:** ~16 ms per frame (small model). Execution provider AUTO is correct; leave it.
- **Testing:** Gradle tasks report "up-to-date" even with errors -> always `--rerun-tasks`.
- **UI:** text-first controls need `contentDescription`. Spacing strictly on 12dp tokens (guarded).

### 4. Installation & Hardware
- **Phone: back up `files/` before touching the install:**
  `adb exec-out "run-as com.chesslab.tracker tar cf - files" > files.tar` into
  `data/footage/phone-backups/<serial>-<ts>/`. `adb install -r` with the same key keeps data; a
  signature mismatch or an instrumented test run wipes it. Prefer the emulator
  (`docs/phone-transfer.md`).
- **Undistortion is NOT in the pipeline:** the grid mesh alone gets to ~1 px. The fit lives in
  Kotlin (`LensFit.fitLens`), the model in `lens.json`, the seam is `warp_padded(..., lens=)`; no
  `lens.json` exists, so the value is `None` everywhere. `:desktop undistort` refuses the phone.

## Verification
- **Python:** `uv run pytest`, `ruff`, `vulture` (min_confidence 80).
- **Android:** `gradlew.bat :app:ktlintCheck ...` (check all modules). Emulator via
  `scripts/android-emulator.ps1` (never `installEmulator`, devices are shared).
- **Coverage:** not currently measured; calls and traps in `docs/quality-tooling.md`.
- **References:** `docs/tracker-flow.md`, `docs/occlusion-gate.md`, `docs/tracker-flow.md`;
  regression reference **396/3/0 at 8 desync episodes** (`docs/regression-reference.md`; count
  episodes, not `ALARM latched` lines).
- **Power:** `docs/android-performance.md`. Whoever touches the frame rate must move `motionThr` with it
  (`TrackerService.engineConfig()` scales `x 30 / fps`).
- **Producer order:** `session settle-scan` writes `settle_dev` before `realgames position-flags`
  can lay anything out; an unmeasured cell shows `—`, not `0`. The chain has it as a rung between
  `export` and `matte`.
- **Provenance, not existence:** `pass.json`, `model-reads.jsonl` and `matte.jsonl` carry `_source`
  (`chesslab.provenance`); `chain.ts` compares. A file WITHOUT a stamp stays valid.
- **`.export-running` blocks the follow-up steps** until a new export finishes (`sessions.py`,
  `chain.ts`).
- **`log.jsonl` writers are stamp-guarded** in Python and web: `Contested` instead of overwriting.
- **JSON trustee:** all `.json`/`.jsonl` I/O goes through `chesslab.ioutil`
  (`read_jsonl`, `write_rows`, `append_rows`, `*_guarded`), `platform/app/lib/jsonl.ts` +
  `lib/atomic.ts`, and Kotlin `io/Jsonl.kt`. Never split lines or `appendFile` yourself.
- **Ratchets only shrink:** `tests/json_doors.txt`, `tests/jsonl_readers.txt`,
  `platform/app/jsonl-readers.txt`, `write-doors.txt`, `route-coverage.txt` (0 of 29 routes
  untested) and the comment budgets. `docs/quality-tooling.md`.
- **Replay cache keys on graph AND `config.json`.** Whoever runs an A/B checks the runtime — a warm
  cache looks like a clean "no difference" (`docs/desktop-replay.md`).
- **Temperature is read:** `calibratedConfThr` translates `cnnConfThr` through each model's T;
  `priorOnTempered` makes `prior_lambda` mean what it says (history: `docs/regression-reference.md`).

## Training: der Feed ist nicht mehr der Engpass
- **`--num-workers 2`, not 8** (`config.DEFAULT_NUM_WORKERS` is still 8). Two are cold-safe; more
  only hold memory. The worker count is not a free switch — loss is not bit-identical across counts.
- **Always `--batch-aug`:** augmentation as one GPU batch op, 66x cheaper. Statistically the same
  recipe, not bit-identical (`docs/training-speed.md`).
- **CLAHE belongs in the pack, not the loader** (`chesslab dataset bake`, `docs/packs.md`). Serving
  sees raw camera frames and must compute it itself.
- **Since session packs the floor is the DISK:** the step waits 55–77 % on data; more workers do not
  help (`docs/training-speed.md`).
- **The recipe that is fastest:** `--batch-aug --compile-batch-aug --compile-model --fused-adamw`,
  workers 2 (~30 -> ~11,5 s per epoch). The compile and fused switches stay **default OFF**: the
  stack has Triton since `cf4cba1b`, but `--fused-adamw` moves parameters by ~2e-7 and switching
  silently makes runs incomparable with the archive (`docs/training-speed.md`). The step is
  launch-bound, not compute-bound; the exact fixed-cost numbers do not reproduce — re-measure on a
  quiet machine before quoting (`docs/offene-entscheidungen.md`).
- **Quality:** no measurable difference across three seeds (`docs/training-speed.md`).
- **`best` taugt nicht zum Vergleich:** it is the max over 60 noisy draws. Compare the mean of the
  last 10–20 epochs, paired per seed. Noise is 94 % model, 6 % val — a bigger val does not help.
- **A finished run can block in teardown** (ROCm/Windows): `cli/train.py` leaves with `os._exit`. A sweep
  watches epochs on disk, not the exit code.
- **Times only on a quiet machine,** two warm repeats per arm, discard warm-up epochs.

## Export
- **`Recording.frames(wanted=…)`** instead of filtering yourself (`grab` vs `read`, bit-identical).
  `measure_settle` is exempt: its clusters are gap-free.
- **Boards encode concurrently, `BOARD_WRITERS = 4`** (a frame in flight is 11 MB).
- **Frame phases run in processes (`--workers`, default 4). A seek is NOT exact:** a worker starts at
  the segment boundary (`Recording.segment_base`) and `grab`s forward; split into contiguous
  stretches, never round-robin. **A section never pools its own mesh** — the parent computes it.
- **Rotation:** OpenCV auto-rotates by metadata; `_combined_rotation` merges both, angles ADD.
- **GPU does not help here** (OpenCL transfer, no hardware decode on this machine).
- **Cached mesh map 23 -> 7 s: not re-measured** since `benchmark_export_warp.py` alternates order
  (2026-09-23) — `docs/export-decode.md`.
- **A second export run is faster without being better** (warm-started corners): never A/B two runs
  of the same session.

## Model Guidelines (2026-08-14)
- **BatchNorm Only:** we only use BatchNorm-trained models; others are too slow.
- **Naming Convention:** BatchNorm models must contain `bn` in the filename or path. Does not apply
  to the p4 family — all seven bundled `p4*` models are BatchNorm (`"norm": "batchnorm"` in their
  `config.json`) without `bn` in the name (champion `p4a-80-clahe`).
