# Phase 03d — dispatch, commit, anomaly patcher, TrackerEngine wiring

> Read `entry.md` completely first. Python is the source of truth:
> `src/chesslab/move_tracker/tracker.py`. Module `:core-engine`, package
> `com.chesslab.engine`. Phases 03a–03d run **in parallel** on disjoint files.

## Why

You own the ONE commit gate and the assembly. `_try_detect` (:2834-3058) is an *ordered*
pipeline; the legacy port let the pair path commit directly and skip both the motion gate
and the confirmer, and it had no absolute LL floor at all (a phantom `f6h5 @ 0.44` swallowed
a live castle). You also own `_set_ref`, whose `fromCommit` flag decides whether the colour
gamut is rebuilt from a frame that may still contain hand residue — entry.md invariant 6.

**Shared state:** `EngineState.kt` is created and owned by **phase 03a**. You read and write
its fields but **never edit that file**. Missing field → STOP and record a blocker in
`STATUS.md`.

You are also the phase's integrator: the **full-clip Tier B replay test is yours**.

## Files you own

```
android/core-engine/src/main/kotlin/com/chesslab/engine/Dispatch.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/Commit.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/AnomalyPatcher.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/TrackerEngine.kt        (fill in the phase-00a stub)
android/core-engine/src/test/kotlin/com/chesslab/engine/DispatchTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/CommitTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/AnomalyPatcherTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/ClipReplayParityTest.kt
```

## Design (decided — do not redesign)

### 1. `TrackerEngine.kt` — `tryDetect` (`_try_detect` :2834-3058) and the public API

`onFrame(input)` = `FrameLoop.step(input)` (03a); on `FrameOutcome.Detect(cur, curBgr, seq)`
run `tryDetect(cur, curBgr, seq)`. Events are collected into a local list and returned; the
engine never calls back.

`tryDetect` in exact order:

1. **Guards** — `if (!detectGuards()) return` (03a).
2. **Evidence** — `val (diffs, cens, z) = computeEvidence(cur)` (03a); then
   `applyTaints(z)` (03b).
   `changed = z.filter { it.value >= config.zThr }.keys.toMutableSet()`;
   `changedVals` = top-8 of `z` with `v >= zThr * 0.5`, descending (:2902-2904).
3. **Vetoes** — `val (changed, shadowVeto, occludedSet) = applyVetoes(cur, curBgr, z, changed, cens)` (03b);
   `state.changed = changed.sorted().toMutableSet()`.
4. **Noise** — `learnNoise(diffs, cens, changed, shadowVeto)` (03b).
5. **Scoring + quiet/re-anchor** (:2930-3006) — yours:
   - `scored = loglikScores(board, z, config.zThr, config.llK)` (02a); `soft = config.zThr * 0.5`;
   - `viableRaw = scored.filter { mv -> moveTouchedSquares(board, mv).all { (z[it] ?: 0.0) >= soft } }`
     — **all physically touched squares** (castling adds the rook squares, en passant the
     captured pawn square);
   - `viable = viableRaw.filter { (moveDestinationSquares(board, it.first) intersect shadowVeto).isEmpty() }`
     (specs/09); `shadowBlocked += (viableRaw - viable).map { it.first.uci() }`;
   - `obsMove/best = viable.firstOrNull() ?: (null, -1e9)`; `second = viable.getOrNull(1)?.second ?: -1e9`;
     `bestScore = if (viable.isNotEmpty()) best else (scored.firstOrNull()?.second ?: 0.0)`;
     `secondScore = second`; `candidateUci = obsMove?.uci()`;
   - note only when the filter changed the OUTCOME (`viableRaw` non-empty and
     `viable.isEmpty() || viable[0].first != viableRaw[0].first`):
     `"{SAN}? destination shadow-vetoed — not a move"` (:2944-2948).
   - **`if (changed.isEmpty())`** (:2949-3006):
     - `nTouched = obsMove?.let { moveTouchedSquares(board, it).size } ?: 2`;
       `scaledFloor = config.reanchorLlFloor * (nTouched / 2.0)` — castling (4 touched)
       gets `-8.0`, so weak-but-equal per-square evidence does not penalise it.
     - `if (obsMove == null || best < scaledFloor)` — **ordered bail-outs, all `return`**:
       1. `tainted.isNotEmpty()` → `markStuck("occluded")`, note
          `"waiting for occluded squares to clear…"`. A re-anchor would bake the hand in.
       2. `alarm != null` → `markStuck("no_legal_move")`, note
          `"ILLEGAL MOVE? board cannot be anchored to game state"`.
       3. **cnn_desync veto** (:2978-2992): `snap = cnnSnap`; if `snap?.obs != null`
          **and `snap.fen == board.fen()`** and `nowS - snap.tsS < 5.0`:
          `confMap = snap.obs.confident(config.cnnConfThr)`, `believed = expectedOccupancy(board)` (02c),
          `dis = believed.keys.filter { confMap[it] == true && snap.obs.occupied(it) != believed[it] }`;
          non-empty → `markStuck("cnn_desync")`, note
          `"quiet board but CNN disagrees on a, b, c, d — holding reference (recovery will resolve)"`
          (first 4). This is the Bxc3 incident guard: a real move whose commit was rejected
          leaves the board physically ahead of the game state, and re-anchoring would make
          the desync silent and permanent.
       4. otherwise **quiet re-anchor** — `confirmer.reset()`; `clearStuck()`;
          `anomalySince.clear()`; `setRef(cur, curBgr)` (**`fromCommit = false` — the gamut
          rebuild happens HERE AND ONLY HERE**); `if (occludedSet.isEmpty()) flushSessionCapture()`;
          emit `TrackerEvent.ReAnchored`.
     - `else if (best < 0.0)` → **HOLD**: note `"weak move evidence (SAN?) — waiting"`, return.
       Neither re-anchor nor stuck; the confirmer keeps collecting.
6. **Hypothesis** — `cand = generateHypothesis(z, scored, viable, changed, obsMove, best, second, cur, curBgr, shadowVeto, blockedN = tainted.size)` (03c).
   `cand == null` → return. **`blockedN` is `tainted.size`** (entry.md invariant 4).
7. **6b. Absolute LL floor** (:3025-3029): `if (cand.vote && config.commitLlFloor > 0 && bestScore < config.commitLlFloor)`
   → `confirmer.reset()`, note `"{SANs}? evidence too weak (x.xx < 2.0) — not committing"`,
   return. Endpoint candidates (`vote == false`) are exempt.
8. **7. Motion gate** (:3036-3044): if `config.requireMotionForMove`:
   `age = nowS - lastMotionTs`; if `!motionSinceRef || age > config.motionRecencyS` →
   `confirmer.reset()`, note `"{SANs}? ignored — {no motion since last move | last motion Ns ago} (drift/light, not a real move)"`,
   return. **Both** conditions — `motionSinceRef` alone was armed forever by one wobble spike.
9. **8. Confirmer** (:3048-3053): `key = cand.moves.joinToString(" ") { it.uci() }`;
   `candidateUci = key`; `if (cand.vote && !confirmer.feed(key))` → note
   `"detecting {SANs}… (n/confirmFrames)"`, return. Then `anomalySince.clear()`.
10. **9. Dispatch** — `dispatch(cand.moves, cur, curBgr, cand.priorUsed, cand.note, seq)`.

Public API (entry.md seam — signatures are frozen):

- `onFrame`, `status()` (fill every `TrackerStatus` field from `EngineState`; the debug
  screen is a pure function of it — no side channel),
- `undo()`, `resetToStart()`, `setFen(fen)`, `captureBaseline()`, `choosePromotion(piece)`,
  `updateConfig(config)`.
  - `undo` / `setFen` / `captureBaseline` / `resetToStart` mirror `reset_to_start` :1371-1394:
    clear `refGray/refBgr/refFen`, `history`, `lastMove`, both buffers, `pendingCapture`,
    `clearStuck()`, `recoveredLast`, `cnnStatus`, `cnnConflicts`, `pending`, `verifyState`,
    `promoPending`, `anomalySince`, `priorLast`, `shadowVetoed`, `shadowBlocked`,
    `occludedVetoed`, `motionOccludedSquares`, and **clear the alarm latch** with a
    `decisionLog` entry `decider = "user"` (`_clear_alarm` :1354-1369, invariant 9).
  - `choosePromotion(piece)` (`choose_promotion` :3422-3441): accept only `q/r/b/n`
    (case-insensitive, trimmed); no pending → error event; `board.fen() != pp.fen` → drop
    the pending and report "Position has changed"; illegal move → error; else clear the
    pending and `commitMove(mv, pp.cur, pp.curBgr)`.
  - `updateConfig` swaps `state.config`, resizes the running-mean buffers if
    `avgFrames` changed (03a exposes `resize`), and rebuilds `confirmer` /
    `recoveryConfirmer` if `confirmFrames` changed. It must not touch `refGray`.
- `onCnnSnapshot` / `acceptCnnPosition` stay **stubs** returning `emptyList()` in this
  phase — phase 04 fills them. Leave a `// phase 04` marker, do not invent behaviour.

### 2. `Dispatch.kt` — `dispatch(...)` (`_dispatch` :3322-3353)

1. **Alarm gate first, blocks EVERYTHING** (:3334-3338, invariant 9): `alarm != null` →
   `confirmer.reset()`, note
   `"board desynced (ILLEGAL MOVE alarm) — no moves committed until take-back or resync"`,
   return. No commit, no pending, no re-anchor.
2. `sans = sanSequence(moves)` (`_san_sequence` :3313-3320 — SANs of a not-yet-pushed
   sequence, computed on a board **copy**, the real board stays untouched).
3. `cnnOn` → `pending = PendingVerify(ucis = moves.map { it.uci() }, uci = moves[0].uci(), fen = board.fen(), cur, curBgr, frames = 0, priorUsed, seq)`;
   `recoveryConfirmer.reset()`; `verifyState = "verifying"`;
   note `note ?: "checking {SANs} via CNN…"`. **`seq` is the decision's frame signature**
   (newest frame in the averaged buffer); phase 04's verify accepts only observations with
   `obs.seq >= seq` (Spec 11). Return — no event yet.
4. else direct commit: one move → `commitMove(moves[0], cur, curBgr, recovered = false, priorUsed, decider = "diff")`;
   two → `commitSequence(moves, cur, curBgr, decider = "diff_pair")`.

**`cnn_overrule` must be expressible** (entry.md invariant 10, legacy D3): declare the
verify seam phase 04 will use as

```kotlin
internal sealed interface VerifyVerdict {
    data class For(val decider: String, val replacement: List<Move>? = null) : VerifyVerdict
    data object Against : VerifyVerdict
    data object Undecided : VerifyVerdict
}
internal fun EngineState.applyVerdict(v: VerifyVerdict.For, pend: PendingVerify): List<TrackerEvent>
```

`applyVerdict` commits `v.replacement ?: pend.ucis` with `decider = v.decider`, anchoring on
the **snapshot's** images when the caller supplies them (invariant 5) — phase 04 passes
`snap.gray`/`snap.warped`, never `lastCur`. Implement `applyVerdict`; the tick machines
themselves are phase 04's.

### 3. `Commit.kt` — `commitMove`, `commitSequence`, `setRef`, provenance

`setRef(cur, curBgr, fromCommit = false)` (`_set_ref` :2554-2576):
`refGray = cur`; if `curBgr != null` → `refBgr = curBgr` **and, only when `!fromCommit`,
`refGamut = boardColorGamut(curBgr, detSize, whitePov)`** (01c). `refFen = board.fen()`;
`refCorners = lastCorners?.copyOf()`; `motionSinceRef = false` (a fresh reference requires a
new hand before the next commit).
**Invariant 6:** a commit-time reference may still carry hand residue; a gamut built from it
would bake the hand's colours in and blind the occlusion veto. It refreshes at the next
quiet re-anchor only.

`commitMove(move, cur, curBgr, recovered = false, priorUsed = false, decider = "diff")`
(`_commit_move` :2598-2628): capture `fenBefore` and `preRefBgr = refBgr` **before**
`setRef` overwrites it; `san = board.san(move)`; push; `history += san`; `lastMove = uci`;
`recordDecision(...)`; `queueSessionCapture(san)`; `setRef(cur, curBgr, fromCommit = true)`;
`state = "move"`; `confirmer.reset()`; `clearStuck()`; `pending = null`;
`anomalySince.clear()`; `verifyState = "confirmed"`; `recoveredLast = recovered`;
`priorLast = priorUsed`; note `"Move detected: {san}"` + `" (CNN recovery)"` +
`" (decided by prior — undo if needed)"`, plus `" — Checkmate!"`.
Emit `TrackerEvent.MoveCommitted(uci, san, board.fen(), decider, priorUsed)`.

`commitSequence(moves, cur, curBgr, decider = "diff_pair")` (`_commit_sequence` :2401-2427):
same shape, atomically pushing all moves, `recordDecision` on the **last** move with
`priorUsed = false`, `queueSessionCapture(sans.last())`, `priorLast = false`,
`recoveredLast = false`, note `"Double move detected: {a + b} (fast play)"`.
Emit `TrackerEvent.SequenceCommitted`.

`recordDecision` (`_record_decision` :2642-2681) fills `DecisionRecord` (declared in
`EngineState.kt`) and appends to `decisionLog`. Decider vocabulary is fixed
(`_DECIDER_REASON` :2631-2640): `diff`, `diff_pair`, `cnn_pair`, `cnn_occupancy`,
`cnn_overrule`, `diff_after_verify`, `cnn_recovery`, `cnn_resync`; `priorUsed` appends
`" + prior tie-break"` to the reason. Port the map verbatim — phase 07's debug screen and
the feedback ingest read these strings.
The image-carrying `_recent_decisions` ring and the session-capture file I/O stay in `:app`;
here `queueSessionCapture` / `flushSessionCapture` only set and clear
`state.pendingCapture` and emit `TrackerEvent.Note` — `:core-engine` does no I/O.

`markStuck(reason)` / `clearStuck()` (:3444-3450) live here: `stuckCount` increments while
the reason is unchanged, resets to 1 otherwise; `clearStuck` nulls the reason, zeroes the
count and resets `recoveryConfirmer`. `markStuck` emits `TrackerEvent.Stuck(reason)` only
on a **change** of reason (do not spam one event per frame).

### 4. `AnomalyPatcher.kt` — `maybePatchAnomaly(changed, bestLl, cur, curBgr)` (:3377-3420)

1. `anomalySince = changed.associateWith { anomalySince[it] ?: nowS }` — **rebuild**, so
   squares that stopped changing lose their timer.
2. Bail when `changed.isEmpty() || bestLl >= 0.0 || changed.size > config.maxChanged + 2`
   (resting-hand protection).
3. For each `sq` in `changed.sorted()`: `occupied = board.pieceAt(sq) != null`;
   `needed = if (occupied) config.nudgeTimeoutS else config.driftWindowS` — empty squares
   are more conservative because a changing empty square could also be a silent wrong move.
   Skip while `nowS - anomalySince[sq]!! < needed`.
4. Patch region: `squareRegion(sq, detSize, whitePov, inset = 0.0, extendUp = config.overhang)`
   — **the same pixels the diff looks at, including the overhang**, else the extended strip
   above the cell stays hot forever and the healing never converges. Copy
   `cur[region] → refGray[region]` and, when both BGRs exist, `curBgr → refBgr`.
   `why = if (occupied) "piece moved/hand residue" else "light drift"`.
5. Nothing patched → return. Otherwise remove the patched squares from `anomalySince`,
   set **`refCensusFor = null`** (ref pixels mutated in place → the census cache must
   recode; :3415), note `"Reference pulled forward (a1, b2): {why} — no move"`, and when
   `patched.size == changed.size` → `clearStuck()` + `confirmer.reset()`.

## Steps

### 1. `Commit.kt` — commit `feat(android-engine): commit paths, setRef gamut rule and decision provenance`
Wait for 03a's `EngineState.kt` commit to land in the working tree before compiling.

### 2. `Dispatch.kt` — commit `feat(android-engine): dispatch — the one commit gate, alarm block, cnn_overrule seam`

### 3. `AnomalyPatcher.kt` — commit `feat(android-engine): nudge/drift cell patcher with census-cache invalidation`

### 4. `TrackerEngine.kt` — commit `feat(android-engine): wire the 9-step detection pipeline and the public engine API`

### 5. Tests — commit `test(android-engine): dispatch, commit, patcher and full-clip decision parity`

## Tests

`DispatchTest`, `CommitTest`, `AnomalyPatcherTest`, `ClipReplayParityTest` in
`com.chesslab.engine`.

**`ClipReplayParityTest` is the phase's integration gate and is yours.** It consumes the
phase-00b **Tier B decision-level** golden fixtures: for each clip under
`core-engine/src/test/resources/parity/clips/<clip>/` the recorded warped frames
(`frames.bin` + `index.json`, already at `detSize`, plus the per-frame `corners`,
`motionRoiScore`, `gridLineCoverage`, `lumaPreClahe`, `timestampMs`) are replayed through
`TrackerEngine.onFrame` and the emitted per-frame record must be **identical** to Python's
`decisions.jsonl`: `seq, state, changed[], shadowVetoed[], occludedVetoed[], bestLl,
secondLl, candidate, stuck, commit`. Compare doubles with a 1e-6 tolerance and everything
else exactly; on mismatch report the first diverging `seq` and the full record pair. Cover
at least the `clip01`, `clip03` and the specs/09 phantom clips from `tests/data/testclips`.

Mirror these scenarios from `tests/test_move_tracker.py`:

- `test_single_move_detected` (:699) → `ClipReplayParityTest.singleMoveDetected`
- `test_no_cnn_commits_directly` (:1198) → `DispatchTest.noCnnCommitsDirectly`
- `test_alarm_blocks_dispatch_commits` (:1105) → `DispatchTest.alarmBlocksDispatchCommits`
- `test_alarm_discards_pending_candidate` (:1118) → `DispatchTest.alarmDiscardsPendingCandidate`
- `test_cnn_unavailable_commits_pending` (:1190) → `DispatchTest.cnnUnavailableCommitsPending`
- `test_pair_respects_motion_gate` (:1279) → `DispatchTest.pairRespectsMotionGate`
- `test_no_motion_blocks_commit` (:1457), `test_motion_allows_commit` (:1466),
  `test_stale_motion_blocks_commit` (:1474), `test_commit_resets_motion_flag` (:1484)
  → `DispatchTest.motionGate*`
- `test_valid_move_advances_base_truth_with_fen` (:827) → `CommitTest.commitAdvancesBaseTruthPair`
- `test_decision_recorded_on_commit` (:1542) → `CommitTest.decisionRecordedOnCommit`
- `test_undo_clears_bgr_buffer` (:1397) → `CommitTest.undoClearsBuffers`
- `test_undo_clears_alarm_latch` (:2643), `test_reset_fen_clears_alarm_latch` (:2666),
  `test_baseline_clears_alarm_latch` (:2656) → `CommitTest.userCorrectionClearsAlarmLatch`
- `test_weak_candidate_does_not_reanchor` (:1984) → `DispatchTest.weakCandidateHoldsReference`
- `test_quiet_reanchor_vetoed_by_confident_cnn_conflict` (:2600) → `DispatchTest.cnnDesyncVetoesReanchor`
- `test_nudge_patches_occupied_square` (:1919) → `AnomalyPatcherTest.nudgePatchesOccupiedSquare`
- `test_empty_square_not_patched_before_drift_window` (:1934) → `AnomalyPatcherTest.emptySquareWaitsForDriftWindow`
- `test_cnn_overrules_diff_candidate` (:1971) → `DispatchTest.cnnOverruleReplacementMove`
- `test_choose_promotion_invalid_piece` (:1964) → `CommitTest.choosePromotionRejectsInvalidPiece`
- `test_promotion_waits_for_user_choice` (:1947) → `CommitTest.choosePromotionCommitsChosenPiece`

Named invariant tests (entry.md):

- `DispatchTest.cnnOverruleReplacementMoveIsExpressible` — invariant 10 / legacy D3:
  `applyVerdict(For("cnn_overrule", replacement = listOf(other)), pend)` commits `other`,
  **not** `pend.ucis`, in the same cycle; `decisionLog.last().decider == "cnn_overrule"`.
- `CommitTest.setRefFromCommitDoesNotRebuildGamut` — invariant 6: `refGamut` is identical
  before/after `setRef(..., fromCommit = true)` and **changes** on the quiet re-anchor.
- `DispatchTest.alarmBlocksCommitReanchorAndPending` — invariant 9: with `alarm != null`,
  no `MoveCommitted`, no `ReAnchored`, `pending == null` after a full `tryDetect`.
- `DispatchTest.commitLlFloorExemptsEndpointCandidates` — `vote = false` with
  `bestScore = 0.44 < 2.0` still reaches dispatch; `vote = true` does not.
- `DispatchTest.reanchorFloorScalesWithTouchedSquares` — castling candidate → effective
  floor `-8.0`, normal move → `-4.0`.
- `DispatchTest.gamutRebuildHappensOnlyOnQuietReanchor` — grep-and-test companion to the
  acceptance criterion below.
- `AnomalyPatcherTest.patchInvalidatesRefCensusCache` — after a patch,
  `refCensusFor == null` and the next `refCensusCodes()` recomputes (:3415).
- `AnomalyPatcherTest.patchRegionIncludesOverhang` — the patched box equals
  `squareRegion(sq, detSize, whitePov, inset = 0.0, extendUp = overhang)`.
- `TrackerEngine` status: `CommitTest.statusIsAPureFunctionOfState` — two calls with no
  frame in between are equal, and every `TrackerStatus` field is populated (no defaults).

Run once:
`.\gradlew.bat :core-engine:test --tests "com.chesslab.engine.DispatchTest" --tests "com.chesslab.engine.CommitTest" --tests "com.chesslab.engine.AnomalyPatcherTest" --tests "com.chesslab.engine.ClipReplayParityTest"`

## Acceptance criteria

- `grep -n "alarm != null" .../engine/Dispatch.kt` is the **first** statement of `dispatch`.
- `grep -n "fromCommit" .../engine/Commit.kt` shows the gamut rebuild guarded by `!fromCommit`,
  and `grep -rn "boardColorGamut" android/core-engine/src/main` hits **only** `Commit.kt`.
- `grep -n "blockedN = tainted.size" .../engine/TrackerEngine.kt` hits.
- `grep -n "commitLlFloor" .../engine/TrackerEngine.kt` shows the floor guarded by `cand.vote`.
- `grep -n "replacement" .../engine/Dispatch.kt` hits in `VerifyVerdict.For`.
- `grep -n "refCensusFor = null" .../engine/AnomalyPatcher.kt` hits.
- `grep -rn "synchronized\|@Volatile\|Atomic\|Mutex\|System.currentTimeMillis" android/core-engine/src/main` returns nothing.
- `ClipReplayParityTest` green on every fixture clip with **zero** diverging frames.
- All named tests green; ktlint/detekt clean for `:core-engine`.

## Do NOT

- **Do not edit `EngineState.kt` — it is owned by 03a.** Same for `Guards.kt`,
  `Evidence.kt`, `FrameLoop.kt` (03a), `Vetoes.kt`, `NoiseLearning.kt`, `Taint.kt` (03b),
  `Hypothesis.kt`, `PairCandidate.kt`, `EndpointCandidate.kt`, `Ambiguity.kt` (03c).
- Do not let the pair path bypass the LL floor, the motion gate, the confirmer or dispatch —
  every candidate kind goes through the same steps 6b→9.
- Do not implement `_verify_tick`, `_verify_pair_tick`, `_cnn_tick`, recovery or the alarm
  state machine — phase 04. `onCnnSnapshot` / `acceptCnnPosition` stay stubs.
- Do not rebuild the colour gamut on a commit-time reference.
- Do not anchor a verified commit on `lastCur` (invariant 5) — `applyVerdict` takes its
  images from the caller.
- Do not do file I/O, JPEG encoding or overlay drawing in `:core-engine`.
- Do not emit `Stuck` every frame; only on a change of reason.
- Do not adjust a threshold to make `ClipReplayParityTest` pass. A divergence is a port bug
  or a genuine Python discrepancy — fix the port or record it in `STATUS.md`.
