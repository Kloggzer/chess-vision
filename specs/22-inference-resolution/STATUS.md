# STATUS — 22 inference resolution

Branch: `spec-22-inference-resolution` (from `spec-20-recovery-honesty`).
This file is the ONLY hand-off between agents. Append to your own phase's row and to the session
log; never rewrite another phase's entry.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | Is 96 px the model's optimum or the test session's? | done | phase-00 agent | **Verdict: R-NATIVE** (`best(test)`=96, `best(val)`=128). Premise confirmed on the serving path. `scripts/sweep_infer_size.py`. Phase 01 may proceed. |
| 01 | `infer_size` as a per-model config key; export + serving read it | done | phase-01 agent | Contract shipped, 5 commits. Reader `torch_data.infer_size_of` (:143), writer/validator `evaluate.untrained_size_error` + `run_export(infer_size=)`, `export --infer-size WxH`, `RunSpec.infer_size`. `occ-v4-f3e20` re-exported: graph `[64,3,96,96]`, `config.json` carries `[96,96]`. **`train.py` NOT touched** (see discrepancy 12) — new runs still rely on the `out_size` fallback. |
| 02 | Android reads it; the 128 guard becomes a graph assertion | done | phase-02 agent | 3 commits. `ModelSpec.parse` reads `infer_size` (fallback `out_size`), `CROP_SIZE` deleted, band `32..512`; `SessionRunner.declaredInputShape` + assertion in `OnnxSquareClassifier`'s `init`. Asset re-exported at **128** — `model.onnx`/`model.qnn.onnx` came back **byte-identical**, only `config.json` gained the key. Crop PRODUCER still sizes from `CalibrationProfile` (discrepancy 18). |
| 03 | Document the discovery | done | phase-03 agent | Docs only, 2 commits. `docs/data-pipeline.md` §11 (+ §2 correction, §10 pointer), `CLAUDE.md` pitfall, `README.md` Stage 5. Step 3 **skipped**: `architecture-overview.md` names neither `128` nor `out_size`. Android crop box is **240 px, not 220** (see discrepancy 8). |

States: `todo` → `in progress` → `done` | `blocked`.

**00 → 01 → 02 is strictly sequential. 03 may run alongside 02.**

## What is already established (do not re-establish)

Measured 2026-07-29 on the current branch. All numbers are `occ-real3`, test split = 4 736 crops
(3 021 empty / 1 715 occupied), 74 boards.

- **Resolution curve of `occ-v4-f3e20`** (multi-scale GroupNorm champion): 32 px 227/0, 64 px
  39/0, **96 px 18/0**, 128 px 43/0 (misses/phantoms). ⚠ **This was measured by shrinking the
  128 px crops on disk** (`F.interpolate`, no antialiasing), not by cutting the square out of the
  warped board at 96 — which is what `crops_for_model` does when serving. Phase 00 re-measures on
  the real path before anything is built on this number.
- **Native resolution per session**, from the corner quad in `data/sessions/<id>/log.jsonl`
  (mean edge / 8): test split `20260708-021722` = **96.9 px/square**; val split
  `20260721-212830` = **173.2**; training `-193821` 116.0, `-194538` 114.7, `20260630-080531`
  213.8, `-014453` 214.0, `20260708-195420` 103.3, `20260709-141209` 102.3.
  **Each split is exactly one session.**
- **Low-resolution SOURCES are not the problem.** Degrading the content (down to s, back up to
  128) barely moves anything: GroupNorm 43 → 47 misses from a 128 px to a 32 px source. What the
  earlier curve measures is inference at a smaller tensor, which is a different question.
- **Export cost, same chain, norm differs**: GroupNorm 503 nodes / 35.1 ms per 64 crops, BatchNorm
  89 nodes / 6.6 ms (desktop CPU, ratio transfers, absolute ms do not). Both scale near-linearly
  with batch: 64 → 4 crops is 9.6× / 10.5×.
- **GroupNorm stays.** Full norm × multi-scale matrix, phantoms at a matched 43 misses: GroupNorm
  multi-scale **0**, BatchNorm single-scale 2, GroupNorm single-scale 7, BatchNorm multi-scale
  293. Multi-scale HELPS GroupNorm (43 vs 82 misses) and poisons BatchNorm — it normalises per
  sample, so extra scales are pure augmentation. Runs: `occ-v4-f3e20`, `occ-v4bn1-f3`,
  `occ-v4gn1-f3`, `occ-v4bn-f3`.
- **`--scales` must stay in the training recipe.** Dropping it costs both norms their
  resolution-agnosticism: at 64 px input, single-scale GroupNorm goes to 347 misses / 599
  phantoms. Serving at 96 is only possible *because* 96 was trained.
- **The parity CNN fixtures are synthetic.**
  `android/core-engine/src/test/resources/parity/_cnn/meta.json` says
  `"synthetic probabilities — no trained model is involved"`, so inference resolution cannot
  affect them.
- **Misses are the dangerous direction**: a miss licenses a fabricated capture and cascades
  (MEMORY: `occupancy-miss-vs-phantom`). Never select on total accuracy alone.

## Open questions this pack does NOT answer

- **The phone's own framing (~209 px/square) has never been measured against the resolution
  curve.** Phase 02 sets the fixed rig to 96; whether the phone should follow depends on phase
  00's verdict and is a separate measurement.
- **The 4-crop verify batch** (35.1 ms → 3.67 ms per call on desktop CPU) is a bigger change,
  blocked by `require(crops.size == batch)` and `ONNX_BATCH = 64`. Deliberately out of scope.
- **Whether `occ-v4-f3e20` should replace the bundled model** (43/0 against the shipped 95/152) is
  a model decision, not a resolution decision. Record it, do not act on it.
- **GroupNorm on the QNN HTP is not actually ruled out**: ORT's own QNN builder supports the
  rank-3 `InstanceNormalization` the decomposition emits, the shapes fold static under
  `ORT_ENABLE_BASIC`, and the 227 ms measurement that condemned it was taken on the ReLU-less
  model since fixed. Nobody needs it if a 4-crop verify costs ~10 ms on the CPU.

## Phase 00 — the measurement

Tool: `scripts/sweep_infer_size.py` (committed). Run:

```
.venv/Scripts/python.exe scripts/sweep_infer_size.py --log data/_perf/sweep_infer_size.log
```

`device=cuda` (ROCm), one process, `--num-workers 2`, batch 256, ~5 min wall clock. Two models ×
two splits × seven sizes × two paths.

- **path A (authoritative)** — crops cut from the session frames at each size via
  `labeling.crops_for_frame(..., out_size=(s, s))`, then `serving.predict_arrays`. The serving path.
- **path B (cross-check)** — the dataset's 128 px crops through
  `eval_transform_for(cfg, out_size=(s, s))`.

Columns: `miss` / `phan` = argmax misses (occupied read as empty) / phantoms (empty read as
occupied). `ph@43` = phantoms while misses are held ≤ 43 (the matched operating point). `m@0ph` =
misses at the most permissive phantom-free threshold.

### `occ-v4-f3e20` (multi-scale GroupNorm champion) — the run the verdict rests on

**test = `20260708-021722`, camera 96.9 px/square, 4 736 crops / 74 boards / 1 715 occupied**

| size | A miss | A phan | A ph@43 | A m@0ph | B miss | B phan |
|---|---|---|---|---|---|---|
| 48 | 916 | 0 | 1185 | 498 | 924 | 0 |
| 64 | 38 | 0 | 0 | **0** | 37 | 0 |
| 80 | 133 | 1 | 7 | 160 | 139 | 0 |
| **96** | **19** | **0** | 0 | 2 | 21 | 0 |
| 112 | 17 | 1 | 0 | 34 | 14 | 1 |
| 128 | 43 | 0 | 0 | 28 | 43 | 0 |
| 160 | 53 | 0 | 0 | 4 | 52 | 0 |

**val = `20260721-212830`, camera 173.2 px/square, 4 992 crops / 78 boards / 1 546 occupied**

| size | A miss | A phan | A ph@43 | A m@0ph | B miss | B phan |
|---|---|---|---|---|---|---|
| 48 | 501 | 100 | 1161 | 1132 | 489 | 94 |
| 64 | 6 | 55 | 6 | 206 | 6 | 50 |
| 80 | 101 | 45 | 104 | 1004 | 98 | 34 |
| 96 | 14 | 23 | 1 | 51 | 12 | 15 |
| 112 | 2 | 59 | 2 | 104 | 2 | 58 |
| **128** | **29** | **0** | 0 | 29 | 29 | 0 |
| 160 | 67 | 1 | 1 | 141 | 69 | 1 |

### `occ-r3s-f3` — the currently BUNDLED run (see discrepancy 1)

| size | test A miss/phan | test A ph@43 | val A miss/phan | val A ph@43 |
|---|---|---|---|---|
| 48 | 306 / 1325 | 2557 | 368 / 2540 | 3393 |
| 64 | 98 / 254 | 350 | 18 / 141 | 99 |
| 80 | 65 / 390 | 410 | 69 / 125 | 156 |
| 96 | 74 / 243 | 275 | 1 / 9 | 0 |
| 112 | 89 / 250 | 290 | 0 / 27 | 0 |
| 128 | 95 / 152 | 201 | 0 / 19 | 6 |
| 160 | 120 / 105 | **145** | 79 / 29 | 33 |

Its 95 / 152 at 128 px on test reproduces the shipped number already in this file exactly.

### The verdict — **R-NATIVE**

Decision rule applied literally: `best(split)` = the size with the fewest misses **at zero
phantoms**, path A.

- `best(test)` = **96 px** — zero-phantom sizes are {48, 64, 96, 128, 160} and 96 has the fewest
  misses (19, against 43 at 128).
- `best(val)` = **128 px** — 128 is the *only* zero-phantom size on val.

`best(test) ≈ 96` and `best(val) ≥ 128` → **R-NATIVE**. `infer_size` is a per-deployment value:
**96 for the fixed rig**, and the phone's value must be measured separately before it is changed
from its current 128. **Phase 01 may proceed** — both candidate rules give 96 for the fixed rig, so
the code change phases 01–03 implement is the same either way.

The pack's premise survives the re-measurement: the 43 → 18 gap is **real on the deployment path**,
19 / 0 at 96 px against 43 / 0 at 128 px with the crops cut straight from the frame. It is not an
artefact of shrinking an already-128 px crop.

**Where the verdict is weak, stated plainly.** The rule fires R-NATIVE on the val leg, and the val
leg is confounded: `best.pt` is the epoch that maximised `checkpoint_score` on the **val** split
(`training/train.py:402-403`, `evaluate_dataset` called with no `input_size`, i.e. **at 128 px**).
Val@128 is literally the checkpoint-selection objective, so val being uniquely phantom-free at 128
is what selection alone would produce. The spec warned against the train split for being seen; val
is seen too, by checkpointing. The **test** leg is clean; the val leg should be re-measured on a
session that never selected a checkpoint before anything is built on "128 for a 173 px source".

Two readings of "fewest misses at zero phantoms" that were *not* used, and what they would give:
plain argmax minimum ignoring phantoms → 112 px on **both** splits (17 and 2 misses, but 1 and 59
phantoms; 112 is not a trained scale); minimum of the `m@0ph` column → 64 px on test (0 misses at 0
phantoms) and 128 on val. Both would have forced STOP. The reading used is the one that matches how
every number already in this file is written (argmax counts, phantoms happening to be zero).

### Cause attribution — the three named alternatives

**(b) "the crop pipeline loses detail when it goes through 128 first" — FALSIFIED.** This was the
deeper of the two suspected flaws and it is not there. Path A and path B agree at every trained
scale within ≤ 4 misses out of 4 736 crops: at 96 px on test, 19 / 0 re-sliced against 21 / 0
resized; at 128 px they are identical by construction. Only the two sizes where the model is
falling apart anyway (48, 80) diverge more (≤ 12). The mechanism is discrepancy 2: the profile warps
to `board_size = 800`, so the crop box is **110 px in both paths** and 110 → 96 differs negligibly
from 110 → 128 → 96. Nothing is recovered by re-slicing.

**(c) "the test session's native 96.9 px/square is being fitted" — NOT the driver.** The bundled
run `occ-r3s-f3` has the same backbone, norm, `scales` and dataset, and was scored on the **same**
96.9 px/square session — and it prefers *more* pixels: phantoms at a matched 43 misses fall
monotonically 275 @ 96 → 201 @ 128 → 145 @ 160, and it has no zero-phantom size at any resolution.
If the source resolution were what the curve tracked, both models would track it the same way. The
96 px / 96.9 px-per-square coincidence is a coincidence.

**(a) "the network genuinely prefers 96" — SUPPORTED, but per model and per source.** It is
`occ-v4-f3e20`'s preference on the 1080p session. Its preference on the 4K session is 128, and the
other model's preference runs the other way on both. That is exactly why the value belongs in a
model's own `config.json` rather than in a constant — which is what phase 01 builds.

### A finding the pack did not ask for: untrained sizes are dangerous

The curve is violently non-monotone, and the damage sits precisely at the sizes the runs never
trained (`scales: [32, 64, 96, 128]`). `occ-v4-f3e20` at **80 px** reads **133** occupied squares as
empty on test and 101 on val — worse than *both* neighbours, 64 px (38 / 6) and 96 px (19 / 14). At
48 px it collapses to 916 / 501. Phase 02's planned sanity band `require(outWidth in 32..512)` would
accept 80 px and silently lose 100+ squares per split. **`infer_size` must be one of the run's own
`scales`**, and that is worth asserting rather than assuming — recommended for phase 01, not
implemented here.

### Discrepancies between the spec pack and the code

1. **The bundled run is `data/models/occ-r3s-f3`.** The spec's `grep '"resumed_from"'` recipe
   matches **eight** runs (`occ-act-f3`, `occ-act-p2`, `occ-r2-f3`, `occ-r3-f3`, `occ-r3bn-f3`,
   `occ-r3s-f3`, `occ-r3sbn-f3`, `occ-r3w-f3`). Identified instead by byte-identity: `occ-r3s-f3`'s
   `config.json`, `model.onnx` and `model.qnn.onnx` are sha256-identical to the assets under
   `android/app/src/main/assets/cnn_model/`. Phase 02 should use that check, not the grep.
2. **The camera's native resolution never reaches the model, and this is the strongest argument in
   the pack.** `crops_for_frame` warps to `profile.board_size` first. Profile `phone` — which BOTH
   sessions use — has `board_size: 800`, so both the 96.9 px/square and the 173.2 px/square session
   arrive at the crop stage at **100.0 px/square**, and `crop_square` cuts a
   `cell * (1 + 2 * pad_side)` = **110 px** box which is then resized to the model's input. So 128 px
   **upsamples** on the fixed rig. Meanwhile `config.DEFAULT_BOARD_SIZE` and Android's
   `TrackerConfig.boardSize` are both **1600** → a 220 px crop box → the phone **downsamples** to
   128. The quantity that matters is `board_size / 8 * (1 + 2 * pad_side)`, not px/square at the
   sensor. Phases 01–03 should say that instead of "the camera delivers ~97 px/square".
3. **"then `predict_arrays`" is not directly possible.** `serving.predict_arrays` reads its target
   size from `cfg["out_size"]` and would resize the freshly sliced s×s crops straight back to 128;
   and `serving.load_run` prefers a `model.onnx` whose input shape this exporter bakes static at
   `[64, 3, 128, 128]`. The script therefore loads the torch weights via
   `training.evaluate.load_run` and seeds `serving._CACHE` with a per-size cfg, plus
   `CHESSLAB_DISABLE_CUDA_GRAPH=1` (the CUDA-graph fast path caches one fixed input shape per run).
   That seam is precisely what phase 01's `infer_size` removes.
4. **The val split is 78 boards / 4 992 crops, not 79.** The session log has 79 rows, one flagged
   `unusable`, which `slice_session` skips. Test is 74 / 4 736 as documented.
5. **"misses at the largest phantom-free threshold" is degenerate** — t → 1 is phantom-free and
   misses everything. Implemented as the most permissive (smallest) phantom-free threshold.
6. `--num-workers` defaults to **2**, not the 4 named in the entry file's heavy-compute contract:
   two concurrent DataLoader sweeps at 4 workers deadlocked this machine earlier the same day.
7. The entry file's **18** misses @ 96 px comes out as **19** on path A and 21 on path B; 43 @ 128 px
   reproduces exactly. The difference is resampling (`F.interpolate` vs a direct crop / PIL resize),
   not a different conclusion.
8. **Android's crop box is 240 px, not the 220 the pack says** (found by phase 03). `entry.md` and
   `03-document-the-discovery.md` compute `1600/8 × 1.10` — but 1.10 is the *rig profile's*
   `pad_side = 0.05`, and Android does not use it. `BoardGeometry.padSide` and
   `CalibrationProfile.padSide` both default to **0.10** (matching `config.CROP.pad_side = 0.10`,
   `config.py:88`), so the phone's box is `1600/8 × 1.20 = 240 px`. The direction of the claim is
   unaffected — the phone downsamples to 128 where the rig upsamples, by 1.9× rather than 1.7×. The
   rig's 110 px is confirmed exactly, by `square_to_crop_box('e4', load_profile('phone'),
   clamp=False)` → `(395, 395, 505, 505)`. **Phase 02 should write 240, not 220.**
9. **`docs/data-pipeline.md` §9 lists different px/square figures for the same sessions** (127.1 and
   119.3 for `20260721-194538` / `-193821`, against this file's 114.7 / 116.0) because it measured
   over *all* frames on 2026-07-27 while `px_per_square` reads the **first** logged quad. Re-measured
   2026-07-30: the quad drifts within the two lighting captures (first frame 114.7 / 116.0, mean over
   all frames 125.4 / 122.9) and is stable to under 1 % in every game session, including both split
   sessions (test 96.9 / 96.9, val 173.2 / 174.9). Neither table is wrong; the frame has to be named.
   Recorded in §11.2.
10. **The repo carries two numbers for "what the phone sees"** and phase 03 did not reconcile them:
    `docs/data-pipeline.md` §2/§9 and `CLAUDE.md` say ~98 px/square (that is the phone as a **1080p
    feed into the Python pipeline** — the sessions measure 96.9–103.3), while `config.py:68-71` and
    this file's open questions say ~209 px/square (the **Android app's own capture**). §2 was
    narrowed to "sessions captured with the phone as a 1080p feed" rather than "the deployed device";
    the 209 has still never been measured against the resolution curve.
11. `training/train.py:402-403` holds: `:402` is the `evaluate_dataset(model, val_ds, …)` call with
    **no** `input_size` (so val is scored at the crops' 128 px — `engine.evaluate_dataset`,
    `training/engine.py:20-21`), `:403` the `checkpoint_score(val_rows, …)`, and `best.pt` is written
    at `:423-426` when that score improves. The docs cite the symbols, not the line numbers.
12. **Phase 01's own file contradicts itself about `train.py`** (found by phase 01, and it changes
    the contract phase 02 reads). "Exactly two writers" names `training/train.py` as the one that
    writes `infer_size` at run creation, while the same file's *What must NOT change* says "If you
    find yourself editing `train.py`, stop — you are outside this phase" and *Do NOT* repeats it;
    the ownership registry in `entry.md` does not list `train.py` for phase 01 either. The
    prohibition was followed. **Consequence:** the writers are the **exporter** and **a human
    editing `config.json`**; a freshly trained run carries no `infer_size` key and is served at its
    `out_size` through the documented fallback. Adding the key at run creation is a one-line change
    in `train.py:364` (`"scales": scales` sits there) and belongs to whoever owns `train.py` next.
13. **`infer_size_of` lives in `training/torch_data.py` as specified, and that module imports
    `torch` at module level.** `serving.run_spec` previously touched no torch-bound module, and
    `serving`'s docstring promises "torch/PIL only lazy-imported in function bodies". The import is
    therefore inside `run_spec`'s body — importing `serving` is still torch-free, but *calling*
    `run_spec` now pulls the torch stack in on first use. Checked: no web route calls `run_spec` or
    `model_classes` (`grep -rn "run_spec\|model_classes" src/chesslab/web` → only
    `serving.clear_cache()`), the callers are `move_tracker/cnn_recovery.py:171`,
    `move_tracker/tracker.py:3949` and `scripts/sweep_infer_size.py`, all of which already hold
    torch. Left as the spec wrote it rather than relocating the one reader.
14. **The validator cannot be the literal snippet in the phase file.** `if scales and (w not in
    scales or h not in scales)` rejects every legacy non-square run: `out_size` is `[96, 128]` in
    several configs (and in the tests), so an ordinary re-export with no `--infer-size` would fail
    on `96 x 128` against `scales`. `evaluate.untrained_size_error` therefore returns None when the
    requested size **is** `out_size` (nothing new is being asked of the model) and only then checks
    squareness, `scales` presence (no `scales` ⇒ single-size run ⇒ must equal `out_size`) and
    membership. The 80 px message is verbatim from the spec. Verified against the real run:
    `--infer-size 80x80` on `occ-v4-f3e20` prints
    `not one of this run's trained scales [32, 64, 96, 128]` and exits 1 **without** writing the
    key or the graph.
15. **`data/models/occ-v4-f3e20/model.onnx` did not exist** before this phase — the run had only
    ever been evaluated from `best.pt`, so the acceptance criterion's `onnx.load` had nothing to
    load until the export ran. It exists now, at `[64, 3, 96, 96]`, and the run's `config.json`
    carries `"infer_size": [96, 96]`. `out_size` stayed `[128, 128]`. Nothing under
    `android/app/src/main/assets/` was touched — the bundled `occ-r3s-f3` is phase 02's.
16. **`build_model_card`'s new `infer_size` is an optional keyword** (default `None` ⇒ `out_size`),
    not a required one, because `tests/test_training.py:61` calls it positionally-by-keyword without
    it and that file is outside this phase. The card always writes the key.
17. Line drift, recorded once: `run_export` is at `evaluate.py:161` (spec says `:135`), the export
    CLI command at `cli.py:651` (`:650`), `predict_arrays` at `serving.py:340` (`:329`),
    `predict_rows` at `:431` (`:413`). Symbol names all matched.
18. **Android is size-agnostic downstream of the crop, not upstream of it — the app holds a SECOND
    input size and phase 02 could not remove it.** `preprocessInto` takes `outW`/`outH` as the
    phase file says, but it does **not** resize: it requires `crop.width == outW`
    (`core-cnn/.../Preprocess.kt:161`). The crops arrive already scaled, and their size comes from
    `CalibrationProfile.CropParams.outW/outH`, **hard-defaulted to 128**
    (`app/.../tracker/geometry/CalibrationProfile.kt:32-33`) → `BoardGeometry.outW`
    (`core-geometry/.../Corners.kt:67`) → `cropSquare`'s `resizeKeepAspect(region, geom.outW,
    geom.outH)` (`core-geometry/.../Crops.kt:88`). Nothing wires `ModelSpec` into that path. So
    staging a 96 px model into `assets/cnn_model/` today would attach fine (the graph and the spec
    agree) and then die on the first observation with `crop 0 is 128x128, expected 96x96` — **loud,
    not silent**, and never wrong pixels. Serving the phone at another size therefore needs the
    profile's crop size to follow the spec as well; that is a `CalibrationProfile` / persisted-
    schema change, outside this phase's files, and it is the concrete work item behind the open
    question "what should the phone use".
19. **The graph's shape can only be read where the session is, so the assertion needed three lines
    in `OrtSessionRunner.kt`** — a file the ownership registry does not list for phase 02 (it lists
    `OnnxSquareClassifier.kt` "graph-shape assertion only"). The `SessionRunner` interface itself
    lives in `OnnxSquareClassifier.kt`, so the seam and the assertion are in the owned file; only
    `override val declaredInputShape = (session.inputInfo[inputName]?.info as? TensorInfo)?.shape`
    is in the runner. No other phase owns that file.
20. **A Gradle `-D` does not reach the test JVM**, so "point the seam test at a temp dir" cannot be
    done with a flag: `app/build.gradle.kts:54-68` exists precisely because the three
    `chesslab.sim*` properties have to be forwarded explicitly. Rather than add a fourth forwarding
    line to a build file this phase does not own, the seam test discovers optional model
    directories under `app/build/extra-cnn-models/*/` (gitignored, wiped by `clean`). The 96 px
    `occ-v4-f3e20` export was dropped there and the test **ran, did not skip** (`skipped="0"` in
    `TEST-…ModelSpecGraphSeamTest.xml`). A tree without that directory reports the test as
    **skipped**, so the orchestrator's full-suite run will show one skip unless the directory is
    rebuilt — the recipe is in the test's KDoc.
21. **The stale 220 px survives in code phase 02 may not edit.** Per discrepancy 8 the phone's crop
    box is 240 px, and `docs/` says so, but `training/torch_data.infer_size_of`'s docstring still
    reads "110 on the fixed rig, **220** on the phone" (phase 01's file, `src/chesslab/` is out of
    scope here). `cli.py`'s `--infer-size` help only names the rig's 110 and is fine. Left for
    whoever next owns `src/chesslab/`. The Kotlin side written in this phase says 240.
22. **The re-export is byte-identical, which is stronger than the acceptance criterion asked for.**
    The criterion only requires the graph's input shape to be unchanged; in fact
    `sha256(model.onnx)` = `220eb219…` and `sha256(model.qnn.onnx)` = `0b8a3220…` **before and
    after** `export --format all --infer-size 128x128` (torch's trace is deterministic and
    `_calibration_rows` picks the same 128 crops), so "no behavioural delta" is exact, not
    approximate. Only `config.json` changed, by the five lines of the new key.
23. `ModelSpecTest.rejectsOutSizeOtherThan128` was a test **of the deleted guard** — it asserted
    that a 96 px model is refused. Replaced by the three the phase file asks for. Also
    `BundledGraphShapeTest` still hard-codes `[64, 3, 128, 128]`: left alone on purpose, its
    concern is that the batch dim is not dynamic (three shipped regressions), and the new seam test
    is what checks the size against the config rather than against a literal.
24. **The acceptance criterion `grep -rn "CROP_SIZE" android/` still prints hits** — every one of
    them a **stale binary under `android/app/build/`**: the release variant's `classes.jar` and
    `ModelSpecKt.class` (never recompiled, this phase only built debug), `app-debug.apk` and the
    dex from an earlier `assembleDebug`, and Kotlin's incremental-compilation lookup tables, which
    record a symbol's *deletion*. Not one source file matches: `git grep -n "CROP_SIZE" -- android/`
    exits 1, and so does the same grep with `/build/` filtered out. Use `git grep` (or `--include`)
    when re-checking; `build/` is gitignored and its contents are not this branch's state.

## Session log

<!-- Append: date — phase — what was measured/changed — the numbers — what is left. -->

- **2026-07-30 — phase 00 — measurement only, nothing fixed.** Wrote and ran
  `scripts/sweep_infer_size.py` (both paths, 2 models × 2 splits × 7 sizes; log at
  `data/_perf/sweep_infer_size.log`, gitignored). **Verdict R-NATIVE**: `best(test)` = 96 px
  (19 misses / 0 phantoms, against 43 / 0 at 128), `best(val)` = 128 px (29 / 0, the only
  zero-phantom size). Native resolutions recorded: test session `20260708-021722` = **96.9**
  px/square, val session `20260721-212830` = **173.2**. The pack's premise **survives on the real
  serving path** — the 43 → 19 gap is there when the crop is cut straight from the frame, so it is
  not an artefact of shrinking a 128 px crop. Cause attributed to **(a)** the network's own
  per-model preference: path A ≡ path B within 4 misses at every trained scale (kills **(b)**), and
  the bundled `occ-r3s-f3` on the *same* 96.9 px/square session prefers *more* pixels, 275 → 201 →
  145 phantoms at matched misses for 96 → 128 → 160 (kills **(c)**). Two caveats to carry forward:
  the val leg is confounded because `best.pt` is selected on val at 128 px, and the camera's
  px/square never reaches the model at all — profile `phone` warps both sessions to 100 px/square
  and the crop box is 110 px, so the deployment quantity is `board_size`, and the phone's
  `boardSize = 1600` downsamples where the rig upsamples. Also found: untrained sizes are unsafe
  (80 px = 133 misses between neighbours at 38 and 19), so `infer_size` should be constrained to the
  run's own `scales`. **Left for 01:** implement `infer_size`; consider asserting membership in
  `scales`. **Left for 02:** the bundled run is `occ-r3s-f3` (sha256-identical assets), and it is
  the model whose curve runs the *other* way. Re-exporting it at 96 px is a genuine trade, not a
  win: on test it goes from 95 misses / 152 phantoms at 128 px to **74 misses / 243 phantoms** at
  96 px — fewer of the dangerous direction, 91 more of the cheap one, and worse at the matched
  operating point (275 vs 201 phantoms at ≤ 43 misses). Flagged, not acted on.

- **2026-07-30 — phase 03 — docs only, no code touched.** Two commits: `docs(data): what the camera
  delivers vs what the net is fed` (`docs/data-pipeline.md` — new **§11** in six parts: the warp
  chain and the two live crop boxes, how to measure a session's native resolution and why it is
  still worth it, the split table, `out_size` vs `infer_size`, the untrained-size trap, the
  one-sentence trap; plus a correction to §2's "resized to 128×128" claim and a §10 pointer) and
  `docs: infer_size is a per-model key; the splits are single sessions` (`CLAUDE.md` pitfall bullet
  next to "Judge a session by unique crops"; `README.md` Stage 5, under the `export` command). Step
  3 **skipped as the spec allows**: `grep -n "128\|out_size" docs/architecture-review/architecture-overview.md`
  returns nothing, so no box was invented for it. Every number in the new text was taken from this
  file, not from the phase spec, and independently re-checked against the code: the 110 px rig box
  from `square_to_crop_box`, the 42.3 % warp loss from 173.2 → 100.0, the split membership from
  `data/datasets/occ-real3/split.json` (`val: ['20260721-212830']`, `test: ['20260708-021722']`,
  train 18 sessions, counts 8712/4992/4736), the checkpoint-selection seam at `train.py:402-403`
  and `:423-426`, `infer_size_of` at `training/torch_data.py:143` with its `out_size` fallback.
  **Four discrepancies found and recorded (8–11 above).** The one that changes another phase's text:
  **Android's crop box is 240 px, not 220** — `padSide` is 0.10 there, not the rig's 0.05, so the
  docs say 240 and **phase 02 should too**. The others are measurement-frame mismatches in older
  docs (§9's px/square, the 98-vs-209 "what the phone sees") and are flagged, not silently
  rewritten. Nothing was run: no tests, no linters, no builds — there is no code in this phase.
  **Left open:** the ~209 px/square Android framing is still unmeasured against the curve, and
  phase 02's asset text will need the 240.

- **2026-07-30 — phase 01 — the contract, implemented; nothing retrained, nothing measured.** Five
  commits on `spec-22-inference-resolution`: `c565f36` `feat(training): infer_size_of, the one place
  the inference size comes from`, `67bc58c` `feat(export): export the graph at an explicit inference
  size`, `e05ffbd` `feat(cli): export --infer-size`, `7fa58d7` `feat(serving): crop and predict at
  the model's inference size`, `4f1bba2` the tests.
  **The contract phase 02 codes against, in full:**
  a model's `config.json` may carry `"infer_size": [W, H]` — two JSON integers, **(W, H) order**,
  the same order `out_size` uses. **Absent ⇒ fall back to `out_size`**, which is what every already
  shipped model does, including the bundled `occ-r3s-f3` (`out_size [128,128]`, `scales
  [32,64,96,128]`, **no** `infer_size` key → 128, unchanged). The exported graph's input is
  `[64, C, infer_size[1], infer_size[0]]`; `ONNX_BATCH = 64` and the static batch dim are untouched
  (`grep -n "ONNX_BATCH = 64" src/chesslab/training/evaluate.py` → `:132`), and `model_card.json`
  now carries `infer_size` next to `out_size` as well. One reader
  (`training/torch_data.infer_size_of`, `:143`), one code writer (`training/evaluate.run_export`,
  which validates), one human writer (the key itself). `out_size` was not repurposed anywhere:
  training, dataset building and `chesslab eval` still use it, and it still means "the size the
  crops on disk were built at".
  **Validation lives with the writer**, per phase 00's finding: `evaluate.untrained_size_error`
  rejects a size that is not one of the run's own `scales` (and rejects any non-`out_size` size on a
  run with no `scales`) before the key is stored or the graph traced — see discrepancy 14 for why it
  could not be the spec's literal two-liner.
  **The behavioural change:** `serving.crops_for_model` now cuts the square out of the warped board
  straight at `spec.infer_size`, so there is no intermediate 128 px step and nothing is resampled
  twice; `predict_arrays`' "all crops already at size" fast path and `predict_rows`' transform
  compare against the inference size, so a 96 px model no longer falls off the vectorised path.
  `grep -rn "cfg\[.out_size.\]" src/chesslab/serving.py` is **empty**.
  **Commands run and their results.** `.venv/Scripts/python.exe -m pytest tests/test_serving.py -q`
  → **19 passed** (once, targeted; the four new tests plus the four existing `RunSpec(...)`
  constructions updated for the new field). `.venv/Scripts/python.exe -m ruff check` over the five
  touched files + the test → **All checks passed**. `uv run chesslab export --run
  data/models/occ-v4-f3e20 --format onnx --infer-size 96x96` → `[OK] exportiert: onnx @ 96x96`, and
  `onnx.load(...).graph.input[0]` shows `64, 3, 96, 96`. The same command with `--infer-size 80x80`
  → `[FAIL] ... not one of this run's trained scales [32, 64, 96, 128]`, exit 1, `config.json`
  untouched. End-to-end seam check on the real asset: `serving.run_spec` reports
  `infer_size (96, 96) / out_size (128, 128)` and `predict_arrays` runs 64 real 96 px crops through
  the ORT session of that graph. NOT run: full `pytest`, `pytest -m clips`, any Android build.
  **Honest negatives.** Nothing got more accurate today — this phase only moves the number out of
  three hard-codings into one key. The 96 px win is `occ-v4-f3e20`'s alone; the bundled
  `occ-r3s-f3` still gets *worse* at 96 (74/243 against 95/152), which is why it keeps its 128 by
  simply not carrying the key.
  **Left for 02:** Kotlin reads `infer_size` with the same `out_size` fallback, asserts the ORT
  graph's declared shape agrees with it, and keeps the bundled asset at 128 (its config has no key,
  so the fallback is the mechanism, not an exception). Also note discrepancy 12: a freshly trained
  run carries no key, so the fallback is a load-bearing path, not a legacy one.

- **2026-07-30 — phase 02 — the app reads the size; nothing about the shipped behaviour changed.**
  Three commits on `spec-22-inference-resolution`: `50eed16` `feat(android): read the model's
  inference size instead of asserting 128`, `0299f29` `feat(android): assert the ONNX input shape
  against the model spec`, `e489ac1` `chore(android): re-export the bundled model with an explicit
  128px infer_size`.
  **What changed.** `ModelSpec.parse` reads `root["infer_size"] ?: root.getValue("out_size")`;
  `CROP_SIZE` and its `require(outWidth == 128 …)` are gone (`grep -rn "CROP_SIZE" android/` →
  nothing outside `build/`, and nothing there either), replaced by the plausibility band
  `32..512`. The real check moved to where the graph is known: `SessionRunner` gained
  `declaredInputShape` (null for the test fakes, ORT's `TensorInfo.shape` for
  `OrtSessionRunner`) and `OnnxSquareClassifier`'s `init` requires its last two dims to be
  `spec.outHeight`/`outWidth`, naming both sizes on failure. Batch untouched:
  `private val batch = ALL_SQUARES.size` and `require(crops.size == batch)` both still there.
  **The asset was re-exported at 128, not 96, and the diff proves the phase is mechanism-only.**
  Bundled run identified by sha256 (all three files identical to `data/models/occ-r3s-f3`, the
  `resumed_from` grep was not used — discrepancy 1). `chesslab export --run data/models/occ-r3s-f3
  --format all --infer-size 128x128` → `[OK] quantized (quint16/quint8) … argmax parity 1.000`,
  `[OK] exportiert: torchscript, onnx, qnn @ 128x128`. **`model.onnx` and `model.qnn.onnx` came
  back byte-identical** (`220eb219…`, `0b8a3220…`), so the only committed bytes are `config.json`'s
  five new lines; `onnx.load(asset).graph.input[0]` prints `[64, 3, 128, 128]`, unchanged.
  **Commands run and their results.** `gradlew.bat :app:testDebugUnitTest --tests '*ModelSpec*'`
  **once** → BUILD SUCCESSFUL, **10 tests, 0 skipped, 0 failures** (`ModelSpecTest` 8 incl. the
  three new size tests, `ModelSpecGraphSeamTest` 2). `gradlew.bat :app:ktlintFormat` (it
  reformatted the new test's `as TensorInfo` chain — no style was hand-edited), then
  `gradlew.bat :app:ktlintCheck :app:detekt` → BUILD SUCCESSFUL, zero findings, no `@Suppress` and
  no baseline entry added. NOT run: `assembleDebug`, the full unit-test task, instrumentation, any
  Python test — the orchestrator's gate.
  **The seam test is real on both sides.** `ModelSpecGraphSeamTest` parses the asset's own
  `config.json`, opens the asset's `model.onnx` in a real `OrtEnvironment` session, asserts the
  declared shape's last two dims equal the parsed size, then stages the directory through
  `CnnModelAssets` and runs 64 crops cut at that size through `OnnxSquareClassifier.open` (CPU
  provider, desktop natives). The second test does the same for a **96 px** graph — exported from
  a scratch copy of `data/models/occ-v4-f3e20` with `--infer-size 96x96`, graph `[64, 3, 96, 96]`,
  dropped under `app/build/extra-cnn-models/infer96/` — and asserts it is NOT 128, i.e. that the
  size was read and not assumed. It ran, it did not skip. See discrepancy 20 for why the directory
  and not a `-D` flag.
  **Honest negatives.** Nothing got faster or more accurate: the shipped model still infers at
  128 px and its bits are unchanged, deliberately, because 96 px costs it 91 extra phantoms.
  Preprocessing's 3.1 M → 1.7 M float saving is available but not taken. And the app is **not**
  end-to-end size-agnostic yet: the crop producer still takes its 128 from
  `CalibrationProfile.CropParams`, not from the model (**discrepancy 18**) — a 96 px asset would
  attach and then fail loudly on the first observation. Six discrepancies recorded (18–23),
  including a stale "220 px" left in `training/torch_data.py`'s docstring that this phase may not
  edit (21).
  **Left open:** wiring `ModelSpec` → `CalibrationProfile.crop.outW/outH` so the phone can actually
  be served at another size, and the still-unmeasured question of whether the phone's 240 px crop
  box wants 96, 128 or something else.
