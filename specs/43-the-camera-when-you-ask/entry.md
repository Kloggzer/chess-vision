# 43 — The camera when you ask for it

The app binds the camera on launch, always. `MainActivity` wraps the entire nav host in
`BindTrackerService`, which calls `startForegroundService` unconditionally — so opening the app to
look at a finished game, read the settings or watch the spectator board starts the camera, the
foreground notification and the CNN attach.

The user, 2026-08-03: *"can we start tracking only when asked for? not when starting the app,
because this is no longer the sole purpose of the app."*

That is now plainly true. Since specs/42 the app also reviews stored games with an engine, and
`GamesScreen`, `GameReviewScreen` and the settings never touch a frame.

## The two decisions, made by the user 2026-08-03

1. **A button on the Board tab starts tracking.** The app launches with no camera at all. Nothing
   else — Games, Spectator, Review, Speech, Settings — may bind the service. Not a tab-driven
   auto-start: switching tabs mid-game must not end the game.
2. **A running game survives everything except an explicit stop.** The foreground service keeps
   running while the user is in Games or Review or outside the app; it ends on the button or on the
   notification action. This is what the app does today and it stays.

## What makes this delicate

`docs`/memory record two failures at exactly this seam, and both are still true:

- **There must be exactly ONE CameraX owner, and it is the service.** A second
  `ProcessCameraProvider` binding in the calibration screen froze the feed on every tab switch.
  The calibration screen therefore reads the SERVICE's frames through a CompositionLocal.
- **`startForegroundService` must precede the camera bind.** A bind-only start yields a background
  service that Android 14 kills the moment it touches the camera. `BindTrackerService`'s KDoc says
  so; keep that ordering wherever the start moves to.

So the change is not "call `startForegroundService` later" — it is that the composition which
provides `CalibrationHost` and `TrackerSessionHost` must tolerate the service being ABSENT, and
every consumer must render a sane state when it is. `BindTrackerService` already has the null
branch (`if (bound == null) content()`); what is missing is a way to stay in it deliberately.

## Scope

1. The launch path binds nothing. Verify with `adb`: after a cold start on the Games tab there is
   no foreground notification, no camera indicator, and no CNN attach in the diagnostics.
2. A start control on the Board tab, and a stop that is reachable from the notification.
3. Every screen that does not need frames renders correctly with no service bound. The Board tab
   without tracking is a legitimate state, not an error card — it shows the position it last had.
4. The Spectator/live source with no tracker running shows "no game running", not an empty board
   pretending to be a position.

## Acceptance

- Cold start → Games → engine review works end to end with the camera never bound.
- Start tracking → switch to Games → come back: the game is still running and the move list intact.
- Android gate green with `--rerun-tasks`: `:app:ktlintCheck :app:detekt :core-engine:detekt
  :core-engine:ktlintCheck :core-engine:test :app:testDebugUnitTest`.
- Screenshots of the launched app with no camera running, and of the Board tab in both states.
