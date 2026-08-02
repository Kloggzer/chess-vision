# 37 — Status

| Phase | State | Note |
|---|---|---|
| 00 — a recovery shows its work | `done` | one row per move, stamped `[move i/N of recovery <ucis>]` |
| 01 — undo takes back what was committed | `done` | one press unwinds the last commit; the control says its size |
| 02 — re-anchor without inventing history | `todo` | independent of 01 |

## What the two landed phases changed, and what they found wrong in the spec

**00.** `commitRecovery` now records inside the push loop, so each row carries the position its move
was actually played from and a ply that counts up with the history. A bridge of more than one move
stamps every row with `[move i/N of recovery <joined ucis>]`; a one-move recovery — the common case
— is byte-identical to before. Nothing else moved: same board, same history, same events.

The stamp rides in the reason text through a new defaulted `reasonSuffix` on `recordDecision`, which
lives in `Commit.kt`, **not** in `DecisionLog.kt` as the ownership table says. `DecisionLog.kt` was
not touched at all. `DebugPayload.kt` was not touched either.

**01.** `EngineState.lastCommitSize` is set by all three commit paths and `undo` pops that many,
bounded by the history, with the post-undo cleanup running once. The decision-log trim needed
nothing new, as the phase predicted — verified, not assumed.

Two corrections to the phase text:

- Step 3's premise is false. "Where the undo control names the move" — neither undo control ever
  named it; both read a bare `"Undo"`. Implemented as the intent rather than the letter: the buttons
  read `Undo 4 moves`, and the alarm card, which has room for prose and is where Undo is pressed
  during this failure, names the plies (`One press takes back: Bxb5 + Kb8 + Bd4 + Nf3`).
- The design says the cleanup runs "once, **after** the pops". `clearAlarm(ALARM_UNDONE)` runs
  BEFORE them today and was deliberately left there, because the phase also demands the single-move
  path behave exactly as it does today and moving it would change that path too — see the open item
  below.

## Opened, not fixed

**An undo that pops always trims away its own user-correction row.** `clearAlarm(ALARM_UNDONE)`
writes its `decider = "user"` row at `ply = history.size` *before* the pops, and the trim then drops
every row above the restored size — including that one. So the log records a user correction only
when the undo popped nothing (an empty history), which is the case nobody debugs. It is pre-existing,
it predates this pack, and fixing it means moving `clearAlarm` after the pops, which changes the
ordinary single-move undo as well. Not this pack's call.

## The evidence

Read out of the phone's decision log after a live game on 2026-08-02, with the mechanism then
confirmed in `CnnTick.kt` and `api/TrackerEngine.kt`:

- committed plies ran `43 44 45 → 49 → 50 → 50 → 52 → 52 → 56`, five recoveries in a row, one of
  them a four-move bridge;
- ply 50 was committed twice with two different moves; ply 52 twice with the same one;
- the last move of the four-move bridge was `e1f3 (Nf3)` with the king on d1 and no knight on e1;
- it ended in `1k6/2p3pp/2r2p2/P2n4/2bb4/8/6PP/3K3R w` — two black bishops on c4 and d4 — cycling
  `no_legal_move` / `cnn_desync` indefinitely;
- every rejection row in that cycle reads **`cnnAgree=0.980`**, against a position the CNN itself
  had produced.

## The open question this pack does NOT answer

**Should a recovery be allowed to commit more than one move?**

The tempting fix is "one move or nothing", and there is no evidence for it. The mechanism exists
because a hand over the board genuinely does hide two plies, and refusing those trades a loud
failure for a silent stall. Nobody has measured how often a multi-move recovery is *right* — and it
cannot be measured today, because `commitRecovery` writes one row for N moves.

Phase 00 is what makes it answerable. After a week of real games with a row per move, the question
is a `grep` and a count. Until then, changing the commit rule would be a conclusion drawn from one
bad game, which this project has a standing rule against.

## Related, and deliberately not fixed here

**The confirmer measures stability, not truth.** `recoveryConfirmer` (`CnnTick.kt:215`) was added
because the legacy port pushed a whole sequence "on ONE glance" — its own comment says so. But
repeating an observation N times shows that it is the same observation, not that it is correct, and
a stable wrong read is exactly what a domain gap produces.

**A recovery clears the alarm on its own evidence.** `commitRecovery` sets `cnnStatus = OK`, empties
`cnnConflicts` and calls `clearAlarm(null)` and `clearStuck()`. The following frame's agreement is
then measured against a position built from the CNN, which is why 0.98 appears next to a fantasy
board. The one real guard — `resolvesAlarmConflicts` (`:236`), which demands every latched conflict
square read as the sequence predicts and refuses outright without an identity axis — is sound, but
only runs when an alarm is already latched.

Both belong to the same open question above, and both change engine behaviour at its most dangerous
seam. Measure first.
