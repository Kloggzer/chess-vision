# CLAUDE.md — chesslab (Compressed)

> **Status:** Project in maintenance. Original specs (`specs/`) are historical; current state in `README.md` & `docs/architecture-review/`.

## Mission
- **Goal:** Build an auto-labeled image dataset for recognizing physical chess pieces on a board (fixed camera). Labels derived from FEN (64 examples per photo). Trains a per-square classifier.
- **Tracker:** The experimental move tracker lives in `android/` (Kotlin). The Python `chesslab track` command and its UI were deleted 2026-08-07, `track_feedback.py` with the capture rig on 2026-08-20. Python is dataset building, training and export only.

## Architecture & Data Flow
- **Path:** Camera -> Frame-Diff/Legacy Check -> Commit. The CNN path is asynchronous and sparse. `docs/tracker-flow.md` records a measured break ("no snapshot ever reached the engine"); specs/53 later measured `CnnSnapshot.gridOccluded` reaching the verify ladder in replay, so the break is unconfirmed for live — re-measure before quoting it.
- **Data Pipeline (`docs/data-pipeline.md`):** Sessions → Slice → Crop Pool → Dataset. *Note:* `unusable` flag is not retroactive; Parking does not prune the pool.
- **Board store (2026-08-17):** a session keeps `boards/*.webp` (the rectified frame under its own quad), not source frames — 96 GB → 4.5 GB. It is the raster BOTH `crop_square` and `/api/cell` cut from. The row carries `board_size`/`board_border`; a reader that assumes its own scale cuts up to 59 px off. The board is written STRAIGHT (`realgames.straighten_boards`, 2026-08-21) and the row says so with `board_straightened`; every cut afterwards is a plain rectangle. A hand over the grooves makes a frame's own mesh worse than none (15.6 px against 16.1 raw), so a hand frame borrows the five nearest CLEAN frames' meshes — the camera does not move. Never straighten a second time.
- **Calibration:**
    - optics: measured by `:desktop undistort` into `lens.json`, NOT in the pipeline — see below.
    - `calibrate`: Board geometry (ArUco + Grid-Fit). ArUco is only "Coarse"; Grid provides accuracy. Markerless Cold Start is **not** supported.
- **Synth:** `build-synth` packs renderings directly into Memmap (no files). Rotation-Augment is train-time only.

## Non-Goals & Tech Stack
- **No Deep Learning Board Detection:** ArUco is only coarse correction.
- **No Reinforcement Learning:** Supervised Classification only.
- **Stack:** Python 3.11+, uv, Typer, OpenCV/NumPy/Pillow, python-chess, PyTorch (ROCm/CUDA), Android/Kotlin. License: GPL-3.0.

## Conventions
- **Classes (13 + coverage, 2026-08-18):** `wP`..`bK` + `empty` (`config.IDENTITY_CLASSES`).
  `occluded` is a **regression target**, not a class: `dataset build` defaults to `pieces13` and
  `train` to `--head occlusion`, which reads the manifest's `coverage` and masks every cell over
  `PIECE_VISIBLE_MAX = 0.15` out of the classification loss. Nobody paints occlusion any more —
  the human only checks that the alpha and the shown position are right.
  The 2-class `occupancy` scheme is **gone** (2026-08-20), Python and Kotlin: `--classes` takes
  `pieces13` or `pieces` only (`dataset_build.CLASS_MODES`).
  **Android ships coverage (2026-08-24):** the APK bundles `real14-80` (14-class softmax,
  `occluded` at index 13, the `DEFAULT_MODEL`), `id35-80` (13-class, so `pOccluded` = 0.0),
  `comp13-occ-bn-lr1e2-bs512` and the two newer `real13-ms-*` runs. The latter three declare
  `coverage_output` — 13 class logits plus an INDEPENDENT coverage sigmoid in column 13
  (`Observations.kt`, `Preprocess.kt`): same 14 columns as `real14-80`, different meaning. Where it
  is declared, `TrackerService` switches the model-free arm OFF
  (`runGridOcclusion = coverageOutput != true`); the desktop replay runs both. The two arms have
  never been measured against each other (`docs/class-scheme.md`).
  **The threshold rides in the model, not the engine (2026-08-24):** `coverage_gate` in the
  model's `config.json`, read by `ModelSpec`, applied onto `TrackerConfig.pOccludedThr`. It follows
  from the model's accuracy and differs by a factor of 7 between families — comp13 carries 0.02
  where the real13 runs carry 0.15, both at loss ratio 2 (`docs/occlusion-gate.md`). The old
  constant 0.5 admitted reads that are 84 % wrong. `BUNDLED_MODELS` is hand-maintained: a model
  merely dropped into `assets/cnn_model/` never appears in the picker.
- **Geometry:** Squares `a1`..`h8`; Corners `[a8, h8, h1, a1]`.
- **Config:** Paths/Parameters in YAML. Classes only in `config.CLASSES`.
- **Cache:** per-session crop counts via `manifest_cache.py` (mtime-keyed); its web callers went with the FastAPI layer.
- **Comments:** Target is **3 lines**. Up to **5** when it genuinely does not fit — 5 will be enforced soon. Comments say *why*, never what the code already says. Longer prose belongs in `docs/` with a one-line pointer. **Default is NO comment**: a small function (handler, wrapper, one-purpose helper) whose name plus imports tell the story gets none, and a comment longer than its function is wrong — delete it, don't trim it (User, 2026-08-15: "der kommentar ist länger als die funktion und sagt genau nichts").

## Known Pitfalls (Critical)

### 0. Frame selection (2026-08-18)
- **Measure first, pick after.** `framescan.py` scans every 3rd frame (distilled hand gate
  2,1 ms + grooves 13,6 ms, which only NAME the squares) before anything is chosen; `classify`
  then rules per frame. RT-DETR and `skin_patch` are gone — `docs/hand-gate.md`. The old
  export planned 8 boards per position and flagged afterwards, so a flagged slot went missing:
  20 % of positions kept their 8, now 91 % (`docs/frame-scan.md`).
- **The board is the witness, not the hand.** Labels hold while the position still looks like the
  commit's. A hand over an unchanged board is `occluded` and KEEPS its FEN — that material is what
  the occlusion labels are made of. Only `next_touches` decides `stale`; all 64 cells flagged the
  player's shadow on rank 1 (median 7 cells).
- **`boards/` is the clean p8 stock, `dirty/` the pile**, each row carrying `dirty_reason`.
- **The CELL decides now, not the frame (2026-08-22).** With `settle_dev` on the row and a matte
  beside it, `dirty_reason` only steers what SAM mattes first: a cell over `PIECE_VISIBLE_MAX` keeps
  its FEN label (coverage takes it out of the loss), a visible one is checked against the interval's
  settled board, and one that departs becomes a card on the `Stellung?` lane. That is what rescues
  `stale`/`changed` frames cell by cell (`docs/position-check.md`).

### 0.1 Crop sizes: 128 belongs to `board_size` 928, not to the pool (2026-08-23)
- **Two consumers, two sizes.** `data/crops/<tag>/` at 128 px is the artefact for the
  HUMAN (labeling lane); `packed_images.u8` at the target size is what the MODEL sees.
  Both should be cut FROM THE SOURCE, never one from the other.
- **Why 128:** it is the native crop box of the real export — `board_size` 928, cell 116,
  `pad_side` 0.05 gives 127.6 px, factor 1.000. For a 4K composite the box is 176, for
  1080p it is 90, so forcing 128 there resamples once too often (`docs/data-pipeline.md`
  3.1). Do NOT fix that by changing the pool size — that changes what the labeler sees.

### 1. Model & Normalization
- **Occlusion:** Models without the `occluded` class have `pOccluded = 0.0`. Hand verification must rely on the **MODEL-FREE** arm (`gridOccluded`) because the CNN arm is blind. Measured on 003957's 67-ply reference: 38/67 plies with 4 invented → **67/67 with 0 invented** (raw map), **LCS 65/67** under the adjacency rule. The gate only counts HAND-SHAPED flags (≥ 1 orthogonally adjacent pair): counting any flag blanks a whole replay on one leaning piece (c8), and a count threshold of 3 lets the leaving hand's 2-flag tail commit the fabrication it exists to stop.
- **Normalization:** BatchNorm works well; the learning rate is the critical factor, not the norm choice. Never rank normalizers at one shared rate — sweep the rate per normalizer or do not compare.
- **Metrics:** `val_acc` correlates inversely to the Veto Metric. Use `sweep_infer_size.py`.
- **The settle gate is blind in the dark corner.** The board carries a light gradient (h3 at 156,
  a7 at 20 on 20-41-33), so a black piece on a near-black square moves the score by ~1.5 against a
  threshold of 15. `interval-check.jsonl` measures this per ply instead of hiding it; closing it
  means normalising by the cell's own contrast, not lowering the threshold.
- **Bewertet wird nur, was der Verlust auch lernt (2026-08-24):** der Occlusion-Verlust maskiert
  alles über `PIECE_VISIBLE_MAX`, also zählen `CHECKPOINT_WEIGHTS`, `auroc` und `conf_wrong` nur
  sichtbare Zellen. Über alle Zellen gerechnet sah das Modell 8 Punkte besser kalibriert aus, als
  es ist: verdeckte Zellen sind zu 55–63 % falsch, dabei aber *unsicher*.
  **Arme mit verschieden geschnittenem Val sind auf `piece_acc` gar nicht vergleichbar
  (2026-08-26):** die Ausdünn-Varianten trugen 2,9 % bis 15,0 % verdeckte Val-Zellen, und die
  Rangfolge der Arme war exakt die Rangfolge dieses Anteils — der gemeldete Sieger verschwand,
  sobald alle gegen DENSELBEN Val-Satz auf sichtbaren Zellen gemessen wurden
  (`docs/per-position-mix.md`, Korrektur). `val_visible_piece_acc` steht deshalb in
  `metrics.jsonl`, und Quervergleiche laufen über `chesslab eval --dataset <gemeinsamer>`.
  Aus demselben Grund kommen die Klassengewichte aus den sichtbaren Zeilen — Verdeckung trifft weiß 11–15 %, schwarz
  2–6 % (`occlusion-asymmetry`), die Gewichte in `split.json` liegen sonst bis zu 8 % daneben.
- **Coverage Matte Trap:** `training/torch_data.py:422` defaults unmattered crops to `coverage = 0.0`, making them indistinguishable from genuinely clear squares. Mixing matted and un-matted sessions into one occlusion-head build teaches the head that hands do not exist. Use matted sessions only.

### 2. Data & Splits
- **Ohne Memmap kein Training (2026-08-24):** ein veralteter Pack fiel still auf den Datei-Loader
  zurück — die Folds und die SWA-Läufe liefen dreifach langsam an ihm vorbei, ohne dass es jemand
  sah. `_require_pack` bricht jetzt ab; `--allow-unpacked` nur für Sets unter der Packgrenze.
  **Nach jedem Re-Slice neu packen**, sonst trägt der Pack Pixel von vorgestern.
- **Hard-Negative-Mining auf Trainingsdaten findet fast nur Verdecktes (2026-08-24):** 98,6 % der
  gefundenen Fälle liegen über `PIECE_VISIBLE_MAX` und sind damit aus dem Klassifikationsverlust
  maskiert — sie 4× zu verstärken kostet Sampling-Budget und lehrt den Figurenkopf nichts. Grund:
  auf dem Trainings-Split ist alles Lernbare gelernt, übrig bleibt, was der Verlust nie sah
  (sichtbar UND überzeugt falsch: 156 von 292 105 Zeilen). Mining lohnt nur auf **ungesehenem**
  Material. `scripts/mine_hard_empty.py --dataset <name>` liest Trainings-Split und Memmap statt
  des splitlosen Crop-Pools; `--fresh` verhindert, dass Zeilen aus einem anderen Zuschnitt
  überleben.
- **Reproducibility:** Splits are not deterministic from Params → **always use `split.json`**.
- **Geometry Fix (2026-07-31):** Old dataset was mis-aligned (3-6px Offset). Crops must be re-sliced. Old Path-A numbers are void.
- **Hard Empties:** `hard_empty.jsonl` is global training input. **Park** if not in use (`data/_parked/`).

### 3. Android & Build
- **Inference:** ~16ms per frame (small model). Execution provider AUTO is correct; leave it alone.
- **Testing:** Gradle Tasks are "up-to-date" even with errors → always use `--rerun-tasks`.
- **UI:** Text-first Controls need `contentDescription`. Spacing strictly on 12dp Tokens (Guard enforced).

### 4. Installation & Hardware
- **Phone: back up `files/` before touching the install.** On 2026-08-20 six source videos
  (2.4 GB) existed ONLY on the device, five of them with no backup at all. Back up with
  `adb exec-out "run-as com.chesslab.tracker tar cf - files" > files.tar` into
  `data/footage/phone-backups/<serial>-<ts>/`. Measured the same day: `adb install -r` with the
  SAME signing key **kept** all 39 sessions — what wipes `files/` is a signature mismatch (Android
  then uninstalls first) or an instrumented test run. Prefer the emulator anyway.
- **Undistortion:** the lens model is NOT in the pipeline. Measured 2026-08-21 over three rig
  recordings, hold-out: raw 15.2–16.6 px bow, the grid mesh alone 0.9–1.1, the fitted lens alone
  3.0–4.4, both 0.4–0.7. On a 116 px cell the mesh's 1 px is under a percent, so the lens is not
  worth its own fit per recording. `:desktop undistort` still exists and still refuses the phone
  (k1 ≈ 0). The FIT lives in Kotlin (`LensFit.fitLens`), the model rides in `lens.json`, and
  `warp_padded(..., lens=)` is the seam — nothing passes it today. Python's `lens.py` and the
  whole `calib.npz` path went on 2026-08-21: it solved from many board POSES, which a fixed
  mount cannot give, so it always refused.

## Verification
- **Alarm & Occlusion:** `docs/alarm-path.md` (was den Latch haelt und was er sagt),
  `docs/occlusion-gate.md` (die Schwelle je Modell), `docs/emission-correlation.md` (warum
  Cooldowns keine Unabhaengigkeit kaufen und mehr Reads nichts beitragen).
- **Strom:** `docs/battery.md` — das Messgeraet (`cmd battery get -f current_now`, NEGATIV heisst
  laden), die Aufteilung, und warum die Bildrate der Hebel ist und nicht die Rechenzeit. Wer die
  Bildrate anfasst, muss `motionThr` mitziehen: `TrackerService.engineConfig()` tut das mit
  `× 30 / fps`, und die Kopplung ist am Regressions-Satz gemessen.
- **Python:** `uv run pytest`, `ruff`, `vulture` (min_confidence 80).
- **Producer order:** `session settle-scan` writes `settle_dev`/`settle_seen`; only then does
  `realgames position-flags` have anything to lay out. Without a measurement a cell is not
  undisputed, it is unmeasured, and the lane says `—` rather than `0`.
- **Android:** `gradlew.bat :app:ktlintCheck ...` (check all modules!). Emulator via `scripts/android-emulator.ps1` (never use `installEmulator` due to shared devices).
- **Comment budget:** `CommentBudgetTest` (in `:app`) is a ratchet over all Kotlin modules — enforcement currently fires at **8** consecutive comment lines, target is 3. `android/config/comment-budget.txt` may only shrink; after cleaning a file run `uv run python android/scripts/comment_budget.py`. TS and Python have twins (2026-08-15): `platform/app/lib/comment-budget.test.ts` with `platform/app/comment-budget.txt`, and `tests/test_comment_budget.py` with `tests/comment_budget.txt` — hard limit 5 lines for new files, budget entries may only shrink.

## Model Guidelines (2026-08-14)
- **BatchNorm Only:** We only use BatchNorm-trained models. Others are too slow.
- **Naming Convention:** BatchNorm models must contain `bn` in the filename or path.