# 34 — Status

| Phase | State | Note |
|---|---|---|
| 00 — decisions as structure | `done` | 39 lines of `:core-engine` main sources |
| 01 — the file you can send | `done` | `docs/diagnostics.md` |

## What landed, and where the pack was wrong

Both phases are implemented on `feat-diagnostics-log` (branched from `4a14b58`, not merged).

Three corrections against the tree, all in the implementer's favour but worth recording:

- **Phase 00 steps 02 and 03 are one commit, because they are one change.** Re-typing the sink
  breaks its only call site, so a commit doing only step 02 would not compile — which is the exact
  defect that got the predecessor pack rejected.
- **`ui/debug/` has no session export to sit beside.** The session export is
  `ui/games/RecordingPanel.kt`; what `ui/debug/` has is the decision-log share (`ACTION_SEND`,
  `DecisionLogExport.kt`). The new button went beside that one, on the Decisions tab, using
  `ACTION_CREATE_DOCUMENT` as specified.
- **`DebugDecision` has 25 fields, not 24** — after phase 00's step 01 added `cnnRun`. The count in
  01's Design section was correct for the type as it stood when the pack was written.
- `entry.md`'s ownership table says `docs/telemetry.md`; 01's own header and step 05 both say
  `docs/diagnostics.md`, which is what was written.

Two decisions the pack did not make:

- **`run_start` is written when the CNN attach RESOLVES**, not when the stack is built, because the
  execution provider it names does not exist until then — that is the whole point of the field. A
  30 s timeout writes the header anyway, since a file with rows and no config is the worse failure.
- **Every rotated file repeats the header**, with its original `seq`. Rotation deletes the OLDEST
  file, i.e. exactly the one a write-once header lives in, so without the repeat an export becomes
  anonymous numbers as soon as a session runs long enough to matter.

## Why this is not `34-telemetry-uplink` any more

The original pack (`f00bf0e`) was five phases: an engine sink, a phone uplink with a durable spool
and an mDNS discovery ladder, a FastAPI ingest router with a bearer token, a DuckDB query script, and
a session-ZIP upload. A review checked it against the tree and found the following. Every item below
was verified, not inferred.

### The security defect it created, and could not see

`web/app.py:31` is `app.mount("/img", StaticFiles(directory=str(config.DATA.root)), name="img")`,
`Paths.root = Path("data")` (`config.py:471`), and there is **no authentication anywhere in
`src/chesslab/web/`** — no `Depends`, no middleware, nothing; verified by grep on 2026-08-02.

The pack stored its ingest token at `data/ingest_token.txt`. It would have been fetchable at
`/img/ingest_token.txt` by anything that could reach the server. **The token invented to protect the
write path would have been published by the read path of the same server.** And the pack's own hint
told the user to run `chesslab web --host 0.0.0.0`, which puts every session frame, every crop and
every trained model on the LAN alongside it.

Second: discovery **auto-adopted** an mDNS endpoint after N consecutive failures, validated it with a
`GET /api/ingest/hello` that any host on the LAN can answer, and then sent it the token. Blackholing
the real server is enough to *trigger* the promotion.

### Its own case had evaporated

Two of the three incidents in its "Why" were fixed in-tree the same day it was written:
`VerifySingle.reject` now records a row (`VerifySingle.kt:271`) and stuck states now record one
(`Guards.kt:93`). One survived — the invisible config — and it is one JSON line.

### Library-where-a-file-would-do

- **DuckDB** for a query that is a dict keyed by run plus a list comprehension; the phase spent more
  code apologising for the dependency than the dependency saved, and `read_json_auto`'s schema
  inference is brittle against the unknown-key rows the pack deliberately stores.
- **The spool** — `append`/`readBatch`/`truncatePrefix` — is a hand-written durable queue whose
  prefix truncation races its own appender, which is why the pack then had to specify torn-last-line
  tolerance. Rotating files remove the whole class. `WorkManager` is the answer if a network returns.
- `ktor-client-content-negotiation` for a raw `application/x-ndjson` body.

### And phase 00 did not compile

It moved `toLogLine` to `:app`, where `pyFixed` is `internal` (`Dispatch.kt:191`) and two of the
three tests that touch it drive `internal` engine types and cannot follow.

## Found while reviewing — NOT this pack's job

**The `/img` mount serves the whole `data/` tree unauthenticated.** That is independent of telemetry
and predates it: any host that can reach `chesslab web` can read every session frame, crop and model
under `data/`. It is harmless bound to loopback and serious bound to `0.0.0.0`. It wants its own
change — gate the mount when the bind address is not loopback, or serve images from an explicit
subdirectory rather than the data root — and it should not be smuggled into a logging pack.
