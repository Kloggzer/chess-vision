# 40 — Label a real game

> **Status:** `todo`. Three phases, in order. 00 produces the artefact 01 reviews; 02 is what makes
> the reviewed artefact a test. 02 is the only phase that touches Kotlin and can land last or not
> at all — the Python gate works without it.

## Why

The regression corpus is **entirely synthetic**. Twenty Blender renders in
`tests/data/testclips/`, 640×640 at 12 fps, with a rendered arm as the only occluder; eighteen of
them carry a parity fixture and form the Android simulation's whole clip catalogue
(`android/core-engine/src/test/resources/parity/index.json`). Two measurements say that is no
longer enough.

**The corpus has a proven blind spot.** `motionHoldS` was re-measured against it at 0.34, 0.32,
0.20 and 0.10 and returned byte-identical results. The cause is not a tolerance — it is that
`trackerConfigOf` (`android/app/src/test/kotlin/com/chesslab/tracker/sim/SimClips.kt:205-252`)
builds every clip's config field-for-field out of that clip's recorded `effectiveConfig` and never
reads a Kotlin default. The function's own KDoc records the proof: a default of `motionHoldS = 5.00`
— a value that would freeze the tracker — changed nothing (`SimClips.kt:196`).

That is correct behaviour for a port-parity instrument, and it has a consequence this pack must
design around: **whatever config a new fixture records is what the simulation will run it at,
forever.** A real clip is not exempt. Phase 02 says what a real clip records and why.

**The corpus is not representative.** The first fully tracked live game (83 plies, 2026-08-02)
committed **55 of 91 moves through `cnn_recovery`** and 33 through the deterministic diff path,
across six distinct bridges — five of two moves, one of three. `cnn_recovery` is not a detection:
`Commit.kt:41` calls it *"position was LOST — rebuilt by the CNN, not detected"*. The clips
exercise the path that works. The live board exercises the one that fabricates — every failure in
`specs/37-a-way-back` and `specs/39-what-the-tracker-remembers` came out of it.

## What I verified first, and what it settled

The brief asked whether a fixture needs anything temporal before designing a tool to produce it.
It does not. Measured, not assumed:

**`frame_labels` has exactly one consumer in the repository.** `truthFenOf`
(`SimClips.kt:168-173`), which reads three of its six keys — `occluded`, `fen`, `hold` — and
expands them into one FEN per video frame. `index`, `phase` and `position_index` are read by
**nothing**: `position_index` appears only where `synth/render_move_clip.py:125` writes it, and
`phase` only in the writers (`synth/render_move_clip.py:97-143`,
`scripts/generate_blender_testclips.py:399-405`). Greps run over `android/`, `src/`, `scripts/`,
`tests/` and `synth/`, excluding `android/**/bin/`.

**And that one consumer asserts nothing.** `truthFenOf`'s output reaches `ObsAudit.add`
(`ClipRun.kt:166-168`), and `ObsAudit` (`ObsAudit.kt:23-174`) has no assertion in it — it is
`summary()`, `occupancyAccuracy()` and `clustering()`, printed by `report()`
(`CnnClipSimulationTest.kt:102-117`). It scores the CNN's per-crop reads against the true position.
It is a measurement of a *model*, not a gate on the *tracker*.

**The one move assertion is `assertBaselineReproducesGroundTruth`** (`CnnClipSimulationTest.kt:180-190`),
which compares the diff-only run's committed SANs against `labels.json` and nothing else. Its own
KDoc calls it "The one MOVE assertion" (`:170`). No frame index, no boundary, no timing — and
`assertHarnessRan` (`:162-167`) only checks that frames were decoded and the CNN was asked.

So the outcome is asserted and the trajectory is not, which is the right shape for an algorithm
under constant change: a frame-perfect fixture would go red on every tuning without anything being
broken.

**What follows: a real clip omits `frame_labels` entirely.** It costs the audit report on that
clip — `ObsAudit` prints per-clip CNN accuracy that a `frame_labels`-less clip cannot contribute to
— and it costs nothing else. Phase 02 states how the harness must behave when the key is absent.
This is the finding that makes the pack small: **the tool is not a labelling application. It is a
review of a move list.**

## What already exists, and why most of this is not new code

Four things were expected to be gaps and are not.

**A deterministic replay with a real CNN in the loop already exists.**
`scripts/replay_clip_cnn.py` — its docstring (`:1-25`) exists precisely because
`emit_parity_fixtures.py` and `sweep_clip_params.py` both build the tracker with `cnn_run=None`
(`emit_parity_fixtures.py:272`), so recovery and the verify ladder "have never been replayable
off-device". `run()` (`:85-140`) drives `ClipDriver` on a virtual clock advanced by video time,
paces observations like the device, and returns `commits` as `(video_time, san, decider)` **per
ply** (`:127-131`). It even handles the bridge correctly by construction: it tags every ply of a
multi-move commit with the last decision's decider, so a four-move recovery yields four rows
labelled `cnn_recovery`.

**A fixture format for uncommittable real recordings already exists.** `tests/test_clips.py:26-38`:
two directories on purpose — the committed Blender renders next to the manifest, and "the real
30 fps phone recordings [that] are tens to hundreds of megabytes and CANNOT be committed, so their
manifest ENTRY is committed (corners, margin, ground truth, why it fails) while the file itself is
dropped into the gitignored `data/testclips/`". The entry already carries `corners`, `margin`,
`start_fen`, `board_size`, `frame_size`, per-clip `tracker` overrides, `deterministic: true` for a
reproducible virtual-clock replay (`:49-77`), and `known_failure` / `known_committed` for material
that does not yet reproduce its ground truth (`:120-131`). Nothing about the format needs inventing.

**The `margin` defect is already fixed.** My working memory said `emit_parity_fixtures.py` pins
`margin=0.0` and jams real ArUco footage. It does not, since commit `721901a`: `margin` is read
from the entry at `emit_parity_fixtures.py:252`, with the measurement on record at `:244-252` —
replaying real footage at 0.0 oversizes the board by 6–8 %, the grid lines miss
`_grid_line_coverage`'s band and the tracker sits in `occluded` forever, *2232 of 2996 frames, zero
commits*. `scripts/replay_clip.py:61-67` and `tests/test_clips.py:91-96` carry the same fix. **The
Python side is correct. The Kotlin side is not** — see phase 02.

**Neither harness wants extracted frames.** Kotlin decodes the mp4 directly through JavaCV
(`ClipFrames.forEachFrame`, `ClipFrames.kt:24-47`), streaming rather than collecting because "a
126-frame 640×640 clip is 155 MB of BGR" (`:12-15`). Python uses `cv2.VideoCapture`
(`replay_clip.py:26`, `sweep_clip_params.py:87`). A fixture is an mp4 plus a metadata entry.

### A correction to the brief

The brief named `scripts/ingest_video_session.py` as the starting point, with "a game video needs
the position to change" as the gap. **I do not think that script should be touched.** Its output is
a session directory — sampled frames written to disk at one per second by default
(`ingest_video_session.py:109-111, 146-147`), each with a re-detected quad, frames without a
confident detection silently skipped (`:151-153`). That is the right shape for a *dataset* import
and the wrong shape for a *regression clip*: a clip is consumed as a video, at full rate, through
one fixed quad. Extending it to carry a changing position would build a second, lossy path to an
artefact neither harness reads. The gap is not "the position cannot change" — it is that a
regression clip does not want a session at all.

## The trap

**The tracker's own output is not ground truth.** In the game that motivated this pack, 60 % of
commits were recoveries and the user corrected three by hand. A tool that exports the machine's
track unchecked would freeze the tracker's mistakes into a fixture and then assert forever that it
keeps making them — the exact inversion of what a regression test is for.

Three design consequences, binding on every phase:

1. **The move list is the human's.** The candidate is a proposal. Disagreeing with it must be the
   cheap path — one click per move, on a board, from a ranked list — and agreeing must be an
   explicit act, not a default.
2. **An unconfirmed candidate cannot become a fixture.** Not "should not": the export path must
   refuse it, and the refusal must be tested.
3. **The tool says which moves to doubt, and ranks the review by it.** The machine knows where it
   was guessing. Making the human hunt for it is how a bad line gets waved through.

## The ranking, and what actually supports it

The order the reviewer is sent through: **replay-impossible first, then recovery, then alarmed,
then everything else in one action.** What each tier rests on, honestly:

| Tier | Source | Status |
|---|---|---|
| Replay proves it impossible | `python-chess`, already a dependency, replaying `start_fen` + the line | **Solid.** A certain error, not a suspicion. |
| Committed by `cnn_recovery` | `commits[i][2]` from `replay_clip_cnn.run()` (`replay_clip_cnn.py:128-131`) | **Solid, per ply.** |
| Committed while an alarm was latched | polled from `mt.status()["alarm"]` during the pass | **Solid in Python — and only in Python.** |
| Everything else | the remainder | accept in one action |

The alarm tier needs its caveat stated, because the brief's framing was optimistic. **No decision
row on either side carries an alarm flag.** Not `DecisionRecord` (`EngineState.kt:444-473`), not
`DebugDecision` (`api/DebugPayload.kt:44+`), not the persisted `DecisionRow`
(`DiagnosticsRecords.kt:100-128`), not the Python record (`tracker.py:2799-2826`). On the phone it
can only be *inferred* from row order — `Alarm.latchAlarm` writes its own `rejected` row
(`Alarm.kt:157`) and a *verified* restore writes no row at all (`TrackerEngine.kt:745`), so latch
and clear are not balanced and the inference over-extends. In this pack the alarm tier is sound for
a different reason: the candidate comes from a replay we drive frame by frame, so we can **poll**
`status()` at the commit instead of reading a field that does not exist. Say it that way in the
artefact — `alarm_at_commit` is an observation this harness made, not a property the tracker
records.

Two more things the ranking must survive:

- **`decider` is not a per-ply field in either tracker's log.** Python's `_record_decision` runs
  once per commit even when the commit pushed several moves (`tracker.py:2141` for recovery,
  `tracker.py:2556` for a fast-play pair), and `"ply": len(self.history)` is taken *after* the
  pushes (`tracker.py:2805`), so a bridge shows as a ply gap. Android fixed this for recovery in
  `specs/37` phase 00 (`CnnTick.kt:336-350`, one row per move, stamped `[move i/N of recovery …]`)
  and still records a pair on its last move only (`Commit.kt:149, 166`). **Do not port the fix as
  part of this pack.** `replay_clip_cnn.py:127-131` already attributes the decider to every ply of
  the batch; that is the property to rely on, and it is free.
- **The Android app's own game record is a per-ply source and is not the one we use.**
  `StoredMove.provenance.decider` (`GameRecord.kt:114-144`) is written for every ply, sharing the
  decider across a sequence deliberately (`LiveGame.kt:63-80`, with the measurement on record: *"a
  tally over 16 stored games read 89 of 113 plies as unknown"*). `buildPgn(provenance = true)`
  (`PgnBuilder.kt:27-35`) exports it as `{cl: cnn_recovery; …}` comments, and `GameSegment`
  (`GameRecord.kt:78-84`) already marks where the line broke. It is a good artefact and this pack
  does not consume it, for one reason: **the phone records no video** — `SessionRecorder`
  (`record/SessionRecorder.kt:59-138`) writes one JPEG per committed move, not a stream. A clip
  needs the video, so the candidate must come from a replay over the video. A phone-exported PGN is
  a legitimate *second opinion* to paste in as the start position and expected line; phase 01 keeps
  the door open for it and builds nothing for it.

## Open questions, answered

**Where does `start_fen` come from for a clip that starts mid-game?** From the human, in the review
page, with the board rendered so a wrong answer is visible — a wrong `start_fen` transposes the
whole line silently and no downstream check catches it. Three ways to supply it, in preference
order: paste a PGN or FEN exported from the phone (`StoredGame.startFen`, or the `[FEN]` tag
`PgnBuilder.kt:54-57`); type a FEN; accept the standard start position, the default. **For an
excerpt cut out of a longer video, `start_fen` is derived, not entered** — it is the position after
the confirmed prefix, which the tool computes with `python-chess` once the line is confirmed. That
ordering is load-bearing: excerpts are cut *after* confirmation, never before.

**What if corners cannot be detected on some frames — skip, interpolate, or refuse?** None of the
three, because the question does not apply. The fixture carries **one quad for the whole clip** and
the replay never re-detects: `ClipDriver` writes a throw-away profile from `entry["corners"]` and
runs `live_align=False` (`emit_parity_fixtures.py:243-272`). Per-frame detection is therefore not
an input, it is a **quality measurement** — how well one static quad can represent this footage.
The ingest detects on every frame it can and reports the detection rate and the spread of the
per-frame quads about the chosen one, refusing to emit a candidate when either is out of band.
**I could not determine the thresholds without measurement**: no real game footage exists in this
repository to measure against (`data/testclips/` does not exist on this machine), and the only
comparable numbers — the 3.2–6.5 px median square-edge offsets of `docs/data-pipeline.md` §12 — are
about a different thing (per-frame quads that each *were* fitted). Phase 00 measures on the first
real video and records the numbers before choosing a gate.

**Where does `fps` come from, and what if the rate is variable?** `fps` is not metadata — it is the
**clock**. The virtual clock advances `1.0/fps` per decoded frame (`sweep_clip_params.py:110`,
`replay_clip_cnn.py:121`), and every wall-clock knob the tracker has — `motionHoldS`,
`motionRecencyS`, `nudgeTimeoutS`, `verifyTimeoutS`, `cnnCooldownS`, `observerIntervalS` — is
measured against it. Kotlin reads it from `meta.fps` (`SimClips.kt:148`); Python from
`CAP_PROP_FPS` (`test_clips.py:69`, `replay_clip_cnn.py:90`). A variable-rate source therefore
makes the replay quietly wrong, and the answer is not to teach the harness variable timing but to
**re-encode to constant frame rate with ffmpeg before ingest** — an established tool, and the
project's standing preference. The ingest reads both the container's nominal rate and the actual
per-frame presentation timestamps, and refuses when they disagree; the tolerance is a measurement,
not a guess, and phase 00 records it.

**Do the frames need extracting?** No — answered above; both harnesses decode the mp4. The review
*page* needs pictures, and phase 00 writes them as a by-product of the pass it is already making,
so nothing seeks in a video at request time.

## Shape of the answer

Small, and deliberately so. Two packs were cut this week for putting a small face on a large
machine, and most of the machine this one needs is already built.

- **00** adds one script that measures the geometry, runs the CNN replay that already exists, and
  writes a *candidate* under `data/` — gitignored, uncommitted, asserting nothing.
- **01** adds one router and one review panel inside the existing session-review surface: a game
  score, a board, a ranked worklist, and a confirm that is the only thing able to unlock the export.
- **02** adopts a confirmed candidate into the manifest the Python clip suite already reads, and
  makes the Kotlin harness able to run it — which is mostly a `BoardGeometry` that never received
  the clip's `margin`.

## Ownership

| Phase | Owns |
|---|---|
| **00** | `scripts/label_real_game.py` — **the ingest path only**; `scripts/replay_clip_cnn.py` (`run`'s per-commit record only); `tests/test_real_game_candidate.py` |
| **01** | `src/chesslab/web/routers/realgames.py` (new), `web/routers/__init__.py` (registration), `web/frontend/src/components/GameReview.tsx` (new) + its mount in `Dataset.tsx`, `tests/test_web_realgames.py` (new) |
| **02** | `scripts/label_real_game.py` — **the `--adopt` path only**; `tests/data/testclips/manifest.yaml` (entries); `android/app/src/test/kotlin/com/chesslab/tracker/sim/SimClips.kt`, `sim/ClipPipeline.kt` and their tests |

`scripts/label_real_game.py` and `tests/test_real_game_candidate.py` are shared between 00 and 02,
split by subcommand: 00 writes candidates, 02 adopts them. 02 must not change what 00 writes.

No phase edits `scripts/ingest_video_session.py`, `scripts/emit_parity_fixtures.py`,
`scripts/replay_clip.py`, `src/chesslab/move_tracker/tracker.py`, or any file under
`android/core-engine/` or `android/core-geometry/`.

## Protocol

- **`data/` is gitignored: park, never delete.** Every artefact phase 00 and 01 produce lives under
  `data/` and is never committed. The only committed output of the whole pack is a manifest entry
  and, if it fits the size budget, an excerpt mp4.
- **No endpoint takes a path from the client, and nothing writes outside `data/`.** The web app has
  no authentication anywhere (verified: no `Depends`, no security scheme, no middleware in
  `src/chesslab/web/`; the only protection is `DEFAULT_WEB_HOST = "127.0.0.1"`, `config.py:632`),
  and `app.py:32` mounts the entire `data/` tree read-only at `/img`. Follow `_review_session_dir`
  (`routers/sessions.py:23-37`): the client sends an **identifier**, the server validates it with
  `sessions._safe_id` (`src/chesslab/sessions.py:30-33` — rejects empty, `/`, `\`, `..`) and joins
  it under a fixed root. Re-check containment after `resolve()` the way `_frame_path` does
  (`sessions.py:60-70`).
- **`android/**/bin/` is a stale gitignored copy.** Exclude it from every grep; never edit a file
  there.
- **Gates.** Python: `uv run pytest -q`, `uv run ruff check src tests synth scripts`,
  `uv run vulture`. Frontend: `cd src/chesslab/web/frontend && npm run build` (the output under
  `web/static/` is committed), `npm run lint` with no new errors, `npm run knip` silent. Android
  (phase 02 only): `gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest --rerun-tasks`
  — Gradle reports green on stale tasks and the flag is not optional.
- **`uv run pytest -q` does not run clip replays.** `pyproject.toml:96` sets
  `addopts = "-m 'not clips'"`. Anything that needs a video is behind `-m clips` and must skip
  cleanly when the video is absent, exactly as `test_clips.py:26-38` already does. A new test that
  requires footage and is *not* marked `clips` breaks a fresh clone.
- **Restructure to satisfy the linters.** Never `# noqa` a new line, never a detekt `@Suppress` or
  baseline entry.
- Comments explain **why**, and name the measurement or the incident behind a decision. Where a
  number is not known, write that it is not known — this pack would rather say "measure this" than
  ship a plausible constant.
