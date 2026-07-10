# Phase 05 — On-device analysis engine (Stockfish)

## Why

The Games/Analysis screen (phase 06) needs evaluations, best moves, and per-move
accuracy (best/good/inaccuracy/mistake/blunder). The app has `chesslib` for legality
but no evaluator. Decision: **bundle Stockfish on-device** (offline, private). This
phase delivers a clean `AnalysisEngine` interface + a pure-Kotlin accuracy classifier
so phase 06 is buildable/testable against a fake, and the real Stockfish binding behind
it. This is the pack's **highest-risk phase** (native integration + licensing) — read
the dependency contract in `entry.md`.

## Design (decided — do not redesign)

New package `com.chesslab.tracker.analysis`.

### Interface (the hard contract — phase 06 depends only on this)

```kotlin
// analysis/AnalysisEngine.kt
data class Eval(val cp: Int?, val mateIn: Int?)          // centipawns from side-to-move POV, or mate
data class PositionAnalysis(val fen: String, val eval: Eval, val bestUci: String?, val pv: List<String>, val depth: Int)

interface AnalysisEngine : Closeable {
    suspend fun analyze(fen: String, depth: Int = DEFAULT_DEPTH): PositionAnalysis
    // analyze each position of a game (before each move) → list aligned to plies
    suspend fun analyzeGame(fens: List<String>, depth: Int = DEFAULT_DEPTH): List<PositionAnalysis>
}
```

### Accuracy classifier — pure Kotlin, no native dep

```kotlin
// analysis/Accuracy.kt
enum class MoveQuality { BOOK, BEST, GOOD, INACCURACY, MISTAKE, BLUNDER }
// classify by centipawn loss = eval(before, side-to-move best) - eval(after playing the move)
fun classify(cpLossWhitePov: Int, isBookPly: Boolean): MoveQuality   // thresholds: <10 best, <50 good, <100 inacc, <250 mistake, else blunder
```

Thresholds are decided (lichess-like); tune later. This is unit-tested standalone.

### Stockfish binding — `analysis/StockfishEngine.kt`

Implements `AnalysisEngine` by speaking **UCI** to a Stockfish process/JNI. Wrapper is
pure Kotlin (parse `info depth … score cp/mate … pv …`, `bestmove …`); the native part
is the only device-specific piece.

**Native integration (decided route, with a fallback):**
- Preferred: build Stockfish from source via the NDK. Add the Stockfish source as a
  **pinned git submodule** under `android/third_party/stockfish` (source, not a binary —
  allowed) and an `externalNativeBuild { }` (CMake/ndk-build) producing
  `libstockfish.so` per ABI; call the UCI loop over a pipe (JNI) or run the packaged
  `.so` as an executable via `ApplicationInfo.nativeLibraryDir`.
- Fallback (only if the NDK build is out of session scope): a maintained,
  GPL-compatible Stockfish-Android **Maven/JitPack artifact** added to the version
  catalog. If neither is achievable this session, ship the interface + fake + accuracy
  classifier, wire phase 06 against the fake, and **STOP with a blocker** naming the
  native integration as a follow-up — do NOT vendor a prebuilt binary.

License: Stockfish is **GPL-3.0** — compatible with this GPL-3.0-or-later app. Record
the source version + license in `STATUS.md` (dependency-management contract).

### Testing double

```kotlin
// analysis/FakeAnalysisEngine.kt (main or test scope) — deterministic, no native code
```
Returns canned evals (e.g. from a fen→eval map) so phase 06 and CI need no binary.

## Steps

1. `analysis/AnalysisEngine.kt` + `analysis/Accuracy.kt` + `analysis/FakeAnalysisEngine.kt` + tests — commit `feat(android-analysis): analysis engine interface and accuracy classifier`
2. `analysis/UciParser.kt` (pure Kotlin UCI line parsing) + tests — commit `feat(android-analysis): UCI parser`
3. Native Stockfish: submodule + `externalNativeBuild` + `StockfishEngine` UCI driver — commit `feat(android-analysis): bundle Stockfish via NDK` (or, per fallback, `chore(android-analysis): catalog Stockfish artifact`)
4. `.gitignore` for `.cxx/`/NDK intermediates (before first native build) — commit `chore(android): ignore native build artifacts`

## Tests (write, run once, targeted)

- `:app:testDebugUnitTest --tests "com.chesslab.tracker.analysis.*"`: `UciParser`
  extracts cp/mate/pv/bestmove from real `info`/`bestmove` lines; `classify` returns the
  right `MoveQuality` at each threshold boundary; `FakeAnalysisEngine.analyzeGame`
  aligns outputs to input fens. **Do not** run Stockfish in a unit test (no binary in CI).

## Acceptance criteria

- [ ] `AnalysisEngine`, `Eval`, `PositionAnalysis`, `MoveQuality`, `classify`, `FakeAnalysisEngine`, `UciParser` all exist with the signatures above.
- [ ] `classify` thresholds tested at boundaries; `UciParser` tested on real UCI lines.
- [ ] Stockfish integrated via source submodule + `externalNativeBuild` (no committed `.so`/executable) — OR a blocker recorded per the fallback with the interface+fake landed.
- [ ] STATUS.md carries the Stockfish version + GPL-3.0 license note.
- [ ] `:app:testDebugUnitTest --tests com.chesslab.tracker.analysis.* :app:ktlintCheck :app:detekt` green.

## Do NOT

- Do not commit any prebuilt binary (`.so`, executable) — source submodule only.
- Do not block phase 06 on the native part — the interface + fake are the contract.
- Do not add a GPL-incompatible dependency.
- No UI in this phase.
