# Android tracker performance

## Exact source-work profile

The desktop replay can record the instrumented Kotlin work graph without sampling and without
sampling gaps:

```powershell
cd android
.\gradlew.bat :desktop:run --args="replay <video.mp4> quiet workprofile"
```

`workprofile` is intentionally opt-in. Without it, every instrumentation site takes the inline
no-op path: no stack collection, clock read, lock or report allocation is performed. Install the
collector before starting pipeline worker threads; the replay command already guarantees this.

The report printed after replay contains:

- exact call counts for the instrumented source operations;
- distinct semantic inputs and repeated-input calls, so repeated FEN serialization, legal-move
  generation or work on the same frame can be identified;
- copied/materialised bytes for frame, preview, crop and CNN staging buffers;
- cache hits and misses;
- inclusive time, exclusive/self time and the slowest single call per operation;
- caller-to-callee counts for an instrumented call graph (not a sampled JVM stack trace).

The current boundaries cover the coordinator and pipeline frame roots, engine tick/frame/actions/CNN
snapshots, FEN and legal moves, grayscale conversions, detection/crop/grid perspective warps, ROI
motion, grid coverage/occlusion, homography construction, camera/preview/crop copies, CNN crop,
preprocessing, inference and observation, timeline writes and video progress. Add a stable
`WorkOperation` and a `WorkProfiler.span` around a
new expensive source boundary rather than naming reports after an implementation method. Pass the
frame sequence or a stable content/state fingerprint as its input; inherited input automatically
follows nested work on the same thread.

Timing is measured only by the opt-in host collector; the deterministic engine still owns no clock.
It is diagnostic rather than a regression oracle because scheduler, CPU and native-library load vary.
`self ms` subtracts nested instrumented spans, while `incl ms` retains them.

`RecordingWorkProbe.snapshot().check(...)` turns counts, repeats and copied bytes into deterministic
budgets for seeded or property-style tests. This is the fuzzy-execution oracle: vary valid event
sequences, then fail on redundant source work instead of unreliable elapsed-time thresholds. Native
library internals and scheduler time still belong in Android Studio/JFR/perfetto profiling; this
report deliberately describes only source boundaries that the application can optimize.

This page separates three claims that are easy to blur together:

1. code shared by the phone and desktop;
2. code that the Android app actually enables;
3. speed measured on the target phone rather than inferred from the desktop replay.

The offline decoder, visual/alignment caches, multiple classifier sessions and `visualworkers` are
desktop-only. Android leaves `TrackerSeed.parallelCrops` at `false` and processes one live CNN
observation at a time. The measurements below cover only work that is active on Android.

## Device measurement — 2026-08-13

- Device: Xiaomi `24117RK2CG` (Snapdragon 8 Gen 3 / SM8650), Android 16.
- Build: arm64 debug APK, OpenCV 4.10, ONNX Runtime with XNNPACK.
- Start/end state: 91 %, 29.7 °C; there was no measurable thermal rise during the 5.2 s run.
- Geometry/model: `boardSize=1008`, `alignScale=0.5`, `real14-80`, batch 64.
- Inputs: deterministic synthetic QHD YUV, four generated `DICT_4X4_50` markers, deterministic
  1072x1072 grid bytes and a synthetic 64x3x80x80 tensor. Synthetic input is valid for execution
  cost and invalid for accuracy; this benchmark makes no accuracy claim.
- Each row has warm-up. Comparisons are interleaved to avoid giving the second implementation a
  systematically hotter CPU. Timing thresholds are deliberately not tests.

| Android path | baseline median | current median | p10 / p90 current | result |
|---|---:|---:|---:|---:|
| Grid band medians, old sort vs exact histogram + transpose | 76.57 ms | 20.56 ms | 19.72 / 22.73 ms | **3.72x; 56.08 ms saved per sweep** |
| ONNX/XNNPACK `real14-80`, 1 vs 4 threads | 16.16 ms | 6.87 ms | 6.29 / 11.15 ms | **2.35x; 9.30 ms saved per observation** |
| New detector each ArUco read vs retained detector | 3.80 ms | 3.75 ms | 3.43 / 4.02 ms | **1.01x; 0.05 ms saved per read** |
| QHD 2560x1440 YUV -> BGR, current direct NV21 path | — | 0.83 ms | 0.67 / 1.03 ms | absolute cost; 40 samples |
| Full sequential `gridOccludedSquares`, 1072x1072 | — | 20.73 ms | 20.28 / 22.71 ms | absolute cost; 20 samples |

The fresh-detector maximum was 10.86 ms against 4.22 ms with reuse. Thirty samples are too few to
present that maximum as a stable percentile, but it matches the intended benefit: retaining the
dictionary, detector and scratch `Mat`s mainly removes native allocation/finalizer jitter. It is not
a material median-speed optimisation on this input.

## What those numbers mean in the live tracker

### One YUV conversion instead of two

`CameraFrameBus` publishes at most every 200 ms, i.e. 5 Hz. Before the frame bus accepted the BGR
`Mat` already produced by the pipeline, those five frames per second performed a second full-frame
YUV conversion. At the measured QHD median, removing it saves about **0.83 ms on each preview frame**
or **4.15 ms of analyzer CPU time per second**.

At 30 analyzed frames/s the conversion count is 35 -> 30, **14.3 % fewer full-frame conversions**.
At the previously measured 26-28 fps it is 31-33 -> 26-28, about **15-16 % fewer conversions**. This
is not a 14-16 % whole-tracker speedup: conversion is only one part of each frame.

### Live alignment no longer blocks the UI/analyzer

Current ArUco detection at `alignScale=0.5` costs about **3.75 ms median** on the synthetic QHD frame.
`LiveAlign` runs it on `Dispatchers.Default`, so that time no longer appears as a UI/analyzer stall;
the system still performs the CPU work. The once-per-pose grid correction runs on the same worker.
Moving work to another thread is therefore a responsiveness win, not a claim that the work vanished.

`CameraFrameBus` also versions its retained frame. With the device config seen on 2026-08-13
(`alignEvery=2`) and a 26-30 fps analyzer, alignment can be asked 13-15 times/s while the retained
preview frame changes at most 5 times/s. The version guard can therefore reject up to **8-10 duplicate
requests/s** (roughly 62-67 % of requests), worth at most **30-38 ms CPU/s** at the measured ArUco
median. This is a derived upper bound: the one-in-flight guard already suppresses some requests.

### Grid and occlusion

The exact histogram/transpose implementation produces byte-for-byte identical medians and reduces
one 16-band sweep from 76.57 to 20.56 ms on the phone. A complete sequential model-free occlusion
read is now **20.73 ms median**. It runs once per CNN observation on the full-resolution crop warp,
not once per camera frame. Android deliberately does not enable the desktop `parallelCrops` or
parallel grid stream.

### CNN threads

The shipped 64-crop `real14-80` graph takes **16.16 ms with one thread** and **6.87 ms with the phone
default of four**: 2.35x faster and 9.30 ms less per inference. This measures the ORT/XNNPACK session
only. Crop creation and the 20.73 ms model-free grid read are outside that number.

The observer still owns one classifier session and accepts one observation at a time. Creating the
desktop worker pool on Android would multiply model memory and sustained heat; it is not enabled.

### Amortised per recorded frame

The 196 s QHD game contains 5,150 actual video frames and emitted 991 CNN observations, so 19.24 %
of its frames paid the observation path. Applying that real cadence to the isolated measurements:

| contribution | amortised saving per video frame |
|---|---:|
| exact histogram/transpose grid median | 10.79 ms |
| removed second YUV conversion | 0.16 ms |
| duplicate ArUco requests | 0 to about 1.45 ms (derived upper bound) |
| four ONNX threads instead of one | 1.79 ms (already active before this optimisation pass) |

The new shared work therefore saves a defensible **about 11 ms per recorded frame**, or up to about
**12.4 ms/frame** if the version guard reaches its derived duplicate-ArUco ceiling. Including the
already-active four-thread ONNX setting against a hypothetical one-thread baseline gives roughly
**12.7 to 14.2 ms/frame**. At this recording's 26.25 fps one frame is 38.10 ms, so the new work is
about 29-33 % of that budget; including ONNX threading, about 33-37 %. These are cadence-weighted
component measurements, not a before/after stopwatch of the complete live loop.

### Verify, recovery and promotion

These are shared engine-policy changes, not frame-processing speedups:

- rejecting one verify candidate no longer erases an independent recovery vote;
- verify has a configured ceiling of eight observations, but decisive contradiction rungs may end
  after the configured two matching votes; eight is a fallback window, not a mandatory loop;
- recovery can now finish as soon as its own two-vote floor is met instead of repeatedly restarting
  behind an eight-read verify window. The concrete Nf6 incident that motivated this change starved
  a two-vote recovery for 22 s while bad candidates repeatedly consumed all eight observations.
  Unit tests pin that the vote now survives rejection; 22 s is the old incident, not a claimed fixed
  saving for every move;
- automatic promotion requires two distinct, matching identity observations with >=0.90 confidence,
  >=0.20 top-two margin and <=0.10 occlusion on the promotion square.

Do not derive an end-to-end move latency by adding the isolated rows above. Motion hold, frame
arrival, crop creation, observer gating, inference, voting and engine queueing overlap differently in
each state. Use `chesslabState`, `chesslabObs`, `chesslabCnn` and `chesslabPerf` for a played game.

## Repeat the benchmark

The harness is debug-only and writes results under `AndroidOptimizationBench`. It stages the model
under `filesDir/android-perf-bench` and deletes that directory on completion. It does not touch
games, sessions, diagnostics or recordings.

```powershell
cd android
.\gradlew.bat :app:assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
adb logcat -c
adb shell am force-stop com.chesslab.tracker
adb shell am start -n com.chesslab.tracker/com.chesslab.tracker.benchmark.AndroidOptimizationBenchmarkActivity
adb logcat -s AndroidOptimizationBench:I chesslabYuv:I *:S
```

Use `adb install -r`; do not use `connectedDebugAndroidTest` on a phone holding sessions, because the
connected-test lifecycle may uninstall the target app and delete its private data.

---

# Facts recovered from the retired spec tree

Everything below was measured before `specs/` was withdrawn (`git show fd9c1908:specs/...`).
Arc and context: `docs/how-we-got-here.md`; spec number to title: `docs/specs-index.md`. Each row
keeps its spec number. Nothing here is re-measured; where a number is a projection rather than a
measurement it says so.

## The SM8650 cost model

`specs/28`, quoted by `specs/29` and `specs/32`. Until now this lived only outside the repo.

| | value |
|---|---|
| model | **`session ms = 26.9 + 2.731 x MMAC/crop`** |
| fit | R² **0.99972** |
| fixed term | 26.9 ms = **64 %** of the shipped observation — a constant, not a ceiling |
| inflection | **9.8** MMAC/crop |
| shipped | **6.7** MMAC/crop |

Consequence, `specs/29`: **widening the backbone is not free, widening the head is.** `1280 -> 2`
against `1280 -> 13` is 2 560 against 16 640 parameters at 1x1 spatial — rounding noise against
6.7 MMAC. `specs/28` closed with a STOP on backbone width for this reason; `specs/32` reopened it
only because GroupNorm, not MACs, turned out to be the line (`docs/how-we-got-here.md`).

## Per-stage MAC split, `mobilenetv4_conv_small_035`

`specs/28`, at the serving input 80x80, 626 946 parameters. Nobody had measured this before that
pack. The backbone alias is still live (`src/chesslab/training/model.py:10`).

| group | MMAC / crop | share |
|---|---:|---:|
| `blocks.0` | 1.95 | 29.2 % |
| `conv_stem` | 1.38 | 20.7 % |
| `blocks.3` | 1.21 | 18.1 % |
| `blocks.2` | 1.01 | 15.2 % |
| `blocks.1` | 0.54 | 8.1 % |
| `conv_head` | 0.43 | 6.5 % |
| `blocks.4` | 0.15 | 2.2 % |
| **total** | **6.7** | |

- `conv_stem` + `blocks.0` are **half of all MACs**. MobileNetV4 does this deliberately, and its own
  paper notes it is expensive *specifically on CPUs*.
- `conv_head` expands 336 -> **1280** at 1x1 spatial, in front of what was then a **2**-way classifier.
- A 64-crop observation is **0.43 GMAC** and cost **32 ms cool** — about 13 GMAC/s, far below what
  this CPU sustains. The model is **overhead-bound, not arithmetic-bound**: at width 0.35 the layers
  carry 16 / 24 / 32 channels, so memory traffic and per-operator overhead dominate.

**The conv count disagrees across specs:** `specs/28` says **46** convolutions, `specs/26` says
**47**, and `specs/32`'s node table counts **46 Conv** nodes. Not resolved here.

## Execution-provider fragmentation

`specs/26` phase 00. SM8650, 80 px, 72 samples. Session median **66 ms** (p10 53, p90 81, min 44,
max 93):

| share | provider | what |
|---|---|---|
| ~36 ms (55 %) | XNNPACK | the convolutions — real work |
| ~30 ms (45 %) | CPU EP | 92 `Transpose`, 92 `Reshape`, 46 `InstanceNormalization`, 46 `Mul`, 56 `Add`, 30 `Relu` |

**94 fragments** over the convolutions, caused by GroupNorm's decomposition sitting between every
pair of them. 411 nodes execute, not the 503 in the file: ORT folds away 138 `Constant` + 46 `Shape`,
XNNPACK inserts the 92 `Transpose`.

Do **not** read this as "fewer nodes is faster". `specs/28` records that a coalesced **1-fragment**
CPU graph is **1.7x slower** than the 94-fragment XNNPACK one, and NNAPI 4.9x slower. The fix was to
remove the norm, not to coalesce the graph.

### The reported EP must be the one that actually ran

`specs/17`. ORT appends an EP to the session even when that EP then claims **no node at all** — the
QNN HTP backend does exactly this when `QnnDevice_create` fails, and the whole graph lands on the
CPU while `createSession` still succeeds. Nothing in the Java API reports the assignment; only the
profile does, via `args.provider` on each `*_kernel_time` event.

Cost of getting it wrong, measured: the discarded QNN session was running `model.qnn.onnx`
(INT8/QDQ) on the CPU. Closing it and falling through hands the CPU its own float32 graph instead —
**166 ms -> 97 ms per 64 crops, a 1.7x win**, A/B'd through the app's own settings. Four cold
attaches after the fix: **92 / 95 / 97 / 119 ms** per 64 crops, fp32 on CPU.

Still live in code:
`android/tracker-runtime/src/main/kotlin/com/chesslab/tracker/cnn/EpProfile.kt` — `dominantProvider`
sums kernel time per provider, and `EpVerdict`'s invariant is that its label **can never name a
provider that was not observed**; unknown renders as `... (unverified)` rather than repeating the
request as if it were a result.

## BatchNorm vs GroupNorm graph cost

`specs/32`, both exported at 80x80, same backbone, same batch.

| | ONNX nodes | composition | desktop CPU EP, 64 crops, 4 threads, 30 runs |
|---|---:|---|---:|
| **BatchNorm** | **89** | 46 Conv, 30 Relu, 10 Add, 3 head | **3.9 ms** median |
| GroupNorm | **503** | 138 Constant, 92 Reshape, 56 Add, 46 Conv, 46 `InstanceNormalization`, 46 Shape, 46 Mul, 30 Relu | **20.2 ms** median |

BatchNorm folds into the preceding convolution at export; GroupNorm adds 414 nodes, and on device
those are exactly what runs on the CPU EP.

**The 5.2x does not transfer to the phone, and the phone number was never measured.** The desktop
CPU EP has no XNNPACK, so it runs the convolutions far worse and the norm overhead is a much larger
share of the total there. Removing the ~30 ms CPU-EP term from the SM8650's 66 ms **projects** to
roughly 66 -> 36 ms, a factor near **1.8**. `specs/32` says it plainly: *"the node counts and the
mechanism are certain; the 1.8x is a projection"* and *"not yet measured on the device"*. **That is
still true** — no on-device measurement of a BatchNorm graph's fragmentation exists.

Node counts that get misquoted: **503** is the 80 px champion, **573** is the 128 px v4 graph, and
**99** is the normalizer-free run of `specs/25`.

## Quad correction is per-pose work and must never become per-frame

`specs/41`: **`correct_quad` costs ~70-85 ms per frame** at `board_size` 800 (4 iterations, 8 bands,
18 lines) on the dev machine. Too slow for per-frame on the phone — which is why both trackers
measure it **once per pose** and then re-apply the rectified-space correction for free: four points
through a 3x3. For the same reason `label_real_game`'s geometry scan samples every 10th frame
(`--geometry-every`); the output is one static quad, and a thousand samples fix its median far below
the measurement noise.

The phone-port budget, `specs/30`, median over 20 runs, one real 3840x2160 frame, desktop CPU,
single-threaded numpy, split by the part that would have to be ported:

| step | @ `board_size` 800 | @ 1600 (the phone's) | ports as |
|---|---:|---:|---|
| `warp_from_corners` | 1.5 ms | — | OpenCV, already in the app |
| `board_lattice` (56 samples) | 3.7 ms | 9.5 ms | column means + centroid |
| `_fit_affine` (5 Huber iterations) | 0.2 ms | 0.2 ms | `cv::solve`, 6 unknowns |
| `worst_offset` (measure once) | 7.1 ms | — | the above |
| **`improve_quad`** (measure, 3x correct, re-measure) | **31 ms** | **82 ms** | — |
| **measure only**, caller already holds the warp | **3.8 ms** | **10 ms** | — |

Assessment as written: at one call per calibration, 82 ms on the desktop — *"call it a few hundred
on the SM8650, unmeasured"* — is free. The **measure-only** pass at 10 ms is cheap enough to ride the
existing live-align cadence (every `alignEvery` frames, already off the analyzer thread) as a "the
grid has drifted" check that raises a note rather than correcting silently. Scale sanity: the same
frame reads 2.05 px at 800 and 4.01 px at 1600 — 2.0 % of a cell both times.

**Three cost figures are in play and they are mutually inconsistent. None is a device measurement.**

| source | what | figure | date |
|---|---|---|---|
| `specs/30` | `improve_quad`, desktop | 31 ms @800, 82 ms @1600 | 2026-08-01 |
| `specs/41` | `correct_quad` alone, desktop, heavier config (4 iter / 8 bands / 18 lines) | 70-85 ms @800 | 2026-08-03 |
| `TrackerCoordinator.kt:275-279` | `improveQuad`, Kotlin port, dev machine | **412-432 ms @1248**; whole `quadOf` 625 ms | 2026-08-07 |

The Kotlin KDoc says so itself: it *"previously said '70-85 ms at boardSize 800', which even scaled
by area would be ~200 ms — the real figure is roughly triple. It has still NOT been measured on
device, where it will be slower."* `android/desktop/.../Cost.kt:11-13` flags both the ArUco
"44-87 ms" and the `improveQuad` "70-85 ms" claims as unre-measured.

Verified live in code: `src/chesslab/alignment.py:557` (`correct_quad`), `:703` (`improve_quad`);
Kotlin port `android/core-geometry/.../QuadRefine.kt:58` (`correctQuad`, `ALIGN_ITERS = 4`), whose
only production caller is `improveQuad` (`:162`). The per-pose rule is honoured at
`android/tracker-runtime/.../service/TrackerCoordinator.kt:297-300` (`if (correction == null &&
!correctionTried)` inside `onGrid`); the second caller, `geometry/BoardLens.kt:64`, is documented as
one-shot and explicitly not per-frame.

## APK size, and the AGP hole-measurement trap

`specs/17`, 2026-07-25, debug APK. Three build-config changes, no Kotlin source touched.

| step | APK file | zip entry sum | delta |
|---|---|---|---|
| baseline (`65d7186`) | 329.8 MB | ~306.8 MB | — |
| 1. `arm64-v8a` only | 207.3 MB | 207.0 MB | -122.5 MB |
| 2. + unused QNN backends excluded | 194.4 MB | 194.3 MB | -12.9 MB |
| 3. + `material-icons-extended` dropped | **163.2 MB** | 163.1 MB | **-31.2 MB** |

Total **-50.5 %**. Final `lib/arm64-v8a` 121.9 MB, dex 37.3 MB (was 66.4 MB across 3 fat
`classesN.dex`), `assets/cnn_model` 2.9 MB.

**The trap — read before comparing any APK number.** AGP packages incrementally and leaves *holes*
where entries were removed: the file keeps a gap instead of being rewritten. The 329.8 MB baseline
carried **~23 MB of holes** (zip entry sum only ~306.8 MB), and the first post-change measurement
reported an unchanged 207.3 MB while the entry sum had already dropped 13 MB. Every number above is
from a clean repackage (`Remove-Item app/build/intermediates/apk; :app:packageDebug --rerun-tasks`),
and **file size and zip entry sum are always quoted together** so the two can never drift apart
unnoticed again.

Two things changed after that pass: x86_64 came back as a **separate `emulator` flavour** instead of
a second slice inside the phone APK (`docs/android-emulator.md`), and the QNN AAR was dropped
entirely, which removed what step 2 was pruning — `android/app/build.gradle.kts:120-128` keeps the
tombstone and points at `git log -S libQnnHtpPrepare` for the list.

## Review budget: nodes, not depth, and not time

`specs/44`, all 84 positions of the 83-ply game `2026-08-02_2159`, classes counted with the shipped
bands, against a 6.8 M-node reference read. The question that forced it: *"'the game was already
decided with depth 30' does not help, i can't see all solutions with depth 30. would depth 16 not be
enough?"*

| budget | median depth | depth range | class changes vs the deep read | PC seconds / 84 |
|---|---:|---|---:|---:|
| `depth 16` | 16 | 0..16 | 17 of 83 | 7.8 |
| 200 k nodes | 16 | 0..245 | 17 of 83 | 5.1 |
| 500 k nodes | 18 | 0..245 | 14 of 83 | 13.1 |
| **1.5 M nodes (shipped)** | **21** | **0..245** | **10 of 83** | 37.0 |
| depth 30, cap 3000 ms (previously shipped) | 26 | 0..30 | — | 177.5 |

**The depth RANGE is the argument.** At the same effort a node budget reaches depth 245 in a
swapped-off endgame and 16 in a middlegame; `depth 16` throws the first away and over-pays for the
second. Nodes are the same amount of work on every device: on the phone the node budget reproduces
the PC depth at **median 20 against 21**. Lichess' analysis farm spends 1.5 M nodes per move.
`capMs = 3000` stays as a safety valve, not as the budget.

Live in code: `android/app/.../analysis/GameReview.kt:28` — `REVIEW_NODES = 1_500_000L`.

### Why depth was tried first, and what it cost (`specs/42`)

Device `24117RK2CG`, same game, via `ReviewBudgetBenchmark`. 14 of 83 plies changed class:

| | live eval bar | candidate `depth 16`, cap 3000 |
|---|---|---|
| bound | `movetime 400`, `multiPv 3` | `depth 16`, `movetime 3000`, `multiPv 1` |
| wall clock, 84 positions | 32 242 ms | 27 956 ms |
| per position | 383 ms | 332 ms |
| median depth reached | 15 | 16 |
| ACPL White / Black | 106 / 135 | 84 / 128 |

`depth 16` was sometimes the *smaller* budget: in sparse endgames 400 ms reaches **depth 31**, so a
depth-16 bound stops early and throws the rest of its 3 000 ms allowance away. Ply 68 is the case —
live BEST at depth 31, "deep" BLUNDER at depth 16. Three of the fourteen changes are the deeper
reading being the LIVE one. `specs/42` responded by raising `REVIEW_DEPTH` 16 -> 30
(`REVIEW_MOVETIME_MS` unchanged at 3000) — worst case ~4.2 min for this game against 28 s before —
and **that depth-30 run was never measured on device** (`INSTALL_FAILED_USER_RESTRICTED`). `specs/44`
replaced the whole approach with nodes.

The thresholds these classes are read at, and the licence position behind them, are in
`docs/references.md` §10.

## Unsourced figure: `id35-80` identity 0.882

`android/tracker-runtime/src/main/kotlin/com/chesslab/tracker/cnn/CnnModelAssets.kt:35` describes
`id35-80` as *"phantom-free at 0 phantoms / 3 misses with piece identity at 0.882 (specs/29,
2026-08-01)"*.

**The citation is wrong.** `0.882` appears nowhere in `specs/29` and nowhere else under `specs/` at
all (verified 2026-08-20 by grep over the whole retired tree). `specs/29`'s two 13-class runs are
`occ-v8p-f5nd` (1 165 phantoms) and `occ-v8p-f5nd-hn` (602 phantoms) — both **vetoed**, both
2026-07-31, neither phantom-free.

The number does exist in the tree, attached to a different run:

| site | run | claim |
|---|---|---|
| `android/core-engine/.../Alarm.kt:158` | `occ-v10bn35-13c-hn` | **0.882** overall identity over 7 217 occupied crops, **0.818** across Q/R/N/B |
| `android/core-engine/.../CnnTick.kt:105` | `occ-warm-13c-hn` test split | **0.882**, against ~99.99 % on `empty` |
| `android/core-engine/.../VerifySingle.kt:42` | `occ-warm-13c-hn` test split | **0.882** overall, 0.818 across Q/R/N/B |

So 0.882 is plausibly the right number carried over from `occ-v10bn35-13c-hn` / `occ-warm-13c-hn`
onto the `id35-80` asset. But **as written, the figure and the "0 phantoms / 3 misses" beside it are
unsourced, and the source they name does not contain them.** Recorded, not fixed — no `.kt` file was
edited. Re-measure or re-cite before quoting `id35-80`'s identity accuracy anywhere.

## What 128 px costs against 80 px (2026-08-23, on the phone)

Compute only, quality deliberately not the question. `AndroidOptimizationBenchmarkActivity` gained a
`cnnInputSize` arm that times one batch of 64 crops through two graphs of the SAME multi-scale run
(`id35-80-before-hn-20260812`, `mobilenetv4_conv_small_035`, `scales=[48,64,80,96]`, `out_size=128`)
exported at both sizes — identical weights, identical parameter count, only the input resolution
differs. XNNPACK, 4 intra-op threads, 5 warmup rounds and 40 timed ones with the order alternating
so thermal drift lands on both.

On a 24117RK2CG at 44 % battery, 26–27 °C, two independent installs:

| input | median | p10 | p90 | min | max |
| --- | --- | --- | --- | --- | --- |
| 80 px | **6.91 / 6.99 ms** | 6.57 / 6.56 | 7.19 / 7.37 | 6.43 / 6.39 | 7.57 / 9.66 |
| 128 px | **15.07 / 15.43 ms** | 14.55 / 14.62 | 17.59 / 17.95 | 14.47 / 14.31 | 20.63 / 20.81 |

**2.18× and 2.21×** — call it 2.2× for a whole board, +8.2 ms per 64-crop batch. Pixels go up 2.56×
(`128²/80²`), so the cost is slightly sub-linear in area, which is what fixed per-node overhead and
the memory-bound layers buy back. The spread widens too: 128 px carries a p90-to-median gap of about
2.5 ms against 0.3 ms at 80 px.

Reproducing it: export the run at both sizes with `chesslab export --run <run> --format onnx
--infer-size 80x80` (and `128x128`), push them to
`/sdcard/Android/data/com.chesslab.tracker/files/cnn_bench/model{80,128}.onnx`, then

    adb shell am start -n com.chesslab.tracker/com.chesslab.tracker.benchmark.AndroidOptimizationBenchmarkActivity --es only cnnsize

The graphs are pushed rather than bundled — 5 MB of measurement artefact does not belong in the APK,
and the arm logs what to push and skips when they are absent.

Two notes for whoever reads this next. Install with `adb install -r` and never `gradlew
installDebug`: on a signature mismatch the former fails while the latter uninstalls first, and
`files/` was 8.7 GB on this device (unchanged across both installs here, verified). And a graph
exported straight from `torch.onnx.export` at opset 18 **SIGSEGV'd** the on-device runtime 41 ms in;
the project's own `chesslab export` emits opset 17 and runs. Use the project's exporter.
