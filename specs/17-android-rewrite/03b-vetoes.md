# Phase 03b — vetoes, taint/latch, noise learning

> Read `entry.md` completely first. Python is the source of truth:
> `src/chesslab/move_tracker/tracker.py`. Module `:core-engine`, package
> `com.chesslab.engine`. Phases 03a–03d run **in parallel** on disjoint files.

## Why

Two vetoes with **opposite** semantics live one line apart in Python, and the legacy port
swapped them: the shadow veto must remove a square from `changed` while **preserving its
z** (a vacated square darkens and reads as shadow — zeroing it destroys the from-evidence
of every real move), the occlusion veto must **zero z** (an occluder carries no move
information). Around them sits the taint latch, the single mechanism that keeps a resting
hand from being baked into the reference — and the rule that latched squares still count
toward `maxChanged` even though their z is zero.

**Shared state:** `EngineState.kt` is created and owned by **phase 03a**. You read and
write its fields (`tainted`, `motionOccludedSquares`, `occlusionExpiry`, `occlCoreExpiry`,
`shadowVetoed`, `occludedVetoed`, `censRaw`, `noise`, `censusNoise`, `alarm`, `cnnSnap`)
but **never edit that file**. If a field you need is missing, STOP and record a blocker in
`STATUS.md` — do not add it yourself.

## Files you own

```
android/core-engine/src/main/kotlin/com/chesslab/engine/Vetoes.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/NoiseLearning.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/Taint.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/VetoesTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/TaintTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/NoiseLearningTest.kt
```

## Design (decided — do not redesign)

### 1. `Taint.kt` — step 2's taint machinery (`_try_detect` :2853-2904)

`internal fun EngineState.applyTaints(z: MutableMap<String, Double>)`, called by 03d
straight after `computeEvidence`. Order is exact:

1. `shadowBlocked.clear()` (:2853).
2. **Baseline-occlusion taint** (:2857-2861): if `motionOccludedSquares.isNotEmpty()` →
   `tainted = cnnOcclusionFilter(motionOccludedSquares, board)`; for each returned square
   `z[sq] = 0.0` and `state.tainted[sq] = nowS + config.motionHoldS`.
3. **Resting-hand veto** (:2868-2875): `snap = cnnSnap`; if
   `snap != null && nowS - snap.tsS <= OBS_MAX_AGE_S` (3.0, tracker.py:58) and
   `snap.obs.pOccluded` is non-empty → for every `(sq, p)` with `p > 0.5`:
   `z[sq] = 0.0`, `tainted[sq] = nowS + config.motionHoldS`.
   Rationale on record: the baseline detector only runs OUTSIDE the stable states and skin
   sits inside the wood gamut, so a motionless hand surfaced as plain "change".
4. **Latch release** (:2884-2891) — iterate a *copy* of the key set:
   ```
   val exp = tainted[sq]!!
   if (nowS > exp && (lastMotionTs >= exp - config.motionHoldS || (z[sq] ?: 0.0) < config.zThr))
       tainted.remove(sq)
   else
       z[sq] = 0.0                    // EVERY frame, not only at taint time
   ```
   An occluder cannot vanish without motion. The `z < zThr` arm is the escape hatch that
   prevents a misclassification from latching a quiet board forever.
5. `occludedVetoed = (motionOccludedSquares + tainted.keys).sorted()` — latched squares ARE
   occluded squares for the UI (:2894-2895).
6. `motionOccludedSquares = mutableSetOf()`; prune `occlusionExpiry` and `occlCoreExpiry`
   to entries with `nowS < exp` (:2896-2900).

`internal fun EngineState.cnnOcclusionFilter(squares: Set<String>, board: Board): Set<String>`
(`_cnn_occlusion_filter` :1328-1351):

- no snapshot, no `obs`, no recovery, or `nowS - snap.tsS > OBS_MAX_AGE_S` →
  **`if (squares.size > 2) squares else emptySet()`** — the >2 = hand heuristic;
- otherwise `conf = obs.confident(thr)` where `thr` is the recovery model's `confThr`
  (default 0.9 — **not** `config.cnnConfThr`, :1339), and per square:
  - not confident → taint (occlusion),
  - confident **and** `board.pieceAt(sq) != null == obs.occupied(sq)` → taint (noise),
  - confident **and disagreeing** with the FEN → **do NOT taint**: that is a real move.

Expose `internal const val OBS_MAX_AGE_S = 3.0` here.

### 2. `Vetoes.kt` — step 3 (`_apply_vetoes` :3141-3176)

```kotlin
internal data class VetoResult(
    val changed: MutableSet<String>,
    val shadowVeto: Set<String>,
    val occludedSet: Set<String>,
)
internal fun EngineState.applyVetoes(
    cur: GrayImage, curBgr: BgrImage?, z: Map<String, Double>,
    changed: MutableSet<String>, cens: Map<String, Double>?,
): VetoResult
```

1. `shadowVetoed = emptyList()`; `shadowVeto = emptySet()`.
2. Only when `curBgr != null && refBgr != null && changed.isNotEmpty()`:
   - `censForVeto`: if `censRaw != null` use it; **else** (`censusZWeight == 0` fast path,
     :3155-3161) compute the band-local census locally —
     `rows = (min(box.y0 for changed) - 1, max(box.y1 for changed) + 1)` over
     `squareRegion(s, detSize, whitePov, extendUp = overhang)`, then
     `perSquareCensusChange(refGray, cur, detSize, whitePov, extendUp = overhang, refCodes = refCensusCodes(), rows = rows)`.
     That locally-computed map **is raw already**.
   - `shadows = hsvShadowSquares(refBgr, curBgr, detSize, whitePov, changed, extendUp = overhang)` (01c).
   - `shadowVeto = changed.filter { it in shadows && censForVeto.getValue(it) < config.censusThr }` —
     **`censusThr` (40.0) against the RAW census** (entry.md invariant 8; :3165-3169).
   - if non-empty: `changed -= shadowVeto`; `shadowVetoed = shadowVeto.sorted()`.
     **Never touch `z`.**
3. Return `VetoResult(changed, shadowVeto, tainted.keys.toSet())` — the occluded set is the
   *currently latched* squares, so 03d's "only photograph a clean board" guard in step 5 is
   a real condition and not a permanently-true `not set()` (:3173-3176).

### 3. `NoiseLearning.kt` — step 4 (`_try_detect` :2909-2921)

```kotlin
internal fun EngineState.learnNoise(
    diffs: Map<String, Double>, cens: Map<String, Double>?,
    changed: Set<String>, shadowVeto: Set<String>,
)
```

**Only if `alarm == null`** (entry.md invariant 9 — while the alarm is latched the
reference/game-state pairing is fiction and the persistent illegal deltas would be adapted
into the EMA, desensitising exactly the squares that prove the desync):

- gray lane: `noise.update(diffs, exclude = changed + shadowVeto)` — implicit
  `excludeAlphaScale = 0.0`, excluded squares learn **nothing** (`SquareNoise.update` :521-532);
- census lane, only when `cens != null`:
  `censusNoise.update(cens, exclude = changed + shadowVeto, excludeAlphaScale = 0.125)`.

Learning runs on **every** stable frame, including the stuck state — otherwise
marker/exposure jitter can never be adapted away. Occluded/latched squares are already out
of `changed` (their z is zero), shadowed ones are excluded explicitly: learning a shadow or
a hand into the EMA would inflate that square's std and desensitise later real moves there.

The channel-local census-guard learning path (`censusNoise.update(cens)` with no exclude,
tracker.py:3126-3127) lives in `Evidence.kt` and belongs to **03a** — do not duplicate it.

## Steps

### 1. `Taint.kt` — commit `feat(android-engine): occlusion taint — CNN arbitration, resting-hand veto, motion-gated latch release`
Wait for 03a's `EngineState.kt` commit to land in the working tree before compiling.

### 2. `Vetoes.kt` — commit `feat(android-engine): shadow veto preserves z, occlusion veto zeroes it`

### 3. `NoiseLearning.kt` — commit `feat(android-engine): per-square noise learning, frozen while the alarm is latched`

### 4. Tests — commit `test(android-engine): veto semantics, taint latch and noise-learning parity`

## Tests

`VetoesTest`, `TaintTest`, `NoiseLearningTest` in `com.chesslab.engine`. Consume the
phase-00b **Tier B decision-level** fixtures, step-scoped slice
`core-engine/src/test/resources/parity/steps/` — assert the keys `changed[]`,
`shadowVetoed[]`, `occludedVetoed[]`, `tainted[]` and the post-veto `z{}` map frame by
frame against the recorded Python values. Mirror these scenarios from
`tests/test_move_tracker.py`:

- `test_shadow_veto_removes_hand_shadow_in_detect` (:1244) → `VetoesTest.handShadowRemovedFromChanged`
- `test_hsv_shadow_detects_uniform_darkening` (:1220) / `test_hsv_shadow_ignores_real_piece` (:1228)
  → `VetoesTest.hsvShadowUniformDarkening`, `VetoesTest.hsvShadowIgnoresRealPiece`
- `test_census_low_for_uniform_darkening` (:1236) → `VetoesTest.censusLowForUniformDarkening`
- `test_hard_shadow_is_shadow_not_occlusion` (:2236) → `VetoesTest.hardShadowIsNotOcclusion`
- `test_textured_occluder_is_occluded` (:2251) → `TaintTest.texturedOccluderIsOccluded`
- `test_flat_hand_needs_chroma_to_be_occlusion` (:2262) → `TaintTest.flatHandNeedsChroma`
- `test_resting_hand_taints_and_blocks_reanchor` (:865) → `TaintTest.restingHandTaintsAndBlocksReanchor`
- `test_taint_persists_without_motion_while_evidence_hot` (:878) → `TaintTest.taintPersistsWithoutMotion`
- `test_taint_releases_on_motion_or_baseline` (:891) → `TaintTest.taintReleasesOnMotionOrBaseline`
- `test_stale_snapshot_does_not_taint` (:909) → `TaintTest.staleSnapshotFallsBackToHeuristic`
- `test_occlusion_filter_ignores_old_snapshot` (:2813) → `TaintTest.oldSnapshotIgnored`
- `test_hand_over_pieces_keeps_base_truth` (:814) → `TaintTest.handOverPiecesKeepsBaseTruth`
- `test_shadow_squares_not_learned_into_noise` (:1381) → `NoiseLearningTest.shadowSquaresNotLearned`
- `test_multiplicative_shadow_is_census_quiet` (:2194) → `VetoesTest.multiplicativeShadowIsCensusQuiet`

Named invariant tests (entry.md):

- `VetoesTest.shadowVetoPreservesZ` — invariant 2: a shadow-vetoed square leaves `changed`
  and its z is **byte-identical** before and after `applyVetoes`.
- `TaintTest.occlusionVetoZeroesZ` — invariant 2, other half: a tainted square's z is 0.0
  after `applyTaints`, on the taint frame **and on every subsequent frame** until release.
- `TaintTest.taintedSquaresCountTowardMaxChanged` — invariant 4: 3 changed + 4 latched with
  `maxChanged = 6` must reach 03c's too-much-change gate (assert `blockedN == tainted.size`
  is what `applyTaints` leaves behind, and that latched squares are NOT in `changed`).
- `TaintTest.cnnDisagreementIsNotTainted` — a confidently CNN-empty square that the FEN
  believes occupied is a real move and must pass through untainted (:1346-1350).
- `TaintTest.latchReleaseNeedsMotionOrBaselineReturn` — expired taint + no motion + hot z
  → still latched, z zeroed; add motion → released.
- `NoiseLearningTest.alarmFreezesNoiseLearning` — invariant 9: with `alarm != null` both
  `noise` and `censusNoise` are bit-identical after `learnNoise`.
- `NoiseLearningTest.censusLaneUsesExcludeAlphaScale` — excluded squares learn at
  `alpha * 0.125` in the census lane and at exactly 0 in the gray lane.
- `VetoesTest.censusThrComparesRawNotNormalized` — invariant 8: normalized value 12,
  `censRaw` 55, `censusThr = 40` → **not** shadow-vetoed.
- `VetoesTest.occludedSetIsTheLatchedSet` — the returned `occludedSet` equals
  `tainted.keys`, never an empty set (:3173-3176).

Run once:
`.\gradlew.bat :core-engine:test --tests "com.chesslab.engine.VetoesTest" --tests "com.chesslab.engine.TaintTest" --tests "com.chesslab.engine.NoiseLearningTest"`

## Acceptance criteria

- `grep -n "z\[" .../engine/Vetoes.kt` returns **nothing** — the shadow path never writes z.
- `grep -n "z\[sq\] = 0.0" .../engine/Taint.kt` hits at least three times (baseline taint,
  resting-hand veto, per-frame latch hold).
- `grep -n "alarm == null" .../engine/NoiseLearning.kt` hits, and it wraps **both** lanes.
- `grep -n "0.125" .../engine/NoiseLearning.kt` hits exactly once (census lane).
- `grep -n "censRaw" .../engine/Vetoes.kt` hits in the `censForVeto` selection.
- `grep -n "OBS_MAX_AGE_S" .../engine/Taint.kt` hits and the constant is `3.0`.
- `grep -rn "synchronized\|@Volatile\|Atomic\|Mutex" android/core-engine/src/main` returns nothing.
- All named tests green; ktlint/detekt clean for `:core-engine`.

## Do NOT

- **Do not edit `EngineState.kt` — it is owned by 03a.** Same for `Guards.kt`,
  `Evidence.kt`, `FrameLoop.kt` (03a), `Hypothesis.kt`, `PairCandidate.kt`,
  `EndpointCandidate.kt`, `Ambiguity.kt` (03c), `Dispatch.kt`, `Commit.kt`,
  `AnomalyPatcher.kt`, `TrackerEngine.kt` (03d).
- Do not zero z in the shadow path and do not preserve z in the occlusion path.
- Do not remove latched squares from the `maxChanged` accounting to "make the numbers work".
- Do not release a latch on a timer alone — the motion-or-baseline condition is the invariant.
- Do not learn noise while the alarm is latched, not even "just the quiet squares".
- Do not use `config.cnnConfThr` for `cnnOcclusionFilter` — Python reads the recovery
  model's own `conf_thr` (:1339). Record the discrepancy in `STATUS.md` if the seam from
  02c exposes only one of them.
- Do not compute the census band fast path when `censRaw` is available — that is a second,
  divergent census evaluation.
