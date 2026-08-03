# 42 — Status

| Phase | State | Note |
|---|---|---|
| 1 — one review component, two sources | `done` | `GameView` + `ui/review/`; three score sheets collapsed to one |
| 2 — grade a finished game | `done` | `GameReviewer` wires `classify` / `cpLoss`; per-ply badges and a per-side summary |
| 3 — the move list is the finding list | `done` | badges in the list, findings list on the summary card, tapping a ply moves the board |
| the depth question | **NOT MEASURED** | no engine binary, no toolchain, no device on this machine — see below |
| screenshots | **NONE** | `adb devices` is empty; nothing was rendered and nothing is claimed |

Branch `spec42-one-board-two-clocks`, three commits off `main`.

## The depth question — the harness exists, the number does not

`entry.md` is explicit: run one real game at 400 ms and at the proposed budget and report **how many
plies change class**, and let that decide. **It could not be run here.** What was checked:

| Route to a Stockfish binary | Result |
|---|---|
| a binary on the machine | none — searched `C:\Users\mariu` (depth 4) and both `Program Files` trees |
| build the vendored submodule (`android/third_party/stockfish`) | no host toolchain: `g++`, `clang++`, `make`, `cmake` all absent; no MSVC, no MinGW |
| build for Android and run on the phone | `adb devices` empty — no device attached |
| build for Android and run in an emulator | `~/.android/avd` empty; creating an AVD needs a system-image **download** |
| download a release binary | a download; not taken without the user asking for it |

So the budget below is a **DESIGN, not a result**, and it is written to survive either answer.

`ReviewDepthMeasurementTest` takes the measurement in one command and is skipped without an engine
(the same gating shape as `chesslab.sim`). It runs a real tracked game — 33 plies,
`data/_device/20260728-runaway/games/2026-07-26_2311`, inlined because `data/` is gitignored — at
both budgets and prints the class-change count plus every ply that moved:

```
gradlew.bat :app:testDebugUnitTest --tests '*ReviewDepthMeasurement*' -Pchesslab.uci=<stockfish>
```

`-Pchesslab.uci.game=<file>` swaps in another game's SAN text. Verified skipping cleanly:
`tests="1" skipped="1"`.

### What the budget is, and why it is shaped this way

| | live eval bar | review pass |
|---|---|---|
| bound | `movetime 400` | `depth 16`, capped at `movetime 3000` |
| multiPv | 3 | 1 |
| thread priority | `THREAD_PRIORITY_LOWEST` | same process shape, off the main thread |

The review is **depth-bounded with time only as a cap**, where the live bar is time-bounded. That is
the part that does not depend on the missing measurement: a time bound makes a grade a function of
how hot the phone is, so the same game graded twice on the same device can disagree with itself, and
two devices always can. A depth bound removes that wherever both reach the depth. `UciEngine.analyse`
gained an optional `depth`, and `go movetime N depth M` stops at whichever comes first.

Where the cap bites, the grade is weighted honestly rather than silently: `PlyGrade.depth` is the
**shallower** of the two searches the loss was measured across, the findings list prints it per ply,
and the summary card states the budget in words. A "blunder" is never presented as more than the
search behind it.

**16 and 3000 are the numbers to revisit once the measurement exists.** They are one `ReviewBudget`
data class away from changing and nothing else reads them.

## What was measured

| Fact | Value |
|---|---|
| Independent score sheets built off the tracker's event stream, before | **3** — `LiveGame`, `SpectatorController`, `TrackingViewModel` |
| after | **1** (`LiveGame`, published as `GameSessionState.game`) |
| Of the three, how many handled an undo | **1** — the engine emits no undo event, so only `LiveGame.onFen`'s position comparison sees one |
| Production callers of `classify` / `cpLoss`, before | **0** (both only `AccuracyTest`) |
| after | `GameReviewer.grade`, reached by the review screen |
| App unit tests | **432**, 0 failures, 2 skipped (the depth measurement + one pre-existing) |
| Gate | green with `--rerun-tasks`: `:app:ktlintCheck :app:detekt :core-engine:detekt :core-engine:ktlintCheck :core-engine:test :app:testDebugUnitTest` |

### Chesslib applies illegal moves — measured 2026-08-03

The archive source replays a stored game to recover each ply's position. `Board.doMove(move)` does
**not** check legality, and neither does `doMove(move, fullValidation = true)`: handed `e2e5` from
the start position it moves the pawn to e5 and returns. Every position after such a ply would be a
fabrication the review screen renders as fact. `GameView`'s replay therefore checks
`MoveGenerator.generateLegalMoves` first — the same thing `LiveGame.continues` already did — and an
unplayable ply is a no-op. Pinned by `anIllegalStoredPlyIsANoOpAndNeverMovesAPiece`.

### Two defects the merge surfaced

- **`GameSessionController` had no `discard()`.** "Reset game → Discard" reset the *engine* and left
  the record standing, so the next committed ply was illegal from it and opened a **seam inside a
  game the user had already thrown away**. Invisible while nothing read the record; visible the
  moment the live game became the score sheet on screen. Added, wired to the dialog's discard button,
  pinned by `discardDropsTheRunningGameWithoutStoringIt`. The dialog's text was corrected too — it
  claimed discarding threw the recorded frames away, which it never did.
- **`SpectatorController`'s score sheet had a lock and still lost moves.** It collected events on
  `Dispatchers.IO` (a pool), so `moves +=` really did race `moves.toList()`; it never handled an
  undo; and it cleared the whole sheet whenever the position returned to the start. All three are
  gone with the list itself.

## Line count

| | before | after | |
|---|---|---|---|
| `ui/games/` | 671 | 523 | −148 (`GameDetailScreen` deleted) |
| `spectate/` | 685 | 559 | −126 (`ui/SpectatorScreen` deleted, the accumulator deleted) |
| `ui/tracking/MoveList.kt` | 135 | 0 | moved and generalised |
| `ui/review/` (new) | — | 677 | the one component, its view model, the share card, the move list |
| **the three surfaces** | **1491** | **1759** | **+268** |
| `analysis/GameReview.kt` (new) | — | 207 | the grading pass |
| `games/GameView.kt` (new) | — | 122 | the one model and its two sources |

**It is not fewer lines out than in, and that is not hidden.** The duplication shrank by 274 lines
across the two surfaces the pack named, and three files were deleted outright. The growth is a
feature that did not exist: the archive review had **no board at all** — it was a text list of SANs —
and now both modes render a board, a ply seek, quality badges, a findings list and a per-side
summary. `analysis/GameReview.kt` is new work, not moved work.

## What was deleted

| File | Lines | Replaced by |
|---|---|---|
| `ui/games/GameDetailScreen.kt` | 160 | `ui/review/GameReviewScreen.kt` (archive mode) |
| `spectate/ui/SpectatorScreen.kt` | 103 | `ui/review/SpectatorShareCard.kt` on the live review screen |
| `ui/tracking/MoveList.kt` | 135 | `ui/review/MoveList.kt`, reading `GameView` |
| `ui/tracking/MoveListModelTest.kt` | 66 | `games/GameViewTest.kt` |
| `spectate.PlayedMove` | — | `games.ReviewPly` |
| `spectate`'s private `outcome(fen)` board reading | — | `games.resultFromFen` |
| `TrackingViewModel.moves` / `movesOf` / `MoveEntry` | — | `GameSessionState.game` |
| `ROUTE_SPECTATOR`, `ROUTE_GAME_DETAIL` | — | `ROUTE_REVIEW` and `ROUTE_REVIEW/{id}` |
| `ROUTE_ANALYSIS` + its `TODO(phase 07c)` | — | nothing; 07c shipped the eval bar as a slot, and the route was never created |

## Navigation, after

- TopNav **"Spectator"** → `review` — the running game: board, move list, eval bar, and the Wi-Fi
  share card. This is the user's *"dieselbe view … nur halt live"*.
- Games → a row → `review/{id}` — the same composable with an archive source, plus **Review with
  engine**, the per-side summary and the PGN actions.
- Games → the "Game in progress" row → `review` (the live one).

`GameReviewScreen` is `private` and both routes call it; live-vs-archive is `GameView.live` and
nothing else. `theLiveViewAndTheStoredGamesViewAreTheSameProjection` pins that the two sources agree
on every ply's san / uci / number / decider and on every position's placement and side to move.

## Not done, and why

- **No screenshots.** No device was attached at any point (`adb devices` empty) and no emulator image
  exists. No test in this project composes a UI, so nothing here says the screen renders — only that
  it compiles and that its model is correct. **It has not been seen.**
- **The class-change count.** See above. The harness is committed and skipped.
- **`MoveQuality.BOOK` is unreachable.** `classify(cpLoss, isBookPly)` takes the flag and the review
  pass always passes false: there is no opening book in the app and inventing "the first N plies of a
  standard start are book" would be a fabrication. The band exists and nothing produces it.
- **No accuracy percentage.** Lichess' is a second fitted curve (`103.1668 · exp(−0.04354 · Δwin) −
  3.1669`) and writing it would be new maths, which the pack rules out. The summary reports band
  counts and average centipawn loss instead, both of which fall out of what already exists.
- **The archive review has no eval bar.** `EvalBarSlot` is fed by the *tracker's current* position;
  beside a stored game it would show the board on the table, not the board on screen. The archived
  game's evaluation is the grade.
- **Recorded frames are not deleted on discard.** `discard()` stops the recorder and drops the game
  record; the frames stay, per the project's park-never-delete rule, and are removable from the
  Games screen. The dialog now says so.
