# Phase 03 — `:core-geometry`'s public surface

## Why

`Alignment.kt` (465 lines, new on this branch) exports sixteen public declarations. `:app` consumes
**four**:

| consumed by `:app` | at |
|---|---|
| `worstOffset` | `geometry/ArucoCalibrator.kt:12` |
| `improveQuad` (+ `QuadImprovement`) | `ArucoCalibrator.kt:9`, `service/TrackerCoordinator.kt:12` |
| `gridCorrection` | `ArucoCalibrator.kt:8`, `TrackerCoordinator.kt:11` |
| `applyGridCorrection` | `TrackerCoordinator.kt:8` |

Everything else is public and reachable only from inside `:core-geometry` plus `AlignmentTruthTest`:
`ALIGN_BANDS` (`:31`), `ALIGN_ITERS` (`:34`), `LineGeometry` (`:47`), `LatticeSample` (`:59`),
`Lattice` (`:67`), `SquareOffsets` (`:76`), `linePositions` (`:114`), `boardLattice` (`:136`),
`lineGeometry` (`:199`), `squareOffsets` (`:249`), `frameOffsets` (`:297`), `correctQuad` (`:337`).

That is not a style complaint. CLAUDE.md records why it matters:

> detekt's unused rules (`UnusedPrivateMember`, `UnusedParameter`, `UnusedImports`) only see
> **private** scope — an `internal`/`public` function nobody calls is not detected by anything in
> this repo.

So a public surface this wide is a permanent blind spot, and it already has two occupants:

- **`SquareOffsets.unread`** (`:78`) is computed on every `squareOffsets` call (`:256-260`) and read
  at exactly one site in the repo: `AlignmentTruthTest.kt:222`.
- **`SquareOffsets.offsets`** (`:77`) — the 64-entry `LinkedHashMap` built at `:261-266` with a
  formatted `"${'a' + f}${r + 1}"` key per square. Production reaches it only through
  `SquareOffsets.worst` (`:81`), which takes `values.maxOrNull()`. Nothing in `:app` ever iterates
  it. `improveQuad` calls `worstOffset` twice, so one refinement builds and discards 128 map entries
  and 128 strings. In the Python original the dict **is** the product (`scripts/check_alignment.py`,
  `scripts/survey_alignment.py` consume it per square); the Kotlin port kept the shape and lost the
  consumer.

There is also a stale performance claim worth correcting while the file is open. `Alignment.kt:402-407`:

> Pulled across JNI once and reduced in Kotlin. … 40 native round trips against one.

`BoardGray` is constructed at `:118` (inside `linePositions`) **and** `:141` (inside `boardLattice`),
and `lineGeometry` (`:204-205`) calls both on the same `Mat`. Counting one `improveQuad`:
`worstOffset` before → 2, `correctQuad` at 3 iterations → 3, `worstOffset` after → 2. **Seven**
`cvtColor` + full-plane `Mat.get` pulls per refinement, not one. The saving the comment claims is
real in kind and wrong by 7x in its arithmetic.

## Design (decided — do not redesign)

### Step 1: narrow, one declaration at a time, driven by grep

For each of the twelve declarations listed above, run

```
grep -rn "\b<symbol>\b" android/ --include=*.kt | grep -v "/bin/" | grep -v "/build/"
```

and pick the narrowest visibility that still compiles:

- callers only inside `Alignment.kt` → `private`
- callers elsewhere in `:core-geometry` → `internal`
- a `:app` caller → stays `public`

Paste every grep into `STATUS.md`. **A declaration that only the test reaches becomes `internal`**,
not private — `AlignmentTruthTest` is in the same module and `internal` is visible to it. That is
the whole reason `internal` is the right rung here and not a cop-out.

Expected outcome, to check yourself against (verify, do not assume):

| declaration | expected |
|---|---|
| `ALIGN_BANDS`, `ALIGN_ITERS` | `internal` — used only as default parameter values in this file |
| `LineGeometry`, `LatticeSample`, `Lattice` | `internal` |
| `SquareOffsets` | `internal` |
| `linePositions`, `boardLattice`, `lineGeometry`, `squareOffsets` | `internal` |
| `frameOffsets` | `private` — sole caller is `worstOffset` at `:315`, same file |
| `correctQuad` | `internal` — callers are `improveQuad` (`:384`) and the test |

`GrooveProfile.kt` gets the same treatment. Note one thing there: `notchCentre`
(`GrooveProfile.kt:46`) is `internal` and called only from `GrooveProfile.kt:134`, same file. Make it
`private` and detekt's `UnusedParameter` will then flag `minDepth: Double = MIN_DEPTH` (`:49`) —
a parameter no caller ever overrides. **That flag is the point of this phase.** Remove the parameter
and use the constant directly, or record in `STATUS.md` why it should stay.

### Step 2: `unread` and the offsets map

`unread` has no production reader. Two options, and **take the second**:

1. Delete it — but then `AlignmentTruthTest.kt:222` loses an assertion that a correctly-read board
   has zero unreadable lines, which is a real property.
2. **Keep it, narrow `SquareOffsets` to `internal`, and stop pretending it is API.** It costs two
   `Int` increments in a loop that already runs.

For `offsets`: **do not delete it either**, and do not make `worstOffset` bypass it. The map is what
makes the metric debuggable and it is the direct analogue of the Python product. Instead, note in
its KDoc that Kotlin currently consumes only `worst`, so the next person knows the map is there for
the tooling parity and not by accident:

> The per-square map, not just the worst: the Python original's `square_offsets` returns this dict
> and `scripts/check_alignment.py` reads it square by square. Kotlin currently uses only [worst] —
> the map is kept so a phone-side diagnostic can say *where*, which is the question a single number
> never answers.

**If** you want the allocation gone, that is a separate measured change with a number attached, not
part of this phase.

### Step 3: fix the JNI comment, and optionally the double `BoardGray`

Rewrite `Alignment.kt:402-407` to say what the code does. Something like:

> Pulled across JNI in one `Mat.get` per construction and reduced in Kotlin. `Core.reduce` over a
> submat would be the obvious transcription of numpy's `mean(axis=…)`, but a measurement runs eight
> band collapses plus two whole-board ones, so the alternative is ~40 native round trips per
> construction against one. Note the construction itself is not once per refinement: `lineGeometry`
> builds one in `linePositions` and another in `boardLattice`, so `improveQuad` at three iterations
> pays seven.

Sharing one `BoardGray` between `linePositions` and `boardLattice` inside `lineGeometry` would
remove two of the seven for free. **That is a behaviour-preserving optimisation on the align
dispatcher and is in scope only if you can show the outputs are bit-identical** — add a test that
runs `lineGeometry` before and after on the same `Mat` and asserts equal `xs`/`ys`/slopes. If you
cannot show that, leave the code and land the comment fix alone.

## Steps

1. Visibility narrowing across `Alignment.kt` and `GrooveProfile.kt`, with the greps in `STATUS.md`
   — commit `refactor(geometry): the module exports what the app uses, and no more`
2. `minDepth` parameter resolved; `SquareOffsets` KDoc on why the map exists —
   commit `docs(geometry): say what the per-square map is kept for`
3. The JNI comment corrected —
   commit `docs(geometry): the gray plane is built seven times per refinement, not once`
4. **Optional, only with a bit-identity test:** share one `BoardGray` per `lineGeometry` —
   commit `perf(geometry): one gray plane per measurement instead of two`

## Tests

`AlignmentTruthTest` must still compile and pass unchanged in **content**. Where a narrowing breaks
it, the fix is the visibility rung (`internal`), never a widening back to `public` and never a
`@Suppress`.

Two of that file's assertions are tautologies and should be replaced while you are in it — they cost
nothing and give false coverage:

- `AlignmentTruthTest.kt:210` — `assertEquals(lattice.size, lattice.dst.size)`. `dst` is
  `samples.map { it.dst }` (`Alignment.kt:72`); a `map` preserves length. Replace with an assertion
  on the expected sample **count** for a known board (`ALIGN_BANDS` × 2 axes × 7 interior lines,
  minus whatever is unreadable) so a lattice that silently loses a band fails.
- `AlignmentTruthTest.kt:211` — counts `axis == 0` plus `axis == 1` and compares to `size`. Every
  sample's axis comes from `for (axis in 0..1)` (`Alignment.kt:145`), so this cannot fail. Replace
  with `assertEquals(count(axis == 0), count(axis == 1))`, which does discriminate.

One more, and it is the important one: `theRefinementNeverMakesAQuadWorse` (`:355-362`) begins

```kotlin
val quad = result.quad ?: return
assertTrue(result.after < result.before, "kept a quad that did not improve")
```

Line 358 exits the test silently when `improveQuad` declines to change an already-good quad — the
likely case for the truth quad — and line 359 is itself a tautology, since `improveQuad` returns a
non-null quad **only** when `after < before` (`Alignment.kt:386-387`). So the safety contract the
live path depends on is guarded by a body that may never run. Give the test a **bent** quad so the
refinement is guaranteed to fire, and `assertNotNull(result.quad)` before the rest. The Python
original has the same hole (`tests/test_alignment.py:238-241`); note in `STATUS.md` that it does, so
the Python side can be fixed separately.

```
gradlew.bat :core-geometry:ktlintFormat
gradlew.bat :core-geometry:testDebugUnitTest :core-geometry:ktlintCheck :core-geometry:detekt
```

## Acceptance criteria

- [ ] `:app` compiles with no change to any file under `android/app/`.
- [ ] Every narrowing has its grep pasted in `STATUS.md`.
- [ ] `AlignmentTruthTest` passes; the two tautologies are gone; the refinement test asserts a
      non-null quad.
- [ ] `:core-geometry` ktlint and detekt clean, zero new findings, no `@Suppress` added.
- [ ] The JNI comment's arithmetic matches the code.

## Do NOT / Out of scope

- Do **not** change any numeric constant, threshold, band count, iteration count or tolerance.
  `SEARCH_FRAC`, `CENTROID_FRAC`, `MIN_DEPTH`, `ALIGN_BANDS`, `ALIGN_ITERS` and `REFINE_TOLERANCE_CELLS`
  are calibrated against analytic truth and against the Python original. Visibility only.
- Do **not** "simplify" the port away from its Python counterpart. Line-for-line correspondence with
  `src/chesslab/alignment.py` is the reason this code can be trusted; a divergence here is
  unfalsifiable on a phone.
- Do **not** touch `Mat3.kt`'s hand-rolled 3x3 arithmetic. `Mat3.kt:5-13` explains why it exists
  instead of `Core.invert`/`gemm` (no native allocation to release on ~12 paths per frame) and the
  reasoning holds.
- Do **not** add `@VisibleForTesting`. `internal` already reaches the same-module test and is a
  compiler-enforced rung rather than an annotation.
- Do **not** touch `src/chesslab/alignment.py`. Its public surface has the same question and a
  different answer — the scripts genuinely consume it.
