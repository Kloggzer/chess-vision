# STATUS — 22 inference resolution

Branch: `spec-22-inference-resolution` (from `spec-20-recovery-honesty`).
This file is the ONLY hand-off between agents. Append to your own phase's row and to the session
log; never rewrite another phase's entry.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | Is 96 px the model's optimum or the test session's? | done | phase-00 agent | **Verdict: R-NATIVE** (`best(test)`=96, `best(val)`=128). Premise confirmed on the serving path. `scripts/sweep_infer_size.py`. Phase 01 may proceed. |
| 01 | `infer_size` as a per-model config key; export + serving read it | todo | — | Blocked by 00. **Lands alone** (contract provider). |
| 02 | Android reads it; the 128 guard becomes a graph assertion | todo | — | Blocked by 01. Owns the bundled asset. |
| 03 | Document the discovery | todo | — | Blocked by 00. Parallel with 02. Docs only. |

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
