# 37 — Status

| Phase | State | Note |
|---|---|---|
| 00 — a recovery shows its work | `done` | one row per move, stamped `[move i/N of recovery <ucis>]` |
| 01 — undo takes back what was committed | `done` | one press unwinds the last commit; the control says its size |
| 02 — re-anchor without inventing history | `todo` | independent of 01 |
| 03 — an undo the recovery can hear | `done` | added 2026-08-02 from the loop below; `undo` vetoes the line it took back |

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

## Opened here, fixed 2026-08-03 in `5161a0b`

**An undo that pops always trimmed away its own user-correction row.** `clearAlarm(ALARM_UNDONE)`
wrote its `decider = "user"` row at `ply = history.size` *before* the pops, and the trim then
dropped every row above the restored size — including that one. So the log recorded a user
correction only when the undo popped nothing (an empty history), which is the case nobody debugs.

Fixed as this pack proposed: `clearAlarm` runs after the pops and the trim, which additionally
stamps the row with the ply and `fenAfter` of the position the user RESTORED — what the row means.
`AlarmLatchTest.undoKeepsItsOwnUserRow` commits a ply before latching the alarm and fails under the
old order, alone among the 20 tests in that class. That is why it survived so long:
`undoClearsAlarmLatch` runs on an engine with no history, where the pop-and-trim block is skipped
and the row is never in the trim's way. Full Android gate green with `--rerun-tasks`.

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

## The open question — ANSWERED 2026-08-02, and not in the direction the pack expected

**Should a recovery be allowed to commit more than one move? Yes. `recoveryMaxPlies = 4` stays.**

Closed by the user, not by a count: fast move sequences genuinely happen — several plies between two
usable CNN observations — so a multi-move bridge is a **requirement**, not a tolerated weakness.
Anything that bounds the sequence length or makes a legitimate 3–4 ply bridge harder to commit is
wrong. Phase 03 is written to that constraint: its veto is keyed to one specific line a human
rejected and cannot fire on a line that was never rejected.

The pack's instinct — "do not change the commit rule on one bad game" — was right for the wrong
reason. The rule did not need measuring; the *trigger* did.

## What the first night of per-move rows actually measured

Phase 00 made the shape readable and it was not a length problem. It was a loop: `undo` moves the
app's position, the CNN reads the board, the board is unchanged by an undo, so the identical bridge
is re-derived and re-committed on the next observation. See phase 03 for the trace.

Two candidate corroboration levers were examined against the same log and **both are refuted**:

- `best = -3.12` on every recovery row is not the pixels arguing against the sequence. It is
  `bestScore` from the last `tryDetect`, and `Hypothesis.noSingleFitsGate` fires on `best < 0.0` —
  which is the branch that marks the tracker stuck, which is the recovery's own trigger. A negative
  `best` is a PRECONDITION of a recovery, not evidence against it.
- `motion = 0.0000` is a tautology: `cnnTick` evaluates only on a stable or stuck board. A
  legitimate fast sequence settles before it is read, too.

Nothing measured so far separates "the diff is poor because several real moves happened" from "the
diff is poor because this bridge is fiction". That remains open, and it is the valuable question.

## Opened by 03, not fixed

**Phase 01's bridge-sized undo is spent by the next commit.** `lastCommitSize` is overwritten by
whatever commits on top of a bridge, so once an ordinary move has landed the bridge comes back one
press per ply again — which is exactly what the live log's descending plies 103, 102, 101 are. Phase
03's take-back line accumulates across consecutive presses for that reason, so the veto spans it;
the number of presses does not shrink. Making `undo` itself walk further back is a history-walk
feature with its own UI and is not this pack's call.

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
