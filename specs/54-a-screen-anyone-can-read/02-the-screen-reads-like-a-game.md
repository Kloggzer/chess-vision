# Phase 02 — The screen reads like a game

Depends on 01 (same file). Owns `ui/tracking/TrackingScreen.kt` after 01 has landed.

## Why

The nominal case. What the screen shows while a game is being watched is a pipeline report:

```
WAITING                                    14.8 fps
                                           camera 30
```

`fps` is the largest number on the screen and nobody who is playing can act on it — and it is
not even lost by removing it: **the debug Timings panel already shows both rates with their
5-second medians** (`TimingsPanel.kt:50-57`), behind the developer door where it belongs.

What is missing is everything a person watching a game wants: **whose turn it is** and **which
move number**. Neither has ever been on this screen.

Two more things the user asked for, both about the camera:

- *"mit cameralight und camera view direkt in der ersten view"* — the torch and the camera view
  are two taps deep in the `⋯` menu (`TrackingScreen.kt:246-276`). The torch is the single most
  useful control when a board is failing to read, and it is the hardest one to find.
- The not-ready layout shows the raw camera frame with no indication of how the board should
  sit in it.

## Design (decided — do not redesign)

### A. The status line becomes a game line

```kotlin
// ui/tracking/StatusUiModel.kt — additions
enum class Turn { WHITE, BLACK }

data class TrackingUiState(
    val state: TrackerLabel,     // from phase 00
    val tone: StateTone,
    /** Side to move, straight off the FEN. Null when the FEN is unparseable. */
    val turn: Turn?,
    /** The FEN's fullmove number — what a player calls "move 14". Null when unparseable. */
    val moveNumber: Int?,
    …
)
```

Derived by splitting `status.fen` on spaces: field 1 is `w`/`b`, field 5 is the fullmove
number. Do **not** pull in a `Board()` for this — the FEN is already the app's own output, and
parsing two fields is cheaper and cannot throw. A FEN with fewer than 6 fields yields nulls.

```
┌──────────────────────────────────────┐
│ ● Live               White to move · 14
```

- Left: a filled dot in `toneColor(ui.tone)` and the label at `titleMedium` in the same colour
  — unchanged structure, new content.
- Right: `White to move · 14` at `labelSmall` in `OnSurfaceMuted`. Both halves are absent when
  their value is null, and the whole right half is absent unless `ui.ready`.
- The `Figure(ui.fpsText, tone)` call goes away with the fields behind it.

**Deleted from `StatusUiModel.kt`:** `fpsText`, `fpsDetail` (both the fields and the two
private functions), `formatFps`, `formatRate`, `FPS_SAME`, `STOPPED_FPS_TEXT`,
`NO_FRAMES_TEXT`, `NOT_CALIBRATED_TEXT`, `NO_DETECTION_TEXT`. Their information is either in
`TrackerLabel` (phase 00's `NO_DETECTION`), in the task rung, or in the Timings panel.

### B. Light and camera view in the app bar

```
┌──────────────────────────────────────┐
│ ←  Tracking             ☼   ◉    ⋯   │
```

Two `IconButton`s before the overflow, in `ChesslabScaffold`'s `actions` slot:

| Control | `contentDescription` | Tint when on | Shown in |
|---|---|---|---|
| torch | `Camera light` | `Accent`, else `OnSurfaceMuted` | both layouts, and only `if (viewModel.hasTorch)` |
| camera view | `Camera view` | `Accent`, else `OnSurfaceMuted` | layout B only |

The camera-view button is absent in layout A on purpose: there, the raw camera **is** the
picture (`NotReady`, `TrackingScreen.kt:419`), and a toggle for what you are already looking at
is a control with no state to change.

**Both keep their `MenuToggle` text twin in the `⋯` menu.** The icons are shortcuts; the menu
rows are what `scripts/android-ui.ps1 tap-text "Camera view"` drives and what a screen reader
announces with its state. Deleting the rows would break both.

**The icons are two new vector drawables** — `res/drawable/ic_camera_light.xml` and
`ic_camera_view.xml`, 24×24 viewport, single path, no colour of their own (tinted by `Icon`).
`material-icons-extended` is deliberately NOT a dependency of `:app` (see the comment at
`app/build.gradle.kts:174-178`) and this pack adds no dependency. A sun glyph (filled circle
plus eight rays) and an eye glyph (lens circle inside a lid outline) are what is meant; attach
an emulator screenshot of the bar to the phase report so the shapes are reviewed, not assumed.

### C. The move list flattens

`MoveList` (`ui/review/MoveList.kt:94`) is a review component: it scrolls, it selects, it is
built to read a whole game. Live, the screen needs the last few moves and the board needs the
height.

New file `ui/tracking/LastMoves.kt`:

```kotlin
/** The last [PAIRS] move pairs, newest at the bottom — the live glance, not the score sheet. */
@Composable
fun LastMoves(game: GameView, modifier: Modifier = Modifier)

private const val PAIRS = 3
```

One `Text` per pair, `bodyMedium`: the move number in `OnSurfaceMuted`, the SANs in
`OnSurface`. **Reuse the pairing that already exists** — read `MoveList.kt` first and lift its
ply→move-number arithmetic rather than re-deriving it; a second, disagreeing opinion about
which ply is move 14 is exactly the class of bug specs/50 spent a commit on
(`2f3bf4f fix(review): the arrow and the 'Engine move' beside it are the same ply`).

Absent while the game has no plies (unchanged rule — `TrackingScreen.kt:398`). `MoveList` and
`ui/review/` are **not modified**.

### D. An aim guide in the not-ready layout

Inside `SourceFramedPreview`'s box (`TrackingScreen.kt:437`), a dashed rounded rectangle at a
fixed inset, drawn with `Canvas` + `PathEffect.dashPathEffect`, in `Outline` at 60 % alpha,
with the caption below the frame:

```xml
<string name="tracking_aim">Fit the whole board inside the frame</string>
```

It is a framing aid and nothing more — it must not claim to be the detected quad. The detected
quad has a screen of its own (`ui/calibration/CalibrationOverlay.kt`) and this one is drawn at
a constant inset, never from `ui.corners`.

The inset is a **named component size** in the file that draws it
(`private val AIM_INSET = 24.dp`), because `DpLiteralGuardTest` allows exactly that and nothing
else.

### Strings this phase adds

```xml
<string name="tracking_turn_white">White to move</string>
<string name="tracking_turn_black">Black to move</string>
<string name="tracking_move_number">%1$d</string>
<string name="tracking_light">Camera light</string>
<string name="tracking_camera_view">Camera view</string>
<string name="tracking_aim">Fit the whole board inside the frame</string>
```

`tracking_move_number` looks pointless in English and is not: German writes `14.` with the
period, and the separator `·` between the two halves is layout, not language — it stays in the
composable.

## Steps

1. `ui/tracking/StatusUiModel.kt` + `StatusUiModelTest` — commit
   `feat(tracking): the status line says whose move it is, not how many frames per second`
2. `ui/tracking/TrackingScreen.kt` + `res/drawable/*` — commit
   `feat(tracking): the light and the camera view are one tap from the board`
3. `ui/tracking/LastMoves.kt` (new) + its use in `Watching` — commit
   `feat(tracking): the live move list is the last three pairs`
4. `ui/tracking/TrackingScreen.kt` (`NotReady`) — commit
   `feat(tracking): the setup view shows where the board goes`

## Tests (write, run once, targeted)

| Test | Case |
|---|---|
| `StatusUiModelTest` | the start FEN → `Turn.WHITE`, `moveNumber == 1` |
| `StatusUiModelTest` | a FEN after 1.e4 c5 2.Nf3 → `Turn.BLACK`, `moveNumber == 2` |
| `StatusUiModelTest` | a truncated FEN (`"8/8/8/8/8/8/8/8"`) → both null, no throw |
| `StatusUiModelTest` | `fpsText`/`fpsDetail` no longer exist (the file compiles without them; assert by absence in the acceptance grep, not by a test) |
| `LastMovesTest` (new, JVM, pure) | the pairing helper maps ply 27 to move 14, and a 5-ply game yields 3 rows with the last one half-empty |

```
gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.ui.tracking.*" --rerun-tasks
```

Compose UI is verified on the emulator, not by an instrumentation test — **never**
`:app:connectedDebugAndroidTest`, which uninstalls the app on teardown and has twice destroyed
the phone's stored games (CLAUDE.md).

## Acceptance criteria

- `grep -rn "fps" android/app/src/main/kotlin/com/chesslab/tracker/ui/tracking` returns nothing.
- `grep -rn "contentDescription" android/app/src/main/kotlin/com/chesslab/tracker/ui/tracking/TrackingScreen.kt`
  hits at least three (overflow, light, camera view).
- `scripts/android-ui.ps1 tap-text -Text "Camera view"` still toggles the preview — the menu
  row survives the icon.
- On `.\scripts\android-emulator.ps1 -Avd <yours> -Port <yours> -Clip blender-opening`, the
  status line reads `Live` with `White to move · 1` before the first move and `Black to move`
  after it; screenshot in the report.
- `:app:ktlintCheck :app:detekt` clean, no new suppressions, `DpLiteralGuardTest` green.

## Do NOT

- Do not touch the alarm card, `AcceptCnnDialog`, `TrackerNotification` or `StatusPublisher` —
  all of that is phase 03.
- Do not modify `ui/review/MoveList.kt` or anything else under `ui/review/`.
- Do not add `material-icons-extended` or any other dependency.
- Do not rename `Start tracking` / `Stop tracking` — `scripts/android-smoke.ps1:67-69` matches
  them literally and they are frozen for this pack.
- Do not delete the `⋯` menu rows for the two toggles.
- Do not draw the aim guide from `ui.corners`.
