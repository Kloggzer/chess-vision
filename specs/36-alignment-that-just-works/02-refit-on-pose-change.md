# 02 — The correction must expire when the pose does

> Owns `service/TrackerCoordinator.kt` (`LiveAlign` only) and `core-geometry/GridCorrection.kt`.
> Independent of phases 00 and 01; may run in parallel.

## Why

This is the only place in the app where a bump to the phone does lasting, silent damage — and with
the wizard gone it is the whole remaining substance of "alignment".

`LiveAlign` re-detects the markers every `alignEvery = 3` frames, so the QUAD follows a moved board
correctly. The **grid correction** does not. `LiveAlign.correction` is measured once
(`TrackerCoordinator.kt:137-138`, guarded by `correctionTried`) and reset only by
`reset(delivered)` (`:217-222`), which fires on a calibration. So:

- the correction is a rectified-space 3×3 fitted against the board's grooves **at one pose**;
- the phone gets nudged, the quad follows, and the correction keeps being applied on top of it;
- it now describes a relationship between image and board that no longer holds, for the rest of the
  session, with no expiry, no note in the status, and no test covering the class.

The failure is exactly the one this project has already paid for once: `CLAUDE.md`'s "the whole
corpus was mis-aligned until 2026-07-31" — a few pixels of consistent offset, nothing failing
loudly, and 5.5× the empty-crop margin at stake.

`savedAtMs` is written into every profile and read by nobody, which is the same gap seen from the
storage side.

## Design

Measure how far the current quad has moved from the quad the correction was fitted at, in **cells**
— never in raw pixels, because a pixel means nothing without the board size. When it exceeds a
threshold, drop the correction and let the next frame re-fit.

```kotlin
/** Mean corner displacement between two quads, as a fraction of one cell. */
fun quadDriftCells(a: FloatArray, b: FloatArray, geom: BoardGeometry): Double
```

`LiveAlign` keeps the quad it fitted at (`fittedAt: FloatArray?`). On each alignment, if
`quadDriftCells(current, fittedAt, geom) > DRIFT_REFIT_CELLS`, clear `correction` and
`correctionTried` so the next pass measures again.

**Threshold.** Start at `0.25` cells — a quarter of a square, far above marker jitter and far below
a shift that would already be obvious. It is a starting value, not a measurement, and the KDoc must
say so: no on-device distribution of `quadDriftCells` exists yet. Do not present it as derived.

**Do not report it in the UI.** The correction re-fits on its own; a user cannot act on the number
and phase 01 deliberately keeps verdicts off the screen.

## Steps

1. **`feat(geometry): quadDriftCells`** — pure, in `GridCorrection.kt`, with tests: zero for
   identical quads, a known translation reads its own magnitude in cells, a rotation about the
   centre reads non-zero.
2. **`fix(service): the correction expires with the pose`** — `fittedAt`, the drift check, the
   reset. One `Log.i` when it drops, because a correction silently vanishing is as hard to debug as
   one silently persisting.
3. **`test(service): LiveAlign has coverage at all`** — the class currently has none. At minimum:
   a moved quad drops the correction, an unmoved quad keeps it, and `reset` clears both.

## Acceptance

- A quad displaced by more than a quarter cell from the fit pose clears the correction; one below it
  does not.
- `gradlew.bat :core-geometry:test :app:testDebugUnitTest --rerun-tasks` green.

## Do NOT

- Do not change `alignEvery`, the marker path, or `improveQuad`. The quad already follows correctly;
  only the correction's lifetime is wrong.
- Do not derive the threshold from `specs/30`'s figures. Those measure a different quantity
  (`worstCells`, post-refit) and reusing them here would be the same category error that sank the
  first draft of this pack.
- Do not surface it to the user.

## Flagged, not authorised

Found while reading this path; each is its own change and none belongs in this phase.

- **Two visible markers silently drop to a similarity fit.** `MIN_MARKERS = 2` and
  `defaultMinMarkers = 2` mean a hand covering two codes mid-game switches the geometry to
  `similarityProject` (`Homography.kt:84`) — a square-board assumption with no perspective — without
  a word in the status.
- **`LiveAlign` runs on the service scope, not the background dispatcher its KDoc claims**
  (`TrackerCoordinator.kt:115-125` against `TrackerStack.kt:61,102`).
- **A 64-cell light/dark parity check** would catch a half-square shift for free, and is the
  cheapest sanity check available on a chessboard.
