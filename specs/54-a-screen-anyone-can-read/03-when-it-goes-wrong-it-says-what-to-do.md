# Phase 03 — When it goes wrong, it says what to do

Depends on 02 (same screen file). Touches `core-engine` additively — rebase before you start;
another agent may be in that module.

## Why

Everything on the failure path is written for the person who built it.

**The alarm card** (`AlarmCard.kt`) offers three actions, and its primary cannot be honest:
`Accept CNN position` opens a dialog whose preview is built from `status.debug?.cnnReads`
(`TrackingViewModel.kt:188-196`) — and that payload only exists while the DEBUG screen is
composed (`DebugSession.setDebugEnabled`, `DebugSession.kt:32`). From here
`AcceptCnnPreview.complete` is false, so the dialog lists `e4: pawn → ?`: an irreversible
action with an unknown result. The user, 2026-08-12: *"ist noch nicht gut genug und fliegt
daher erstmal raus"*.

The other two are terms from the implementation. `New baseline` is the diff algorithm's
reference frame; what it *means* for the player is "I have put the pieces back, carry on" —
which is also the only correct instruction once `Accept CNN` is gone, because `captureBaseline()`
keeps the app's position and re-references the pixels. The card must therefore tell the player
to make the **physical** board match the screen, not the other way round.

And the facts are printed as notation: `Board disagrees on: a7, c7, b8 (+3)`
(`AlarmCard.kt:129`) — on a screen that is drawing that very board.

**The info line** is worse. `StatusUiModel.infoLine` returns `status.note` verbatim
(`StatusUiModel.kt:279`), and `resolveNote` (`StatusPublisher.kt:56-86`) composes English
prose in the runtime — including `"stuck: ${status.stuckReason}"`, which puts a raw engine
identifier (`too_many_changed`, `cnn_desync`) in front of the player, and
`"CNN safeguard OFF: … — tracking diff-only"`. The same string is the **notification** text.

## Design (decided — do not redesign)

### A. `PlayerNote`: the condition, not the sentence

New file `core-engine/src/main/kotlin/com/chesslab/engine/api/PlayerNote.kt`:

```kotlin
/**
 * A condition the PLAYER can act on, as a fact. The words are the UI's — `TrackerStatus.note`
 * keeps the developer's prose and is shown on the debug screen unchanged.
 */
sealed interface PlayerNote {
    data object SceneDark : PlayerNote
    data class CameraDown(val retryInS: Int) : PlayerNote
    data class FeedStopped(val forS: Int) : PlayerNote
    data object CnnOff : PlayerNote
    data object SizeMismatch : PlayerNote
    data object BoardBusy : PlayerNote
}
```

`TrackerStatus` gains **one additive field with a default** — no other constructor changes:

```kotlin
// core-engine/api/TrackerStatus.kt, beside `note`
val playerNote: PlayerNote? = null,
```

`StatusPublisher` fills it in a `resolvePlayerNote` beside `resolveNote`, from the same inputs
and in the same order. `resolveNote` is **not changed** — the developer line keeps every word
it has, including the ones this phase is hiding from the player.

| `resolveNote` rung | `PlayerNote` |
|---|---|
| `alarm != null` | **none** — the card owns it, and the label is already `POSITION_LOST` |
| `stuckReason != null && pipelineNote == null` | `BoardBusy` — *every* reason, see Do-NOT |
| `CameraHealth.Off` | **none** — the label is already `CAMERA_OFF` |
| `CameraHealth.Down(reason, retryInS)` | `CameraDown(retryInS)` |
| the dead-feed note (`StatusPublisher.kt:218`) | `FeedStopped(since / 1000)` |
| `CnnState.Failed` | `CnnOff` |
| `mismatch != null` | `SizeMismatch` |
| the dark-frame pipeline note (`FramePipeline.kt:250`) | `SceneDark` |

### B. The screen's one prose line

`TrackingUiState.infoLine: String?` is **deleted**, together with `STOPPED_INFO` and `OFF_INFO`
(`StatusUiModel.kt:150,155`). What replaces it is `val note: PlayerNote?` carried straight
through, and a composable that picks the sentence:

1. alarm latched → blank (the card is directly below and says everything)
2. `task != WATCH` → the task's own sentence (`tracking_info_off`, `tracking_info_paused`,
   `tracking_info_calibrate`)
3. else → `ui.note`, or blank

`SceneDark`'s sentence names the control that fixes it, and phase 02 put that control in the
app bar: *"Too dark to read the board — try the camera light."*

### C. The alarm card, rewritten

```
┌──────────────────────────────────────┐
│  The board doesn't match             │   titleLarge, Danger
│                                      │
│  The app lost track. Put the pieces  │   bodyMedium
│  back the way this board shows them, │
│  then continue. 3 squares differ.    │
│                                      │
│     [       It matches now      ]    │   FilledAction, Accent → onNewBaseline
│                                      │
│         Take back move               │   OutlineAction, full width → onUndo
└──────────────────────────────────────┘
```

- `headlineFor` keeps its shape — a `when` over `alarm.kind` with the raw kind as the fallback,
  so a new latch degrades instead of vanishing — and `illegal_move` maps to the new headline.
- **The conflict squares are drawn, not spelled.** `AlarmUi.conflicts` is passed to
  `BoardCanvas` as a new `conflicts: Set<String> = emptySet()` parameter and marked there
  (a `Danger` ring inside the square, at the same weight as the last-move marker); the card
  keeps only the count: `<plurals name="alarm_squares">`. `CONFLICTS_SHOWN` and the joined
  list go away.
- Because the list is gone, the card's prose can no longer grow with the board's disagreement —
  **delete `PROSE_MAX` and the `heightIn(max = …).verticalScroll(…)` wrapper**
  (`AlarmCard.kt:84`). That scroll existed only to stop the conflict list from squeezing the
  buttons off the screen; keeping it would keep a scrollbar around three fixed lines.
- `guessSan` stays, as its own line: `alarm_guess` = *"It looks like %1$s was played."*
- `undoDetail` (phase 00: the SAN list) stays and renders through
  `tracking_take_back_detail`.

### D. `Accept CNN` moves behind the developer door

It is **relocated, not deleted** — the engine route `TrackerSession.acceptCnnPosition()`
(`TrackerSession.kt:72`) stays, and the debug screen is where the reads it needs exist.

- `ui/tracking/AcceptCnnDialog.kt` → `ui/debug/AcceptCnnDialog.kt`; its test
  `AcceptCnnDialogModelTest.kt` moves with it. Package and imports follow; the pure
  `acceptCnnPreview` function is unchanged.
- `DebugSession` (`DebugSession.kt:19`) gains `fun acceptCnnPosition()`; implemented in
  `DebugSessionBinding.kt:26` and as a no-op in `NoDebugSession`.
- `DebugViewModel` gains the three handlers, lifted verbatim from `TrackingViewModel.kt:188-207`.
- `CnnReadsPanel` (the tab that already shows the reads) gets the action, as a plain
  `TextButton` beside the existing controls — it stays in the developer's vocabulary and is
  **not** localized.
- `TrackingViewModel` loses `acceptCnn`, `onAcceptCnnRequested`, `onAcceptCnnCancelled`,
  `onAcceptCnnConfirmed`; `TrackingScreen`'s `acceptCnn?.let { AcceptCnnDialog(…) }` goes with
  them. Update `TrackingViewModelTest` accordingly.

### E. The notification speaks the same words

`TrackerNotification.kt:76,87,95` composes `"$state · $moves moves"`, `"tracking"`,
`"stopped · camera off"` and `"Stop tracking"` from raw engine state. It takes the phase-00
`TrackerLabel` and the move count instead, and reads its strings from resources — `notif_stop`
already exists in `strings.xml` and phase 00 kept it only if used; restore it here if not.

The alarm's notification sentence — today built inside `resolveNote` and the only alarm signal
that reaches a backgrounded user — becomes `notif_alarm`: *"The board doesn't match. Open the
app to fix it."*

### Strings this phase adds

```xml
<string name="alarm_headline">The board doesn\'t match</string>
<string name="alarm_body">The app lost track. Put the pieces back the way this board shows them, then continue.</string>
<plurals name="alarm_squares">
    <item quantity="one">%1$d square differs.</item>
    <item quantity="other">%1$d squares differ.</item>
</plurals>
<string name="alarm_guess">It looks like %1$s was played.</string>
<string name="alarm_continue">It matches now</string>
<string name="tracking_info_off">No camera is running. Start tracking to detect moves — Games and Review need none.</string>
<string name="tracking_info_paused">No frames are arriving — the camera is released. Resume to continue; the game is kept.</string>
<string name="tracking_info_calibrate">The board has not been set up yet.</string>
<string name="note_scene_dark">Too dark to read the board — try the camera light.</string>
<string name="note_camera_down">The camera stopped. Trying again in %1$d s.</string>
<string name="note_feed_stopped">No picture for %1$d s.</string>
<string name="note_cnn_off">The extra safety check is off — moves are read from motion alone.</string>
<string name="note_size_mismatch">The camera\'s picture size changed — the board needs setting up again.</string>
<string name="note_board_busy">Waiting for the board to settle.</string>
<string name="notif_alarm">The board doesn\'t match. Open the app to fix it.</string>
```

## Steps

1. `core-engine/api/PlayerNote.kt` (new) + `TrackerStatus.kt` — commit
   `feat(engine): the status carries the condition a player can act on`
2. `tracker-runtime/service/StatusPublisher.kt` — commit
   `feat(runtime): resolvePlayerNote beside resolveNote`
3. `ui/tracking/StatusUiModel.kt` + `TrackingScreen.kt` — commit
   `feat(tracking): the info line is one sentence a player can act on`
4. `ui/tracking/AlarmCard.kt` + `BoardCanvas.kt` — commit
   `feat(tracking): the alarm shows the squares and asks for the board back`
5. `ui/debug/AcceptCnnDialog.kt` (moved), `DebugSession.kt`, `DebugSessionBinding.kt`,
   `DebugViewModel.kt`, `CnnReadsPanel.kt`, `TrackingViewModel.kt`, `TrackingScreen.kt` —
   commit `refactor(debug): Accept CNN lives where the reads it previews do`
6. `service/TrackerNotification.kt` — commit
   `feat(service): the notification uses the words the screen uses`

## Tests (write, run once, targeted)

| Test | Case |
|---|---|
| `StatusPublisherTest` (find it via `grep -rln "resolveNote" android/*/src/test`) | a latched alarm yields `playerNote == null` and leaves `note` unchanged |
| `StatusPublisherTest` | `CameraHealth.Down(retryInS = 5)` → `PlayerNote.CameraDown(5)`, and `note` still carries the reason |
| `StatusPublisherTest` | a dark-frame pipeline note → `SceneDark`; a stuck reason with no pipeline note → `BoardBusy` |
| `StatusUiModelTest` | `infoLine` is gone; `note` is carried through unchanged from the status |
| `TrackingViewModelTest` | the accept-CNN handlers are gone (compile-level; assert by the acceptance grep) |
| `AcceptCnnDialogModelTest` | unchanged assertions, new package |

```
gradlew.bat :core-engine:test :tracker-runtime:test --rerun-tasks
gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.ui.*" --rerun-tasks
```

Prove the alarm card by replaying a clip that latches one — `scripts/android-emulator.ps1`
with a clip whose board is disturbed — and screenshot the card. If no such clip exists, say so
in the report rather than claiming the path was exercised.

## Acceptance criteria

- `grep -rn "Accept CNN" android/app/src/main/kotlin/com/chesslab/tracker/ui/tracking` returns
  nothing, and `grep -rn "acceptCnn" android/app/src/main/kotlin/com/chesslab/tracker/ui/debug`
  does.
- `grep -rn "infoLine\|PROSE_MAX\|CONFLICTS_SHOWN" android/app/src/main` returns nothing.
- `grep -rn "stuck: " android/app/src/main android/tracker-runtime/src/main` hits only
  `resolveNote` — i.e. the developer line, never a player-facing one.
- `TrackerStatus`'s new field has a default, and `grep -rn "TrackerStatus(" android --include=*.kt | wc -l`
  is unchanged from before the phase (no constructor site had to be edited).
- `:core-engine:detekt :tracker-runtime:detekt :tracker-runtime:ktlintCheck :app:ktlintCheck :app:detekt`
  clean, no new suppressions.

## Do NOT

- **Do not delete `AcceptCnnDialog` or `acceptCnnPosition()`.** "Erstmal raus" is out of the
  player's way, not out of the build; the engine path stays reachable and tested.
- Do not change `resolveNote`. Two resolvers for one slot is the defect specs/49 removed; these
  are two slots — one for the player, one for the log — and the developer's one is unchanged.
- Do not map stuck reasons to different player sentences yet. `too_many_changed`, `occluded`
  and `cnn_desync` all become `BoardBusy`; if that turns out to hide something a player needed,
  record it in STATUS.md as a measured finding rather than inventing a vocabulary here.
- Do not localize `ui/debug/`, including the moved dialog.
- Do not make `TrackerStatus.playerNote` non-null or non-default — every existing construction
  site must keep compiling untouched.
- Do not draw the conflict squares from `overlay.cnnConflicts`. The card is about
  `alarm.conflicts`, which is the latch's own evidence.
