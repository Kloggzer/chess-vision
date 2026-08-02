# Phase 01 — One calibration path

## Why

There are now **three** ways to re-measure the board quad and write it to the profile, and they
disagree on two axes without anybody having chosen the disagreement.

| path | optics re-measured | quad refined on grooves | `whitePov`/`margin` overrides carried |
|---|---|---|---|
| `CalibrationViewModel.remeasure` (`CalibrationViewModel.kt:207-240`) | **yes** | **no** | yes |
| `toConfirm` (`:280-298`) + `save` (`:323-338`) | no | **yes** | yes |
| `autoCalibrate` (`ui/camera/AutoCalibrateResult.kt:44-72`) | no | **yes** | **no** |

The refinement column is the one that matters. `toConfirm`'s own KDoc (`CalibrationViewModel.kt:275-278`)
argues the refinement is load-bearing and cites the most expensive measurement on record:

> the whole Python corpus was cut 3-6 px off-grid until 2026-07-31 with nothing failing, and
> re-cutting it moved the model's empty-crop margin 5.5x

`remeasure` — the wizard's one-press "Re-measure camera" button — skips it. That is not an oversight
you can quietly fix: it is **asserted**. `RemeasureTest.kt:92` reads

```kotlin
assertEquals(listOf("optics released", "converged", "detect"), calls)
```

and `RecordingDetector.refine` (`RemeasureTest.kt:38-42`) carries the bare comment *"the re-measure
sequence must not trigger a grid refinement"* with no reason given. So the app has a locked-in
behaviour, a locked-in test, and no recorded argument.

**Second, smaller, and unambiguous: a dead field and a doubled 80 ms.**
`QuadRefinement.correction` (`geometry/ArucoCalibrator.kt:79`, assigned at `:188`) is computed on
every refinement and **read by nobody** — verified by grepping all of `android/` for `.correction`.
Its own KDoc (`:73-78`) claims it exists because *"the corrected corners alone do not survive"* and
*"this is the form that can be carried"*. Nothing carries it. `LiveAlign.onGrid`
(`service/TrackerCoordinator.kt:458-478`) independently re-runs `improveQuad` + `gridCorrection` on
the first align after each calibration, and its KDoc (`:449-451`) gives the actual reason it does so:

> Measuring here rather than carrying the value from the calibration screen also means it is
> re-established after an app restart, where the screen never runs.

That reasoning is right and `LiveAlign` should keep owning it. `QuadRefinement.correction` is the
loser of a decision that was made and then not cleaned up — a field whose KDoc argues for a design
the code abandoned.

## Design (decided — do not redesign)

### Step 1: delete the dead correction — safe in isolation

Remove `QuadRefinement.correction` (`ArucoCalibrator.kt:73-79`), the `correction =` argument at
`:188`, and the now-unused `import com.chesslab.geometry.gridCorrection` at `:8`. `LiveAlign` keeps
its own import and its own measurement, untouched.

Before deleting, paste this into `STATUS.md`:

```
grep -rn "\.correction\b\|QuadRefinement(" android/app/src android/core-*/src --include=*.kt
```

It must show no reader outside `ArucoCalibrator.kt` and `TrackerCoordinator.kt`'s **private** field
of the same name (which is a different variable — do not touch it).

Add a sentence to `QuadRefinement`'s remaining KDoc saying where the live correction actually comes
from, so the next reader does not re-add the field:

> The correction itself is not carried from here. `LiveAlign` re-measures it on the first align
> after every calibration, because that is also the path an app restart takes — see
> `TrackerCoordinator.onGrid`.

### Step 2: make the three paths' difference explicit, then remove the one that has no argument

This is the part that needs judgement, so the design is: **`remeasure` gains the refinement**, and
the reason is that all three arguments point the same way.

- `toConfirm` refines because the marker quad is a few pixels off the squares. That is true of every
  ArUco quad, including the one `remeasure` produces from the same detector.
- `autoCalibrate` refines, and it is the *newer* of the two one-press paths — the branch's own
  latest answer to the same question.
- `remeasure`'s only structural difference is that it re-measures the optics **first**, which makes
  its quad *more* trustworthy, not less. There is no reason a better-lit quad should get worse
  geometry.

The one honest counter-argument is **cost**: refinement is ~80 ms at `boardSize` 1600. `remeasure`
already awaits a full optics convergence (up to seconds) and shows `Remeasure.Measuring` /
`Remeasure.Detecting` while it does. 80 ms on that path is not felt.

So: after `detectNow()` returns corners and **before** `store.saveRecalibrated`, insert the same
call `toConfirm` makes, and use the refined quad if there is one:

```kotlin
val refined = detector.refine(corners)
val use = refined?.corners ?: corners
```

`Remeasure.Recalibrated` should carry the grid figure the same way `toConfirm` does — reuse
`gridNote` (`CalibrationViewModel.kt:376-384`), do not write a second formatter.

**`RemeasureTest.kt:92` must be updated, not deleted**, to
`listOf("optics released", "converged", "detect", "refine")`, and `RecordingDetector.refine`'s
comment replaced with why the order is what it is. **The order assertion is the point of that test**
— optics before geometry — and it must survive.

If measurement on the phone shows this is felt, that is a complete result: revert step 2, write the
number into `STATUS.md`, and instead add one line to `remeasure`'s KDoc saying it deliberately does
not refine and why. Either outcome ends the ambiguity.

### Step 3: `autoCalibrate` carries the stored overrides

`autoCalibrate` (`AutoCalibrateResult.kt:59-63`) calls `saveRecalibrated` with only `savedAtMs`.
`remeasure` and `save` both pass `whitePovOverride` and `marginOverride`. `saveRecalibrated`'s own
KDoc (`CalibrationStore.kt:88`) says the profile is carried over — so the stored values survive a
null override and this is **not** currently losing data.

Leave the call as it is. Add one line of KDoc saying so explicitly, because the asymmetry reads as a
bug and will be "fixed" by somebody otherwise:

> No `whitePovOverride` or `marginOverride`: this screen cannot edit either, and
> `saveRecalibrated` carries the stored values through a null override. Passing this screen's idea
> of them would be inventing an opinion it does not have.

## Steps

1. Delete `QuadRefinement.correction` + KDoc pointer —
   commit `refactor(android): the grid correction has one owner, and it is LiveAlign`
2. `remeasure` refines; `RemeasureTest` order updated —
   commit `fix(android): the re-measure button gets the same grid the wizard gets`
3. `autoCalibrate` KDoc on the absent overrides —
   commit `docs(android): say why the aiming screen passes no orientation override`

## Tests

`app/src/test/.../ui/calibration/RemeasureTest.kt`:

1. Update `theGeometryIsMeasuredStrictlyAfterTheOpticsReportConverged` to expect
   `["optics released", "converged", "detect", "refine"]`. The **order** is the assertion.
2. New: `aRefinedQuadIsWhatTheRemeasureSaves` — a `RecordingDetector` returning a `QuadRefinement`
   with different corners; assert `backing.current!!.corners` are the refined ones, not the detected
   ones. Mirror `CalibrationViewModelTest.theConfirmedQuadIsTheRefinedOne` (`:99-121`).
3. New: `anUnmeasurableGridStillSaves` — `refine` returns null; the detected quad is saved and
   `Remeasure.Recalibrated` is still reached. This is the no-grooves board and it must not block.

```
gradlew.bat :app:ktlintFormat
gradlew.bat :app:testDebugUnitTest :app:ktlintCheck :app:detekt
```

## Acceptance criteria

- [ ] `grep -rn "correction" android/app/src/main/kotlin/com/chesslab/tracker/geometry/` returns
      nothing but the new KDoc pointer.
- [ ] All three save paths refine, or `STATUS.md` carries a measured number saying why one does not.
- [ ] `RemeasureTest`'s order assertion still fails if optics and detection are swapped — verify by
      temporarily swapping them locally, then reverting.
- [ ] `:app` unit tests green, ktlint and detekt clean.

## Do NOT / Out of scope

- Do **not** touch `LiveAlign.onGrid` or its `correction`/`correctionTried` fields. It runs on the
  analyzer's align dispatcher inside a 66 ms frame budget and it is correct as written.
- Do **not** merge the three paths into one function. They differ in the optics step for a reason
  that is documented and good (`CalibrationViewModel.kt:195-205`). This phase makes them agree about
  **geometry**, not about lifecycle.
- Do **not** add the refinement to the aim poll. `BoardDetector.refine`'s KDoc
  (`ArucoCalibrator.kt:157-162`) forbids it and `CalibrationViewModelTest.aimingNeverRefines`
  (`:124-132`) pins it.
- Do **not** change `REFINE_TOLERANCE_CELLS` (`ArucoCalibrator.kt:41`) or any threshold. This phase
  changes *which paths* refine, never *how*.
- Do **not** change `saveRecalibrated`'s signature or its override semantics.
