# Phase 06b — tracking UI: board, moves, alarm card, promotion, preview overlay

> Module `:app`, package `com.chesslab.tracker.ui` (+ `ui.tracking`, `ui.theme`). Runs in
> parallel with 06a and 06c on strictly disjoint files. Read `entry.md` completely first.
>
> `android-legacy/**` is a **known-wrong implementation**. Read
> `android-legacy/app/src/main/kotlin/com/chesslab/tracker/ui/TrackingScreen.kt` (664 LOC)
> and `ChessBoard.kt` for Compose idioms ONLY — never for architecture or tracker logic.
> The legacy screen is also the size anti-pattern this phase fixes.

## Why

This screen is used **while playing over a physical board**: the phone sits on a table at
arm's length and the user glances at it between moves. It must answer three questions in
under a second — *what does it think the position is*, *is it confused*, *does it need
something from me*. Everything else is secondary.

Two structural rules exist because the previous port broke them:

- **The UI never touches engine state directly.** `:core-engine` is a pure state machine
  driven by exactly one thread (entry.md hard rule 2). The UI's only input is an immutable
  `TrackerStatus` snapshot plus a `TrackerEvent` stream. A composable that reads engine
  fields, or a callback that mutates them off the owning thread, reintroduces the entire
  race class `self.lock` guards in Python.
- **The UI never blocks the analyzer thread.** `TrackerStatus` is *sampled*, not pushed per
  frame. Commit `4a7609e` measured preview publishing as a real frame-loop cost; the
  service (06c) already converts off-thread, and this phase must not add a synchronous hop
  back.

The alarm surface ports `specs/16-android-correctness-parity/04-alarm-ux.md`, which stays
valid as a *behaviour* spec: red board tint bound to `status.alarm != null`, and an
**Accept CNN position** action that shows a per-square change preview before adopting.

## Design (decided — do not redesign)

### Data in

```kotlin
// From 06c. Signatures pinned for both phases.
val status: StateFlow<TrackerStatus>   // sampled at ~10 Hz by the service
val events: SharedFlow<TrackerEvent>   // replay = 0, extraBufferCapacity >= 32
```

`TrackingViewModel` maps `TrackerStatus` → `TrackingUiState` in a **pure function**
(`StatusUiModel.kt`) so the mapping is unit-testable without Compose. The 10 Hz sampling is
the service's job — do not add a second `sample()` here, and do not `collect` the status in
more than one place.

### Layout (portrait, single scroll-free screen)

```
┌───────────────────────────────────────┐
│  STATE  "moving"            12.4 fps  │  <- big, 28sp+, colour-coded
│  note / stuck reason (1 line)         │
├───────────────────────────────────────┤
│                                       │
│          B O A R D  (FEN)             │  <- >=60% of the width, square
│                                       │     last-move squares highlighted
├───────────────────────────────────────┤
│  [alarm card, only when alarmed]      │
├───────────────────────────────────────┤
│  move list (2 columns, auto-scrolled) │
├───────────────────────────────────────┤
│  camera preview + board quad overlay  │  <- collapsible, off by default
├───────────────────────────────────────┤
│  [Undo]  [Reset game]  [Recalibrate]  │
└───────────────────────────────────────┘
```

- **Dark, high-contrast, glanceable.** Near-black background, light pieces, no thin
  hairlines, no <14sp text anywhere. Minimum touch target 48dp. The state text and the
  board are the two things readable from a metre away.
- The board renders **only** from `status.fen` — never from an internal move list replay.
  The FEN is the single truth; a second reconstruction path can drift.
- Move list is derived from `TrackerEvent.MoveCommitted`/`SequenceCommitted` SAN and shows
  the `decider` as a small subscript (`diff`, `cnn`, `pair`, `recovery`) — the
  decision-provenance the debug workflow relies on.

### Alarm card (ports `specs/16/04-alarm-ux.md`)

Shown iff `status.alarm != null`:
- Board gets an error-tinted scrim/border bound to the same condition (`Danger` colours in
  `ui/theme/Color.kt`).
- Card text: `alarm.kind`, the conflicting squares (`alarm.conflicts`), and — when present —
  `alarm.guessSan` as *"looks like: Nf3"*.
- Actions, in this order: **Accept CNN position** (primary), **Undo**, **New baseline**.
- **Accept CNN position opens a preview dialog first**: a list of `square: from → to (conf %)`
  computed by `:core-cnn`'s pure accept-CNN function (phase 04c) via
  `TrackerEngine.acceptCnnPosition()`'s preview path. Confirm/Cancel. **Cancel mutates
  nothing** — assert this in a test.
- While alarmed, the engine blocks commits (entry.md invariant 9). The UI must therefore
  never imply the game is progressing: freeze the fps colour to the alarm colour and keep
  the state line pinned to the alarm.

### Promotion chooser

Driven by `TrackerEvent.PromotionPending(from, to)`:
- Modal dialog, **not dismissible by back or outside tap** — the engine is waiting.
- Four large (≥72dp) piece buttons Q / R / B / N in the side-to-move colour, in that order.
- Selecting one calls `TrackerEngine.choosePromotion(piece)` through the 06c seam.
- If a `MoveCommitted` for the same `from→to` arrives while the dialog is open, close it.

### Camera preview + overlay

- Renders the service's `rawPreview: StateFlow<Bitmap?>` (06c). **No CameraX types in
  `ui/`** — the single-owner rule (05a, MEMORY `android-single-camera-owner`).
- Overlay draws the board quad from `status` corners and, optionally, the changed /
  shadow-vetoed / occlusion-vetoed square sets in three distinct colours. Keep it off by
  default; it is a diagnostic, not the main view.

### Navigation (this phase owns it)

`ui/ChesslabNavHost.kt` + `MainActivity.kt` are owned here. Routes: `tracking` (start),
`calibration`, `settings`, `debug`, `analysis`, `games`. 06a's calibration entry point is
pinned as
```kotlin
@Composable fun CalibrationRoute(onCalibrated: () -> Unit, onBack: () -> Unit)
```
Wire it; do not modify any file under `ui/calibration/`. Later phases (07/08) attach their
routes to the same host — leave clearly named `TODO(phase 07)` stubs rather than inventing
a second nav topology.

### Size discipline

No composable file over **250 LOC**; the legacy 664-LOC `TrackingScreen.kt` is the
anti-pattern. One concern per file.

## Files you own

Create under `android/app/src/main/kotlin/com/chesslab/tracker/`:

- `MainActivity.kt` — activity, permission request, theme host. **≤ 120 LOC.**
- `ui/ChesslabNavHost.kt` — routes. **≤ 120 LOC.**
- `ui/theme/Color.kt`, `ui/theme/Theme.kt`, `ui/theme/Type.kt` — dark high-contrast theme.
- `ui/tracking/TrackingScreen.kt` — layout host only. **≤ 200 LOC.**
- `ui/tracking/TrackingViewModel.kt` — status/event collection, action dispatch. **≤ 180 LOC.**
- `ui/tracking/StatusUiModel.kt` — pure `TrackerStatus` → `TrackingUiState` mapping.
- `ui/tracking/BoardCanvas.kt` — FEN → board rendering, alarm tint, last-move highlight.
- `ui/tracking/MoveList.kt`
- `ui/tracking/AlarmCard.kt` + `ui/tracking/AcceptCnnDialog.kt`
- `ui/tracking/PromotionDialog.kt`
- `ui/tracking/PreviewOverlay.kt` — preview bitmap + quad/square-set overlay.

Tests under `android/app/src/test/kotlin/com/chesslab/tracker/ui/tracking/`:

- `StatusUiModelTest.kt`, `TrackingViewModelTest.kt`, `MoveListModelTest.kt`,
  `AcceptCnnDialogModelTest.kt`

You own no other file. You do **not** own `ui/calibration/**`, `service/**`, `camera/**`,
`pipeline/**`, `cnn/**`, or the manifest. Need a change there? **STOP** and record a
blocker in `STATUS.md`.

## Steps

### 1. `ui/theme/**` — commit `feat(android-ui): dark high-contrast tournament theme`
### 2. `ui/tracking/StatusUiModel.kt` — pure mapping — commit `feat(android-ui): pure TrackerStatus to UI-state mapping`
### 3. `ui/tracking/BoardCanvas.kt` + `MoveList.kt` — commit `feat(android-ui): FEN-driven board rendering and move list with decision provenance`
### 4. `ui/tracking/AlarmCard.kt` + `AcceptCnnDialog.kt` + alarm tint — commit `feat(android-ui): alarm card with red board tint and Accept-CNN-position preview`
### 5. `ui/tracking/PromotionDialog.kt` — commit `feat(android-ui): promotion chooser driven by TrackerEvent.PromotionPending`
### 6. `ui/tracking/PreviewOverlay.kt` — commit `feat(android-ui): camera preview with board quad and evidence overlay`
### 7. `ui/tracking/TrackingScreen.kt` + `TrackingViewModel.kt` + `ui/ChesslabNavHost.kt` + `MainActivity.kt` — commit `feat(android-ui): tracking screen host, view model and navigation`
### 8. Tests — commit `test(android-ui): status mapping, alarm state, promotion gating, accept-CNN preview purity`

## Tests

`:app:testDebugUnitTest`, JVM only, on the **pure** parts. **UI/instrumented (Compose)
tests are NOT required for this phase** — do not add `createComposeRule`, do not add the
Compose UI test dependency. Visual behaviour is covered by the manual checklist.

`StatusUiModelTest`
- `state_text_and_colour_per_tracker_state` — waiting / moving / occluded / move.
- `alarm_present_sets_board_tint_and_pins_the_state_line`.
- `note_and_stuck_reason_collapse_to_one_line_with_stuck_winning`.
- `fps_is_rounded_to_one_decimal`.
- `changed_shadow_and_occlusion_sets_map_to_three_distinct_overlay_layers`.

`TrackingViewModelTest` (fake status flow + fake action sink)
- `board_renders_only_from_status_fen` — a status whose FEN disagrees with the move-list
  replay renders the FEN.
- `promotion_dialog_opens_on_PromotionPending_and_is_not_dismissible`.
- `promotion_dialog_closes_when_the_matching_move_commits`.
- `undo_reset_and_recalibrate_are_three_distinct_actions` — no shared handler
  (MEMORY: Reset game ≠ Recalibrate).
- `does_not_collect_status_more_than_once`.

`MoveListModelTest` — `pairs_moves_into_numbered_rows`, `sequence_commit_expands_to_n_rows`,
`decider_is_carried_per_move`.

`AcceptCnnDialogModelTest`
- `preview_lists_every_changed_square_with_from_to_and_confidence`.
- `cancel_dispatches_no_action` — the `specs/16/04` purity requirement.
- `confirm_dispatches_accept_exactly_once`.

Run once, at the end of your phase:
```
cd android; .\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.ui.tracking.*"
cd android; .\gradlew.bat :app:ktlintFormat; .\gradlew.bat :app:detekt
```

## Manual verification checklist (record results in `STATUS.md`)

- [ ] Readable at arm's length: state text and board legible from ~1 m in a lit room.
- [ ] Play 10 moves over the physical board — the move list and board track them; the UI
      stays responsive and the measured fps does not drop when the screen is on.
- [ ] Trigger an alarm (move two pieces at once) → board turns red, card appears, Accept
      CNN position preview lists the right squares; Cancel changes nothing.
- [ ] Promote a pawn → dialog appears, back button does not dismiss it, choosing Q commits.
- [ ] Toggle the preview overlay → quad sits on the board, changed squares light up while a
      hand moves.

## Acceptance criteria

- `grep -rn "androidx.camera\|ProcessCameraProvider" android/app/src/main/kotlin/com/chesslab/tracker/ui/`
  is **empty**.
- `grep -rn "TrackerEngine" android/app/src/main/kotlin/com/chesslab/tracker/ui/` is empty —
  the UI talks only to the 06c seam.
- `grep -rn "createComposeRule\|androidTest" android/app/src/{main,test}/kotlin/com/chesslab/tracker/ui/`
  is empty.
- `grep -c "collect" ui/tracking/TrackingViewModel.kt` — status is collected exactly once.
- `grep -rn "status.fen" ui/tracking/BoardCanvas.kt` hits; no alternate board source exists.
- No file you own exceeds 250 LOC (`TrackingScreen.kt` ≤ 200, `MainActivity.kt` ≤ 120).
- All named tests green; ktlint/detekt clean for `:app`.

## Do NOT

- Do not read or mutate `TrackerEngine` state from the UI, and do not call engine methods
  off the service's owning thread.
- Do not bind a camera or create a `PreviewView` (05a owns the single camera).
- Do not add Compose UI/instrumented tests or their dependencies.
- Do not reconstruct the board from the move list — `status.fen` is the truth.
- Do not merge "Reset game" and "Recalibrate", and do not put calibration UI here (06a).
- Do not make the promotion dialog dismissible.
- Do not add a second `sample()`/throttle over the status flow (06c owns the 10 Hz rate).
- Do not touch `ui/calibration/**`, `service/**`, `camera/**`, `pipeline/**`, `cnn/**`, the
  manifest, or `libs.versions.toml`.
