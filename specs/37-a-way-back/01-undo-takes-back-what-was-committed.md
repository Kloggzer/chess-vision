# 01 — Undo takes back what was committed

> Owns `core-engine/api/TrackerEngine.kt` (`undo` only) and `core-engine/EngineState.kt` plus their
> tests. Independent of phase 02.

## Why

`undo()` (`api/TrackerEngine.kt:214-226`) pops exactly one move:

```kotlin
state.board.pop()
state.history.removeAt(state.history.size - 1)
```

A recovery that pushed four needs four presses. Nothing tells the user how many, and each press also
runs `clearAlarm(ALARM_UNDONE)` and `clearReferenceState()` — so the state after one press is not the
state before the sequence, and pressing again is a different act from pressing the first time.

The engine already knows the answer. `commitRecovery` emits `TrackerEvent.SequenceCommitted(ucis,
sans, …)` when `moves.size > 1` (`CnnTick.kt:294`) — the list is right there. It is committed as a
unit and taken back one at a time, and that asymmetry is the whole of the user's "no way back".

## Design

Undo takes back **the last commit**, whatever its size.

Keep a small record of what the last commit pushed — a count is enough, and a count is cheap and
carries no history of its own. On undo, pop that many. Anything that already resets on undo (the
reference, the alarm, the decision-log trim at `:223`) runs **once**, after the pops, not per pop.

The decision-log trim already handles this correctly by construction: it drops every row whose `ply`
exceeds the new history size, so phase 00's per-move rows disappear with the moves that made them.
Verify that rather than assuming it.

**Two undos in a row must still work.** The record is of the *last* commit only; after an undo it is
cleared, so a second press falls back to single-move behaviour. That is right — anything older is a
normal move, not a bridge.

**What this does to a running game:** one press now unwinds a multi-move recovery completely instead
of partially. A user who has learned to press four times will over-undo. That is acceptable and
better than the alternative, but the UI text should say what the button will take back — see
Acceptance.

## Steps

1. **`feat(engine): the last commit knows its size`** — a field on `EngineState` set by every commit
   path (1 for the ordinary ones, `moves.size` for `commitRecovery`), cleared by `undo`.
2. **`fix(engine): undo unwinds the last commit as a unit`** — pop N, then run the existing
   post-undo cleanup once.
3. **`feat(app): the button says what it will undo`** — where the undo control names the move, name
   the sequence instead when there is one (`Bxb5 + Kb8 + Bd4 + Nf3`). The engine already carries the
   SANs in `SequenceCommitted`.

## Tests

- A four-move recovery followed by one `undo()` returns the board to the position before the
  recovery, and `history.size` to its pre-recovery value.
- The decision log after that undo contains no row with `ply` above the restored history size —
  including the per-move rows phase 00 adds.
- A single ordinary commit followed by `undo()` behaves exactly as it does today. Pin this: it is
  the common path and the regression risk.
- Two undos in a row after a sequence: the first unwinds the sequence, the second unwinds one
  ordinary move.
- `clearAlarm` and `clearReferenceState` run **once** per undo, not once per popped move. Assert on
  a counter or a spy; this is the part most likely to be got wrong by looping the whole body.

## Acceptance

- Reproduce the incident's shape — commit a four-move recovery, press undo once — and the game is
  back where it was, with the log showing no orphan rows.
- `gradlew.bat :core-engine:test :app:testDebugUnitTest --rerun-tasks` green.

## Do NOT

- Do not make undo unwind more than the last commit. A multi-step history walk is a different
  feature with a different UI, and it is not what is broken.
- Do not change `clearAlarm(ALARM_UNDONE)`'s meaning. Undo clearing the alarm is correct — the user
  has just told the engine its position was wrong.
- Do not touch `acceptCnnPosition`. That is phase 02's neighbour and its problem is different.
