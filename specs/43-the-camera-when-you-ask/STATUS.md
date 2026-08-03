# 43 — Status

| Phase | State | Note |
|---|---|---|
| — | `todo` | entry written 2026-08-03 from the user's two decisions |

## Established before the pack was written

| Fact | Where |
|---|---|
| The whole nav host is wrapped in `BindTrackerService` | `MainActivity.kt:65` |
| It calls `startForegroundService` then `bindService`, unconditionally | `ui/TrackerServiceBinding.kt:111-112` |
| It already has a service-absent branch | same file, `if (bound == null) content()` |
| The service is the single CameraX owner; a second binding froze the feed | memory `android-single-camera-owner` |
| `startForegroundService` must precede the camera bind (Android 14) | `BindTrackerService` KDoc |
