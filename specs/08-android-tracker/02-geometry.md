# Phase 02 — Geometry: warp, manual calibration, experimental markerless detection

## Why

The Python tracker gets board corners per frame from ArUco markers
(`calibration.py:790`). The Android app drops ArUco entirely: the phone is
fixed top-mounted, so a one-time manual 4-corner calibration is the primary
geometry source, with the markerless line detector
(`board_corners_from_lines`, `calibration.py:656`) ported as an **experimental**
assist (suggest corners, drift check).

## Design (decided — do not redesign)

Package `com.chesslab.tracker.geometry` in `:app` (OpenCV allowed here).

```kotlin
data class BoardCorners(val a8: PointF, val h8: PointF, val h1: PointF, val a1: PointF)
data class CalibrationProfile(          // mirrors calibration.py:65-84 minus ArUco fields
    val corners: BoardCorners, val whitePov: Boolean, val boardSize: Int = 1024,
    val sourceWidth: Int, val sourceHeight: Int,   // resolution the corners were tapped at
)

class BoardWarper(profile: CalibrationProfile) {
    /** Full-res BGR warp for vetoes + half-res gray (detectScale 0.5) for diff. */
    fun warp(frame: Mat): WarpedBoard      // ports warp_from_corners calibration.py:833
    /** Rescale corners when capture resolution changes (dynamic resolution, phase 03). */
    fun forResolution(w: Int, h: Int): BoardWarper
}

object BoardDetector {                     // EXPERIMENTAL — settings toggle
    /** Port of board_corners_from_lines calibration.py:656-786. Null if no consistent grid. */
    fun detect(frame: Mat, prior: BoardCorners? = null): BoardCorners?
}

class CornerDriftMonitor(cornerJumpPx: Double = 6.0) {
    /** Experimental: periodic BoardDetector run; flags drift > threshold. */
    fun check(frame: Mat): DriftResult     // OK | DRIFTED(newCorners) | UNDETECTED
}
```

- `boardSize` 1024 (not Python's 1600 — phone CPU budget; detection runs at
  detectScale 0.5 → 512, same as desktop's effective detect size relative to
  square count is preserved: 64 px/square full, 32 px detect. Do not change.)
- Corner order and orientation invariant: **[a8, h8, h1, a1]** (`calibration.py:71`);
  wrong a8 silently transposes all labels (CLAUDE.md pitfall). Tap order in the
  calibration UI (phase 04) enforces this; `CalibrationProfile` stores it already ordered.
- `BoardDetector.detect` port outline (must match Python): grayscale + resize to
  work_width 960 → Canny(40, 120) → HoughLines with adaptive threshold fractions
  0.30/0.24/0.19 → cluster into two angle families (≥6 lines each, ≥35° apart)
  → RANSAC 9-term grid progression per family → extrapolate outer slots →
  intersect outer lines → 4 corners; map to a8..a1 by proximity to `prior`
  (`_finish_quad` `calibration.py:750`). Without a prior, return corners sorted
  by angle and mark orientation UNRESOLVED — the UI confirm-step assigns a8.
- Persistence: `CalibrationStore` — kotlinx-serialization JSON in app files dir,
  one profile per camera id.

Tests: instrumented tests are banned (memory contract), so geometry math that
doesn't need OpenCV Mat (corner rescaling, ordering, drift threshold) gets JVM
unit tests in `:app` (`testImplementation` on Robolectric NOT needed — keep the
logic in plain functions over `FloatArray` where feasible). `BoardDetector`
correctness is verified in phase 04's manual verification, not here.

## Steps

1. `BoardCorners`/`CalibrationProfile`/`CalibrationStore` + rescale logic + unit tests — commit `feat(android-geometry): calibration profile, persistence, corner rescaling`
2. `BoardWarper` (OpenCV `getPerspectiveTransform`/`warpPerspective`, dst per `compute_homography` `calibration.py:289`) — commit `feat(android-geometry): board warper full+detect scale`
3. `BoardDetector` port + `CornerDriftMonitor` — commit `feat(android-geometry): experimental markerless board detection`

## Tests (write, run once, targeted)

`cd android && ./gradlew :app:testDebugUnitTest --tests "com.chesslab.tracker.geometry.*"`

## Acceptance criteria

- [ ] Corner rescaling test: profile at 1920×1080 → `forResolution(3840, 2160)` doubles all coords.
- [ ] `grep -rn "aruco\|Aruco" android/app/src` → no hits.
- [ ] `BoardDetector` uses Canny(40,120) and threshold fractions 0.30/0.24/0.19 (`grep -n "0.30\|0.24\|0.19" …/BoardDetector.kt`).
- [ ] Corner order a8,h8,h1,a1 documented in KDoc on `BoardCorners`.

## Do NOT

- No camera access, no UI, no engine changes.
- Do not wire `CornerDriftMonitor` into anything (phase 04 wires it behind the experimental toggle).
- Do not port ArUco/MarkerTracker (`calibration.py:396-560`) — dropped by decision.
