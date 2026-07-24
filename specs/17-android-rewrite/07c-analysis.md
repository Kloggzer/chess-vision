# Phase 07c — Stockfish analysis: native engine, eval bar, move quality

> Module `:app`, package `com.chesslab.tracker.analysis`. Behaviour reference:
> `src/chesslab/move_tracker/analysis.py` (148 LOC) — `win_chance_white` `:20-22`,
> `StockfishAnalyzer.__init__` `:31-44`, `_ensure_engine` `:69-78`, `_analyse` `:80-111`,
> `_loop` `:113-148`. Build reference: `android/app/src/main/cpp/CMakeLists.txt` (legacy,
> reused verbatim) and the git submodule `android/third_party/stockfish`.
> Runs in parallel with 07a and 07b — file ownership is strictly disjoint.
> You MAY read `android-legacy/**` for **Android API usage and the build recipe only**
> (`analysis/StockfishEngine.kt`'s `ProcessBuilder`/UCI plumbing, the CMake file, the
> `packaging` block). You MUST NOT copy its architecture: the legacy engine is a
> request/response `analyze(fen, depth)` under a `Mutex`, which is the wrong shape —
> Python's is a **persistent background poller** and that is what we port.

## Files you own

| File | Contains |
|---|---|
| `android/app/src/main/cpp/CMakeLists.txt` | the Stockfish build (moved forward from legacy, unchanged content) |
| `android/app/build.gradle.kts` | `externalNativeBuild` + `packaging` block for the native engine |
| `android/app/src/main/kotlin/com/chesslab/tracker/analysis/UciEngine.kt` | process lifecycle + UCI I/O |
| `.../analysis/StockfishAnalyzer.kt` | the persistent polling analyzer (port of `analysis.py`) |
| `.../analysis/WinChance.kt` | `winChanceWhite(cp)` |
| `.../analysis/MoveQuality.kt`, `.../analysis/Accuracy.kt` | quality enum + `classify` |
| `.../analysis/AnalysisGate.kt` | thermal/battery/tracking gating |
| `.../ui/analysis/EvalBar.kt`, `.../ui/analysis/AnalysisPanel.kt`, `.../ui/analysis/AnalysisSettingsSheet.kt` | UI |
| `.../ui/TrackingScreen.kt` | the single insertion point for the eval bar |
| `android/app/src/test/kotlin/com/chesslab/tracker/analysis/*Test.kt` | tests |

You own **nothing else**. `ui/settings/**`, `ui/Nav.kt`, `service/SettingsRepository.kt`
belong to 07a; `ui/debug/**` and the engine `api/` debug files to 07b. Because you own
`build.gradle.kts` this phase, any dependency 07a/07b needs must already be in the version
catalog — do not add one on their behalf.

`service/TrackerService.kt` (06c) is owned by nobody this phase. You code against:

```kotlin
val uiState: StateFlow<UiState>    // .fen is the current believed position; .moves the SAN history
val isTracking: StateFlow<Boolean>
```

Missing → **STOP** and record a blocker.

## Why

An eval bar is the feature that makes the phone useful *while* the game is running rather
than after it. It is also the single easiest way to destroy the tracker: Stockfish will
happily eat every core the CNN observer needs, and the frame loop is already the tight
budget (`9cd562a`: engine 100-320 ms/frame before the hot-loop rework). So the feature is
built **optional, gated, and subordinate** — never a peer of the tracking pipeline.

## Design (decided — do not redesign)

### 1. Native build (quote the existing recipe — do not re-derive it)

`android/app/src/main/cpp/CMakeLists.txt` already encodes every non-obvious requirement.
Move it forward unchanged and keep these four properties, which are the ones that break
silently if touched:

1. **Sources from the pinned submodule only** — `SF_SRC` =
   `${CMAKE_CURRENT_SOURCE_DIR}/../../../../third_party/stockfish/src`; a missing
   `main.cpp` is a `FATAL_ERROR` telling the user to run
   `git submodule update --init android/third_party/stockfish` (`CMakeLists.txt:18-24`).
   No prebuilt binary is ever committed.
2. **NNUE nets fetched at configure time with SHA-256-prefix verification.** The net names
   are parsed out of `evaluate.h` (`EvalFileDefaultNameBig|Small`, `:27-35`) so a submodule
   bump cannot desync; `chesslab_fetch_net` (`:39-63`) downloads into the build dir and
   verifies that the file's SHA-256 **starts with** the 12 hex chars embedded in the
   `nn-<hex>.nnue` file name, re-downloading on mismatch. Embedded via incbin, which
   resolves relative to the assembler's working directory = the build dir — hence the
   extra `target_include_directories(... ${CMAKE_CURRENT_BINARY_DIR})` at `:132`.
3. **An executable dressed as a shared library** (`:97-104`):
   `add_executable(stockfish ...)` with `PREFIX "lib"` / `SUFFIX ".so"`, because AGP only
   packages `lib*.so`, and `nativeLibraryDir` is the one place an app may `exec` from on
   API 29+.
4. **Per-ABI flags** (`:120-127`): `arm64-v8a` → `IS_64BIT USE_POPCNT USE_PREFETCH
   USE_NEON=8`; `x86_64` → `IS_64BIT USE_POPCNT USE_PREFETCH` + `-msse -msse2 -mssse3
   -msse4.1 -mpopcnt`; any other ABI is a `FATAL_ERROR`. Release flags `-O3
   -funroll-loops -fno-exceptions -Wall`, `NDEBUG`, `USE_PTHREADS`.

`build.gradle.kts` must carry:

```kotlin
externalNativeBuild { cmake { path = file("src/main/cpp/CMakeLists.txt"); version = "3.22.1" } }
packaging { jniLibs { useLegacyPackaging = true } }   // extracted to nativeLibraryDir so it can be exec'd
```

Without `useLegacyPackaging = true` the `.so` stays compressed inside the APK and there is
nothing to execute. License: Stockfish is GPL-3.0, this repo is GPL-3.0-or-later —
compatible; keep the header comment stating it.

### 2. `UciEngine` — process + protocol

```kotlin
class UciEngine(
    private val enginePath: String,                                  // "${appInfo.nativeLibraryDir}/libstockfish.so"
    private val processFactory: (String) -> Process = { ProcessBuilder(it).redirectErrorStream(true).start() },
) : Closeable {
    fun start(threads: Int, hashMb: Int)                             // uci → isready → setoption
    fun analyse(fen: String, movetimeMs: Long, multiPv: Int): List<PvLine>
    override fun close()                                             // "quit", grace, destroyForcibly
}
data class PvLine(val uci: String?, val cp: Int?, val mate: Int?, val depth: Int)
```

Pure JVM (`java.lang.Process` + `BufferedReader/Writer`), Android-free, fakeable via
`processFactory` — that part of the legacy class was right, reuse the shape. `cp` is
always **White's point of view** (Python: `pv["score"].white()`, `analysis.py:93`); UCI
reports side-to-move, so negate when it is Black's turn. This sign flip is the classic bug;
it gets its own test.

### 3. `StockfishAnalyzer` — port of `analysis.py`

Same contract, translated to coroutines:

- Constructor parameters and defaults **verbatim from Python** (`analysis.py:31-32`):
  `multiPv = 3`, `movetimeS = 0.4`, `threads = 2`, `hashMb = 64`.
- A single persistent engine on one background coroutine. It polls a `fenProvider`
  (`uiState.value.fen`); if the FEN is unchanged or null it sleeps 200 ms and continues
  (`_loop:122-124`).
- Always analyse a **fresh board built from the FEN** — never a shared mutable board
  (`_analyse:82`, "no shared mutation"). On Android the FEN string crosses the thread
  boundary, so this is free; keep the comment.
- Game over → result with `cp = null, mate = null, winWhite = null, lines = [], depth = 0`
  (`:85-87`).
- Result mapping (`:101-110`): `winWhite = 100.0` if `mate > 0`, `0.0` if `mate < 0`,
  else `winChanceWhite(cp)`, else `50.0`; rounded to one decimal.
- **Self-disable when the binary is absent** (`_ensure_engine` failing / `_failed`,
  `:47-48`): the whole feature disappears from the UI rather than erroring. Same on
  Android — if `libstockfish.so` is not in `nativeLibraryDir`, set `state = Unavailable`
  and never retry within the process lifetime.
- One bad analysis must not kill the loop (`:130-140`): log a warning, drop the engine so
  the next tick relaunches it, sleep 500 ms.

```kotlin
fun winChanceWhite(cp: Int): Double = 50.0 + 50.0 * (2.0 / (1.0 + exp(-0.00368208 * cp)) - 1.0)
```

Lichess' logistic, constant **verbatim** from `analysis.py:22`.

### 4. Thread & priority contract (binding — this is the "never contend with the CNN" rule)

1. Analysis runs on its **own single-threaded dispatcher**, distinct from the camera
   analyzer executor, the frame pipeline, and the ONNX observer thread (05b/05c).
2. The coroutine sets `Process.THREAD_PRIORITY_LOWEST` (`android.os.Process.setThreadPriority`)
   on entry.
3. Stockfish is launched with `Threads = 2` and `Hash = 64` — Python's values, and the
   ceiling regardless of core count. Never `availableProcessors`.
4. `AnalysisGate` **suspends** analysis (stops the engine, keeps the last result greyed
   out) when any of the following holds; it resumes on the inverse:
   - user setting off (**default off**);
   - `PowerManager.currentThermalStatus >= THERMAL_STATUS_MODERATE`;
   - battery below 20 % and not charging, or `PowerManager.isPowerSaveMode`;
   - the debug timings panel's rolling median `total` exceeds **66 ms** (i.e. the tracker
     has already dropped below 15 fps) — read it from the same published `UiState`.
5. Analysis is **never** started while a CNN observation is in flight for the first move of
   a game; more precisely, `AnalysisGate` only permits a start when `isTracking` has been
   true and stable for ≥ 3 s, so calibration and warm-up are never contended.
6. `movetimeMs = 400` is a hard cap per position. No `go infinite`, no ponder.

### 5. Move quality

Keep the legacy thresholds (they are already decided and documented) and state them here
so the file is self-contained. `cpLoss = eval(best line before the move) − eval(after the
played move)`, both from the **mover's** point of view:

| Range (cp loss) | Label |
|---|---|
| still in book | `BOOK` |
| `< 10` | `BEST` |
| `< 50` | `GOOD` |
| `< 100` | `INACCURACY` |
| `< 250` | `MISTAKE` |
| `≥ 250` | `BLUNDER` |

A negative loss (the played move beats the engine line at this depth) grades `BEST`.
Quality is computed **opportunistically**: only when a fresh analysis for the position
before the move exists. Never block a commit, never re-analyse history during a live game;
whole-game accuracy is a post-game action on the games screen (08a consumes it).

### 6. UI

- `EvalBar` — vertical bar on the board's edge, White at the bottom, filled to
  `winWhite`; centred text shows `+1.4` / `M3`; greyed with a "paused" glyph when
  `AnalysisGate` suspends; **absent entirely** when `state == Unavailable` or the setting
  is off.
- `AnalysisPanel` — top-3 lines (`multiPv = 3`) as SAN + score + depth; tapping a line
  does nothing to the game state (read-only).
- `AnalysisSettingsSheet` — on/off, movetime (0.1-2.0 s), MultiPV (1-5), threads (1-2),
  hash (16-256 MB), and a "pause on thermal/battery pressure" switch (default on). This
  sheet is 07c's own surface, reached from a long-press on the eval bar — it does **not**
  live in 07a's settings screen this phase.
- `ui/TrackingScreen.kt` gets exactly one insertion: the eval bar slot. Nothing else.

## Steps

### 1. Native build forward-port — commit `build(android-app): Stockfish from the pinned submodule via CMake, packaged as libstockfish.so`

### 2. `UciEngine` + tests — commit `feat(android-analysis): UCI process engine (multipv, White-POV scores, crash-tolerant)`

### 3. `StockfishAnalyzer` + `WinChance` — commit `feat(android-analysis): persistent polling analyzer — port of analysis.py (multipv 3, 0.4 s, self-disabling)`

### 4. `AnalysisGate` — commit `feat(android-analysis): analysis never contends with tracking — lowest priority, thermal/battery/fps gate, off by default`

### 5. Move quality — commit `feat(android-analysis): move-quality classification by centipawn loss`

### 6. Eval bar + panel + settings sheet — commit `feat(android-ui): eval bar, top-3 lines and analysis settings sheet`

Run once:
`.\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.analysis.*"`
Do **not** run `assembleDebug` — that is the orchestrator's gate (it needs the submodule
and the NNUE download).

## Tests

| Kotlin test | Guards |
|---|---|
| `winChanceMatchesPythonSamples` | `winChanceWhite` at cp ∈ {-1000,-300,-100,0,100,300,1000} within 1e-6 of `analysis.py:22`'s formula |
| `winChanceIsFiftyAtZero` | exactly 50.0 |
| `mateScoresPinTheBar` | `mate > 0` → 100.0, `mate < 0` → 0.0 (`:104`) |
| `scoresAreWhitePov` | fake process reports a Black-to-move `cp` → sign flipped (`:93`) |
| `analyzerSkipsUnchangedFen` | fake process receives exactly one `go` for a repeated FEN (`:122-124`) |
| `analyzerBuildsFreshBoardPerFen` | no cross-position state leaks between analyses (`:82`) |
| `gameOverYieldsEmptyResult` | `cp/mate/winWhite` null, `lines` empty, `depth` 0 (`:85-87`) |
| `analyzerSelfDisablesWithoutBinary` | missing path → `Unavailable`, no retry, no crash (`:47-48`) |
| `analyzerSurvivesEngineCrash` | process dies mid-analysis → warning, engine dropped, next tick relaunches (`:130-140`) |
| `engineOptionsAreThreadsTwoHashSixtyFour` | `setoption` lines asserted verbatim (`:32`) |
| `gateBlocksWhenThermalModerate` | no `start()` |
| `gateBlocksBelowFifteenFps` | median total 70 ms → suspended |
| `gateIsOffByDefault` | default settings → analyzer never starts |
| `gateRunsOnItsOwnDispatcher` | recorded thread name differs from the analyzer/observer names |
| `classifyThresholds` | the six bands, boundary values 9/10/49/50/99/100/249/250 |
| `negativeLossGradesBest` | `-40` → `BEST` |

## Acceptance criteria

- `grep -n "useLegacyPackaging" android/app/build.gradle.kts` hits `true`.
- `grep -n "add_executable(stockfish" android/app/src/main/cpp/CMakeLists.txt` hits, and
  `grep -n "PREFIX \"lib\"" ` hits.
- `grep -n "chesslab_fetch_net\|SHA256" android/app/src/main/cpp/CMakeLists.txt` hits the
  verification function.
- `grep -n "0.00368208" android/app/src/main/kotlin/com/chesslab/tracker/analysis/WinChance.kt` hits.
- `grep -n "multiPv\|movetime" .../analysis/StockfishAnalyzer.kt` shows defaults 3 / 400 ms.
- `grep -n "THREAD_PRIORITY_LOWEST" .../analysis/StockfishAnalyzer.kt` hits.
- `grep -rn "availableProcessors" android/app/src/main/kotlin/com/chesslab/tracker/analysis/`
  returns **nothing**.
- `grep -c "" android/app/src/main/kotlin/com/chesslab/tracker/ui/TrackingScreen.kt` diff
  against 06b's version shows only the eval-bar slot.
- All 16 tests green; `:app:ktlintFormat` then `:app:detekt` clean.
- `STATUS.md` row 07c `done`.

## Do NOT

- Do NOT let analysis run at default or elevated thread priority, on a shared dispatcher,
  or with more than 2 engine threads. The CNN observer's latency is the tracker's
  correctness budget, not a nice-to-have.
- Do NOT default the feature on.
- Do NOT use `go infinite`, ponder, or unbounded `depth`.
- Do NOT commit a prebuilt Stockfish binary or a NNUE net; do NOT skip the SHA-256-prefix
  verification; do NOT remove the "submodule not initialised" `FATAL_ERROR`.
- Do NOT re-analyse the whole game during live tracking.
- Do NOT let analysis mutate any game state — it is strictly read-only on the FEN.
- Do NOT copy the legacy `analyze(fen, depth)`-per-request architecture.
- Do NOT touch `ui/settings/**`, `ui/Nav.kt`, `service/SettingsRepository.kt`,
  `ui/debug/**`, `service/TrackerService.kt`, or anything under `core-*`.
- Do NOT run `assembleDebug` inside this phase.
