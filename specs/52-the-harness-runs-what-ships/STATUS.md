# 52 — Status

| Phase | State | Note |
|---|---|---|
| 00 — a clip without ground truth | `done` | types + runner + invocation on the branch; 01-03 compile against them |
| 01 — geometry measured by the shipping code | `todo` | after 00 |
| 02 — the candidate file | `todo` | after 01; owns the `candidate.json` schema |
| 03 — adopt, and retire the Python | `todo` | after 02; deletes `scripts/label_real_game.py` |
| 04 — what the shipping engine does | `todo` | last; **measurement only, forbidden from fixing** |

Branch: `specs-52-harness-runs-what-ships`. Sequential — 00 must be committed before 01 starts.

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
