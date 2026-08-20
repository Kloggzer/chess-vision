# Architecture Issues & Concerns

Consolidated from four subsystem analyses (Core Pipeline, Training, Web, move_tracker/synth/tests),
deduplicated and ordered by severity. Severity levels are calibrated to the real deployment context
(local single-user tool) — "Critical" means: endangers data integrity or the
project goal (reliable move tracking), not "server is on fire".

**Note (2026-08-20):** every finding against `web/*`, `move_tracker/*`, `collect*`,
`experiment.py`, `geometry3d.py` or `photometric.py` is closed by deletion, not by a fix —
C1, H1, H2, H4, H6, M1, M2, M3, M4, the tracker half of C3, and the web halves of M5 and M7.
Read them as a record of what the code once did.

---

## CRITICAL

### C1 — Crop/Photometry Geometry Duplicated Across Label and Inference Paths (Train/Serve Skew)

- **Issue:** The same crop calculation exists in multiple places: `calibration.square_to_crop_box`,
  `labeling.crop_square`/`crops_for_frame`, implicitly in `training/torch_data.py`, and in the
  inference path. This has already manifested concretely: `web/inference.predict_arrays()` applies **no
  photometry** — a model trained with `clahe`/`gamma` photometry produces
  near-random predictions through it, despite its val_acc being 0.6–0.7. This exact effect was
  observed live during the move_tracker CNN test.
- **Impact:** Silent Label↔Inference mismatch. Every new consumer (move_tracker CNN resync!)
  must manually reconstruct the exact slice parity; parameter drift is invisible and manifests
  only as "the model is bad".
- **Location:** `src/chesslab/calibration.py:170`, `src/chesslab/labeling.py:74–134`,
  `src/chesslab/training/torch_data.py`, `src/chesslab/web/inference.py:54–76`
- **Recommendation:** A single function "Frame + Profile + Run-Config → 64 model-ready
  Crops" that applies geometry **and** photometry from the run `config.json`; all consumers
  (slice, web-inference, move_tracker) call only this. See recommendations.md R1.
- **Severity:** Critical

### C2 — Evaluation Design Allows Positional Overfitting (Dataset Architecture)

- **Issue:** In the bake-off and early datasets, each piece type always appears on the
  same rank per session ("a=King, b=Queen, …"), and multiple classes appear in only **one** session
  (split.json warns 12×, Test-Split empty). The model can learn "rank index → piece type"
  instead of visual features; Train and Val sessions share the same geometry.
- **Impact:** val_acc massively overestimates true generalization; board_acc collapses to 0;
  bake-off comparisons (Geometry×Photometry×Head) partially measure noise. This is the
  **main cause of poor move tracking accuracy** (details:
  training-accuracy-improvements.md).
- **Location:** Dataset design; visible in `data/manifests/*/split.json`, `REPORT.md`
- **Recommendation:** New sessions with **random piece-to-rank assignment** per session;
  split validation should hard-fail (not just warn) when a class appears in only one
  session.
- **Severity:** Critical (for the project goal)

### C3 — move_tracker and synthetic Adapter Completely Untested (Data Integrity)

- **Issue:** Not a single test for `move_tracker/` (diff normalization, legal move scoring,
  voting, thread lifecycle) and none for the `synthetic` ingest adapter or the
  JSON format of `render_chessboard.py` — in particular the corner order `[a8,h8,h1,a1]`
  is never validated anywhere.
- **Impact:** A swapped corner order silently rotates/mirrors **all** synthetic labels —
  the model then trains on systematically wrong data. For move_tracker,
  there is zero regression protection for the recently heavily refactored detection algorithm.
- **Location:** `tests/` (missing files), `tests/test_ingest.py` (gap),
  `synth/render_chessboard.py`
- **Recommendation:** `test_move_tracker.py` (pure logic tests: `normalize_diffs`,
  `best_legal_move` with synthetic diffs, voting) and a schema/corner-order test for
  the synthetic adapter (without Blender, against example JSON).
- **Severity:** Critical (synthetic) / High (move_tracker)

---

## HIGH

### H1 — Web Layer: Unsynchronized Module Global State

- **Issue:** `_TRAIN`, `_COLLECT`, `_INFER`, `_MANUAL` (`web/app.py:36–57`) and
  `_STATE["tracker"]` (`move_tracker/app.py:19,35–41`) are read/written from request handlers and
  MJPEG generators without a lock. `BoardTracker.last_corners`
  (`web/camera.py:227–245`) as well.
- **Impact:** Rare in single-user operation, but real: a running MJPEG generator reads
  `_COLLECT` while `collect_finish()` resets it → `None` accesses; two rapid
  `/api/start` calls in move_tracker can leave two capture threads behind.
- **Recommendation:** One `threading.Lock` per state dict; generators copy the state
  once per frame under lock (move_tracker/tracker.py already does this internally — adopt the same
  pattern at the app level).
- **Severity:** High

### H2 — Silent Error Swallowing in the Web Layer

- **Issue:** ~9 locations with `except Exception: pass` character; prominent: auto-slice after
  collect-finish (`web/app.py:794,1008`) reports `sliced=0` on error without naming the error.
  No logging in the entire web layer (a single `print`).
- **Impact:** User believes there are no crops / everything is ok; debugging only by guessing.
- **Recommendation:** At minimum return errors as a field (`{"sliced": 0, "sliced_error": …}`)
  and log via `logging` to stderr.
- **Severity:** High

### H3 — Training Log File Handle Leak (Windows)

- **Issue:** `web/app.py:476–478` opens `web_train.log` and passes it to `subprocess.Popen`,
  but never explicitly closes the handle.
- **Impact:** On Windows, the file may be locked on the next training start;
  closing depends on non-deterministic GC.
- **Recommendation:** Close the handle immediately after Popen (the child holds its own duplicate)
  or close it in `train_status()` when the process ends.
- **Severity:** High

### H4 — Web Imports Private `_load_run` from Training

- **Issue:** `web/inference.py:20` uses `training.evaluate._load_run` — private symbol as a
  layer contract.
- **Impact:** No stable contract between training and consumers; refactoring in training
  silently breaks web/move_tracker.
- **Recommendation:** Export a public function `training.load_run(run_dir) -> (model, cfg)`;
  migrate all consumers.
- **Severity:** High

### H5 — synth Pipeline: Hardcoded Paths, No Orchestration, Hardcoded Resolution

- **Issue:** `render_chessboard.py` expects cwd-relative paths (`data/synth_raw`,
  `synth_assets/Chess Scene.blend`, `synth_pieces/`), fixed resolution 1024px; the four-stage
  pipeline (capture → isolate → fens → render → ingest) is only documented in the operator's head.
- **Impact:** Not reproducible outside the repo root; misoperation silently produces
  wrong data (see C3).
- **Location:** `synth/render_chessboard.py:301,315`, missing `synth/README.md` or
  orchestration script
- **Recommendation:** Paths via `config.Paths`/CLI args; a `chesslab synth` subcommand or
  pipeline script that chains the stages.
- **Severity:** High

### H6 — MJPEG Generator Lifecycle

- **Issue:** All stream endpoints use `while True` generators without `try/finally`; they read
  global state every iteration and do not handle camera errors. Starlette does close generators
  on client disconnect, but synchronous generators in the thread pool may be cleaned up with
  a delay and meanwhile keep `CAMERA.read()` polling alive.
- **Location:** `web/app.py:599–905`, `web/camera.py:210–224`, `move_tracker/app.py:88–98`
- **Recommendation:** `try/finally` around the loops (cleanup/logging), defensively copy state
  once per frame, respond to `None` frames with an error frame instead of endless retry.
- **Severity:** High → Medium (mitigated by Starlette cleanup)

---

## MEDIUM

### M1 — Circular Coupling `geometry3d ↔ labeling`

`labeling.py:21` imports `geometry3d` directly; `geometry3d.py:159` lazy-imports
`labeling._resize_keep_aspect` back. The lazy import masks an incomplete
refactoring. → Move `_resize_keep_aspect` into a utility module (or into geometry3d).

### M2 — No Request Schema (Pydantic) in the Web Layer

POST endpoints take raw `Body(...)` parameters (e.g. `/api/train` with 10+ parameters,
`web/app.py:439–452`). Type errors only surface at runtime, OpenAPI schema is useless for client generation.
→ Pydantic request models, starting with `/api/train` and `/api/datasets`.

### M3 — move_tracker: Monolithic Detection Path, No Observer Seam

`_loop()`/`_try_detect()` (`tracker.py:200–289`) hardwire frame-diff observation, scoring and
voting. The planned CNN resync (second observer) currently has to "squeeze in sideways".
→ Minimal seam: `_try_detect` consults a list of observers (frame-diff, optional CNN),
each providing `(move, score)` candidates.

### M4 — move_tracker: Packaging & Lifecycle

Lives outside `src/`, not in `pyproject.toml`, no CLI subcommand, `stop()` without
`join()` (`tracker.py:198`), defaults only set in the `__main__` path (`app.py:121`).
Fine for a prototype; before integration: move to `src/chesslab/move_tracker/`,
`chesslab track` subcommand, `join(timeout=2)` in stop().

### M5 — Schema/Reader Duplication

Crop parameters as two dataclasses (`config.CropDefaults` + `calibration.CropParams`),
JSONL manifest parsing 3× (dataset, labeling, training/data), Label→FEN logic locally in
`web/app.py:60–84` instead of imported from `labeling`/`config`. → one canonical location each.

### M6 — board_acc as Control Metric Too Strict / Checkpoint Selection Unstable

board_acc (all 64 squares correct) is extremely high-variance with 8–70 Val frames and
poorly informative for early stopping/comparisons; stop epochs fluctuate 31–163.
→ occupancy-weighted metric for checkpoint selection (see training-accuracy-improvements.md).

### M7 — No Structured Logging Project-Wide

Pipeline uses consistent `print` glyphs (`[OK]/[FAIL]`), Web layer almost nothing.
Acceptable for a CLI tool; for the web/tracker daemons `logging` with module loggers is worthwhile.

---

## LOW

- **L1** Frontend polls (1–2.5 s intervals) instead of SSE/WebSocket — fine for local operation.
- **L2** Hand-written `fetch` client, types duplicated in the frontend — OpenAPI client generation
  would be possible (FastAPI already serves the schema), only worthwhile when the API grows.
- **L3** Built frontend assets are committed — deliberate decision (no Node needed to
  run), requires discipline (`npm run build` before commit).
- **L4** DHash size (dataset_build.py:47) and overlay drawing constants hardcoded.
