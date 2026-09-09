# Main tracker review and profile — 2026-09-09

Main starts at `1d026d35`. The sensor-scoring experiment remains on
`codex/sensor-scoring-spike`; none of it is enabled or included in this change.

## Confirmed defect: verification accepted observations from a different position

`VerifySingle.tick` checked the current board against the pending candidate's FEN and the
observation frame against the candidate frame. It never checked the observation's own FEN.
The same entry point dispatches pair verification, so both paths were affected.

`CnnObserver` captures the starting FEN before launching asynchronous work and includes it in
`CnnSnapshot`. Frame sequence alone is not a position identity: the game state can change while
an observation is being prepared or queued. With a placement prior, its probabilities may also
have been conditioned on the old position. Recovery and promotion already reject mismatched FENs.

Two new regression tests fail before the fix: a stale observation can confirm/reject a single
candidate, or commit a pending pair. The tests cover a missing FEN as well as a different FEN,
then demonstrate that a valid subsequent observation still completes verification.

The fix requires `snap.fen == pending.fen` at the existing stale-frame gate, before any pixel
or evaluator work. An ignored reading advances observer liveness but cannot vote, consume the
verification window, re-anchor the reference or trigger recovery via a terminal rejection.
An existing integration test now asserts this earlier rejection boundary. No thresholds change.

This is a reproduced engine-seam defect, not a claim that it caused a particular recorded game's
misses. Synchronous desktop replay does not reproduce the live asynchronous timing conditions.

## Profiling method and interpretation

Rebuilt `:desktop:installDist` from main before profiling; the installed spike binary was replaced.
The first fresh-main replay uses `2026-08-08-11-55-19`, classic engine, `p4a-80-clahe`, `prior=0`,
15 source frames/s and `workprofile`. Its cache is warm: 486 hits and zero misses.

The recording has 973 analyzed frames and 486 observations. Instrumented self-time totals:

| Boundary | Calls | Self time | Per call |
| --- | ---: | ---: | ---: |
| Grid band medians | 7,776 | 4,157.4 ms | 0.535 ms |
| Full crop/grid warps | 972 | 4,051.2 ms | 4.168 ms |
| Whole-grid coverage | 973 | 1,894.2 ms | 1.947 ms |
| Detection warp | 973 | 1,604.3 ms | 1.649 ms |
| Engine frame | 973 | 809.1 ms | 0.832 ms |
| Engine CNN snapshot | 486 | 124.5 ms | 0.256 ms |
| Legal-move boundary | 7,101 | 15.6 ms | 0.002 ms |

These are desktop diagnostic measurements, not phone latency or p95 estimates. Parallel grid
workers have their own timing stacks: their CPU times cannot be added to a parent span to infer
wall time. The warm cache bypasses model preprocessing/inference, so this pass cannot rank their
live costs. Repeated legal-move/FEN boundary calls often hit a cache; call count alone is not
evidence of repeated move generation or serialization.

## Concrete optimization candidates

1. **Compute grid medians only inside groove search windows.** `BoardGray` currently collapses
   every column/row, whereas `profileLines` only reads bounded windows around nominal grooves.
   With the current interior search radius of one quarter cell, much of the collapsed profile is
   never consumed. An exact implementation can omit those unused positions without changing a
   single value consulted by groove detection. Validate full profiles versus selected-window
   profiles across sizes, padding, rotations and occlusion before measuring speed. Not implemented
   in this corrective patch; no speedup is claimed.
2. **Keep the two warp geometries distinct.** The 972 warps represent two resolutions for each
   observation. `BoardWarps.gridPlaneFor` preserves calibration resolution for groove detection
   when the model's crop resolution differs. Removing one as a supposed duplicate would alter
   the hand sensor; any shared resampling scheme needs pixel and tracking validation.
3. **Inspect uncached CNN preprocessing before changing the model.** The preceding uncached
   regression profiles showed preprocessing taking more time than ONNX inference. Cached runs
   hide this work entirely. Do not infer phone model speed from those cached observation times.

The current measured priority is image/sensor work. Another broad change to candidate scoring
is not justified by this profile.

## Uncached follow-up

The same short recording was replayed after the fix with `noobscache`. This executes every CNN
preprocessing/inference call and does not purge or modify the existing observation cache.
The test suites had finished before this run.

| Boundary | Calls | Self time | Per observation |
| --- | ---: | ---: | ---: |
| Grid band medians | 7,776 | 4,571.3 ms | 9.41 ms across 16 bands |
| Full crop/grid warps | 972 | 3,703.8 ms | 7.62 ms across two warps |
| CNN preprocessing | 486 | 2,284.8 ms | 4.70 ms |
| ONNX inference | 486 | 669.3 ms | 1.38 ms |

Preprocessing takes 3.41 times the measured inference self time here. Its instrumented output
volume is 2,278.13 MiB over the recording; materialized/copied bytes are not an allocation or GC
measurement. The CPU execution provider was used because this desktop ORT build lacks XNNPACK.
These results reinforce the ordering above, without measuring an optimization or predicting a
physical-phone speedup.

Reproduce from `android/desktop` after `:desktop:installDist`:

```powershell
.\build\install\desktop\bin\desktop.bat replay ..\..\data\recordings\2026-08-08-11-55-19\video.mp4 quiet score name=2026-08-08-11-55-19 model=p4a-80-clahe fps=15 prior=0 engine=classic workprofile noobscache
```

The first main profile omits `noobscache`. The difficult recording uses the same command with
`2026-08-08-00-39-57` as both directory and `name`, also with the cache enabled.

## Regression and validation results

| Recording | Found | Missed | Invented | Beyond reference |
| --- | ---: | ---: | ---: | ---: |
| 2026-08-08-11-55-19 | 15 | 0 | 0 | 3 |
| 2026-08-08-00-39-57 | 53 | 14 | 6 | 0 |

The short recording's scores and all 15 matched commit frames are identical before/after the fix,
including when bypassing the observation cache. The difficult recording's scores and all 53
matched commit frames reproduce the preceding experiment's weight-zero baseline. Its 14 misses
and six invented plies remain unresolved; this fix does not claim to improve those results.

- Before the fix: both new stale-position tests fail.
- After the fix: seven JVM modules, 1,011 test cases, zero failures/errors, three skipped.
- Core-engine ktlint and detekt pass; `git diff --check` passes.
- Python suite: 875 passed, five skipped, 46 warnings for the tests collected at run start.
  Unrelated training files/tests were also being edited during this review and are not part of
  this tracker patch. Final full Ruff check passes; none of those edits were staged here.
- No Android camera or UI code changed; this is not a physical-device performance validation.

The [profile artifact](main-tracker-profile-2026-09-09.json) preserves the three work reports,
individual matched frames, log hashes and the fixed binary/model/source hashes. Raw replay and
check logs remain under `tmp/main-profile-*`, `tmp/main-verify-*` and `tmp/main-review-pytest.log`.
