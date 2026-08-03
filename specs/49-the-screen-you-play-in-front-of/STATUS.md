# 49 — Status

| Phase | State | Note |
|---|---|---|
| — | `done` | shipped 2026-08-04, branch `worktree-agent-a920ac19b32c6c997` |

## Measured before the pack was written

From `specs/48-paper-and-ink/screenshots/dark/paper-02b-tracker-tracking.png`, 1440×3200:

| What | Height | State |
|---|---|---|
| `WAITING` | ~90 px, the largest type on the screen | a fact nothing can be done about |
| the instruction that says what to do | ~40 px, grey, beneath it | the only actionable thing there |
| empty move-list container | ~500 px | "No moves yet" in a reserved box |
| four outline buttons, none filled | ~250 px | the screen has a clear current purpose and no primary |
| eval bar | full board height | no game, no evaluation |

`TrackingScreen.kt` is 517 lines; the `ui/tracking` package is 2 221.

## What shipped

**Two layouts, chosen by one pure predicate.** `TrackingUiState` gained `task: TrackerTask`
(`START` / `RESUME_CAMERA` / `CALIBRATE` / `WATCH`) and `ready: Boolean`, both derived in
`trackingUiState` and both unit-tested in `StatusUiModelTest`. `ready` needs a live camera
DELIVERING frames onto a calibrated board; anything less is the other layout.

**A — not ready.** The raw camera frame takes the space, inside a hairline-ruled frame so it reads
as a picture; the reason is stated once at `bodyLarge` in the body colour; and the screen's one
filled button is whatever it needs now — `Calibrate`, or `Resume camera`, or nothing at all when
`TrackingSwitch` is already the filled `Start tracking`. No board, no eval bar, no move list.

**B — tracking.** The status is one row (state in the body face at `titleMedium`, fps as a `Figure`
beside it, the volatile note reserved at ONE line instead of two). The move list sizes to its
content via `weight(1f, fill = false)` and is **absent** while there is none. The eval bar is
skipped outright when analysis is off. `Recalibrate` moved into the `⋯` overflow with its
confirmation intact, leaving `Undo` and `End game` as the two things a running game is for.

## Judgement calls the pack left open

**`TrackerTask.START` shows no picture at all** — a box captioned "No camera frame yet" over a
tracker nobody has started is the reserved empty container this pack exists to remove. A weighted
`Spacer` holds the switch at the bottom so the button does not jump between states.

**`RESUME_CAMERA` is a rung the pack did not name.** A released camera used to be resolvable only
through a toggle buried in the overflow; it is now a filled `Resume camera`, which is the same rule
applied one state further.

**A latched alarm stays in layout B and gets no rung.** It is a state of a game being watched, and
the alarm card already owns the screen's filled button — adding `RESOLVE_ALARM` to the enum would
put two components in charge of one button. Asserted in `anAlarmDoesNotLeaveTheWatchingLayout`.

**The eval bar is gated from the CALLER, not inside `EvalBarSlot`.** `ui/analysis/` belongs to
specs/50's agent this session, so `BoardRow` reads `AnalysisSettingsHost.settings` and skips the
slot when analysis is off. If the two packs merge cleanly the gate could move inside the slot later;
it is one `if` either way.

**`FrameSizeGuard`'s not-calibrated note lost the words "tap Recalibrate".** It named the third of
three identical outline buttons — the exact defect §1 of the pack describes — and the control it
named is in the overflow now while the filled button reads `Calibrate`. The sentence names no
control at all, which is also what it needs to be as the NOTIFICATION text, where there is nothing
to tap. This is a string, not tracker behaviour.

**`PreviewOverlay.kt` was deleted** — 155 lines and a `cornerOffsets` assertion for a composable
**nothing has ever called**. Its `quadPoint` twin lives on in `ui/calibration/CalibrationOverlay.kt`,
which is the file that actually draws a quad. detekt cannot see this class of dead code: its unused
rules only reach `private` scope (`CLAUDE.md`).

## What the pack got wrong once built

- *"Keep it lean … this should not grow."* It did: `TrackingScreen.kt` **517 → 625**, the package
  **2 221 → 2 248** (+27 net, and only because `PreviewOverlay.kt`'s 155 lines came out). A screen
  with two layouts is more code than a screen with one; the pack's own §"The two layouts" describes
  content that did not previously exist (a camera view, a task-dependent primary). The honest
  framing is that the *package* barely moved because a real deletion paid for most of it.
- The pack's layout A says "no board, no eval bar, no move list" and lists nothing else. It does not
  say what happens with **no tracker at all**, which is the state the app OPENS in since specs/43 —
  and that state has no camera either. `START` is the answer.
- §3 says "the eval bar renders with nothing to evaluate". True, but the fix could not be made where
  it belongs (`EvalBarSlot`) without touching another agent's package this session.

## Verification

- `gradlew.bat :app:ktlintCheck :app:detekt :core-engine:detekt :core-engine:ktlintCheck
  :core-engine:test :core-geometry:test :app:testDebugUnitTest --rerun-tasks` — green.
- **No tracker behaviour moved.** `:core-engine:test` includes `ClipReplayParityTest` over the
  committed Python frames; the opt-in `-Pchesslab.sim=true --tests "com.chesslab.tracker.sim.*"`
  clip simulation was also run and is green. Nothing in `core-engine/`, `pipeline/` or `service/`
  changed except one note STRING in `FrameSizeGuard`.
- Screenshots: `screenshots/{light,dark}/play-0{1,2}-*.png`, emulator `Chesslab_Agent3` (5558) with
  `-Clip blender-opening`, 1440×3200.

## The one acceptance criterion that could NOT be met

**Layout B could not be photographed on the emulator, because the emulator cannot calibrate.**

`-Clip blender-opening` never leaves `not calibrated`: the AVD's `videofile:` camera delivers only
part of the source. Measured on 2026-08-04 with a numbered 4×3 grid clip (`camprobe.py`): of twelve
cells the app receives cells **1, 2, 5, 6, 9, 10** — the LEFT HALF of the frame, all rows. The
Blender boards sit in the middle of a 640×640 frame, so two of the four ArUco markers are always
outside the delivered image and `resolve_board_corners` never fires ("skip=waiting for markers…" in
`chesslabPerf`, every frame).

Re-authoring the clip so the whole board lands inside that left half (620 px board in a 1280×1280
source, all four markers visible and legible on screen — see the working notes) still produced
`No board yet`: the emulator's own rescale blurs the marker edges past what `ArucoCalibrator`
accepts. Five clip variants were tried (16:9 letterbox, 640×480, board at 340 px, board at 620 px,
a still `blender-resting` crop); none calibrated.

**This is not a regression and not new.** specs/48's own
`screenshots/dark/paper-02b-tracker-tracking.png` reads `not calibrated` in its top-right corner —
that screenshot is layout A's content in the old arrangement, not a tracking state. No screenshot in
this repository has ever shown a calibrated tracker on the emulator, and `docs/android-emulator.md`
does not claim one is reachable.

What covers layout B instead: `ready`, `task` and the alarm case are asserted in
`StatusUiModelTest`, and the composition is the previous layout minus the eval bar when analysis is
off, minus the empty move-list box, minus one button. **A phone run is what would close this**, and
`CLAUDE.md`'s install warning means it has to be a deliberate, backed-up one.
