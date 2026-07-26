# STATUS — 18 occupancy model

> **Every clip number below is a PESSIMISTIC LOWER BOUND on live behaviour** (~31 real
> px/square on the Blender clips vs ~112 from a phone at 1080p and ~200 px/square on the user's
> real captures) — never a forecast. Where a real-camera number exists it is reported next to it
> and labelled as such.

---

## What happened overnight (2026-07-26, 02:20 → 04:00)

**The class collapse works, and it is not a small effect.** A 2-class `{empty, occupied}` model
trained on freshly rendered synth (with the 2026-07-26 photometry fix) and fine-tuned on the 11
surviving real sessions beats the shipped 14-class `tiny-p3` on the clip harness by every
occupancy measure, on an identical diff-only reference:

| model | clips passing | per-square occ acc | whole-board occ acc | misses | phantoms | confident-occ wrong |
|---|---|---|---|---|---|---|
| **`tiny-p3`** (shipped, 14 classes) | **14/18** | 0.8965 | **0.0293** (40/1366) | **8 826** | 226 | 0.78 % |
| `occ-synth-w1` (2 cls, synth only) | 16/18 | 0.9936 | 0.6318 | 432 | 131 | 0.22 % |
| `occ-real-f0` (2 cls, weight 0.77) | 15/18 | 0.9899 | 0.3631 | 876 | **10** | 0.03 % |
| **`occ-real-f2`** (2 cls, weight 2.0) | **16/18** | 0.9985 | 0.9173 | 106 | 22 | 0.03 % |
| **`occ-real-f3`** (2 cls, weight 3.0) | **16/18** | **0.9989** | **0.9422** (1287/1366) | **49** | 44 | 0.03 % |
| `occ-real-f4` (2 cls, focal γ2, w 3.0) | 15/18 | 0.9984 | 0.9056 | 100 | 44 | 0.02 % |

Same instrument, same 1 366 clear observations / 87 424 square reads, same `occupancy_thr`, one
pass, diff-only baseline **18/18** throughout. Whole-board occupancy goes from **2.9 % to 94.2 %**
and misses from **8 826 to 49**. The pack's decision table branch is *"misses down and clips
passing ≥ 14/18 → proceed to phase 03"*.

**Five other things worth knowing:**

1. **The 39:1 miss bias is a CLIP-domain phenomenon, not a universal property of `tiny-p3`.** On
   the held-out **real** session (`20260721-205618`, 55 boards, ~200 px/square) the same shipped
   model makes **0 misses and 92 phantoms** — the opposite direction. Whatever fix is chosen must
   be judged on both, and the weight sweep pulls them apart in opposite directions.
2. **The phase file's "2–3×, not 39×" is exactly right, and measurable in both directions.**
   Weight 0.77 → 876 misses / 10 phantoms; weight 3.0 → 49 misses / 44 phantoms. Raising it
   trades misses for phantoms monotonically, on the clips *and* on the real session.
3. **Focal loss is a small regression** (`f4` vs `f3`: 15/18 vs 16/18, board 0.906 vs 0.942).
   `--loss ce` stays the default.
4. **The 2 clips the 2-class models still fail are NOT occupancy failures.** `blender-jitter` and
   `blender-underpromo` both record **zero** confident occupancy errors; `underpromo` fails
   because the `cnn_occupancy` decider commits `e8=Q+` where the truth is `e8=N` — a pure
   IDENTITY question a 2-class model structurally cannot answer, and the one real cost of the
   collapse. `tiny-p3` fails that clip too (it commits nothing at all).
5. **`--shards 4` is a net loss on this box and it crashed the GPU driver.** Single worker
   3.6 boards/s; 4 shards 2.2 boards/s aggregate, and shard-0 died at 446/1000 renders with an
   `atio6axx.dll` access violation. `docs/synth-pipeline.md`'s "~4× wall-clock" claim is wrong here.

**Recommendation (the decision is the user's — nothing was swapped):** `occ-real-f2` is the
balanced candidate (clips 16/18, board 0.917, only 22 phantoms; real session 0.9986 per-square,
0 misses / 5 phantoms) and `occ-real-f3` is the clip-optimal one (board 0.942 but 44 phantoms,
real session 0 misses / 7 phantoms). Both are exported (`model.onnx`, dynamic batch) and
quantized (`model.qnn.onnx`, argmax parity 1.000). **`android/app/src/main/assets/cnn_model/`
was NOT touched.** Shipping either needs phase 03 first — the harness-side loading fix landed
here is the minimum, not the full consumption path (see *Files touched outside phase 02*).

---

## Phase rows

| Phase | File | State | Notes |
|---|---|---|---|
| 00 | `00-occupancy-threshold.md` | todo | not part of the overnight brief; **no threshold was swept or changed** — every number above is at the fixture `cnnConfThr` |
| 01 | `01-hard-occupied-mining.md` | todo | not started |
| 02 | `02-two-class-model.md` | **done (measured)** | code + 9 tests, 2 datasets, 6 runs, 2 harness passes |
| 03 | `03-two-class-consumption.md` | partial | ONLY the minimum needed to load and score a 2-class model |
| 04 | `04-attention-analysis.md` | todo | the per-square offender list is below (`g1`, `h6`, `b6`, `b8`) |
| 05 | `05-real-data-harvest.md` | partial | the 11 surviving real sessions were re-sliced |

Note: HEAD moved during the session (`344c857` → `cd50f27`, an android-UI commit by another
session). Nothing of this work was affected; **no commit was made here.**

---

## Stage 1 — synth photometry gate (PASS)

100 boards, `--seed 4242 --res 1600 --views-per-scene 2 --samples 24 --max-obliqueness 0.10
--frame-frac 0.80 --cam-distance-jitter 0.15 --fens data/fens_p2.txt`, one Blender worker,
**36 s wall** (2.8 boards/s incl. process start). Measured through the production build-synth crop
path (`ingestion_profile`, `board_size = 1100`), identical metric to `DATA-QUALITY.md` (centre
disc r < 0.26, median luma; ambiguity = fraction of occupied crops inside the empty distribution's
5–95 % (centre, std) box).

| combination | empty | occupied | Δ | d′ | ambig pooled | ambig per-frame | real per-session |
|---|---|---|---|---|---|---|---|
| w/light | 213.2 | 153.7 | **59.6** | 2.64 | 0.15 | **0.00** | 0.00–0.09 |
| w/dark | 80.9 | 143.3 | −62.4 | 2.06 | 0.40 | 0.03 | 0.00–0.16 |
| b/light | 213.2 | 59.1 | 154.2 | 9.12 | 0.00 | 0.00 | 0.00–0.02 |
| **b/dark** | **80.9** | 53.0 | **27.9** | **1.06** | 0.86 | 0.20 | 0.00–0.81 |

Per-frame empty-light luma: min 166 / p10 187 / **median 212** / max 252; 15 of 100 frames below
the real floor of 193 (the documented residual of `f9ab6fa` — photo-texture boards whose `Value`
jitter landed low). Per-frame empty-dark median 89.

**Gate as the brief stated it:** empty light 193–246 → **213 ✓**; white-on-light Δ 50–70 →
**59.6 ✓**; black-on-dark preserved (empty dark ~74–90, Δ ~21–23) → empty dark **80.9 ✓**,
Δ **27.9**, d′ **1.06** against real pooled 0.90. The hard case is intact and marginally *harder*
than the 24-frame reference probe in `DATA-QUALITY.md` (Δ 34.1, d′ 1.29). Proceeded.

Scripts/outputs: `…/scratchpad/occ/measure_one.py`, `…/scratchpad/occ/photometry_s1.json`.

## Stage 2 — the training render set (4 000 boards)

Same flags, `--n 4000 --seed 777 --shards 4`, over a purpose-built FEN mix
(`…/scratchpad/occ/fens_mix.txt`, shuffled, seed 4242):

- 1 000 from `data/fens_p2.txt` — realistic legal positions
- 700 from `synth/fens.py --mode minor` (seed 4242) — uniform per-square occupancy at mixed
  density, so every square sees both classes and both piece colours instead of the natural-game bias
- 300 from `data/fens_bleed.txt` — neighbour-bleed hard negatives

Two views per scene → 2 000 scenes → **4 000 boards → 256 000 crops (989 MB)**. Board texture,
board colours, world/background, lighting and per-piece material HSV are randomised per scene
(`randomize_board` / `randomize_world` / `randomize_piece_materials`); camera pose varies via
`--max-obliqueness 0.10` and `--cam-distance-jitter 0.15`. `--occlusion-p 0` deliberately — an
`occluded` row would abort an occupancy build by design.

| run | boards | wall | rate |
|---|---|---|---|
| 4 shards | 3 446 (of 4 000) | ~26 min | **2.2 boards/s aggregate** |
| 1 worker (stage 1) | 100 | 36 s | **2.8 boards/s** |
| 1 worker (top-up) | 554 | 155 s | **3.6 boards/s** |

**shard-0 crashed** after 446 renders: `atio6axx.dll`, `EXCEPTION_ACCESS_VIOLATION` inside
`GLVertBuf::bind` (`%TEMP%\Chess Scene.crash.txt`) — an AMD driver fault under four concurrent
EEVEE processes. The missing 554 boards were re-rendered single-worker from the unconsumed tail of
shard-0's FEN split (`data/synth_occ_v1/topup/`, seed 1777). Sharding is slower *and* less stable
here; not fixed (out of scope) but `docs/synth-pipeline.md` should not be trusted on it.

**Photometry of the delivered set** (201-frame stride sample across all shards + top-up, 12 864 crops):

| combination | empty | occupied | Δ | d′ | ambig pooled | ambig per-frame |
|---|---|---|---|---|---|---|
| w/light | 212.4 | 150.9 | **61.4** | 2.59 | 0.13 | 0.01 |
| w/dark | 67.8 | 142.4 | −74.6 | 2.06 | 0.42 | 0.01 |
| b/light | 212.4 | 59.0 | 153.4 | 8.76 | 0.00 | 0.00 |
| **b/dark** | **67.8** | 52.9 | **14.9** | **0.96** | 0.86 | 0.27 |

Per-frame empty-light median 213 (42 of 201 below 193); empty-dark median 69. The set actually
trained on carries the fixed w/light photometry **and** the unchanged b/dark hard case (d′ 0.96 vs
real 0.90, Δ 14.9 inside the real band 8–23).

## Stage 3 — the 11 surviving real sessions

`chesslab slice --session <id>` per session into a fresh `data/squares/` + `squares.jsonl` (both
were empty). **`chesslab-parked-20260725/` was not read from or written to.**

- **11 sessions, 231 sliced frames, 14 784 crops.** (4 log rows had no usable markers and were
  skipped by `slice`.) Sessions' own profiles, `geometry=warp`, `photometry=none`.
- `empty` **8 898 (60.2 %)**, 12 piece classes **5 886 (39.8 %)**, `occluded` **0** — the pack's
  premise holds on this pool too.
- Warnings: `wQ` 163, `bQ` 186 (< 200). Irrelevant for a 2-class run.

Per-session crops: `20260721-212830` 4 992 · `20260721-205618` 3 520 · `20260721-200810` 1 600 ·
`20260630-080531` 1 024 · `20260630-081608` 1 024 · `20260709-141209` 832 · `20260707-155917` 704 ·
`20260707-154409` 384 · `20260722-190224` 384 · `20260707-145830` 256 · `20260707-153955` 64.

## Stage 4 — the 2-class datasets and the runs

### Datasets

| dataset | source | rows | train | val | test | build time |
|---|---|---|---|---|---|---|
| `occ-synth` | `data/synth_occ_v1` (4 000 renders → 40 pseudo-sessions) | 256 000 | 227 550 (`empty` 136 530 / `occupied` 91 020) | 12 800 | 12 800 | **34 s** (fused `mm://` memmap, 12.6 GB) |
| `occ-real` | the 11 real sessions | 10 560 | **2 048** (`empty` 717 / `occupied` 1 331) | 4 992 | 3 520 | per-PNG |

Both built with `--classes occupancy`. The collapse is a metadata mapping applied **after** dedup
and the session split, so the surviving rows are exactly those a `pieces` build at the same seed
keeps (asserted by `test_occupancy_build_reuses_all_rows` and
`test_occupancy_build_preserves_per_session_split`). `split.json` carries
`"classes": ["empty","occupied"]` and no `occluded` key anywhere.

`occ-real`'s split is the deterministic per-session assignment, unmodified: train = the 9 small
sessions, **val = `20260721-212830` (78 boards)**, **test = `20260721-205618` (55 boards)**.
Nothing was re-seeded.

**Two deliberate deviations from the phase file, both stated here:**

1. **`occ-synth` was built with `--cap 0`, not `per_cell_cap = 4`.** The cap exists to discard
   near-duplicate crops from a *fixed camera*; every synth frame has its own FEN, camera pose,
   lighting and board material, so a cap of 4 per (session, square, label) would have discarded
   roughly four fifths of an already-independent set. **`occ-real` keeps the default 4**, and
   `max_empty_ratio 1.5` is untouched everywhere, exactly as the brief required.
2. **The weight sweep runs at the fine-tune stage, not the pretrain stage.** That is where the
   real-camera domain is and it costs ~4 min a point instead of ~18. The phase file's values
   {1.0, 2.0, 3.0} are used verbatim, with `f0` (no override) carried as the inverse-frequency
   reference.

`occ-real`'s train split is only 2 048 crops after `per_cell_cap = 4` + phash on 98 train frames.
That is the honest size of the surviving real pool — small enough that the real stage is a
*fine-tune*, not a training set.

### Runs

All: `mobilenetv4_conv_small_035`, **`--head combined`** (never `twostage`: with a 2-class list its
piece head has one output and is identically 0), `--norm groupnorm`, 128×128, `--seed 42`, batch
256, `--loss ce` unless stated. Real fine-tunes use `--erase-p 0.25 --bg-p 0.15`, the same
augmentation `tiny-p3`'s real stage used, so augmentation is not a second variable.
`--scales` was **not** used (unlike `tiny-p3`): deployment and the harness both crop at 128, so
multi-scale would be a second change.

| run | data | resume | lr | loss | effective weights (empty / occupied) | epochs | best val `occ_board_acc` |
|---|---|---|---|---|---|---|---|
| `occ-synth-w1` | `occ-synth` | `tiny-p3` (138 tensors adopted, 7 skipped) | 3e-4 | ce | 0.8333 / 1.2500 | 17, best @6 | 0.9800 (synth val, 200 boards) |
| `occ-real-f0` | `occ-real` | `occ-synth-w1` (140) | 3e-5 | ce | 1.4282 / 0.7693 | 14, best @7 | 0.8974 |
| `occ-real-f1` | `occ-real` | `occ-synth-w1` | 3e-5 | ce | 1.4282 / 1.0 | 14, best @7 | 0.8974 |
| `occ-real-f2` | `occ-real` | `occ-synth-w1` | 3e-5 | ce | 1.4282 / 2.0 | — | **0.9103** |
| `occ-real-f3` | `occ-real` | `occ-synth-w1` | 3e-5 | ce | 1.4282 / 3.0 | — | **0.9103** (best `occ_acc` 0.9986) |
| `occ-real-f4` | `occ-real` | `occ-synth-w1` | 3e-5 | focal γ2 | 1.4282 / 3.0 | 16, best @9 | 0.8846 |

(Val = the 78 boards of `20260721-212830`, a real session. `f0`/`f1` are numerically identical on
this metric.) Note that on the *capped* real train split inverse frequency puts **0.77 on
`occupied`** — it pushes toward `empty`, the opposite of the wanted correction — so the sweep spans
an occupied/empty loss ratio of 0.54 → 2.10. Synth training wall time **18 min** (17 epochs,
~50 s/epoch after the first); each real fine-tune ~4 min.

**A bug found and fixed in `train.py` while doing this:** `--resume` matched checkpoint keys
verbatim, but `--head twostage` wraps the timm backbone inside `DecoupledModel._mobile` while
`--head combined` *is* the timm model. Warm-starting a `combined` run from `tiny-p3` therefore
adopted **zero** tensors and silently trained from scratch — which would have read as a bad result
rather than a bug. `_candidates()` now tries the un/prefixed name, and a warm start that adopts
nothing is a hard `[FAIL]`.

## Stage 5 — export and the clip harness

### Export

`chesslab export --run <dir> --fmt onnx` for `occ-synth-w1`, `occ-real-f0/f2/f3/f4`. Verified:
input `['batch', 3, 128, 128]`, output `['batch', 2]` — the **batch dimension is symbolic**
(`dim_param`), which is what the app's 64-crops-in-one-call path needs.
`chesslab quantize` on `occ-real-f2` / `occ-real-f3` → `model.qnn.onnx`, 1.1 MB, **argmax parity
1.000** on 128 calibration crops.

### The clip harness — the acceptance instrument

```
cd android; .\gradlew.bat ":app:testDebugUnitTest" "-Pchesslab.sim=true" `
  "-Pchesslab.sim.models=data/models/tiny-p3,data/models/occ-synth-w1,data/models/occ-real-f2,data/models/occ-real-f3" `
  "--tests" "com.chesslab.tracker.sim.*"
```

Two passes (6 m 27 s for four models, 3 m 37 s for two). **The `-P` flags must be quoted** when
gradlew is invoked from a non-interactive PowerShell — unquoted, PowerShell splits
`-Pchesslab.sim=true` and Gradle reports `Task '.sim=true' not found`. Gradle does not echo test
stdout; the report is in
`android/app/build/test-results/testDebugUnitTest/TEST-com.chesslab.tracker.sim.CnnClipSimulationTest.xml`
(`<system-out>`), extracted to `…/scratchpad/occ/sim_out.txt` and `sim2_out.txt`.

**Diff-only baseline: 18/18 in every pass.** The headline table is at the top of this file.
Per-model detail (1 366 clear observations, 87 424 square reads; **pessimistic lower bound**):

| model | clips | error clustering | worst squares | alarms | notes |
|---|---|---|---|---|---|
| `tiny-p3` | 14/18 (`promotion`, `queenside`, `stalemate`, `underpromo`) | 5 of 28 touched squares carry half the errors; 36/64 never wrong | g1×1176, e1×1108, f8×1106, h2×1007, g7×922, e7×892, f2×844, c1×669 | **2** (`f51 illegal_move conflicts=[g1,e7]`) | identity acc 0.7186 |
| `occ-synth-w1` | 16/18 (`jitter`, `underpromo`) | 1 of 19; 45/64 never wrong | b8×404, h6×46, e1×24, d4×20, g1×13 | 0 | — |
| `occ-real-f0` | 15/18 (`jitter`, `stalemate`, `underpromo`) | — | **g1×849**, e1×8, e8×8, b8×3 | 0 | the systematic per-square failure returns |
| `occ-real-f2` | 16/18 (`jitter`, `underpromo`) | 1 of 14; 50/64 never wrong | g1×89, b6×10, e1×8, b8×3 | 0 | — |
| `occ-real-f3` | 16/18 (`jitter`, `underpromo`) | 2 of 15; 49/64 never wrong | g1×32, h6×22, b6×10, e1×8 | 0 | — |
| `occ-real-f4` | 15/18 (`jitter`, `stalemate`, `underpromo`) | — | g1×83, h6×22, b6×10, e1×8 | 0 | focal is a regression |

Timing is unchanged by the collapse (ONNX ~35 ms/observation on the desktop CPU provider, ~23.5 fps
end to end — **not** a phone NPU).

**Why the two remaining failures are not occupancy failures** (`occ-real-f3`):

- `blender-underpromo` — `confident-occupancy 0.00 % wrong (0/2672)`, no misreads. It commits
  `e8=Q+` where the truth is `e8=N`. The promotion piece is a pure identity question; the
  `cnn_occupancy` decider defaults to queen. This is the one real cost of dropping identity and it
  is **phase 03's decision to make**, not a data or training problem. (`tiny-p3` fails this clip too.)
- `blender-jitter` — `confident-occupancy 0.00 % wrong (0/4942)`, no misreads. The CNN pulls the
  reference forward at f27 (`CNN: board unchanged — reference pulled forward`), `d4` then commits
  36 frames late (f80 vs the baseline's f44) and `d5`/`Nf3` are never reached. An engine/timing
  interaction under camera jitter, on a perfect observation stream.

### The real-camera cross-check (NOT a clip number)

Same statistic as `ObsAudit`, computed with `serving.predict_arrays` over the held-out **real**
test session `20260721-205618` (55 boards, 3 520 crops, ~200 px/square — the opposite end of the
resolution range from the clips). Script: `…/scratchpad/occ/real_eval.py`.

| model | per-square occ acc | whole-board occ acc | misses | phantoms | confident-occ wrong | worst squares |
|---|---|---|---|---|---|---|
| `tiny-p3` | 0.9739 | 0.1273 (6/55) | **0** | **92** | 0.28 % | e3×32, h4×22, g3×22 |
| `occ-synth-w1` | 0.9810 | 0.3091 | 24 | 43 | 0.51 % | c5×15, g7×9, f8×9 |
| `occ-real-f0` | **0.9991** | **0.9455** (52/55) | 0 | **3** | 0.00 % | c5, a1, h4 |
| `occ-real-f2` | 0.9986 | 0.9091 | 0 | 5 | 0.06 % | a1×2, c5, h4, b8 |
| `occ-real-f3` | 0.9980 | 0.8727 | 0 | 7 | 0.06 % | a1×3, f8, c5, h4, b8 |
| `occ-real-f4` | 0.9983 | 0.8909 | 0 | 6 | 0.06 % | a1×2, f8, c5, h4, b8 |

Caveats, stated because they matter: one session, 55 boards, same physical board and camera as the
train sessions (a different *session*, so no leakage under the per-session rule, but the same
domain). A synth-only model (`occ-synth-w1`) is clearly worse on real crops than any fine-tuned one
— the real fine-tune earns its 2 048 crops.

**The two tables disagree about `f0`,** and that is the honest result: on real crops the low-weight
model is the best (0 misses, 3 phantoms, board 0.9455); on the clips it collapses to 876 misses,
849 of them on `g1` alone. The clips are the pack's acceptance instrument *and* the harder domain,
so `f2`/`f3` are the recommendation — but the disagreement is real and phase 00's threshold sweep
plus phase 04's attention analysis should look at `g1` specifically.

---

## Files touched outside phase 02's ownership

Phase 02 says "if the harness cannot load a 2-class model, STOP and record a blocker". The
overnight brief's stage 5 mandates measuring on the harness, so the **minimum** was landed instead
of stopping. Phase 03 should review this as its starting point rather than re-deriving it:

| File | Change | Why |
|---|---|---|
| `src/chesslab/move_tracker/cnn_recovery.py` | new `classes_have_identity()`; `observation_from_probs` returns `label=None, conf=None` for a class list with no piece classes | a 2-class run's argmax label is `"occupied"`, which is not an identity. `has_identity` (`tracker.py:1961`) keys off `obs.label is None`; without this the engine takes the identity path and `board_matches_identity` disagrees on every occupied square |
| `android/core-cnn/.../Observations.kt` | `classesHaveIdentity()`, same early return | the faithful port (Python first, then Kotlin) |
| `android/core-cnn/.../Preprocess.kt` | `OCCUPANCY_CLASSES`; `requireExpectedClasses` accepts the 14-class **or** the 2-class list and nothing else | otherwise `ModelSpec.parse` throws and no 2-class model can be loaded at all |
| `android/app/.../cnn/ModelSpec.kt` | KDoc only | keeps the stated contract true |

Tests added for all of it. **`android/app/src/main/assets/cnn_model/` was NOT touched.** What phase
03 still owns and this session did **not** do: the promotion-piece path when there is no identity,
the `CnnObserver`/`CnnState` logging contract for a 2-class run, and the bundling decision.

## Phase 02 files changed

`src/chesslab/config.py` (`OCCUPANCY_CLASSES` + `to_occupancy_class`, **`CLASSES` untouched, still
14**), `dataset.py` (explicit `classes` parameter threaded through `compute_stats`,
`compute_class_weights`, `make_split`, `validate_split`, `verify`; new `optional_classes()` so a
2-class set may not be missing a class), `dataset_build.py` (`class_list_for`, `collapse_labels`,
`class_mode`), `synth_build.py` (same), `cli.py` (`dataset build --classes`,
`dataset build-synth --classes`, `train --loss/--focal-gamma/--class-weight`),
`training/losses.py` (new, `FocalLoss`), `training/train.py` (loss selection, weight override,
prefix-tolerant warm start, effective weights recorded in `config.json`).

## Gates

| Gate | Result |
|---|---|
| `uv run pytest -q` | **597 passed**, 3 failed — the 3 pre-existing `tests/test_camera.py` failures only |
| `ruff check src tests scripts synth` | **clean** |
| `:core-engine:test` (`--rerun-tasks`) | **green** — `ClipReplayParityTest` 18/18, zero diverging frames |
| `:core-cnn:testDebugUnitTest`, `:app:testDebugUnitTest` (`--rerun-tasks`) | **green** |
| `:core-cnn:ktlintFormat`, `:app:ktlintFormat` | clean (no reformatting needed) |
| `:core-cnn:detekt`, `:app:detekt` | **zero findings**, no `@Suppress`, no baseline additions |
| Harness diff-only baseline | **18/18** in both passes |

New tests: `test_to_occupancy_class_collapses_pieces`, `test_to_occupancy_class_rejects_occluded`,
`test_occupancy_build_writes_two_class_split`, `test_occupancy_build_reuses_all_rows`,
`test_occupancy_build_preserves_per_session_split`, `test_piece_class_build_is_unchanged`,
`test_occupancy_build_rejects_occluded_rows`, `test_focal_gamma_zero_equals_weighted_ce`,
`test_focal_downweights_easy_examples`, `test_class_weight_override_applies`,
`test_occupancy_breakdown_on_two_classes`, `test_classes_have_identity`,
`test_two_class_observation_has_occupancy_but_no_identity`; Kotlin
`a 2-class occupancy run reports occupancy but NO identity`,
`the 2-class occupancy list is accepted, anything else is not`.

## What is on disk (all gitignored)

- `data/synth_occ_v1/` — 4 000 renders, 989 MB (`shard-0..3/`, `topup/`)
- `data/datasets/occ-synth/` — 12.6 GB fused memmap; `data/datasets/occ-real/`
- `data/models/occ-synth-w1`, `occ-real-f0..f4` — `best.pt`, `config.json`, `model.onnx`;
  `f2`/`f3` also `model.qnn.onnx`
- `data/squares/`, `data/manifests/squares.jsonl` — the re-sliced real pool (14 784 crops)
- Scratch (measurement scripts, harness stdout, JSON): `…/scratchpad/occ/`

## Open items for the next session

1. **Decide whether to ship** `occ-real-f2` or `occ-real-f3`, and run phase 03 first — the
   promotion-piece question (`blender-underpromo`) is unresolved without identity.
2. **Phase 00's threshold sweep** was not run. Every number here is at the fixture `cnnConfThr`.
3. **`g1`** is the surviving systematic offender on the clips across every 2-class model
   (849 → 89 → 32 as the occupied weight rises). Phase 04's attention analysis has a concrete target.
4. **`blender-jitter`** fails on a perfect observation stream — an engine/timing issue, not a model
   one. It should not be chased with more training.
5. The real fine-tune has only **2 048 train crops**. Phase 05's harvest is the obvious next lever,
   and `DATA-QUALITY.md`'s capture guidance (dark squares ≥ 85 luma, ≥ 12 sessions over ≥ 4 days)
   is the recipe.
