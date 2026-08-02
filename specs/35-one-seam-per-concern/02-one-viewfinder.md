# Phase 02 — One viewfinder

## Why

Two screens draw the analyzer's frames with a quad on top, and each has its own composable stating
the same invariant in its own words.

`CalibrationRoute.PreviewWithOverlay` (`ui/calibration/CalibrationRoute.kt:202-230`):

> The overlay maps SOURCE pixels onto the whole box, so the box must carry the source's aspect
> ratio and the image must fill it exactly — otherwise every drawn corner sits off the board.

`CameraRoute.Viewfinder` (`ui/camera/CameraRoute.kt:220-249`):

> `FillBounds` inside a box carrying the source's exact aspect ratio, the same contract the
> calibration screen's preview keeps: the overlay maps source pixels onto the whole box, so any
> letterboxing INSIDE the box would put every drawn line off the board.

Same rule, twice. The duplication is already visible in the small things — `DEFAULT_RATIO = 4f / 3f`
is declared at `CalibrationRoute.kt:232` **and** `CameraRoute.kt:433`, and the string
`"no camera frame yet"` at `CalibrationRoute.kt:222` **and** `CameraRoute.kt:245`.

And it has already produced a divergence nobody chose. The two composables compute the source size
from different places:

- `PreviewWithOverlay` takes `source = IntSize(state.frameWidth, state.frameHeight)`
  (`CalibrationRoute.kt:97`) — the size of the **Mat the detector measured the quad in**.
- `Viewfinder` takes `preview?.width` / `preview?.height` (`CameraRoute.kt:227-228`) — the size of
  the **throttled preview bitmap**, which `CameraFrameBus` produces through
  `bgrToBitmap(it, PREVIEW_MAX_SIDE)` (`TrackerService.kt:533`) and is therefore downscaled.

Both then hand a *different* `IntSize` to the same `QuadOutline`. It happens to work because the
downscale is uniform and `QuadOutline` maps proportionally — but the invariant the whole feature
rests on ("one picture, one mapping") is currently enforced twice, by different numbers, in code
that says it is the same contract. `CalibrationProfile.forResolution()` was deleted in `a7dab73`
for producing a silently wrong grid by rescaling; this is the same class of thing waiting to
happen.

## Design (decided — do not redesign)

### Step 1: one composable, in the package that owns the drawing

`QuadOutline` and `CalibrationOverlay` already live in `ui/calibration/CalibrationOverlay.kt`, and
`CameraFraming.kt:42` already reaches across to use `QuadOutline` — with a KDoc
(`CameraFraming.kt:38-40`) explaining exactly why:

> The same drawing the calibration screen uses, deliberately: the two screens must not disagree
> about where the board is, and one of them owning the renderer is how that is guaranteed rather
> than hoped for.

Apply that reasoning one level up. Move the box-and-image half into `CalibrationOverlay.kt` beside
`QuadOutline`:

```kotlin
/**
 * The analyzer's frame in a box carrying the SOURCE's aspect ratio, filled exactly.
 *
 * The one mapping contract in the app: an overlay drawn on top maps source pixels onto the whole
 * box, so any letterboxing INSIDE the box puts every drawn line off the board. Both screens that
 * draw over a camera frame go through here — two copies of this rule is how they drift.
 *
 * [source] is the frame the OVERLAY's coordinates were measured in, not the bitmap on screen. Pass
 * the preview bitmap's own size only when the overlay was measured in that bitmap.
 *
 * [fit] sizes the box by width (the whole frame is visible, letterboxed) and [Fill] by height (the
 * frame runs off both sides and the parent clips). Fit is the default: the judgement the camera
 * screen exists for is whether the board fits the FRAME, and a picture whose edges are off-screen
 * cannot answer that.
 */
@Composable
fun SourceFramedPreview(
    preview: Bitmap?,
    source: IntSize,
    modifier: Modifier = Modifier,
    fill: Boolean = false,
    overlay: @Composable BoxScope.() -> Unit,
)
```

Implementation is `Viewfinder`'s body — it is the stricter of the two, because it already handles
both fit and fill and it carries the measured note about `requiredSize` vs `aspectRatio`
(`CameraRoute.kt:231-233`):

> `requiredSize` off measured constraints, NOT `aspectRatio`: that modifier resolves the width
> constraint first, so a `fillMaxHeight` box under it silently came back at the fitted size and the
> fill toggle did nothing at all on the phone.

That note is a measured phone finding and **must survive the move verbatim**.

### Step 2: both call sites

`CameraRoute.Viewfinder` becomes a thin wrapper that supplies the framing overlay, or disappears
into the call site at `CameraRoute.kt:169`. `CalibrationRoute.PreviewWithOverlay` becomes a call
with `fill = false` and its own overlay lambda. Delete both copies of `DEFAULT_RATIO` in favour of
one beside the new composable, and both copies of `"no camera frame yet"`.

### Step 3: resolve the source-size divergence — deliberately, and write down which

**`CameraRoute` is the one to change**, and it should pass the same size `CalibrationRoute` does.
The quad it draws comes from `savedProfile()` (`CameraRoute.kt:121-126`), i.e. from
`CalibrationProfile.sourceWidth`/`sourceHeight` — which is the frame the quad was **measured** in.
So `canDrawQuad` already compares that against the preview bitmap's shape
(`CameraFraming.kt:59-69`), and the box should be built from the same numbers the outline is scaled
by. Pass `IntSize(profile.sourceWidth, profile.sourceHeight)` when a profile is drawable, and fall
back to the preview bitmap's size when it is not (no profile → grid only → any ratio that matches
the picture is right).

**This is a one-line behavioural difference on a screen the user looks at.** Prove it on the phone
before committing, and if you cannot, keep the current numbers, note it in `STATUS.md`, and land
steps 1-2 only. Steps 1 and 2 are a pure move and are worth landing on their own.

## Steps

1. `SourceFramedPreview` in `CalibrationOverlay.kt`, both call sites rewired, duplicate constants
   and strings deleted — commit `refactor(android): one viewfinder contract for both camera screens`
2. Source-size alignment (only if verified on the device) —
   commit `fix(android): the camera overlay scales by the frame the quad was measured in`

## Tests

The layout itself is judged on the phone — `CameraAxisTest`'s own KDoc says so
(`ui/camera/CameraAxisTest.kt:16-19`). What is testable is the guard, and it already exists:
`theSavedQuadIsDrawnWhenTheProfileMatchesThePictureShape` (`CameraAxisTest.kt:86-102`) covers
`canDrawQuad`.

Add to `CameraAxisTest`:

1. `aRatioComesFromTheSourceNotTheBitmap` — extract the ratio computation into a testable
   `sourceRatio(source: IntSize, fallback: Float): Float` beside the composable and assert it
   returns the fallback for a zero-sized source and `w/h` otherwise. Small, but it is the number
   that puts every line off the board when it is wrong.
2. If step 2 lands: assert that for a drawable profile the ratio comes from the profile, and for
   `canDrawQuad == false` it comes from the preview.

```
gradlew.bat :app:ktlintFormat
gradlew.bat :app:testDebugUnitTest :app:ktlintCheck :app:detekt
```

## Acceptance criteria

- [ ] `grep -rn "DEFAULT_RATIO" android/app/src --include=*.kt` returns one declaration.
- [ ] `grep -rn "no camera frame yet" android/app/src --include=*.kt` returns one occurrence.
- [ ] `ContentScale.FillBounds` appears in exactly one composable in `app/src/main`.
- [ ] The `requiredSize` vs `aspectRatio` comment survives verbatim.
- [ ] `:app` unit tests green, ktlint and detekt clean.

## Do NOT / Out of scope

- Do **not** bind a second CameraX `Preview` use case anywhere. `CameraRoute`'s KDoc
  (`CameraRoute.kt:70-72`) and MEMORY `android-single-camera-owner` record that a second binding
  froze the analyzer feed dead on every tab switch. Both screens render `TrackerSession.rawPreview`
  and that must not change.
- Do **not** reintroduce a rescale of a stored profile. `forResolution()` was deleted in `a7dab73`
  for exactly that; `canDrawQuad` refusing to draw is the correct answer to a shape mismatch.
- Do **not** unify `CalibrationOverlay` with `QuadOutline`. The labelled and unlabelled overlays are
  genuinely different drawings.
- Do **not** change `PREVIEW_MAX_SIDE` or anything in `CameraFrameBus`.
- Do **not** change the camera screen's chrome, tiles, panels or gestures. This phase touches the
  picture box and nothing else.
