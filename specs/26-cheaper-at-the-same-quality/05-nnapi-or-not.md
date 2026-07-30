# Phase 05 — Does NNAPI take whole what XNNPACK fragments?

## Why

Phase 00 found that XNNPACK claims only the 47 convolutions and hands everything between them back
to the generic CPU EP — 92 transposes, 92 reshapes, 46 `InstanceNormalization`, and the rest, 45 % of
kernel time. The fragmentation is a property of *that* EP's operator coverage and layout preference,
not of the model.

The current AAR ships **XNNPACK and NNAPI** — that is precisely why the QNN build was dropped in
`928a55c`, since the QNN AAR carried neither. Whether NNAPI would take this graph in one piece,
including `InstanceNormalization`, has never been measured. If it does, the 30 ms of fragmentation
overhead disappears without touching a single weight, and phase 04's approximation becomes
unnecessary.

If it does not, that is equally worth knowing: it would mean the fragmentation is inherent to the
graph rather than to the EP, and phase 04 is the only route to it.

## Design (decided — do not redesign)

This is a **measurement phase with a configuration change, not a rewrite.** The EP chain already
exists and is selectable (`android/.../cnn/EpProfile.kt`, the AUTO chain). Add NNAPI as an explicit,
selectable profile and measure it against the current AUTO result on the same device in the same
session conditions.

Measure four things per EP configuration, all from phase 00's existing instrumentation — rebase onto
`spec-26-00-where-does-it-run` and reuse it rather than rebuilding:

1. Nodes per execution provider.
2. **Fragment count.** This is the number that matters; a graph nominally "on NNAPI" but split into
   40 islands has not won anything.
3. The first node that falls back, if any.
4. Session latency: median, p10, p90, min, max over ≥ 30 observations.

Configurations: current AUTO (the baseline, re-measured today, not quoted from phase 00), NNAPI
first, and NNAPI with CPU fallback disabled so a refusal is loud rather than silent.

**Expect NNAPI to disappoint and report it plainly if it does.** The literature is consistent that
NNAPI gains are highly variable across the Android ecosystem and that mid-range parts can regress
outright through driver overhead; this device is a flagship SM8650, which is the favourable case,
but a regression is a perfectly plausible outcome and is a complete deliverable. Do not tune the
configuration until it wins.

## Steps

1. `android/.../cnn/EpProfile.kt` — commit `feat(android): NNAPI as a selectable execution-provider profile`
2. Measure the three configurations on the device — no commit. Same session conditions each time,
   and **start each run from a cooled device**: phase 00 measured a 61 → 75 ms drift within one run
   as the battery went 34.0 → 37.1 °C, which is larger than many plausible EP differences. A
   comparison taken while the device heats up measures the thermal ramp, not the EP.
3. Report — commit `docs(specs): 26 phase 05 — what NNAPI does with this graph`

## Tests

Extend phase 00's `EpProfileTest` for the new profile's chain construction. Do not unit-test ORT or
NNAPI themselves.

```
gradlew.bat :app:testDebugUnitTest --tests "*EpProfile*"
gradlew.bat :app:ktlintCheck :app:detekt
```

## Acceptance criteria

- [ ] A table: EP configuration × (nodes per EP, fragment count, first fallback, latency median/p10/p90).
- [ ] The AUTO baseline **re-measured in this phase's own runs**, not quoted from phase 00.
- [ ] Each configuration started from a cooled device, and the battery temperature at start and end
      recorded so the reader can see the ramp did not do the work.
- [ ] The floor is untouched by construction — no weight, crop or graph changed. State it in one
      sentence.
- [ ] `ktlintCheck`/`detekt` clean, no `@Suppress`. Note detekt's unused-code rules only see private
      scope, so do not leave an `internal` helper nobody calls.

## Do NOT / Out of scope

- Do **not** change the model, the crops, the preprocessing or the input size.
- Do **not** reintroduce the QNN AAR. It was removed deliberately and with measurements
  (227 ms against 97); reversing that is not this phase's decision.
- Do **not** ship a new default EP chain. Measure; the default is the orchestrator's call.
- Do **not** report a single latency sample. The spread is 2.1x.
