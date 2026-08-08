# 52 — Status

| Phase | State | Note |
|---|---|---|
| 00 — a clip without ground truth | `done` | types + runner + invocation on the branch; 01-03 compile against them |
| 01 — geometry measured by the shipping code | `done` | 2026-08-07; `GeometryScan` in `:tracker-runtime` (NOT the spec's `sim/RealGameGeometry.kt` — see log), consumed by BOTH the `:app` harness and `:desktop` |
| 02 — the candidate file | `done` | 2026-08-07; as the `:desktop replay <video> label` verb, not a sim extension — the review UI died with the web UI, so the desktop CLI is where a human is. Schema key-for-key against the Python file |
| 03 — adopt, and retire the Python | `mostly moot` | the Python tracker was deleted wholesale on 2026-08-07 (`python-tracker-final` tag); `--adopt` into the clip manifest remains unbuilt |
| 04 — what the shipping engine does | `done` | 2026-08-07; table below. **Measurement only — nothing was fixed** |

Branch: `specs-52-harness-runs-what-ships`. Sequential — 00 must be committed before 01 starts.

## 2026-08-07 — phases 01/02/04, and the first defaults measurement

### What landed

- **`-Pchesslab.sim.defaults=true`** — the 18-clip suite can finally judge the SHIPPED
  `TrackerConfig()` instead of each clip's recorded `effectiveConfig` (report-only, never a gate;
  `SimClips.usingShippedDefaults`). First numbers: parity mode diff-only **18/18** (unchanged),
  defaults mode diff-only **16/18** (blender-castle commits a WRONG second ply — Nc6 as
  `diff_pair` — and blender-phantom never commits e5), cnn-on **7/18** with nine clips committing
  nothing at all. Effectiveness proven the way `TrackerConfig.kt:8` proved the old blindness:
  `motionHoldS = 5.00` moves the defaults run 16/18 → **5/18** while the parity run was
  byte-identical under the same edit on 2026-08-02.
- **`GeometryScan`** (`tracker-runtime/.../geometry/GeometryScan.kt`) — the Python labeler's
  `scan_geometry`/`median_quad`/`quad_spread`/`clock_error`/`refuse_reasons` ported onto
  `rawQuadOf` → `refinedQuad` → `alignmentOf`. Placed in `:tracker-runtime` rather than the spec's
  `sim/RealGameGeometry.kt` so `:desktop` and the `:app` harness run ONE implementation — the
  spec predates the module rework that made that possible. Unit tests encode the specs/41 trap
  (identical-but-wrong quads spread 0), the median's outlier immunity, and the three refusal gates.
- **`:desktop replay <video> label`** — measures first (refuses footage that cannot carry a label,
  with the ffmpeg CFR hint), replays through the per-corner MEDIAN quad of aligned samples, writes
  `data/realgames/<name>/candidate.json` + review JPEGs. Schema verified key-for-key against
  `game-2026-08-02/candidate.json` (top level, `geometry`, `moves[]`; `reviewed_plies`/
  `confirmed_at` are review-added and correctly absent). `confirmed` is hardcoded false in
  `writeCandidate`. The review-frame writer stores defensive copies and never separates an index
  from its picture (the 2026-08-06 defect, not reproduced). Inside `effective_config` two Python
  keys are deliberately absent: `llK` (a `Scoring.kt` constant, not config) and `reconnectGraceS`
  (host-side here).
- **`:desktop replay <video> score`** — LCS over SANs against a candidate: found / missed /
  invented, each with frame indices, never merged into one accuracy. Replays through the LABEL's
  stored quad so the comparison shares the label's geometry. The `LabelRealGameTest` harness lost
  its corner/margin/boardSize/fps/pad scaffolding properties — geometry is measured, crop comes
  from the shipped model's declaration.

### Phase 04 — Python against Kotlin, `VID_20260802_222741.mp4`

| | Python (on record) | Kotlin label (own measured quad, 960 px) | Kotlin score run (Python's quad, 800 px) |
|---|---|---|---|
| plies committed | 22 | **26** | 20 |
| last commit frame / t | 3910 / 130.4 s | **4208 / 140.3 s** | — |
| deciders | occ 10 · pair 6 · recovery 6 | occ 9 · recovery 17 | — |
| vs the 22-ply label | — | first 22 identical | found 17 · missed 5 · **invented 3** |
| alarms | 0 | 0 | 0 |
| terminal note | `Much change (18 squares…)` | `Position lost — tracking paused` | same |
| observations | 958 (paced 0.3 s) | 3161 (self-paced) | — |
| markers seen | 3:940 · 2:17 · 1:1 | 3:937 · 2:20 · 1:1 | — |
| worst offset (median/p90/max, % of a cell) | 2.0/2.4/23.8 px @100 = 2.0/2.4 % | 2.37/2.88/4.76 px @120 = **2.0/2.4 %** | — |

**Verdict on the two competing explanations: A (lag), with a geometry rider.** The Kotlin engine
on the same footage commits MORE (26 > 22) and gets further (140.3 s > 130.4 s), so the Python
result was not a harness artefact in the frame-feed sense (B) — the two agree ply for ply as far
as Python got. But both die the same death well before the live game's 83 plies: recovery-decider
share 65 % (17/26), terminal state "position lost", exactly specs/40's "the reference is only
re-anchored on a commit". The rider: **the quad is worth six plies.** The same Kotlin engine on
the same video commits 26 through its own measured median quad and 20 through the Python
profile's quad — with three PHANTOMS (a fabricated `Bxh6/Bg7/Rh6` bridge at frames 2593-2616)
that the better geometry does not produce. Every earlier "the tracker only gets N moves" number
conflated these two variables.

### The other two videos (labels written, `confirmed: false`, awaiting human review)

| video | geometry (pass rate · worst offset median, % of cell · markers 4/3) | plies | terminal |
|---|---|---|---|
| `rec-20260807-135238` (30 fps) | 94.8 % · 3.14 px @116 = 2.7 % · 813/70 | **23** (was 6 through the first-frame quad, with a wrong `Bd6`) | position lost at frame ~8100 |
| `win-20260807-125257` (60 fps) | 96.5 % · 3.94 px @156 = 2.5 % · 1148/127 | **7** — commits stop at frame 1748 of 12747 (14 %) | position lost |

`rec`'s jump 6 → 23 has ONE changed variable: the quad (first-frame `locateBoard` vs the scan's
median over 837 aligned samples). `win` is the open case the corpus now has a label slot for:
geometry and clock both pass their gates, the game dies at 14 % with `e5 Nf3 Nf6` then three
recovery bridges (`Na3 Bxa3 … Bf8`) that look fabricated — 60 fps is the obvious suspect
(`motionThr` is per frame-pair and nothing normalises by dt), but that is a hypothesis for the
NEXT measurement, not a finding of this one. Nothing was tuned or fixed in this pack.

### Findings from the first labeling days (2026-08-08)

- **`ALIGN_PASS_MIN` (0.85) measures playing speed, not footage quality.** A briskly replayed
  game (`rec-20260808-003957`: famous-game reenactment, ~10 s/move) reads 82.5 % align-pass with
  FLAWLESS geometry (worst offset median 2.9 px @116, spread quiet, clock exact, 4 markers on
  847/1014 samples) — the failing samples are hands, and hands say nothing about the board. The
  0.85 was calibrated on a ~2 %-hands live game and its own comment says "seven times handsier"
  would break it; fast replaying is exactly that. Changing the threshold stays a separate
  evidenced decision (this pack's phase 01 forbids it in passing); until then such videos get
  `quiet frames` runs but no candidate.
- **Night-lighting identity domain gap, measured through the observer's own crops** (onnxruntime
  over the exact 80 px crops, `id35-80`): on the 00:39 recording the model reads the never-moved
  c3 KNIGHT as `wP` at 0.951, the c1 rook as `wB` 0.816, the e8 rook as `bB` 0.804 — while
  reading the actual event perfectly (`c2 empty 1.000`, `e2 wQ 0.951` after Qxe2). Consequence
  chain: diff path loses Qxe2 to neighbour-bleed (`too_many_changed`), the chronic c3 conflict
  feeds the desync streak, the alarm latches with c3 in its conflict set, and
  `resolvesAlarmConflicts` then rightly refuses every bridge — no legal sequence turns a knight
  into a pawn. The engine's conservatism worked; the finding is TRAINING DATA (these evening
  videos are the corpus gap), not logic.

### 2026-08-08 — the count gate stops counting evidence the CNN already contradicted

`tooMuchChangeGate` counted every changed/tainted square equally against `maxChanged = 6`; the
Qxe2 frame showed it refusing on 8 squares of which the observer read the 6-square bleed cloud
as `empty 1.000`. Now squares a FRESH (age ≤ 3 s AND `snap.fen == board.fen()`), CONFIDENT,
non-occluded-reading observation confirms unchanged against the reference stop COUNTING —
counting only, z and `changed` untouched, hand rule on the raw tainted count, occluded-reading
squares excluded from the discount (a resting hand cannot talk itself out of the ceiling), no-op
without a snapshot (parity-safe by construction).

Measured, same day:

| run | before | after |
|---|---|---|
| 18-clip parity diff-only | 18/18 | **18/18** (cnn-arm report 11→10, experiment arm) |
| rec-20260807 vs 25-ply label | 24 / 1 / 0 | **25 / 0 / 0** |
| win-20260807 vs 7-ply label | 4 / 3 / 0 | 4 / 3 / 0 (misses = the fabricated bridge, correct) |
| VID_20260802 vs Python 22-ply label | 20 / 2 / 0 | 20 / 2 / **10** — but every one of the 10 sits AFTER the label's last frame (4214-9473 vs 3910), all `cnn_occupancy`, ending **Qxd7# at frame 9473 of 9576**: the first full-video run to the mate. A label shorter than the run reads as "invented"; human review decides the tail |
| rec-20260808 (the Qxe2 video) | 44 plies, dies at Qxe2 | **54 plies, Qxe2 committed as cnn_occupancy** |

### 2026-08-08 — a replay is a repeatable experiment, and the clean-commits question is answered

**Determinism.** The one-clock fix was necessary but not sufficient: the same file still ran 54
plies once and 39 the next, because (a) WHEN an async inference lands relative to the frames is
wall-clock, and (b) 4 intra-op ONNX threads make parallel float reductions non-bit-exact — a
logit wobbling in its last digits flipped a thresholded decision at ply 26 of VID. Fixed for
replays only: the observer runs its inference INLINE (`TrackerSeed.observerDispatcher`,
`Dispatchers.Unconfined` on the desktop) on a fixed video-time cadence
(`REPLAY_OBSERVER_INTERVAL_S = 0.15` — **superseded the same day: 0.15 starves the ladder, the
constant is now 0.0; see the cadence section below**), and the desktop opens the
classifier with ONE intra-op thread (47 ms vs 19 per observation — a fraction of the cadence).
Proof: rec-20260808 3× byte-identical at **67 plies** (up from 39-54 — the fixed cadence also
simply observes better), VID identical across warm runs. One residue, named and deliberately
left (user call): the settings flow applies `observerIntervalS` asynchronously, so a COLD first
run can shift the first observations by a few frames. Two-line fix (set interval synchronously
before attach); becomes mandatory the day the observation cache lands, since cached
observations are keyed to the cadence.

**The clean-commits experiment** (user question: what does it cost/buy to commit only on a
hand-free board?). `cleanCommitsOnly` (default false): `commitGates` refuses candidates and the
verify ladder refuses votes while anything reads as a hand (`handInFrame`: engine latches OR any
occluded-reading square in a fresh snapshot). Measured A/B on one binary:

| video | default | cleanonly | hand-gate fired |
|---|---|---|---|
| rec-20260807 (score) | 25 / 0 / 0 | 25 / 0 / 0 | 0× |
| VID_20260802 (score vs Python label) | 20 / 2 / 10* | 20 / 2 / 11* | 0× |
| rec-20260808 (plies · alarms) | 67 · 1 | 67 · 1 | 0× |

*post-label tail to the mate; the ±1 there is the cold-start residue above.

**The strict gate never fired.** By the time a candidate exists, the existing layers (motion
settle, occluded-core skip, taints, verify votes, the recovery clean gate) have already outlasted
the hand — the tolerant default commits nothing the strict mode would have stopped. The knob
stays in the catalog as an instrument; the default stays off.

### 2026-08-08 — the cadence was load-bearing, and the "cold-start residue" fix made it worse

The determinism section above left one residue: the settings flow applied `observerIntervalS`
asynchronously, and the prediction was that seeding the repository (`settings.update(config)`)
becomes mandatory once the observation cache lands. **Measured: the opposite.** With the seeding
in place the flow no longer stomped the replay cadence to its codec default of 0.0 — the honest
0.15 s was applied for the first time, and the results collapsed: rec-20260808 **67 → 26 plies**,
rec-20260807 **25/0/0 → 23/2/1** (a phantom — the veto). Every "good" run on record had in fact
observed FREE (rec-0808: 5 069 observations against 1 013 throttled), because the async default
overwrote the intended throttle within the first frames.

Two hypotheses died by A/B on one binary before the cause was accepted:
`set:liveAlign=false` (the seeded flow's other new consumer) → still 26; a faster throttle
`set:observerIntervalS=0.07` → still 26. What restores 67/67 and 25/0/0 is the free cadence
itself — the verify ladder and recovery voting are tuned to observations arriving every 1-2
frames, and a 0.15 s video-time throttle starves votes out of their windows.

Resolution, committed: `REPLAY_OBSERVER_INTERVAL_S = 0.0` — free-running is now DECLARED rather
than the accident of a race; the repository stays unseeded (KDoc in `DesktopMain.replay` records
why), and the one genuinely mandatory piece landed separately: `TrackerStack.init` applies the
seed's interval/enabled synchronously BEFORE attach, so cold and warm runs start on the same
cadence. Verified: rec-0808 67 plies ending `Nxc7+` (the PGN's last move), rec-0807 25/0/0.

**Batch runner + observation cache** (the "faster iteration" ask): `scripts/replay-batch.ps1`
runs the four-video regression set on one `installDist`, 3-parallel, with a parsed summary
table. `CachingClassifier` remembers what a model said about crop pixels it has seen (key =
MD5 over the crop batch, per-model directory under `tmp/obs-cache/` — self-validating, only
sound because replays are deterministic). Cold set 368 s, warm 251 s with hit rates at
99-100 % on unchanged videos; a binary change re-runs `installDist` but inference answers
from disk.

### 2026-08-08 — the 53 GB balloon: OpenCV's parallel ArUco under concurrent load

The user's machine (32 GB) filled during batch runs. Measured, not guessed: single replay
processes were FLAT (~5.7 GB private — native-library baseline plus the capped heap) over full
videos, but specific runs committed **58.8 GB**, working set ~1 GB, stable for minutes. A
VirtualQueryEx region scan of a live balloon showed **ONE private allocation of 53 044 MB**
(momentarily 112 GB during a copy) — not heap (jcmd: 235 MB), not thread stacks, not allocator
churn. One native buffer.

Isolated by bisection on one binary, one video (`rec-20260808-003957`, deterministic at ~frame
7146 — a motion-blurred hand sweeping the board):

| arm | balloon? |
|---|---|
| full replay, liveAlign on | **yes** (58.8 GB, reproduced 4×) |
| grid correction disabled, marker detection on | **yes** |
| `set:liveAlign=false` | no |
| the same frames 7100-7150 through the identical decode path + `ArucoDetector`, isolated | no (16-22 ms each) |
| full replay with `Core.setNumThreads(1)` | **no** (max 7.6 GB, 67 plies unchanged) |

So: `ArucoDetector.detectMarkers` (bytedeco OpenCV **4.10**, Windows) commits the buffer only
when OUR two threads are inside OpenCV at once — the drive thread's per-frame stages and
LiveAlign's detection on a worker. The same frames are clean in isolation; Python cv2 4.13 is
clean too.

**`Core.setNumThreads(1)` alone was NOT sufficient** — one clean verification run, then 25-28 GB
transients in the very next batch. The fix that holds is structural: **LiveAlign shares the
observer's dispatcher choice** (`seed.observerDispatcher` — inline for replays, its own worker
live), so a desktop replay is single-threaded through OpenCV by construction, and an align lands
at a VIDEO time instead of a wall time. The bus's 200 ms preview throttle moved onto the same
clock (`CameraFrameBus(nowMs = frameClock::now)`) — it decided which frame LiveAlign detects on,
and it was the last wall-clock input to the replay. `setNumThreads(1)` stays as defence in depth
on the measurement host (per-stage cost ~1 ms: `chesslabPerf` warp 0.9, gray 1.1 at 1080p).
The phone is a different build (pthreads backend), has never shown the balloon, and keeps its
worker: nothing shared changed behaviour on Android.

Two guards landed with it: the desktop distribution caps its heap (`-Xmx2g`,
`desktop/build.gradle.kts` — the default is a quarter of physical RAM per JVM, which is how
three parallel batch replays plus daemons filled the machine even before the balloon), and
`replay-batch.ps1` defaults to `MaxParallel = 2` (~6 GB native baseline per process is real
even when healthy).

Final batch on the complete fix (cold then warm, 2-parallel, RAM watch silent throughout;
cold and warm **byte-identical**):

| video | result | cold | warm (cache 100 %) |
|---|---|---|---|
| rec-20260807 (score) | 25 / 0 / 0 · 1 alarm | 309 s | 249 s |
| rec-20260808-003957 | 67 plies · 0 alarms | 357 s | 274 s |
| rec-20260808-115912 | 61 plies · 2 alarms | 732 s | 554 s |
| VID_20260802 (score) | 20 / 2 / 5* · 2 alarms | 295 s | 222 s |

*all five sit AFTER the label's last frame (4211-7425 vs 3910) — the post-label tail toward the
mate, shorter than the pre-fix tail of 10-11 because aligns now land at video times; zero
phantoms inside the labeled range.

### 2026-08-08 — the label gate asks for evidence, not a pass rate (the reserved decision)

The finding above ("`ALIGN_PASS_MIN` measures playing speed") reserved the threshold change as a
separate evidenced decision; the user looking for the new recordings' candidates forced it.
`geometryRefusals` now refuses on **`aligned < MIN_ALIGNED_SAMPLES` (100)** instead of a pass
rate: every aligned sample already passed `alignmentOf`'s per-frame gate (worst offset within
4 % of a cell AND all 18 grid lines), a nudged board is the spread gate's job, and what a
median quad needs is enough of them — not a statement about how often a hand was in frame.
The rate stays in the report and `candidate.json`, labeled as a playing-speed number.

| video | rate (old gate) | aligned samples | label |
|---|---|---|---|
| rec-20260808-003957 | 82.5 % → REFUSED | 837 | **42 plies, 200 review frames** |
| rec-20260808-115912 | 82.4 % → REFUSED | 1 765 | **72 plies, 325 review frames** |

Both candidates written, `confirmed: false`, awaiting human review. Note the label replays
through the scan's static median quad, so its ply count differs from the live-align quiet runs
(003957: 42 vs 67 — worse; 115912: 72 vs 61 — better); the label is the review PROPOSAL, and
the quad difference is the same two-variable story phase 04 measured on VID.

### Session log

Gates: `:tracker-runtime:test` (new `GeometryScanTest`), `:desktop:test` (new
`RealGameScoreTest`, incl. label-scored-against-itself = all found), ktlint/detekt on
`:desktop`/`:tracker-runtime`/`:app`/`:core-engine`, and the full line with `--rerun-tasks` at
the end of the session. The two sim runs and the `motionHoldS` proof are recorded above.

## Measured before the pack was written (2026-08-06)

| Fact | Value | How |
|---|---|---|
| The candidate on disk is the **Python** tracker's opinion | `scripts/label_real_game.py` → `scripts/replay_clip_cnn.py::run` → `src/chesslab/move_tracker` | source |
| The phone runs `:core-engine` | — | source |
| Review frames `000168-000172` | **byte-identical** to `000228-000232` | md5 |
| Which set is correct | the **later** one — decoded frame 228 differs from 168 by 14.2 mean abs, and `000168.jpg` is 1.04 from video[228] | sequential decode + pixel compare |
| The video itself does not duplicate | consecutive frames differ 0.84-1.86 mean abs | same |
| Python result on that video | 22 plies, last at frame 3910 = 41 % of 9576; deciders occ 10 / pair 6 / recovery 6; 0 alarms; 958 observations | `candidate.json` |
| Terminal state | `Much change (18 squares + 0 occluded) — occluded/unstable, no move committed` | `candidate.json.note` |
| `recoveryMaxPlies` in that run | **4** | `candidate.json.effective_config` |
| Markers decoded | 3 in 940 sampled frames, 2 in 17, 1 in 1 — **never 4** | `candidate.json.geometry.markersSeen` |
| `:core-geometry` / `:core-cnn` are AAR modules | `com.android.library`, because `org.opencv:opencv` is an AAR | `core-geometry/build.gradle.kts` |
| JavaCV + bytedeco OpenCV already on the test classpath | `testImplementation(libs.javacv)` | `app/build.gradle.kts:192-196` |
| detekt thresholds | `LongParameterList` 8/8, `TooManyFunctions` 15 | `config/detekt/detekt.yml:24-39` |

## Two pieces of prior art this pack must not repeat

- **specs/41:** `ClipDriver` invented a profile field (`CropParams.default`, `pad_side` 0.10 against
  the profile's 0.05) and desynced the CNN three seconds in. Any harness that invents a profile field
  is a silent domain shift.
- **`replay_clip_cnn.py:116-122`:** the Python observer warps and box-downsamples on a different path
  from `_loop`. Recorded there as "a latent divergence from the invariant" and never fixed.

## Open questions the pack hands to its agents

- **`tracker: {}` vs `effective_config`** disagree about `settle/avg/confirm_frames` (4/3/2 with no
  CNN, 3/2/1 with one). Phase 03 decides which wins and records why.
- **Does `scripts/replay_clip_cnn.py` survive?** Phase 03 greps before deleting.
- **Why the Python writer used stale indices** is deliberately NOT chased: the code is being
  replaced, and phase 04's clean run answers the only question that depended on it — whether the
  duplication also distorted what the tracker was fed.

## Session log

### 2026-08-06 — phase 00, `feat(sim)` x3

Commits (branch `worktree-agent-aff604d8212b66ec9`, based on `6f666f7`):
`3afa1d1` a clip that carries no claim about its moves · `fed4362` one runner, two callers ·
`9e3fca5` the real-game harness is invoked like the clip harness.

Gates, run once and targeted: `:app:ktlintFormat` (clean), `:app:testDebugUnitTest --tests
"*LabelRealGameTest*" --tests "*CnnClipSimulationTest*"` → **3 passed, 2 skipped, 0 failures**
(`aBatchCommitIsExpandedPerPlyWithItsOwnFen`, `theFrameIndexTravelsWithItsPicture`,
`withoutAVideoPropertyTheHarnessIsSkipped` pass; `labelsTheGivenGame` and
`replaysEveryClipThroughTheRealModel` skip), and `:app:ktlintCheck :app:detekt` → **zero findings**,
no `@Suppress`, no baseline.

**`runClip` is unchanged by construction** (pure delegation, identical order, additions are one
no-op lambda and one documented-pure `status()` call). **NOT measured** — `CnnClipSimulationTest` is
`@EnabledIfSystemProperty(chesslab.sim=true)` and the prescribed gate therefore executes nothing.
Open item for whoever next runs the sim suite: `-Pchesslab.sim=true` is the only thing that turns
the 18 committed parity clips back into evidence.

#### What the tree said that the spec did not

- **detekt's `LongParameterList` reports at `>= threshold`, but `ignoreDataClasses` defaults to
  `true`.** Verified by disassembling `detekt-rules-complexity-1.23.8.jar` (the `if_icmplt` jumps
  *past* the report) and confirmed by `TrackerConfig`, a 40-parameter data class that passes today.
  So the 8-field `RealGamePly` and the 9-field `RealGameSource` are legal as written and **no holder
  types are needed anywhere in this pack**. The constraint that does bite is on non-data classes and
  on functions.
- **`TrackerEngine.state` is `internal` to `:core-engine`.** No board and no move stack is reachable
  from a test source set, so the per-ply expansion cannot pop-and-re-push the tracker's own board
  the way `replay_clip_cnn.py::_fens_after` does. `realGamePlies` is driven by the commit **events**
  instead — `SequenceCommitted` carries `ucis`, `sans` and the batch's `fenAfter` — replaying on a
  board of its own, which is a copy by construction. The engine stays the authority: a batch's last
  ply takes its `fenAfter` (exactly where Python's version ends, at `board.fen()`) and the replay
  board is re-seated on it, so a move the replay could not play stays a local hole. **Phases 01-03:
  this is a structural difference from the Python original, not a shortcut.**
- **`corners` is `List<DoubleArray>`, not the spec's `List<List<Double>>`** — `cornersToFlat`,
  `SimClip` and every geometry call in the tree take `List<DoubleArray>`, and `RealGameSource`
  implements the same seam `SimClip` does.
- **`runRealGame` lives in `RealGame.kt`, not `ClipRun.kt`.** The Steps say `ClipRun.kt`; the
  ownership registry says `RealGame.kt` holds "the entry point", and the acceptance criteria grep
  `sim/RealGame.kt` for `onFrame`. `entry.md` states the registry overrides any phase file that
  disagrees, so the registry wins. `ClipRun.kt` holds the shared runner (`replayVideo`).
- **`margin` stays a single `Double`** as specified — the committed `candidate.json` records
  `geometry.margin: 0.05`, and neither `web/routers/realgames.py` nor the frontend reads it. Note
  for 01/02: a v2 `CalibrationProfile` carries **four** margins (one per corner, because the markers
  are glued on by hand), so a profile-fed run loses that distinction here. The conversion is
  `margins4()` in exactly one place, `RealGameSource.geometry`.
- **The existing `candidate.json` `moves[]` has no `uci` key** (ply, san, frame, t, decider, alarm,
  fen_after). `RealGamePly.uci` is new; whether it is serialised is phase 02's call, not a gap.

#### How the seam is shaped

- `replayVideo(source: SimSource, cnn, onFrame)` is the one loop; `SimClip` and `RealGameSource`
  both implement `SimSource`, so the clip harness and the real-game harness cannot drift apart.
  `ClipPipeline`'s constructor now takes `SimSource` (it only ever read `config`/`corners`/
  `geometry`). What a clip knows and footage does not — `startFen`, `promotionPiece`, the per-frame
  truth FENs — reaches the loop through that seam, and `ObsAudit` stays silent where there is
  nothing to audit against.
- `onFrame(index, frame)` fires once per decoded frame, after the engine has seen it, with the index
  that decoded it. `theFrameIndexTravelsWithItsPicture` compares a per-index pixel checksum against
  an independent decode, so it fails if a frame is ever paired with an index it did not come from —
  the 2026-08-02 duplication, whose index sequence looked perfectly fine.
- `SimEventLog` keeps commits un-flattened (`SimBatch`) and polls `status().alarm` **at** the commit.
  Asking later is a different question: the latch clears.
- `RealGameSource.cropParams` is a **required** constructor parameter with no default value.
  specs/45 is on an unmerged branch, so `ModelSpec.padSide`/`padUp` and `withCropOf` do not exist
  here; wiring the crop to the model's own declaration lands when specs/45 merges, and until then
  the caller passes the profile's. `CropParams.default` appears nowhere.

#### What 01-03 need to know

- **Nobody in this pack owns attaching the CNN.** Phase 00 runs `cnn = null` as directed;
  `runRealGame` takes `SimCnn?` and staging a model is three lines copied from
  `CnnClipSimulationTest`. Phase 02 emits `source.cnn_run`, so it probably owns it — decide
  explicitly rather than inherit a null.
- The invocation's geometry properties (`corners`, `margin`, `boardSize`, `fps`, `padSide`,
  `padUp`) are **scaffolding for phase 00 only**, which takes the quad as an input. None has a
  default, deliberately. Phase 01 measures them and should delete the properties it replaces.
- The phase-00 invocation builds `TrackerConfig()` — the app's shipping defaults. The
  `tracker: {}` vs `effective_config` question (settle/avg/confirm 4/3/2 vs 3/2/1) is untouched and
  still phase 03's.
- **`entry.md`'s "constraint that shapes everything" stops being true at the module rework.** All
  three core modules have zero Android imports and `org.bytedeco:opencv:4.10.0-1.5.11` ships the
  same `org.opencv.*` API as a plain JAR, so `:core-geometry`/`:core-cnn` become `java-library` and
  the harness moves into a real `:desktop` module. From that point the sentence *"do NOT create a
  JVM module for this tool"* no longer applies; the `sim/` files move by `git mv` to
  `:desktop/src/test`, package name unchanged. Checked while writing this phase: **no file under
  `sim/` imports `android.*` or `androidx.*`**, and the three `:app` main-source classes it touches
  (`CropParams`, `ModelSpec`, `withCropSizeOf`) import nothing Android either — so the move is a
  rename, not work. Keep it that way.

#### Python knowledge that dies with `scripts/replay_clip_cnn.py`

Recorded now, while the file still exists:

- **`start_frame` DROPS leading frames instead of seeking to them**, so the clock never sees them
  and the replay is exactly the replay of a trimmed clip. It exists because the 2026-08-02 game
  changes illumination locally over its first ~1 s — the a-file corner gains 32-38 % of its luma
  between frames 20 and 30 while h8 loses 20 %, with the whole-board mean unmoved — and a reference
  taken at frame 0 then reads a1/a2/b1 as permanently changed for the rest of the video. The Kotlin
  harness has **no equivalent**. Phase 04 will meet this on that video; it is a decode-side skip,
  never a threshold override.
- **The Python observer's warp divergence (`replay_clip_cnn.py:116-122`) does not exist in the
  Kotlin harness.** Python warps at `board_size`, greys there and box-downsamples afterwards, which
  is the pipeline `tracker._cnn_snapshot` warns against; `SimObserver` takes the detection warps
  `ClipPipeline` already produced (`lastBgrDet`/`lastGrayDet`), i.e. the `_loop` path. One of the
  two fidelity defects `entry.md` lists is therefore already absent on the Kotlin side.
- Observation pacing differs on purpose: Python paces at a fixed `obs_s` (0.30 s), `SimObserver`
  paces by the **measured** inference time with one observation in flight. Both model "the result
  describes a frame the engine has already decided on".
