# Phase 06 — LAN spectator server (nice-to-have)

## Why

Replaces the desktop web UI's remote-view role: a second device on the same
network opens a browser and watches the live game state (board, moves, status).
View-only — no control endpoints.

## Design (decided — do not redesign)

Package `com.chesslab.tracker.spectate` in `:app`. Dependencies (this phase adds
them): `io.ktor:ktor-server-cio`, `ktor-server-content-negotiation`,
`ktor-serialization-kotlinx-json` (2.x/3.x latest stable).

```kotlin
class SpectatorServer(port: Int = 8420) : GameStateSink {   // interface from phase 04
    override fun publish(state: GameSnapshot)  // fen, sanHistory, status, lastDecision, result
    fun start(); fun stop()
    val url: StateFlow<String?>                // e.g. http://192.168.1.23:8420
}
```

- Routes (GET only, mirror the read-only subset of `move_tracker/app.py`):
  - `GET /` — single self-contained HTML page (embedded string resource, no
    assets, no CDN): board rendered client-side from FEN via inline JS + inline
    SVG pieces, move list, status chip; polls `/api/status` every 1 s (the
    Python UI also polls, `index.html`; no websocket).
  - `GET /api/status` — JSON `GameSnapshot`.
- No video stream (privacy + battery; explicitly out of scope for v1).
- mDNS/NSD advertisement `_chesslab._tcp` via `NsdManager` so the URL is
  discoverable; the settings row also shows the URL + a QR code (generate QR
  with a small pure-Kotlin implementation or `zxing-core`, Apache-2.0).
- Settings section (via phase 04 extension point): server on/off (default OFF),
  port, URL/QR display. Server only ever binds when the user enables it.
- Runs inside `TrackerService`; stops with the service.

## Steps

1. `GameSnapshot` + `SpectatorServer` (Ktor CIO, routes) + unit test (start server on random port, GET both routes, assert JSON round-trip) — commit `feat(android-spectate): ktor spectator server`
2. Embedded HTML page (FEN board, polling) — commit `feat(android-spectate): spectator web page`
3. NSD advertisement + settings section + QR — commit `feat(android-spectate): discovery and settings`

## Tests (write, run once, targeted)

`./gradlew :app:testDebugUnitTest --tests "com.chesslab.tracker.spectate.*"`

## Acceptance criteria

- [ ] Server unit test green (status JSON contains fen + history).
- [ ] `grep -rn "POST\|put(\|delete(" android/app/src/main/kotlin/com/chesslab/tracker/spectate` → no mutating routes.
- [ ] Default OFF; no `INTERNET`-bound listener unless enabled (check service wiring).
- [ ] HTML page has zero external URLs (`grep -n "http" spectator page source` → none besides comments).

## Do NOT

- No video/MJPEG streaming, no control endpoints, no auth system (LAN view-only v1).
- Do not edit `ui/` files — extension point only.
