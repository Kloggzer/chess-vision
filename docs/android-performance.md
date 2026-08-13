# Android tracker performance

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
