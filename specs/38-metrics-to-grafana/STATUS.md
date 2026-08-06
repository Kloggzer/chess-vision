# 38 — Status

| Phase | State | Note |
|---|---|---|
| 00 — push to Loki | `todo` | blocked on `specs/34` merging |

## How the answer got smaller twice

The user asked for the logs to reach a server. Three answers, in order:

1. **`34-telemetry-uplink` (`f00bf0e`)** — a FastAPI ingest router, a bearer token, an mDNS
   discovery ladder on both platforms, a durable spool, and DuckDB. A review cut it: the token lived
   under `data/`, which `web/app.py:31` serves unauthenticated at `/img`, so the secret protecting
   the write path was published by the read path of the same server.
2. **A dedicated metrics service of our own.** Better — a separate process cannot serve `data/` by
   accident — but still ours to write, run and debug.
3. **Loki.** The user's own suggestion, once Grafana came up. Ingest, storage, schema, query and
   auth are all somebody else's software. What remains is one POST and a settings switch.

The standing instruction was *use established tools, no homebrew unless necessary*. It took two
passes to notice that "necessary" had not been checked.

## Corrections, 2026-08-06

- **No longer blocked.** `feat-diagnostics-log` is an ancestor of `main`; `specs/34` is merged. Its
  own STATUS still says otherwise and is stale too.
- **The `perf` stream has no producer.** The label table lists `kind` as
  `decision | perf | run_start` and the phase says a file becomes at most three streams. There is no
  `perf` kind anywhere in the tree — `34` built exactly two (`DiagnosticsRecords.kt:26,28`). So the
  claim that Grafana derives frame ms / CNN ms / fps / thermal "with no second system" rests on rows
  nobody writes. Either this pack emits two streams, or something has to write perf rows first.
- **Deployment changed: Loki and Grafana move into a Docker compose stack**, by the user's decision
  on 2026-08-06, alongside a device-link service, Keycloak, Postgres and Mongo. The principle this
  pack argued for is untouched — ingest, storage, schema, query and auth remain somebody else's
  software — but "two native Windows binaries, no Docker" is superseded. Rationale, the identity
  model that replaces this pack's pass-through token, and the phasing:
  [`docs/device-platform-analysis.md`](../../docs/device-platform-analysis.md).

## Open

- ~~**Blocked on `specs/34`.**~~ Merged — see the corrections above.
- **Loki's config schema is version-dependent.** `docs/grafana.md` must pin a version and be written
  against that version's documentation. A config written from memory that fails at startup is worse
  than no document.
- **The `/img` mount is still unauthenticated** and is unrelated to this pack. Any host that can
  reach `chesslab web` reads every session frame, crop and model under `data/`. Harmless on
  loopback, serious on `--host 0.0.0.0`. Its own change, not this one's.
- Nothing here has run. The label set, the nanosecond conversion and the LogQL example are designed,
  not observed.
