# Phase 02 — One played game is one stored record

## Why

A game played on 2026-07-28 is in the library as **three files**, and the user's verdict is the
requirement:

> *"für mich als Nutzer ist so ne Naht in der Game-Historie unverständlich"*

| file | startFen | stored moves |
|---|---|---|
| `2026-07-28_0041` | after 2.Nf3 | Nc6, d4, exd4, Nxd4 |
| `2026-07-28_0042` | queen **already** on d4 | c5, Qxc5, b6 |
| `2026-07-28_0046` | queen **already** on e5, bishop **already** on e7 | Bd2 |

The cause is `GameSessionController.onCommitted`: when the engine commits something illegal from the
current record's last position — a *seam*, in practice always `cnn_recovery` jumping off the line —
the record is closed and a new one opened at the position after the jump. `12a4422` stopped the
jumping plies from vanishing (`StoredGame.openedBySeam` now records them), but the library still
shows one game as several entries.

## Design (decided — do not redesign)

**Keep one `LiveGame` across a seam. Represent the jump inside the record, not by splitting it.**

`LiveGame`'s invariant is that moves chain legally from `startFen`; a jump breaks it. So the record
becomes a list of **segments**, each legal from its own start:

```kotlin
@Serializable
data class GameSegment(
    val startFen: String,
    val moves: List<StoredMove>,
    /** Null on the first segment. What was committed to get here, and by which decider. */
    val enteredBy: SeamOrigin? = null,
)
```

`StoredGame` keeps `moves` as the **flattened** list so every existing reader (`GameSummary`,
`moveCount`, the Games list, the detail screen) keeps working, and gains `segments` beside it.
`openedBySeam` from `12a4422` is subsumed by `GameSegment.enteredBy`: **remove it** rather than carry
two representations, and migrate on read — a stored game with `openedBySeam` set and no `segments`
deserialises into one segment carrying it.

- `continues(ucis)` failing now starts a **segment**, not a record. `endAndSave()` is no longer
  called there.
- `onFen` / undo must keep working across segments: an undo pops from the last segment, and empties
  the segment (removing it, restoring the previous one) when it was the segment's only move.
- **PGN**: a PGN file may legitimately contain several games. Emit one PGN game per segment, each
  with its own `[SetUp "1"]` / `[FEN ...]`, and a comment on the first move of a non-first segment
  naming what happened, e.g. `{position rebuilt by cnn_recovery: Qxd4 — the app lost the board here}`.
  Do not fabricate a single illegal main line.
- **Games screen**: one row per game, as today. The row states when a game contains seams, because a
  game the app lost and rebuilt is not the same evidence as one it tracked cleanly — e.g.
  `12 moves · rebuilt 2×`. The detail screen renders the segments in order with the seam note between
  them.

## Steps

### 1. `games/GameRecord.kt` — commit `feat(games): a stored game is a list of legal segments`
`GameSegment`, `StoredGame.segments`, removal of `openedBySeam`, and the read migration.

### 2. `games/LiveGame.kt` — commit `feat(games): a seam opens a segment, not a new record`
Segment list, `onCommitted` appending to the last segment, `openSegment(fenAfter, seam)`, `finish()`
emitting both the flattened `moves` and `segments`, undo across segments.

### 3. `games/GameSessionController.kt` — same commit
The seam branch calls `live.openSegment(...)` instead of `endAndSave()` + `LiveGame(...)`. The
comment there about **not** queueing a photo at a seam stays true and stays.

### 4. `games/buildPgn` (find via `grep -rn "fun buildPgn" android/app/src/main`) — commit `feat(games): PGN writes one game per segment with the seam named`

### 5. `ui/games/GamesScreen.kt` + `GameDetailScreen.kt` — commit `feat(games-ui): show that a game was rebuilt, and where`

### 6. Tests — commit `test(games): pin segments, undo across a seam, and the PGN shape`

## Tests (write, run once, targeted)

`android/app/src/test/kotlin/com/chesslab/tracker/games/GameSessionControllerTest.kt` — extend, do
not rewrite. `aSeamRecordsThePliesThatCausedItOnTheNewRecord` (added in `12a4422`) becomes a
segment test; keep its docstring's evidence.

1. **A seam produces ONE saved game with two segments**, not two saved games. Assert
   `store.list().size == 1` and `segments.size == 2`.
2. **The flattened `moves` still holds every ply in order**, so existing readers are unaffected.
3. **`enteredBy` names the jumping plies, their decider and the position before**, exactly as
   `openedBySeam` did.
4. **Undo immediately after a seam** removes the segment's only move and leaves the previous segment
   intact — not a dangling empty segment.
5. **PGN**: two `[Event ...]` blocks, the second carrying `[FEN ...]` and the seam comment.
6. **Migration**: a stored JSON with `openedBySeam` and no `segments` loads into one segment.

`cd android && ./gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.games.*"`

**Prove red first** for 1 and 4 against the current controller.

## Acceptance criteria

- `grep -rn "endAndSave()" android/app/src/main/kotlin/com/chesslab/tracker/games/GameSessionController.kt`
  no longer hits inside the seam branch.
- `grep -rn "openedBySeam" android/app/src/main` returns only the migration path.
- Replaying the four device fragments in `data/_device/20260728-runaway/games/` through the new
  reader is **not** required (they are old-format files), but the migration test above must cover
  their shape.
- `:app` unit tests green, `ktlintCheck` and `detekt` clean for `:app`.

## Do NOT / Out of scope

- Do not change WHEN a seam is detected (`LiveGame.continues`) — only what happens then.
- Do not start recording a photo at a seam. The comment in `GameSessionController` explains why: a
  seam is the moment the engine's FEN is least trustworthy, and a frame labelled with it is poisoned
  training data. A gap in the training set beats a wrong label in it.
- Do not touch `src/chesslab/**`, `android/core-engine/**`, or the recording gates.
- Do not merge fragments that are already on disk. This changes future records only.
