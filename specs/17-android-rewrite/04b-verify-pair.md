# Phase 04b — pair CNN verify (`_verify_pair_tick`)

> Module `:core-engine`, package `com.chesslab.engine`. Reference:
> `src/chesslab/move_tracker/tracker.py::_verify_pair_tick` `:2306-2399`, plus
> `specs/16-android-correctness-parity/00-pair-verify.md` for the WHY.
> Runs in parallel with 04a and 04c — file ownership is strictly disjoint.

## Files you own

| File | Contains |
|---|---|
| `android/core-engine/src/main/kotlin/com/chesslab/engine/VerifyPair.kt` | the `_verify_pair_tick` state machine |
| `android/core-engine/src/test/kotlin/com/chesslab/engine/VerifyPairTest.kt` | tests |
| `android/core-engine/src/test/kotlin/com/chesslab/engine/VerifyPairFixtures.kt` | fakes for THIS test class only |

You own **nothing else**. `VerifyVerdict.kt`, `PendingVote.kt`, `VerifySingle.kt`,
`api/CnnObservation.kt` belong to 04a; `EngineState.kt` to 03a; `CnnTick.kt`/`Alarm.kt`/
`ObserverSchedule.kt` to 04c. If a type you need is missing at compile time, code against
the signature quoted here and record it in `STATUS.md` — the orchestrator reconciles.

## Why

A pair candidate ("fast play": half-move + reply detected as one diff) used to be verified
all-or-nothing on a whole-board `after.match`. **One** chronically misread confident square
anywhere — the known dark-square bB false positive — makes `before` *and* `after`
unmatchable: the candidate burns the full 8-frame window, is discarded, the diff evidence
re-fires an identical candidate, and the user watches `checking double move… (n/8)`
forever. Python fixed this on 2026-07-21 (`tracker.py:2310-2329`); the rewrite ports the
fixed version directly. The governing insight: **a conflict that already existed against
the CURRENT position cannot discriminate between "move happened" and "move did not
happen"** — so it must not veto.

## Design (decided — do not redesign)

### Entry

Called from `VerifySingle.tick` at `tracker.py:2123` when `pendMoves.size > 1`. Every
guard upstream of that line (fen identity, alarm discard, `snap.seq < pending.seq`,
CNN-unavailable fallback commit) has already run in 04a — **do not repeat them**.

```kotlin
internal object VerifyPair {
    fun tick(state: EngineState, cnn: CnnEvaluator, moves: List<Move>,
             boardSnap: Board, snap: CnnSnapshot, obs: CnnObservation): List<TrackerEvent>
}
```

### Computation (`:2331-2348`), all on `boardSnap`, before any state mutation

```
before      = cnn.resyncCheck(boardSnap, obs)                  // vs the CURRENT position
afterBoard  = boardSnap.clone(); moves.forEach { afterBoard.push(it) }
after       = cnn.resyncCheck(afterBoard, obs)                 // vs the position after BOTH half-moves

// touched-squares fast-accept — the local axis, immune to stale misreads elsewhere
touched     = cnn.moveTouchedSquares(boardSnap, moves[0])
midBoard    = boardSnap.clone(); midBoard.push(moves[0])
touched    += cnn.moveTouchedSquares(midBoard, moves[1])       // second half on the MID board
conf        = obs.confident(cnn.confThr)
expAfter    = cnn.expectedOccupancy(afterBoard)
checked     = touched.filter { conf[it] == true }
pairAgree   = if (checked.size >= 3)
                  checked.count { obs.occupied(it) == expAfter[it] }.toDouble() / checked.size
              else 0.0
nConf       = conf.count { it.value }
key         = moves.joinToString(" ") { it.uci() }             // for notes
```

Three details that are easy to get wrong and are load-bearing:

- The **second** half-move's touched squares are computed on the **mid** board
  (`:2339-2341`) — castling/en-passant/capture of the reply depend on the position after
  the first half-move.
- `pairAgree` is **0.0 below 3 checked squares** (`:2346`), not "the fraction of what we
  have". Two lucky squares must never reach `minAgreement`.
- `nConf` is the **whole-board** confident count, `checked` is the **touched** confident
  subset. They gate different things and are not interchangeable.

### State update (`:2349-2353`)

`cnnAgreement = after.agreement`; if `pending` identity or `board.fen != pending.fen`
changed → return empty; `pending.frames++`.

### The ladder — order is binding

1. **Shadow** `:2369` — `before.match && nConf >= cnn.minConfidentBoard`.
   Vote key `"shadow"` via `pendingVoted(…, config.verifyObsVotes)` (04a). On the vote:
   `pending = null`, `confirmer.reset()`, `recoveryConfirmer.reset()`, `clearStuck()`,
   `setRef(pending.cur, pending.curBgr, fromCommit = true)`, `verifyState = "shadow"`,
   `cnnStatus = "shadow"`, `cnnConflicts = []`,
   note `"Shadow/no move (CNN: board unchanged)"`.
   The `minConfidentBoard` guard is the **blind-glance protection**: with a hand over the
   board `resyncCheck` matches *vacuously*; without the guard a near-blind glance would
   reject a real pair and re-anchor the reference on the covered image.
2. **Commit** `:2380` —
   `(after.match && nConf >= cnn.minConfidentBoard) || pairAgree >= cnn.minAgreement`.
   Vote key `"commit"`. On the vote: `cnnStatus = "ok"`, `cnnConflicts = []`,
   `commitSequence(moves, pending.cur, pending.curBgr, decider = "cnn_pair")`,
   `verifyState = "confirmed"`.
   The second disjunct is the fast-accept: the 3-4 squares the pair physically changes
   read correctly, so a chronic misread on c6 is irrelevant.
3. **Window end** `:2385`, when `pending.frames >= config.verifyWindow` (8) — **not**
   vote-gated (the window is the damping), matching Python:
   - `checked.isNotEmpty() && after.conflicts.toSet() ⊆ before.conflicts.toSet()` →
     **commit** with decider `"diff_after_verify"`, then overwrite the note with
     `"Double move $key accepted (CNN conflicts pre-existed the candidate)"`.
     Every post-move conflict already existed against the current position → the misread
     is chronic and cannot discriminate → the diff evidence stands.
   - `checked.isEmpty()` → discard, `verifyState = cnnStatus = "ghost"`,
     note `"Verification timed out under occlusion — no move committed"`.
     No touched square was **ever** readable → never auto-accept under a covering hand.
   - else → discard with `after.conflicts` as `cnnConflicts`, note
     `"Double move $key not confirmed by CNN — discarded"`.
   Discard = `pending = null`, `confirmer.reset()`, `recoveryConfirmer.reset()`
   (`:2355-2361`).
4. Below the window `:2397` — note
   `"checking double move $key via CNN… (${pending.frames}/${config.verifyWindow})"`.

### Required `EngineState` fields (owned & FROZEN by 03a)

Same set 04a needs; the pair path additionally requires
`commitSequence(moves, cur, curBgr, decider)` (`tracker.py:2401`, owned by 03d) and
`setRef(gray, bgr, fromCommit)`. Missing → **STOP** and record a blocker; do not add
fields to `EngineState.kt` yourself.

## Steps

### 1. `VerifyPair.kt` — commit `feat(android-engine): port _verify_pair_tick — touched-squares fast-accept + pre-existing-conflict fallback`

### 2. Tests — commit `test(android-engine): pair verify — fast-accept, parity fallback, occlusion timeout, blind glance`

## Tests

`VerifyPairTest` in `com.chesslab.engine`; fakes in `VerifyPairFixtures.kt` (own file —
`:core-engine` cannot depend on `:core-cnn`, so implement `CnnObservation`/`CnnEvaluator`
by hand, mirroring `_FakeObs` `tests/test_move_tracker.py:919` and `_FakeRecovery` `:932`).
Use the phase-00b golden fixtures under `core-engine/src/test/resources/parity/` where a
recorded observation exists.

Mirror `tests/test_move_tracker.py::TestPipelineRegressions` (`:1259-1379`):

| Kotlin test | Python | Guards |
|---|---|---|
| `pairVerifyCommitsOnAfterMatch` | `test_pair_verify_commits_on_after_match:1295` | rung 2, whole-board disjunct |
| `pairVerifyRejectsShadow` | `test_pair_verify_rejects_shadow:1313` | rung 1 |
| `pairTouchedSquaresFastAccept` | `test_pair_touched_squares_fast_accept:1323` | chronic misread on c6, touched squares correct → commit despite whole-board mismatch |
| `pairWindowEndPreexistingConflictsCommit` | `test_pair_window_end_preexisting_conflicts_commit:1339` | `after.conflicts ⊆ before.conflicts` → `diff_after_verify` |
| `pairWindowEndOccludedDiscards` | `test_pair_window_end_occluded_discards:1353` | `checked` empty → timeout, never auto-accept |
| `pairBlindGlanceNeverShadowRejects` | `test_pair_blind_glance_never_shadow_rejects:1366` | `nConf >= minConfidentBoard` guard |
| `pairFastAcceptNeedsThreeCheckedSquares` | `:2346` (`len(checked) >= 3`) | 2 matching squares → `pairAgree == 0.0` → no commit |
| `pairSecondHalfTouchedOnMidBoard` | `:2339-2341` | reply's capture/castling squares are counted |
| `pairTerminalsNeedTwoGlances` | `_pending_voted:2290` | invariant 13 — first glance `Hold`, second identical glance the terminal; window-end terminals are NOT vote-gated |

Run once, scoped:
`.\gradlew.bat :core-engine:test --tests "com.chesslab.engine.VerifyPairTest"`

## Acceptance criteria

- `grep -n "pairAgree" android/core-engine/src/main/kotlin/com/chesslab/engine/VerifyPair.kt` hits.
- `grep -n "minConfidentBoard" android/core-engine/src/main/kotlin/com/chesslab/engine/VerifyPair.kt`
  hits ≥ 2 (shadow rung + commit rung).
- `grep -n "cnn_pair\|diff_after_verify" android/core-engine/src/main/kotlin/com/chesslab/engine/VerifyPair.kt`
  hits both deciders.
- `grep -n "pendingVoted" .../VerifyPair.kt` hits exactly 2 (shadow, commit) and none in
  the window-end block.
- All 9 tests green; `:core-engine:ktlintFormat` then `:core-engine:detekt` clean.
- `STATUS.md` row `done`.

## Do NOT

- Do NOT re-implement the upstream guards (fen, alarm, seq, CNN-unavailable fallback) —
  04a owns them; duplicating them changes behaviour when they drift.
- Do NOT compute the second half-move's touched squares on `boardSnap`.
- Do NOT let `pairAgree` be a fraction below 3 checked squares.
- Do NOT drop the `minConfidentBoard` guard from either the shadow or the whole-board
  commit disjunct — that is the blind-glance hole.
- Do NOT vote-gate the window-end terminals (Python does not; the window is the damping).
- Do NOT touch `VerifySingle.kt`, `VerifyVerdict.kt`, `PendingVote.kt`, `EngineState.kt`,
  `CnnTick.kt`, `Alarm.kt`, `ObserverSchedule.kt` or `:core-cnn`.
- Do NOT add `synchronized`/`Atomic*`/`@Volatile` (entry.md hard rule 2).
- Do NOT read `android-legacy/**` for logic — its `evaluatePair` is the broken version.
