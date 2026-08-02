# 03 — An undo the recovery can hear

> **State:** `done`. Owns `core-engine/TakenBack.kt` (new), `core-engine/Game.kt` (`pop` only),
> `core-engine/EngineState.kt`, `core-engine/Commit.kt` (`finishCommit` only),
> `core-engine/CnnTick.kt` (`onRecovery`/`commitRecovery` only),
> `core-engine/api/TrackerEngine.kt` (`undo`, `setFen`, `captureBaseline`) and their tests.
> No `ui/` file was touched. Written after the fact — this phase was implemented from the live
> evidence below, not planned from the entry.

## The evidence

Read out of the phone's decision log on 2026-08-02, the first night phase 00's per-move rows existed
— which is the only reason the shape was visible at all:

```
ply 100  Kc4    by=cnn_recovery  [move 1/3 of recovery b5c4 a3c5 c4c5]  best=-3.12  motion=0.0000
ply 101  Bc5    by=cnn_recovery  [move 2/3 of recovery b5c4 a3c5 c4c5]  best=-3.12  motion=0.0000
ply 102  Kxc5   by=cnn_recovery  [move 3/3 of recovery b5c4 a3c5 c4c5]  best=-3.12  motion=0.0000
ply 103  a3     by=cnn_occupancy
   … rejections at descending plies 103, 102, 101 …
ply 100  Kc4    …  ← the same bridge again
ply 100  Kc4    …  ← and a third time
```

13 of 21 commits that session were `cnn_recovery`. The user: *"I tried to recover but it's
impossible."*

## What actually drove it

**The undo-loop hypothesis holds, and the code says so without ambiguity.**

`TrackerEngine.undo` is the only thing in the engine that SHORTENS `history` while leaving the
earlier rows in place — `setFen` is the only other writer and it clears the whole list, which would
restart the plies at 1. Descending rejection plies are therefore Undo presses and nothing else. A
re-anchor commits no move, an alarm cycle commits no move, and a restart would not land back on
ply 100.

The loop itself:

1. `undo` pops the plies and restores the earlier FEN. It records **nothing** about what it popped.
2. The next observation runs `cnnTick` against that restored FEN. `deriveMovesDeep` is a pure
   function of `(fen, observation)` — and an undo moves the APP's position while the CNN reads the
   BOARD, which an undo does not move.
3. Same question, same answer: the identical bridge is derived, `recoveryConfirmer` re-confirms it
   (its streak is reset by `clearStuck` inside `undo`, so it simply re-earns it), and
   `commitRecovery` pushes it back on.

No number of presses could win, because nothing in the recovery path could tell that a human had
just rejected exactly this. That is the whole defect.

**A second finding, not fixed here.** Phase 01's bridge-sized undo is spent by the next commit:
`lastCommitSize` is overwritten by whatever commits on top. In the log a `cnn_occupancy` move landed
at ply 103, so the three-ply bridge underneath it came back one press per ply again — which is
exactly what the three descending rejection plies are. The take-back record below is built to
accumulate across consecutive presses precisely because of this; making `undo` itself span it is a
history-walk feature and a different phase.

## What was rejected, and why

The two corroboration levers were considered and **both are refuted by the same reading**:

- **"do not commit against negative frame-diff evidence."** `best` is `EngineState.bestScore`, the
  best single-move log-likelihood from the last `tryDetect` against a reference that is several
  plies old. `Hypothesis.noSingleFitsGate` fires on literally `moves.obsMove == null || moves.best <
  0.0` and its branch is `markStuck(STUCK_NO_LEGAL_MOVE)` — which is the recovery's own trigger. A
  negative `best` is therefore a **precondition** of a recovery running at all, not evidence against
  the sequence it derived. The lever would have disabled the feature while looking like a hardening.
- **"do not commit while nothing is moving."** `cnnTick` evaluates only when the board is stable or
  stuck, and `state.motion` is per-frame motion. `motion = 0.0000` on a recovery row is a tautology
  of when the evaluation is allowed to happen. A legitimate fast sequence also settles before it is
  read.

Neither number distinguishes "the diff is poor because several real moves happened" from "the diff
is poor because this bridge is fiction". **Nothing measured tonight does.** Said plainly rather than
traded for a threshold.

Nothing here bounds `recoveryMaxPlies` or makes a 3–4 ply bridge harder to commit. The veto is keyed
to one specific rejected line and cannot fire on a line that was never rejected.

## What shipped

`EngineState.takenBack` — the ONLY thing in the engine that remembers a human rejection.
`undo` records the line it popped and the position it popped back TO; `onRecovery` refuses a derived
sequence that is that line or a leading part of it, from that same position.

- **`Game.pop()` returns the undone `Move`.** chesslib already carries it on its own backup stack, so
  the line is read off the board rather than remembered in a second place that could drift. SAN is
  position-relative and useless as a key.
- **The line accumulates over consecutive presses** (see the second finding above). A press that does
  not continue where the last one stopped replaces the line instead of extending it.
- **Prefix, not exact match**: the user unwinds more than the recovery re-derives — four popped plies
  against a three-ply bridge in the incident. A sequence that starts with the rejected line and then
  continues differently is new evidence and is let through.
- **It ends** on any commit (`finishCommit`, `commitRecovery`), on `setFen` and on `captureBaseline`.

## What this does to a game that is currently working

Nothing, until the user presses Undo. A bridge that was never taken back commits exactly as before —
same confirmer, same anchoring, same rows.

**The cost, stated plainly.** If a *legitimate* bridge is undone by mistake, the recovery will not
re-offer it, and the deterministic channel cannot commit it either (the board is plies ahead of the
game state — that is why the recovery ran). The tracker then **stalls instead of running away**. That
is only better because it is loud and has a door: the note names the moves and the way out —
`CNN recovery would replay the moves you just took back (…) — holding. Play on, or press "New
baseline" if the board is right.` The alarm/desync escalation is untouched, so `acceptCnnPosition`
and a FEN resync remain available.

## Tests

`core-engine/src/test/kotlin/com/chesslab/engine/TakenBackTest.kt`. Three of the six fail with the
veto disabled and the change otherwise in place — verified, not assumed:

- the incident: bridge → undo → same observation → not re-committed, note names a way out;
- the incident's real shape: a move on top of the bridge, four one-ply presses, still vetoed
  (this is the one that fails without the accumulation);
- **a different line from the same position still commits** — the guarantee that a legitimate fast
  bridge is untouched;
- `captureBaseline` and `setFen` release it;
- a take-back that does not continue the last one replaces the line rather than growing a tail.

## Gate

`gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest :core-engine:test
:core-geometry:test --rerun-tasks` — BUILD SUCCESSFUL. `:core-engine:ktlintCheck` green.
`:core-engine:detekt` still red on the two pre-existing `MagicNumber` hits in
`DecisionLog.toLogLine` and on nothing else.
