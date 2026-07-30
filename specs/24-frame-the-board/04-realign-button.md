# Phase 04 — One button that re-measures the optics and the geometry

**Independent of 00–03. Do NOT wait for the zoom verdict — this phase is useful even if phase 00
says STOP, because the problem it solves exists today.**

## Why

The user's report: *"manchmal mache ich die App an und der Fokus stimmt nicht"* — sometimes the app
starts and the focus is wrong.

That is not a bug in the locking, it is the locking working as designed on a bad sample.
`OpticsLock` waits for focus, exposure and white balance to converge and then **freezes them**
(`engage()`, `camera/OpticsLock.kt:116`), which is exactly right for a fixed camera over a static
board: a lens that keeps hunting mid-game changes the picture under the tracker. But if it settles
on the wrong focus — hand in frame at start-up, board not yet placed, low light — that wrong state
is then held for the whole session, and the only escape today is restarting the app.

**The mechanism to escape already exists and is simply unreachable: `OpticsLock.rearm()`
(`:83`).** Nothing in the UI calls it.

## Design (decided — do not redesign)

### One button, in the calibration view, running one sequence

`ui/calibration/CalibrationRoute.kt` already carries `WideButton("Check orientation", …)` and a
"Recalibrate" action whose help text reads *"Recalibrate changes the board geometry only. Your
game keeps running."* Add a sibling, and state the difference in its help the same way:

> **Re-measure camera** — re-runs focus, exposure and white balance, then the board geometry. Use
> it when the picture looks wrong. Your game keeps running.

The sequence, in order:

1. `OpticsLock.rearm()` — release the freeze and let the camera converge again.
2. Wait for `converged()`, with a **timeout**. A camera that never reports convergence (the code
   already notes that a key the device does not report counts as settled) must not hang the
   button.
3. *(only if phase 01 shipped)* compute and set the zoom factor, then continue.
4. Re-detect the markers and re-calibrate — because the optics just changed. Focus breathing moves
   the image slightly, and the profile must describe the picture as it is **now**.
5. Freeze again, exactly as `engage()` does today.

**Order is not negotiable: optics first, geometry second.** A profile measured before the lens
settled describes a picture that no longer exists, and specs/24's entry file states the general
form of this rule for zoom — it applies to focus for the same reason.

### It must report what it did

The button takes a visible moment. Show progress and the outcome, and distinguish the three cases
plainly:

- converged and re-calibrated → the new numbers (focus distance if reported, board quad, px/square),
- converged but markers not found → optics fixed, geometry unchanged, say so,
- convergence timed out → nothing changed, the old lock is still in force.

Silence after pressing a button that changes the optics is the one outcome that must not happen.

### What it must not do

- **Not automatic on start.** The user asked for a button precisely because the automatic path
  sometimes settles wrong; adding a second automatic re-run would just make it settle wrong twice.
  A later phase may add "re-measure if the picture changes drastically", but not this one.
- **Not a live loop.** One press, one sequence.
- **Do not touch the running game.** Same contract as Recalibrate: geometry and optics only.

## Steps

### 1. `camera/OpticsLock.kt` — commit `feat(android): re-measuring the optics is reachable, with a timeout`

Only if `rearm()` needs a timeout or a result. If it is already sufficient, skip this commit and
say so.

### 2. `ui/calibration/**` + the wiring — commit `feat(android): a button that re-measures camera and geometry`

### 3. tests — commit `test(android): re-measure converges, then calibrates, and reports a timeout`

## Tests (write, run once, targeted)

1. **Order** — the calibration runs strictly after convergence is reported, asserted on call
   order. This is the invariant the phase exists to protect.
2. **Timeout leaves the old lock in force** — a camera that never converges changes nothing and
   reports it.
3. **Markers not found** — optics are re-measured and re-frozen, the profile is left alone, and
   the UI says which of the two happened.

```
gradlew.bat :app:testDebugUnitTest --tests '*Optics*' --tests '*Calibration*'
```

Run **once**.

## Acceptance criteria

- `grep -rn "rearm()" android/app/src/main/kotlin` shows a call from the calibration path, not
  only the definition.
- Pressing the button with the board in view produces a new profile whose `savedAtMs` is newer and
  whose quad was measured after convergence.
- All three outcomes above are distinguishable in the UI.
- Targeted tests green; `:app:ktlintCheck :app:detekt` clean.

## Do NOT / out of scope

- Do not make it automatic, and do not add a second trigger.
- Do not change what `OpticsLock` freezes, or the convergence criteria in `settled()`.
- Do not couple this to the zoom work. If phase 01 ships, it hangs its step into this sequence;
  if it does not, this button is complete without it.
