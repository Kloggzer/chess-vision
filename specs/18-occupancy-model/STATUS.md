# STATUS — 18 occupancy model

> **Every clip number below is a PESSIMISTIC LOWER BOUND on live behaviour** (~31 real
> px/square on the Blender clips vs ~112 from a phone at 1080p and ~200 px/square on the user's
> real captures) — never a forecast. Where a real-camera number exists it is reported next to it
> and labelled as such.
>
> **That lower bound has now been measured at phone resolution** — see *Hi-res clip
> re-evaluation* at the end of this file. Short version: the ranking holds and widens, `tiny-p3`
> recovers 82 % of its misses but gets *worse* as a tracker, and `occ-real-f2` overtakes `f3`.

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

---

# Hi-res clip re-evaluation (2026-07-26, 09:52 → 10:35)

Every number above this section was measured on clips rendered at **640×640 with the board
spanning 249 px = 31.1 px/square**. A phone at 1080p with the board filling the frame gives
~112 px/square. This section redoes the comparison at that resolution.

**Nothing in `tests/data/testclips/`, `android/core-engine/src/test/resources/parity/` or
`scripts/emit_parity_fixtures.py` was touched.** `ClipReplayParityTest` was re-run with
`--rerun-tasks` afterwards: **18/18 clips, zero diverging frames.** No commit was made.

## What was rendered, and the second set nobody asked for

| set | dir (untracked — **do not commit**) | res | px/square | renders | wall | size |
|---|---|---|---|---|---|---|
| **hi-res** | `tests/data/testclips-hires/` | 2304 | **112.05** (measured) | 470 | **8 min 26 s** | 45 MB |
| control | `tests/data/testclips-640new/` | 640 | 31.1 | 470 | ~4 min | 6 MB |
| (reference) | `tests/data/testclips/` — committed, untouched | 640 | 31.1 | — | — | — |

`scripts/generate_blender_testclips.py --scenario <s> --out <dir> --res <r> --samples 8 --seed 42`,
one Blender worker, no `--shards` (it is slower here and it crashed the driver — see above).
Only the **18 clips in `parity/index.json`** were rendered; `italian` (136 renders) and `opera`
(298) are skipped by the sim harness anyway, so rendering them would have doubled the cost for
nothing. Stage-1 probe: `blender-promotion`, 10 renders, 23 s → projected 470 renders ≈ 15 min,
well inside the 2 h budget, so 2304 was kept rather than falling back to 2048.

px/square is **measured, not assumed**: `blender-promotion.labels.json` corners are
703.808 / 1600.192 → span 896.384 px → **112.048 px/square** (old set: 248.996 → 31.124).

**Why the control set exists.** The renderer changed between the commit that produced the
committed clips (`3590dc2`) and HEAD — 17 commits touch `synth/render_board_v2.py`, including
`f9ab6fa` (light-tile gain) and **`7f59eba` "deepen the blacks via lighting, not the texture"**.
Re-rendering at 2304 therefore changes *two* things at once. `testclips-640new` is the same
scenarios and seed at the **old** resolution with **today's** renderer, so resolution and
renderer can be separated. They had to be: they pull in opposite directions.

## Stage 3 — photometry of the new clips (the sanity gate)

Same instrument as `DATA-QUALITY.md`: production build-synth crop path (`ingestion_profile`,
`board_size = 1100`), centre disc r < 0.26 median luma, ambiguity = fraction of occupied crops
inside the empty distribution's 5–95 % (centre, std) box. 18 clips, **77 clear keyframes,
4 928 crops** per set (occluded keyframes excluded — a hand over the board is not a photometry
sample). Script: `…/scratchpad/hires/clip_photometry.py`.

| set | empty light | empty dark | w/light Δ | w/light d′ | b/dark Δ | b/dark d′ | b/dark ambig pooled / per-frame |
|---|---|---|---|---|---|---|---|
| committed 640 | 201.8 | **51.6** | 81.4 | 5.26 | 0.9 | 0.25 | 0.44 / 0.33 |
| control 640 (today's renderer) | 199.6 | **38.8** | 44.9 | 2.09 | −0.7 | 0.21 | 0.46 / 0.44 |
| **hi-res 2304** | **199.4** | **38.5** | 47.3 | 2.18 | 1.8 | **0.03** | 0.56 / 0.40 |

Hi-res, all four combinations:

| combination | empty | occupied | Δ | d′ | ambig pooled | ambig per-frame |
|---|---|---|---|---|---|---|
| w/light | 199.4 | 152.1 | 47.3 | 2.18 | 0.09 | 0.01 |
| w/dark | 38.5 | 131.3 | −92.8 | 5.79 | 0.00 | 0.00 |
| b/light | 199.4 | 54.4 | 145.0 | 9.74 | 0.00 | 0.00 |
| **b/dark** | **38.5** | 36.7 | **1.8** | **0.03** | 0.56 | 0.40 |

Per-frame empty-light: min **193** / p10 195 / med 197 / max 250 — **0 of 77 frames below 193**.
Per-frame empty-dark: min 37 / med 38 / max 59.

**Verdict on the brief's gate: half pass, half fail, and the failing half is informative.**

- *"empty-light ~193–246"* → **199.4, and not one frame below 193. PASS.** The render is not stale.
- *"black-on-dark preserved"* → **NO.** Dark squares fell **51.6 → 38.5** luma, and the control
  set proves this is `7f59eba`, **not** resolution (38.8 at 640 with the same renderer). 38.5 is
  below the worst real session ever measured (45.5) and far below `DATA-QUALITY.md`'s ≥ 85
  capture guidance. **The new clips are photometrically harder on black-on-dark than the old
  clips and than any real capture.** b/dark d′ 0.03 vs real pooled 0.90.

So the hi-res set is *not* simply "the old clips, sharper". It is sharper **and** darker, and the
darkness is what survives in the results below.

## Stage 4 — the three models, three clip sets

Harness unchanged except for clip selection (see *Files touched*). Same `effectiveConfig` per
clip from the parity fixtures, same `occupancy_thr`, one pass per set.

```
cd android; .\gradlew.bat ":app:testDebugUnitTest" "-Pchesslab.sim=true" `
  "-Pchesslab.sim.clips=tests/data/testclips-hires" `
  "-Pchesslab.sim.models=data/models/tiny-p3,data/models/occ-real-f2,data/models/occ-real-f3" `
  "--tests" "com.chesslab.tracker.sim.*"
```

**Diff-only baseline per set — read this before any model number:**

| clip set | diff-only baseline | which clips fail, and why |
|---|---|---|
| committed 640 | **18/18** | — |
| control 640 | **15/18** | `castle`, `opening`, `scholars` — all of them the black e-pawn `e7e5`, i.e. exactly the darker dark squares |
| **hi-res 2304** | **17/18** | `stalemate` only: `f43 too_many_changed` (8 squares) — the sharper arm + shadow trips `max_changed` on a 3-piece board |

Resolution *repairs* what `7f59eba` broke on the diff path (15/18 → 17/18) but does not restore
18/18. **The re-rendered sets are not a drop-in acceptance instrument**: three clips' tracker
knobs (`census_thr = 40`, `max_changed`) were tuned against the committed pixels.

### The comparison table

Miss/phantom **rates** are given alongside the counts because the observation count is not
constant at hi-res: the harness paces the observer by measured inference time
(`readyAtS = nowS + inferMs`), and at 2304 a single observation costs ~120 ms, so fewer of them
fit into the same clip. Counts across sets are therefore not directly comparable; rates are.

| model | clip set | clips | per-square occ | whole-board occ | misses | miss rate | phantoms | phantom rate | conf-occ wrong |
|---|---|---|---|---|---|---|---|---|---|
| `tiny-p3` | committed 640 | 14/18 | 0.8965 | 0.0293 (40/1365) | 8 818 | 10.09 % | 226 | 0.259 % | 0.78 % |
| `tiny-p3` | control 640 | 13/18 | 0.9362 | 0.0300 (41/1366) | 5 106 | 5.84 % | 471 | 0.539 % | 1.98 % |
| **`tiny-p3`** | **hi-res 2304** | **6/18** | **0.9820** | **0.1670** (168/1006) | **924** | **1.44 %** | 232 | 0.360 % | 1.56 % |
| `occ-real-f2` | committed 640 | 16/18 | 0.9985 | 0.9172 (1252/1365) | 106 | 0.121 % | 22 | 0.025 % | 0.03 % |
| `occ-real-f2` | control 640 | 15/18 | 0.9972 | 0.8931 (1220/1366) | 95 | 0.109 % | 147 | 0.168 % | 0.18 % |
| **`occ-real-f2`** | **hi-res 2304** | **16/18** | **0.9996** | **0.9821** (1098/1118) | **19** | **0.027 %** | **7** | **0.010 %** | **0.01 %** |
| `occ-real-f3` | committed 640 | 16/18 | 0.9989 | 0.9420 (1283/1362) | 49 | 0.056 % | 44 | 0.050 % | 0.03 % |
| `occ-real-f3` | control 640 | 15/18 | 0.9971 | 0.8931 (1220/1366) | 95 | 0.109 % | 159 | 0.182 % | 0.17 % |
| **`occ-real-f3`** | **hi-res 2304** | **16/18** | 0.9991 | 0.9501 (1200/1263) | 23 | 0.028 % | 52 | 0.064 % | 0.01 % |

The committed-640 row is a **re-measurement**, not a copy: this session replayed the committed
clips through the modified harness and got 0.8965 / 0.0293 / 8 818 / 226 · 0.9985 / 0.9172 /
106 / 22 · 0.9989 / 0.9420 / 49 / 44, i.e. the table at the top of this file to within one
observation. **The harness change is a no-op.** (The ±1 observation is the inference-time pacing,
not a code difference.)

Worst squares, hi-res:

| model | worst squares | confident identity confusions |
|---|---|---|
| `tiny-p3` | **f8×822**, a6×58, c6×58, e6×58, g6×58, e7×58, c5×16, a7×13 | **bB→empty ×777**, bP→empty ×12, wP→empty ×8 |
| `occ-real-f2` | f8×13, g6×7, a2/b2/d2/f2/g2/h2 ×1 | (2-class, no identity) |
| `occ-real-f3` | **g6×50**, f8×13, e6×2, a2/b2/d2/f2/h2 ×2 | (2-class, no identity) |

Which clips fail at hi-res:

| model | failing clips |
|---|---|
| `tiny-p3` | `capture`, `castle`, `enpassant`, `jitter`, `opening`, `phantom`, `promotion`, `queenside`, `scholars`, `stalemate`*, `takeback`, `underpromo` |
| `occ-real-f2` | `stalemate`*, `underpromo` |
| `occ-real-f3` | `stalemate`*, `underpromo` |

\* `stalemate` also fails diff-only at this resolution — not a model failure for any of the three.

## What changed, and what did not

1. **The ranking holds, and it widens.** Both 2-class models beat `tiny-p3` on every occupancy
   column at 112 px/square, and the gap in *clips passing* goes from 16 vs 14 to **16 vs 6**.
   Nothing here argues against the collapse to `{empty, occupied}`.

2. **`tiny-p3`'s 8 826 misses were largely a resolution artefact — its clip failures were not.**
   Holding the renderer fixed (control 640 → hi-res), the miss rate falls **5.84 % → 1.44 %,
   a 75 % reduction**, and per-square occupancy goes 0.9362 → 0.9820. But **822 of the 924
   surviving misses are one square**: `f8`, `bB→empty ×777` — a black bishop on a dark square,
   i.e. exactly the b/dark case the render made harder. Because that square is wrong on
   essentially *every* observation it raises `illegal_move conflicts=[f8]` around f27–f29 in
   almost every clip and **blocks every commit**: `capture`, `castle`, `enpassant`, `opening`,
   `phantom`, `queenside`, `scholars`, `takeback` all commit the empty list. Clips passing:
   13/18 → **6/18**.
   **So resolution does not rehabilitate `tiny-p3`.** It converts a diffuse, survivable error
   into a single fatal one. If the question was "does the retrain still earn its keep at phone
   resolution" — **yes, and by more than before.**

3. **`f2` and `f3` swap places.** At 31 px/square `f3` was the clip-optimal model (board 0.9420
   vs 0.9172). At 112 px/square **`f2` wins every column**: per-square 0.9996 vs 0.9991,
   whole-board **0.9821 vs 0.9501**, misses 19 vs 23, phantoms **7 vs 52**. `f3`'s extra occupied
   weight buys nothing once the pixels are there and costs phantoms (`g6×50`). Combined with the
   real-session cross-check, where `f2` already led (board 0.9091 vs 0.8727), **`f2` is now the
   recommendation at both ends of the resolution range** and the earlier "f3 is clip-optimal"
   caveat is retired.

4. **`blender-jitter` passes at hi-res** — for both 2-class models. Open item 4 above
   ("fails on a perfect observation stream, do not chase it with more training") is **wrong as
   stated**: it was resolution-sensitive after all. The engine/timing interaction it describes is
   real but only bites at 31 px/square.

5. **`g1` is gone.** The systematic offender across every 2-class model on the committed clips
   (849 → 89 → 32 as the occupied weight rose) does **not appear at all** in the hi-res
   worst-square lists. Phase 04's attention target changes: it is now `f8` (`tiny-p3`, b/dark)
   and `g6` (`f3`, phantoms).

6. **`underpromo` did not move, and cannot.** Both 2-class models still commit `e8=Q+` where the
   truth is `e8=N`, with zero confident-occupancy errors. Pure identity. Phase 03 still owns it.

7. **Timing at hi-res is not a device prediction and must not be quoted as one.** 105.5 ms/frame
   / 9.5 fps for `tiny-p3` vs 52.9 ms / 18.9 fps at 640. Two harness artefacts inflate it: the
   clip's `boardSize` is the render resolution (2304), so `warpBoardForCrops` runs on a
   2304 + 2B canvas (38.7 ms/obs of crop cost) and `RoiMotion` warps at 2765² before resizing to
   160 (14.2 ms/frame, up from 1.7). A device warps to its profile's 800/1600 regardless of camera
   resolution, so neither cost transfers. Desktop CPU provider, not a phone NPU, either way.

## Files touched

| File | Change |
|---|---|
| `android/app/src/test/kotlin/.../sim/SimClips.kt` | `simClipDir()` / `usingDefaultClips()` — the clip directory comes from `-Pchesslab.sim.clips`, **defaulting to the committed set**. Clip names and `effectiveConfig` still come from `parity/index.json`, so both sets run the identical catalogue with identical knobs. |
| `android/app/src/test/kotlin/.../sim/CnnClipSimulationTest.kt` | `assertBaselineReproducesGroundTruth` stays a hard assertion for the committed clips and becomes a **reported measurement** for an alternate set. Its justification ("Python reproduces these at full rate") is a property of `tests/data/testclips`, not of the harness; a re-render has no Python reference. |
| `android/app/build.gradle.kts` | plumbs `chesslab.sim.clips` through, same shape as `chesslab.sim.models`. |

Nothing else. `android/app/src/main/assets/cnn_model/` untouched; no model was swapped.

## Gates

| Gate | Result |
|---|---|
| `:core-engine:test --rerun-tasks --tests *ClipReplayParityTest*` | **green — 18/18 clips, zero diverging frames** |
| `:app:testDebugUnitTest` (no sim flags — the default clip path) | **green** |
| `:app:ktlintCheck` | clean (one violation found and fixed: chained `.` on `simClipDir`) |
| `:app:detekt` | **zero findings**, no `@Suppress`, no baseline additions |
| Sim on the **committed** clips, 3 models | **diff-only 18/18**, all three models reproduce the table at the top of this file |

## What could not be verified

- **The two new clip sets have no Python reference.** `scripts/emit_parity_fixtures.py` was not
  run against them (out of scope, and it would have to write new fixtures). Their diff-only rates
  (17/18, 15/18) are Kotlin-only measurements; whether Python reproduces them is unknown.
- **Whether `stalemate`'s hi-res `too_many_changed` is a threshold artefact or a real finding.**
  It needs `max_changed` raised for that clip (as `queenside` already does) to tell apart, and
  no threshold was swept here — phase 00 is still not run.
- **Why `tiny-p3` reads `f8` as empty specifically** and not the other dark back-rank squares.
  Photometry says b/dark d′ 0.03 board-wide; it does not say why `f8` is singled out. That is
  phase 04's attention analysis.
- **Nothing about a phone.** 112 px/square is what a 1080p phone *delivers to the warp*; the
  device's own `board_size` (800 in `phone.yaml`) still decimates it, and that path was not
  exercised. `DATA-QUALITY.md`'s recommendation to raise the profile to 1100 remains unactioned.

## On disk (untracked — **do not commit**)

- `tests/data/testclips-hires/` — 18 clips + `manifest.yaml` + labels, 45 MB
- `tests/data/testclips-640new/` — the renderer control set, 6 MB
- `…/scratchpad/hires/` — `clip_photometry.py`, `extract_sim.py`,
  `photometry_{old640,new640,hires2304}.json`, `sim_{old640,new640,hires}.txt`
  (the full harness stdout for all three passes)
