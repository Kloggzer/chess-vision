# 34 — Diagnostics you can read

> **Status:** `todo`. Two phases, in order. 00 must land before 01.
>
> This replaces `34-telemetry-uplink` (`f00bf0e`), which was five phases and a network. See
> `STATUS.md` for why it is not that any more — the short version is that a review found the pack
> publishing its own auth token, and found two of its three motivating incidents already fixed.

## The problem, as it actually stands

Three incidents motivated the original pack. Two of them were **fixed in-tree the same day it was
written**: `VerifySingle.reject` now records a row (`VerifySingle.kt:271`) and stuck states now
record one (`Guards.kt:93`). One survives, and it is the expensive one:

**The configuration in force on the phone is invisible.** `motionRecencyS` sat at `0.0` in the
phone's DataStore for an unknown length of time. Every diff-path commit was rejected against a stale
`age > 0` check, the deterministic path produced nothing, and reading the source could never have
found it — the value does not live in the source. It cost an evening of live play and was solved by
one log line once somebody thought to print the config.

The same shape of blindness covers the model: which asset directory is loaded, at which
`inferSize`, on which execution provider. `CLAUDE.md`'s own speed figures were wrong for a day
because they described a model that no longer ships.

## What this pack is

Two things, and neither of them is a network.

1. **The decision rows leave the engine as STRUCTURE, not as a formatted string** — so anything
   downstream can filter, count and query them instead of grepping prose. Phase 00, ~15 lines.
2. **A file you can send.** The rows and one `run_start` line — the whole config plus model identity
   — land in a rotating file in `filesDir`, next to an "Export diagnostics" button beside the
   session export that already exists. Phase 01.

That closes the surviving incident and the model-identity blindness, and it is reachable from a
phone that is not on the same network as anything.

## What this pack is NOT, and why

The original had a Ktor client, a durable spool with prefix truncation, an mDNS discovery ladder on
both platforms, a FastAPI ingest router, a bearer token, and DuckDB. All of it is cut.

- **No network in slice 1.** Every stated need is answered by a file and the export path
  `SessionExporter.kt` already uses. An endpoint is the largest possible answer to "I want to read
  the config that was running".
- **No token, and this is not a preference.** The original stored it at `data/ingest_token.txt`.
  `web/app.py:31` mounts the entire `data/` tree at `/img` via `StaticFiles`, and there is **no
  authentication anywhere in `src/chesslab/web/`** — verified by grep, 2026-08-02. The token would
  have been fetchable at `/img/ingest_token.txt` from any host that could reach the server, and the
  pack's own instruction to run `--host 0.0.0.0` would have put every session frame, crop and
  trained model on the LAN with it. That defect is real and is **not** this pack's to fix; see
  `STATUS.md`.
- **No mDNS.** The original auto-adopted a discovered endpoint after N consecutive failures and then
  sent it the token. Any host on the LAN can answer a `/hello`, and blackholing the real server is
  enough to *trigger* the promotion. Discovery may suggest; it may never adopt. Simplest correct
  version: no discovery.
- **No DuckDB.** The query it existed for is a dict keyed by run plus a list comprehension.
- **No spool.** `append`/`readBatch`/`truncatePrefix` is a hand-written durable queue whose prefix
  truncation races its own appender — which is why the original then had to tolerate torn last
  lines. Rotating files have none of that; `WorkManager` is the answer if a network ever returns.
- **No session-ZIP upload.** Full-resolution photographs of the user's room are a capture-device
  feature with its own corpus-integrity and resume rules. It does not ride along in a logging pack.

## What the rows contain — say it in the doc

Not sensitive between two machines one person owns, but larger than "logs" suggests, and the export
button hands the file to whatever app the user picks:

- every decision row carries **`fenAfter`** — the complete move-by-move position stream, including
  rejected candidates;
- `run_start` carries the full `TrackerConfig`, the model identity and the app build;
- the session/game records the user may also export carry **player names** (`GameRecord.kt:43-76`)
  and timestamps.

No pixels. `DebugPayload.kt:11-13` and `DecisionLogTest.decisionCarriesNoBitmaps` keep it that way,
and phase 01 must not change that.

## Ownership

| Phase | Owns |
|---|---|
| **00** | `core-engine/DecisionLog.kt`, `core-engine/EngineState.kt`, `core-engine/api/TrackerEngine.kt`, `core-engine/api/DebugPayload.kt`, `core-engine/src/test/**/DecisionLogTest.kt`, `service/EngineHost.kt` |
| **01** | `app/.../diagnostics/**` (new), `service/EngineHost.kt`, `service/TrackerService.kt`, `ui/debug/**`, `docs/telemetry.md` (new) |

## Protocol

- `android/**/bin/` is a stale gitignored copy of the source tree. Exclude it from every grep; never
  edit or cite a file under it.
- `:core-engine` may depend only on chesslib and the Kotlin stdlib. It is single-threaded, has no
  wall clock, and `ClasspathPurityTest.kt:25` bans `\bsynchronized\b|\bAtomic[A-Z]|\bMutex\b|@Volatile`
  by regex. **That rule binds `:core-engine` only** — `:app` may use `@Volatile` freely.
- The analyzer thread has a measured budget: whole frame **23.1 ms median / 32.4 p90 / 89.1 max** at
  26–28 fps, CNN 16 ms median for 64 crops (live, 534 observations, 2026-08-02). No file handle, no
  clock, no allocation-heavy formatting on it.
- Gate: `gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest :core-engine:test
  :core-geometry:test --rerun-tasks`. Gradle reports green on stale tasks; `--rerun-tasks` is not
  optional for a final gate.
- Resolve a detekt or ktlint trip by restructuring — never `@Suppress`, never a baseline entry.
