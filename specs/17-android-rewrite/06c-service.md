# Phase 06c — service: the single camera + engine owner, and settings persistence

> Module `:app`, packages `com.chesslab.tracker.service` and `com.chesslab.tracker.settings`.
> Runs in parallel with 06a and 06b on strictly disjoint files. Read `entry.md` completely
> first.
>
> `android-legacy/**` is a **known-wrong implementation**. Read
> `android-legacy/app/src/main/kotlin/com/chesslab/tracker/service/TrackerService.kt` for
> foreground-service and DataStore idioms ONLY — never for architecture or tracker logic.
> Its **970 LOC** are the anti-pattern this phase exists to fix.

## Why

Everything that must have exactly one owner is owned here:

- **One camera.** MEMORY (`android-single-camera-owner`): a second `ProcessCameraProvider`
  binding from the calibration screen froze the feed on tab switch. The service constructs
  `TrackerCamera` (05a) once and no one else may.
- **One engine, one thread.** entry.md hard rule 2: `:core-engine` contains no
  `synchronized`, no `Atomic*`, no `Mutex`, no `@Volatile` — it is a pure state machine
  driven by **exactly one thread**. That thread is the analyzer thread, and this phase is
  what guarantees it. Every inbound call (UI actions, CNN snapshots, config updates) is
  marshalled onto it.
- **One place where all of it is wired.** The legacy `TrackerService.kt` grew to 970 LOC
  holding camera, resolution control, ArUco live-align, warper swaps, CNN integration,
  recording, preview publishing and settings. That file is why `a7dab73`'s bug was
  invisible for weeks.

Python reference for live config updates: `src/chesslab/move_tracker/app.py:23-52`
(`_live_tuning_kwargs`) and `:54-78` (`_apply_live_tuning`) — the side effects are
behaviour, not bookkeeping.

## Design (decided — do not redesign)

### Size limit (binding)

**No file in this phase exceeds ~250 LOC.** The decomposition is fixed:

| File | Concern | LOC cap |
|---|---|---|
| `TrackerService.kt` | Android lifecycle, foreground notification, binder, ownership | 200 |
| `TrackerCoordinator.kt` | the analyzer-thread loop: frame → engine → events | 200 |
| `EngineHost.kt` | single-thread ownership of `TrackerEngine`, action queue | 150 |
| `StatusPublisher.kt` | 10 Hz status sampling, event fan-out, preview publishing | 150 |
| `CameraFrameBus.kt` | camera health + `latestCalibrationFrame` + `rawPreview` | 150 |
| `TrackerBinder.kt` | the API the UI sees | 120 |
| `settings/SettingsRepository.kt` | `TrackerConfig` ↔ DataStore, live updates | 200 |
| `settings/SettingsDataStore.kt` | DataStore instance + keys | 80 |
| `settings/ConfigCodec.kt` | `TrackerConfig` serialization + defaults | 150 |

If a file wants to grow past its cap, split it and record the split in `STATUS.md`.

### `TrackerService`

- `LifecycleService`, `android:foregroundServiceType="camera"`, started with
  `startForeground` before any camera bind (Android 14 requirement).
- Owns, constructs and closes in this order: `SettingsRepository` → `EngineHost` →
  `OnnxSquareClassifier` + `CnnObserver` (05c) → `FramePipeline` (05b) → `TrackerCamera`
  (05a) → `TrackerCoordinator` → `StatusPublisher`. Teardown is the reverse.
- Notification: ongoing, low priority, shows the tracker state and the move count; tapping
  opens `MainActivity`. One channel, created in `ChesslabApp`.
- Bound via `TrackerBinder`; the UI never gets the `TrackerService` instance itself.

### The analyzer-thread loop (`TrackerCoordinator`)

Runs on 05a's analyzer executor. Per frame, in order:

```
1. pipeline.process(imageProxy, delivered) -> FrameInput? (null = skipped: dark / no markers)
2. drain the action queue (undo / reset / setFen / promotion / acceptCnn / config update)
   -> engine calls, on THIS thread
3. drain pending CnnSnapshots -> engine.onCnnSnapshot(snap)
4. engine.onFrame(input) -> List<TrackerEvent>
5. publish events + engine.status() to StatusPublisher (non-blocking offer)
6. if cropStore.wantsFrame() -> hand the bordered warp to CnnObserver (05c)
```

- Steps 2 and 3 happen **before** `onFrame` so a user action and a CNN result are visible
  to the same tick that observes them (Python drains under `self.lock` at the top of the
  detection section).
- **Nothing in this loop blocks**: no `runBlocking`, no `await`, no `Channel.send` on an
  unbounded wait, no disk I/O, no ArUco.
- **Live-align (ArUco re-detect) is async** — commit `4a7609e`: it cost 44-87 ms every
  300 ms *on the frame thread* and was the real "recorder spike". Clone the frame (~1-2 ms),
  detect on `Dispatchers.Default` with **max one in flight**, and swap the corner reference
  the pipeline reads on the *next* iteration.
- **Never rescale geometry on a resolution change** (`a7dab73`). When the delivered frame
  size differs from the live-align detection's frame size, **re-seed the corner smoother**
  instead of EMA-blending across coordinate spaces. Carry that comment forward verbatim in
  intent.

### `EngineHost`

- Holds the `TrackerEngine` in a field touched only from the analyzer thread.
- Public API is `fun submit(action: EngineAction)` — a bounded MPSC queue drained in step 2.
  `EngineAction` is a sealed interface: `Undo`, `ResetToStart`, `SetFen`, `CaptureBaseline`,
  `ChoosePromotion`, `AcceptCnnPosition`, `UpdateConfig`.
- Exposes no engine reference, no getters. `status()` is read on the analyzer thread only
  and pushed outward.
- Assert the ownership in a debug build: `check(Thread.currentThread() == owner)` at the top
  of every engine-touching method.

### `StatusPublisher`

- `StateFlow<TrackerStatus>` **sampled at ~10 Hz** (`sample(100)` on a background
  dispatcher) — the UI (06b) must not add a second throttle.
- `SharedFlow<TrackerEvent>` (`replay = 0`, `extraBufferCapacity = 64`, `DROP_OLDEST`).
- Merges the camera health note (05a `CameraHealth`), the CNN state note
  (05c `CnnState.Failed`) and the pipeline's `SizeMismatch` note into
  `TrackerStatus.note` with a fixed precedence: **alarm > stuck > camera down > CNN failed
  > size mismatch > pipeline note**. Precedence is a pure function and gets a test.
- Preview conversion (`Mat` → `Bitmap`, ≤640 px, ~5 fps) happens **off the analyzer thread**
  with an in-flight flag, dropping rather than queueing (`4a7609e`).

### `CameraFrameBus`

The seam 06a consumes. Signatures pinned across both phases:

```kotlin
fun latestCalibrationFrame(): Mat?   // a CLONE; the caller releases it
val rawPreview: StateFlow<Bitmap?>   // downscaled analyzer frames, ~5 fps
val cameraHealth: StateFlow<CameraHealth>
```

`latestCalibrationFrame()` keeps at most one `Mat`, guarded by a lock, released on replace
and on `close()`. It is the **only** way any screen gets pixels — 06a binds no camera.

### `SettingsRepository` + live config

- Persists the full `TrackerConfig` (entry.md, every knob from `config.py:590-646`) in
  DataStore (Preferences), JSON via `kotlinx.serialization`, schema-versioned.
- **Defaults come from `TrackerConfig`'s own defaults**, which come from
  `src/chesslab/config.py TRACK_DEFAULTS` — entry.md invariant 12. Never re-declare a
  default here.
- `updateConfig(new: TrackerConfig)` writes DataStore **and** submits
  `EngineAction.UpdateConfig(new)`, which calls `TrackerEngine.updateConfig` on the
  analyzer thread.
- **Side effects on the `:app` side, mirroring `app.py::_apply_live_tuning:54-78`:**
  - `motionMargin` changed → `RoiMotion` resets `prevRoi` (`tracker._prev_roi = None`).
  - `overhang` changed → invalidate the reference census cache
    (`tracker._ref_census_for = None`) — routed to the engine via `UpdateConfig`; the
    service must not reach into engine internals.
  - `diffClaheClip` changed → `GrayPipeline` rebuilds the CLAHE object
    (`tracker._clahe = None`).
  - Any change → note `"tracker tuning updated live"`.
  The `:app`-side effects are invoked through the pipeline's `onConfigChanged(cfg)` (05b),
  on the analyzer thread. **Do not duplicate the pipeline's internal reset logic here.**
- The 12 knobs Python exposes as live-tunable (`_live_tuning_kwargs:23-52`) —
  `motionThr, zThr, censusThr, censusZWeight, occlCensusThr, occlusionColorThr,
  minGridLineCoverage, motionMargin, overhang, motionHoldS, diffClaheClip, commitLlFloor` —
  are marked `liveTunable = true` in a single table `ConfigCodec` owns; 07a's settings UI
  reads that table. Changing a non-live knob requires a tracker restart and the repository
  says so.

### Manifest (owned by this phase)

```xml
<uses-feature android:name="android.hardware.camera" android:required="true" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_CAMERA" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
```
The last three are for phase 08b's spectator (NSD/multicast discovery) — declare them now so
08b touches no manifest. `<service android:name=".service.TrackerService" android:exported="false"
android:foregroundServiceType="camera" />`. The `<activity>` entry for `MainActivity` is
also declared here (06b owns the Kotlin file, this phase owns the manifest).

## Files you own

Create under `android/app/src/main/kotlin/com/chesslab/tracker/`:

- `ChesslabApp.kt` — Application, notification channel, OpenCV init.
- `service/TrackerService.kt`, `service/TrackerCoordinator.kt`, `service/EngineHost.kt`,
  `service/EngineAction.kt`, `service/StatusPublisher.kt`, `service/CameraFrameBus.kt`,
  `service/TrackerBinder.kt`, `service/TrackerNotification.kt`
- `settings/SettingsRepository.kt`, `settings/SettingsDataStore.kt`, `settings/ConfigCodec.kt`

Plus `android/app/src/main/AndroidManifest.xml`.

Tests under `android/app/src/test/kotlin/com/chesslab/tracker/`:

- `service/EngineActionQueueTest.kt`, `service/StatusPublisherTest.kt`,
  `service/NotePrecedenceTest.kt`, `settings/ConfigCodecTest.kt`,
  `settings/SettingsRepositoryTest.kt`

You own no other file. You do **not** own `MainActivity.kt`, `ui/**`, `camera/**`,
`pipeline/**`, `cnn/**`, or `geometry/**`. Need a change there? **STOP** and record a
blocker in `STATUS.md`.

## Steps

### 1. `AndroidManifest.xml` + `ChesslabApp.kt` — commit `feat(android-app): manifest permissions, foreground camera service and application setup`
### 2. `settings/**` — commit `feat(android-settings): TrackerConfig persistence with config.py defaults and a live-tunable table`
### 3. `service/EngineHost.kt` + `service/EngineAction.kt` — commit `feat(android-service): single-thread engine ownership behind an action queue`
### 4. `service/TrackerCoordinator.kt` — commit `feat(android-service): analyzer-thread loop — actions, snapshots, onFrame, async live-align`
### 5. `service/StatusPublisher.kt` + `service/CameraFrameBus.kt` — commit `feat(android-service): 10 Hz status sampling, note precedence and off-thread preview publishing`
### 6. `service/TrackerService.kt` + `TrackerBinder.kt` + `TrackerNotification.kt` — commit `feat(android-service): TrackerService as the single camera and engine owner`
### 7. `settings/SettingsRepository.kt` live updates — commit `feat(android-settings): live config updates mirroring app.py _apply_live_tuning side effects`
### 8. Tests — commit `test(android-service): action-queue ordering, note precedence, config round-trip and live-update side effects`

## Tests

`:app:testDebugUnitTest`, JVM only. **UI/instrumented tests are NOT required for this
phase** — the Android service lifecycle is covered by the manual checklist; everything
decidable lives in the queue, the publisher and the codec.

`EngineActionQueueTest` (fake engine, deterministic executor)
- `actions_and_snapshots_are_drained_before_onFrame` — assert call order per tick.
- `every_engine_call_happens_on_the_owning_thread` — a call from another thread fails the
  ownership `check`.
- `queue_is_bounded_and_drops_oldest_rather_than_blocking`.
- `config_update_reaches_the_engine_exactly_once_per_change`.

`StatusPublisherTest` (virtual time)
- `status_is_sampled_at_about_ten_hertz` — 100 pushes in 1 s → ~10 emissions.
- `events_are_not_replayed_to_a_late_collector`.
- `preview_conversion_drops_when_one_is_in_flight` — never queues (`4a7609e`).

`NotePrecedenceTest`
- `alarm_beats_stuck_beats_camera_down_beats_cnn_failed_beats_size_mismatch` — full matrix.
- `cnn_failed_note_is_visible_when_nothing_else_is_wrong` — the silent-degrade regression.

`ConfigCodecTest`
- `round_trips_every_TrackerConfig_field`.
- `defaults_match_TrackerConfig_defaults` — spot-check `censusThr = 40.0`,
  `occlusionColorThr = 3.0`, `darkLumaThr = 18.0` (entry.md invariant 12: TRACK_DEFAULTS
  wins over the Python constructor signature).
- `unknown_schema_version_falls_back_to_defaults_with_a_note`.
- `live_tunable_table_contains_exactly_the_twelve_app_py_knobs`.

`SettingsRepositoryTest` (in-memory DataStore, fake pipeline/engine sinks)
- `update_persists_and_submits_one_UpdateConfig`.
- `motion_margin_change_triggers_the_pipeline_roi_reset`.
- `clahe_clip_change_triggers_the_gray_pipeline_rebuild`.
- `changing_a_non_live_knob_reports_restart_required`.

Run once, at the end of your phase:
```
cd android; .\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.service.*"
cd android; .\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.settings.*"
cd android; .\gradlew.bat :app:ktlintFormat; .\gradlew.bat :app:detekt
```

## Manual verification checklist (record results in `STATUS.md`)

- [ ] Service starts foreground with a notification before the camera binds; no
      `ForegroundServiceStartNotAllowedException` on Android 14.
- [ ] Tab switch tracking ↔ calibration ↔ settings: the feed never freezes.
- [ ] Rotate the device / background and foreground the app: the tracker keeps running and
      the game state survives.
- [ ] Change `censusThr` in settings while tracking → note "tracker tuning updated live",
      effect visible on the next frame, value survives an app restart.
- [ ] Change `diffClaheClip` → the gray pipeline visibly changes contrast within a frame.
- [ ] `chesslabPerf` median ≥15 fps with the UI open (the 10 Hz sampling must not cost fps).

## Acceptance criteria

- `grep -rn "ProcessCameraProvider" android/app/src/main/kotlin/` hits `camera/TrackerCamera.kt`
  only; `grep -rn "TrackerCamera(" android/app/src/main/kotlin/` hits `service/TrackerService.kt` only.
- `grep -rn "TrackerEngine" android/app/src/main/kotlin/` hits `service/EngineHost.kt` only.
- `grep -rn "runBlocking\|Thread.sleep\|\.await()" android/app/src/main/kotlin/com/chesslab/tracker/service/TrackerCoordinator.kt`
  is empty.
- `grep -rn "forResolution\|rewarpFor" android/app/src/main/kotlin/com/chesslab/tracker/service/`
  is empty (`a7dab73`).
- `wc -l android/app/src/main/kotlin/com/chesslab/tracker/service/*.kt
  android/app/src/main/kotlin/com/chesslab/tracker/settings/*.kt` — **every file under its
  cap, none over 250**. Paste the output into `STATUS.md` next to the legacy 970.
- `grep -c "uses-permission" android/app/src/main/AndroidManifest.xml` is 8, including the
  three phase-08b networking permissions.
- `grep -n "sample(" service/StatusPublisher.kt` hits exactly once.
- All named tests green; ktlint/detekt clean for `:app`.

## Do NOT

- Do not let any file exceed ~250 LOC. The 970-LOC legacy `TrackerService.kt` is the
  failure mode being fixed; a 400-LOC "small" version is the same failure.
- Do not construct a second `TrackerCamera` or `ProcessCameraProvider` anywhere.
- Do not call `TrackerEngine` from any thread but the analyzer thread, and do not expose the
  engine instance through the binder.
- Do not block the analyzer loop: no `runBlocking`, no disk I/O, no ArUco, no CNN inference,
  no synchronous preview conversion.
- Do not rescale corners or profiles on a resolution change — re-seed the smoother
  (`a7dab73`).
- Do not re-declare tracker defaults here; `TrackerConfig` (from `config.py:590-646`) is the
  only source (invariant 12).
- Do not reach into `:core-engine` internals to implement `_apply_live_tuning` side effects;
  route them through `updateConfig` and the pipeline's `onConfigChanged`.
- Do not touch `MainActivity.kt`, `ui/**`, `camera/**`, `pipeline/**`, `cnn/**`,
  `geometry/**`, or `libs.versions.toml`.
