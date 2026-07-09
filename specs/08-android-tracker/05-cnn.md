# Phase 05 — CNN safeguard: ONNX Runtime Android

## Why

The Python tracker's CNN is a non-blocking safeguard: it verifies committed-
candidate moves by LOCAL occupancy of touched squares and recovers stuck states
via beam search (`cnn_recovery.py`). Same model, same semantics on the phone
using the existing ONNX export (opset 17, `evaluate.py:136-139`).

## Design (decided — do not redesign)

Package `com.chesslab.tracker.cnn` in `:app`. Dependency:
`com.microsoft.onnxruntime:onnxruntime-android` (latest 1.x). Model file
`model.onnx` + its run `config.json` (for `out_size` and class list,
`serving.py:73`) imported by the user via SAF file picker; stored in app files.

```kotlin
class OnnxClassifier(modelDir: File) {
    /** Batch of square crops → per-square probs over the run's classes (13/14 safe). */
    fun predict(crops: List<Bitmap>): List<FloatArray>
}
class CnnSafeguard(
    classifier: OnnxClassifier, camera: TrackerCamera, warper: () -> BoardWarper,
    scope: CoroutineScope, config: CnnConfig,
) : OccupancySafeguard          // interface from phase 01
```

Port with identical semantics and defaults (`config.py:455-492`):
- `OccupancyObservation` (`cnn_recovery.py:29-63`): p_occ/p_empty/p_occluded from
  class probs; `confident(cnnConfThr=0.85)`.
- `verify_move` (`cnn_recovery.py:188`): touched squares only; reliable-axis rule —
  from-square-empty counts FOR, to-square-empty counts AGAINST (`tracker.py:1476-1479`);
  `verifyWindow=8`, `cnnMinAgreement=0.97`, `cnnMarginSquares=1`.
- Recovery `derive_moves_deep` (`cnn_recovery.py:285`): beam search
  `recoveryMaxPlies=4`, beam 8, `minConfidentRecovery=8`; whole-board resync needs
  `minConfidentBoard=32`. Cooldown 2.0 s, periodic check 10.0 s.
- Non-blocking: single worker coroutine, busy-flag serialization (mirror
  `_cnn_busy`, `tracker.py:1180`); NEVER blocks the frame loop.
- Crops: per-square from the warped board with `pad_up=0.35, pad_side=0.05`
  (`config.py:40` CropDefaults), resized to the run's `out_size`. Prefer a
  `captureHiRes()` still (phase 03) for verify when dynamic resolution is on;
  fall back to the current analysis frame.
- With safeguard attached, engine `confirmFrames` drops to 1 (`tracker.py:603`).

Settings section appended (via phase 04's extension point, no UI-file edits):
CNN enabled on/off, model import button, confidence threshold slider (default 0.85).

## Steps

1. `OnnxClassifier` + model import + unit test with a tiny generated ONNX identity model — commit `feat(android-cnn): onnx runtime classifier and model import`
2. `OccupancyObservation` + `verify` port + unit tests (probs fixtures → FOR/AGAINST/TIMEOUT) — commit `feat(android-cnn): local occupancy verify`
3. Recovery beam search + unit tests (fixture board states) — commit `feat(android-cnn): stuck-state recovery beam search`
4. Wire as `TrackerService.safeguard` + settings section — commit `feat(android-cnn): safeguard wiring and settings`

## Tests (write, run once, targeted)

`./gradlew :app:testDebugUnitTest --tests "com.chesslab.tracker.cnn.*"`

## Acceptance criteria

- [ ] Verify tests cover the reliable-axis rule exactly (empty→FOR at from, empty→AGAINST at to).
- [ ] All defaults match `TRACK_DEFAULTS` (confThr 0.85, window 8, agreement 0.97, plies 4, board 32, recovery 8, cooldown 2.0, interval 10.0).
- [ ] Frame loop never awaits the safeguard (`grep -n "withContext\|runBlocking" …/CnnSafeguard.kt` reviewed — busy-flag skip, no blocking).
- [ ] App works with safeguard disabled/no model (null path unchanged).

## Do NOT

- No training, no export changes Python-side.
- Do not verify whole-board before commit — local occupancy only (whole-board is resync's job).
- Do not edit files under `ui/` — use the extension point.
