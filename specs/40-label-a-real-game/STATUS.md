# 40 — Status

| Phase | State | Note |
|---|---|---|
| 00 — a candidate the machine cannot vouch for | `todo` | land first; 01 reviews what it writes |
| 01 — the game you review | `todo` | needs 00's `candidate.json` |
| 02 — the clip the harnesses run | `todo` | needs a confirmed candidate; the only Android work |

## What was verified before the pack was written

All greps over `android/`, `src/`, `scripts/`, `tests/`, `synth/`, excluding `android/**/bin/`.

**`frame_labels` has one consumer and it asserts nothing.** `truthFenOf` (`SimClips.kt:168-173`)
reads three of its six keys — `occluded`, `fen`, `hold` — and expands them to one FEN per video
frame. That output reaches `ObsAudit.add` (`ClipRun.kt:166-168`), and `ObsAudit` (`ObsAudit.kt:23-174`)
contains no assertion: it is `summary()`, `occupancyAccuracy()` and `clustering()`, printed by
`report()` (`CnnClipSimulationTest.kt:102-117`). `index`, `phase` and `position_index` are read by
**nothing** — `position_index` appears only where `synth/render_move_clip.py:125` writes it.

**The one move assertion is `assertBaselineReproducesGroundTruth`** (`CnnClipSimulationTest.kt:180-190`):
committed SANs against `labels.json`, nothing temporal. Its KDoc calls it "The one MOVE assertion"
(`:170`).

**Therefore a real clip omits `frame_labels`.** The cost is that it contributes nothing to the CNN
audit report. Nothing else changes. This is what makes the deliverable a review of a move list
rather than a labelling application.

## Four things expected to be gaps that are not

1. **A deterministic CNN replay exists.** `scripts/replay_clip_cnn.py::run` (`:85-140`) — virtual
   clock, device-paced observations, and `commits` as `(video_time, san, decider)` **per ply**
   (`:127-131`), already attributing a multi-move bridge's decider to every move in it. It exists
   because `emit_parity_fixtures.py:272` and `sweep_clip_params.py` both hard-code `cnn_run=None`,
   so recovery "[has] never been replayable off-device" (`replay_clip_cnn.py:5-12`).
2. **A fixture format for uncommittable real recordings exists.** `tests/test_clips.py:26-38` — the
   entry is committed, the video is dropped in gitignored `data/testclips/`. With `corners`,
   `margin`, `start_fen`, `deterministic: true` (`:49-77`) and `known_failure` / `known_committed`
   (`:120-131`) already in the schema.
3. **The `margin` defect is fixed on the Python side.** My working memory said
   `emit_parity_fixtures.py` pins `margin=0.0` and jams real ArUco footage. **That note is stale** —
   fixed in `721901a`; `margin` is read from the entry at `:252` and the measurement is on record at
   `:244-252` (2232 of 2996 frames occluded, zero commits, at `margin=0.0`). Same fix in
   `replay_clip.py:61-67` and `test_clips.py:91-96`. **The Kotlin side still has it** — see below.
4. **Neither harness wants extracted frames.** Kotlin decodes the mp4 through JavaCV
   (`ClipFrames.kt:24-47`), Python through `cv2.VideoCapture`. A fixture is a video plus a metadata
   entry.

## The one real Kotlin defect found

`ClipPipeline.kt:63` builds `BoardGeometry(boardSize = clip.boardSize)`, leaving `margin` at its
default `margins4(0.0)` (`Corners.kt:60`). `Warp.kt:55` then computes the homography with that zero.
Correct for the Blender clips, and the 6–8 % oversize for anything detected from ArUco. Phase 02.

## Corrections to the brief

- **`scripts/ingest_video_session.py` should not be extended, and this pack does not touch it.** The
  brief named it as the starting point with "a game video needs the position to change" as the gap.
  Its output is a session directory of frames sampled at one per second (`:109-111, 146-147`) with
  undetected frames silently skipped (`:151-153`). A regression clip is consumed as a *video*, at
  full rate, through *one fixed quad*. Extending it would build a lossy second path to an artefact
  neither harness reads. The gap is not that the position cannot change — it is that a clip does not
  want a session.
- **No decision row on either platform carries an alarm flag.** The brief proposed ranking by "any
  move committed while an alarm was latched". Not `DecisionRecord` (`EngineState.kt:444-473`), not
  `DebugDecision` (`api/DebugPayload.kt:44+`), not `DiagnosticsRecords.DecisionRow` (`:100-128`),
  not Python's record (`tracker.py:2799-2826`). On the phone it can only be inferred from row order,
  and the inference over-extends because a *verified* alarm restore writes no row at all
  (`TrackerEngine.kt:745`) while a latch does (`Alarm.kt:157`). The tier survives only because this
  pack's candidate comes from a replay we drive frame by frame, so `status()["alarm"]` can be
  **polled** at the commit. It is an observation the harness makes, not a property the tracker
  records, and the artefact must say so.
- **`decider` is not a per-ply field in either tracker's log.** Python records once per commit even
  when the commit pushed several moves (`tracker.py:2141` recovery, `:2556` pair) with
  `"ply": len(self.history)` taken *after* the pushes (`:2805`), so a bridge shows as a ply gap.
  Android fixed this for recovery in `specs/37` phase 00 (`CnnTick.kt:336-350`) and still records a
  pair on its last move only (`Commit.kt:149, 166`). This pack does **not** port the fix:
  `replay_clip_cnn.py:127-131` already gives a decider per ply, free.
- **The phone records no video.** `SessionRecorder` (`record/SessionRecorder.kt:59-138`) writes one
  JPEG per committed move. So a clip cannot come from a live tracking session; it must come from a
  replay over a separately filmed video. The phone's `StoredGame` — which *does* carry
  `provenance.decider` per ply (`GameRecord.kt:114-144`, `LiveGame.kt:63-80`) and exports as a PGN
  with `{cl: …}` comments (`PgnBuilder.kt:27-35`) — is a legitimate second opinion to paste in, and
  this pack builds nothing for it.

## Numbers to record when the phases land

Placeholders, deliberately. Nothing here is known yet and no phase may substitute a plausible value.

| Measurement | Where it is taken | Value |
|---|---|---|
| ArUco detection rate over a real game video | phase 00 | *not measured* |
| Per-frame quad spread about the median quad (median / p90 / max, rectified px) | phase 00 | *not measured* |
| Nominal vs realised inter-frame interval (median / max ms) | phase 00 | *not measured* |
| Refusal threshold for quad spread | chosen after the above | *not chosen* |
| Refusal threshold for fps jitter | chosen after the above | *not chosen* |
| Replay's `decider` tally vs the live game's 55 recoveries in 91 moves | phase 00 acceptance | *not measured* |
| Lead-in frames an excerpt needs before its first move | phase 02 | *not measured* |
| Real excerpt total size against the 11 MB Blender budget | phase 02 | *not measured* |

## The incident behind the pack

First fully tracked live game, 83 plies, 2026-08-02. **55 of 91 committed moves came through
`cnn_recovery`** — `Commit.kt:41`: *"position was LOST — rebuilt by the CNN, not detected"* — and 33
through the deterministic diff path, across six bridges, five of two moves and one of three. The
user corrected three moves by hand. `specs/37-a-way-back` and `specs/39-what-the-tracker-remembers`
are both about failures on that path.

The corpus that is supposed to catch those failures is twenty Blender renders at 12 fps with a
synthetic arm, and `motionHoldS` was measured against it at four values with byte-identical results
because `trackerConfigOf` reads each clip's recorded `effectiveConfig` and never a code default —
proven by setting that default to `5.00`, a value that would freeze the tracker, with no change in
output (`SimClips.kt:196`).

## Not this pack's, and noticed while reading

`/api/sessions/{sid}/slice` (`routers/sessions.py:1037-1052`) passes `sid` straight to
`labeling.run_slice`, and `/api/reslice` (`:1055-1062`) takes `session` as a **query parameter** and
reaches `config.DATA.sessions / session` (`labeling.py:441`) with no `sessions._safe_id` — the only
two session routes that skip the validation every other route applies, in an app with no
authentication anywhere. Pre-existing and unrelated. Recorded so it is not lost.
