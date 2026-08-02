# 37 — A way back

> **Status:** `todo`. Three phases. 00 first — it is what makes the other two measurable. 01 and 02
> are independent of each other.

## The incident

Live game, 2026-08-02, read out of the phone's decision log. Committed plies:

```
… 43  44  45      49        50        50        52        52        56
                  ↑ recovery ↑ recovery ↑ recovery ↑ recovery ↑ recovery
```

Ply 45 → 49 is a four-move jump. Ply 50 is committed **twice, with two different moves** (`Kb8`,
then `Bd4`). Ply 52 is committed twice with the same move. The last committed move at ply 49 is
`e1f3 (Nf3)` — the king was on d1 and there was no knight on e1.

It ends at ply 56 in `1k6/2p3pp/2r2p2/P2n4/2bb4/8/6PP/3K3R w` — two black bishops on c4 and d4, a
rook on c6 — alternating `no_legal_move` and `cnn_desync` forever. And on every one of those
rejection rows: **`cnnAgree=0.980`**.

The user's words: *"wenn etwas async wird fängt das spiel an plötzlich ewigweit weg zu rennen, ich
habe keine Chance wieder zum Spielstate zurückzukommen."*

## Three defects, and they compound

### 1. A recovery commits a SEQUENCE and reports one move

`commitRecovery` (`CnnTick.kt:250`) takes `moves: List<Move>`, pushes every one onto the board,
appends every SAN to `history` — and calls `recordDecision(moves.last(), …)`. One row for N moves.

That is why the plies jump, and why three of the four moves in the ply-45→49 bridge exist nowhere in
the log. The tracker rewrote four plies of a game and left one line about it.

### 2. It cannot be caught by the check that follows it

After committing, `commitRecovery` sets `cnnStatus = CNN_STATUS_OK`, empties `cnnConflicts`, calls
`clearStuck()` and `clearAlarm(null)`, and resets the confirmer. The next frame's agreement is then
measured against a position **built from the CNN** — so `cnnAgree` reads 0.98 against a fantasy
board. The check that exists to catch a wrong position is structurally unable to, because it
compares the CNN with a position derived from the CNN.

The one real guard, `resolvesAlarmConflicts` (`:236`), is good — it demands that every latched
conflict square read as the sequence predicts, and refuses outright without an identity axis. But it
only runs **when an alarm is already latched** (`:222`). With no alarm, a multi-move sequence commits
on the confirmer alone.

And the confirmer tests the wrong thing. Its own comment says so honestly (`:213-214`): the legacy
port pushed a sequence "on ONE glance", and the confirmer was added to make it "multi-observation
evidence". But repeating an observation measures **stability, not truth** — and a stable wrong read
is exactly what a domain gap produces. Seeing the same wrong sequence five times confirms that it is
the same, not that it is right.

### 3. It cannot be undone

`undo()` (`api/TrackerEngine.kt:214`) pops **one** move: `board.pop()`, one `history` entry. A
recovery that pushed four needs four presses, and nothing anywhere says how many. Each press also
clears the reference and the alarm, so the state after each is not the state before the sequence.

There is no other way back. `acceptCnnPosition` adopts a CNN reading — the same source that produced
the problem. `Reset game` throws the game away.

## What this pack does, and what it deliberately does not

**Does:** make a recovery *visible* (00), make it *reversible* (01), and give the user an honest way
to re-anchor on the real board *without inventing history* (02).

**Does not: bound the sequence length, or change when a recovery fires.** That is the deepest defect
and the tempting fix — "one move or nothing" — and there is no evidence for it yet. Nobody knows how
often multi-move recoveries are *right*; the mechanism exists because a hand over the board really
does hide two plies, and refusing those would trade a loud failure for a silent stall. Phase 00 is
what makes that measurable: with a row per move, a week of logs answers it. **Do not change the
commit rule on the strength of one bad game.** This project has a standing rule that a conclusion
drawn from a single run is not a result.

> **Settled 2026-08-02, and the caution was aimed at the wrong thing.** `recoveryMaxPlies = 4`
> **stays** — the user needs multi-ply bridges, so the length was never the defect. The first night
> of phase 00's rows showed a LOOP instead: `undo` moves the app's position, the CNN reads the board,
> the board is unchanged by an undo, so the identical bridge comes straight back. Phase 03 was added
> for it. See `STATUS.md`.

## Ownership

| Phase | Owns |
|---|---|
| **00** | `core-engine/CnnTick.kt` (`commitRecovery` only), `core-engine/DecisionLog.kt`, its tests |
| **01** | `core-engine/api/TrackerEngine.kt` (`undo` only), `core-engine/EngineState.kt`, its tests |
| **02** | `core-engine/api/TrackerEngine.kt` (new action), `service/EngineAction.kt`, `service/TrackerBinder.kt`, `ui/tracking/**` |
| **03** | `core-engine/TakenBack.kt`, `Game.kt` (`pop`), `EngineState.kt`, `Commit.kt` (`finishCommit`), `CnnTick.kt` (`onRecovery`/`commitRecovery`), `api/TrackerEngine.kt` (`undo`/`setFen`/`captureBaseline`), its tests. Added after the fact — see `03-…md`. |

## Protocol

- `:core-engine` may depend only on chesslib and the Kotlin stdlib; single-threaded; no wall clock.
  `ClasspathPurityTest.kt:25` bans `\bsynchronized\b|\bAtomic[A-Z]|\bMutex\b|@Volatile` by regex and
  must pass unchanged.
- `android/**/bin/` is a stale gitignored copy. Exclude it from every grep; never edit a file there.
- Gate: `gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest :core-engine:test
  :core-geometry:test --rerun-tasks`. Gradle reports green on stale tasks; the flag is not optional.
- Restructure to satisfy detekt. Never `@Suppress`, never a baseline entry.
- **This pack changes engine runtime behaviour.** Every phase must state what it does to a game that
  is currently running, and every change must be covered by a test that fails without it.
