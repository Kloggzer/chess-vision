# 46 — Status

| Phase | State | Note |
|---|---|---|
| Entry | `done` | written 2026-08-03 from the user's observation |
| Implementation | `done` | 2026-08-06, `8793225` + `53a7af5`. Gate green with `--rerun-tasks`; NOT yet run on a device |

## What shipped

**The library.** `ReviewStore` writes one file per `(position, budget)` under
`.analysis-cache/positions/`, holding the raw `Score` — cp, depth, PV, mate — and never a verdict,
as the pack required. `loadCached(gameId, budget, positions)` merges the per-game snapshot with the
library, and promotes every score it finds in the snapshot INTO the library, so an install that
already has analysed games migrates lazily and needs no startup pass.

**The key is two keys, and the pack asked for one.** They serve different questions and are both
tested:

| | Fields | Where |
|---|---|---|
| Engine cache | placement, side, castling, en passant, **halfmove clock** — the fullmove number is dropped | `canonicalEnginePosition` |
| Opening name | placement, side, castling | `openingPositionKey`, and `position_key` in `android/scripts/generate_opening_book.py` |

The fifty-move clock stays in the ENGINE key against the pack's "the move counters do not belong":
it changes what the engine may claim, and a shared draw score across different clocks would be a
wrong answer rather than a missed hit. It is correctly absent from the opening key, where a name
cannot depend on it.

**The budget is IN the key, not beside it** — `cacheIdentity` folds nodes, cap, threads, hash and
MultiPV into the hashed name, so the same game at another budget misses (asserted).

**Warming.** After a game's own review completes, `PositionLibraryWarmer` spends idle engine time on
positions the next game is likely to want: a bounded fan-out from the last named opening position,
two popular book alternatives at the root and one deeper, at most 8 positions over 4 plies. It is
best-effort — an IO failure there leaves the completed review untouched — and it reports itself in
the banner as `Extending analysis library · n / m`.

**Two defects the work uncovered, fixed here:**

- A cancelled review did not stop the engine. `UciEngine.analyse` now takes a `cancelled` predicate
  and its polling reader throws on it; before, a cancelled coroutine sat until the search finished.
- `ReviewViewModel` fences every asynchronous writer behind a monotonic generation, so a stale run
  cannot paint the UI or write the analysis file of a game that has since been changed, stopped,
  discarded or deleted. `forget` cancels **and joins** before the caller deletes the files.

## Acceptance, item by item

| Asked | State |
|---|---|
| A second game sharing an opening analyses fewer positions | covered by `anEngineScoreIsSharedByPositionAcrossGamesAndFullmoveNumbers` |
| …and the number is reported | **partial** — warming reports `n / m`; reuse itself is visible only as a grade that is already there on open. No "N positions reused" readout |
| A transposition hits the cache | covered — same position at move 12 and move 40 |
| The same game at a different budget does NOT hit | covered — `ReviewBudget(nodes = 20)` misses |
| A cold start still hits it | covered by construction (files) and by `anOldGameSnapshotLazilyPopulatesTheSharedPositionCache` |
| Deleting a game keeps the library | covered by `deletingOneGameDoesNotForgetTheExtendedPositionLibrary` |

## Open

- **There is no size policy, and the pack asked for one.** The library grows with every distinct
  `(position, budget)` ever analysed: no cap, no eviction, nothing falls out first. The WARMING is
  bounded (8 positions per finished review); the store is not. Nobody has measured what a realistic
  library of games costs on disk, which is the number the pack wanted before choosing a bound.
- **The en-passant field is taken verbatim, not normalised to "only if legal".** Two identical
  positions whose FENs disagree about an unusable en-passant square will miss each other. That
  direction is safe — a miss costs engine time, never a wrong score — but it is the exact trap the
  entry named, and it is still open.
- **Not measured on a device.** Every claim above is from unit tests and reading; no phone run has
  been done since the work landed, so the seconds actually saved on a second King's Pawn game are
  unknown.
