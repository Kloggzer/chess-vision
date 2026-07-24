# Phase 04c — observer schedule, CNN recovery, illegal-move alarm

> Module `:core-engine`, package `com.chesslab.engine`. References:
> `src/chesslab/move_tracker/tracker.py::_observer_due` `:1766`, `::_cnn_worker` `:1771`,
> `::_observe_snapshot` `:1796`, `::_cnn_tick` `:1868-2076`, `::_clear_alarm` `:1354`.
> Runs in parallel with 04a and 04b — file ownership is strictly disjoint.

## Files you own

| File | Contains |
|---|---|
| `android/core-engine/src/main/kotlin/com/chesslab/engine/ObserverSchedule.kt` | `_observer_due`, the `_cnn_worker` routing contract, the `_observe_snapshot` invariants (as a documented contract for `:app`) |
| `android/core-engine/src/main/kotlin/com/chesslab/engine/CnnTick.kt` | `_cnn_tick` — evaluation gates, identity path, occupancy fallback, recovery commit |
| `android/core-engine/src/main/kotlin/com/chesslab/engine/Alarm.kt` | the illegal-move latch: `AlarmState`, `raise`, `clear`, the desync streak |
| `android/core-engine/src/test/kotlin/com/chesslab/engine/CnnTickTest.kt` | recovery + observer tests |
| `android/core-engine/src/test/kotlin/com/chesslab/engine/AlarmLatchTest.kt` | alarm tests |
| `android/core-engine/src/test/kotlin/com/chesslab/engine/RecoveryFixtures.kt` | fakes for THESE test classes only |

You own **nothing else**. `VerifySingle.kt`/`VerifyVerdict.kt`/`PendingVote.kt`/
`api/CnnObservation.kt` → 04a. `VerifyPair.kt` → 04b. `EngineState.kt` → 03a.
`Dispatch.kt`/`Commit.kt`/game control → 03d.

## Why

Three things live here, and each one has a recorded failure behind it:

- **The observer schedule.** Python made the observation *free-running* (Spec 11): observe
  the newest frame whenever the worker is idle, so verify/recovery/alarm always find a
  fresh, seq-tagged snapshot. The old demand-driven conditions survive only as
  *evaluation* gates. The routing rule — **a pending candidate has priority over the
  periodic check** — is what makes the pre-commit ghost filter responsive.
- **Recovery.** `specs/12-android-parity/STATUS.md` **D6**: the recovery-commit voting
  confirmer was never ported to Kotlin, so a single glance could push a whole move
  sequence onto the board. Port it.
- **The alarm.** entry.md invariant **9**: while latched it freezes noise learning AND
  blocks every commit, re-anchor and pending candidate. Phase 03 implements those gates;
  **you own the latch and its release paths**. Nothing in the detection pipeline may heal
  the alarm silently — that was the "alarm heals by EMA drift" bug
  (`specs/16-.../01-alarm-noise-freeze.md`).

## Design (decided — do not redesign)

### `ObserverSchedule.kt`

**`observerDue(state, now)`** — `tracker.py:1766-1769`:
```
cnnRun && !cnnFailed && !cnnBusy && (now - observerStartedTs) >= config.observerIntervalS
```
`observerIntervalS = 0.0` (the default) means **free-running**: a new observation is
spawned as soon as the worker goes idle. `cnnBusy` serializes to **exactly one**
observation at a time — this is the whole concurrency model; there is no queue.

**Routing — `_cnn_worker` `:1787-1790`:**
```kotlin
fun onSnapshot(state: EngineState, cnn: CnnEvaluator?, snap: CnnSnapshot?): List<TrackerEvent> =
    when {
        state.pending != null -> VerifySingle.tick(state, cnn, snap)   // priority; snap may be null
        snap != null          -> CnnTick.evaluate(state, cnn, snap)
        else                  -> emptyList()
    }
```
Pending has **priority**; `VerifySingle` internally forks to `VerifyPair` for multi-move
candidates (04a step 8). `snap == null` (CNN unavailable / observation failed) reaches
`VerifySingle` on purpose — that is its fallback-commit path (`tracker.py:2107`) — and is
dropped otherwise.

The frozen engine API has only `onCnnSnapshot(snap)`, so the null-snapshot case needs a
second driver: `ObserverSchedule.onFrameTick(state, cnn, now)`, called from
`TrackerEngine.onFrame`. When `state.pending != null && (cnn == null || state.cnnFailed)`
it calls `onSnapshot(state, null, null)` once per frame so the fallback commit still
fires without a CNN. Everything else it does is bookkeeping (`observerStartedTs`,
`cnnBusy`) driven by `:app`.

**`_observe_snapshot` contract `:1796-1829`** — the observation itself runs in `:app`
(pixels + ONNX), but the invariants are engine law. Document them in a KDoc block on
`ObserverSchedule` and assert what is assertable:
1. Observe **outside** any lock / off the frame thread; inference is the expensive part.
2. The anchor warp rides along: `warp_from_corners` at full `boardSize`, then **resize
   down to `detSize` with `INTER_AREA`** when `detectScale < 1.0` (`:1817-1821`).
   **Invariant (entry.md 1): `snap.gray.width == snap.warped.width == config.detSize`,
   identical to `refGray`.** A snapshot violating it must be rejected by the engine, not
   silently anchored — that would corrupt the reference resolution.
3. `snap.fen` is the game FEN **at observation start** — the discard-on-change guard.
4. `snap.seq` is the frame seq of the **observed** frame (Spec 11 pairing).
5. On observation failure: `observerStartedTs = now + 1.0` — a **1 s backoff**, otherwise
   with `observerIntervalS = 0` a persistent failure retries (and logs) at loop rate.

### `CnnTick.kt` — `_cnn_tick` (`:1868-2076`)

```kotlin
internal object CnnTick {
    fun evaluate(state: EngineState, cnn: CnnEvaluator?, snap: CnnSnapshot): List<TrackerEvent>
}
```

**Evaluation gates `:1878-1884`** — everything below runs only if one fires:
```
stable   = grayBuf.size >= config.avgFrames(cnnOn) && state.state in ("waiting", "move")
stuck    = stuckReason != null && stuckCount >= config.settleFrames(cnnOn)
                              && (now - lastCnnTs) >= config.cnnCooldownS      // 2.0
periodic = stable && (now - lastCnnTs) >= config.cnnCheckIntervalS             // 10.0
if (!(stuck || periodic)) return emptyList()
```
Note `stuck` does **not** require `stable`; `periodic` does. `cnn == null` → return.

**Identity path `:1891-1925`:**
```
hasIdentity = obs.label != null
if (hasIdentity) {
    matches      = cnn.boardMatchesIdentity(board, obs)
    derived      = cnn.deriveMovesDeep(board, obs, maxPlies = config.recoveryMaxPlies)  // 4
    cnnMoves     = derived.moves;  agreement = derived.best
    conflicts    = matches.conflicts; matchOk = matches.match; inconclusive = matches.inconclusive
    // OCCUPANCY FALLBACK (:1912, b8b6→c6 correction incident 2026-07-09)
    if (!matchOk && !inconclusive) {
        occObs = obs.occupancyOnly()                       // identity STRIPPED
        occRes = cnn.resyncCheck(board, occObs)
        if (occRes.match) { matchOk = true; conflicts = emptyList() }   // identity-only disagreement
        else if (cnnMoves.isEmpty()) {
            deep = cnn.deriveMovesDeep(board, occObs, maxPlies = config.recoveryMaxPlies)
            if (deep.moves.isNotEmpty()) { cnnMoves = deep.moves; agreement = deep.best }
        }
    }
} else {                                                   // :1927 occupancy-only run
    res = cnn.resyncCheck(board, obs)
    cnnMoves = listOfNotNull(res.move?.let(::Move)); agreement = res.agreement
    conflicts = res.conflicts; matchOk = res.match; inconclusive = false
    if (cnnMoves.isEmpty() && !matchOk) { deep = cnn.deriveMovesDeep(board, obs, config.recoveryMaxPlies)
                                          if (deep.moves.isNotEmpty()) { cnnMoves = deep.moves; agreement = deep.best } }
}
```
The fallback exists because identity is the model's **weak** axis (~40% on piece types):
one confident type misread anywhere holds agreement below `minAgreement` forever, so
corrections and take-backs "never update". Occupancy is the reliable axis.

**Then `:1936-1942`:** `lastCnnTs = now`; if `board.fen != snap.fen` → `recoveryConfirmer.reset()`,
return (state changed → discard); set `cnnAgreement`, `cnnBestMove = cnnMoves.joinToString(" ") { it.uci() }`.

**Branch A — `matchOk` `:1944-1964`:**
- `cnnStatus = "ok"`, `cnnConflicts = []`.
- **If `alarm != null` → `Alarm.clear(state)`**, note `"board restored — alarm cleared"`,
  emit `TrackerEvent.AlarmCleared("board_restored")`. This is the *verified restore*
  release path — a take-back was detected.
- `recoveryConfirmer.reset()`.
- If `stuckReason != null` and an anchor image exists: `setRef(snap.gray, snap.warped,
  fromCommit = true)` — **the frame the CNN looked at, NEVER `lastCur`** (entry.md
  invariant 5; `lastCur` is several frames newer and may already contain the opponent's
  next move). Fall back to `lastCur/lastCurBgr` only when `snap.gray == null` (`:1959`).
  `fromCommit = true` because the CNN tolerates partial occlusion
  (`minConfidentRecovery`), so this frame is not clean enough for a gamut rebuild
  (entry.md invariant 6). Then `clearStuck()`, `confirmer.reset()`,
  `verifyState = "resynced"`, note `"CNN: board unchanged — reference pulled forward (no move)"`.
- Return.

**Branch B — `inconclusive` `:1966-1969`:** `recoveryConfirmer.reset()`, **`desyncObs = 0`**
— occlusion breaks the desync streak — return. No statement, no alarm progress.

**Branch C — mismatch, NO derivable moves `:1971-2015`:** `cnnStatus = "mismatch"`,
`cnnConflicts = conflicts`. Then the **desync streak** (delegate to `Alarm.kt`, below) and
the note: alarmed → `"ILLEGAL MOVE? ${guessSan ?: first4Conflicts} — take it back, or resync to accept"`;
otherwise `"CNN check: board deviates (${first4}) — check pieces or resync"`. Finally
`recoveryConfirmer.reset()`, return.

**Branch D — mismatch WITH moves `:2016-2076`:**
1. `key = cnnMoves.joinToString(" ") { it.uci() }`;
   **`if (!recoveryConfirmer.feed(key)) { note = "CNN recovery checks $key… (${recoveryConfirmer.count}/${config.confirmFrames(cnnOn)})"; return }`**
   — this is **D6**, the confirmer legacy never ported. Voting, not single-shot.
2. **While alarmed `:2021-2040`:** commit only if the sequence resolves **every** alarm
   conflict square. `bTest = board.clone()`, push all `cnnMoves`,
   `postLabels = cnn.expectedLabels(bTest)`, `labelOk = obs.labelConfident(config.cnnConfThr)`;
   `unresolved = alarm.conflicts.filter { labelOk[it] == true && obs.label!![it] != postLabels[it] }`
   (no identity available → **all** conflicts count as unresolved, `:2036`). Non-empty →
   note `"ILLEGAL MOVE? CNN recovery would not resolve conflicts — withholding"`,
   `recoveryConfirmer.reset()`, return.
3. Commit: push each move, append SANs to history, `lastMove = cnnMoves.last().uci()`,
   `recordDecision(cnnMoves.last(), sans.last(), fenBefore, decider = "cnn_recovery", …)`,
   `queueSessionCapture(sans.last())`.
4. Anchor: `setRef(snap.gray, snap.warped, fromCommit = true)`; fall back to
   `lastCur/lastCurBgr`; if neither exists clear `refGray/refBgr/refFen` and the gray
   buffer (`:2055-2062`).
5. **Grant one motion window `:2066`:** `motionSinceRef = true; lastMotionTs = now`.
   Recovery means we WERE behind — a reply played during the recovery window is already
   visible against this old reference, and the recency gate would otherwise hold it
   hostage until the next recovery cycle.
6. `state = "move"`, `recoveredLast = true`, `priorLast = false`, `cnnStatus = "ok"`,
   `cnnConflicts = []`, `confirmer.reset()`, `clearStuck()`, **`Alarm.clear(state)`** (a
   successful commit while alarmed means the move resolved the conflict), note
   `"Move detected by CNN recovery: ${sans.joinToString(" + ")} (agreement ${pct})"`.
   Emit `TrackerEvent.SequenceCommitted(...)` (or `MoveCommitted` for a single move) and
   `AlarmCleared` if the alarm was set.

### `Alarm.kt` — the latch

```kotlin
internal data class AlarmState(val kind: String, val sinceMs: Long,
                               val conflicts: List<String>, val guess: String?)

internal object Alarm {
    /** :1976-2005 — advance the desync streak and raise if it trips. */
    fun onStableMismatch(state: EngineState, cnn: CnnEvaluator, obs: CnnObservation,
                         snap: CnnSnapshot, hasIdentity: Boolean,
                         inconclusive: Boolean, conflicts: List<String>): List<TrackerEvent>
    /** :1354 — the ONLY release. `reason != null` writes a provenance row into the decision log. */
    fun clear(state: EngineState, reason: String? = null): List<TrackerEvent>
}
```

**The streak `:1976-1992`:**
- Only with identity (`hasIdentity && !inconclusive`); occupancy-only mode sets
  `desyncObs = 0`, `desyncConflicts = emptySet()` and never alarms.
- **Counted per distinct `snap.seq` `:1980`:** `if (snap.seq == state.desyncLastSeq) return`
  — a snapshot re-evaluated for the same frame must not advance the streak. `desyncObsN`
  means "persistent over seconds", not "evaluated three times".
- The conflict set must be **STABLE**: `desyncConflicts == confSet ||
  confSet ⊆ desyncConflicts || desyncConflicts ⊆ confSet` → `desyncObs++`, **else
  `desyncObs = 1`** (reset to one, not zero). Then `desyncConflicts = confSet;
  desyncLastSeq = snap.seq`.

**Raise `:1998-2005`:**
```
hasIdentity && obs.label != null && state.alarm == null && desyncObs >= config.desyncObsN  // 3
    && cnn.hasOccupancyConflict(board, obs, config.cnnConfThr, conflicts)
→ alarm = AlarmState("illegal_move", now, conflicts, cnn.guessIllegalMove(board, obs, config.cnnConfThr))
```
**Identity-only conflicts never alarm.** An illegal move virtually always changes
OCCUPANCY somewhere; a stable wrong-piece-type reading is the known N/B/R gap (~40%
identity precision) and rang the alarm on perfectly regular boards (user-reported).
Emit `TrackerEvent.Alarm(kind, conflicts, guess, guessSan)` where `guessSan` mirrors
`_build_alarm_guess_san`.

**`clear` `:1354-1369`:** no-op when `alarm == null`; else `alarm = null`,
**`desyncObs = 0`, `desyncConflicts = emptySet()`**, and with a `reason` append a decision-log
row `{move: null, san: null, fenAfter: board.fen, decider: "user", reason: reason}`.
Emit `TrackerEvent.AlarmCleared(reason ?: "restored")`.

**Release paths — this list is exhaustive:**

| Path | Reason string | Python |
|---|---|---|
| `undo()` | `illegal_move_undone` | `:3831` |
| `resetToStart()` / `setFen()` | `illegal_move_accepted` | `:1411` |
| `captureBaseline()` | `illegal_move_accepted` | `:1438` |
| CNN resync (apply observed move) | `illegal_move_accepted` | `:2452` |
| `acceptCnnPosition()` | `illegal_move_accepted` | `:2486` ff. |
| verified restore — `matchOk` | *(none)* | `:1950` |
| recovery commit resolving all conflicts | *(none)* | `:2074` |

Those call sites live in phase-03/later files you do **not** own. Document the required
calls in `STATUS.md` for the orchestrator; if a call site is missing, your test for that
path fails — record it as a reconciliation item, do not edit the foreign file.

**Not yours:** the alarm *gates* (dispatch commit block `tracker.py:3332`, quiet-re-anchor
block, noise-learning freeze) are phase 03. You own the latch, the streak, and the release.

### Required `EngineState` fields (owned & FROZEN by 03a)

`alarm: AlarmState?`, `desyncObs: Int`, `desyncConflicts: Set<String>`,
`desyncLastSeq: Long`, `cnnBusy: Boolean`, `cnnFailed: Boolean`, `cnnRun: Boolean`,
`observerStartedTs: Double`, `lastCnnTs: Double`, `cnnSnap: CnnSnapshot?`,
`stuckReason: String?`, `stuckCount: Int`, `recoveryConfirmer`, `recoveredLast: Boolean`,
`motionSinceRef: Boolean`, `lastMotionTs: Double`, `decisionLog`. Missing → **STOP** and
record a blocker; do not edit `EngineState.kt`.

## Steps

### 1. `Alarm.kt` — commit `feat(android-engine): illegal-move alarm latch — per-seq desync streak, occupancy-only raise, explicit release`

### 2. `ObserverSchedule.kt` — commit `feat(android-engine): free-running observer schedule — pending priority, single-flight, detSize snapshot contract`

### 3. `CnnTick.kt` — commit `feat(android-engine): port _cnn_tick — gates, occupancy fallback, recovery confirmer, snapshot anchoring`

### 4. Tests — commit `test(android-engine): recovery + alarm — streak, identity-only no-alarm, withholding, snapshot anchoring`

## Tests

`CnnTickTest` and `AlarmLatchTest` in `com.chesslab.engine`; fakes in
`RecoveryFixtures.kt` (own file — `:core-engine` cannot depend on `:core-cnn`, so
implement `CnnObservation`/`CnnEvaluator` by hand, mirroring `_FakeObs`
`tests/test_move_tracker.py:919`, `_FakeRecovery` `:932` and `_AlarmStub` `:2425`).
Use the phase-00b golden fixtures under `core-engine/src/test/resources/parity/` where a
recorded observation exists.

**`AlarmLatchTest`** — mirror `tests/test_move_tracker.py`:

| Kotlin test | Python |
|---|---|
| `alarmTriggersAfterNStableMismatches` | `test_alarm_triggers_after_n_stable_mismatches:2474` |
| `alarmBlocksFabricatedRecovery` | `test_alarm_blocks_fabricated_recovery:2510` (withholding, `:2037`) |
| `noAlarmWithoutCnn` | `test_no_alarm_without_cnn:2556` |
| `identityOnlyConflictNeverAlarms` | `has_occupancy_conflict` gate `:1998-2002` (N/B/R gap) |
| `desyncCountsDistinctObservations` | `TestSeqContract::test_desync_counts_distinct_observations:2827` |
| `unstableConflictSetResetsStreakToOne` | `:1984-1987` |
| `inconclusiveObservationBreaksStreak` | `:1966-1969` |
| `undoClearsAlarmLatch` | `test_undo_clears_alarm_latch:2643` |
| `baselineClearsAlarmLatch` | `test_baseline_clears_alarm_latch:2656` |
| `resetFenClearsAlarmLatch` | `test_reset_fen_clears_alarm_latch:2666` |
| `acceptCnnPositionClearsLatch` | `test_accept_cnn_position_adopts_board_and_clears_latch:2675` |
| `alarmStatusFieldsForUi` | `test_alarm_status_fields_for_ui:2724` |

**`CnnTickTest`:**

| Kotlin test | Python |
|---|---|
| `observerSnapshotsOnQuietBoard` | `TestStreamingObserver::test_observer_snapshots_on_quiet_board:2746` |
| `observerIntervalThrottles` | `test_observer_interval_throttles:2761` |
| `snapshotCarriesAnchorWarp` | `test_snapshot_carries_anchor_warp:2772` (+ the `detSize` invariant) |
| `pendingCandidateTakesPriorityOverPeriodicCheck` | `_cnn_worker:1787-1790` |
| `singleFlightNeverOverlapsObservations` | `_observer_due:1766` (`cnnBusy`) |
| `matchOkPullsReferenceForwardFromSnapshot` | `:1953-1963` — asserts the ref is `snap.gray`, **not** `lastCur` |
| `matchOkClearsAlarm` | `:1949-1951` |
| `occupancyFallbackRescuesIdentityMismatch` | `:1912-1925` (b8b6→c6) |
| `recoveryNeedsConfirmFramesVotes` | `:2017` — **D6** |
| `recoveryCommitGrantsOneMotionWindow` | `:2066` |
| `recoveryCommitAnchorsOnObservedFrame` | `:2055` (entry.md invariant 5) |
| `gatesBlockEvaluationWhenNeitherStuckNorPeriodic` | `:1883` |
| `boardChangedDuringObservationDiscards` | `:1938` |
| `quietReanchorVetoedByConfidentCnnConflict` | `test_quiet_reanchor_vetoed_by_confident_cnn_conflict:2600` (assert only the parts you own) |

Run once, scoped:
`.\gradlew.bat :core-engine:test --tests "com.chesslab.engine.CnnTickTest" --tests "com.chesslab.engine.AlarmLatchTest"`

## Acceptance criteria

- `grep -n "desyncLastSeq" android/core-engine/src/main/kotlin/com/chesslab/engine/Alarm.kt` hits
  (per-seq streak counting).
- `grep -n "hasOccupancyConflict" android/core-engine/src/main/kotlin/com/chesslab/engine/Alarm.kt` hits
  (identity-only conflicts never alarm).
- `grep -rn "lastCur" android/core-engine/src/main/kotlin/com/chesslab/engine/CnnTick.kt`
  appears **only** inside the `snap.gray == null` fallbacks — every primary anchor is
  `snap.gray`/`snap.warped`.
- `grep -n "recoveryConfirmer.feed" .../CnnTick.kt` hits (D6 ported).
- `grep -n "occupancyOnly" .../CnnTick.kt` hits (the occupancy fallback).
- `grep -n "motionSinceRef" .../CnnTick.kt` hits (the granted motion window).
- `grep -n "fromCommit = true" .../CnnTick.kt` hits ≥ 2 and `fromCommit = false` **0**
  (entry.md invariant 6 — recovery never rebuilds the gamut).
- All tests green; `:core-engine:ktlintFormat` then `:core-engine:detekt` clean.
- `STATUS.md` row `done` + the list of alarm-release call sites phase 03 must wire.

## Do NOT

- Do NOT let anything in the detection pipeline clear the alarm. Only the seven release
  paths above. No timeout, no decay, no "it looks fine now".
- Do NOT advance the desync streak on a repeated `snap.seq`, and do NOT reset it to 0 on
  an unstable conflict set — Python resets to **1**.
- Do NOT alarm on identity-only conflicts, and never in occupancy-only mode.
- Do NOT anchor a recovery or match-ok commit on `lastCur` when `snap.gray` exists.
- Do NOT commit a recovery sequence on a single glance (D6) or while alarmed unless it
  resolves EVERY alarm conflict square.
- Do NOT implement the noise-learning freeze, the dispatch commit block or the
  quiet-re-anchor block here — phase 03 owns those gates.
- Do NOT run the observation (ONNX/warp) inside `:core-engine`; this module only schedules
  and consumes snapshots.
- Do NOT add `synchronized`/`Atomic*`/`@Volatile` — `cnnBusy` is a plain `Boolean` written
  by the single engine thread (entry.md hard rule 2).
- Do NOT read `android-legacy/**` for logic.
