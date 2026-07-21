# Phase 03 — camera robustness: CameraState error observer + rebind backoff

## Why

`TrackerCamera` (`android/app/src/main/kotlin/com/chesslab/tracker/camera/TrackerCamera.kt`)
protects individual frames (`emitFrame` try/finally, drop-on-full `:208-223`) but has
no camera-DEVICE error handling: no `CameraState` observer, no rebind, no backoff —
the only `onError` is for still `ImageCapture` (`:144`). If the camera disconnects or
the HAL errors, the feed silently freezes. Python reference (adapted — CameraX is a
push model, no `cap.read()` loop): commits `dba6f29` (validated reattach + exponential
backoff + one-shot diagnosis) and `43fa7bb` (throwing read treated as dropped frame).

## Design (decided — do not redesign)

1. Observe `cameraInfo.cameraState` after binding (LiveData, observe on the main
   executor the binding already uses). On `CameraState.Type.CLOSED`/`CLOSING` with an
   error, or any `CameraState.error != null` of type
   `ERROR_CAMERA_IN_USE / ERROR_CAMERA_FATAL_ERROR / ERROR_CAMERA_DISABLED /
   ERROR_OTHER_RECOVERABLE_ERROR`: schedule a **rebind** (unbindAll + bind again with
   the same use cases).
2. **Exponential backoff** 3 s → 6 s → 12 s → 24 s → 30 s cap (mirror Python's
   `_reconnect_backoff`), reset to 3 s after the first successfully delivered frame.
3. **One-shot diagnosis log** after 3 failed rebinds (mirror
   `_log_reconnect_diagnosis`): a single clear log line naming the last CameraState
   error — then stay quiet, keep retrying at the backoff cap.
4. Surface the down state to the service: the tracker must keep running and show
   "camera down" instead of freezing — check how `TrackerService` consumes camera
   state today (`grep -n "camera" android/app/src/main/kotlin/com/chesslab/tracker/service/TrackerService.kt | head`)
   and reuse the existing status/note channel; do NOT invent a new UI surface (that
   is phase-04 territory at most).
5. Single-camera-owner invariant holds: all rebinds happen inside `TrackerCamera`
   owned by the service — never a second `ProcessCameraProvider` binding
   (known freeze pitfall).

## Steps

### 1. `camera/TrackerCamera.kt` — state observer + rebind with backoff — commit `fix(android-camera): CameraState error observer + rebind with exponential backoff`
### 2. `service/TrackerService.kt` — surface camera-down in the status note — commit `feat(android-service): tracker survives camera loss and reports it`
### 3. Test — commit `test(android-camera): backoff schedule and reset`
The CameraX binding itself is not unit-testable on JVM — extract the backoff/diagnosis
policy into a small pure class (e.g. `ReconnectPolicy`) and test THAT: sequence
3/6/12/24/30/30, reset-on-success, one-shot diagnosis flag after 3 failures. Run once:
`.\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.camera.*"`.

## Acceptance criteria

- `grep -n "cameraState" android/app/src/main/kotlin/com/chesslab/tracker/camera/TrackerCamera.kt` hits.
- `ReconnectPolicy` (or equivalent) test green; pre-existing camera tests green.
- No second `ProcessCameraProvider.getInstance` call introduced
  (`grep -c "ProcessCameraProvider" android/app/src/main/kotlin/com/chesslab/tracker/camera/TrackerCamera.kt`
  unchanged vs before, verify count in STATUS.md).
- ktlint/detekt clean for `:app`.

## Do NOT

- No UI changes beyond the existing status note (phase 04 owns UI).
- Do not change `DynamicResolutionController` behaviour.
