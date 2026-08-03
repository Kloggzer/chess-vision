# 42 — Status

| Phase | State | Note |
|---|---|---|
| 1 — one review component, two sources | `done` | `GameView` + `ui/review/`; three score sheets collapsed to one |
| 2 — grade a finished game | `done` | `GameReviewer` wires `classify` / `cpLoss`; per-ply badges and a per-side summary |
| 3 — the move list is the finding list | `done` | badges in the list, findings list on the summary card, tapping a ply moves the board |
| the depth question | **MEASURED on device** | **14 of 83 plies change class** — and it overturned the budget |
| screenshots | **NONE** | not taken by me; the coordinator ran the built branch on the device |

Branch `spec42-one-board-two-clocks`, five commits off `main`.

## The depth question — measured, and it overturned the answer

`entry.md`: run one real game at 400 ms and at the proposed budget, report **how many plies change
class**, and let that decide. Taken on the attached device (`24117RK2CG`, SM8650-class) over the
user's own 83-ply tracked game `2026-08-02_2159`, via `ReviewBudgetBenchmark` (androidTest, the app's
own bundled `libstockfish.so`):

```
gradlew.bat :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=com.chesslab.tracker.analysis.ReviewBudgetBenchmark
```

| | live eval bar | candidate: `depth 16`, cap 3000 |
|---|---|---|
| bound | `movetime 400`, `multiPv 3` | `depth 16`, `movetime 3000`, `multiPv 1` |
| wall clock, 84 positions | **32 242 ms** | **27 956 ms** |
| per position | 383 ms | 332 ms |
| median depth reached | **15** | **16** |
| ACPL White / Black | 106 / 135 | 84 / 128 |

**Class changes: 14 of 83 plies — one in six.** The full list is in the commit; the ones that matter:

| ply | at 400 ms | at depth 16 |
|---|---|---|
| 57 | **BLUNDER** 9052 cp @16 | INACCURACY 95 cp @16 |
| 66 | **BLUNDER** 1885 cp @22 | BEST 1 cp @16 |
| 64 | **BLUNDER** 310 cp @19 | GOOD 10 cp @16 |
| 68 | BEST 0 cp @**31** | **BLUNDER** 9123 cp @16 |
| 54 | MISTAKE 126 cp @16 | BEST 4 cp @16 |

### Two conclusions, and the second one killed the design

**1. 400 ms is not a verdict, exactly as the pack suspected.** One ply in six is graded differently,
and three of them are phantom BLUNDERs — ply 57 reads a forced mate at 400 ms that a longer search
values at 95 cp. Grading a game at the live budget would put fabricated blunders in front of the user.

**2. `depth 16` was not a bigger budget — and sometimes it was a SMALLER one.** This is the finding
the measurement was for, and it went against my first design:

- it cost **less** wall clock than the live bar (332 ms against 383) and reached a median depth of 16
  against 15. Nearly the same search, so 14 disagreements between them are two similar-strength
  readings differing — which makes the live budget look *worse*, not the candidate better.
- in sparse endgames 400 ms reaches **depth 31**, so a depth-16 bound stops early and throws the rest
  of its 3000 ms allowance away. Ply 68: live BEST at depth 31, "deep" BLUNDER at depth 16. Three of
  the fourteen changes are the deeper reading being the LIVE one.

A depth bound below what 400 ms already buys is a downgrade wearing the word "deep". The
cross-device-reproducibility argument for depth-first was real but it bought a worse grade in every
endgame, which is where a tracked club game spends its second half.

**Changed on this evidence: `REVIEW_DEPTH` 16 → 30, `REVIEW_MOVETIME_MS` unchanged at 3000.** The
time cap is now the budget and the depth is an early-out for positions the engine has genuinely
exhausted; 30 is above anything 400 ms was observed to reach. Worst case is 3 s × 84 = ~4.2 min for
this game, against 28 s before, and the progress line counts positions.

**The revised budget is NOT itself measured.** The device stopped accepting installs
(`INSTALL_FAILED_USER_RESTRICTED: Install canceled by user` — MIUI wants a tap on the handset) before
the depth-30 run could go on. `ReviewBudgetBenchmark` takes `depth` and `cap` as instrumentation
arguments precisely so the follow-up is one command:

```
... -Pandroid.testInstrumentationRunnerArguments.depth=30 \
    -Pandroid.testInstrumentationRunnerArguments.cap=3000
```

A JVM-side twin, `ReviewDepthMeasurementTest`, does the same comparison against a host Stockfish
(`-Pchesslab.uci=<path>`) and skips without one. This machine has no host binary and no C++
toolchain to build the vendored submodule, so the device is where this question gets answered.

### ACPL was mate-poisoned, and the headline number was meaningless

Found on the device in the same session. The card read:

```
White · 526 cp average loss over 42 plies · best 21 good 4 inaccuracy 5 mistake 5 blunder 7
```

526 cp average beside 21 of 42 plies graded BEST is self-contradicting. Cause: `MATE_CP = 10_000`
flowed into the mean uncapped, so **one mate-scored ply contributes 238 cp to a 42-term average**.
Seven of them were the whole 526.

Fixed by clamping each ply's loss to `0..1000` **before averaging only** — lichess' figure, a whole
queen, past which "how much worse" stops measuring the move. Bands are untouched (1000 and 10 000 are
both far inside BLUNDER) and `PlyGrade.cpLoss` stays raw, because a number shown against one ply
should not be quietly clipped. After the fix, the same game measures ACPL **84 / 128** at the deep
budget and 106 / 135 at the live one.

The card now also reports `mateScoredPlies` per side — **10 White, 10 Black on this game**, a quarter
of it — because that is exactly where a centipawn average stops meaning anything, and a silent clamp
is its own kind of lie. A finding on a mate-scored ply prints "forced mate" rather than `9052 cp`.

Pinned by `oneThrownAwayMateDoesNotDominateTheAverage`, `mateScoredPliesAreCountedPerSide` and
`aGameWithNoMateReportsNoneAndIsUnaffectedByTheCap`. The coordinator is right that the previous tests
could not have caught it: they had at most one mate ply against one quiet one, where a cap and no cap
give the same answer.

### The grader does not know a tracker artefact from a chess mistake

`2026-08-02_2159` carries **3 seams** — the app lost the board three times and committed recovery
plies to get back. Those plies are graded exactly like played ones, so some of its "blunders" are the
tracker's fabrication, not a player's move. The move list already renders each seam in place; the
summary card now says how many, beside the numbers they distort. Not fixed beyond that, and it should
not be: suppressing them would hide that the record is a tracker output.

## What was measured

| Fact | Value |
|---|---|
| Independent score sheets built off the tracker's event stream, before | **3** — `LiveGame`, `SpectatorController`, `TrackingViewModel` |
| after | **1** (`LiveGame`, published as `GameSessionState.game`) |
| Of the three, how many handled an undo | **1** — the engine emits no undo event, so only `LiveGame.onFen`'s position comparison sees one |
| Production callers of `classify` / `cpLoss`, before | **0** (both only `AccuracyTest`) |
| after | `GameReviewer.grade`, reached by the review screen |
| Class changes, live budget vs review budget, 83 real plies | **14** (one in six), 3 of them phantom BLUNDERs |
| Mate-scored plies in that game | 20 of 83 — a quarter, and all of them clamped in the average |
| ACPL before the cap / after | White **526** → **84**; the 526 was seven mate plies |
| App unit tests | **435**, 0 failures, 2 skipped (the JVM depth measurement + one pre-existing) |
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

- **No screenshots taken by me.** A device appeared partway through this work and I ran the benchmark
  on it, but it then refused further installs (`INSTALL_FAILED_USER_RESTRICTED` — the handset wants a
  tap). The coordinator built, installed and reviewed the real game on it and reported what the
  screens showed; both defects above came from that, not from me. **I have not seen the screens**, and
  no test in this project composes a UI.
- **The revised budget (`depth 30`) is not itself measured.** What is measured is `depth 16` against
  the live bar; 30 follows from that data by argument. The follow-up run is one command, above.
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
