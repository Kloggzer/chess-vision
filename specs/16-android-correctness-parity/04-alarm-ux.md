# Phase 04 — alarm UX: accept-CNN preview, red board tint, in-app CNN debug

## Why

The alarm flow works but the user flies blind: the recovery card offers only
Undo/New-baseline (`ui/TrackingScreen.kt:209-226`), the board is not visibly alarmed
(only the banner), and the CNN's per-square reads / exact input crops are adb-only
(`service/CnnIntegration.kt::dumpCrops:146-181`, logcat `endpointStats`). Python
references: `779fb86` (`accept_cnn_position(preview=True)` — per-square change list
shown before adopting) and `6e31e35` (`/crops.jpg` — the exact 64 model-input crops).

## Design (decided — do not redesign)

1. **Accept CNN position (with preview).** Port `tracker.py::accept_cnn_position`:
   label-confident squares take the observed piece, unconfident keep the game-state
   piece; kings-guard (exactly one king per colour, else reject with the latch
   intact); side to move preserved; castling rights pruned; history cleared; alarm
   cleared; baseline re-captured. Preview first: a dialog listing every change as
   `square: from → to (conf %)` with Confirm/Cancel. Implementation home:
   `cnn/CnnRecovery.kt` or a new `cnn/AcceptCnnPosition.kt` (pure function
   `(Game, OccupancyObservation, confThr) → AcceptResult(changes, fen) | Rejected(reason)`)
   + a button in the alarm recovery card.
2. **Red board tint while alarmed:** `ui/ChessBoard.kt` (or `OverlayBoard.kt` — find
   the reconstructed-board composable via `grep -rn "alarm" android/app/src/main/kotlin/com/chesslab/tracker/ui/`)
   gets an error-tinted border/scrim bound to `state.alarm != null`, using the
   existing `Danger` colours (`ui/theme/Color.kt:32-38`).
3. **In-app CNN debug view:** a debug screen/sheet showing (a) the 64 crops of the
   latest observation as an 8×8 grid with square labels (reuse `dumpCrops`' crop
   extraction — refactor it so UI and dump share one crops-provider), (b) per-square
   `label@conf` list sorted by confidence for the current observation. Entry point:
   wherever the existing debug affordances live (`grep -rn "debug" android/app/src/main/kotlin/com/chesslab/tracker/ui/ | head`)
   — do not invent a new nav topology; a long-press or overflow action is fine.

## Steps

### 1. Pure accept-CNN function + tests — commit `feat(android-cnn): accept-CNN-position with per-square change preview (pure core)`
Mirror the Python tests: `test_accept_cnn_position_preview_changes_nothing`,
`test_accept_cnn_position_adopts_board_and_clears_latch`,
`test_accept_cnn_position_rejects_missing_king` (`tests/test_move_tracker.py`).
### 2. Alarm card button + preview dialog — commit `feat(android-ui): Accept CNN position action in the alarm card`
### 3. Red board tint — commit `feat(android-ui): board is error-tinted while the alarm is latched`
### 4. CNN debug view — commit `feat(android-ui): in-app view of the 64 CNN crops + per-square reads`

Run once: `.\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.cnn.*"`
plus any touched UI model tests (`ui/*Test.kt` for files you edited).

## Acceptance criteria

- The 3 ported accept-CNN tests green; preview provably mutates nothing.
- Board composable renders the alarm tint (UI model test or screenshot-free state
  assert — match how existing `ChessBoardTest.kt` asserts).
- ktlint/detekt clean for `:app`.

## Do NOT

- No engine-module changes (all plumbing landed in phase 02).
- Do not remove the adb `dumpCrops` path — the UI shares its provider, both stay.
- This phase is OPTIONAL for the run: if any earlier phase is blocked, leave this
  `todo` and stop.
