# 47 — Status

| Phase | State | Note |
|---|---|---|
| Sketch | `done` | `PROPOSAL.md` + `screenshots/{light,dark}/` written 2026-08-03 |
| Review | `closed` | `PROPOSAL.md` §7, five decisions, the rest delegated |
| Implementation | `done` | 2026-08-03, three commits. Gate green, smoke test green on `Chesslab_Agent2` |

---

## What shipped

**Navigation.** Top-level destinations **6 → 3** (Home · Games · Settings), registered routes
**9 → 7**, and **no bar of any kind**. Home is the start destination.

| Deleted | What replaced it |
|---|---|
| `ROUTE_CALIBRATION` | nothing — it was a byte-identical alias of `ROUTE_CAMERA` |
| Spectator tab + live `review` route (`LiveReviewRoute`) | `SpectatorShareCard` in the tracker's `⋯` menu, as **Share on Wi-Fi** |
| Speech tab + `ROUTE_SPEECH` (`SpeechSettingsScreen`) | Settings › **Spoken moves** (`SpeechSection`) |
| Camera **tab** (route kept) | the tracker's **Recalibrate**, which was always the same screen |
| `TopNav` + `NavDestination` | nothing. It existed on one route and hard-coded `selected = 0` |
| `AnalysisSettingsSheet` + the eval-bar long press | Settings › **Analysis**, which already had every knob |
| `RecordingPanel` on Games | Settings › **Recording** (`RecordingSection` + `RecordingViewModel`) |
| the `⚙: move` card (`ReviewContextChip`) | one full-width verdict card |
| `pawnScore`, `CP_PER_PAWN` | win expectancy, everywhere |
| per-row Rename/Delete buttons | a per-row `⋯` |
| `initialReviewPly`, `ScreenPadding`, `GamesUi.prefs/sessions/sessionBytes`, `GamesViewModel.open/pgn` | — dead once the live review and the recording panel left |

**Reaching a running game with no bar** (§3.1a), all three, all absent when nothing is running:

1. the foreground notification deep-links to the tracker (`EXTRA_OPEN_TRACKER`, `OpenTracker`,
   plus the `onNewIntent` + `setIntent` a `singleTop` activity needs);
2. Home's first row becomes **Game in progress — N moves · Resume · End & save**;
3. every other screen wears a one-row banner under the app bar, inside `ChesslabScaffold` and
   driven by `LocalResumeTracker` (null on Home and on the tracker itself).

**Home** — four tiles, every number already measured: Games / total moves, Accuracy with its
denominator ("both sides, over N reviewed"), Clean records from `GameSummary.seams`, and With
frames from `sessionId`. Three recent games. Empty state is a greeting, one sentence, one button
and one line. **No opening-book tile** (decision 4).

**One unit.** `evalLabel`, `lineScore` and `MoveList.positionLeadLabel` all read win expectancy.
Mate keeps its words.

**Moments.** `GameGrade.findings()` sorts by swing alone; `missedChances()` is new and has its own
card. On the device game the top row went from *White · 32. Rxc6+ · missed mate in 6 · 98 % → 98 %*
to *Black · 14... b4 · Blunder · 48 % → 13 %*.

**Review tabs.** Label and count are separate `Text` nodes.

**Who played.** Two optional fields in `EndGameDialog`, pre-filled from the last saved game;
`LiveGame.finish` and `GameSessionController.endAndSave` carry them.

**Spacing.** `ui/theme/Dimens.kt` — `Space` (6) · `Radius` (3) · `Stroke` (2) · `Touch` (1) = 12
tokens, plain objects. 13 component sizes stay named and local. `DpLiteralGuardTest` enforces the
rule (decision 5).

---

## Line count

Measured over `android/app/src/**/kotlin`, blank lines and comments excluded, `main` → HEAD:

| | files | lines | code |
|---|---|---|---|
| main sources before | 155 | 22 147 | 14 990 |
| main sources after | 156 | 22 849 | 15 379 |
| **delta** | **+1** | **+702** | **+389** |
| tests before | 87 | 10 668 | 8 078 |
| tests after | 88 | 10 784 | 8 134 |

**Read it honestly.** The two new Home files are 334 code lines and `Dimens.kt` is 22, so
everything else together is **+33 code lines — flat, not negative.** The proposal said "everything
above the dashboard line is subtraction"; it was not. The deletions were real (a route, two
screens, a tab row, a sheet, a chip, a panel) but they paid for what replaced them: the banner and
its composition local, the overflow menu, `DisclosureRow` and `SectionHeading`, four Settings
subpages and their plumbing, `RecordingViewModel`, the notification deep link, the `BackHandler`,
the name fields. specs/35 and specs/36 reached −935 by deleting duplicated surfaces and adding
nothing; this pack deleted duplicated surfaces AND added a screen. Only the second half of that is
new code, and it is exactly the dashboard.

---

## Judgement calls the proposal did not cover

1. **The verdict card's "Better:" line is the engine's move from the position ON SCREEN, not the
   alternative to the move played.** §3.6 asks for both — "Better: exd4" (which is `ply.bestSan`,
   the move that should have been played *instead*) and "same position as the arrow" (which is
   `fromHere.bestUci`, the engine's move *from here*). Those are two different plies and no wording
   makes them one. The card reads **"The engine plays exd4 here."**, sourced from `fromHere`, which
   is the arrow's own move, and it appears only when the game did not continue with it. "What you
   should have played instead" already lives on the Moments tab, where the finding names its own
   ply. The row has one position, which was the actual defect.
2. **No "See all" link in the Recent games heading.** A `Games ›` disclosure row sits directly under
   the list instead — one door, and the same row every other navigation on this screen uses.
3. **Bottom bars in the §3.3/§3.7 wireframes were ignored.** They still draw `● Home Games
   Settings`, which contradicts decision 1. Decision 1 won.
4. **The banner carries Resume and nothing else.** The proposal's Games sketch keeps an "End & save"
   button on the in-progress card. Ending a game belongs where it is played (the tracker's own
   KDoc says so) and on Home, which is the hub; a third place to end it is a third place to get it
   wrong. Games lost `LiveGameRow` entirely.
5. **The 4th dashboard tile is "With frames", not an opening.** Free from `GameSummary.sessionId`,
   and it is the number that matters to this project. A 2×2 grid with a hole was the alternative.
6. **The accuracy card says "both sides", never "you".** The app does not know which side the user
   played. `HomeGame` names the sides by whatever was captured for them, falling back to
   White/Black.
7. **Recent-game accuracy is computed from the cached scores, not stored.** `ReviewStore` holds
   `Score`s, not a `GameGrade`, so the dashboard re-grades. A game is only OPENED when an analysis
   exists for it at the current budget, so an unreviewed game costs one failed file read. Storing
   the summary instead would have made every game analysed before today read "not reviewed yet".
8. **`Stroke` stays local in `BoardPreview`/`PreviewOverlay`.** `Stroke` there is DrawScope's;
   importing the token would collide.
9. **The eval bar slot stays 40 dp.** The sheet that "held it open" is gone, but `100%` still needs
   the width, and the review bar shares the constant.
10. **The tracker's camera-pause and camera-view chips moved into the `⋯` menu** with their state
    as a second `Text` ("Camera view **off**"), so the tappable label never changes. That reclaimed
    two rows of chips; §3.5 only asked for one.

---

## Fixed on the way, found by running it

- **`BindTrackerService` rebuilt the whole nav host on every service bind.** It called `content()`
  from two positions in the composition — bare while unbound, wrapped in `ProvideCalibrationHost`
  once bound — so Compose threw the subtree away when the binder arrived, `rememberNavController`
  with it. Tapping **Start tracking** landed the user back on Home. The bug predates this pack and
  was invisible while the start destination was the tracker: resetting the graph put you back where
  you already were. `ProvideCalibrationHost` takes a nullable host now and is unconditional.
- **`DisclosureRow`'s chevron fell off** when the subtitle wrapped — first seen on the review
  screen's own "Analysis details", the row this pack added the chevron for.
- **`CameraNote` had no scrim** (§2.7, finding 1). Reproduced in `light/after-03-camera.png`
  before the fix; legible after.
- **Settings' back arrow and the system back button meant different things.** The arrow returned to
  the group list; the hardware button popped the whole route. A `BackHandler` makes them one.
- **The smoke test asserted the old tab labels.** `scripts/android-smoke.ps1` now starts on Home,
  checks the three destinations that exist, and walks Home → tracker → Start tracking.

---

## Verification

| | |
|---|---|
| Gate | `:app:ktlintCheck :app:detekt :core-engine:detekt :core-engine:ktlintCheck :core-engine:test :core-geometry:test :app:testDebugUnitTest --rerun-tasks` — **BUILD SUCCESSFUL**, 93 tasks executed |
| Emulator | `Chesslab_Agent2` / `emulator-5556`, headful x86_64 API 35, 1440x3200 @ 560 dpi |
| Smoke | `Camera feed confirmed: camera 27 fps` (32 and 34 on earlier runs) |
| Stored game | `2026-08-02_2159`, the recovered 83-ply game, already in `filesDir/games/` from the sketch run. Dashboard reads it: 1 game, 83 moves, accuracy 69 % over 1 reviewed, 1 of 1 clean, 0 of 1 with frames |
| Suppressions | none. No `@Suppress`, no baseline entry |
| Screenshots | `screenshots/{light,dark}/after-*.png`, 16 per theme, beside the 29 from the sketch |

`@Suppress` and baselines were not needed once: the two ktlint findings the token sweep produced
(an import out of order, a KDoc preceded by a KDoc) and the nine unused `dp` imports were fixed,
not silenced.

---

## Not done, and why

- **The opening book.** Out of scope, decision 4. `MoveQuality.BOOK` stays deleted and the
  dashboard has no card that would need it.
- **`PieceWhite`/`PieceBlack` being the same hex in both palettes** (§2.7, finding 2). It works —
  all board contrast is carried by `BoardLight`/`BoardDark`, which do differ — and the proposal
  asked for it to be *stated* rather than changed. It is stated here.
- **Anything on the reference phone.** No physical device was attached at any point, and the
  emulator flavour cannot reach the phone's storage. Every layout verdict in this pack is at
  560 dpi / 411 dp; the phone is ~600 dpi / ~384 dp. Nothing here was decided on a few dp, but
  nothing here has been seen there either.

## Review

The user's review is `PROPOSAL.md` §7 — five decisions taken 2026-08-03, the rest delegated
(*"triff eine entscheidung und pack das"*). Nothing in it was re-opened.
