# 52 — Status

| Phase | State | Note |
|---|---|---|
| 00 — a clip without ground truth | `todo` | **lands alone**; publishes the types 01-03 compile against |
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

_(empty — append one entry per phase: what landed, what the spec got wrong, what is left)_
