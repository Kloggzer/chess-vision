# 47 — Status

| Phase | State | Note |
|---|---|---|
| Sketch | `awaiting review` | `PROPOSAL.md` + `screenshots/{light,dark}/` written 2026-08-03. **Nothing implemented; no `.kt` file touched.** |
| Implementation | `blocked` | starts only after the user's review is recorded at the bottom of this file |

## Measured before the pack was written (kept, with corrections below)

| Fact | Value | How |
|---|---|---|
| Routes | 8 | `ChesslabNavHost.kt` |
| Top-level tabs | 6 | `TopNav.kt` / device |
| Distinct `dp` literals in UI code | 18 | `grep -rhoE "[0-9]+\.dp"` over `ui/`, `spectate/`, `speech/` |
| Spacing token file | none | `ui/theme/` holds Color, Theme, Type only |
| Landing screen | Board (the tracker), which since specs/43 launches not tracking | device |

## Measured 2026-08-03 for the sketch

Emulator `Chesslab_Agent2` / `emulator-5556`, headful x86_64 API 35, `wm size` **1440x3200**,
`wm density` **560** → **411 dp** wide. Clip `blender-castle.mp4`. `com.chesslab.tracker.emulator`.
The reference phone is ~7 % denser (~600 dpi, ~384 dp); no verdict recorded here rests on a few dp.

### Navigation

| Fact | Value | How |
|---|---|---|
| Registered `composable` destinations | **9** | `ChesslabNavHost.kt`: tracking, calibration, camera, settings, debug, games, review, review/{id}, speech |
| Distinct screen implementations | **7** | `calibration` and `camera` are the **same call with the same arguments**; `review` and `review/{id}` are the same composable with a different source |
| Top-level tabs | 6 | Board, Camera, Games, Spectator, Speech, Settings |
| Where the tab row exists | **only on `ROUTE_TRACKING`** | `TopNav` is composed inside the tracking block. Verified in the wild: tapping the "Spectator" position while on the Games screen does nothing. |
| `TopNav.selected` | hard-coded `0` | `ChesslabNavHost.kt:70` |
| Tab label vs destination title | disagree | tab "Spectator" → screen "Live game" |
| Surfaces that write settings state | **4** | Settings screen · Speech tab · eval-bar long-press sheet · `RecordingPanel` inside the Games list |

### Spacing — the entry.md figure is superseded

| Fact | Value | How |
|---|---|---|
| Distinct `dp` literals | **26**, not 18 | same command, same paths, 2026-08-03 |
| Total occurrences | **195** | |
| By role | 77 padding · 74 gaps · 23 fixed sizes · 10 corner radii · 10 strokes | |
| Top 7 values | 8 (39) · 12 (25) · 6 (24) · 4 (24) · 2 (17) · 10 (17) · 1 (10) = **156 / 195 = 80 %** | |
| Named `Dp` constants | 7, across 5 files | `BAR_WIDTH`, `SLOT_WIDTH`, `POSITION_COLUMN_WIDTH`, `MOVE_ROW_HEIGHT`, `SLIDER_INSET`, `TAB_HEIGHT`, `BOARD_GAP` |
| Raw `Int` constants with `.dp` at the use site | **6** — invisible to any `.dp` grep | `PANEL_CORNER=14`, `TILE_MIN=56`, `TILE_CORNER=12`, `BANNER_CORNER=8`, `DECK_GAP=8`, `PROSE_MAX=200` |
| `ScreenPadding` call sites | **1** | `Chrome.kt:72` → `GameReviewScreen.kt:205` |
| Horizontal screen margin | **12 dp** on Games/Settings/Speech/Debug, **14 dp** on Board, **0** on Camera | |
| Minimum touch height | **44 / 48 / 52 dp** in three different files; Material's floor is 48 | |

**The old list is stale, not merely coarser:** it contains `88.dp`, which no longer exists anywhere
in the tree, and misses `5, 9, 20, 24, 40, 44, 68, 200, 320`. The review overhaul `a5cdfd1` landed
in between.

### Theme — the open question is closed

| Fact | Value |
|---|---|
| Light scheme | **exists and is complete** — `PaperPalette` (18 tokens) vs `InkPalette`; `Theme.kt` branches on `isSystemInDarkTheme()` |
| `values-night` | present for both `themes.xml` and `colors.xml` |
| Dynamic colour | none, deliberately |
| How call sites reach colour | 18 top-level names that are `@Composable @ReadOnlyComposable` getters over `LocalChesslabPalette`, so all **106 import sites / 32 files** follow the system for free |
| `MaterialTheme.colorScheme` reads | 6, in 4 files |
| Deliberate opt-out | `CameraChrome.kt:45` — `Chrome = InkPalette`, dark in both themes, argued in its KDoc |
| Colour literals outside `ui/theme/` | 12 (8 = the debug timing chart, 4 = camera chrome) |
| Typography | 8 roles in `Type.kt`, **178** `MaterialTheme.typography` reads, **one** hard-coded `fontSize` (`PromotionDialog.kt:67`) |

**Verdict from the screenshots: the light theme holds up.** Both themes were captured for every
screen (`screenshots/light/`, `screenshots/dark/`) — the first light-mode pixels this project has on
record. Two narrow light-mode defects, both in `PROPOSAL.md` §2.7: the camera screen's `CameraNote`
carries no scrim and is grey-on-cream over a pale letterbox (`screenshots/light/02-camera.png`), and
`PieceWhite`/`PieceBlack` are the same hex in both palettes.

### The six inconsistencies from entry.md, as found

| # | entry.md said | Found |
|---|---|---|
| 1 | two units, per cent vs pawns | **three places read pawns, and one pair shares a slot**: the **live** eval bar reads `+0.3` while the **review** eval bar reads `61 %`; `MoveList.pawnScore` and `AnalysisPanel` are the other two |
| 2 | a moment that decided nothing is ranked | confirmed and root-caused: `GameGrade.findings()` sorts `compareByDescending { missedMate }` **first**, so every missed mate outranks every swing by construction |
| 3 | "Analysis details" is an empty heading | **not empty** — it opens and holds the decider, the grading method, Share/Copy PGN and "Analyse again". The defect is that a muted `TextButton` with no chevron and no surface is indistinguishable from the headings above it |
| 4 | "⚙: Nf3" is illegible and redundant | confirmed, and **worse**: the chip prints `ply.bestSan` (the engine's move in the position *before* the ply) while the board draws `fromHere.bestUci` (its move *from the position on screen*) — **two different positions in one row**. `screenshots/light/04f-review-ply6-context-chip.png` |
| 5 | a tab label carries a live counter | confirmed; watched it go `Moments · 2` → `· 11` → `· 20` → `· 24` while the analysis streamed |
| 6 | the light theme has never been reviewed | **now reviewed** — see the table above |

### Additional findings not in entry.md

- **`MoveQuality.BOOK` has been deleted, not left unreachable.** `MoveQuality.kt` KDoc: *"`BOOK` was
  here and is gone: no opening book ships, so nothing could set it."* An opening book therefore
  restores a band rather than filling a slot. `entry.md` is stale on this point.
- **`ROUTE_CALIBRATION` is a dead alias** — same composable, same arguments as `ROUTE_CAMERA`.
- **The eval bar's 40 dp width is held open by an undiscoverable gesture.** `EvalBar.kt` states the
  slot cannot shrink because it is "the ONLY way into the analysis settings sheet" — false since the
  Settings screen gained its Analysis section.
- **The Games screen buries the library.** "Record training frames" (5-line explainer, 4 size chips,
  a second toggle) is the tallest element on it; the game list is the third card
  (`screenshots/light/03-games.png`).
- **`Moves · 83` for a 42-move game.** The tab counts plies; the rows are numbered 1..42 under
  "White / Black" headers. Two meanings of "move" on one screen.
- **Every stored game reads `? vs ?`**, reproduced on device — `white`/`black` exist and nothing
  writes them.

## Test data on the emulator

`data/_device/20260802-2159-recovered-from-diagnostics/game-2026-08-02_2159.pgn` was rebuilt into
`StoredGame` shape (83 plies; per-ply `decider` taken from the accepted rows of `diag-all.ndjson` —
52 `cnn_recovery`, 31 `cnn_occupancy`) and pushed via `/data/local/tmp` +
`run-as com.chesslab.tracker.emulator cp` into `filesDir/games/`. Analysed on device by the bundled
Stockfish: **60/83 graded, White 73 %, Black 64 %, 24 moments**, ~3 min for 84 positions on x86_64.
The emulator flavour cannot reach the phone's storage; no physical device was attached at any point.

## Answers to the open questions from the first draft

| Question | Proposal |
|---|---|
| Does Spectator deserve a top-level tab? | **No — delete the tab and the live `review` route.** Its board and move list are the Board screen's, from the same `GameView`; its only unique content is `SpectatorShareCard`, which moves into the tracker's overflow. |
| Do Camera and Calibration remain two routes? | **No.** `calibration` is a dead alias — delete it. Camera also loses its *tab*: it cannot function without the tracker (its unbound state is one sentence on an empty screen) and it is the tracker's viewfinder. |
| Does Debug belong in the main graph? | **Yes, where it is** — behind Settings, behind a switch, payload not assembled while closed. |
| What does a dashboard card show that the app knows? | Recent games, results, ply counts, per-game accuracy (cached `GameGrade`), games played, total moves, mean accuracy **with its denominator**, and clean-vs-rebuilt records from `GameSummary.seams`. Nothing else. |
| Where does "who played" get asked? | **At the end**, inside the `EndGameDialog` that already interrupts, as two optional fields pre-filled from the last game. Never before the first move. |
| Is an opening book worth adding? | Yes, but it is the one item with a dependency shape, and the dashboard works without it. CC0, EPD-keyed, and its normaliser should be shared with specs/46 rather than written twice. |
| What is the dashboard's empty state? | Greeting, one sentence about what the app does, one button, one line saying statistics appear after the first game. **No stat cards, no zeroes, no placeholder chart.** |

## Proposed shape, one line each

- Top-level destinations **6 → 3** (Home · Games · Settings), on a bar that is persistent — unlike
  today's row, which exists on one route.
- Registered routes **9 → 7**. Deleted: `calibration`, live `review`, `speech`.
- Also deleted: the analysis settings sheet and its long-press, `RecordingPanel` on Games, the
  `⚙: move` card, `pawnScore` in the UI, the per-row Rename/Delete buttons.
- Added: **one** new screen (Home), two optional name fields in an existing dialog, and — separately
  — an opening book.
- Spacing: **26 values → 12 tokens** in `ui/theme/Dimens.kt` (`Space`/`Radius`/`Stroke`/`Touch`),
  plain objects rather than a `CompositionLocal`; ~10 component sizes stay as named local constants.

Full document, with wireframes and both navigation maps: **`PROPOSAL.md`**.

## Review

_(to be filled in by the user — implementation does not start before this section exists)_
