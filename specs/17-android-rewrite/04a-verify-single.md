# Phase 04a — single-move CNN verify (`_verify_tick`)

> Module `:core-engine`, package `com.chesslab.engine`. Reference:
> `src/chesslab/move_tracker/tracker.py::_verify_tick` `:2078-2283` and
> `::_pending_voted` `:2290-2304`. Read both before writing a line of Kotlin.
> Runs in parallel with 04b and 04c — file ownership is strictly disjoint.

## Files you own

| File | Contains |
|---|---|
| `android/core-engine/src/main/kotlin/com/chesslab/engine/api/CnnObservation.kt` | the engine-side CNN seam (interfaces + result records) — **fallback owner**, see below |
| `android/core-engine/src/main/kotlin/com/chesslab/engine/VerifyVerdict.kt` | the verdict type — **must carry a replacement move** |
| `android/core-engine/src/main/kotlin/com/chesslab/engine/PendingVote.kt` | `_pending_voted` — the multi-glance vote |
| `android/core-engine/src/main/kotlin/com/chesslab/engine/VerifySingle.kt` | the `_verify_tick` state machine |
| `android/core-engine/src/test/kotlin/com/chesslab/engine/VerifySingleTest.kt` | tests |
| `android/core-engine/src/test/kotlin/com/chesslab/engine/VerifySingleFixtures.kt` | fakes for THIS test class only |

You own **nothing else**. `EngineState.kt` (03a), `Dispatch.kt`/`Commit.kt` (03d),
`VerifyPair.kt` (04b), `CnnTick.kt`/`Alarm.kt`/`ObserverSchedule.kt` (04c) are foreign.

## Why

`specs/12-android-parity/STATUS.md` **D3**: the legacy `VerifyVerdict` was a
For/Against/Timeout enum with no payload, so Python's `cnn_overrule` (`tracker.py:2241`)
could not be expressed — the CNN's move was dropped and the real move landed a cycle
late. entry.md invariant **10** makes the replacement move part of the verdict type.

The rest of `_verify_tick` is the pre-commit ghost filter: five occupancy signals, a
five-rung decision ladder, every terminal gated by `verifyObsVotes` consecutive
identical glances (invariant **13**). Each rung encodes a named live incident
(b1c4, d4b3, g8h6, h2h4). Port them all; none is optional.

## Design (decided — do not redesign)

### The CNN seam (`api/CnnObservation.kt`)

`:core-engine` must not depend on `:core-cnn` (the dependency runs the other way). The
engine therefore consumes the observation model through interfaces it declares itself;
`:core-cnn` (phase 02c) implements them, `:app` injects the implementation.

**Fallback ownership:** if `api/CnnObservation.kt` already exists (created by 02c), use
it unchanged and record the fact in `STATUS.md`. If it does not exist, **you** create it
exactly as below. 04b and 04c must NOT create it — they code against this signature and
the orchestrator reconciles.

```kotlin
package com.chesslab.engine.api

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.Move

/** cnn_recovery.OccupancyObservation, engine-side. */
interface CnnObservation {
    fun occupied(sq: String): Boolean                       // p_occ > p_empty
    fun confident(thr: Double): Map<String, Boolean>        // OccupancyObservation.confident
    fun labelConfident(thr: Double): Map<String, Boolean>   // OccupancyObservation.label_confident
    val label: Map<String, String>?
    val conf: Map<String, Double>?
    /** identity stripped — p_occ/p_empty/p_occluded only (tracker.py:1913-1915). */
    fun occupancyOnly(): CnnObservation
}

data class ResyncResult(val match: Boolean, val conflicts: List<String>,
                        val move: String?, val agreement: Double)
data class IdentityResult(val match: Boolean, val conflicts: List<String>,
                          val n: Int, val inconclusive: Boolean)
data class DeriveResult(val moves: List<Move>, val best: Double, val second: Double)

/** cnn_recovery.CnnRecovery's PURE half. `observe` stays in :app/:core-cnn. */
interface CnnEvaluator {
    val confThr: Double                 // cnn_recovery.py:132
    val minAgreement: Double            // :133
    val minConfidentBoard: Int          // :142
    val minConfidentRecovery: Int       // :143
    fun verifyMove(board: Board, move: Move, obs: CnnObservation): Pair<Double, Int>  // :188
    fun resyncCheck(board: Board, obs: CnnObservation): ResyncResult                  // :386
    fun boardMatchesIdentity(board: Board, obs: CnnObservation): IdentityResult       // :216
    fun deriveMovesDeep(board: Board, obs: CnnObservation, maxPlies: Int): DeriveResult // :285
    fun hasOccupancyConflict(board: Board, obs: CnnObservation,
                             confThr: Double, conflicts: List<String>): Boolean       // :401
    fun guessIllegalMove(board: Board, obs: CnnObservation, confThr: Double): String? // :415
    fun expectedOccupancy(board: Board): Map<String, Boolean>                         // :103
    fun expectedLabels(board: Board): Map<String, String>                             // :108
    fun moveTouchedSquares(board: Board, move: Move): Set<String>                     // :87
}
```

`CnnSnapshot.obs: Any` (entry.md) is cast to `CnnObservation` at exactly one place —
`ObserverSchedule` (04c). Everything downstream sees the interface.

### `VerifyVerdict.kt`

```kotlin
internal sealed interface VerifyVerdict {
    /** No terminal this glance (vote not yet reached / window still open). */
    data object Hold : VerifyVerdict
    /** Occupancy says the board never changed: drop candidate + re-anchor on pending.cur. */
    data object Shadow : VerifyVerdict
    /** Discard the candidate; base truth stays. */
    data class Reject(val state: String, val status: String,
                      val note: String, val conflicts: List<String> = emptyList()) : VerifyVerdict
    /**
     * Commit. `move == null` → commit the pending candidate as-is.
     * `move != null` → CNN OVERRULE: commit THIS move instead (tracker.py:2241,
     * entry.md invariant 10, legacy D3). The field exists for exactly that reason —
     * do not collapse it back into a payload-free enum.
     */
    data class Commit(val move: Move?, val decider: String,
                      val state: String, val noteSuffix: String) : VerifyVerdict
}
```

### `PendingVote.kt` — `_pending_voted` (`tracker.py:2290-2304`)

```kotlin
internal fun EngineState.pendingVoted(outcome: String, votesNeeded: Int): Boolean
```

Exactly Python: if `pending.voteOutcome == outcome` → `voteCount++`, else
`voteOutcome = outcome; voteCount = 1`. Return `true` when `voteCount >= votesNeeded`
(`config.verifyObsVotes`, default 2). Otherwise set
`note = "verify: $outcome? confirming ($voteCount/$votesNeeded)"` and return `false`.
The outcome key for an overrule is `"overrule:$cnnUci"` (`:2242`) — a different CNN move
must reset the count, so the uci is part of the key. Do **not** dedupe it away.

**Required `EngineState` fields (owned & FROZEN by 03a).** If `PendingCandidate` does not
declare these, STOP and record a blocker in `STATUS.md` — do not add them yourself:
`ucis: List<String>`, `uci: String`, `fen: String`, `cur: GrayImage`, `curBgr: BgrImage?`,
`var frames: Int`, `priorUsed: Boolean`, `seq: Long`, `var voteOutcome: String?`,
`var voteCount: Int` (`tracker.py:3341-3343` + `:2296-2299`). On `EngineState`:
`pending: PendingCandidate?`, `alarm: AlarmState?`, `board`, `verifyState: String?`,
`cnnStatus: String?`, `cnnConflicts: List<String>`, `cnnAgreement: Double`,
`cnnBestMove: String?`, `confirmer`, `recoveryConfirmer`, `note: String?`.

### `VerifySingle.kt` — the state machine

```kotlin
internal object VerifySingle {
    /** snap == null → CNN unavailable / observation failed (tracker.py:2107, :2115). */
    fun tick(state: EngineState, cnn: CnnEvaluator?, snap: CnnSnapshot?): List<TrackerEvent>
}
```

Order of operations, 1:1 with `tracker.py`:

1. `:2096` — `pending == null || board.fen != pending.fen` → return empty.
2. `:2098` — `alarm != null` → `pending = null`, `confirmer.reset()`,
   note `"board desynced (ILLEGAL MOVE alarm) — pending candidate discarded"`, return.
   A candidate decided against a desynced board is fiction (entry.md invariant 9).
3. `:2104` — `boardSnap = board.clone()` (all evaluation runs on the snapshot, never on
   the live board).
4. `:2105` — `pendMoves = pending.ucis.map(::Move)`.
5. `:2107` — **`cnn == null` → fallback commit.** Re-check `pending`/fen identity, then
   `commitMove(pendMoves[0], …)` or `commitSequence(pendMoves, …)`. Return. The tracker
   must not stall when the CNN is missing.
6. `:2115` — `snap == null` → return (the next observation retries).
7. `:2117` — **`snap.seq < pending.seq` → return.** Spec-11 seq contract: an observation
   of a frame OLDER than the frame the candidate was decided on may neither confirm nor
   reject it. Not a Reject, not a vote — a plain ignore.
8. `:2123` — `pendMoves.size > 1` → delegate to `VerifyPair.tick(...)` (04b), return.

Then the five signals (`:2130-2151`) — comment each one with WHY:

```
occAgree, occN = cnn.verifyMove(boardSnap, pendMv, obs)   // LOCAL, touched squares only
occCheck       = cnn.resyncCheck(boardSnap, obs)          // WHOLE board vs CURRENT position
conf           = obs.confident(cnn.confThr)
isCapture      = boardSnap.isCapture(pendMv)
toEmptyConf    = conf[to]   && !obs.occupied(to)                  // reliable AGAINST
fromLeftConf   = conf[from] && !obs.occupied(from)                // reliable FOR
toArrivedConf  = conf[to]   &&  obs.occupied(to) && !isCapture    // decent FOR
fromOccConf    = conf[from] &&  obs.occupied(from)                // UNRELIABLE — never a hard reject
cnnUci         = occCheck.move
cnnAgreement   = occCheck.agreement
```

The asymmetry is the whole point: the model is ~99.99% on `empty` and far weaker on
`occupied`, so *confidently empty* is evidence and *confidently occupied* is only a
withholding signal.

Then, under the state re-check (`:2153-2158`): set `cnnAgreement = occAgree`,
`cnnBestMove = cnnUci`; if `pending` identity or fen changed → return; `pending.frames++`.

**The ladder** (each terminal calls `pendingVoted(outcome, config.verifyObsVotes)` first
and returns `Hold` when the vote is not reached):

1. **Shadow** `:2187` — `occCheck.match && conf.count { it.value } >= cnn.minConfidentBoard`.
   Vote key `"shadow"`. → `clearStuck()`, `setRef(pending.cur, pending.curBgr, fromCommit = true)`,
   drop candidate, `verifyState = "shadow"`, `cnnStatus = "shadow"`,
   note `"Shadow/no move (CNN: board unchanged)"`.
   The `minConfidentBoard` guard is the **blind-glance protection**: `resyncCheck` matches
   *vacuously* when a hand covers the board; without the guard a near-blind glance would
   reject a real move and re-anchor the reference on the covered image.
2. **Commit** `:2210-2227`. Vote key `"commit"`.
   ```
   isCastling  = boardSnap.isCastling(pendMv)
   fromLeftOk  = fromLeftConf && (isCastling ||
                                  (cnnUci == pending.uci && cnnAgreement >= cnn.minAgreement))
   toArrivedOk = toArrivedConf && !fromOccConf
   if (fromLeftOk || toArrivedOk || (occAgree >= cnn.minAgreement && occN >= 2))
   ```
   - **"piece left FROM" alone is NEVER commit evidence** (`:2199-2209`, the b1c4 +
     h2h4-nudge incidents 2026-07-09: b1 confidently emptied while the knight sat
     illegally on c4, and from-left alone committed the best *legal* move Na3).
     Non-castling commits need positive DESTINATION evidence. Castling is the exception
     the clause exists for — the king on g1 is routinely misread as empty.
   - **`toArrivedOk` requires `!fromOccConf`** (`:2215-2222`, the d4b3 rook incident: a
     foreign piece landed on b3, `b2b3` was proposed, b3 read occupied and committed
     while the b2 pawn demonstrably never moved). Both signals contradicting → HOLD and
     let the window-end whole-board check decide.
   → `Commit(move = null, decider = "cnn_occupancy", state = "confirmed", noteSuffix = "")`,
   `cnnStatus = "ok"`, `cnnConflicts = []`.
3. **Ghost hard veto** `:2234` — `toEmptyConf && !fromLeftConf`. Vote key `"ghost"`.
   → `Reject("ghost", "ghost", "Ghost move rejected (CNN: $toSq still empty)", listOf(toSq))`.
   The `!fromLeftConf` clause protects castling (e1 empty, g1 misread empty) — that case
   already committed at rung 2. Only "nothing moved at all" is a ghost.
4. **CNN overrule** `:2241` — `cnnUci != null && cnnUci != pending.uci && cnnAgreement >= cnn.minAgreement`.
   Vote key `"overrule:$cnnUci"`.
   → `Commit(move = Move(cnnUci), decider = "cnn_overrule", state = "overruled",
   noteSuffix = "  (CNN overruled $oldSan)")` where `oldSan` is the SAN of the *pending*
   move computed **before** pushing. **This is the rung legacy D3 could not express.**
5. **Window end** `:2251`, when `pending.frames >= config.verifyWindow` (8) — these
   terminals are NOT vote-gated in Python (the window itself is the temporal damping;
   `_reject`/`_commit` are called directly). Keep it that way.
   - `fromOccConf && !toArrivedConf` →
     `Reject("ghost","ghost","Move not confirmed (CNN: $fromSq still occupied) — discarded", [fromSq])`.
   - `!(conf[to] || conf[from])` → occlusion timeout:
     `Reject("ghost","ghost","Verification timed out under occlusion — no move committed")`.
     **Never auto-accept under a hand** — this is the old hole that let a covering hand
     commit fiction.
   - else `:2270` — `afterBoard = boardSnap.clone().push(pendMv)`;
     `after = cnn.resyncCheck(afterBoard, obs)`. Any `after.conflicts` →
     `Reject("ghost","ghost","Move not confirmed (board contradicts post-move position: ${first4}) — discarded", after.conflicts)`
     (the b1d4 incident: endpoint-local reasoning never looked at the square the piece
     actually landed on). No conflicts →
     `Commit(null, decider = "diff_after_verify", state = "confirmed",
     noteSuffix = "  (CNN uncertain — diff accepted)")`.
   Below the window (`:2282`): note
   `"checking ${san} via CNN… (${pending.frames}/${config.verifyWindow})"`.

`Reject` always does: `pending = null`, `confirmer.reset()`, `recoveryConfirmer.reset()`,
`verifyState = state`, `cnnStatus/cnnConflicts`, `note` (`:2170-2176`).

### Anchoring — narrower than entry.md invariant 5

`_verify_tick` commits and re-anchors on **`pending.cur` / `pending.curBgr`** — the frame
the *diff* decided on (`:2164`, `:2191`) — **not** on `snap.gray/snap.warped`. entry.md
invariant 5 ("anchor on the frame the CNN looked at") applies to the **recovery** path
(`_cnn_tick`, 04c), not here. Python wins (entry.md protocol). Record this narrowing in
`STATUS.md`.

## Steps

### 1. `api/CnnObservation.kt` — commit `feat(android-engine): CNN observation seam for the engine (CnnObservation/CnnEvaluator)`
Only if 02c has not already created it. Interfaces + `ResyncResult`/`IdentityResult`/
`DeriveResult`. No implementation, no OpenCV, no Android.

### 2. `VerifyVerdict.kt` + `PendingVote.kt` — commit `feat(android-engine): verify verdict carries a replacement move + multi-glance vote`

### 3. `VerifySingle.kt` — commit `feat(android-engine): port _verify_tick — five signals, five-rung ladder, cnn_overrule`

### 4. Tests — commit `test(android-engine): single verify — b1c4, d4b3, overrule, occlusion timeout, blind glance`

## Tests

`VerifySingleTest` in `com.chesslab.engine`, fixtures in `VerifySingleFixtures.kt`
(own file — 04b/04c have their own; the orchestrator may de-dup later).
`:core-engine` cannot depend on `:core-cnn` (cycle), so build a `FakeObservation`
implementing `CnnObservation` and a `FakeEvaluator` implementing `CnnEvaluator` — mirror
`_FakeObs` (`tests/test_move_tracker.py:919`) and `_FakeRecovery` (`:932`). Use the
phase-00b golden fixtures under `core-engine/src/test/resources/parity/` wherever a
recorded observation exists; hand-build otherwise.

Mirror these scenarios from `tests/test_move_tracker.py::TestCnnVerify` (`:984-1206`),
keeping the names:

| Kotlin test | Python | Guards |
|---|---|---|
| `shadowSuppressedNoCommit` | `test_shadow_suppressed_no_commit:987` | rung 1 |
| `occupancyConfirmsCommit` | `test_occupancy_confirms_commit:997` | rung 2, occAgree path |
| `hardVetoRejectsGhostToStillEmpty` | `test_hard_veto_rejects_ghost_to_still_empty:1008` | rung 3 |
| `fromEmptyButToEmptyHoldsNonCastling` | `test_from_empty_but_to_empty_holds_non_castling:1021` | rung 2 vs 3 ordering |
| `fromLeftAloneNeverCommitsNonCastling` | `test_from_left_alone_never_commits_non_castling:1033` | **b1c4** |
| `fromLeftCommitsWhenOccupancyDerivesSameMove` | `test_from_left_commits_when_occupancy_derives_same_move:1049` | `cnnUci == pending.uci` clause |
| `castlingCommitsDespiteKingSquareMisreadEmpty` | `test_castling_commits_despite_king_square_misread_empty:1061` | `isCastling` clause |
| `fromOccupiedButArrivedCommitsAfterWindow` | `test_from_occupied_but_arrived_commits_after_window:1076` | window-end whole-board |
| `arrivedButOriginNeverEmptiedDiscards` | `test_arrived_but_origin_never_emptied_discards:1091` | **d4b3** |
| `alarmDiscardsPendingCandidate` | `test_alarm_discards_pending_candidate:1118` | step 2 |
| `fromOccupiedNoArrivalRejectsAfterWindow` | `test_from_occupied_no_arrival_rejects_after_window:1127` | window end |
| `counterMoveOverrules` | `test_counter_move_overrules:1139` + `TestCnnOverrule::test_cnn_overrules_diff_candidate:1971` | **rung 4 / invariant 10** |
| `occlusionTimesOutRejects` | `test_occlusion_times_out_rejects:1151` | never auto-accept under a hand |
| `fallbackRejectsWhenPostmoveBoardContradicts` | `test_fallback_rejects_when_postmove_board_contradicts:1164` | b1d4 |
| `clearviewBorderlineAcceptsAfterWindow` | `test_clearview_borderline_accepts_after_window:1179` | `diff_after_verify` |
| `cnnUnavailableCommitsPending` | `test_cnn_unavailable_commits_pending:1190` | step 5 |
| `staleObservationNeitherConfirmsNorRejects` | `TestSeqContract::test_verify_ignores_stale_observation:2798` | step 7 |
| `singleGlanceNeverDecides` | `_pending_voted:2290` (g8h6 incident) | invariant 13 — one glance produces `Hold`, the second identical glance the terminal; a differing glance resets the count |

Run once, scoped:
`.\gradlew.bat :core-engine:test --tests "com.chesslab.engine.VerifySingleTest"`

## Acceptance criteria

- `grep -n "cnn_overrule" android/core-engine/src/main/kotlin/com/chesslab/engine/VerifySingle.kt` hits.
- `grep -n "val move: Move?" android/core-engine/src/main/kotlin/com/chesslab/engine/VerifyVerdict.kt` hits
  (the verdict carries a replacement move — invariant 10).
- `grep -n "fromOccConf" android/core-engine/src/main/kotlin/com/chesslab/engine/VerifySingle.kt`
  hits ≥ 3 (definition, `toArrivedOk` guard, window-end ghost).
- `grep -n "snap.seq < " android/core-engine/src/main/kotlin/com/chesslab/engine/VerifySingle.kt` hits.
- `grep -rn "pendingVoted" android/core-engine/src/main/kotlin/com/chesslab/engine/VerifySingle.kt`
  hits ≥ 4 (shadow, commit, ghost, overrule) and **0** inside the window-end block.
- All 18 tests green; `.\gradlew.bat :core-engine:ktlintFormat` then `:core-engine:detekt` clean.
- `STATUS.md` row `done` + a note on the anchoring narrowing (and on who ended up owning
  `api/CnnObservation.kt`).

## Do NOT

- Do NOT make `fromLeftConf` sufficient for a non-castling commit. That is the b1c4 bug.
- Do NOT let `fromOccConf` hard-reject anywhere except the window-end rung. It is the
  model's unreliable axis; a false "still occupied" would kill real moves (d2d4).
- Do NOT verify by piece IDENTITY. Occupancy is the accept/reject axis (`:2126-2129`);
  identity is ~40% precise.
- Do NOT treat a stale `snap.seq` as a rejection or feed it to the vote.
- Do NOT auto-accept on occlusion timeout.
- Do NOT edit `EngineState.kt`, `VerifyPair.kt`, `CnnTick.kt`, `Alarm.kt`,
  `ObserverSchedule.kt`, or anything in `:core-cnn`. Missing state field → blocker.
- Do NOT add `synchronized`/`Atomic*`/`@Volatile` — Python's `self.lock` has no Kotlin
  counterpart here (entry.md hard rule 2). The lock-scoped re-checks become plain
  sequential identity checks.
- Do NOT read `android-legacy/**` for logic.
