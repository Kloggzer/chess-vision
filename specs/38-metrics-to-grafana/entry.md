# 38 — The rows land in Grafana

> **Status:** `todo`. One phase on the phone. The PC side is a setup document, not code.
>
> Depends on `specs/34-diagnostics-you-can-read` (branch `feat-diagnostics-log`): the rotating
> NDJSON files it writes **are** the queue this phase uploads. Do not start before 34 is merged.

## Why this is not a service we write

The user asked for the logs to reach a server, and the first answer to that question
(`34-telemetry-uplink`, `f00bf0e`) was: a FastAPI ingest router, a bearer token, an mDNS discovery
ladder, a durable spool with prefix truncation, and DuckDB to query it. A review found that pack
publishing its own auth token — it stored it under `data/`, which `web/app.py:31` serves
unauthenticated at `/img` — and cut it.

The second answer was a dedicated metrics service of our own. Better, because a separate process
cannot serve `data/` by accident. Still ours to write, run and debug.

**The third answer is that Grafana already has this, and it is called Loki.** Structured lines with
labels, pushed over HTTP, queried and graphed in Grafana. Every piece the two earlier answers
proposed to build — the ingest endpoint, the storage, the schema, the query tool, the auth — is
software somebody else maintains. What is left for us is one POST.

This is the standing instruction applied properly: *use established tools and libraries, no homebrew
unless necessary.* Twice we reached for necessary before checking.

## Shape

**PC.** Grafana and Loki, both as single native Windows binaries — neither needs Docker, and Loki
runs single-process against the filesystem, no object store and no cluster. If Docker is present it
works too; the document should cover the binaries, because that is the smaller setup and the one
that survives someone removing WSL.

**Phone.** Off by default. A switch and a typed URL in settings. A worker uploads whole rotated
files and deletes each one on 2xx.

**Nothing else.** No discovery — the address is typed once. No token of our own — Loki takes basic
auth or a header, and it is not our code. No query script — that is Grafana.

## What decides whether this works: the labels

Loki indexes labels, not lines. **Low cardinality is not a style preference, it is the difference
between a working install and one that dies in a month.** Get this wrong and it is invisible for
weeks, then Loki stops.

| Label | Value | Why |
|---|---|---|
| `app` | `chesslab` | constant |
| `kind` | `decision` \| `perf` \| `run_start` | three values |
| `device` | `<model>-<8 hex>` | one per phone |
| `model` | the loaded asset dir | a handful |
| `version` | app versionName | a handful |

**Everything else goes in the line body**, as JSON: `game`, `ply`, `uci`, `fen`, `decider`, every
score. A label per game or per ply multiplies the index by the number of games or plies played, and
that is the documented way to destroy a Loki instance.

The perf rows need no second system. Grafana derives time series from log lines — frame ms, CNN ms,
fps and thermal status become curves through LogQL over the JSON body. Prometheus is the answer if
that proves too slow, and not before.

## Ownership

| Phase | Owns |
|---|---|
| **00** | `app/.../diagnostics/**`, `app/.../settings/**` (two knobs), `android/gradle/libs.versions.toml`, `android/app/build.gradle.kts`, `docs/grafana.md` (new) |

## Protocol

- `android/**/bin/` is a stale gitignored copy. Exclude it from every grep; never edit a file there.
- **Do not write the Loki config from memory.** Its configuration schema is version-dependent and
  has changed across generations. Pin a version in `docs/grafana.md` and write the config against
  that version's own documentation. A config that looks right and fails at startup is worse than no
  document.
- Nothing in `:core-engine`. This phase does not touch the engine at all.
- The analyzer thread is untouched: the uploader reads files the writer already produced.
- Gate: `gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest --rerun-tasks`. Gradle
  reports green on stale tasks; the flag is not optional.
- Restructure to satisfy detekt. Never `@Suppress`, never a baseline entry.
