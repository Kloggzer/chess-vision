# Phase 02 — Tracking screen + two-level board toggle

## Why

The Tracking screen (`ui/TrackingScreen.kt`) is a plain vertical `Column` of Material
defaults, and the board-view choice (Rendered digital board vs live/warped camera vs
debug overlays) is not here at all — it is the `overlayView` `FilterChip` row on the
Settings screen (`SettingsScreen.kt:149,186-203`). This is the screen the user watches
the game on, so the board becomes the hero and the view switch moves onto it as a
**two-level toggle**: `Rendered | Video`, and under Video a sub-row
`Raw · Warped · Diff · Shadow · Occlusion`. Transient messaging becomes overlays so the
board never reflows.

## Design (decided — do not redesign)

Files: `ui/TrackingScreen.kt` (rebuild layout), `ui/OverlayBoard.kt` (first-class
Rendered mode), `ui/ChesslabNavHost.kt` (`TrackingRoute` signature), and the board/tap
palette swap to `BoardPalette` in `ChessBoard.kt`/`OverlayBoard.kt`.

### Board view model — local UI state, not a persisted setting

Introduce on the Tracking screen:

```kotlin
enum class BoardMode { RENDERED, VIDEO }
// VIDEO sub-views reuse the existing OverlayView (service/TrackerSettings.kt:11):
//   Raw = OverlayView.CAMERA, Warped = OverlayView.BOARD, Diff = OverlayView.DIFF,
//   Shadow = OverlayView.SHADOW, Occlusion = OverlayView.OCCLUSION.
```

`BoardMode` and the selected `OverlayView` are `rememberSaveable` **local** state in
`TrackingScreen` (default `RENDERED`, sub-view `BOARD`/Warped). The persisted
`settings.overlayView` is no longer read here for user switching — but KEEP the enum
and DataStore persistence (engine/debug and phase 07 still reference the type). The
`effectiveView` auto-force-to-CAMERA-when-waiting logic (`TrackingScreen.kt:52-58`)
becomes: if `board == null && state.trackerState == WAITING_BOARD`, show the camera
regardless of `BoardMode` (so the empty state still shows the live feed).

`MOTION` overlay: the current enum has both `MOTION` and `DIFF` (both mark
`debug.changed`, `OverlayBoard.kt:85`). Collapse the sub-row to the five above (drop
`Motion` from the picker; the enum stays). Note in STATUS if the engine still needs it.

### `OverlayBoard` — Rendered as a first-class branch

`OverlayBoard` (`OverlayBoard.kt:58`) currently: `CAMERA`→camera, else if `bitmap==null`
→`ChessBoard`, else warped image + marks. Add a `renderedMode: Boolean` param (or a
`BoardMode`) so Rendered ALWAYS draws `ChessBoard(fen)` even when a warped `bitmap`
exists. Keep the debug `marks`/`grid` overlays for the Video sub-views. Swap the
literal overlay colors (`OverlayBoard.kt:31-33`) to `BoardPalette.Mark*`, and the
board square colors in `ChessBoard.kt:22-23,95-104` to `BoardPalette.Light/DarkSquare`
and last-move wash `BoardPalette.LastMove`.

### Layout (mockup: Tracking states a/b/c/d)

Root `Box` (so overlays can float) wrapping a `Column`:

1. **App bar row** — brand + `StatusPill(state)` + optional last-move text. Replaces
   `TrackingHeader` (`TrackingScreen.kt:182-199`).
2. **`BoardFrame`** (phase 01) containing `OverlayBoard`, constrained `heightIn(max=…)`
   as today. The board keeps a FIXED position across all states.
3. **`SegmentedToggle(["Rendered","Video"])`**; when `VIDEO`, a `SubTabRow` of the five
   sub-views directly beneath. (Rendered hides the sub-row — no layout jump because the
   sub-row sits below the board, not above it.)
4. **Move strip** — the existing horizontally-scrolling mono `MoveList`
   (`TrackingScreen.kt:340-356`), restyled via components; current move accented.
5. **Action rows** — `GhostButton` Undo; `QuietButton` Reset + `GhostButton` Recalibrate
   (keep the `ConfirmDialog` guards at `TrackingScreen.kt:142-163`).
6. **Debug panel** — when `settings.debugCard`, a collapsible panel of `KeyValueRow`s
   (port `DebugCard`, `TrackingScreen.kt:358-377`) styled per mockup.

**Overlays (float, no reflow) — from `ui/Overlays.kt`:**
- `OverlayToast` for `state.announcement` (the move announcement) — replaces the inline
  live-region `Text` at `TrackingScreen.kt:73-83`; keep it a `LiveRegion`.
- `OverlayBanner` for `state.alarm` (illegal-move) — replaces the inline `alarm`/
  `AlarmBanner`; keep the assertive live region + the `playAlarmTone()` one-shot
  (`TrackingScreen.kt:313-338`, move it, don't drop it).
- `OverlayCard(attn=true)` for STUCK/alarm recovery — replaces the inline `RecoveryCard`
  (`TrackingScreen.kt:201-231`); actions Take-back + Recalibrate.
- `OverlayCard` for the pre-calibration prompt — replaces `CalibratePrompt`
  (`TrackingScreen.kt:237-248`); floats over the camera. Keep the "Calibrate manually"
  action → `onCalibrate`.

Promotion `AlertDialog` (`TrackingScreen.kt:165-179`) stays a dialog (already modal,
no reflow) — restyle only.

### Route wiring

`ChesslabNavHost.kt:96-121` `TrackingRoute` passes `overlayView = settings.overlayView`
into `TrackingScreen`. Drop that param (view state is now local). Everything else
(`onUndo`, `onReset`, `onPromote`, `onCalibrate`, `onRecalibrate`, `board`, `rawPreview`,
`calibrated`, `showDebug`) is unchanged.

## Steps

1. `ChessBoard.kt` + `OverlayBoard.kt` — palette swap to `BoardPalette`; add first-class Rendered branch + `renderedMode` param — commit `feat(android-ui): rendered board as first-class board mode`
2. `TrackingScreen.kt` — `BoardMode`/sub-view local state, `SegmentedToggle` + `SubTabRow`, rebuilt layout with components — commit `feat(android-ui): tracking screen board switch and layout`
3. `TrackingScreen.kt` + `Overlays.kt` usage — move announcement/alarm/recovery/prompt to floating overlays (no reflow); relocate `playAlarmTone` — commit `feat(android-ui): overlay messaging on tracking screen`
4. `ChesslabNavHost.kt` — drop `overlayView` from `TrackingRoute` — commit `refactor(android-ui): tracking route drops persisted overlay view`

## Tests (write, run once, targeted)

- `:app:testDebugUnitTest --tests "com.chesslab.tracker.ui.TrackingScreen*"` (or a new
  `BoardModeTest`): assert the `BoardMode`/`OverlayView` mapping (Raw→CAMERA,
  Warped→BOARD, Diff→DIFF, Shadow→SHADOW, Occlusion→OCCLUSION) and the
  waiting-state camera fallback.

## Acceptance criteria

- [ ] `grep -rn "OverlayRow\|overlayView" android/app/src/main/kotlin/com/chesslab/tracker/ui/TrackingScreen.kt` → no hits (moved to local `BoardMode`).
- [ ] `grep -rn "0xFFFF00FF\|0xFF00E5FF\|0xFFEBECD0\|0xFF779556" android/app/src/main/kotlin/com/chesslab/tracker/ui/{ChessBoard,OverlayBoard}.kt` → no hits (all via `BoardPalette`).
- [ ] Rendered mode draws `ChessBoard(fen)` even when a warped `board` bitmap is non-null.
- [ ] Alarm/recovery/announcement/prompt are rendered from `ui/Overlays.kt` inside the root `Box` (float), not inserted into the main `Column`.
- [ ] `AlarmBanner`'s assertive `LiveRegion` + `playAlarmTone()` survive; move announcement stays a live region.
- [ ] `:app:ktlintCheck :app:detekt` zero new findings.

## Do NOT

- Do not remove the `OverlayView` enum or its DataStore persistence
  (`service/TrackerSettings.kt`, `SettingsRepository`) — engine/debug/phase 07 use it.
- Do not change engine/service behavior — this is UI only.
- Do not hardcode strings; add any new labels ("Rendered", "Video", "Raw", "Warped")
  to `strings.xml`.
- Do not touch `SettingsScreen.kt` (phase 07 removes the overlay row there).
