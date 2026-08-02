# 00 — A recovery shows its work

> Owns `core-engine/CnnTick.kt` (`commitRecovery` only), `core-engine/DecisionLog.kt` and their
> tests. Land this first: phases 01 and 02 are judged by what it makes visible, and the open
> question in `entry.md` cannot be answered without it.

## Why

`commitRecovery` (`CnnTick.kt:250-264`) pushes every move in the sequence and then records one row:

```kotlin
for (move in moves) { sans.add(board.san(move)); board.push(move) }
history.addAll(sans)
lastMove = ucis.last()
recordDecision(moves.last(), sans.last(), fenBefore, DECIDER_CNN_RECOVERY, priorUsed = false)
```

So a four-move bridge leaves one line in the log and a four-ply gap in the ply numbers. Reading the
incident took a full log dump and a read of this function; the log alone could not show what had
happened, only that something had.

There is a second, quieter cost. `fenBefore` is captured once, before the loop, so the single row's
"before" is four plies older than its "after". Anything that reconstructs the game from the rows —
which is what `specs/34`'s file exists for — reconstructs it wrong.

## Design

One row per move, in order. The sequence is not hidden; it is stated.

- Each row's `fenBefore` is the position that move was actually played from.
- Every row of one sequence carries the same **`decider`** (`cnn_recovery`) and the same
  **sequence key** — the joined ucis — so the rows can be grouped back together by a reader that
  wants the bridge as a unit. Add the key to the existing note/reason field rather than inventing a
  new column: `DebugDecision` is a wire shape now (`specs/34` phase 00) and widening it is that
  pack's business, not this one's.
- The rows must be distinguishable from N independent recoveries. `1/4`, `2/4` … in the reason text
  is enough and needs no schema change.

**What this does to a running game:** nothing. The board, the history and the events are unchanged;
only the number of decision rows changes. That is deliberate — this phase is the instrument, not the
repair.

## Steps

1. **`fix(engine): every move of a recovery gets its own row`** — record inside the loop, with the
   correct `fenBefore` per move. Keep `lastMove`, `history`, `queueSessionCapture` and the emitted
   `TrackerEvent` exactly as they are; only the logging changes.
2. **`feat(engine): the sequence is identifiable in the log`** — the `i/N` and the sequence key in
   the reason text.

## Tests

- A three-move recovery produces **three** rows, in order, with `ply` increasing by one each time
  and each `fenBefore` equal to the previous row's resulting position.
- A one-move recovery produces exactly one row, and its text is unchanged from today — a single
  recovery is the common case and must not get noisier.
- The rows of one sequence share a key that distinguishes them from two separate recoveries of the
  same length.
- `ClasspathPurityTest` passes unchanged.

## Acceptance

- Replaying the incident's shape (a four-move recovery) yields four rows whose plies are contiguous,
  where today it yields one row and a four-ply gap.
- `gradlew.bat :core-engine:test :app:testDebugUnitTest --rerun-tasks` green.

## Do NOT

- Do not change when a recovery fires, how many moves it may commit, or any threshold. This phase
  adds rows and nothing else. The question of whether multi-move recoveries should exist is open and
  is answered by the data this phase produces — see `entry.md`.
- Do not widen `DebugDecision`. `specs/34` phase 00 makes it a wire shape; a new column is a
  coordination problem with that pack for no gain here.
- Do not touch `clearAlarm`, `clearStuck` or `cnnStatus` in `commitRecovery`. Those are defect 2 and
  they are not in this pack.
