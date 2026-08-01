# Phase 01 — the phone ships it

> Depends on **00**. Runs in parallel with **02** (disjoint files, shared wire contract).
> **You own the envelope schema.** See *Artifact authority* in `entry.md`.

## Why

The rows exist and are thrown away. This phase gets them off the device without ever touching the
analyzer thread's budget and without losing them when the PC is asleep — which is the normal case,
not the edge case.

## Design (decided — do not redesign)

### The path

```
analyzer thread   sink(DebugDecision) ──► Telemetry.offer(row)  = ONE Channel.trySend
                                             │  O(1), non-suspending, cannot block
                                             ▼
                  Channel(capacity = 512, onBufferOverflow = DROP_OLDEST)
                                             │
telemetry thread  drain → stamp (wall clock, seq, thermal) → APPEND TO SPOOL → batch → POST
    (Dispatchers.IO, process lifetime, mirrors SpectatorHost)
```

**The spool is the design, not belt-and-braces.** Rows are appended to
`filesDir/telemetry/spool.ndjson` **before any network attempt**. The uploader ships from the spool
and truncates the shipped prefix on 2xx. A memory-only queue loses exactly the session you drove
somewhere to record.

### Files — all new, all under `android/app/src/main/kotlin/com/chesslab/tracker/telemetry/`

```kotlin
// Envelope.kt — YOU OWN THIS SCHEMA
@Serializable
data class Envelope(
    val v: Int = 1,
    val ts: String,          // ISO-8601 UTC, stamped on the telemetry thread
    val device: String,      // stable per install: "<model>-<8 hex of an install id>"
    val run: String,         // new per tracker start
    val seq: Long,           // monotonic per run, assigned at stamp time
    val kind: String,        // run_start | decision | perf | event | game | run_end
    val game: String? = null,
    val session: String? = null,
    val payload: JsonElement,
)
```

```kotlin
// Spool.kt      — append(line), readBatch(max), truncatePrefix(n), size, dropped
// Uploader.kt   — Ktor client CIO; POST NDJSON; exponential backoff 1s→60s; never throws upward
// Discovery.kt  — the ladder below
// TelemetryHost.kt — object, process lifetime; offer(); start/stop with the tracker
```

### Discovery — a ladder, not a mechanism

```
1. persisted endpoint from DataStore   ← tried FIRST, every time, always
2. NsdManager (_chesslab._tcp.local.)  ← first run, after N consecutive failures, or "Find server"
3. chesslab.local:8000                 ← one line, often just works
4. manual host:port in settings        ← the escape hatch
```

Before an endpoint is trusted, validate with `GET /api/ingest/hello` (phase 02 returns server
version + this device's last-seen `seq`). That is also what lets the settings row say
**"connected to 192.168.1.42, last row 1187"** instead of "saved".

`NsdManager` is **not** the contract — it is historically flaky, multicast gets power-saved on some
ROMs. The persisted endpoint is the contract. The user types an IP **once, ever**, and only if mDNS
is broken on their network.

### What ships

| kind | when | payload |
|---|---|---|
| `run_start` | tracker start, and on every `SettingsRepository.update` | `ConfigCodec.encode(config)` + model identity (see below) + geometry + device + app build |
| `decision` | every sink call — **commits AND rejections** | `DebugDecision` |
| `perf` | 10 s rollup, **plus** every line whose `frame` exceeded `AnalysisGate.FRAME_BUDGET_MS = 66.0`, capped per window | p50/p95/max `frame`, mean `fps`/`idle`, counts by `skip` reason, min `luma`, `PowerManager.getCurrentThermalStatus()` |
| `event` | `TrackerEvent.Stuck / Alarm / AlarmCleared / Note`, plus `RecordingGates` transitions | the event |
| `game` | `GameStore.save` | `StoredGame` JSON + PGN |
| `run_end` | tracker stop | `dropped` counters — spool and channel, separately |

**Model identity is the point of `run_start`.** `modelDir`, `modelAsset`, `infer_size` from the
model's `config.json`, **a content hash of the graph file**, the requested EP and the EP actually
selected, and whether `attachCnn` succeeded. CLAUDE.md records a phone found running an asset three
releases behind where every accuracy number quoted for it was measured on a graph it was not
executing. This closes that permanently.

**Perf is rolled up, not streamed.** 1 Hz verbatim is 7 200 rows per two-hour session. The rollup
plus outliers is ~720 rows and keeps what matters — CLAUDE.md's measured fact is that the speed cost
is *load and heat* (32 ms cool / 66 ms in-tracker / 125 ms live at 39–41 °C), so "was the phone hot
when it went stuck" must be answerable afterwards. **The thermal read is a binder call and happens
on the telemetry thread at stamp time, never on the analyzer thread.**

### Settings

`AppSettings` gains `telemetryEnabled` (**default false**), `telemetryEndpoint`, `telemetryToken`.
One section in the settings UI: toggle, endpoint + "Find server", and a status row carrying
queued / dropped / last error / last-seen seq. With telemetry off, `Telemetry.offer` returns
immediately and the logcat line is exactly as today.

## Steps

### 1. `libs.versions.toml` + `app/build.gradle.kts` — commit `build(android): ktor client for the telemetry uplink`
Three aliases under the existing `ktor = "3.0.3"`.

### 2. `telemetry/Envelope.kt` + `telemetry/Spool.kt` — commit `feat(android): the telemetry envelope and its spool`

### 3. `telemetry/Discovery.kt` — commit `feat(android): find the ingest server, cached endpoint first`

### 4. `telemetry/Uploader.kt` + `telemetry/TelemetryHost.kt` — commit `feat(android): ship spooled rows to the ingest server`

### 5. `EngineHost.kt`, `StageTimings.kt`, the event/game seams — commit `feat(android): feed decisions, perf, events and games to telemetry`
`EngineHost` becomes `{ row -> Log.i(DECISION_TAG, row.toLogLine()); Telemetry.offer(row) }`.

### 6. `AppSettings.kt` + the settings section — commit `feat(android): a telemetry section in settings`

### 7. `specs/34-telemetry-uplink/golden/envelope-v1.ndjson` — commit `test(android): emit the golden envelope fixture`
**Produced by the real serializer in a unit test, not hand-written.** One row of each of the six
`kind` values. Phase 02 POSTs this exact file.

## Tests (write, run once, targeted)

- `EnvelopeTest` — round-trip; and the golden file is *written* by this test so it cannot drift.
- `SpoolTest` — append/read/truncate; the cap drops **oldest** and increments `dropped`; a
  truncated last line (power loss mid-write) is skipped, not fatal.
- `TelemetryOfferTest` — `offer` on a full channel does not block and does not throw; with
  telemetry disabled it is a no-op.
- `DiscoveryTest` — the ladder order: a persisted endpoint is tried before NSD, always.
- `UploaderTest` — Ktor `MockEngine`: non-2xx does not truncate the spool; backoff grows; a
  connection failure never propagates.

```
gradlew.bat :app:testDebugUnitTest
gradlew.bat :app:ktlintFormat
gradlew.bat :app:ktlintCheck :app:detekt
```

## Acceptance criteria

- `grep -rn "trySend\|offer(" android/app/src/main/kotlin/com/chesslab/tracker/telemetry` — the
  only analyzer-thread call is a single non-suspending `trySend`.
- No `File(`, `Instant.now`, `System.currentTimeMillis`, socket or `InetAddress` call reachable from
  `Telemetry.offer`. Assert it by reading the call graph and state it in `STATUS.md`.
- `telemetryEnabled` default is `false`: `grep -n "telemetryEnabled" AppSettings.kt`.
- The golden fixture exists and was written by a test, not by hand.

## Do NOT

- Do **not** touch `:core-engine`. Phase 00 owns it and is already done.
- Do **not** add OkHttp. Ktor is on the classpath; a second HTTP stack for a LAN POST of a few kB is
  a strictly larger delta with no benefit.
- Do **not** write a subnet scan.
- Do **not** couple any of this to `debugEnabled`.
- Do **not** implement session ZIP upload — phase 04.
- Do **not** send pixels. That is a later slice and deliberately last.
