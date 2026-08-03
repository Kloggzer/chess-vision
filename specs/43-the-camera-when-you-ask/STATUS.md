# 43 — Status

| Phase | State | Note |
|---|---|---|
| — | `done` | implemented and measured on the device 2026-08-03, branch `spec43-camera-when-you-ask` off `spec42-one-board-two-clocks` |

## What was built

| Piece | Where |
|---|---|
| The run switch the composition binds on | `service/TrackerRun.kt` |
| Binds only while it is on; `startForegroundService` still precedes the bind | `ui/TrackerServiceBinding.kt` |
| The activity asks for nothing and starts nothing | `MainActivity.kt` |
| The one control that opens a camera, and the camera permission with it | `ui/tracking/TrackingSwitch.kt` |
| A third header rung above the paused camera (`Feed.OFF`) | `ui/tracking/StatusUiModel.kt` |
| The board keeps the position it last had when the service goes | `ui/tracking/TrackingViewModel.kt` |
| The live review says "no game running" instead of showing one | `ui/review/GameReviewScreen.kt` |
| The settings repository belongs to the process, not to the tracker | `settings/SettingsRepository.kt` (`SettingsHost.get`) |

Screenshots in `shots/`: the launched app with no camera (01), the engine review of a stored game
with the camera never bound (02), the Board tab tracking (03), and back to not tracking (04).

## Measured on the device (Xiaomi `24117RK2CG`, `f86dfdca`), 2026-08-03

The app data was pulled BEFORE the install (`adb exec-out run-as com.chesslab.tracker tar cf - .`,
3.7 MB, into the agent scratchpad) and re-checked after it: `files/games/2026-08-02_2159.{json,pgn}`,
`index.json` and the diagnostics files all survived `adb install -r`.

### Cold start on a fresh process

| Claim | How it was read | Result |
|---|---|---|
| Binds nothing | `dumpsys activity services com.chesslab.tracker` | `(nothing)`, 0 `ServiceRecord` |
| Posts no notification | `dumpsys notification --noredact`, count of `NotificationRecord.*pkg=com.chesslab.tracker` | 0 |
| Opens no camera | `dumpsys media.camera` | `Active Camera Clients: []` |
| Attaches no CNN | `wc -c files/diagnostics/*.ndjson` before and after | 5308 → 5308, no new `run_start` row |
| Starts no engine | `ps -A` | no `libstockfish.so` |

`dumpsys notification`, NOT `dumpsys notification_manager` — the latter answers with nothing on this
ROM and reads as a pass whatever the truth is.

### Games and review with the camera never bound

Opened `2026-08-02_2159` (83 plies) and ran "Review with engine" to completion — 84 positions,
~3.5 min, White 77 cp / Black 145 cp. `Active Camera Clients: []` throughout, `libstockfish.so` in
`ps` while it ran and gone afterwards.

### Start, survive, stop

| Step | Result |
|---|---|
| Start tracking | `isForeground=true … types=0x00000040` (CAMERA), notification posted, camera client 0 held, a new `run_start` row appears — so the CNN attaches on START, not on launch |
| Switch to Games and back | service still there, still foreground, camera still held |
| Home (app backgrounded) | unchanged — a running game survives leaving the app |
| Stop from the Board button | service gone, `Active Camera Clients: []`, notification gone |
| Stop from the NOTIFICATION with the app backgrounded | camera released and notification gone immediately; the `ServiceRecord` lingers until the app is resumed, because the bound composition only unbinds when its lifecycle resumes. The game is already saved by then — `endService` saves it rather than leaving it to `onDestroy`, for exactly this window |

## What was NOT verified, and why

- **"…and the move list intact."** No moves were produced: the phone was not on its board mount and
  the tracker never calibrated (`not calibrated · camera 31 fps`). What was verified is the
  mechanism the claim rests on — the service, its game session and its camera survive a tab switch
  and a home press, and only an explicit stop ends them.
- **The permission-denied branch of `TrackingSwitch`.** The device has already granted camera
  access, so the request never appeared. The grant path (permission present → `TrackerRun.start()`)
  is what ran.

## What is NOT done, and why

- **The camera-pause chip stays** ("Tracking · camera on" / "Stopped · tap to resume"). It is a
  different act from stopping — it releases the device and KEEPS the game — so the Board tab carries
  both while tracking. Folding them together would change tracker behaviour nobody asked to change.
- **`CONFIG_SCHEMA_VERSION` was not touched.** Nothing here needs a stored-config change, and a bump
  restores every knob to defaults.
