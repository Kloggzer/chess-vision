# CLAUDE.md — chesslab

> Entry point for AI coding agents. The project is **built and in maintenance** —
> the staged specs in `specs/` (00–06) are the original blueprint and kept as
> historical reference; the current state is documented in `README.md` and
> `docs/architecture-review/`.

## Mission

`chesslab` builds a high-quality, **auto-labeled** image dataset for recognizing
chess pieces on a physical board filmed by a fixed camera, and trains a
per-square classifier on it. Labels are derived from the known game state (FEN,
via `python-chess`) — one photo of a position yields 64 labeled examples.
On top of that, an experimental **move tracker** (`chesslab track`) digitizes
live games without a CNN (frame diff + legality, optional CNN safeguard).

## Current architecture (pointers, not prose)

- `README.md` — user-facing overview, all CLI commands per stage.
- `docs/architecture-review/architecture-overview.md` — component map (Mermaid).
- `docs/move-tracker-flow.md` — tracker detection flow (Mermaid).
- `docs/data-pipeline.md` — **the real-camera data path** (sessions → slice → crop pool →
  dataset → train): what feeds what, what is parked and why, and the behaviours that
  surprise people (train-only dedup, `unusable` not being retroactive, parking that does
  not prune the pool). Read this before touching anything under `data/`.
- `docs/synth-pipeline.md` — synthetic data pipeline (Blender renders → ingest).
- `docs/setup/` — PyTorch backends (ROCm / CUDA / CPU).
- One CLI entry point: `chesslab <command>` (`src/chesslab/cli.py`, Typer).
- **LENS vs BOARD calibration:** `chesslab lens` (`lens.py`) models the camera OPTICS
  (barrel distortion → `data/lens/calib.npz`, applied only in `camera.open_capture`),
  `chesslab calibrate` (`calibration.py`) models the BOARD geometry (ArUco → homography).
  Roll-out order is lens first — a new lens calibration re-stamps all board profiles.
- **Fused synth builds:** `chesslab dataset build-synth` (`synth_build.py`) packs renders
  straight into the memmap — its `mm://` manifest rows have NO files, consumers must read
  the packed memmap. Rotation augmentation is train-time only (`torch_data._RandomRot90`),
  never materialized. Classic `ingest synthetic` remains for small sets / debug overlays.

## Non-goals

- No deep-learning board/corner detection as a hard dependency — ArUco markers
  (per-frame self-calibration) are the primary geometry source; a line-based
  markerless detector exists experimentally (`board_corners_from_lines`).
- No reinforcement learning; piece recognition is supervised classification.

## Tech stack (binding)

Python 3.11+ (dev machine: 3.12), **uv** (`pyproject.toml` is the single
source), Typer CLI, OpenCV/NumPy/Pillow, python-chess, PyTorch + torchvision
(backend per `docs/setup/` — on the dev machine a Windows ROCm stack pinned to
local wheels in `wheels/`), FastAPI/uvicorn + React (Vite) web UI, YAML config,
JSONL manifests. License: **GPL-3.0-or-later** (python-chess is GPL).

## Conventions (project-wide)

- **Language:** code, comments and docs are English.
- **Reproducibility:** capture (`collect`) and labeling (`slice`) are separate;
  slicing is a pure, repeatable step over session logs (frame + FEN + corners).
- **Determinism:** global `--seed` (default 42) for split/sampling/training.
- **Config over code:** paths, class list, crop params, split ratios live in
  `config.py`/YAML. The canonical class list exists in exactly one place
  (`config.CLASSES`).
- **Classes (14):** `empty`, `wP wN wB wR wQ wK`, `bP bN bB bR bQ bK`,
  `occluded` (never from FEN, only from manual labels; `empty`/`occluded` are
  "may be missing" classes).
- **Squares** are referenced as `a1`..`h8`; corner order is `[a8, h8, h1, a1]`.
- **Calibration profiles** are geometry config (board size, orientation, crop
  params), not stored positions — corners are detected per frame from ArUco.
  Missing profiles are auto-created from the camera source
  (`calibration.ensure_profile`); `calibrate auto` is for interactive tuning.
- **Web read paths** go through `chesslab/manifest_cache.py` (mtime-keyed
  aggregates) — never re-read whole manifests per request.

## Known pitfalls (still true)

- **BatchNorm works, and the learning rate is why. A normalizer is never measured at ONE rate.**
  BatchNorm ships: four of the seven bundled models are `"norm": "batchnorm"` (`bn35-80`,
  `bn50-80`, `bn100-80`, and `id35-80`, the 13-class one the device runs) — check with
  `grep -rn '"norm"' android/app/src/main/assets/cnn_model/*/config.json`. On aligned crops at
  3e-03 it is phantom-free, and `occ-v10bn35-13c-hn` reads **0 phantoms / 3 misses**, matching the
  2-class full-width GroupNorm champion at a third of its width. This bullet used to say the
  question was settled *against* BatchNorm on 2026-07-30 across five measured causes
  (`specs/25-normalization-endgame/STATUS.md`); two of those five were measured on the mis-aligned
  corpus and at a rate chosen for GroupNorm, and neither reproduces once both are fixed
  (`specs/32-normalization-on-clean-geometry/STATUS.md`, the current table — read specs/25 only for
  what it measured, not for what it concluded). **The standing trap is the rate, not the norm:**
  GroupNorm's usable band ends where BatchNorm's is still improving, so a comparison that applies
  one rate to both mis-ranks them whichever rate it picks — which is exactly how the wrong answer
  survived from 2026-07-30 to 2026-08-01. Sweep the rate per normalizer or do not compare.
- **`val_acc` does not predict the veto metric — it has ranked runs in REVERSE.** The DSBN run had
  the best start (epoch 0 0.8457) and plateau of any batch-norm run and produced 2.3x the phantoms
  of the worst-starting one. Only `scripts/sweep_infer_size.py --paths a --dataset <ds>` decides
  accuracy. A conclusion drawn from a training log is not a result.
- **A dataset's split is NOT reproducible from its recorded parameters — reuse `split.json`.**
  Verified 2026-07-31 on `occ-real5nd`: same seed, same fractions, same session pool, and
  `assign_sessions_to_splits` returns train 12 / val 1 / test 2 where the file records
  11 / 3 / 1 — no split matches. A plain rebuild therefore trains on different sessions than the
  model you are comparing against, silently. When building a twin of an existing dataset, copy its
  recorded split verbatim; never regenerate it.
- **Class weights and `max_empty_ratio` are functions of the CLASS LIST, not of the corpus.**
  `max_empty_ratio` is relative to the largest *piece* class, so the same ratio drops a very
  different number of `empty` crops for a 2-class and a 13-class build — up to 76 % of the phantom
  defence, as a side effect of nothing but the class list. Inverse-frequency weighting compounds it:
  `empty` goes 0.667 → 0.1026 while pieces get 1.28–9.63.
- **Occupancy from an identity model is structurally biased toward "occupied".** The reader is
  `1 − P(empty) − P(occluded)`, so an undecided 2-class model sits at 0.5 while an undecided
  13-class model spreads 1/13 per class and lands at **0.923** — uncertainty itself reads as a
  piece. Measured on a 13-class run: 1 162 phantoms over 4 687 empty crops, **549 of them with
  `empty` still the argmax**. ~~No recipe or amount of data reaches that half.~~ **Corrected
  2026-07-31: that half is the EASY half.** A hard-negative fine-tune fixed 81 % of the summed-mass
  phantoms against only 21 % of the piece-argmax ones — a summed-mass phantom sits just under
  `P(empty) = 0.5` and needs a nudge, while a piece-argmax one needs an argmax overturned. The
  reader arithmetic is real but it is not a floor. ~~The 13-class model still loses (602 phantoms
  against the 2-class champion's 1, and the margin does not move at all: 0.995 → 0.997).~~
  **Overturned 2026-08-01 on the re-aligned corpus.** `occ-v10bn35-13c-hn` (13 classes, BatchNorm,
  width 0.35, hard-negative fine-tune) reads **0 phantoms / 3 misses**, matching the 2-class
  full-width champion `occ-v9bn-wide` exactly, at a third of its width. Two things had to change
  together: the geometry (every earlier 13-class number is on mis-aligned crops) and the mining
  threshold — the failure is a TAIL, not a floor. 99.1 % of empty crops sit under P(occupied) 0.02;
  the whole error was 150 crops of 73 602, of which 100 sat on DARK squares. Mining only the crops
  that already fail finds 27 of them, a keep-list too small to reach a batch;
  `mine_hard_empty --occ-thr 0.10` takes the tail. Do NOT quote the old numbers.
  See `specs/29-widen-the-output-band/`.
- **Piece identity is ~88 %, not ~40 % — code that assumes the low number is stale.** Measured on
  `occ-v10bn35-13c-hn`, `occ-warm-13c-hn` test, 7 217 occupied crops: 0.882 overall, queens among
  the best classes (wQ 0.890, bQ 0.935), and 0.818 over the Q/R/N/B set a capture tie is between.
  The confusions are B↔R, B↔P, R↔P — never a queen. `VerifySingle`'s KDoc still states "only ~40 %
  on piece type. That asymmetry is the whole design", and several verify rungs are built on it.
  It is why a 2-class model cannot tell `Qxd4` from `Qxe5` (both leave the destination occupied)
  and an identity model can.
- **A mined keep-list never reached training until 2026-07-31.** `dataset_build` honoured
  `manifests/hard_empty.jsonl`, but `run_train` then re-ran `subsample_classes` over the *uncapped*
  manifest without `priority_paths` and drew the mined crops straight back out. Every hard-negative
  mining round before that date — including the 786 hard empties of 2026-07-21 — looked wired up and
  changed no batch. Conversely, since the fix a stray `hard_empty.jsonl` silently alters every
  training run; park it when it is not the experiment.
- **Path-A numbers move with the calibration profile.** The sweep re-cuts crops from the session
  frames through the *current* profile, so a recalibration silently invalidates every earlier
  number without touching a dataset file. Always re-measure the reference in the same run as the
  candidate; never carry a row over from an older table.
- **`--patience` is keyed to `occ_board_acc`, which is floored.** It needs all 64 squares right; at
  `val_acc` 0.93 that is 0.93^64 ≈ 1 %, i.e. structurally 0. A model that has not converged is
  early-stopped *and* has its checkpoint chosen blindly ("best by occ_board_acc=0.0000"). Pass
  `--patience 25` for any run that will sit below ~0.98.
- **The speed cost is LOAD AND HEAT, not the graph.** Measured on the SM8650, same graph, same
  input: **32 ms cool and idle · 66 ms inside the running tracker · 125 ms live at 39–41 °C**
  (max 654). That is the factor of 4, and no graph work reaches it.
- **Do not "fix" the graph fragmentation — it is not a defect.** GroupNorm's
  `InstanceNormalization` decomposition splits the graph into 94 fragments over 47 convolutions, and
  a coalesced graph is **slower**: CPU-only, 1 fragment, 54 ms against XNNPACK's 94 fragments at
  32 ms. XNNPACK's partition boundaries are cheap and its conv kernels more than pay for them.
  NNAPI breaks at the same 46 `InstanceNormalization` nodes and costs 158 ms. The QNN provider is
  not in the binary at all (dropped deliberately in `928a55c`: that AAR carries neither XNNPACK nor
  NNAPI symbols and measured 227 ms against the CPU's 97). AUTO is correct; leave it alone.
- **GroupNorm's per-sample normalisation is load-bearing on this data.** Folding it into a static
  per-channel affine collapses the model — 2 350 phantoms of 4 687 empty crops — because inside a
  single GroupNorm group the per-channel sigmas differ by 9.7x on average and 76x at worst. The fold
  itself works (503 → 89 nodes, all 30 ReLUs intact); the weights simply do not survive it. Combined
  with specs/25 this closes the normalisation question from both sides: a foldable net cannot be
  trained to this quality, and this net cannot be folded.
- **The whole corpus was mis-aligned until 2026-07-31, and it was the thing holding the margin.**
  Every session sat at a 3.2–6.5 px median square-edge offset (one cell = 100 px), the two largest
  worst at 12.2 and 14.8 px max — so every crop ever cut straddled its groove a little. Re-fitting
  all 19 sessions took the champion `occ-v6-f5nd` from 1 phantom / margin **0.316 / 0.512** to
  **0 / 0.050 / 0.093**, misses at zero phantoms 13 → 3, with the corner quads as the only changed
  variable (restoring the backups reproduced the old row exactly). That margin had not moved through
  specs/25, 26, 28 or 29. **Consequence: every dataset holds old-geometry crops and every path-A
  number on record is void** — re-slice, rebuild under a new name reusing `split.json` verbatim, and
  re-mine hard negatives rather than reusing keep-lists that mined this artefact. See
  `docs/data-pipeline.md` §12.
- **An alignment metric must be calibrated against truth, not against a direction.** Until
  2026-07-31 `alignment.square_offsets` collapsed the whole board along each axis, which is exact on
  a translation and **silent on rotation and shear** — 0.01 px reported for a 3.05 px shear. It
  passed every directional test ("the shear is visible") and certified 302 frames whose grid the eye
  can see is wrong. The band-wise version is calibrated to analytic truth in
  `tests/test_alignment.py` (0.05 px mean error bare, 0.18 with pieces). Its one remaining blind
  spot: a uniform SCALE error reads 25 % short, because `line_positions` pins index 0 and 8 at 0 and
  `board_size` — the warp puts them there by construction, so the outer edges, where a scale error
  is largest, are not measurable. Numbers recorded before that date are not comparable to later ones.
- **3D pieces extend upward.** With a non-perpendicular camera the piece image
  overflows its base cell — square crops extend upward (`pad_up`).
- **Class imbalance:** `empty` dominates massively; handled at split/dataset
  time (capping/weights), do not ignore.
- **Never split randomly:** frames of the same session are near-identical →
  data leakage. Split is always **per session**.
- **Orientation:** wrong a8-corner assignment silently transposes all labels.
  `ingest --debug-overlay N` exists to eyeball-check before training.
- **Dedup runs on the TRAIN split only** (`dataset_build.build_dataset`) so `board_accuracy` sees
  complete 64-crop boards. A dataset's `counts.final` is therefore a property of the SPLIT,
  not of the corpus — a bigger train split makes `final` smaller. Never compare `final`
  across datasets with different splits; compare raw rows or phash-unique counts.
- **Perceptual dedup is OFF by default** since 2026-07-30 (`config.DedupDefaults.phash_enabled`).
  At hamming 6 it discarded **54.8%** of the corpus and cost 42 misses against 17 — and none of it
  was a duplicate: of 3,432 collisions, **zero were pixel-identical**. `dhash` compares only the
  sign pattern of a 9×8 thumbnail, so noise, exposure and sub-pixel shift collide. `per_cell_cap`
  still bounds "the piece never moved". See `docs/data-pipeline.md` §5.13.
- **`data/manifests/hard_empty.jsonl` is a GLOBAL training input — park it when not in use.**
  Since 2026-07-31 `run_train` honours the mined keep-list too, not just `dataset_build` (before
  that it honoured neither in practice: the built manifest holds the UNCAPPED rows, so the
  train-time re-subsample re-drew every mined hard negative away — the protection reached
  `split.json`'s counts and never a batch). The fix means the file's mere presence now changes
  which `empty` crops **every** run sees, with no flag and no record in the run config. Park it
  under `data/_parked/` between experiments; a keep-list mined from one model is a hidden variable
  in the next. Current one: `data/_parked/2026-07-31-spec29-01-hard-empty/`.
- **`data/` is gitignored → park, never delete.** Convention: `data/_parked/<date>-<reason>/`
  with a README. A manual park moves pixels only — the rows stay in `squares.jsonl`;
  `sessions.archive_session` is the mechanism that also prunes the pool.
- **Judge a session by unique crops, not size.** Fixed-camera redundancy ranks session size
  almost inversely to information: the 4,992-row session carries 652 unique crops, a
  1,024-row one carries 767. Resolution (px/square, from the log's corners) is the other
  axis — the device sees ~98 px/square.
- **What the model sees is `board_size`, not the camera.** The warp goes through
  `profile.board_size` first (800 on the rig → a 110 px crop box, 1600 on Android → 240), so 128 px
  upsamples here and a 4K session loses 42% of its resolution at that warp. The champion goes
  43 → 19 misses served at 96 instead of 128. The size is a per-model key (`infer_size`, distinct
  from `out_size` = the size the crops were built at) and must be one of the run's `scales` — an
  untrained 80 px costs 133 misses, silently. And note what the splits are: test is one session,
  val is one session *and* the checkpoint-selection set. Details: `docs/data-pipeline.md` §11.

## Verification

- `uv run pytest -q` (or `.venv/Scripts/python.exe -m pytest -q`) must be green.
- `uv run ruff check src tests synth` — lint gate.
- `uv run vulture` — **dead code, but far less of it than the name suggests.** Configured in
  `pyproject.toml` at `min_confidence = 80`, and vulture scores an unused *function* at 60 — so the
  gate does NOT catch an exported function nobody calls, which is the case ruff's per-file `F` rules
  also miss. What survives 80 is unreachable code and unused imports. Measured 2026-08-02: the same
  tree yields **243 findings at 60** (including `unused function 'board_corners_from_lines'`) and
  **zero at the configured 80**. `paths = ["src", "tests", "synth"]` also excludes `scripts/`
  entirely. Keep it silent without a whitelist; do not lower the threshold as a side effect of
  something else — 243 findings is its own project.
- **Gating inside a git worktree tests the WRONG TREE unless you set `PYTHONPATH`.** The shared
  `.venv` holds an editable install pointing at the main checkout, so `pytest` run from
  `.claude/worktrees/<agent>/` imports `chesslab` from the main tree and reports green on code it
  never executed. Use `PYTHONPATH=<worktree>/src .venv/Scripts/python.exe -m pytest -q` there.
- Frontend changes: `cd src/chesslab/web/frontend && npm run build` (output is
  committed under `web/static/`); `npm run lint` must not add new errors; `npm run knip` —
  dead files, exports and dependencies — must stay silent.
- Android: `gradlew.bat :app:ktlintCheck :app:detekt`. Note detekt's unused rules
  (`UnusedPrivateMember`, `UnusedParameter`, `UnusedImports`) only see **private** scope — an
  `internal`/`public` function nobody calls is not detected by anything in this repo.
- **Gradle reports GREEN on stale tasks — pass `--rerun-tasks` when the gate is the point.**
  Up-to-date checks key on inputs Gradle knows about, and a test whose *assertion* you changed can
  sit `UP-TO-DATE` behind an unchanged classpath. Measured 2026-08-02: a plain
  `gradlew.bat :app:ktlintCheck :app:detekt :core-engine:test :app:testDebugUnitTest` reported
  BUILD SUCCESSFUL while `ModelSpecTest` was in fact red; the failure only surfaced with
  `--rerun-tasks`. Use it for the final gate of a change, not for the inner loop.
- **The documented Android gate does not cover `:core-engine:detekt`, and that task is red.** Two
  `MagicNumber` hits in `DecisionLog.toLogLine`, pre-existing. Widening the gate means fixing them
  first; `specs/35-one-seam-per-concern` phase 00 moves that function, so do it there.
- Do not commit `data/`, `scans/`, `synth_pieces/`, `wheels/` (gitignored).
