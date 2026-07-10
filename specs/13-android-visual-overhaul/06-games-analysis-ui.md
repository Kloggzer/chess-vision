# Phase 06 — Games library + Analysis screens

## Why

`ui/HistoryScreen.kt` shows only the current game's moves + a provenance sheet. With
storage (phase 04) and an engine (phase 05) in place, this becomes a **multi-game
library** and a per-game **analysis** view — the biggest product change in the overhaul.
This is the integration phase; it runs last.

## Design (decided — do not redesign)

Rename the "History" tab to **Games**. New/changed files: `ui/GamesScreen.kt` (new),
`ui/AnalysisScreen.kt` (new), delete/replace `ui/HistoryScreen.kt`, and
`ui/ChesslabNavHost.kt` (route rename + analysis route). Uses phase-01 components and
phase-00 theme. Reads `TrackerViewModel.gameStore` (phase 04) and an `AnalysisEngine`
(phase 05; inject a `FakeAnalysisEngine` if the native build is not yet wired, per 05).

### Games library (`ui/GamesScreen.kt`) — mockup "Games"

- Header "Games" + count. Live game pinned on top when a game is in progress
  (`uiState.moves` non-empty) with a `StatusPill(live)`.
- `LazyColumn` of `GameSummary` (from `gameStore.list()`): result glyph, opening/label,
  `savedAtEpochMs` formatted, move count, accuracy % (from cached analysis if present,
  else `—`), and a small **eval sparkline** (inline `Canvas` polyline over the game's
  per-ply evals; compute lazily/cache). Tap → Analysis route with the game id.
- Keep an Export (PGN) affordance (reuse `sharePgn` logic, now per-selected-game via
  `gameStore.loadPgn(id)`).

### Analysis (`ui/AnalysisScreen.kt`) — mockup "Game analysis"

- **Eval bar** beside the `BoardFrame` (a thin vertical `Canvas`; white-advantage fill
  from the current ply's `PositionAnalysis.eval`, clamped).
- Board (`ChessBoard(fen)` at the selected ply) with last-move highlight.
- **Engine line** row: eval (mono, accent), best move + short PV, depth (`KeyValueRow`-ish).
- **Scrubber**: first / prev / play / next / last — steps the selected ply; board + eval
  bar + move-list selection update. Compute `fens` for the game from the PGN via
  `chesslib`, call `engine.analyzeGame(fens, depth)` once (in a `LaunchedEffect`,
  cache into the game's sidecar so re-open is instant).
- **Annotated move list**: paired SAN with per-ply `MoveQuality` chip (BEST/GOOD/
  INACCURACY/MISTAKE/BLUNDER — colors: best=primary, good=secondary, inaccuracy=tertiary,
  mistake=`#F5843C`, blunder=error). Selected ply highlighted.
- **Merged move detail** (decided): tapping a ply shows a card/sheet with BOTH the
  engine verdict (eval, cp-loss, best move) AND the tracker's decision provenance
  (`decider`, `reason`, `margin`, `changed`, `shadowVeto`, `priorUsed`) loaded via
  `gameStore.loadProvenance(id)` (the fields `HistoryScreen.kt:90-95` renders today).

### Nav (`ui/ChesslabNavHost.kt`)

- `Dest.HISTORY` → `Dest.GAMES` (route `"games"`, label `nav_games`, keep the History
  icon or swap). Route `composable("games")` renders `GamesScreen`.
- Add `composable("analysis/{gameId}")` rendering `AnalysisScreen`. Games list navigates
  with the id. `TrackingRoute`/others unchanged (phase 02 already adjusted Tracking).

## Steps

1. `ui/GamesScreen.kt` (library list + sparkline + navigate) + strings — commit `feat(android-games): games library screen`
2. `ui/AnalysisScreen.kt` (eval bar, board, engine line, scrubber, accuracy list) + strings — commit `feat(android-games): game analysis screen`
3. `ui/AnalysisScreen.kt` — merged engine + tracker-provenance move detail — commit `feat(android-games): merged provenance in analysis`
4. `ui/ChesslabNavHost.kt` (+ remove `HistoryScreen.kt`) — Games/Analysis routes, tab rename — commit `feat(android-games): games and analysis navigation`

## Tests (write, run once, targeted)

- `:app:testDebugUnitTest --tests "com.chesslab.tracker.ui.Analysis*"` /
  `"…Games*"`: PGN→fens derivation aligns with move count; accuracy list maps
  `PositionAnalysis` (via `FakeAnalysisEngine`) → `MoveQuality` chips correctly;
  sparkline point derivation clamps evals. No native engine in tests.
- `:app:assembleDebug` once at the end (allowed in this phase).

## Acceptance criteria

- [ ] `ui/HistoryScreen.kt` is gone; `GamesScreen`/`AnalysisScreen` exist; nav route `"games"` + `"analysis/{gameId}"` present.
- [ ] Games list reads `gameStore.list()`; tapping a game opens Analysis for that id.
- [ ] Analysis renders eval bar + engine line + scrubber + accuracy-tagged move list from an injected `AnalysisEngine` (fake in tests).
- [ ] The move-detail merges engine verdict AND tracker provenance (`grep -n "decider\|priorUsed" ui/AnalysisScreen.kt` hits).
- [ ] Accessibility preserved (≥48 dp, `contentDescription`, strings in `strings.xml`).
- [ ] `:app:testDebugUnitTest --tests com.chesslab.tracker.ui.* :app:assembleDebug :app:ktlintCheck :app:detekt` green.

## Do NOT

- Do not run the real Stockfish in tests — inject `FakeAnalysisEngine`.
- Do not re-add an overlay-view control (that lives on Tracking now).
- Do not block on live analysis: if phase 05's native build is not wired, ship against
  the fake and note it in STATUS (accuracy shows once the engine lands).
- Do not hardcode strings.
