# Phase 00 — Does a casually placed camera survive the zoom the automation would apply?

**Measurement only. Change no behaviour. Gates the pack on FEASIBILITY, not on payoff.**

## Why

The user aligns the camera by hand before every recording, and does it well — that is why every
session in this corpus fills 61–69% of the frame. The pack exists to take that job away, so the
question is not "is there resolution to gain" (there is barely any, see `entry.md`) but **"can the
app reach a good frame from a camera that was merely put down?"**

That reframes what has to be measured. A casually placed phone starts from a worse fill than the
careful 61–69%, so the automation would apply a *larger* zoom factor than the 1.24–1.4× the
existing sessions imply — and large factors are where the two hard limits bite: the ArUco markers
stop being detected, and the sensor crop stops delivering real pixels. If those ceilings sit below
what a casual placement needs, the automation cannot do its job and the pack stops here.

## Design (decided — do not redesign)

Three measurements on the device, with the real board. Read-only instrumentation is the only code
this phase may write.

### 1. Where does a CASUAL placement start?

Place the phone the way someone would who is not trying — roughly over the board, no fine
adjustment. Record, from the running app:

- delivered frame size,
- the corner quad's longest edge and the fill fraction
  `max(quad w, quad h) / min(frame w, frame h)`,
- px/square = `edge / 8`, and the crop box after `measuredBoardSize`'s clamp.

Repeat for **three placements** — the fill that matters is the worst one, not the average, because
the automation has to rescue that case. Also record one careful placement as the reference the
user achieves today.

### 2. The zoom ceiling — where do the markers go?

With the board in place, sweep `zoomRatio` 1.0 → 3.0 (steps of 0.25 are enough) and at each step
record:

- how many of the four markers are detected, over ~30 consecutive frames, not a single one —
  detection that works "sometimes" is a lost tracker later;
- the quad edge in pixels, which shows where growth stops being real: while the sensor crop is
  larger than the output, px/square grows with the ratio; past that it flattens and the extra
  ratio is upscaling.

**The usable ceiling is the largest ratio with four markers on every one of those frames.** Not
the largest that "mostly" works.

### 3. Does the automation's target sit under that ceiling?

Combine 1 and 2: `needed = TARGET_FILL / worst casual fill` (with `TARGET_FILL = 0.85`). If
`needed` is comfortably below the usable ceiling, the automation is feasible. If it is above, say
so — and say what the achievable fill would be at the ceiling, because a partial improvement may
still be worth having.

## Steps

### 1. Instrumentation, if needed — commit `feat(android): the debug panel states the board's framing`

Fill fraction, px/square, crop box after the clamp, and marker count, next to the existing camera
facts. Skip if the panel already shows enough.

### 2. `specs/24-frame-the-board/STATUS.md` — commit `docs(specs): phase 00 — is auto-framing feasible, measured`

Casual fills (all three), the careful reference, the zoom/marker table, the sensor flattening
point, and the verdict.

## Verdict, stated as one of

- **BUILD** — the factor a casual placement needs is below the usable ceiling. Name the ceiling
  and the target factor for phase 01.
- **BUILD PARTIAL** — the ceiling is below the ideal target but above 1.0. Name the fill that is
  reachable; the automation still removes manual work, just not all of it.
- **STOP** — markers fail before any useful factor, or the sensor flattens immediately. Then
  automatic framing cannot help and manual alignment stays.

## Tests

None. Instrumentation and measurement.

## Acceptance criteria

- `STATUS.md` contains three casual fills, one careful fill, and the zoom sweep with marker counts
  per step.
- The sensor flattening point is identified from the measurement, not from a spec sheet.
- The verdict names one of the three above, with the numbers that decide it.
- `git diff --stat -- android/app/src/main/kotlin/com/chesslab/tracker/camera` is **empty** — this
  phase does not set a zoom.

## Do NOT / out of scope

- Do not set a zoom ratio in the app. Measuring is not setting.
- Do not calibrate as part of the measurement, and do not write a profile.
- Do not justify the verdict with pixels per square. `entry.md` measured that gain and capped it;
  this phase is about whether a roughly placed camera can be rescued.
- Do not touch `data/`, retrain, or export.
