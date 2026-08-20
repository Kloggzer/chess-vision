# Android emulator workflow

The emulator is the normal development target for UI, navigation, persistence, Android
lifecycle and repeatable CameraX runs. A physical phone remains the authority for optics,
camera-driver behaviour, NNAPI, heat, battery use and real-time performance.

## One-time setup

In Android Studio's **SDK Manager**, install/update:

- Android SDK Platform 35;
- Android Emulator **36.6.4 or newer** (`videofile:` camera input was added there);
- an API 35 Google APIs **x86_64** system image.

In **Device Manager**, create a phone AVD named `Chesslab_Agent1` from that x86_64 image.
Create a separate AVD (`Chesslab_Agent2`, and so on) for every concurrently running agent.
An AVD's writable disk and snapshots are not safe to share between emulator processes. The
camera setting in the AVD does not matter because the launcher overrides the back camera.

The equivalent command-line setup for the first two agents is:

```powershell
$avdmanager = "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\avdmanager.bat"
"no" | & $avdmanager create avd --name Chesslab_Agent1 --package "system-images;android-35;google_apis;x86_64" --device pixel_8
"no" | & $avdmanager create avd --name Chesslab_Agent2 --package "system-images;android-35;google_apis;x86_64" --device pixel_8
```

There are three APK types by design:

| Build | ABI | Application id | Use |
|---|---|---|---|
| `debug` | arm64-v8a | `com.chesslab.tracker` | development on a phone |
| `release` | arm64-v8a | `com.chesslab.tracker` | release candidate |
| `emulator` | x86_64 | `com.chesslab.tracker.emulator` | local AVD and agents |

Keeping the ABIs in separate APKs avoids adding a second copy of Stockfish's embedded NNUE
networks to every phone build.

## Before the first build: the Stockfish submodule

`android/app/src/main/cpp/CMakeLists.txt:19-23` hard-fails without it:

```powershell
git submodule update --init --depth 1 android/third_party/stockfish
```

Without that, CMake stops with `Stockfish sources not found at ... Run: git submodule update
--init android/third_party/stockfish` (`specs/13`, `specs/17`). The first configure also downloads
the two NNUE nets and verifies their SHA-256 prefixes — a download failure is a real failure, not a
flake to retry blindly. Unit tests and lint need neither the submodule nor the network
(`FakeAnalysisEngine`). No prebuilt binary and no NNUE net is ever committed.

## Start the complete app

From the repository root:

```powershell
.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -Clip blender-opening
```

`-Clip` accepts either an MP4 path or a stem from `tests/data/testclips`. The command:

1. starts the AVD with that MP4 as its CameraX back camera;
2. builds `:app:assembleEmulator`;
3. installs the APK only on the selected emulator;
4. grants camera/notification permissions and launches the app;
5. runs a smoke test that checks the main navigation, taps **Start tracking**, verifies the
   running state and stores a screenshot under `tmp/android-emulator/emulator-5554/`.

`-Port` fixes both the emulator console port and its ADB serial (`5554` becomes
`emulator-5554`). Use even ports from 5554 onward. If that port belongs to a different AVD, the
script stops with an error; it never commandeers or kills another agent's emulator.

## Run several agents in parallel

Give each agent its own AVD, even port, camera clip and Git worktree:

| Agent | AVD | Port / ADB serial | Example clip |
|---|---|---|---|
| 1 | `Chesslab_Agent1` | `5554` / `emulator-5554` | `blender-opening` |
| 2 | `Chesslab_Agent2` | `5556` / `emulator-5556` | `blender-castle` |
| 3 | `Chesslab_Agent3` | `5558` / `emulator-5558` | `blender-enpassant` |

For example, run these in two terminals:

```powershell
.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -Clip blender-opening
.\scripts\android-emulator.ps1 -Avd Chesslab_Agent2 -Port 5556 -Clip blender-castle -NoBuild
```

Build once before using `-NoBuild`. Concurrent agents should use separate Git worktrees so
Gradle build outputs and source edits do not collide. ADB/UI/smoke artifacts are automatically
isolated by serial. On a typical development machine, start with two 2 GB AVDs and add more only
after checking RAM, CPU and emulator FPS.

Useful variants:

```powershell
# Fast iteration after the APK was already built
.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -NoBuild -NoSmoke

# Camera source is fixed when an AVD boots; restart an existing emulator to change it
.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -Clip blender-castle -RestartExisting

# Agent/CI run without a visible emulator window
.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -Headless

# Only prove that the app launches and renders its main navigation
.\scripts\android-smoke.ps1 -Serial emulator-5554 -LaunchOnly
```

Without `-RestartExisting`, the named AVD already running on the requested port is deliberately
reused and its current camera source is left alone. `-RestartExisting` only restarts that exact
AVD/port pair. It never stops all running emulators.

## Agent controls

`android-ui.ps1` exposes small ADB operations that work from Codex, Claude Code or a human
terminal. Text and content descriptions are preferred over pixel coordinates:

```powershell
.\scripts\android-ui.ps1 dump -Serial emulator-5554
.\scripts\android-ui.ps1 screenshot -Serial emulator-5554
.\scripts\android-ui.ps1 tap-text -Serial emulator-5554 -Text "Camera"
.\scripts\android-ui.ps1 tap-description -Serial emulator-5554 -Text "Back"
.\scripts\android-ui.ps1 type -Serial emulator-5554 -Text "example"
.\scripts\android-ui.ps1 swipe -Serial emulator-5554 -X 500 -Y 1500 -X2 500 -Y2 500
.\scripts\android-ui.ps1 back -Serial emulator-5554
.\scripts\android-ui.ps1 logcat -Serial emulator-5554
```

`dump` prints the visible text, content descriptions, clickability and bounds and saves the
complete UI hierarchy. `screenshot` saves a PNG. With multiple emulators, `-Serial` is mandatory;
defaults go to `tmp/android-emulator/<serial>/`. `-ArtifactDir` can override that directory.

The text commands depend on Compose semantics. New icon-only controls must therefore keep a
meaningful `contentDescription`; controls whose visible label changes should use stable wording
or gain a dedicated UI test.

## What the emulator cannot do

### `videofile:` delivers only the left half of the frame

Measured 2026-08-04 with a numbered 4x3 grid clip (`specs/49`). Of the twelve cells the app
receives **1, 2, 5, 6, 9, 10** — the left half of the frame, all rows.

Consequence: the Blender boards sit in the middle of a 640x640 frame, so **two of the four ArUco
markers are always outside the delivered image**. `resolveBoardCorners`
(`android/core-geometry/.../Aruco.kt:233`) never fires; `chesslabPerf` logs
`skip=waiting for markers...` on every frame and the app never leaves `not calibrated`.

Re-authoring the clip so the whole board lands inside that left half does not fix it: at a 620 px
board in a 1280x1280 source, with all four markers visible and legible on screen, the app still
reads `No board yet` — **the emulator's own rescale blurs the marker edges past what
`ArucoCalibrator` accepts**. Five variants were tried and none calibrated: 16:9 letterbox, 640x480,
board at 340 px, board at 620 px, and a still `blender-resting` crop.

**No screenshot in this repository has ever shown a calibrated tracker on the emulator.** This is
not a regression: `specs/48`'s own `screenshots/dark/paper-02b-tracker-tracking.png` reads
`not calibrated` in its top-right corner. Only a phone run closes this, and `CLAUDE.md`'s install
warning means it has to be a deliberate, backed-up one.

The measurement instrument itself, `camprobe.py`, was never committed and is not in the repo.

### Instruments that lie: use `dumpsys notification`

`specs/43` (Xiaomi `24117RK2CG`, 2026-08-03):

| want | use | not |
|---|---|---|
| "the app posted no notification" | `dumpsys notification --noredact`, count `NotificationRecord.*pkg=com.chesslab.tracker` | `dumpsys notification_manager` |

`dumpsys notification_manager` **answers with nothing on this ROM and therefore reads as a pass
whatever the truth is.** Any check built on it is a false pass, not a check.

## What runs where

- Fast engine/geometry/CNN checks remain desktop JVM tests: `:app:testDebugUnitTest` and the
  opt-in `-Pchesslab.sim=true` clip simulation.
- The emulator exercises the Android app, CameraX, permissions, foreground service, navigation
  and storage against deterministic video.
- A phone smoke test is still required before release for camera calibration, focus/exposure,
  device execution providers and measured FPS.

The emulator's `videofile:` facility is documented in the official
[Android Emulator command-line reference](https://developer.android.com/studio/run/emulator-commandline).

This parallel workflow was exercised on 2026-08-03 with two simultaneous headful API 35 x86_64
AVDs. Both installed the emulator APK independently and passed the CameraX smoke check with live
FPS readings and separate screenshots.
