# Phase 02 — `AUTO` means measured, not guessed

**Blocked by 01. Only meaningful once the framing is known, because the framing is what decides
how many sensor pixels a square gets.**

## Why

`resolutionMode` defaults to 1440p, and the reason is written into its docstring:

> *The board fills roughly a third of the frame's width from a normal seated position — 630 px of
> 1920, i.e. 79 px per square — and the CNN wants 128.*

Both halves of that argument have moved. The CNN no longer wants 128: the model declares its
input size (`infer_size`, specs/22) and the candidate this pack was proposed alongside wants
**80**. And the framing is no longer an assumption — phase 00 measured it, phase 01 controls it.

So the setting can stop being a guess about where the user sits. The app knows the delivered
frame size, the measured board quad and the model's `infer_size`; the smallest capture mode that
still feeds the network real pixels is arithmetic.

## Design (decided — do not redesign)

`ResolutionMode.AUTO` already exists as an enum value. Give it a rule:

```
need   = infer_size                                   // what the network consumes
box    = boardSize / 8 * (1 + 2 * padSide)            // crop box in warped px
        // boardSize is measuredBoardSize's output, i.e. already clamped to 320..1280
pick the smallest mode whose expected box >= need * SAFETY      // SAFETY = 1.25
```

- **`SAFETY = 1.25`, not 1.0.** A crop box exactly the size of the input has no headroom for a
  board that moves, a hand that shadows an edge, or a re-calibration that lands slightly smaller.
- **Only a mode the camera actually delivers.** The requested resolution is not the delivered one
  — this project has been burned by exactly that twice (`ResolutionMismatchLogger` exists for it).
  Decide on the **delivered** size, and if the camera ignores the request, say so and re-decide.
- **The user keeps the manual override.** AUTO becomes the default; 1080p/1440p/2160p stay
  selectable. Today's measurements were only possible because the resolution could be pinned, and
  an automatic that cannot be overridden is a debugging dead end.
- **Show what AUTO chose and why**, in the debug panel: chosen mode, delivered size, measured
  px/square, resulting crop box, the model's `infer_size`. An automatic decision that cannot be
  read back is indistinguishable from a bug.

### Do not couple it to the model switch

The model selector (`modelAsset` and its sibling, added alongside this pack) changes `infer_size`.
AUTO must therefore re-evaluate when the model changes — but `resolutionMode` is a
restart-required knob (`TrackerService:221/263/288` retarget the camera), so re-evaluating means
retargeting, not silently drifting mid-session.

## Steps

### 1. the AUTO rule — commit `feat(android): AUTO picks the capture mode from the measurement, not a seated-position guess`

### 2. debug readout — commit `feat(android): the debug panel states what AUTO chose and from which numbers`

### 3. default — commit `feat(android): AUTO is the default capture mode`

Only after 1 and 2 are green. Changing the default before it is inspectable makes every later bug
report ambiguous.

## Tests (write, run once, targeted)

1. **A large box picks the smaller mode** — 160 px/square with `infer_size` 80 must not select
   2160p.
2. **A small box picks a larger mode** — a board far away must climb, up to the largest available.
3. **`SAFETY` is respected** — a box exactly `infer_size` does not satisfy the rule.
4. **Delivered wins over requested** — a camera that answers 1080p to a 1440p request is decided
   on 1080p.

```
gradlew.bat :app:testDebugUnitTest --tests '*Resolution*'
```

Run **once**.

## Acceptance criteria

- With `infer_size = 80` and a measured 160 px/square, AUTO selects the smallest offered mode and
  the debug panel names all four inputs to that decision.
- `grep -n "R1440" android/app/src/main/kotlin/com/chesslab/tracker/settings/AppSettings.kt`
  shows AUTO as the default and R1440 still selectable.
- Targeted tests green; `:app:ktlintCheck :app:detekt` clean.

## Do NOT / out of scope

- Do not remove `resolutionMode` or its manual modes.
- Do not change `measuredBoardSize`'s clamp. If phase 00/01 show the clamp is now the binding
  limit, that is a finding for `STATUS.md` and a later pack — it changes the warp for every
  existing profile.
- Do not touch the Python side. `config.CAMERA_MODES` and the web UI's selector are a different
  pipeline with a different owner.
