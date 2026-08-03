# 50 — Status

| Phase | State | Note |
|---|---|---|
| Entry | `done` | written 2026-08-04 from the user's review of the shipped screen |
| Implementation | `done` | 2026-08-04, four commits on `specs-50-give-the-review-back`. Gate green with `--rerun-tasks`, verified on `Chesslab_Agent2` / `emulator-5556` |

## The pack's central claim is wrong, and this is the first thing to record

> *"The mate explorer is gone and its engine is still running. [...] `GameReviewScreen.kt` has lost
> `MateLineExplorer`, `MateMoveCaption`, `MateResolutionStatus` and `mateLineRequest`."*

**All four were present at `HEAD` before a line of this pack was written.**

| Check | Result |
|---|---|
| `git log -S"MateLineExplorer" -- GameReviewScreen.kt` | **one commit**: `a5cdfd1`, which ADDED it. Nothing ever removed it |
| `git grep "Mate available\|Explore mate line\|forced mate from this position" a5cdfd1` | **no match** — those strings never existed at `a5cdfd1` either, so their absence was never evidence of anything |
| On the device | reached from a missed-mate ply, resolved an 11-move forced mate live, both themes (`screenshots/*/50-04-mate-explorer.png`) |

`ReviewStore`'s `.mate.json` cache had a consumer the whole time. The one real defect near it was
that the link **was truncated** — see "What running it changed" below.

`percent` and `ReviewScrollEffects` are the same kind of finding: `percent` MOVED to `ui/percent`
(specs/48 rule 5, one formatter for one quantity) and `ReviewScrollEffects` was inlined into
`rememberReviewListState` when its live-scroll branch died with `LiveReviewRoute`. Neither was lost.

**What WAS actually lost between `a5cdfd1` and `HEAD`, and is restored here:** the fixed-height
caption, and the two-column caption. Both were casualties of `ReviewContextChip`'s removal — the
68 dp row and the second column went out with it, and nothing replaced them.

## What shipped

### 1. "das ui springt hin und her" — the caption is a constant height again

`PlyVerdict` was `Row(Modifier.fillMaxWidth().height(68.dp))` at `a5cdfd1` and a bare `Card { }`
after specs/48, growing from one line ("Starting position") to four (move, cost, the engine's reply,
a mate link) — with the navigation row directly under it, being pressed repeatedly.

It is a `Column(Modifier.height(VERDICT_HEIGHT))` now, and the height is on the COLUMN so the mate
link takes its band out of the two columns above rather than adding to them. **Measured on the
device**, `bounds` of `ply N / 83`:

| ply | caption content | nav row |
|---|---|---|
| 1 | move + cost | `[.,2162][.,2219]` |
| 15 | move + cost | `[.,2162][.,2219]` |
| 27 | move + cost + engine column | `[.,2162][.,2219]` |
| 63 | move + cost + mate link | `[.,2162][.,2219]` |

Zero pixels of movement across every shape the card can take.

### 2. "die zweispaltigkeit war besser" — and the split now means something

`AccuracyBlock` White/Black at `weight(1f)` was **already two-column** and unchanged; it is not what
the user was looking at. The one that was lost is the caption, and it is back — but not as
`ReviewContextChip`, which stays deleted for specs/44's reason.

**Left is the position BEFORE the ply** — what was played, what it is called, what it cost, and the
forced mate that ran from there. **Right is the position ON SCREEN** — `fromHere.bestSan`, the
engine's move from the board the reader is looking at, and the same move its arrow draws. The chip's
bug was printing `ply.bestSan` (one position) beside a board drawn from another; keeping the two
questions in two named columns is what stops that returning. The right column reads
`The engine plays` / `Ne8` where the shipped screen wrote the full-width sentence
"The engine plays Ne8 here."

### 3. "Show all moves ist doof clickbar" — two defects, and the second is general

- Both `Show all 83 moves` and `Show all 23` are `OutlineAction` now. Text is the rank for a link
  inside a card; the only way out of a truncated list is not that.
- **The clearance is fixed in `ChesslabScaffold`, once, for every screen.** Its content box was
  `padding(horizontal = md, vertical = sm)`; it is `top = sm, bottom = xl` now. The asymmetry is not
  a taste call — the top gap separates content from a hairline, the bottom gap separates the last
  control from Android's own buttons.

### 4. "die zahl bei moments und moves ist off center" — two causes, both fixed

- **Vertical.** The `Row` had no `verticalAlignment`, so a 14 sp mono count and a 14 sp body label
  aligned by BOX and their baselines differed. Both texts carry `Modifier.alignByBaseline()` now.
- **Horizontal.** The row centred label-plus-count, so each label sat left of its own tab centre by
  half its count and the three labels did not line up. A `TAB_COUNT_SLOT` is reserved on **both**
  sides, so what is centred is the LABEL. Measured: tab centres 268 / 720 / 1172, label centres
  269 / 720 / 1172.

The count stays a separate `Text` node — watched going `4` → `22` → `26` while the analysis streamed,
which is exactly why the rule exists.

### 5. The score sheet's number leaves the bar (measured by this agent, not reported)

The label was drawn INSIDE the position cell over `HorizontalPositionBackground`, and the fill's
boundary ran through it — `73| %`, `68| %`, `67| %` on rows 6-8 of the shipped screenshot. It is a
`Row` now: number right-aligned, then the bar. **A forced mate takes the whole cell and draws no
bar** — the bar is a share out of 100 and has nothing left to say once the game is decided, while
`Mate in 6` needs every pixel of a 104 dp column. `POSITION_COLUMN_WIDTH` 94 → 104 pays for it.

The unit is untouched (rule 5). The mono gap in `0  %` is untouched too: it is `percent()`'s single
space rendered in a monospace face, and changing it means changing the one formatter for every
percentage in the app. That is a rule-5 decision, not a placement fix.

### 6. Starting the analysis, and seeing that it started

`AccuracyRow` held `Review this game`, `Starting the engine…` AND the progress bar, and was mounted
under `ReviewSection.MOMENTS` only. From the board tab the user tapped a text link inside a section
they could not see, and nothing changed anywhere.

- `analysisPhase(ui)` is computed **above the tab switch** and its card renders on all three tabs.
- `Review this game` is a `FilledAction`. It is what an unread game's screen is for — rule 3.
- `AccuracyRow` is the rating and nothing else, and is only mounted when there is a grade.

### 7. Leaving the screen no longer cancels the run — option (1), and why

`GameReviewScreen` built its model on `rememberCoroutineScope()`. Tabs were safe; **leaving the
screen killed a multi-minute pass**, silently, leaving a partial that looked finished.

**Chosen: survive navigation, no service.** `ReviewHost` is a process-scoped object holding one
`ReviewViewModel` on a `SupervisorJob` scope. The cost was measured before choosing, and it is small
because `GameReviewer.review` calls `onScored` — and therefore `ReviewStore.save` — after **every
position**: a cancel loses at most the one search in flight, and nothing that was already computed.
So the choice was never "minutes of work versus a service"; it was "an engine the user cannot see
versus one they can".

Which is what the rest of it buys:

- **`AnalysisBanner`** in `ChesslabScaffold`'s top bar, beside the tracker's: a dot, `Reviewing
  2026-08-02_2159 · 13 / 84`, a determinate progress line and **the app's only Stop**. It is pinned,
  it does not scroll, and it is on every screen.
- **One review at a time.** `ReviewViewModel.load` returns early for the game already open (it is
  called from a `LaunchedEffect` on every entry, and a reload would have thrown away the run the user
  came back to watch) and cancels the run when the id changes.
- **A partial review says so.** `Partial review · 8 of 84 positions graded.` with
  `OutlineAction("Continue review")`.

No foreground service was invented. specs/43 needed one because the tracker owns the camera and must
survive a whole game backgrounded; a review is minutes, restartable, and loses nothing to a kill.

**One consequence had to be closed with it.** A run that outlives the screen also outlives the
GAME — deleting a game while it graded would have gone on writing `<id>.analysis.json` for a record
that no longer exists. `GamesViewModel.delete` calls `ReviewHost.model.value?.forget(id)` now. And
while looking at that line: `GameStore.delete` removed the `.json` and the `.pgn` and **not** the
analysis, so every deleted game already left an orphan — even though the confirmation names "the
record, its PGN and its stored analysis" (specs/48 rule 6). `reviews.delete(id)` is on that path now.
It is one line beyond this pack's remit and it is what the dialog has been promising.

**Verified on the device:** started the review, pressed Back to Games, watched the banner go
**24 / 84 → 77 / 84** while the review screen was not in the composition
(`screenshots/dark/50-09-banner-on-games.png`).

---

## What running it changed

Four things the desk could not have told me.

1. **The progress was drawn twice.** The banner AND an in-screen `RUNNING` card, two bars and two
   counts stacked (the first build's `50-07-running.png`). The banner wins on every count — pinned,
   everywhere, carries the Stop — so `analysisPhase` returns null while a run is in flight and the
   `RUNNING` phase was deleted rather than styled.
2. **`Missed mate in 6 — see the line` was cut off after `see the`.** Half a card is not enough for
   it. It is full width under both columns now, which is also what forced the fixed height onto the
   column instead of the row.
3. **The score-sheet number was left-aligned** in its new slot with the bar at the far edge, so
   `4 %` and `52 %` did not line up and the number drifted away from the fill it describes.
   Right-aligned.
4. **Moments read "White wins" twice**, in two stacked cards. `MateStoryCard` opened with
   `resultHeadline`, which was correct while the rating card was on another tab; specs/48 moved them
   together. The card is about mates and says so.

Two more that were not this pack's:

- **`scripts/android-smoke.ps1` has been red since `4da365f`.** It asserts a `Settings` ROW on Home;
  Settings is an icon in the app bar with a `contentDescription`. It reads the description now. This
  is the third time this script has asserted a Home row that a redesign removed.
- **A fresh worktree cannot build the APK** until `git submodule update --init --recursive` — the
  Stockfish submodule is not checked out and CMake fails with `[CXX1429]`. Already in the memory
  notes; worth the reminder here because it costs a full failed build to discover.

---

## Line count

| | `a5cdfd1` | before this pack | after |
|---|---|---|---|
| `GameReviewScreen.kt` | 1110 | 969 | **1062** |
| `ReviewHost.kt` | — | — | 51 |

Under the 1110 the pack asked it not to overshoot, and the +93 is the analysis state machine, the
two-column caption and their KDoc. `Chrome.kt` is +50 for the banner.

## Verification

| | |
|---|---|
| Gate | `:app:ktlintCheck :app:detekt :core-engine:detekt :core-engine:ktlintCheck :core-engine:test :core-geometry:test :app:testDebugUnitTest --rerun-tasks` — **BUILD SUCCESSFUL** |
| Suppressions | none. No `@Suppress`, no baseline entry |
| Spacing | `Dimens.kt` untouched, `DpLiteralGuardTest` green. Three named component sizes added: `VERDICT_HEIGHT`, `TAB_COUNT_SLOT`, `POSITION_BAR_WIDTH` |
| Emulator | `Chesslab_Agent2` / `emulator-5556`, headful x86_64 API 35, 1440x3200 @ 560 dpi. **No physical device was touched** |
| Game | `2026-08-02_2159`, the recovered 83-ply game, re-reviewed on the emulator three times |
| Screenshots | `screenshots/{dark,light}/50-0*.png` — three tabs, the mate explorer and both themes; the four analysis states in dark |
| New tests | `theEngineStateIsWhatEveryTabShows`, `aRunInFlightSaysWhichGameAndHowFar` in `ReviewUiModelTest` |

## Not done, and why

- **Nothing on the reference phone.** Every verdict is at 560 dpi / 411 dp.
- **The banner has no route back to the review it names.** Tapping it does nothing; the tracker's
  banner resumes its screen because the nav host provides `LocalResumeTracker` for exactly that. The
  same seam would work for a review and it is a nav-host change, not a review-screen one.
- **`percent()`'s space in a monospace face** — see §5. It is one formatter for the whole app and
  changing it is a rule-5 decision.
- **The score sheet's move numbering disagrees with `findingTitle`'s.** `White · 15. Rhe1` in
  Moments sits at a different row than the Moves table's `15.`. Pre-existing, unrelated to anything
  here, and not touched — the analysis maths is out of scope.
