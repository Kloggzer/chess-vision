# 19 — Live hardening: STATUS

The only hand-off between agents. Each phase appends **its own** section; never rewrite
another phase's. Record discrepancies against the spec, every measurement including negative
results, and any blocker with file + line + what you tried.

## Phases

| Phase | File | Concern | State | Notes |
|---|---|---|---|---|
| 00 | `00-poisoned-reference.md` | Measure why `f1` stands at z≈15; origin-vs-destination asymmetry | measured | Root cause: an un-vetoed resting hand, not a stale reference. Origin/destination asymmetry does not exist. |
| 01 | `01-cnn-runtime.md` | ORT session config, XNNPACK, profiling, steady-state number | done, unmeasured | QNN dependency dropped for XNNPACK+NNAPI (option 2). **No device attached — no on-device number.** |
| 02 | `02-frame-allocations.md` | Per-frame buffers, engine hot path, 3 latent bugs | todo | `ClipReplayParityTest` must stay 18/18. |
| 03 | `03-recording.md` | Recording "doesn't work well" — diagnose then fix | done | No device attached; diagnosed from the write path. 6 defects fixed, 6 regression tests proven red first. |
| 04 | `04-cnn-activations.md` | `_convert_bn_to_gn` deletes timm's ReLUs | todo | No full retrain. |

All five may run in parallel; file scopes are disjoint.

## Baseline measurements (from the session that produced this pack)

Recorded here so no phase re-derives them, and so a later reader can tell what moved.

**The recording:** 1080×1920, 30 fps, 1975 frames, ArUco visible, standard start position.
Board occupies 630×643 px of the source = **79 px per square**.

**Python tracker on it** (`d4 d5 Kd2 Nf6 Nc3 Nc6 e4 dxe4 Nxe4 Nxe4+`), score per commit:

| move | cand | best | 2nd | margin |
|---|---|---|---|---|
| d4 | d2d4 | 22.0 | −0.6 | 22.6 |
| d5 | d7d5 | 24.0 | 12.2 | 11.8 |
| **Kd2** | **e1d2** | **8.8** | **6.2** | **2.6** |
| Nf6 | g8f6 | 23.6 | — | ∞ |
| Nc3 | b1c3 | 24.0 | 11.1 | 12.9 |
| dxe4 | d5e4 | 24.0 | — | ∞ |
| Nxe4 | c3e4 | 24.0 | 13.9 | 10.1 |
| Nxe4+ | f6e4 | 24.0 | 14.7 | 9.3 |

**Deterministic sweep** (`scripts/sweep_clip_params.py`, virtual clock, every frame):

- `motion_hold_s` 0.4 vs 0.1 → identical move list, times differ by ~0.3 s.
- `occlusion_keepalive_s` 0.1 vs 1.0 → identical move list, 0 squares vetoed at every commit
  either way.
- State occupancy over the clip: `occluded` 933 frames, `moving` 238, `waiting` 582,
  `move` 222. 907 of 1975 frames carry a live occlusion veto.

**Clip regression** (`pytest -m clips`): 20/20 green at `motion_hold_s = 0.4`; 19/20 at 0.1,
0.2 and 0.3 (`blender-scholars` loses `Qxf7#`).

**Android frame budget on device** (SM8650, after commits `b360843`…`fe38b58`):

```
engine  4– 7 ms -> frame 28–41 ms -> sensor gap 60–71 ms -> fps 17–22
engine 27–35 ms -> frame 62–77 ms -> sensor gap 87–95 ms -> fps 12–13
```

**CNN on device:** `235 ms = 6 prep + 227 session` on QNN-HTP; CPU fp32 was 97 ms as a cold
profiled batch. Preprocessing was 259 ms before commit `4df4ade` (boxed `List<Float>` read
per pixel). First QNN attach compiles the graph in 5 min 26 s; cached as an EPContext it is
0.8 s.

## Session log

_(empty — implementing agents append here)_

### Phase 00 — poisoned reference

_todo_

### Phase 01 — CNN runtime

Commits: `0e7197e` (session config), `3aee855` (profiling), `928a55c` (XNNPACK), this one.

**Steady-state on device: NOT MEASURED. No phone was attached (`adb devices` empty for the
whole phase).** `CnnObserver.logObservation` still emits `CNN observation N ms for 64 crops =
P prep + S session` once a second, and `verify()` now logs a warm-up figure that is not a
profiled batch, so the number is one `adb logcat -s chesslabCnn` away. Deliberately left
blank: a desktop x86 figure for an ARM phone is not a substitute, and this repo has been
burned by exactly that.

#### 1. Session configuration (`OrtSessionRunner.kt`)

The session was `OrtSession.SessionOptions()` and nothing else. Now `SessionTuning` holds the
three values and `applyTo` is the only place they reach ORT: `ALL_OPT`, `SEQUENTIAL`,
`setIntraOpNumThreads(4)` (the SM8650's big cores). `SessionOptions` is write-only — there is
no getter for a thread count or an optimisation level — so, as the spec anticipated, the test
asserts on `SessionTuning` and additionally that the real `SessionOptions` accepts it.
`Ep.CPU` stays a no-op branch on purpose: with XNNPACK sitting above it, CPU is now genuinely
"ORT's own kernels, nothing appended", which is what makes an explicit CPU request a usable
diagnostic.

#### 2. Profiling (`OrtSessionRunner.kt`, `OnnxSquareClassifier.kt`)

`enableProfiling` was unconditional at construction; it is now behind `profile: Boolean =
false` and the attach path is the only caller that passes `true`. `EpVerdict` and the whole
verified-backend machinery are untouched.

`verify()` now runs **two** batches. The first is profiled and produces the verdict; the
second runs after `profiledProvider()` has ended profiling and is the one that is timed. That
is the actual defect behind "every timing on record is a cold batch": the 97 ms figure was one
cold batch with per-kernel tracing across 473 nodes. Cost: one extra 64-crop batch per attach,
once.

**Mutation check (required by the spec): yes, red first.** With the conditional reverted to
the pre-fix unconditional `enableProfiling`, `:app:testDebugUnitTest --tests
"*OrtSessionRunnerTest*"` gave `profilingIsOffForAnObservationSession FAILED,
org.opentest4j.AssertionFailedError at OrtSessionRunnerTest.kt:65` (4 tests, 1 failed) — the
unprofiled session returned `CPUExecutionProvider`, i.e. it had a trace. With the conditional
in place it passes.

#### 3. XNNPACK — **option 2 taken: the QNN dependency is gone**

Measured at the ELF level over `jni/arm64-v8a/libonnxruntime.so` of each AAR (byte-scan for
`xnn_`, `ANeuralNetworks`, `XnnpackExecutionProvider`):

| AAR | `xnn_` | `ANeuralNetworks` | size |
|---|---|---|---|
| `onnxruntime-android-qnn` 1.21.1 (was shipped) | **0** | **0** | 17.8 MB |
| `onnxruntime-android` 1.21.1 (now shipped) | 25 | 90 | 17.9 MB |
| `onnxruntime` 1.21.1 (desktop JVM, win-x64) | 0 | — | 13.0 MB |

Option 1 is therefore not merely unattractive, it is impossible: the symbols are not in the
QNN binary, so a QNN-EP session cannot also `addXnnpack`. Same ORT version on both sides, so
no version bump.

**What it costs.** The app loses the QNN EP entirely. On a device where QNN would work it now
runs the CPU/XNNPACK path instead — `addQnn` throws `OrtException` inside `EpAttempts.open`'s
`runCatching`, which warns and falls through, the path that already existed for an EP that
cannot build. Concretely on this SoC that is not a loss: QNN measured **227 ms** against the
CPU's 97 ms, because the HTP cannot execute the 46 `InstanceNormalization` blocks and
partitions around them (phase 04's root cause, not this phase's).

**What it gains besides XNNPACK.** NNAPI comes back into the binary — with the QNN AAR the
`Ep.NNAPI` rung could never have built either, which nothing had noticed. And the transitive
`com.qualcomm.qti:qnn-runtime:2.31.0` goes away: 84.7 MB of arm64 payload after the excludes
that `app/build.gradle.kts` used to carry (`libQnnHtpPrepare.so` 55.1 MB, `libQnnHtpV75Skel.so`
13.3 MB, `libQnnHtpV79Skel.so` 13.2 MB, `libQnnHtp.so` 2.1 MB, `libQnnSystem.so` 0.3 MB). With
`useLegacyPackaging = true` those are extracted to disk on install, so it is real device
storage, not just download size.

Chain is now `QNN -> NNAPI -> XNNPACK -> CPU` (enum declaration order). `EpRequest` is
unchanged (`settings/` is outside this phase's scope), so `EpRequest.CPU` still means pure CPU
with nothing appended — the diagnostic still works — and AUTO picks up XNNPACK. Adding an
explicit `EpRequest.XNNPACK` would need `settings/` plus 07b's UI.

**One deliberate `EpVerdict` change.** XNNPACK implements none of the InstanceNormalization
blocks and hands them back to the CPU EP, so `dominantProvider` will very likely name
`CPUExecutionProvider` for a perfectly good XNNPACK session. Left alone, `EpAttempts` would
have seen `contradicted` and thrown the session away — the exact opposite of the intent. So
`contradicted` now excludes `requested == XNNPACK && ran == CPU`, and only that pair; an NPU
that never ran is still a contradiction. The reported label still states what actually
dominated (so the debug screen may read "CPU" for an XNNPACK session — honest, if terse).

#### Discrepancies against the spec

- **D01-1.** The spec's step 3 lists `libs.versions.toml`, `app/build.gradle.kts` and
  `OnnxSquareClassifier.kt`. `cnn/EpProfile.kt` also had to change (the `Ep.XNNPACK` provider
  mapping and the contradiction rule above). It is inside the phase's declared directory scope
  (`cnn/**`), just not named in the step.
- **D01-2.** The batch dimension the spec asks to check is **already fixed** — the bundled
  `config.json`/graph is `[64,3,128,128]` per commit `4df4ade`. No asset was touched.
- **D01-3.** `ChesslabApp.kt` still sets `ADSP_LIBRARY_PATH` for the Hexagon skeleton, which is
  now pointing at a library that is no longer packaged. It is wrapped in `runCatching` and only
  logs, so it is inert, but it is dead code and it is outside this phase's scope
  (`tracker/cnn/**`). Left in place — it is what a QNN-capable build would need back.
- **D01-4.** Test count grew beyond the three the spec names: existing tests that pinned the
  old 3-EP chain had to move (`EpRequestChainTest`, `EpProfileTest`,
  `OnnxSquareClassifierContractTest`). The contract test's "QNN and NNAPI must warn" assertion
  is now derived from `epChain(...).size - 1` rather than the literal 2, so it does not need
  touching again the next time the chain changes.

#### Open question, not answered here

ORT's own XNNPACK guidance suggests pairing the XNNPACK EP with `intra_op_num_threads = 1` on
the session and `session.intra_op.allow_spinning = 0`, because XNNPACK brings its own pool.
This graph is mostly operators XNNPACK does NOT take, so the ORT CPU-EP pool still does most
of the work and starving it looked like the worse trade. Both pools are set to 4. **Untested —
it needs a device**, and it is a one-line change in `OrtSessionRunner.options()` if the warm
number disappoints.

#### Gate

Tests: `:app:testDebugUnitTest --tests "*.cnn.*"` — **41 tests, 0 failures** (8 classes).
`:app:ktlintCheck` and `:app:detekt` — clean, no new findings, no `@Suppress` and no baseline
entry added.

Run in an **isolated `git worktree` at my own commit**, not in the shared tree: phase 03's
in-flight `app/src/test/.../record/SessionCaptureTest.kt` had an unresolved reference
(`failedWrites`) and `:app:compileDebugUnitTestKotlin` could not build. No file outside this
phase was edited to go green. `assembleDebug` was **not** run (spec forbids it) — the AAR swap
is therefore verified by dependency resolution and unit tests only; the orchestrator's merged
gate is what will link it.

### Phase 02 — frame allocations

_todo_

### Phase 03 — recording

#### Step A — what is on disk: NOT AVAILABLE

`adb devices` (and `adb devices -l` after `adb start-server`) returns an empty list — **no phone
is attached to this machine**. The two directories named in `03-recording.md` could not be
pulled, so nothing below rests on them. Everything here is derived from the write path itself
and is provable by unit test on the desktop JVM.

The one thing the spec's directory listing does constrain: `SessionRecorder.<init>`
(`SessionRecorder.kt:75-79`) creates `frames/`, an EMPTY `log.jsonl` and a complete
`session.yaml` before any capture. So a session directory containing `frames/` and a **zero-byte**
`log.jsonl` is producible (see D3 below); a directory with **no** `log.jsonl` file at all is not
producible by any code in `record/`. Either `20260726-171119`'s `log.jsonl` is a zero-byte file
that read as absent in the `ls -R`, or it was not written by this app.

#### Step B — the write path, and what is wrong with it

Six defects, ordered by how much recorded data each one costs.

**D1 — `SequenceCommitted` is dropped by the recorder's driver. `games/GameSessionController.kt:53-59`.**

```kotlin
when (event) {
    is TrackerEvent.MoveCommitted -> onCommitted(event, status)
    is TrackerEvent.ReAnchored -> capture.flush()
    else -> Unit                     // <- SequenceCommitted lands here
}
```

The engine commits plies through **two** events. `TrackerEvent.SequenceCommitted` is emitted by
`Commit.kt:165` (`commitSequence`, decider `diff_pair` — fast play: half-move + reply) and by
`CnnTick.kt:252` (decider `cnn_recovery`). The engine queues a session photo for both
(`Commit.kt:158`, `CnnTick.kt:223`). The app's `GameSessionController` handles only
`MoveCommitted`, so every pair commit and every CNN recovery produces **no `log.jsonl` entry, no
JPEG, and no move in the saved game/PGN**.

This is the single defect with independent corroboration in the tree: **five other consumers of
the same event bus handle `SequenceCommitted`** — `TrackerService.kt:296` (the notification move
counter), `ui/tracking/MoveList.kt:48`, `spectate/SpectatorController.kt:92`,
`speech/MoveAnnouncer.kt:47`, `ui/tracking/StatusUiModel.kt:60`. The recorder's driver is the only
one that does not. The user-visible shape of that is exactly the report: the move list and the
notification count more moves than the game the app saves and than the session it recorded.

**D2 — the deferred photo is taken while a hand is still over the board.
`games/GameSessionController.kt:57`.**

`capture.flush()` runs on *every* `ReAnchored`. Python flushes only when the occlusion set is
empty — `tracker.py:3085-3086`:

```python
self._set_ref(cur, cur_bgr)
if not occluded_set:
    self._flush_session_capture()
```

Kotlin's engine emits `ReAnchored` unconditionally (`TrackerEngine.kt:414`) and the app applies no
occlusion check at the flush site, even though `TrackerStatus.occlusionVetoed` is right there and
is already used for the `clean` decision at `GameSessionController.kt:93`. A frame taken with a
hand over the board is a frame whose 64 crops are labeled as pieces that cannot be seen — the
exact poisoning the deferral exists to prevent, and it is invisible until someone runs
`chesslab slice` weeks later.

**D3 — a cap-blocked start leaves an empty session directory behind. `record/SessionCapture.kt:106`.**

```kotlin
val active = (recorder ?: startRecorder(frame))?.takeUnless(::capReached) ?: return null
```

`startRecorder` → `open(frame)` → `openRecorder` (`service/GameSessionWiring.kt:117-125`) runs
`SessionStore.create(id)` and `SessionRecorder.<init>`, which writes `frames/`, `log.jsonl` and
`session.yaml` to disk — **before** `capReached` is evaluated. When
`existingBytes() >= capBytes` (default 1 GB, `RecordingSettings.kt:8`), the directory is created,
immediately abandoned, and then counts against the next `totalBytes()`. It is the only path in the
app that produces a session directory with a zero-byte `log.jsonl` and no frames.

**D4 — a failed frame write is swallowed whole. `record/SessionRecorder.kt:90`.**

```kotlin
val written = runCatching { writer.write(File(dir, rel)) }.getOrDefault(0L)
if (written <= 0L) return null
```

No counter, no reason, no log. Python's equivalent logs (`tracker.py:2878-2879`:
`log.warning("session record capture failed: %s", e)`). `SessionCapture.kt:107` has already
cleared `pending` by then (this ordering matches Python `tracker.py:2874` and is left alone), so
the photo is neither written nor retried — and `SessionCaptureController.reason` stays `null`, so
the UI goes on showing a healthy recording session. This is literally the mechanism by which
"recording doesn't work well" is all the user could say.

**D5 — `RecordingGates.reason` is never cleared. `record/RecordingGates.kt:64-85`.**

`geometrySuspends` and `inventorySkips` set `reason`; nothing ever resets it. `SessionCapture.kt:70`
(`reason = stoppedReason ?: gates.reason`) therefore reports a stale skip forever after a single
transient geometry blip, which makes the one diagnostic the UI does show (`GamesScreen.kt:132`)
untrustworthy.

**D6 — nothing anywhere reports frames written. `games/GameSessionController.kt:10-15`.**

`GameSessionState` carries `recordingSessionId` and `recordingReason` but no count.
`ui/games/RecordingPanel.kt` shows only the on-disk total from a snapshot refreshed on screen
entry (`GamesViewModel.kt:43-46`). A recorder that has written zero frames for ten minutes is
indistinguishable from one that is working.

#### Step B — the questions the spec asked, answered

- **What triggers a capture?** A committed move → `GameSessionController.onCommitted` →
  `SessionCaptureController.queue`. Written immediately when the board is clean, otherwise
  deferred to the next `ReAnchored`. Not a timer. The gate is not "rarely true" — but see D1
  (a whole event class never reaches it) and D3/D4 (two silent declines).
- **Which thread writes?** Not the analyzer thread. `attachGameSession`
  (`GameSessionWiring.kt:86-92`) collects on the service's `lifecycleScope`; the JPEG encode is in
  `LiveCaptureSource.grab()` on that same collector. Correct as designed — no change needed.
- **Service death?** `TrackerService.onDestroy:180` calls `games.endAndSave()`. Nothing is lost on
  a hard kill either: `log.jsonl` is appended per capture (`SessionRecorder.kt:95`) and
  `session.yaml` is written in `<init>`; `finish()` only rewrites the yaml. A killed session is
  truncated, never corrupt.
- **Is `auto_record` leaking sessions (MEMORY `auto-record-session-leak`)?** No. A recorder is
  opened only from `startRecorder` (`SessionCapture.kt:124-127`), which requires `prefs().enabled`,
  and only on the first actual capture. `GameSessionDriverTest` already pins that a start/stop
  cycle with the shipped default (recording off) writes nothing. The Android equivalent of the
  Python leak does not exist. **Negative result, confirmed.**

#### Observations recorded but NOT acted on (out of phase-03 scope)

- `EngineState.pendingCapture` is dead state in the Kotlin port: `flushSessionCapture()`'s return
  value is discarded at `TrackerEngine.kt:413` and `Commit.kt:237`, and `:app` keeps its own copy
  in `SessionCaptureController`. Faithful-port artefact; `:core-engine` is phase 02's / frozen.
- Related divergence in the same dead code: `Commit.kt:237` and `TrackerEngine.kt:413` gate on
  `tainted`, where Python gates on `_motion_occluded_squares` / `occluded_set`
  (`tracker.py:2853`, `3086`). No behaviour today because the value is dropped; a latent trap for
  whoever revives it.
- `existingBytes` (`GameSessionWiring.kt:105`) is snapshotted once at service start, so deleting
  sessions does not lift the size cap until the service is restarted.
- **Cannot be determined without the device:** which decline path (D3, a geometry suspension from
  a profile calibrated at a different resolution than the camera now delivers, or the size cap)
  produced the two specific directories. All three are silent today, which is why D4/D5/D6 are
  fixed rather than guessed between.

#### Step C/D — result

Commits on `spec-19-live-hardening`:

| Commit | What |
|---|---|
| `490ff89` | `docs(specs): 19 phase 03 — what the recorder actually does` (diagnosis, before the fix) |
| `ccce33d` | `fix(android-record): record the plies a SequenceCommitted carries, and stop losing frames silently` (D1–D5) |
| `a164c05` | `feat(android-record): surface frames written and the last recorder error` (D6) |

What changed, per defect:

- **D1** `GameSessionController.onEvent` now routes `SequenceCommitted` into the same
  `onCommitted` as `MoveCommitted`. `LiveGame.onCommitted` takes `(ucis, sans, fenAfter, ts,
  decision)`; a sequence's intermediate positions are replayed with chesslib (already a `games/`
  dependency) because the event carries only the final FEN and `LiveGame.onFen` compares against
  the intermediate one to spot an undo. Provenance rides on the LAST ply, matching
  `Commit.kt:157`. **One photo per commit, not per ply** — that is what `queueSessionCapture(sans.last())`
  does, so a pair yields two moves and one frame.
- **D2** the `ReAnchored` flush is gated on `isClean(status)` — the same predicate the commit path
  already used, extracted so both sites share it.
- **D3** `capReached()` is evaluated **before** the recorder is opened and no longer takes the
  recorder as a parameter, so a cap-blocked start opens nothing and writes nothing.
- **D4** `SessionRecorder.capture` deletes the partial file, and `SessionCaptureController`
  counts the failure (`failedWrites`) and reports it through `reason`.
- **D5** `RecordingGates.blocks` clears `reason` before re-evaluating, so a skip stops being
  reported once it no longer applies.
- **D6** `GameSessionState.recordedFrames`; `RecordingPanel` gained a live line
  ("Recording <id> · N frames written", or the reason in `Danger`). Its on-disk-total line moved
  from `Accent` to `OnSurfaceMuted` so the live line is the one that reads as current.

**Mutation check.** All six new tests were run against the unfixed code first and **all six
failed on assertions, not on symbols** (the one new API, `failedWrites`, was added as a bare
declaration for that run so the failure would be behavioural):

```
GameSessionControllerTest > aFastPlayPairIsRecordedAsTwoMovesAndOnePhoto()        FAILED  :147
GameSessionControllerTest > anUndoAfterAPairDropsOnlyItsLastPly()                 FAILED  :162
GameSessionControllerTest > aReAnchorWithSquaresStillOccludedDoesNotTakeThePhoto() FAILED :180
SessionCaptureTest        > aCapBlockedStartCreatesNoSessionDirectory()           FAILED  :153
SessionCaptureTest        > aFailedFrameWriteIsReported()                         FAILED  :168
SessionCaptureTest        > theSkipReasonClearsWhenTheGateOpensAgain()            FAILED  :187
56 tests completed, 6 failed
```

After the fix: `GameSessionControllerTest` 7/7, `SessionCaptureTest` 13/13, `SessionRecorderTest`
5/5, `RecordingGatesTest` 6/6, `GameSessionDriverTest` 3/3, `GameStoreTest` 5/5,
`SessionExporterTest` 2/2 — 0 failures. `:app:ktlintCheck` and `:app:detekt` clean.

**Negative results, recorded as such:**

- `aFinishedSessionHasOneLogLinePerFrameFile` — the acceptance criterion "as many `frames/*.jpg`
  as `log.jsonl` entries" was **already true** and passed on the first, unfixed run.
  `SessionRecorder` writes the frame and its log line together and `undoLast` removes both; that
  invariant was never the problem. The test is kept as a regression pin, not as a fix.
- **Threading was not the problem.** The write path is already off the analyzer thread
  (`GameSessionWiring.kt:86-92`). No test was written for it and nothing was changed.
- **No `auto_record` leak on Android.** The Python defect in MEMORY `auto-record-session-leak` has
  no Android equivalent; `GameSessionDriverTest` already pinned it.
- Whether these six defects are *the* mechanism behind the two directories on the phone is
  **unproven** — see Step A. D1 and D2 lose data on every affected commit and are certain; D3–D5
  are the reason nobody could tell which decline fired.

#### Discrepancies against the spec

- **`03-recording.md` Step A assumes a device.** None was attached. Step A was answered from the
  code instead; the ONE-frame and missing-`log.jsonl` shapes were reasoned about, not measured.
- **`ui/games/**` is in no phase's row of the ownership registry**, but `03-recording.md` names
  `ui/games/RecordingPanel.kt` as the surface for Step D. Changing its signature forced one line
  in `ui/games/GamesScreen.kt:88` (its only call site). Both are in commit `a164c05`.
- **`03-recording.md` Step C's ranked guesses were all wrong in detail.** "The capture gate never
  opens" and "frames written but the manifest is not" describe neither D1 nor D2. The evidence
  pointed at an entire event class the driver ignored — a gap in the *port*, not in the gate.
- `03-recording.md` line 41 lists `record/RecordingGates.kt` etc. by name; all exist. Line
  numbers in the original spec were not used.
- **Detekt shaped one line:** `SessionCaptureController.capture` hit `ReturnCount` (limit 3) with
  the natural four-guard form, so the cap guard is written as
  `val active = if (capReached()) null else (recorder ?: startRecorder(frame))`. Slightly less
  direct than four early returns; no wrapper type was invented.

#### Left for the user to decide (not changed)

- `existingBytes` (`service/GameSessionWiring.kt:105`) is snapshotted once at service start, so
  deleting sessions does not lift the size cap until the service restarts. Fixing it means walking
  the sessions tree from the capture path or invalidating the snapshot from the games screen —
  a design call, not a bug fix.
- `EngineState.pendingCapture` is dead state in the Kotlin port (`TrackerEngine.kt:413`,
  `Commit.kt:237` discard `flushSessionCapture()`'s value), and gates on `tainted` where Python
  gates on the occlusion set. `:core-engine` is frozen for this pack.

### Phase 04 — CNN activations

_todo_
