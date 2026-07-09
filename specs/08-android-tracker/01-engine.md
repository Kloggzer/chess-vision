# Phase 01 — TrackerEngine: detection pipeline port (pure Kotlin)

## Why

The heart of the app. Port the `_try_detect` pipeline and its supporting math
from `src/chesslab/move_tracker/tracker.py` into `:engine` as deterministic,
JVM-unit-testable Kotlin. No Android, no OpenCV — inputs are pre-warped
`GrayImage`/`BgrImage` boards (phase 02/03 produce them).

## Design (decided — do not redesign)

Package `com.chesslab.engine`. Port these units 1:1 (same math, same defaults;
Python anchors are normative):

| Kotlin file | Ports | Anchor |
|---|---|---|
| `SquareDiff.kt` | `per_square_diff` (integral image, `extend_up`=overhang), `normalize_diffs` (median subtract), `square_region` (inset 0.16) | `tracker.py:88,375,68` |
| `Motion.kt` | `motion_score` (% pixels abs diff > motionPxThr), ROI motion margin logic, `_baseline_occlusion_and_shadow` (abs_thr = motionPxThr*4) | `tracker.py:299,826,327` |
| `Census.kt` | 3×3 census transform, `per_square_census_change` scaled 0..255 | `tracker.py:141,161` |
| `ShadowVeto.kt` | `hsv_shadow_squares` (v_lo 0.35, v_hi 0.97, h_tol 15, s_tol 40, frac 0.5, circular hue). RGB→HSV implemented in Kotlin (match OpenCV ranges H 0-180, S/V 0-255). | `tracker.py:198` |
| `OcclusionGamut.kt` | `board_color_gamut` (Lab a*/b* + HSV S, drop L*), `occlusion_color_squares` NN Mahalanobis thr 1.5σ. RGB→Lab in Kotlin (OpenCV 8-bit Lab convention). | `tracker.py:225,263` |
| `SquareNoise.kt` | EMA noise model per square (α 0.05, init_std 6.0, std_floor 3.0), `z()`, `update(exclude)` | `tracker.py:403-419` |
| `MoveScoring.kt` | `loglik_scores` over legal moves (z_thr, k=1.0, clip ±12), `loglik_pair_scores`, `move_prior` (capture +0.5, check +0.3, forward +0.2, cap 1.0), viability z ≥ zThr/2, `move_touched_squares` (castling/en-passant via chesslib) | `tracker.py:423-509,357` |
| `Confirmer.kt` | vote-over-frames confirmer, endpoint candidates skip vote | `tracker.py:518` |
| `Hypothesis.kt` | `_generate_hypothesis`: max_changed 6 (+2 slack), pair beats single AND 2nd pair by margin, prior tie-break, promotion-pending, anomaly patcher (nudge 5 s occupied / drift 30 s empty) | `tracker.py:2149-2333` |
| `TrackerEngine.kt` | orchestration: guards → evidence → vetoes → noise update → LL → hypothesis → motion prerequisite → confirmer → commit. Public API below. | `tracker.py:1033,1942-2060` |
| `Game.kt` | chesslib `Board` wrapper: FEN, legal moves, SAN history, game-over | `tracker.py:595,1741` |

```kotlin
class TrackerEngine(config: TrackerConfig, clock: () -> Long = System::nanoTime) {
    /** Feed one warped stable-candidate frame; emits events. */
    fun onFrame(gray: GrayImage, bgr: BgrImage, timestampNs: Long): List<TrackerEvent>
    fun reset(fen: String = STARTPOS)
    fun undo(): Boolean                     // emits hard-negative feedback record
    fun forcePromote(san: String): Boolean
    val status: TrackerStatus               // debug card data; tracker.py:2473
    /** Uncertainty signal for dynamic-resolution (phase 03) and CNN (phase 05). */
    val uncertainty: StateFlow<Uncertainty> // margin below 2×ambiguity, stuck, pending verify
    var safeguard: OccupancySafeguard?      // phase 05 plugs in; null = confirmFrames 2
}
```

Invariants (from live tuning, do not soften):
- Hand/occluded squares ALWAYS count toward `maxChanged` (`tracker.py:2158` semantics).
- Shadow veto keeps z (vacate evidence), only removes from `changed`; gamut
  occlusion ZEROES z (`tracker.py:2110-2137`, loop `:1964`).
- Base truth is the (ref image, FEN) pair — never update one without the other
  (`_set_ref` `tracker.py:1696`).
- Noise learns only on stable frames, excluding `changed ∪ shadowVeto` (`tracker.py:1984`).
- Re-anchor only when best LL < reanchorLlFloor scaled by touched/2 (`tracker.py:2011`).
- Injected clock everywhere; no direct `System.currentTimeMillis` in logic (testability).

`OccupancySafeguard` is an interface defined here (implemented in phase 05):

```kotlin
interface OccupancySafeguard {
    fun requestVerify(move: MoveCandidate, touched: List<Square>)  // non-blocking
    val verdicts: Flow<VerifyVerdict>   // FOR / AGAINST / TIMEOUT per pending move
}
```

Test fixtures: generate synthetic 512×512 warped boards in Kotlin (flat squares,
draw "pieces" as filled circles, add Gaussian noise) — no real images needed.
Golden-value tests: compute census/HSV-shadow/gamut on a small hardcoded 8×8
pixel block and compare against values produced by the Python functions (agent:
run the Python snippet once via `uv run python -c ...` to harvest expected
numbers, paste them into the test).

## Steps

1. `SquareDiff.kt` + `SquareNoise.kt` + tests — commit `feat(android-engine): per-square diff, normalization, noise model`
2. `Census.kt` + `ShadowVeto.kt` + `OcclusionGamut.kt` + golden-value tests — commit `feat(android-engine): census, hsv shadow veto, color-gamut occlusion`
3. `Motion.kt` + tests — commit `feat(android-engine): motion gate and baseline occlusion`
4. `Game.kt` + `MoveScoring.kt` + tests (scholar's mate sequence: each move's diff pattern → correct SAN) — commit `feat(android-engine): legality-filtered loglik move scoring with pair look-ahead`
5. `Confirmer.kt` + `Hypothesis.kt` + tests — commit `feat(android-engine): hypothesis generation and confirmer`
6. `TrackerEngine.kt` end-to-end test: synthetic game of ≥6 plies incl. a capture, a castling, and one occlusion (hand) interlude → full SAN history correct — commit `feat(android-engine): TrackerEngine orchestration`

## Tests (write, run once, targeted)

`cd android && ./gradlew :engine:test --tests "com.chesslab.engine.*"` — run once at the end.

## Acceptance criteria

- [ ] End-to-end synthetic game test green (capture + castling + occlusion interlude).
- [ ] `grep -rn "android\." android/engine/src/main` → no hits.
- [ ] All `TrackerConfig` defaults equal `config.TRACK_DEFAULTS` values (`src/chesslab/config.py:455-492`).
- [ ] `grep -rn "currentTimeMillis\|nanoTime()" android/engine/src/main/kotlin/com/chesslab/engine` → only in default clock argument.

## Do NOT

- No camera, warp, UI, persistence, ONNX — other phases.
- Do not implement `OccupancySafeguard` (interface only).
- Do not "improve" thresholds or algorithm order; the Python live-tuned values are ground truth.
