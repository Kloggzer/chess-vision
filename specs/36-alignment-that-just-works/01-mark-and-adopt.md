# 01 — Mark the board, and offer to use it

> Owns `ui/camera/BoardMode.kt`, `CameraRoute.kt`, `CameraChrome.kt`,
> `ui/calibration/CalibrationHost.kt`, `ui/ChesslabNavHost.kt`, `ui/TrackerServiceBinding.kt`,
> `service/CameraSwitch.kt`. Runs after phase 00.

## Why

With the wizard gone the camera screen has one job it did not have before: be the only place the
board is ever set up. That has to work without a mode switch, because with one mode there is no
mode — "Board" was never a different activity, it was the same viewfinder with a different overlay.

What the user can actually act on while looking at a live picture is exactly two things: whether the
outline sits on the board, and what is stopping the app if nothing is found. Both are answerable by
moving the phone. Nothing else on the old screen was.

## Design

One screen. Viewfinder, the outline of the board the app can see, the look controls (focus, zoom,
EV, colour, lock, light), one sentence, and — only when a board is found — one button.

**The button carries no verdict.** It is enabled whenever `state.found`. There is no measured gate,
for the reason `entry.md` gives: the quantity a gate would test is noisy at the scale the thresholds
would sit at, it would be read before the refinement that exists to improve it, and the thing it
would protect is a seed the live path replaces. A gate here can only refuse a user whose board is
fine.

**Chrome over a picture is filled, never outlined.** Every control on this screen floats over a live
viewfinder; over wood grain in room light a one-pixel outline is the first thing to disappear. The
deck wears `BottomFade`, controls sit on `ChromeScrim`. This is a standing rule for the camera
components, not a note about one button.

## Steps

1. **`refactor: one camera screen`** — delete `CameraMode`, `ModeStrip` and the `mode` state. The
   viewfinder's overlay is the framing grid plus `BoardOutline`; the deck is the look tiles plus the
   board sentence and button. `CameraRoute(onBack)` loses `startMode`.
2. **`feat: the board outline`** — `BoardOutline(state)` draws `QuadOutline` at the detected frame
   size. It replaces `FramingOverlay`'s saved-profile quad as the primary aiming aid: the saved quad
   answers "has it drifted since last time", the live one answers "can it see the board now", and
   the second question is the one being asked while aiming. Keep the thirds grid.
3. **`feat: the sentence and the button`** — `BoardDeck(state, onUse)` renders `state.note` and,
   when `state.found`, a filled full-width button reading `Use this board` / `Board in use`.
4. **`refactor: calibration is not a destination`** — `ROUTE_CALIBRATION` resolves to the camera
   screen. The tracking screen's `onRecalibrate` navigates there. `CalibrationHost` keeps
   `latestCalibrationFrame`, `rawPreview`, `previewRotation`, `onCalibrated`.

## Tests

- `BoardDeck` has no logic worth a unit test; `boardNote` is tested in phase 00.
- `CameraViewModel`'s existing tests must stay green untouched. If a change to `CameraRoute` needs
  them edited, the change is wrong.

## Acceptance

- One tap from the tracking screen to a camera screen that shows the board outlined, and one tap
  there to adopt it. No other screen is involved.
- `grep -rn "CameraMode\|ModeStrip\|startMode" android/ | grep -v /bin/` returns nothing.
- The gate is green with `--rerun-tasks`, and `assembleDebug` produces an installable APK.

## Do NOT

- Do not add a quality number, a meter, a colour or a verdict word to the sentence. The sentence
  says what the app can see and what to do about it; a number the user cannot act on is decoration
  with a false air of precision.
- Do not auto-save on detection. A geometry write is the user's act, and the tracker keeps running
  on the old one until they make it.
- Do not use `OutlinedButton`, bare `Text` on the picture, or any control without a scrim.
- Do not re-introduce a second orientation control here.
