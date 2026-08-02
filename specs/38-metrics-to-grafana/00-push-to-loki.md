# 00 — Push to Loki

> Owns `app/.../diagnostics/**`, two settings knobs, the Gradle dependency declarations, and
> `docs/grafana.md`. Runs after `specs/34` is merged.

## Why the phone side is small

`specs/34` already writes rotating NDJSON files in `filesDir/diagnostics/`. That is the durable
queue — a file is either complete or being appended to, and deleting one is atomic. The earlier
design hand-wrote a spool with `readBatch`/`truncatePrefix` on top of a single file, which races its
own appender; rotation has none of that.

So the uploader is: pick a **completed** file, POST it, delete it on success. Retry and backoff are
`WorkManager`'s job, not ours — `BackoffPolicy.EXPONENTIAL`, `NetworkType.CONNECTED`, and it
survives process death, which a hand-rolled 1 s→60 s loop does not.

## Design

**Two knobs, both new, both off/empty by default:** `diagnosticsUploadEnabled: Boolean = false` and
`diagnosticsUploadUrl: String = ""`. Nothing uploads until the user types an address and turns the
switch on. No discovery, ever — see `entry.md`.

**The request.** `POST <url>/loki/api/v1/push`, `Content-Type: application/json`, body:

```json
{"streams":[{"stream":{"app":"chesslab","kind":"decision","device":"…","model":"…","version":"…"},
             "values":[["<unix nanoseconds>","<the NDJSON line>"], …]}]}
```

One stream per distinct label set, so a file becomes at most three streams (`decision`, `perf`,
`run_start`). The line body is the NDJSON line **unchanged** — it is already JSON, and Grafana
parses it with `| json`. Do not re-shape it here; two representations of the same row is how they
drift apart.

**Timestamps are nanoseconds.** The rows carry `tsS` (seconds, Double) and the writer adds a wall
clock. Convert once, in one function, with a test — a Loki push with a timestamp in the wrong unit
is accepted and then invisible, which is the worst failure mode available.

**Auth is whatever Loki wants**, passed through: an optional header field in settings, sent verbatim.
We define no token, store no secret of our own, and validate nothing. If the user points this at a
Loki behind basic auth, the header carries it.

**Only complete files are uploaded.** The writer's current file is never touched; rotation is what
marks a file finished. Delete on 2xx only. On 4xx, log and **delete anyway** — a permanently
rejected file would otherwise block the queue forever, and the alternative is an unbounded
directory. On 5xx or no network, leave it and let WorkManager retry.

**A cap on the directory**, already in `specs/34`. Uploading does not change it: if the phone is
offline for a week, the oldest files are dropped by rotation, not kept forever.

## Steps

1. **`build: ktor client and workmanager`** — `ktor-client-core` and `ktor-client-cio` at the
   existing `ktor = "3.0.3"`, plus `androidx.work:work-runtime-ktx`. **Not**
   `ktor-client-content-negotiation`: the body is built as a string and posted; there is nothing to
   negotiate.
2. **`feat(app): the Loki payload`** — pure functions, no Android: NDJSON lines + label set →
   request body; `tsS` → nanoseconds. This is where the tests live.
3. **`feat(app): the upload worker`** — a `CoroutineWorker` that walks completed files, posts, and
   deletes. Constraints and backoff configured, not written.
4. **`feat(ui): two knobs`** — the switch and the URL field, in the existing settings screen, with
   help text that says plainly what leaves the phone: every decision row carries `fenAfter`, so this
   is the complete game.
5. **`docs: docs/grafana.md`** — the two Windows binaries, where they go, the two configs, how to
   check it is alive, and one example LogQL query for frame time. Write the Loki config against the
   pinned version's own documentation, not from memory.

## Tests

- The body for a mixed file contains exactly three streams, and every value pair is
  `[nanosecond-string, original-line]` with the line byte-identical to the file.
- Nanosecond conversion: a known `tsS` maps to a known 19-digit string. Pin it — a wrong unit is
  accepted by Loki and then silently invisible.
- Labels: the produced label set contains only the five from `entry.md`. Assert on the key set, so
  that adding `game` or `ply` as a label fails here rather than in production a month later.
- The in-progress file is never selected for upload.
- 4xx deletes, 5xx does not.
- Upload disabled, or URL empty: the worker does nothing and no request is built.

## Acceptance

- Play a game with the switch on; the decision rows appear in Grafana within a minute, filterable by
  `device` and `kind`, and a LogQL query plots frame time over the game.
- With the switch off, no request is made — verify by there being no network permission use, not by
  reading the code.
- `gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest --rerun-tasks` green.

## Do NOT

- **No discovery, no mDNS, no `NsdManager`.** The address is typed. The earlier pack auto-adopted a
  discovered endpoint and then sent it a token; any host on the LAN can answer a probe.
- **Do not invent a token or write one to disk.** Especially not under `data/` — `web/app.py:31`
  serves that tree unauthenticated at `/img`, which is how the first pack published its own secret.
- Do not add `game`, `ply`, `fen` or any per-move value as a Loki label.
- Do not reshape the NDJSON line. One representation.
- Do not upload session ZIPs or any image. That is a different feature with a different consent
  question — full-resolution photographs of a room are not diagnostics.
- Do not run the upload on the analyzer thread, or read `filesDir` from it.
