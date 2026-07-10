# Phase 04 — Game storage (multi-game persistence)

## Why

The app keeps only the single live game in memory (`UiState.moves`, `ui/UiState.kt:55-70`)
and can only share one PGN ad hoc (`ChesslabNavHost.sharePgn`, `ChesslabNavHost.kt:174-186`).
The redesign needs a **library of finished games** to list and analyze. This phase adds
persistence — no UI (phase 06 renders it). It runs independent of the theme work.

## Design (decided — do not redesign)

New package `com.chesslab.tracker.games`. Store each finished game as a **PGN file** plus
a **provenance sidecar JSON** (the per-move decision provenance the tracker already
produces — keep it, per the merged-provenance decision). Reuse `record/PgnBuilder.kt`
(`PgnBuilder.build(san: List<String>, fen: String): String`, used at
`ChesslabNavHost.kt:178`).

### Model + store

```kotlin
// games/GameRecord.kt
@Serializable data class GameSummary(
    val id: String,            // e.g. "2026-07-10_1822"
    val savedAtEpochMs: Long,
    val opening: String?,      // best-effort ECO/opening name or null (phase can leave null)
    val moveCount: Int,
    val result: String,        // "1-0" | "0-1" | "1/2-1/2" | "*"
)

// full record = PGN text + provenance list (mirrors ui.MoveEntry.decision, api.Decision)
@Serializable data class MoveProvenance(
    val ply: Int, val san: String,
    val decider: String?, val reason: String?,
    val margin: Double, val best: Double, val second: Double,
    val changed: List<String>, val shadowVeto: List<String>, val priorUsed: Boolean,
)
```

```kotlin
// games/GameStore.kt — files under context.filesDir/games/
class GameStore(private val dir: File) {
    fun save(moves: List<MoveEntry>, finalFen: String): GameSummary   // writes <id>.pgn + <id>.provenance.json
    fun list(): List<GameSummary>                                     // newest first, parsed from a lightweight index
    fun loadPgn(id: String): String
    fun loadProvenance(id: String): List<MoveProvenance>
    fun delete(id: String)
}
```

- `save` writes `<id>.pgn` via `PgnBuilder.build(moves.map { it.san }, finalFen)` and
  `<id>.provenance.json` (kotlinx-serialization, already a dep) from `MoveEntry.decision`
  (`ui/UiState.kt:8-11`, `api.Decision` fields as used in `HistoryScreen.kt:90-95`).
- `list` reads a small `index.json` maintained on save (avoid parsing every PGN — mirror
  the repo's manifest-cache principle). Result label derived from the PGN result tag.
- Determinism: no `Date.now()` inside logic-critical paths beyond the timestamp id;
  `savedAtEpochMs = System.currentTimeMillis()` is fine here (real device clock).

### Save hook (no UI)

A game is worth saving when it has ≥1 move and is being ended or replaced:
- on `UiState.gameOver == true` (`ui/UiState.kt:62`), and
- when the user starts a new game (`TrackerService.reset()`, `TrackerService.kt:195`)
  or recalibrates (`TrackerViewModel.recalibrate` → `stopTrackingToPreview`,
  `TrackerService.kt:158-166`) **while `moves` is non-empty** — save the outgoing game
  first, then reset.

Wire via `TrackerViewModel` (it already holds `uiState` and calls `service.reset()`):
add `private val gameStore = GameStore(app.filesDir.resolve("games"))` and a
`maybeSaveCurrentGame()` called before `reset()`/`recalibrate()` and on a `gameOver`
transition collected from `uiState`. Expose `gameStore` (read) for phase 06.
Do **not** change engine/service detection logic.

## Steps

1. `games/GameRecord.kt` + `games/GameStore.kt` (save/list/load/delete + index) + tests — commit `feat(android-games): PGN + provenance game store`
2. `ui/TrackerViewModel.kt` — `gameStore`, `maybeSaveCurrentGame()`, save-before-reset/recalibrate + gameOver auto-save — commit `feat(android-games): persist finished games on reset/gameover`

## Tests (write, run once, targeted)

- `:app:testDebugUnitTest --tests "com.chesslab.tracker.games.*"`: `save` then `list`
  round-trips a `GameSummary`; `loadPgn`/`loadProvenance` return the written content;
  `delete` removes both files and the index entry; empty-moves game is not saved.
  Use a `@TempDir` file dir (no Android context needed — pure `File` I/O).

## Acceptance criteria

- [ ] `GameStore.save` writes both `<id>.pgn` and `<id>.provenance.json` under `filesDir/games`.
- [ ] `list()` returns newest-first summaries from an index without parsing every PGN.
- [ ] Starting a new game / recalibrating with a non-empty move list persists the outgoing game exactly once (test the guard).
- [ ] Reuses `record/PgnBuilder.build` — `grep -n "PgnBuilder.build" android/app/src/main/kotlin/com/chesslab/tracker/games` hits.
- [ ] `:app:testDebugUnitTest --tests com.chesslab.tracker.games.* :app:ktlintCheck :app:detekt` green.

## Do NOT

- No UI — phase 06 renders the library/analysis.
- Do not modify the engine, `TrackerCoordinator` detection, or `SessionRecorder`
  (`record/SessionRecorderImpl.kt` is the dataset-export recorder — a different concern;
  do not repurpose it).
- Do not add a database dependency — plain files + kotlinx-serialization (already a dep).
