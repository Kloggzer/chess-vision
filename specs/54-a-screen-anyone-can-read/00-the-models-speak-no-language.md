# Phase 00 — The models speak no language

**Lands alone.** Every later phase renders what this one declares.

## Why

`StatusUiModel.kt` opens with *"No Compose type appears in this file on purpose"* — the mapping
is a pure function so the things that are easy to get silently wrong stay unit-testable on a
plain JVM. The same argument applies one step further and was never taken: the file returns
English prose, so the moment the app has a second language the pure model has to know about
resources, or the wording has to be duplicated.

Three functions are affected, and all three are asserted against literal English in tests
today, which means every wording change turns a green test red for no behavioural reason:

```kotlin
StatusUiModel.kt:254  private fun stateLabel(state: String) = "WAITING" | "MOVING" | "HAND OVER BOARD" | "MOVE"
UndoLabel.kt:39       fun undoLabel(lastCommit: List<String>) = "Undo" | "Undo ${'$'}{lastCommit.size} moves"
GameDashboard.kt:6    internal fun resultHeadline(result: String) = "White wins" | "Black wins" | "Draw" | "Game in progress"
```

`StatusUiModelTest.kt:39-45` asserts `"WAITING"`, `"MOVING"`, `"HAND OVER BOARD"`, `"MOVE"`;
`UndoLabelTest.kt:16-24` asserts `"Undo"` and `"Undo 4 moves"`.

And the resource path this pack needs is present but dead: `res/values/strings.xml` holds
**171 entries**, of which **three** are referenced anywhere — `app_name`
(`AndroidManifest.xml:24`), `notif_channel` (`ChesslabApp.kt:40`), `notif_title`
(`TrackerNotification.kt:86`). The other 168 describe deleted UI.

## Design (decided — do not redesign)

### 1. `TrackerLabel` replaces `stateText`

```kotlin
// ui/tracking/StatusUiModel.kt
/** What the header is saying, as a fact rather than as words. The Compose layer names it. */
enum class TrackerLabel { LIVE, HAND_OVER_BOARD, NO_DETECTION, POSITION_LOST, CAMERA_OFF, NOT_TRACKING }

data class TrackingUiState(
    …
    val state: TrackerLabel,   // was: val stateText: String
    …
)
```

The mapping collapses two engine states deliberately:

| engine `status.state` / feed | before | `TrackerLabel` |
|---|---|---|
| `waiting` | `WAITING` | `LIVE` |
| `moving` | `MOVING` | `LIVE` |
| `move` | `MOVE` | `LIVE` |
| `occluded` | `HAND OVER BOARD` | `HAND_OVER_BOARD` |
| alarm latched | `POSITION LOST` | `POSITION_LOST` |
| `Feed.PAUSED` | `STOPPED` | `CAMERA_OFF` |
| `Feed.OFF` | `NOT TRACKING` | `NOT_TRACKING` |
| live, calibrated, `status.fps <= 0.0` | (was only in `fpsDetail`) | `NO_DETECTION` |

`NO_DETECTION` is the one label that is new rather than renamed, and it is load-bearing:
frames arrive, the board is fitted, and still nothing ticks. Today that fact lives only in
`fpsDetail` (`StatusUiModel.kt:296`, `"no detection"`), and phase 02 deletes the fps fields —
without this rung the screen would read a confident `LIVE` over an engine that is not running.
Its tone is `StateTone.Busy`. It ranks **below** the alarm and above everything else that is
live.

`waiting`/`moving`/`move` become one label because they are not distinguishable to a reader:
`moving` and `move` are visible for a fraction of a second each. **`StateTone` is unchanged and
keeps all four values** — the tone is what still separates them on screen (`Idle`/`Busy`/
`Active`), and collapsing the tone as well would flatten the only live feedback the screen has.
An unknown `status.state` maps to `LIVE`, not to a raw uppercased string: the fallback path
must not be able to print an engine identifier.

### 2. `undoCount` replaces `undoLabel`

```kotlin
// ui/tracking/UndoLabel.kt
/** How many plies one press of Undo takes back. 1 is the common case; a CNN recovery bridges more. */
fun undoCount(lastCommit: List<String>): Int = maxOf(1, lastCommit.size)

/** The plies of the last commit, for the one place that has room to spell them out. Null for a single ply. */
fun undoDetail(lastCommit: List<String>): List<String>? = lastCommit.takeIf { it.size > 1 }
```

`undoDetail` loses its prose (`"One press takes back: Bxb5 + Kb8"`) and returns the SANs; the
sentence is a resource with a `%1$s` the caller fills by joining with `" + "`. SAN itself is
never translated.

### 3. `GameResult`, and `resultHeadline` typed

```kotlin
// games/GameRecord.kt — beside resultFromFen
enum class GameResult(val tag: String) {
    WHITE("1-0"),
    BLACK("0-1"),
    DRAW("1/2-1/2"),
    UNFINISHED("*"),
    ;

    companion object {
        fun of(tag: String): GameResult = entries.firstOrNull { it.tag == tag } ?: UNFINISHED
    }
}
```

`resultFromFen` keeps returning `String` in this phase (phase 01 changes it to `GameResult`) —
00 only declares the type and retypes the one UI function:

```kotlin
// ui/review/GameDashboard.kt
internal fun resultHeadline(result: GameResult): Int  // a string resource id
```

Returning an `@StringRes Int` rather than an enum is deliberate here: `resultHeadline` has no
other job than naming a result, and the two call sites — `HomeScreen.kt:198`,
`GameReviewScreen.kt:315` — build a subtitle string. 00 adjusts exactly those two lines to
compile and touches nothing else in those files.

### 4. `strings.xml` pruned, and the naming convention stated

`values/strings.xml` keeps `app_name`, `notif_channel`, `notif_title` and nothing else. The
file gains a comment block stating the convention, which is the contract every later phase
follows:

```xml
<!-- Keys are <screen>_<thing>, lowercase, no abbreviations: tracking_state_live,
     alarm_headline, endgame_result_white. Counted quantities go through <plurals>, never
     through concatenation in Kotlin. values-de/ adds no keys of its own. -->
```

The four keys phase 00 itself needs (it changes `undoLabel`'s callers):

```xml
<plurals name="tracking_take_back">
    <item quantity="one">Take back move</item>
    <item quantity="other">Take back %1$d moves</item>
</plurals>
<string name="tracking_take_back_detail">One press takes back: %1$s</string>
<string name="games_result_white">White wins</string>
<string name="games_result_black">Black wins</string>
<string name="games_result_draw">Draw</string>
<string name="games_result_unfinished">Unfinished</string>
```

`games_result_unfinished` is deliberately not "Game in progress": a stored game is not in
progress, it was stopped.

### 5. `StringLiteralGuardTest`

New: `app/src/test/kotlin/com/chesslab/tracker/ui/theme/StringLiteralGuardTest.kt`, modelled
on `DpLiteralGuardTest.kt` in the same package (read it first — it is the house pattern,
including its `theGuardCanSeeTheUiSources` self-check).

**The rule:** in a package listed as localized, no string literal may be passed to a text sink.
The sinks are a named list, not "every literal":

```kotlin
private val SINKS = listOf("Text", "SectionHeading", "FilledAction", "OutlineAction",
    "DisclosureRow", "MenuToggle", "Figure", "EmptyState", "ConfirmDialog")
// plus named arguments: contentDescription = "…", title = "…", body = "…", verb = "…", label = "…"
```

```kotlin
/** Packages under ui/ whose user-visible strings are resources. Each phase adds its own. */
private val LOCALIZED = emptySet<String>()   // 02 adds "tracking", 03-A/03-B the rest
```

`LOCALIZED` is empty when this phase lands and the test passes vacuously — the
`theGuardCanSeeTheUiSources` self-check is what proves it is not passing for the wrong reason.

**Say so in the KDoc:** this is a regex over known sinks and it does **not** see a literal that
sits alone on its own line as a multi-line named argument. It is a ratchet, not a proof; each
conversion phase additionally reports its own `grep -rhoE '"[A-Z][^"]{2,}"' <pkg> | wc -l`
before and after.

## Steps

### 1. `ui/tracking/StatusUiModel.kt` — commit `refactor(tracking): the status model returns a label, not a sentence`

`TrackerLabel`, `TrackingUiState.state`, `stateText`/`stateLabel` deleted, `ALARM_STATE_TEXT`,
`STOPPED_STATE_TEXT`, `OFF_STATE_TEXT` deleted. `StatusLine` (`TrackingScreen.kt:505`) resolves
the enum through a `when` over `stringResource(…)`; the six state keys land here:

```xml
<string name="tracking_state_live">Live</string>
<string name="tracking_state_hand">Hand over board</string>
<string name="tracking_state_no_detection">Not reading the board</string>
<string name="tracking_state_lost">Board doesn\'t match</string>
<string name="tracking_state_camera_off">Camera off</string>
<string name="tracking_state_off">Not tracking</string>
```

Update `StatusUiModelTest` to assert enums.

### 2. `ui/tracking/UndoLabel.kt` — commit `refactor(tracking): undo reports a count, the screen names it`

Both call sites (`TrackingScreen.kt:552` `ActionBar`, `AlarmCard.kt:107`) switch to
`pluralStringResource(R.plurals.tracking_take_back, count, count)`. Update `UndoLabelTest` and
`TrackingViewModelTest:160-183` to assert counts.

### 3. `games/GameRecord.kt` + `ui/review/GameDashboard.kt` — commit `refactor(games): the result is an enum, the headline a resource`

Includes the two compile fixes at `HomeScreen.kt:198` and `GameReviewScreen.kt:315`.

### 4. `res/values/strings.xml` — commit `chore(res): strings.xml holds only the keys that are used`

171 → the 3 live ones + the 6 keys/plural above, plus the convention comment.

### 5. `StringLiteralGuardTest.kt` (new) — commit `test(ui): a localized package may not pass a literal to a text sink`

## Tests (write, run once, targeted)

| Test | Case |
|---|---|
| `StatusUiModelTest` | `waiting`, `moving`, `move` all map to `TrackerLabel.LIVE`, and their `StateTone`s stay distinct |
| `StatusUiModelTest` | an unknown engine state maps to `LIVE` and never leaks the raw string |
| `StatusUiModelTest` | a latched alarm maps to `POSITION_LOST`; paused → `CAMERA_OFF`; no service → `NOT_TRACKING` |
| `StatusUiModelTest` | live + corners + `fps = 0.0` + `cameraFps = 30.0` → `NO_DETECTION`, and a latched alarm still outranks it |
| `UndoLabelTest` | `undoCount(emptyList()) == 1`, `undoCount(listOf("Nf3")) == 1`, a 4-ply bridge == 4 |
| `UndoLabelTest` | `undoDetail` is null for 0 and 1 plies, the SAN list for 4 |
| `GameResultTest` (new, `tracker-runtime`) | `GameResult.of("1/2-1/2") == DRAW`; an unknown tag → `UNFINISHED` |
| `StringLiteralGuardTest` | the guard sees the UI sources; with `LOCALIZED` empty it passes |

```
gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.ui.*" --tests "com.chesslab.tracker.games.*" --rerun-tasks
gradlew.bat :tracker-runtime:test --rerun-tasks
```

## Acceptance criteria

- `grep -rn "stateText" android/app/src/main android/app/src/test` returns nothing.
- `grep -rn "fun undoLabel" android/` returns nothing.
- `grep -c "<string name=" android/app/src/main/res/values/strings.xml` returns `15`
  (3 live + `tracking_take_back_detail` + 4 result names + 6 state names, and nothing else),
  and `grep -c "<plurals" …` returns `1`.
- `grep -rn "WAITING\|POSITION LOST\|NOT TRACKING" android/app/src/main` returns nothing.
- `:app:ktlintCheck :app:detekt :tracker-runtime:ktlintCheck :tracker-runtime:detekt` clean, no
  new suppressions.

## Do NOT

- **Do not touch `fpsText` / `fpsDetail` / `infoLine`.** They are phase 02's, which removes the
  first two from the screen entirely (the numbers already live in the debug Timings panel,
  `TimingsPanel.kt:50-57`) and rewords the third.
- Do not change wording anywhere yet beyond the keys listed here — 01 and 02 own the new
  vocabulary, and a word changed twice is a word reviewed twice.
- Do not add `values-de/`. That is phase 04, and a half-translated file is worse than none.
- Do not convert any package to resources. 03 owns that, with a measured before/after count.
- Do not touch `ui/debug/` or `KnobCatalog.kt` in any phase of this pack.
