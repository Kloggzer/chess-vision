# 35 — One seam per concern · STATUS

Branch: **`feat-telemetry-sink`**. Read `entry.md` completely before your phase file.

Opened 2026-08-02 out of a structural review of the 93 commits between `main` (`de148d3`) and
`feat-telemetry-sink`. Nothing in this pack is a live defect; every item is a place where the branch
grew a **second answer** to a question the app had already answered, and where the two will diverge
the next time one side is edited. Three of the four already have.

## Phases

| Phase | Concern | Depends on | Runs | State |
|---|---|---|---|---|
| 00 | six identical `*Host` singletons → one; `CameraLookHost` folded into `TrackerSession` | — | ∥ all | todo |
| 01 | three calibration-save paths → one geometry; delete the dead `QuadRefinement.correction` | — | ∥ all | todo |
| 02 | two copies of the source-aspect overlay contract → one composable | — | ∥ all | todo |
| 03 | `:core-geometry` exports 16 declarations, `:app` consumes 4 | — | ∥ all | todo |
| 04 | Python: one grid tile and one offset summary, not four | — | ∥ all | todo |

All five are disjoint by file. 01 and 02 both work in `ui/camera/` but on different files; the
ownership registry in `entry.md` is the authority. 04 is Python only.

## The bar

Done when each of the four questions in `entry.md`'s table has **one** answer in the code, and when
`STATUS.md` carries the grep that proves each deleted declaration had no caller. No behaviour
change, or a behaviour change named and argued in this file.

## What was verified before the pack was written

Recorded so an implementing agent does not have to re-derive it, and so a wrong entry here is
falsifiable:

- **Six `*Host` objects with identical bodies.** `SettingsRepository.kt:107`, `TrackerSession.kt:74`,
  `DebugSession.kt:48`, `TrackerStack.kt:171`, `GameSessionHost.kt:21`, `CameraLookHost.kt:16`.
  Three further `*Host` objects are a **different** shape and are out of scope:
  `AnalysisSettingsHost` (holds a value), `RecordingSettingsHost` and `SpectatorHost` (lazy
  `Context` factories).
- **`QuadRefinement.correction` has no reader.**
  `grep -rn "\.correction\b" android/ --include=*.kt` (excluding `bin/`) shows the declaration
  (`ArucoCalibrator.kt:79`), the assignment (`:188`), and `TrackerCoordinator`'s unrelated **private**
  field of the same name (`:136`). No consumer.
- **`remeasure` does not refine, and it is asserted.** `CalibrationViewModel.kt:207-240` contains no
  `refine` call; `RemeasureTest.kt:92` asserts `["optics released", "converged", "detect"]`.
- **`DEFAULT_RATIO` is declared twice** (`CalibrationRoute.kt:232`, `CameraRoute.kt:433`) and
  `"no camera frame yet"` appears twice (`CalibrationRoute.kt:222`, `CameraRoute.kt:245`).
- **`SquareOffsets.unread` is read once, in a test** (`AlignmentTruthTest.kt:222`);
  `SquareOffsets.offsets` is read once, in a test (`:223`) — production reaches it only via `worst`.
- **`BoardGray` is constructed twice per `lineGeometry`** (`Alignment.kt:118` and `:141`, reached
  from `:204` and `:205`), so `improveQuad` pays seven, against a KDoc claiming one.
- **`improve_quad`'s guard has two implementations**: `src/chesslab/alignment.py:341-354` and the
  hand-rolled `worst2 >= worst` at `scripts/check_alignment.py:112-119`, whose import block
  (`:41-44`) deliberately does not take `improve_quad`.
- **`scripts/ingest_video_session.py:74`** reads `from check_alignment import frame_offsets, judge`;
  `frame_offsets` is `chesslab.alignment.frame_offsets` re-exported by a script, reached through the
  `sys.path.insert` at `:31`.
- **`copyMakeBorder` grid tiles ×4**: `check_alignment.py:175-183`, `:208-221`,
  `web/routers/sessions.py:709-716`, `:768-777`.

## Discrepancies found (append; do not edit others' entries)

_none yet_

## Session log

_none yet_

---

### For the orchestrator

Per-agent green lights are measured against partial trees and are not trustworthy. Re-run the full
gate on the merged tree before any merge:

```
cd android && gradlew.bat :core-engine:test :core-geometry:testDebugUnitTest :app:testDebugUnitTest :app:ktlintCheck :app:detekt
cd android && gradlew.bat :app:assembleDebug
uv run pytest -q
uv run ruff check src tests synth scripts
```

Phases 00–03 are Android only and do not need the Python gate; phase 04 is Python only and does not
need the Android gate. Both are listed because the merged tree needs both.
