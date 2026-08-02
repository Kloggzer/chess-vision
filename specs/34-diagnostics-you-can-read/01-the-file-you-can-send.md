# 01 — The file you can send

> Owns `app/.../diagnostics/**` (new), `service/EngineHost.kt`, `service/TrackerService.kt`,
> `ui/debug/**`, `docs/diagnostics.md` (new). Runs after phase 00.

## Why

Two blind spots, one file.

**The config in force is invisible.** `motionRecencyS` sat at `0.0` in the phone's DataStore and
rejected every diff-path commit against a stale `age > 0` check. Reading the source could never have
found it — the value does not live in the source. It cost an evening.

**So is the model.** Which asset directory is loaded, at which `inferSize`, on which execution
provider. `CLAUDE.md`'s speed figures were wrong for a day because they described a model that no
longer ships, and nothing on the device says which one does.

Both are answered by writing them down once, next to the rows, in a file that can be exported
through the picker `SessionExporter.kt` already uses. No endpoint, no token, no discovery.

## Design

A `DiagnosticsLog` in `:app`, fed by phase 00's sink.

**Rotating files, not a spool.** `diag-0.ndjson` … `diag-N.ndjson` in `filesDir/diagnostics/`, each
capped, oldest deleted past a total cap. An earlier draft specified `append`/`readBatch(max)`/
`truncatePrefix(n)` — a hand-written durable queue whose prefix truncation rewrites the file the
appender is writing to, which is why that draft then had to tolerate torn last lines. Rotation has
none of that: a file is either whole or being appended to, and deleting one is atomic.

**Writes happen off the analyzer thread.** The sink hands the `DebugDecision` to a single-consumer
`Channel`; one coroutine on `Dispatchers.IO` serialises and appends. Measured budget on the analyzer
thread: whole frame **23.1 ms median / 32.4 p90 / 89.1 max** at 26–28 fps. No file handle, no clock,
no JSON building on it. `:app` may use `@Volatile` and `Atomic*` freely — the purity rule binds
`:core-engine` only.

**Serialisation is hand-written, and that is the bulk of this phase.** `DebugDecision` cannot be
`@Serializable`: it lives in `:core-engine`, which has no kotlinx-serialization. So `:app` builds
the JSON. Twenty-four fields, including `changedVals: List<Pair<String, Double>>` — emit that as an
object (`{"f4": 9.2, "d4": 4.5}`), not a list of pairs. Write a surrogate `@Serializable data class`
in `:app` and one mapping function; do not reach for reflection.

**Two record kinds**, one `kind` field, NDJSON, one object per line:

- `run_start` — written once when the tracker stack is built: `ConfigCodec.encode(config)`
  (`ConfigCodec.kt:52`, the shape settings already persist), the model identity (`modelDir`,
  `modelAsset`, `inferSize`, `classes.size`), the execution provider **actually selected** — not the
  requested one, per the standing rule that a request is not a delivery — the app `versionName` and
  `versionCode`, and an ISO-8601 timestamp.
- `decision` — one per sink call.

Both carry `seq`, a monotonic counter from the writer, so a gap in the file is visible as a gap.

**Export** is a button beside the existing session export in `ui/debug/`, using the same
`ACTION_CREATE_DOCUMENT` path: zip the diagnostics directory, hand it to the picker.

## Steps

1. **`feat(app): the diagnostics writer`** — `DiagnosticsLog` with `offer(DebugDecision)` and
   `runStart(...)`, the channel, the IO consumer, rotation, the caps.
2. **`feat(app): the JSON surrogate`** — the `@Serializable` mirror of `DebugDecision` and its
   mapping. This is the piece an implementing agent will spend most of its time on; do it first if
   step 1 stalls.
3. **`feat(service): write run_start and wire the sink`** — in `TrackerStack`/`EngineHost`, where the
   engine is built. The sink now does both: `Log.i(DECISION_TAG, it.toLogLine())` **and**
   `diagnostics.offer(it)`. Keep logcat — it is what makes a live look possible over adb.
4. **`feat(ui): export diagnostics`** — the button, beside the session export.
5. **`docs: docs/diagnostics.md`** — what the file contains, in plain words, including that every
   `decision` row carries `fenAfter` and therefore the complete game.

## Tests

- Rotation: past the cap, the oldest file is gone and the newest is whole.
- The surrogate round-trips every field of a fully-populated `DebugDecision`, `changedVals` included.
  A field added to `DebugDecision` and forgotten here must fail this test — assert on the field
  count, or on the parsed key set.
- `seq` is strictly increasing across a rotation.
- `run_start` contains `motionRecencyS` and the model directory. Those two names are the whole point
  of the phase; pin them by name, not by "some config".
- The offer path touches no file: assert the writer's file count is unchanged immediately after
  `offer` returns, before the consumer runs.

## Acceptance

- Play a game, press Export, open the file: the first line names the model and the config in force,
  and the decision rows are parseable with `json.loads` per line.
- `gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest --rerun-tasks` green.

## Do NOT

- **No network.** No HTTP client, no socket, no mDNS, no token, no server. If this proves
  insufficient in practice, that is a later decision with its own security section — see the
  `entry.md` rationale, which is not a preference but a finding.
- No pixels in the NDJSON. `DebugPayload.kt:11-13` and `DecisionLogTest.decisionCarriesNoBitmaps`
  keep bitmaps out of the payload; keep them out of the file too.
- Do not write to external storage or a shared directory. `filesDir` and the picker, so nothing
  leaves the app without the user choosing where it goes.
- Do not remove the logcat line. Two consumers, one sink.
