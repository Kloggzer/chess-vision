# Phase 03 — The same work, twice the time

## Why

From one minute of device log, identical work each time:

```
CNN observation  70 ms for 64 crops = 3 prep +  66 session
CNN observation 165 ms for 64 crops = 3 prep + 161 session
```

Same model, same 64 crops, same resolution — a **2.3x spread**. That is not a model property, and
it means the median understates what the user actually waits for on a bad observation. If the upper
tail can be removed, it is roughly a third off the average with no change to a single weight.

The literature names two candidates and they call for different fixes: DVFS thermal throttling shows
a nonlinear "performance cliff" that has been reported taking inference from 30 ms to 150 ms — the
same shape as the numbers above — while CPU contention produces a variance increase whose size is
model-dependent. On this device the CNN competes with a camera pipeline running at 23–32 fps, and
continuous inference plus camera processing are a coupled thermal and memory load, so both
mechanisms are plausible and they are separable by measurement.

## Design (decided — do not redesign)

Distinguish the two by *when* the slow observations happen, not by reasoning about them.

**Thermal/DVFS signature:** latency degrades monotonically with time-on and correlates with device
temperature; a cooled device is fast again; the slow observations cluster late in a session.

**Contention signature:** slow observations are interleaved with fast ones from the start,
correlate with camera-pipeline activity (the `chesslabPerf` line's `frame`/`total` spikes), and do
not improve after cooling.

Instrument, then run three conditions:

1. **Cold start, 5 minutes.** Device idle and cool beforehand.
2. **Sustained, 20 minutes.** Same session, uninterrupted.
3. **Cold start with the camera pipeline paused** between observations, if the app can do that
   without surgery — if it cannot, say so and drop condition 3 rather than building a mode for it.

Log per observation: timestamp, session ms, and the concurrent `chesslabPerf` totals. Read thermal
state through Android's own `PowerManager` thermal status rather than a vendor sysfs path — vendor
paths differ per device and a hardcoded one is a portability trap.

Correlate. Report which signature the data matches, or state plainly that it matches neither.

## Steps

### 1. `android/.../pipeline/` — commit `feat(android): log thermal status and camera load beside each observation`

Extend the existing `chesslabPerf`/`chesslabCnn` logging. Do not invent a second telemetry channel.

### 2. Measure the three conditions on the device — no commit

`adb devices` → `f86dfdca`. Each condition ≥ 30 observations; report median, p90 and max, never a
mean alone.

### 3. Report — commit `docs(specs): 26 phase 03 — where the variance comes from`

If the answer is thermal, name what would follow (duty-cycling the observer, a lower sustained
clock, fewer crops per observation — phase 01's lever) without implementing it. If the answer is
contention, name which stage competes.

## Tests

A unit test for the correlation/summary helper (median, p90, max, and the bucketing by condition)
on synthetic samples. Do not unit-test the device.

```
gradlew.bat :app:testDebugUnitTest --tests "*Perf*"
gradlew.bat :app:ktlintCheck :app:detekt
```

## Acceptance criteria

- [ ] Median, p90 and max per condition, ≥ 30 observations each.
- [ ] An explicit verdict: thermal, contention, both, or neither — with the correlation that
      supports it.
- [ ] The floor is untouched by construction (logging only). State it in one sentence.
- [ ] `ktlintCheck`/`detekt` clean; note that detekt's unused-code rules only see private scope, so
      do not leave an `internal` helper nobody calls.

## Do NOT / Out of scope

- Do **not** fix the variance in this phase. Diagnose it. specs/25 established the rule the hard
  way: a fix for a hypothesised mechanism produces a confident wrong repair that survives review.
- Do **not** change the observer schedule, the frame loop, or the model.
- Do **not** read vendor thermal sysfs paths.
- Do **not** report a mean without a spread. The whole phase exists because the spread is the story.
