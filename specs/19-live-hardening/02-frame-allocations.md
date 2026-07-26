# Phase 02 — 2.5 MB of garbage per frame, and three latent correctness bugs

## Why

Frame work on device is 31–77 ms. With `STRATEGY_KEEP_ONLY_LATEST` the delivered period is
**quantised to the sensor's**: finish in 40 ms and you wait for the 66 ms boundary, finish
in 70 ms and you wait for 99 ms. Measured on device: `engine 4–7 ms → frame 28–41 ms → 17–22 fps`,
`engine 27–35 ms → frame 62–77 ms → 12–13 fps`. The sensor runs at 30 fps and we drop two
frames of every three when the engine runs long. **Cutting work buys fps, in steps.** The
next step is `frame < 33 ms`.

Two known costs remain, plus three bugs that are latent today and become live the moment the
board size stops being a constant (commit `c315908` made it measured).

## Design (decided — do not redesign)

### 1. The per-frame byte arrays (~2.5 MB/frame)

`core-geometry/Warp.kt` `toGrayImage` allocates a fresh **640 KB** `ByteArray` per frame and
`toBgrImage` a fresh **1.92 MB** one. At 30 fps that is 77 MB/s.

They cannot simply be reused: **invariant 14** — `EngineState` stores planes **by reference**
(`RunningMeanGray.append` keeps the array), so handing back the same buffer would corrupt the
running mean. But the engine holds a **bounded** set: `avgFrames` per running mean, plus
`prevGray`, plus `lastCur`/`lastCurBgr`.

Implement a small ring in the app layer (`pipeline/`), depth `avgFrames + 3`, that hands out
a buffer per frame and cycles. Do **not** put the ring in `:core-geometry` — that module's
functions are also used by the offline clip harness where per-call allocation is correct.

The depth must follow `avgFrames`, which is CNN-conditional (2 with, 3 without). Read it from
the live config; a fixed 5 is acceptable if you document why it is safe against the maximum.

Write a test that proves the invariant is not violated: append `depth` frames to a
`RunningMeanGray`, then keep writing new frames, and assert the mean still matches an
independently computed mean. **This test must be red against a naive single-buffer
implementation** — prove it and report that.

### 2. The engine hot path (27–35 ms)

`PlaneMean.append` and `mean()` walk 640 KB (gray) plus **1.92 MB (BGR)** per stable frame.
`mean()` already uses a division table; `append` already evicts and adds in one pass.

The BGR running mean is the expensive half. Establish first **whether it is needed every
stable frame** — grep its consumers (`lastCurBgr`, `bgrBuf`) and report what actually reads
it and when. If it is only read on a `Detect` outcome, the mean can be computed lazily at
that point instead of maintained per frame. **Measure before and after** with the existing
`StageTimings` (`ENGINE` stage) on the desktop clip replay; report both numbers.

If lazy evaluation changes engine behaviour in any way, abandon it and say so — parity
outranks speed.

### 3. Three latent correctness bugs

**(a) `grayBuf`/`bgrBuf` are sized for the wrong `avgFrames`.**
`EngineState.kt:94-95` constructs both with `config.avgFrames(cnnOn = false)` = 3, while the
live gate reads `state.avgFrames` = 2 once the CNN attaches. `updateConfig` resizes only on a
config change, never on CNN attach. Fix: resize when `cnnOn` flips.

**(b) File-level scratch buffers shared across engine instances.**
`BaselineOcclusion.kt:58-63`, `Vetoes.kt:10-12`, `Commit.kt:63-65` hold ~11.5 MB at file
scope, contradicting the per-instance policy stated at `EngineState.kt:180`. It is safe today
only because `StackSwitch.restart()` closes before it builds. Move them onto `EngineState`,
or document at each site why file scope is correct — one or the other, not silence.

**(c) The `detSize` guard needs a test.**
Commit `c315908` added `require(input.grayDet.width == state.detSize …)` in `FrameLoop.step`.
There is no test for it. Add one: feed a plane whose size disagrees with the config and
assert the `IllegalArgumentException` names both sizes.

## Steps

1. `pipeline/` (new file, name it yourself) + `pipeline/BoardWarps.kt` — commit `perf(android): recycle the per-frame seam buffers instead of allocating 2.5 MB`
2. `core-engine/FrameLoop.kt` (`PlaneMean`) — commit `perf(android-engine): <what you actually did to the BGR running mean>`
3. `core-engine/EngineState.kt`, `api/TrackerEngine.kt` — commit `fix(android-engine): size the averaging buffers for the CNN-conditional avgFrames`
4. `core-engine/BaselineOcclusion.kt`, `Vetoes.kt`, `Commit.kt` — commit `fix(android-engine): give the scratch buffers to the engine instance that uses them`
5. `core-engine/src/test/…/FrameLoopTest.kt` — commit `test(android-engine): the detection plane must match the boxes the engine indexes`
6. `specs/19-live-hardening/STATUS.md` — commit `docs(specs): 19 phase 02 — allocation and hot-path measurements`

Step 2 is allowed to be "measured, no change was safe" — commit only the STATUS entry then.

## Tests (write, run once, targeted)

- `theBufferRingNeverHandsBackAPlaneTheRunningMeanStillHolds` — red first against a single
  shared buffer; prove it.
- `avgFramesFollowsTheCnnAttach` — buffers resize when `cnnOn` flips.
- `aDetectionPlaneThatDisagreesWithTheBoxesIsRefused` — the `detSize` guard.

Run once:
`.\gradlew.bat :core-engine:test --tests "*FrameLoop*" --tests "*EngineState*"` and
`.\gradlew.bat :app:testDebugUnitTest --tests "*pipeline*"`.

**`ClipReplayParityTest` must stay 18/18, zero divergence.** You may run it once at the end,
targeted: `.\gradlew.bat :core-engine:test --tests "*ClipReplayParityTest*"`. If it moves,
you changed engine behaviour — stop and record it.

## Acceptance criteria

- No `ByteArray(` allocation on the per-frame path in `pipeline/` outside the ring.
- `ClipReplayParityTest` 18/18, zero divergence.
- `grep -n "avgFrames(cnnOn = false)" android/core-engine/src/main/kotlin/com/chesslab/engine/EngineState.kt` no longer appears in the buffer construction.
- Every file-scope scratch buffer in `:core-engine` is either moved onto the instance or
  carries a comment saying why file scope is correct.
- Before/after `ENGINE` stage timings in `STATUS.md`, or an explicit "no safe change found".

## Do NOT / Out of scope

- **Do not change any threshold** in `TrackerConfig` or `config.py`.
- Do not change `detectScale` or `boardSize` semantics — commit `c315908` settled that.
- Do not touch `android/app/src/main/kotlin/com/chesslab/tracker/cnn/**` (phase 01) or
  `record/**`, `games/**` (phase 03).
- Do not "optimise" the double-clear at `FrameLoop.kt:206-215` (grid gate just cleared →
  drop both buffers). The comment says never to; it is load-bearing.
- Do not run `assembleDebug` or the full test task.
