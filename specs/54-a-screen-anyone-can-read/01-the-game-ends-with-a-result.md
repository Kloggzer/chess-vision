# Phase 01 — The game ends with a result

Depends on phase 00 (`GameResult`). Runs before 02, which owns the same screen file.

## Why

Two defects, one dialog.

**The result is guessed.** `resultFromFen` (`GameRecord.kt:207`) reads the position and returns
`1-0` / `0-1` / `1/2-1/2` only for mate, stalemate and the draw rules; everything else is `*`.
Its KDoc is right that `*` is the honest default *for a position* — but it is the only thing
that ever writes `StoredGame.result` (`LiveGame.kt:225,257`), so a resignation, an agreed draw
and a game the players simply stopped are indistinguishable, and the library shows all of them
as "Game in progress" (`GameDashboard.kt:6`). Chess games mostly do not end in mate.

**Ending can destroy.** `TrackerModal.DISCARDING` (`TrackingScreen.kt:96,204`) is a destructive
branch reachable in two taps from the screen you play in front of, and the dialog that opens it
(`EndGameDialog`, `TrackingScreen.kt:566`) offers `Discard…` as its dismiss action. Deleting a
game belongs where you can see what you are deleting — the Games screen already has it, with
the recorded frames as an explicit second checkbox (`GamesScreen.kt:123,232`).

The user, 2026-08-12: *"das spiel beenden soll immer speichern, ggf fragen ob aufgegeben oder
unentschieden etc"*.

## Design (decided — do not redesign)

### 1. The result becomes an argument, and keeps its FEN default

```kotlin
// games/GameRecord.kt
fun resultFromFen(fen: String): GameResult      // was: String

// games/LiveGame.kt:246
fun finish(
    id: String,
    finishedAtEpochMs: Long,
    sessionId: String? = null,
    white: String = UNKNOWN,
    black: String = UNKNOWN,
    /** What the players say happened. Null = read it off the board, which is right for mate and for an auto-save. */
    result: GameResult? = null,
): StoredGame   // …, result = (result ?: resultFromFen(currentFen)).tag, …

// games/GameSessionController.kt:137
fun endAndSave(
    white: String = UNKNOWN,
    black: String = UNKNOWN,
    result: GameResult? = null,
): GameSummary?
```

`StoredGame.result` stays a `String` on disk — no format change, no migration. Call sites to
update: `LiveGame.kt:225` (`view()` → `.tag`), `GameSessionController.kt:213`
(`if (resultFromFen(fenAfter) != GameResult.UNFINISHED) endAndSave()`), `TrackerService.kt:260,278`
(**unchanged** — a service-side auto-save passes no result and keeps reading the board).

`closeSeams` (`SeamClosing.kt:133`) copies `result` through untouched, so a stated result
survives the seam migration `GameStore.open` performs. Verify, do not assume.

### 2. `EndGameDialog`, rewritten

Three cases, and only the middle one asks a question:

| `moves` | position | Dialog |
|---|---|---|
| 0 | any | unchanged: "Start a new game?" → re-seeds the tracker (`discard()` + `onResetGame()`) |
| > 0 | `resultFromFen != UNFINISHED` | states it — "Black is checkmated — White wins." — no chips, one button |
| > 0 | `UNFINISHED` | the four chips below, default `UNFINISHED` |

```
┌──────────────────────────────────────┐
│  End game                            │
│  27 moves recorded.                  │
│                                      │
│  How did it end?                     │
│  (White won) (Black won)             │
│  (Draw)      (Unfinished)            │
│                                      │
│  White  [ … ]     Black  [ … ]       │
│  Leave blank to skip.                │
│                                      │
│                  [ Save & new game ] │
└──────────────────────────────────────┘
```

- Chips are Material3 `FilterChip`, single-select, styled as at `CameraControls.kt:228` — **no
  new shared component**; four chips in one dialog do not earn one.
- The default is `UNFINISHED`, not a guess. A wrong result is correctable (§3); a guessed one
  is a lie that reads as data.
- The name fields keep their current behaviour verbatim (pre-filled from the last saved game,
  blank means `UNKNOWN` — `TrackingScreen.kt:576-583`, `named()` at the bottom of the file).
- **One button.** `dismissButton` becomes `Cancel` (closes, changes nothing) in every case. The
  confirm is `Save & new game`.

### 3. A stored result is editable

`GameDetailsDialog` (`GameDetailsDialog.kt:19`) already edits White / Black / Event. It gains
the same four chips, and the store's writer is widened:

```kotlin
// games/GameStore.kt:68 — renamed from rename(), it no longer only renames
fun updateDetails(id: String, white: String, black: String, event: String, result: GameResult): GameSummary?
// GamesViewModel.kt:47 follows; GamesScreen.kt's call site follows.
```

This is what makes the `UNFINISHED` default safe, and it is the reason the end-game dialog is
allowed to be one tap.

### 4. Discarding leaves the tracking screen

- `TrackerModal.DISCARDING` and its `ConfirmDialog` branch (`TrackingScreen.kt:96,204-213`)
  are deleted.
- `GameSessionController.discard()` (`GameSessionController.kt:157`) **stays** — it is the
  0-move re-seed path, and its KDoc's warning (resetting only the engine leaves the record
  standing) is still the reason both calls must happen together.
- Deletion stays on the Games screen, unchanged.

### Strings this phase adds

```xml
<string name="endgame_title">End game</string>
<string name="endgame_new_title">Start a new game?</string>
<string name="endgame_moves">%1$d moves recorded.</string>
<string name="endgame_nothing">Nothing is recorded yet. This re-seeds the tracker from the starting position.</string>
<string name="endgame_question">How did it end?</string>
<string name="endgame_mate_white">Black is checkmated — White wins.</string>
<string name="endgame_mate_black">White is checkmated — Black wins.</string>
<string name="endgame_stalemate">Stalemate — the game is a draw.</string>
<string name="endgame_drawn">The position is a draw.</string>
<string name="endgame_save">Save &amp; new game</string>
<string name="endgame_new">New game</string>
<string name="endgame_names_hint">Leave blank to skip.</string>
<string name="games_result_edit">Result</string>
```

The four result names (`games_result_white` …) already exist from phase 00 and are reused for
both the chips and the library subtitle — one result, one word, everywhere.

## Steps

1. `games/GameRecord.kt`, `LiveGame.kt`, `GameSessionController.kt` — commit
   `feat(games): a finished game can carry the result the players state`
2. `ui/tracking/TrackingScreen.kt` — commit
   `feat(tracking): ending a game asks how it ended and always saves`
   (dialog rewrite + `DISCARDING` removal, one commit — the modal enum and the dialog are the
   same change)
3. `games/GameStore.kt`, `ui/games/GamesViewModel.kt`, `GamesScreen.kt`, `GameDetailsDialog.kt`
   — commit `feat(games): the result is editable where the game is stored`
4. `res/values/strings.xml` — folded into the commits above, not a commit of its own: a string
   without its call site is noise in a diff.

## Tests (write, run once, targeted)

| Test | Case |
|---|---|
| `GameSessionControllerTest` | `endAndSave(result = GameResult.BLACK)` on a non-terminal position stores `0-1` |
| `GameSessionControllerTest` | `endAndSave()` with no result on a non-terminal position stores `*` |
| `GameSessionControllerTest` | the auto-save at a terminal position (`:213`) still stores the mate result |
| `GameStoreTest` | `updateDetails` rewrites the result in the JSON, the index row **and** the PGN |
| `GameStoreTest` | a stated result survives `open()`'s seam migration (`closeSeams`) |
| `PgnBuilderTest` | the `[Result]` tag of the last segment is the stated result, earlier segments stay `*` (`PgnBuilder.kt:44`) |

```
gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.games.*" --rerun-tasks
gradlew.bat :tracker-runtime:test --rerun-tasks
```

Prove the regression tests red first: run the `endAndSave(result = …)` case against the
pre-change signature (it will not compile — then assert the stored value with the old code path
by hand and record the observed `*` in STATUS.md). A test that was never red proves nothing.

## Acceptance criteria

- `grep -rn "DISCARDING" android/app/src/main` returns nothing.
- `grep -rn "Discard" android/app/src/main/kotlin/com/chesslab/tracker/ui/tracking` returns
  nothing.
- `grep -rn "fun rename" android/tracker-runtime android/app/src/main` returns nothing
  (renamed to `updateDetails`).
- Playing two moves on the emulator clip, tapping **End game**, choosing **Draw** and saving
  produces a Games row reading `Draw`, and the exported PGN carries `[Result "1/2-1/2"]`.
- `:app:` and `:tracker-runtime:` ktlint + detekt clean, no new suppressions.

## Do NOT

- Do not touch the status line, the alarm card, the app bar or the move list — that is phase 02
  and it edits the same file. Land this one first and completely.
- Do not add a "resignation" / "timeout" distinction. PGN expresses it in a `[Termination]` tag,
  the tracker has no evidence for it, and four chips is the whole question the user asked for.
- Do not make `StoredGame.result` an enum on disk. The JSON format is stable and readable; a
  migration for a type that is already a valid string is cost without a buyer.
- Do not remove `GameSessionController.discard()`.
- Do not touch `TrackerService.kt`'s two `endAndSave()` calls.
