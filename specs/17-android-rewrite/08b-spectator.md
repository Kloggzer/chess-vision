# Phase 08b — LAN spectator: read-only live board over Wi-Fi, joined by QR

> Module `:app`, package `com.chesslab.tracker.spectate`. There is no Python counterpart —
> the desktop equivalent is the FastAPI web UI (`src/chesslab/move_tracker/app.py`), which
> is a *control* surface; this is deliberately not.
> Runs in parallel with 08a and 08c — file ownership is strictly disjoint.
> You MAY read `android-legacy/**` for **Android API usage only**: `spectate/SpectatorServer.kt`
> (Ktor CIO `embeddedServer`, `NetworkInterface`/`Inet4Address` enumeration, ZXing
> `QRCodeWriter` → `Bitmap`), `spectate/SpectatorPage.kt` (self-contained HTML), and
> `spectate/GameSnapshot.kt` (the wire projection). You MUST NOT copy its architecture —
> notably it advertised over NSD and picked a free port dynamically; both are dropped here.

## Files you own

| File | Contains |
|---|---|
| `android/app/src/main/kotlin/com/chesslab/tracker/spectate/SpectatorServer.kt` | Ktor CIO server, lifecycle, binding |
| `.../spectate/GameSnapshot.kt` | the read-only wire projection |
| `.../spectate/SpectatorPage.kt` | the self-contained HTML page |
| `.../spectate/WifiAddress.kt` | Wi-Fi interface discovery |
| `.../spectate/QrCode.kt` | ZXing URL → bitmap |
| `.../spectate/ui/SpectatorScreen.kt` | toggle, URL, QR, running indicator |
| `android/app/build.gradle.kts` | the Ktor + ZXing dependencies |
| `android/app/src/test/kotlin/com/chesslab/tracker/spectate/*Test.kt` | tests |

You own **nothing else**. `games/**`, `record/**`, `ui/Nav.kt`, `ui/settings/SettingsScreen.kt`
and `AndroidManifest.xml` belong to 08a; `speech/**` and `service/TrackerService.kt` to 08c.

- 08a adds `android.permission.INTERNET` and `android.permission.ACCESS_NETWORK_STATE` to
  the manifest on your behalf. If they are absent at build time, **STOP** and record a
  blocker — do not edit the manifest.
- 08a routes to your screen by the exact name `com.chesslab.tracker.spectate.ui.SpectatorScreen`.
  Keep that fully-qualified name.
- Dependencies are already in `android/gradle/libs.versions.toml` from 00a
  (`ktor-server-cio`, `ktor-server-content-negotiation`, `ktor-serialization-kotlinx-json`,
  `ktor-server-test-host`, `zxing-core`). Wire them in `build.gradle.kts`; do not bump or
  add versions. Ktor is Apache-2.0, ZXing Apache-2.0 — both GPL-3.0-compatible.
- `service/TrackerService.kt` is owned by 08c. You do not edit it; you consume
  `TrackerService.uiState: StateFlow<UiState>` from your own foreground-scoped collector.
  Missing → **STOP** and record a blocker.

## Why

A club board with a phone on a stand should be watchable from any other phone in the room
without an account, an app, or an internet connection. That is a small Ktor server and a QR
code. It is also the largest attack surface in the app, so it is built with the smallest
possible one: **no write endpoints exist at all**, so there is nothing on the network that
can alter the game.

## Design (decided — do not redesign)

### 1. Lifecycle: off by default, explicit, visible

- Default **off**. Persisted in 07a's `SettingsRepository` (key `spectatorEnabled`); you
  read and write it through that repository — do not create a second store.
- Started only by the user's toggle on `SpectatorScreen`. Never auto-started on app launch,
  never started by tracking beginning.
- While running: a **persistent, non-dismissible in-app indicator** — a chip in the
  tracking screen's status row is 06b's file, so instead render (a) a dot + "LAN spectator
  on · <url>" in the spectator screen header and (b) an ongoing **notification** in the
  app's existing tracking notification channel, with a "Stop" action. The user must never
  be able to forget it is running.
- Stopped on the toggle, on `onDestroy` of the owning service scope, and when the Wi-Fi
  interface disappears.
- Server state is a `StateFlow<SpectatorState>`:
  `Off | Starting | Running(url, port, ssidLabel) | NoWifi | Error(reason)`.

### 2. Binding: Wi-Fi interface only

`WifiAddress.current()` enumerates `NetworkInterface.getNetworkInterfaces()` and returns
the first **non-loopback, up** interface whose name starts with `wlan` and that has a
site-local IPv4 (`Inet4Address`, `isSiteLocalAddress`). Bind `embeddedServer(CIO, host =
<that address>, port = PORT)` — **not** `0.0.0.0`. A cellular/USB-tether interface must
never be bound.

`PORT = 8420`, fixed. A fixed port is what makes the URL predictable and the QR stable; if
the port is already in use, fail loudly with `Error("port 8420 in use")` rather than
silently drifting to another port (which is what the legacy dynamic-port code did and why
the displayed URL could go stale).

**No Wi-Fi:** if `WifiAddress.current()` returns null, the toggle stays off, the state is
`NoWifi`, and the screen shows "Connect to Wi-Fi to share the board — mobile data is not
used". Polled again on network-callback changes; when Wi-Fi returns and the toggle is on,
the server starts. When Wi-Fi drops while running, the server stops and the state goes to
`NoWifi` — a half-dead server is worse than no server.

### 3. Endpoints — read-only, exhaustively

| Method | Path | Response |
|---|---|---|
| `GET` | `/` | `SpectatorPage.html()` — one self-contained document |
| `GET` | `/api/status` | `GameSnapshot` as JSON |

That is the complete routing table. **No `POST`, `PUT`, `PATCH`, `DELETE`, or WebSocket
route may exist**, and no handler may call into the tracker, the engine, the game store, or
settings. A test asserts the route list is exactly these two and that every non-GET request
returns 405.

```kotlin
@Serializable
data class GameSnapshot(
    val fen: String,
    val sanHistory: List<String>,
    val lastMoveUci: String?,        // for highlighting the last move on the page
    val status: String,              // "waiting" | "tracking" | "stuck" | "alarm" | "over"
    val result: String?,
    val updatedAtEpochMs: Long,
)
```

Projected from `UiState` only. It carries **no** engine internals, no z values, no CNN
reads, no crops, no decision provenance, no config, no device info — a spectator page is
not a debug surface and leaking the debug payload onto the LAN is not acceptable.

### 4. The page

`SpectatorPage.html(snapshot)` is a single self-contained document: inline CSS, inline JS,
Unicode chess glyphs or inline SVG pieces — **no external requests of any kind** (the LAN
has no internet guarantee, and a CDN reference would simply render a blank board). It polls
`/api/status` every 1000 ms and re-renders; the board is oriented White-at-the-bottom with
the last move highlighted, the move list beside it, and a status line. Dark and light are
both handled via `prefers-color-scheme`.

### 5. QR code

`QrCode.forUrl(url, sizePx)` → `Bitmap` via ZXing `QRCodeWriter` (`BarcodeFormat.QR_CODE`,
margin 1, `ARGB_8888`). Size clamped to 64…2048 px. Rendered on `SpectatorScreen` beneath
the plain-text URL (the URL must always be readable as text — QR scanning fails often
enough that a fallback is mandatory), with a "Copy URL" action.

### 6. Threading

The server runs in its own `CoroutineScope(Dispatchers.IO + SupervisorJob())`. It reads the
latest `GameSnapshot` from an immutable `@Volatile`-free `StateFlow` updated by a collector
on `uiState`; request handlers never touch tracker state and never block. Serving a page
must not appear in the frame budget — verify on device in phase 09 (the timings panel must
not move when a spectator is connected).

## Steps

### 1. Dependencies + `WifiAddress` — commit `feat(android-spectate): Wi-Fi-only interface discovery and Ktor/ZXing wiring`

### 2. `GameSnapshot` + `SpectatorPage` — commit `feat(android-spectate): read-only game snapshot and a self-contained spectator page`

### 3. `SpectatorServer` — commit `feat(android-spectate): Ktor CIO server on port 8420, two GET routes, no write surface`

### 4. `QrCode` + `SpectatorScreen` + running indicator — commit `feat(android-ui): spectator screen — toggle, URL, QR code and an ongoing indicator`

Run once:
`.\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.spectate.*"`
(use `ktor-server-test-host` for the route tests — no device needed).

## Tests

| Kotlin test | Guards |
|---|---|
| `routeTableIsExactlyTwoGets` | reflection/route-inspection: `/` and `/api/status`, nothing else |
| `postPutPatchDeleteReturn405` | every verb on both paths |
| `unknownPathReturns404` | no accidental static-file serving |
| `snapshotCarriesNoEngineInternals` | reflection over `GameSnapshot`: no z/census/crops/decision/config field |
| `snapshotProjectsAlarmAsStatus` | alarm → `"alarm"`, never a stack of internals |
| `pageHasNoExternalReferences` | the HTML contains no `http://`, `https://`, `//cdn`, `<script src`, `<link href` |
| `pagePollsStatusEndpoint` | the inline JS references `/api/status` |
| `serverIsOffByDefault` | constructing the component starts nothing |
| `startWithoutWifiYieldsNoWifi` | fake `WifiAddress` returning null → `NoWifi`, no socket opened |
| `wifiLossWhileRunningStopsServer` | state → `NoWifi`, port released |
| `portInUseYieldsErrorNotAnotherPort` | occupy 8420 → `Error`, no silent fallback |
| `bindsWifiAddressNotWildcard` | the recorded bind host equals the fake Wi-Fi address, never `0.0.0.0` |
| `qrEncodesTheDisplayedUrl` | decode the generated bitmap back to the URL |
| `qrSizeIsClamped` | 10 → 64, 9999 → 2048 |
| `stopReleasesThePort` | rebind succeeds immediately after stop |

## Acceptance criteria

- `grep -rn "post(\|put(\|patch(\|delete(\|webSocket(" android/app/src/main/kotlin/com/chesslab/tracker/spectate/` returns **nothing**.
- `grep -n "0.0.0.0" .../spectate/SpectatorServer.kt` returns **nothing**.
- `grep -n "8420" .../spectate/SpectatorServer.kt` hits the single fixed port constant.
- `grep -rn "http://\|https://\|<script src\|<link href" .../spectate/SpectatorPage.kt` returns **nothing**.
- `grep -rn "NsdManager" android/app/src/main/kotlin/` returns **nothing** (NSD is dropped).
- `grep -rn "spectatorEnabled" .../spectate/` reads the shared `SettingsRepository`, and the
  default resolves to `false`.
- All 15 tests green; `:app:ktlintFormat` then `:app:detekt` clean.
- `STATUS.md` row 08b `done`.

## Do NOT

- Do NOT add any endpoint that mutates state — not undo, not reset, not "set FEN", not a
  config read, not even behind a token. Read-only is the security model, not a phase-1
  simplification.
- Do NOT bind `0.0.0.0` or any non-Wi-Fi interface.
- Do NOT fall back to a different port; a stale URL/QR is a worse failure than a clear error.
- Do NOT serve engine internals, debug payloads, crops, or config on the LAN.
- Do NOT reference any external asset from the page.
- Do NOT auto-start the server, and do NOT let it run without a visible indicator.
- Do NOT re-add NSD/mDNS advertisement.
- Do NOT edit `AndroidManifest.xml`, `ui/Nav.kt`, `ui/settings/SettingsScreen.kt`,
  `games/**`, `record/**`, `speech/**`, or `service/TrackerService.kt`.
- Do NOT add or bump a dependency version — the catalog from 00a is the contract.
