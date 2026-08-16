# CLAUDE.md — chesslab (Compressed)

> **Status:** Project in maintenance. Original specs (`specs/`) are historical; current state in `README.md` & `docs/architecture-review/`.

## Mission
- **Goal:** Build an auto-labeled image dataset for recognizing physical chess pieces on a board (fixed camera). Labels derived from FEN (64 examples per photo). Trains a per-square classifier.
- **Tracker:** The experimental move tracker lives in `android/` (Kotlin). The Python `chesslab track` command and its UI were deleted 2026-08-07; Python keeps only `chesslab track-feedback ingest`.

## Architecture & Data Flow
- **Path:** Camera -> Frame-Diff/Legacy Check -> Commit. The CNN path is asynchronous and sparse. `docs/tracker-flow.md` records a measured break ("no snapshot ever reached the engine"); specs/53 later measured `CnnSnapshot.gridOccluded` reaching the verify ladder in replay, so the break is unconfirmed for live — re-measure before quoting it.
- **Data Pipeline (`docs/data-pipeline.md`):** Sessions → Slice → Crop Pool → Dataset. *Note:* `unusable` flag is not retroactive; Parking does not prune the pool.
- **Board store (2026-08-17):** a session keeps `boards/*.webp` (the rectified frame under its own quad), not source frames — 96 GB → 4.5 GB. It is the raster BOTH `crop_square` and `/api/cell` cut from. The row carries `board_size`/`board_border`; a reader that assumes its own scale cuts up to 59 px off. The board is the raw warp — the mesh straightens it at cut time, so never straighten the store too.
- **Calibration:**
    - `lens`: Optical correction (Barrel Distortion) → `data/lens/calib.npz`.
    - `calibrate`: Board geometry (ArUco + Grid-Fit). ArUco is only "Coarse"; Grid provides accuracy. Markerless Cold Start is **not** supported.
- **Synth:** `build-synth` packs renderings directly into Memmap (no files). Rotation-Augment is train-time only.

## Non-Goals & Tech Stack
- **No Deep Learning Board Detection:** ArUco is only coarse correction.
- **No Reinforcement Learning:** Supervised Classification only.
- **Stack:** Python 3.11+, uv, Typer, OpenCV/NumPy/Pillow, python-chess, PyTorch (ROCm/CUDA), Android/Kotlin. License: GPL-3.0.

## Conventions
- **Classes (14):** `wP`..`bK`, `empty`, `occluded`.
- **Geometry:** Squares `a1`..`h8`; Corners `[a8, h8, h1, a1]`.
- **Config:** Paths/Parameters in YAML. Classes only in `config.CLASSES`.
- **Cache:** Web Read-Paths via `manifest_cache.py` (mtime-keyed).
- **Comments:** Target is **3 lines**. Up to **5** when it genuinely does not fit — 5 will be enforced soon. Comments say *why*, never what the code already says. Longer prose belongs in `docs/` with a one-line pointer. **Default is NO comment**: a small function (handler, wrapper, one-purpose helper) whose name plus imports tell the story gets none, and a comment longer than its function is wrong — delete it, don't trim it (User, 2026-08-15: "der kommentar ist länger als die funktion und sagt genau nichts").

## Known Pitfalls (Critical)

### 1. Model & Normalization
- **Occlusion:** Models without the `occluded` class have `pOccluded = 0.0`. Hand verification must rely on the **MODEL-FREE** arm (`gridOccluded`) because the CNN arm is blind. Measured on 003957's 67-ply reference: 38/67 plies with 4 invented → **67/67 with 0 invented** (raw map), **LCS 65/67** under the adjacency rule. The gate only counts HAND-SHAPED flags (≥ 1 orthogonally adjacent pair): counting any flag blanks a whole replay on one leaning piece (c8), and a count threshold of 3 lets the leaving hand's 2-flag tail commit the fabrication it exists to stop.
- **Normalization:** BatchNorm works well; the learning rate is the critical factor, not the norm choice. Never rank normalizers at one shared rate — sweep the rate per normalizer or do not compare.
- **Metrics:** `val_acc` correlates inversely to the Veto Metric. Use `sweep_infer_size.py`.

### 2. Data & Splits
- **Reproducibility:** Splits are not deterministic from Params → **always use `split.json`**.
- **Geometry Fix (2026-07-31):** Old dataset was mis-aligned (3-6px Offset). Crops must be re-sliced. Old Path-A numbers are void.
- **Hard Empties:** `hard_empty.jsonl` is global training input. **Park** if not in use (`data/_parked/`).

### 3. Android & Build
- **Inference:** ~16ms per frame (small model). Execution provider AUTO is correct; leave it alone.
- **Testing:** Gradle Tasks are "up-to-date" even with errors → always use `--rerun-tasks`.
- **UI:** Text-first Controls need `contentDescription`. Spacing strictly on 12dp Tokens (Guard enforced).

### 4. Installation & Hardware
- **Phone Warning:** `adb install` or Test Runs on the phone **wipe data** (`files/`). Backup first! Prefer Emulator.
- **Undistortion:** Must happen in Kotlin, **entirely** over the recording (lens.json). Do not use `calib.npz`.

## Verification
- **Python:** `uv run pytest`, `ruff`, `vulture` (min_confidence 80).
- **Android:** `gradlew.bat :app:ktlintCheck ...` (check all modules!). Emulator via `scripts/android-emulator.ps1` (never use `installEmulator` due to shared devices).
- **Comment budget:** `CommentBudgetTest` (in `:app`) is a ratchet over all Kotlin modules — enforcement currently fires at **8** consecutive comment lines, target is 3. `android/config/comment-budget.txt` may only shrink; after cleaning a file run `uv run python android/scripts/comment_budget.py`. TS and Python have twins (2026-08-15): `platform/app/lib/comment-budget.test.ts` with `platform/app/comment-budget.txt`, and `tests/test_comment_budget.py` with `tests/comment_budget.txt` — hard limit 5 lines for new files, budget entries may only shrink.

## Model Guidelines (2026-08-14)
- **BatchNorm Only:** We only use BatchNorm-trained models. Others are too slow.
- **Naming Convention:** BatchNorm models must contain `bn` in the filename or path.