# Phase 03c — hypothesis: single, pair, endpoint, ambiguity

> Read `entry.md` completely first. Python is the source of truth:
> `src/chesslab/move_tracker/tracker.py`. Module `:core-engine`, package
> `com.chesslab.engine`. Phases 03a–03d run **in parallel** on disjoint files.

## Why

Step 6 is the only place evidence becomes a candidate. Everything that can fabricate a
move happens here: a pair scored from residue, a phantom whose destination is a shadow, a
promotion the diff cannot disambiguate, a knight-vs-knight tie the prior guesses. Python's
ordering is load-bearing and counterintuitive — **pair before single with CNN, single
before pair without** — because a garbage pair covering 4 residue squares always outscores
the true single when nothing verifies it (clip01 replay, on record at :3211-3217).

**Shared state:** `EngineState.kt` is created and owned by **phase 03a**. You read and
write its fields (`board`, `confirmer`, `bestScore`, `secondScore`, `candidateUci`, `note`,
`promoPending`, `tainted`, `cnnRun`, `cnnFailed`) but **never edit that file**. Missing
field → STOP and record a blocker in `STATUS.md`.

## Files you own

```
android/core-engine/src/main/kotlin/com/chesslab/engine/Hypothesis.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/PairCandidate.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/EndpointCandidate.kt
android/core-engine/src/main/kotlin/com/chesslab/engine/Ambiguity.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/HypothesisTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/PairCandidateTest.kt
android/core-engine/src/test/kotlin/com/chesslab/engine/EndpointCandidateTest.kt
```

## Design (decided — do not redesign)

The candidate type (Python's dict at :3193):

```kotlin
internal data class Candidate(
    val moves: List<Move>,          // 1 = single/endpoint/promo, 2 = pair
    val priorUsed: Boolean,
    val vote: Boolean,              // false = endpoint candidate: skips the confirmer AND the LL floor
    val note: String? = null,
)
```

### 1. `Hypothesis.kt` — `generateHypothesis(...)` (`_generate_hypothesis` :3188-3277)

Signature mirrors Python:
`internal fun EngineState.generateHypothesis(z: Map<String,Double>, scored: List<Pair<Move,Double>>, viable: List<Pair<Move,Double>>, changed: Set<String>, obsMove: Move?, best: Double, second: Double, cur: GrayImage, curBgr: BgrImage?, shadowVeto: Set<String>, blockedN: Int): Candidate?`

03d passes `blockedN = tainted.size` (entry.md invariant 4). Order:

1. **Too-much-change gate** (:3198-3209): `if (changed.size + blockedN > config.maxChanged)`:
   - only when `blockedN == 0 && changed.size <= config.maxChanged + 2` try
     `pairCandidate(z, best, shadowVeto)`; return it if non-null. A pair is **never** trusted
     while a hand is detected.
   - else `confirmer.reset()`; `markStuck("too_many_changed")`;
     `maybePatchAnomaly(changed, best, cur, curBgr)` (03d's `AnomalyPatcher.kt` — call it,
     do not implement it); if `stuckReason != null` set the note
     `"Much change (N squares + M occluded) — occluded/unstable, no move committed (base truth unchanged)"`;
     return null.
2. **Pair BEFORE single, with CNN only** (:3218-3222): `cnnOn = config.cnnVerify && cnnRun && !cnnFailed`
   (use `state.cnnOn`). If `cnnOn` → `pairCandidate(...)`, return if non-null. A reply that
   landed in the same settle window leaves a net-positive single; committing it would
   silently swallow the reply. With CNN the pair goes pending and must match the post-pair
   position, which kills ghost pairs.
3. **No single fits** (`obsMove == null || best < 0.0`, :3227-3243):
   - if `!cnnOn` → `pairCandidate(...)` here instead (conservative order);
   - if `cnnOn` → `singleEndpointCandidate(z, scored, shadowVeto)`; on a hit return
     `Candidate(listOf(sm), priorUsed = false, vote = false, note = "low-contrast move ${san(sm)}? verifying via CNN…")`.
     **`vote = false`** — the CNN verify IS its multi-frame confirmation, so it skips both
     the confirmer (step 8) and the absolute LL floor (step 6b).
   - else `confirmer.reset()`; `markStuck("no_legal_move")`; `maybePatchAnomaly(...)`; note
     `"Change on N squares, but no legal move fits — possible wrong move, base truth unchanged (resync needed?)"`;
     return null.
4. **Ambiguity gate** → `Ambiguity.kt` (below).
5. Return `Candidate(listOf(obsMove), priorUsed, vote = true)`.

### 2. `Ambiguity.kt` — the gate, promotion special case, prior rerank (:3245-3276)

Only entered when `best - second < config.ambiguityMarginLl` (2.0, LL units,
light-independent). `near = viable.filter { best - it.second < ambiguityMarginLl }`.

- **Promotion special case** (:3252-3261): when **all** `near` moves have a promotion piece
  **and** `near.map { it.from to it.to }.distinct().size == 1` — diff fundamentally cannot
  distinguish the variants:
  - `!cnnOn` → set `promoPending = PromoPending(from, to, cur, curBgr, board.fen())`, note
    `"Promotion detected — please choose piece (Q/R/B/N)"`, return null. The UI asks Q/R/B/N;
    `TrackerEngine.choosePromotion` (03d) resolves it.
  - `cnnOn` → **fall through** with the best variant (default queen); verify corrects via the
    target-square label. Note: this branch does **not** run the prior rerank.
- **else if `config.usePrior`** (:3262-3272): `rescored = near.map { it.first to it.second + movePrior(board, it.first) }.sortedByDescending { it.second }`
  (`movePrior` is 02a). Accept **only** if `rescored.size > 1 && rescored[0].second - rescored[1].second >= ambiguityMarginLl`
  → `obsMove = rescored[0].first; priorUsed = true`. Otherwise `confirmer.reset()`, note
  `"ambiguous: SAN (+s) / SAN (+s) / SAN (+s) — please move cleanly / wait briefly"` (first 3),
  return null.
- **else** `confirmer.reset()`, note `"ambiguous change — please move cleanly / wait briefly"`,
  return null.

A single-element `rescored` never passes: the guard is `size > 1`, so the margin check
cannot be skipped by having exactly one near candidate.

### 3. `PairCandidate.kt` — `pairCandidate(z, bestSingle, shadowVeto)` (`_pair_candidate` :3279-3311)

1. `pairs = loglikPairScores(board, z, config.zThr, config.llK)` (02a). Empty → null.
2. **Stricter viability re-filter on BOTH halves**, second half evaluated on the
   **intermediate** board (:3293-3302):
   ```
   val (mv1, mv2) = seq
   val b1 = board.copy(); var touched = moveTouchedSquares(board, mv1); var dests = moveDestinationSquares(board, mv1)
   b1.push(mv1)
   touched += moveTouchedSquares(b1, mv2); dests += moveDestinationSquares(b1, mv2)
   keep if touched.all { (z[it] ?: 0.0) >= config.zThr * 0.5 } && (dests intersect shadowVeto).isEmpty()
   ```
   Live evidence for why: `h2h4+Be7` (h2 decayed to 1.3) lost to a fabricated `Nf3+Be7`
   whose g1/f3 "evidence" was 1.2/1.4 sensor noise.
3. No viable pair → null.
4. `(seq, best) = viablePairs[0]`; `second = viablePairs.getOrNull(1)?.second ?: -1e9`.
   Reject when `best < 0.0 || best - max(second, bestSingle) < config.ambiguityMarginLl`.
5. On accept, **write back** `bestScore = best`, `secondScore = max(second, bestSingle)`
   (:3310) and return `Candidate(seq.toList(), priorUsed = false, vote = true)`.

### 4. `EndpointCandidate.kt` — `singleEndpointCandidate(z, scored, shadowVeto)` (`_single_endpoint_candidate` :3355-3375)

- `strong = ALL_SQUARES.filter { (z[it] ?: 0.0) >= config.zThr }`; **`strong.size != 1` → null**
  (exactly one strongly-changed square; the origin is a low-contrast vacated square below
  the both-endpoints gate).
- `cands = scored.filter { squareName(it.first.to) in strong && it.second > 0.0 && squareName(it.first.to) !in shadowVeto }`
  — `scored` is the full `loglikScores` ranking, already sorted descending. Empty → null.
- Ambiguity: for every later candidate with a **different** destination square, reject when
  `bestSc - sc < config.ambiguityMarginLl`. Candidates to the *same* destination do not
  make it ambiguous — the CNN then just confirms this one move.
- Return the top move.

## Steps

### 1. `PairCandidate.kt` — commit `feat(android-engine): pair candidate — both-halves viability on the intermediate board`
Wait for 03a's `EngineState.kt` commit to land in the working tree before compiling.

### 2. `EndpointCandidate.kt` — commit `feat(android-engine): single-endpoint candidate for low-contrast vacated origins`

### 3. `Ambiguity.kt` — commit `feat(android-engine): ambiguity gate, promotion special case, prior rerank`

### 4. `Hypothesis.kt` — commit `feat(android-engine): hypothesis step — too-much-change gate and CNN-conditional pair order`

### 5. Tests — commit `test(android-engine): hypothesis, pair and endpoint candidate parity`

## Tests

`HypothesisTest`, `PairCandidateTest`, `EndpointCandidateTest` in `com.chesslab.engine`.
Consume the phase-00b **Tier B decision-level** fixtures, step-scoped slice
`core-engine/src/test/resources/parity/steps/`: assert `bestLl`, `secondLl`, `candidate`
(uci or "uci1 uci2"), `stuck` and `note` frame by frame against the recorded Python values.
Mirror these scenarios from `tests/test_move_tracker.py`:

- `test_pair_explains_two_moves` (:2085) → `PairCandidateTest.pairExplainsTwoMoves`
- `test_pair_requires_endpoint_evidence` (:2096) → `PairCandidateTest.pairRequiresEndpointEvidence`
- `test_pair_goes_pending_with_cnn` (:1267) → `HypothesisTest.pairBeforeSingleWithCnn`
- `test_single_endpoint_candidate_unambiguous` (:1507) → `EndpointCandidateTest.unambiguousEndpoint`
- `test_single_endpoint_none_when_multi_changed` (:1520) → `EndpointCandidateTest.noneWhenMultipleStrongSquares`
- `test_ambiguity_two_knights_small_margin` (:168) → `HypothesisTest.twoKnightsAmbiguous`
- `test_promotion_waits_for_user_choice` (:1947) → `HypothesisTest.promotionWaitsForUserChoice`
- `test_choose_promotion_invalid_piece` (:1964) → covered by 03d; assert here only that the
  pending record carries `from`, `to` and the fen at detection time.
- `test_weak_target_still_wins` (:128) → `HypothesisTest.weakTargetStillViable`
- `test_castling_signature_wins` (:141) / `test_en_passant_signature_wins` (:147)
  → `HypothesisTest.castlingSignature`, `HypothesisTest.enPassantSignature`
- `test_shadow_destination_blocks_phantom_move` (:2354) → `HypothesisTest.shadowDestinationBlocksPhantomMove`
- `test_shadow_on_from_square_still_allows_move` (:2388) → `HypothesisTest.shadowOnFromSquareStillAllowsMove`
- `test_unexplained_hot_square_penalizes_noncovering_moves` (:152) → `HypothesisTest.hotUntouchedSquarePenalizes`

Named invariant tests (entry.md + specs/09):

- `HypothesisTest.taintedSquaresCountTowardMaxChanged` — invariant 4: `changed.size = 3`,
  `blockedN = 4`, `maxChanged = 6` → stuck `too_many_changed`, and **no** pair is attempted
  (`blockedN != 0`).
- `HypothesisTest.shadowVetoedDestinationBlocksTheMove` — specs/09: the move whose
  destination is shadow-vetoed is dropped from `viable` **and** from every pair; the
  from-square shadow does not block (z preserved, invariant 2 seen from this side).
- `HypothesisTest.promotionWithoutCnnYieldsPromoPending` — `cnnVerify = false` →
  `promoPending != null`, candidate null, `confirmer` untouched.
- `HypothesisTest.promotionWithCnnPassesQueenVariant` — `cnnOn` → candidate is the queen
  variant with `vote = true`, `promoPending == null`.
- `HypothesisTest.pairOrderIsCnnConditional` — identical evidence: with CNN the pair is
  returned before the single; without CNN the single wins and the pair is only reached via
  the `best < 0.0` branch.
- `PairCandidateTest.secondHalfEvaluatedOnIntermediateBoard` — a pair whose second half is
  legal only after the first half pushes must survive the viability re-filter.
- `PairCandidateTest.pairMarginBeatsBestSingleAndSecondPair` — reject when
  `best - max(second, bestSingle) < ambiguityMarginLl`, accept at the margin.
- `PairCandidateTest.pairWritesBackBestAndSecondScore` — `bestScore`/`secondScore` reflect
  the pair, not the single (:3310) — 03d's LL floor reads them.
- `EndpointCandidateTest.voteFalseSkipsConfirmerAndFloor` — the returned candidate has
  `vote == false`; assert the flag, 03d asserts the downstream exemption.
- `HypothesisTest.priorRerankNeedsTheFullMargin` — reranked top ahead by
  `ambiguityMarginLl - 0.01` → ambiguous note, null; ahead by `+0.01` → `priorUsed = true`.

Run once:
`.\gradlew.bat :core-engine:test --tests "com.chesslab.engine.HypothesisTest" --tests "com.chesslab.engine.PairCandidateTest" --tests "com.chesslab.engine.EndpointCandidateTest"`

## Acceptance criteria

- `grep -n "blockedN" .../engine/Hypothesis.kt` hits in the `changed.size + blockedN > maxChanged`
  gate and in the `blockedN == 0` pair pre-condition.
- `grep -n "cnnOn" .../engine/Hypothesis.kt` hits **twice**: the pair-before-single branch
  and the no-single-fits branch.
- `grep -n "vote = false" .../engine/Hypothesis.kt` hits exactly once (endpoint candidate).
- `grep -n "promoPending" .../engine/Ambiguity.kt` hits and is guarded by `!cnnOn`.
- `grep -n "moveDestinationSquares" .../engine/PairCandidate.kt` hits and is intersected
  with `shadowVeto`.
- `grep -n "strong.size != 1" .../engine/EndpointCandidate.kt` hits.
- `grep -rn "synchronized\|@Volatile\|Atomic\|Mutex" android/core-engine/src/main` returns nothing.
- All named tests green; ktlint/detekt clean for `:core-engine`.

## Do NOT

- **Do not edit `EngineState.kt` — it is owned by 03a.** Same for `Guards.kt`,
  `Evidence.kt`, `FrameLoop.kt` (03a), `Vetoes.kt`, `NoiseLearning.kt`, `Taint.kt` (03b),
  `Dispatch.kt`, `Commit.kt`, `AnomalyPatcher.kt`, `TrackerEngine.kt` (03d).
- Do not implement `maybePatchAnomaly`, `markStuck`, `clearStuck` or any commit path — call
  them; they are 03d's.
- Do not "simplify" the pair order to be the same with and without CNN.
- Do not let a pair through while `blockedN > 0`.
- Do not run the prior rerank on the promotion branch, and do not treat promotion variants
  as an ordinary prior tie.
- Do not compute the second half's touched/destination squares on the pre-push board.
- Do not give the endpoint candidate `vote = true` to "make it safer" — it would then be
  gated by `commitLlFloor`, which is exactly what it is exempt from.
