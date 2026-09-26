# Android emulator workflow

The emulator is the development target for UI, navigation, persistence, lifecycle and repeatable
CameraX runs. A physical phone remains the authority for optics, camera driver, execution
providers, heat, battery and real-time performance — and a phone smoke test is required before
release. Fast engine/geometry/CNN checks stay desktop JVM tests (`:app:testDebugUnitTest`, opt-in
`-Pchesslab.sim=true` clip simulation).

## One-time setup

SDK Manager: Android SDK Platform 35, Android Emulator **36.6.4 or newer** (`videofile:` camera
input), an API 35 Google APIs **x86_64** image. Create one AVD per concurrently running agent — an
AVD's disk and snapshots are not safe to share:

```powershell
$avdmanager = "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\avdmanager.bat"
"no" | & $avdmanager create avd --name Chesslab_Agent1 --package "system-images;android-35;google_apis;x86_64" --device pixel_8
"no" | & $avdmanager create avd --name Chesslab_Agent2 --package "system-images;android-35;google_apis;x86_64" --device pixel_8
```

The AVD's camera setting does not matter; the launcher overrides the back camera.

| Build | ABI | Application id | Use |
|---|---|---|---|
| `debug` | arm64-v8a | `com.chesslab.tracker` | development on a phone |
| `release` | arm64-v8a | `com.chesslab.tracker` | release candidate |
| `emulator` | x86_64 | `com.chesslab.tracker.emulator` | local AVD and agents |

Separate APKs keep a second copy of Stockfish's NNUE nets out of every phone build.

**Before the first build**, the Stockfish submodule (CMake hard-fails without it):

```powershell
git submodule update --init --depth 1 android/third_party/stockfish
```

The first configure downloads the two NNUE nets and checks their SHA-256 — a download failure is a
real failure. Unit tests and lint need neither (`ScriptedEngineProcess`). No binary or net is
committed.

## Start the app

```powershell
.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -Clip blender-opening
```

`-Clip` is an MP4 path or a stem from `tests/data/testclips`. The script boots the AVD with that
clip as back camera, builds `:app:assembleEmulator`, installs only on that emulator, grants
permissions, launches, and runs a smoke test (navigation, **Start tracking**, screenshot under
`tmp/android-emulator/emulator-5554/`). `-Port` fixes console port and ADB serial; use even ports
from 5554. The script never commandeers or kills another agent's emulator.

```powershell
.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -NoBuild -NoSmoke          # fast iteration
.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -Clip blender-castle -RestartExisting
.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -Headless
.\scripts\android-smoke.ps1 -Serial emulator-5554 -LaunchOnly
```

The camera source is fixed at boot: without `-RestartExisting` a running AVD on that port is reused
as is; `-RestartExisting` restarts only that AVD/port pair.

**Several agents:** own AVD, even port, clip and Git worktree each (Agent 2: `Chesslab_Agent2`,
5556, `-NoBuild` after one build). Artifacts are isolated by serial. Start with two 2 GB AVDs.

## Agent controls

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

With several emulators `-Serial` is mandatory; output defaults to `tmp/android-emulator/<serial>/`
(`-ArtifactDir` overrides). The text commands rely on Compose semantics: icon-only controls need a
`contentDescription`, and labels that change need stable wording or their own UI test.

## What the emulator cannot do

- **The tracker never calibrates on the emulator.** `videofile:` delivers only the left half of
  the frame (measured 2026-08-04), so two of four ArUco markers are always outside; and a clip
  re-authored into that half still fails, because the emulator's rescale blurs marker edges past
  what `ArucoCalibrator` accepts (five variants tried). Only a deliberate, backed-up phone run
  closes this.
- **Use `dumpsys notification --noredact`**, counting
  `NotificationRecord.*pkg=com.chesslab.tracker`. `dumpsys notification_manager` answers with
  nothing on the Xiaomi ROM and reads as a pass whatever the truth is.

Reference: [Android Emulator command-line](https://developer.android.com/studio/run/emulator-commandline).
