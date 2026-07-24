# Phase 02c — CNN observation model: occupancy, identity, recovery, preprocessing

Module `:core-cnn`, package `com.chesslab.cnn`. Runs in parallel with 02a/02b
(different modules — no shared files).

## Why

`src/chesslab/move_tracker/cnn_recovery.py` (438 LOC) is the entire CNN half of the
tracker: how a softmax vector becomes an occupancy/identity statement, when that statement
is trustworthy, how a stuck tracker recovers by searching for the move sequence that
explains the observation, and when the board is so far off that the alarm fires. The
legacy port implemented a fraction of it (`specs/12 D6`: the recovery-commit voting
confirmer was never ported at all) and none of its thresholds was ever verified.

This phase ports the whole file plus the preprocessing contract, as **pure functions over
probability arrays** — no ONNX, no pixels-to-probs. The `SquareClassifier` interface is
defined here; its ONNX implementation is phase 05c in `:app`. That split is what lets
phase 04's verify/recovery state machines be tested on the desktop JVM with a fake
classifier.

## Files you own

```
android/core-cnn/build.gradle.kts
android/core-cnn/src/main/kotlin/com/chesslab/cnn/OccupancyObservation.kt
android/core-cnn/src/main/kotlin/com/chesslab/cnn/Observations.kt
android/core-cnn/src/main/kotlin/com/chesslab/cnn/Expected.kt
android/core-cnn/src/main/kotlin/com/chesslab/cnn/Recovery.kt
android/core-cnn/src/main/kotlin/com/chesslab/cnn/DeepSearch.kt
android/core-cnn/src/main/kotlin/com/chesslab/cnn/Resync.kt
android/core-cnn/src/main/kotlin/com/chesslab/cnn/AlarmGuess.kt
android/core-cnn/src/main/kotlin/com/chesslab/cnn/Preprocess.kt
android/core-cnn/src/main/kotlin/com/chesslab/cnn/SquareClassifier.kt
android/core-cnn/src/main/kotlin/com/chesslab/cnn/CnnConfig.kt
android/core-cnn/src/test/kotlin/com/chesslab/cnn/**            (your test classes,
                                                                 incl. FakeSquareClassifier.kt)
```

Touch nothing else. `Game`/`MoveSquares` (02a, `:core-engine`) and `Crops`/`BoardGeometry`
(02b, `:core-geometry`) are read-only dependencies — if either is not yet in the tree when
you start, write against the signatures in 02a/02b and record the coupling in `STATUS.md`.

## Design (decided — do not redesign)

### `CnnConfig.kt`

Defaults from `cnn_recovery.py:125 CnnRecovery.__init__`, cross-checked against
`config.py TRACK_DEFAULTS` (which wins on conflict, `entry.md` note on `TrackerConfig`):

```kotlin
data class CnnConfig(
    val confThr: Double = 0.85,           // cnn_conf_thr
    val minAgreement: Double = 0.97,
    val marginSquares: Int = 1,
    val minConfidentBoard: Int = 32,
    val minConfidentRecovery: Int = 8,
    val recoveryMaxPlies: Int = 4,
    val beam: Int = 8,                    // cnn_recovery.py:286 derive_moves_deep(beam=8)
)
```

`marginSquares` is a count of SQUARES, not a fraction — a capture differs from a
non-capture by exactly one square at the occupancy level (`cnn_recovery.py:134-138`).
`marginSquares = 1` means "strictly better is enough"; a 0-square difference (promotion
variants `e7e8q` vs `e7e8r`) deliberately yields *no* answer.

### `OccupancyObservation.kt`

Port of `cnn_recovery.py:29`. Immutable; maps are keyed by all 64 squares.

```kotlin
data class OccupancyObservation(
    val pOcc: Map<String, Double>,
    val pEmpty: Map<String, Double>,
    val pOccluded: Map<String, Double>,
    val label: Map<String, String>? = null,
    val conf: Map<String, Double>? = null,
) {
    fun occupied(sq: String): Boolean = pOcc.getValue(sq) > pEmpty.getValue(sq)
    fun confident(thr: Double): Map<String, Boolean>
    fun labelConfident(thr: Double): Map<String, Boolean>
}
```

- `occupied` — strict `>` (`:43`).
- `confident(thr)` (`:46`) — `max(pOcc, pEmpty) >= thr && pOccluded < (1.0 - thr)`.
  Occluded-dominant squares are NEVER confident and NEVER count as occupied: a hand over
  the board must neither trigger recovery nor "occupy" squares.
- `labelConfident(thr)` (`:54`) — `conf[sq] >= thr && label[sq] != "occluded"`; when
  `label` or `conf` is null, **all 64 keys map to `false`** (not an empty map — callers
  use `getOrDefault(sq, false)` and an empty map would read the same, but the size is
  asserted in tests).

### `Observations.kt`

`observationFromProbs(perSquareProbs: Map<String, DoubleArray>, classes: List<String>)`
— port of `cnn_recovery.py:63`:

- `iEmpty = classes.indexOf("empty")` (must exist; throw otherwise),
  `iOccl = classes.indexOf("occluded")` or `null`;
- `pEmpty = probs[iEmpty]`; `pOccluded = if (iOccl != null) probs[iOccl] else 0.0`;
- `pOcc = max(0.0, 1.0 - pEmpty - pOccluded)` — the sum of the 12 piece classes, clamped
  at 0 against float drift;
- `label = classes[argmax]`, `conf = probs[argmax]`. **argmax ties go to the LOWEST index**
  (Python's `max(range(n), key=...)` keeps the first maximum) — implement the loop with a
  strict `>` comparison, not `>=`.

Class indices are always derived from the `classes` list. Never assume position.

### `Expected.kt`

- `expectedOccupancy(game): Map<String, Boolean>` — `cnn_recovery.py:103`, over all 64
  squares in `allSquares()` order.
- `expectedLabels(game): Map<String, String>` — `:108`, via `Game.labelAt` (02a), which is
  `config.label_from_piece`: `'P' -> "wP"`, `'n' -> "bN"`, empty -> `"empty"`.

### `Recovery.kt`

A stateless class `CnnRecovery(val config: CnnConfig)` — everything is a pure evaluation
over `(Game, OccupancyObservation)`.

- `scoreMoves(g, obs): Triple<Move?, Double, Double>` — `:159`. Confident squares by
  occupancy; `n < minConfidentRecovery` → `(null, 0.0, 0.0)`. For each legal move, push a
  copy, count `hits` = confident squares where `obs.occupied(sq) == (piece there after the
  move)`. Track best/second **with the exact Python update**: `if (hits > bestHits) { secondHits = bestHits; bestHits = hits; bestMv = mv }
  else if (hits > secondHits) secondHits = hits`. Reject (`null`, but still report the
  fractions) when `best < minAgreement || (bestHits - secondHits) < marginSquares`.
  Fractions are `hits / n`, and `-1` sentinels map to `0.0`.
- `verifyMove(g, mv, obs): Pair<Double, Int>` — `:188`. **LOCAL**, not whole-board:
  `checked = moveTouchedSquares(g, mv) ∩ confident`. `checked.size < 2` →
  `(0.0, checked.size)` — both endpoints must be readable, else the move stays unconfirmed
  and the multi-frame window waits for a clear view. Otherwise `hits / checked.size`.
- `verifyMoveIdentity(g, mv, obs)` — `:371`, same shape but on `labelConfident` and
  comparing `obs.label[sq]` to the label after the move.
- `boardMatchesIdentity(g, obs): IdentityCheck` — `:216`.
  `checked = squares with labelConfident`; **`checked.size < minConfidentBoard` (32) →
  `IdentityCheck(match = false, conflicts = emptyList(), n = checked.size, inconclusive = true)`**.
  This is the blind-glance guard: an inconclusive check must never be read as a mismatch.
  Otherwise `conflicts` = checked squares where `obs.label[sq] != expectedLabels[sq]`,
  `match = conflicts.isEmpty()`.
  Return a named type: `data class IdentityCheck(val match: Boolean, val conflicts: List<String>, val n: Int, val inconclusive: Boolean)`.
- `deriveMovesIdentity(g, obs, maxPlies = 1): Triple<List<Move>, Double, Double>` — `:229`.
  Confident-by-LABEL squares; `n < minConfidentRecovery` → `(emptyList(), 0.0, 0.0)`.
  `hits(b)` counts label matches. Enumerate singles first with the same best/second update
  as `scoreMoves`; accept when `best >= minAgreement && (bestHits - secondHits) >= marginSquares`.
  Only if that fails **and `maxPlies >= 2`**, enumerate all pairs (single × reply) and
  accept when `pBest >= minAgreement && (pHits - max(pSecond, bestSingleHits)) >= marginSquares`
  — the pair must beat the best SINGLE too, else the single is the more parsimonious
  explanation. The returned `second` for an accepted pair is `max(pSecond, bestSingleHits) / n`.
  On failure return `(emptyList(), best, second)` from the **singles** pass.
- `deriveMoveIdentity(g, obs)` — `:363`, the 1-ply wrapper: `deriveMovesIdentity(maxPlies = 1)`
  and take `firstOrNull()`.

### `DeepSearch.kt`

`deriveMovesDeep(g, obs, maxPlies = config.recoveryMaxPlies, beam = config.beam)` — port of
`cnn_recovery.py:285`. Conflict-guided beam search; the only way to recover from a desync
deeper than 2 plies.

1. **Channel choice**: if `obs.label != null`, work on identity (`target[sq] = obs.label[sq]`
   over label-confident squares, `value(b, sq) = labelAt(sq)`); else on occupancy
   (`target[sq] = obs.occupied(sq)` over occupancy-confident squares,
   `value(b, sq) = piece != null`). Same code path, different value function.
2. `n = confSquares.size`; `n < minConfidentRecovery` → `(emptyList(), 0.0, 0.0)`.
3. `conflicts(b)` = confident squares where `target[sq] != value(b, sq)`.
4. `finals: MutableMap<String, Pair<Int, List<Move>>>` **keyed by the PLACEMENT-ONLY FEN**
   (`Game.boardFen()`, the first FEN field). The camera cannot see whose turn it is, so a
   longer transposition to the same placement is the SAME hypothesis, not a rival that
   would destroy the acceptance margin. `note(seq, b, nConf)` stores `h = n - nConf` and
   replaces the entry when `prev == null || h > prev.first || (h == prev.first && seq.size < prev.second.size)`
   — **shortest sequence wins ties**.
5. Seed: `states = [([], board, conflicts(board))]`, and `note` the empty sequence first.
6. Repeat `maxPlies` times: for each state with a NON-EMPTY conflict set (a fully explained
   state is not expanded further), for each legal move whose `moveTouchedSquares ∩ conflicts`
   is non-empty (a move that fixes nothing is skipped), push a copy, `note` it, and collect.
   Break when nothing was generated. Then
   `nxt.sortedBy { (conflictCount, sequenceLength) }` and keep the first `beam` (= 8).
   The sort is by conflict count first, sequence length second, both ascending.
7. `ranked = finals.values.sortedWith(compareByDescending { hits }.thenBy { seq.size })`;
   `bestHits, bestSeq = ranked[0]`; `secondHits = ranked.getOrNull(1)?.hits ?: -1`;
   `best = bestHits / n`; `second = max(0.0, secondHits / n)`.
8. Accept when `bestSeq.isNotEmpty() && best >= minAgreement && (bestHits - max(secondHits, 0)) >= marginSquares`,
   else `(emptyList(), best, second)`.

The empty sequence is always in `finals` (step 5), so `ranked` is never empty and a board
that already matches yields `bestSeq = emptyList()` → not accepted. That is correct: there
is nothing to recover.

Kotlin sort note: `sortedBy`/`sortedWith` are stable, `list.sort(key=...)` in Python is
stable too, and both start from the same insertion order **within one run** — but the
legal-move order differs between chesslib and python-chess, so ties across the two
implementations are not order-comparable. Fixtures from 00b mark `top_unique`; tests
compare the sequence EXACTLY only where it is marked unique, and always compare
`best`/`second` numerically.

### `Resync.kt`

- `resyncCheck(g, obs): ResyncResult` — `:386`. `conflicts` = squares where `confident` and
  `obs.occupied(sq) != expectedOccupancy[sq]`, iterated in `allSquares()` order. No
  conflicts → `ResyncResult(match = true, conflicts = emptyList(), move = null, agreement = 1.0)`.
  Otherwise run `scoreMoves` and return
  `ResyncResult(false, conflicts, move = mv?.let(::uciOf), agreement = max(best, 0.0))`.
  `data class ResyncResult(val match: Boolean, val conflicts: List<String>, val move: String?, val agreement: Double)`.
- `hasOccupancyConflict(g, obs, confThr, conflicts): Boolean` — `:401`. `obs.label == null`
  → `false`. True when at least one conflict square is label-confident AND
  `(expected[sq] == "empty") != (obs.label[sq] == "empty")`. Identity-only conflicts (right
  occupancy, wrong piece type — the known N/B/R gap) are almost always CNN error, never
  evidence of an illegal move. This function is the gate in front of the alarm.

### `AlarmGuess.kt`

- `guessIllegalMove(g, obs, confThr): String?` — `:415`. Among label-confident squares whose
  observed label differs from expected: exactly ONE `source` (observed `"empty"`, expected
  non-empty) and exactly ONE `destination` (observed non-empty, expected `"empty"`) →
  `"$source$destination"` (a uci-like string, **no legality implied**). Any other pattern →
  `null`. `obs.label == null || obs.conf == null` → `null`.
- `buildAlarmGuessSan(g, guess): String?` — port of `tracker.py:76 _build_alarm_guess_san`.
  `guess` null/blank → null. Parse the lowercased string as `from`+`to`; unparseable →
  null. Piece at `from` is null → `"$from->$to"`. Otherwise
  `"$P $from->$to ($reason)"` where `P` is the uppercased FEN char and `reason` is
  `"castling not available"` when the piece is a KING, the file distance is exactly 2, and
  the side has no castling rights (`Game.hasCastlingRights`), else `"illegal move suspected"`.
  Format the string byte-identically — the UI and the tests both pin it.

### `Preprocess.kt`

Contract from `src/chesslab/serving.py:318-400 predict_arrays` (the `all_at_size` fast
path, which is the live path):

```kotlin
fun preprocess(crops: List<BgrImage>, outW: Int, outH: Int): FloatArray  // NCHW, size N*3*H*W
```

1. Input crops are **BGR uint8 HWC** already at `outW × outH` (that is what
   `Crops.cropsForFrame` produces). A crop of a different size is a programming error →
   `IllegalArgumentException`, do NOT resize here.
2. **BGR → RGB** (channel flip).
3. `/ 255.0f`.
4. `(x - mean) / std` per channel with ImageNet
   `mean = (0.485f, 0.456f, 0.406f)`, `std = (0.229f, 0.224f, 0.225f)`
   (`config.py:286-287 NORMALIZE_MEAN/NORMALIZE_STD`).
5. Layout **NCHW float32**, N first, then channel plane R, G, B.

`fun softmax(logProbs: FloatArray): FloatArray` — the model's head already emits
**log-probabilities** (`training/model.py:172-177 HierarchicalHead.forward` returns
`occ_term + piece_term * occ_mask`, both `log_softmax`), and Python applies
`torch.softmax` to them anyway. `softmax(log p) == p` up to normalization, so applying
softmax to the ONNX output is correct and must be kept — do NOT "optimise" it to `exp()`.
Use the max-subtracting stable form.

Classes: 14, in the fixed order
`empty, wP, wN, wB, wR, wQ, wK, bP, bN, bB, bR, bQ, bK, occluded` (`config.py:18-23 CLASSES`).
**Read the list from the model asset's `config.json` (`classes` field) — do not hardcode
it** — then `require` that it equals the expected order, failing loudly on mismatch. Put
the expected list in `Preprocess.kt` as `EXPECTED_CLASSES` used only for that assertion.

### `SquareClassifier.kt`

```kotlin
interface SquareClassifier {
    /** @param crops 64 BGR crops in allSquares() order. @return 64 x 14 PROBABILITIES. */
    fun classify(crops: List<BgrImage>): Array<FloatArray>
    val classes: List<String>
    fun close() {}
}
```

The implementation returns probabilities, not logits — softmax happens inside it. The ONNX
implementation is phase 05c in `:app`; **do not write it here**, and do not add an ONNX
dependency to `:core-cnn`.

`FakeSquareClassifier` lives in the **test** source set: constructed from a FEN (returns a
one-hot-ish distribution matching `expectedLabels` at a settable confidence) with
per-square overrides for chronic-misread and occlusion scenarios. Phase 04 will reuse it,
so make it `internal`-free and give it a stable constructor:
`FakeSquareClassifier(fen: String, conf: Double = 0.99, overrides: Map<String, Pair<String, Double>> = emptyMap())`.

### `build.gradle.kts`

`java-library` + kotlin-jvm, JDK 17, ktlint + detekt.
`api(project(":core-engine"))`, `implementation(project(":core-geometry"))`,
`testImplementation(libs.junit.jupiter)`, `testRuntimeOnly` the JUnit launcher.
No ONNX, no OpenCV, no Android. `:core-cnn`'s own tests must run without natives.

## Steps

### 1. `build.gradle.kts` + `CnnConfig.kt` — commit `build(cnn): :core-cnn module + CNN config defaults`

### 2. `OccupancyObservation.kt` + `Observations.kt` + `Expected.kt` — commit `feat(cnn): occupancy/identity observation model from per-square probabilities`

### 3. `Recovery.kt` — commit `feat(cnn): score/verify moves and whole-board identity check`

### 4. `DeepSearch.kt` — commit `feat(cnn): conflict-guided beam search recovery (4 plies, beam 8)`

### 5. `Resync.kt` + `AlarmGuess.kt` — commit `feat(cnn): resync check, occupancy-conflict gate, illegal-move guess`

### 6. `Preprocess.kt` + `SquareClassifier.kt` — commit `feat(cnn): crop preprocessing contract and SquareClassifier seam`

### 7. Tests — commit `test(cnn): observation, recovery and resync parity against python golden fixtures`

Fixtures from phase 00b (`android/core-cnn/src/test/resources/fixtures/`):

- `cnn_observation.jsonl` — `{probs: {sq: [14 floats]}, classes: [...], p_occ, p_empty, p_occluded, label, conf}`
- `cnn_derive.jsonl` — `{fen, probs, classes, conf_thr, mode: "identity"|"deep", max_plies, seq: [uci...], best, second, top_unique}`
- `cnn_resync.jsonl` — `{fen, probs, classes, conf_thr, match, conflicts: [...], move, agreement}`

If a fixture named here is absent, **STOP** and record the blocker in `STATUS.md`.
Tolerances: floats `1e-4` relative; sets, conflict lists and move sequences **EXACT**.

Test classes:

- `ObservationTest` — every `cnn_observation.jsonl` row: `pOcc/pEmpty/pOccluded/conf` within
  `1e-4`, `label` exact. Plus hand-written:
  - a 13-class run (no `"occluded"`) → `pOccluded == 0.0` everywhere and `labelConfident`
    still works;
  - `confident(0.85)`: `pEmpty = 0.9, pOccluded = 0.05` → true; `pOccluded = 0.20` → false
    (`0.20 >= 1 - 0.85`); `pOcc = 0.84` → false;
  - `occupied` is strict `>`: `pOcc == pEmpty` → false;
  - `labelConfident` with `label = "occluded"` at conf 0.99 → false;
  - `label == null` → `labelConfident` has 64 entries, all false;
  - argmax tie → the LOWEST class index wins.
- `RecoveryTest` —
  - `scoreMoves`: fewer than 8 confident squares → `(null, 0.0, 0.0)`;
    a clean `e2e4` observation → that move, `best == 1.0`;
    promotion variants `e7e8q` vs `e7e8r` (occupancy-identical, 0-square margin) → `null`,
    with `best` still reported;
  - `verifyMove` is LOCAL: a chronic confident misread on a far square (c6) does not lower
    the agreement of a correctly observed `e2e4`; only one touched square confident →
    `(0.0, 1)`; both endpoints confident and correct → `(1.0, 2)`;
    castling with `f1` occluded → `checked` is 3 of 4 and agreement is computed over 3;
  - `boardMatchesIdentity`: 31 label-confident squares → `inconclusive = true, match = false,
    conflicts empty`; 32 with one wrong → `match = false, conflicts == ["<sq>"]`;
    32 all right → `match = true`.
- `DeriveIdentityTest` —
  - `cnn_derive.jsonl` rows with `mode == "identity"`;
  - single beats pair: an observation explained by `e2e4` alone is not returned as a pair
    even with `maxPlies = 2`;
  - blitz pair: an observation matching the position after `e2e4 e7e5` returns exactly
    `["e2e4", "e7e5"]` in that order (order fixed by side to move);
  - a pair that does not beat the best single by `marginSquares` → `emptyList()`.
- `DeepSearchTest` —
  - `cnn_derive.jsonl` rows with `mode == "deep"`;
  - a 4-ply desync is recovered and the returned sequence is EXACTLY the played one;
  - **transposition collapse**: an observation reachable by two orders of the same two
    moves yields ONE final entry (assert the result is accepted, i.e. the transposition did
    not become a rival that eats the margin);
  - **tie-breaking**: when a 2-ply and a 4-ply sequence reach the same placement with the
    same hits, the 2-ply one is returned;
  - a board already matching the observation → `emptyList()` (nothing to recover), `best == 1.0`;
  - conflict-guided pruning: assert the search terminates (a `maxPlies = 4, beam = 8` run
    from the start position with a nonsense observation completes well under a second).
- `ResyncTest` — `cnn_resync.jsonl` rows exact; no conflicts → `match = true, agreement = 1.0`;
  conflicts with an explaining move → that uci; conflicts without → `move = null`.
  `hasOccupancyConflict`: label-only conflict (`wN` observed where `wB` expected) → false;
  empty-vs-occupied conflict → true; `label == null` → false.
- `AlarmGuessTest` — one source + one destination → `"e2e4"`-shaped string; two sources →
  null; zero conflicts → null. `buildAlarmGuessSan`: `"e1g1"` with a king and no castling
  rights → `"K e1->g1 (castling not available)"`; with rights → `"K e1->g1 (illegal move suspected)"`;
  empty from-square → `"e1->g1"`; garbage input → null.
- `PreprocessTest` — a 2×2 BGR crop with known bytes produces the exact expected NCHW
  float sequence (compute by hand in the test, `1e-6`); channel order is R,G,B planes;
  a wrong-sized crop throws; `softmax` of a log-probability vector reproduces the original
  probabilities within `1e-6`; `EXPECTED_CLASSES` has 14 entries in the documented order.
- `FakeSquareClassifierTest` — a smoke test that the fake yields an observation whose
  `expectedLabels` match its FEN, so phase 04 can rely on it.

Run once:
`cd android; .\gradlew.bat :core-cnn:test`
then `.\gradlew.bat :core-cnn:ktlintFormat` and `.\gradlew.bat :core-cnn:detekt`.

## Acceptance criteria

- `:core-cnn:test` green; every fixture file consumed with an asserted row count > 0.
- `grep -n "boardFen()" android/core-cnn/src/main/kotlin/com/chesslab/cnn/DeepSearch.kt` hits
  (placement-only key) and `grep -n "\.fen()" .../DeepSearch.kt` does NOT.
- `grep -n "minConfidentBoard" android/core-cnn/src/main/kotlin/com/chesslab/cnn/Recovery.kt` hits
  inside `boardMatchesIdentity` only.
- `grep -rn "onnx\|ai.onnxruntime\|org.opencv\|android" android/core-cnn/src/main/kotlin` — zero hits (case-insensitive).
- `grep -n "0.485\|0.229" android/core-cnn/src/main/kotlin/com/chesslab/cnn/Preprocess.kt` hits;
  `grep -rn "\"empty\", \"wP\"" ...` appears only in the `EXPECTED_CLASSES` assertion constant.
- ktlint/detekt clean for `:core-cnn`, zero `@Suppress`, no baseline entries.
- `STATUS.md` row 02c `done`; every Python/spec discrepancy recorded.

## Do NOT

- Do NOT implement the ONNX `SquareClassifier` — that is phase 05c, in `:app`.
- Do NOT hardcode the class list as the runtime source; read it from the asset config and
  assert the order.
- Do NOT drop the softmax on the ONNX output because the head emits log-probabilities.
- Do NOT resize, colour-correct, or CLAHE crops in `Preprocess` — geometry owns cropping
  (02b `Crops.kt`), and the tracker's CLAHE is a *detection* step, not a CNN step.
- Do NOT turn `marginSquares` into a fraction, and do NOT relax the 0-margin promotion case.
- Do NOT let `boardMatchesIdentity`'s `inconclusive` collapse into `match = false` at the
  call site — phase 04 needs the three-valued answer.
- Do NOT key `finals` on the full FEN, and do NOT add a tie-break other than shortest-sequence.
- Do NOT add coroutines, threads, or caching to this module — every function here is pure.
