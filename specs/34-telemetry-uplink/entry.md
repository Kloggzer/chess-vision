# 34 — Telemetry uplink

> Entry file. Read completely, then your phase file. The protocol of
> `specs/22-inference-resolution/entry.md` applies verbatim. Branch: **`feat-telemetry-sink`**,
> already cut from `spec-24-frame-the-board`. Not from `main`.

## Why

Diagnostic data is trapped on the phone. Answering "why did the tracker not commit that move"
today means a USB cable, `adb logcat -d`, grep, and hand-correlation against a game file the phone
also holds. On 2026-08-01 that loop ran **three separate times in one day**, and twice the answer
was a single line nobody could see:

- The `Qxd4` mismatch cycle cost two rounds of four agents each. The answer was in
  `VerifySingle.reject`, which wrote no row at all.
- The "why does it take so long between move and announcement" took a fourth round. The answer was
  `motionRecencyS = 0.0` in the phone's DataStore — **not in any source file**, and invisible to
  every agent that read code.
- The 16.5 s move after that was `too_many_changed`, and could only be *inferred* from the
  neighbouring commit's `stuck=` field, because stuck states wrote nothing.

Every one of those is a structured fact the engine already computes and then throws away. This pack
ships them.

## The one thing that makes it worth building

A decision row alone does not answer the question. **Three things must land together**, and they
join on `run` + `ply`:

| join key | from | to |
|---|---|---|
| `run` | any row | `run_start` — config in force, model identity, EP selected, geometry |
| `run` + `ply` | a decision row | the game record — the move, the SAN, the seams |
| `session` | a decision row | `data/sessions/<id>/` on the PC (phase 04) |

Half of "why did it not commit" is *"`zThr` was 3.5 because you tuned it last Tuesday"*, and that
fact currently exists only in the phone's DataStore. The other half is *which model was actually
executing* — CLAUDE.md records a phone found running an asset three releases behind, where every
accuracy number quoted for it had been measured on a graph it was not running.

## Phases

| Phase | Concern | Depends on | Runs |
|---|---|---|---|
| `00-engine-sink.md` | `decisionSink` carries `DebugDecision`, not `String` | — | **ALONE, FIRST** |
| `01-phone-uplink.md` | spool, uploader, discovery, settings, golden fixture | 00 | parallel with 02 |
| `02-pc-ingest.md` | FastAPI ingest router, zeroconf advertise, paths | — | parallel with 01 |
| `03-why-query.md` | `scripts/why.py` — the one-query promise | 02 | after 02 |
| `04-session-upload.md` | ZIP upload; the phone as a capture device | 01, 02 | last |

**00 lands alone.** It changes a public signature in `:core-engine` that 01 codes against; running
it concurrently with 01 means 01 compiles against a half-written file.

**01 and 02 are disjoint** — Android and Python, no shared file — but they share a wire contract.
See *Artifact authority* below.

## Artifact authority — the envelope

**Phase 01 owns the envelope schema. Phase 02 codes against what 01 actually emits.**

01's deliverable includes a golden fixture committed at
`specs/34-telemetry-uplink/golden/envelope-v1.ndjson`, produced by the real Kotlin serializer in a
unit test (not hand-written). 02's integration test POSTs **that exact file**. A field 01 does not
emit is a gap to record in `STATUS.md` — 02 never invents one.

The shape, for both sides to build against:

```json
{"v":1,"ts":"2026-08-01T18:22:31.412Z","device":"pixel8p-a1b2c3","run":"0f3c…","seq":1187,
 "kind":"decision","game":"2026-08-01_1815","session":"20260801-181503","payload":{…}}
```

`kind` ∈ `run_start | decision | perf | event | game | run_end`. **Six values, deliberately not a
taxonomy.** Adding a seventh needs a STATUS.md note.

`seq` is a monotonic per-run counter assigned on the phone at stamp time. **It is not optional:** a
gap in `seq` on the PC is the only way to distinguish "there is no row" from "the row never
arrived", which is the exact ambiguity this pack exists to end.

**The server is permissive by contract.** An envelope with an unknown `v` or unknown `payload`
keys is **written to disk anyway** and logged once. JSONL tolerates unknown shapes; refusing data
is worse than storing a shape you cannot yet parse.

## Ownership registry

**This table overrides any phase file that disagrees.**

| file | created by | may be extended by | notes |
|---|---|---|---|
| `android/core-engine/.../api/TrackerEngine.kt` | exists | 00 only | signature change |
| `android/core-engine/.../api/DebugPayload.kt` | exists | 00 only | additive field |
| `android/core-engine/.../DecisionLog.kt` | exists | 00 only | visibility + move `toLogLine` |
| `android/app/.../service/EngineHost.kt` | exists | 00, then 01 | 00 adapts the type, 01 adds the offer |
| `android/app/.../telemetry/**` | 01 | 04 | 01 owns every file here |
| `android/app/.../settings/AppSettings.kt` | exists | 01 only | three fields |
| `android/app/.../ui/settings/**` | exists | 01 only | one section |
| `android/gradle/libs.versions.toml` | exists | 01 only | ktor client aliases |
| `src/chesslab/web/routers/ingest.py` | 02 | 04 | 02 owns the file, 04 adds one route |
| `src/chesslab/web/routers/__init__.py` | exists | 02 only | append to `ALL_ROUTERS` |
| `src/chesslab/web/app.py` | exists | 02 only | zeroconf in the existing hooks |
| `src/chesslab/config.py` | exists | 02 only | `Paths.telemetry`, `INGEST_*` |
| `scripts/why.py` | 03 | — | |
| `specs/34-telemetry-uplink/golden/envelope-v1.ndjson` | **01** | — | 02 and 04 read only |

## Protocol for implementing agents

- Work on `feat-telemetry-sink`. One atomic conventional commit per numbered step, exactly as the
  phase names them. Stage explicitly; never `git add -A` across scopes.
- **Trust the code over the spec.** Line numbers drift. If a cited anchor is wrong, find it by
  symbol and **record the discrepancy in `STATUS.md`**.
- **If blocked, STOP** and write the blocker into `STATUS.md`. Do not invent a workaround that
  changes a contract another phase codes against.
- Never `--no-verify`, never `--force`, never amend a pushed or another agent's commit.

## Memory-constraint contract

Run tests **once**, **targeted**, scoped to your module:

- Android: `gradlew.bat :<module>:testDebugUnitTest` — never the full multi-module run.
- Python: `.venv/Scripts/python.exe -m pytest -q tests/test_<yours>.py` — never the bare suite.

**Do NOT run** the full gate, `assembleDebug`, `npm run build`, `vulture`, or a repo-wide lint
sweep. That is the orchestrator's job and its result is the only one that counts: a per-agent green
light is measured against a partial tree.

## Static analysis

- Android: `gradlew.bat :<module>:ktlintFormat` **first** — the formatter owns style, your effort
  goes to logic — then `:<module>:ktlintCheck :<module>:detekt`, once, scoped. Zero NEW findings.
  **No `@Suppress` and no baseline entry to go green**: fix it, or record a blocker.
- Python: `.venv/Scripts/python.exe -m ruff check <your files>`. `vulture` is the orchestrator's.
- **Check detekt's thresholds before you write a signature.** `LongParameterList` is 6 and
  `TooManyFunctions` is 15 (`android/config/detekt/detekt.yml`). A signature that trips them and
  gets "fixed" by inventing holder types is a smell to surface, not a design.

## Dependency management

Every dependency goes through the ecosystem's manifest — Gradle version catalog
(`android/gradle/libs.versions.toml`) and `pyproject.toml` + `uv`. Never vendor a jar, never
hand-edit a lockfile. Pin versions. **This pack authorises exactly two additions**:

- `ktor-client-core`, `ktor-client-cio`, `ktor-client-content-negotiation` under the existing
  `ktor = "3.0.3"` — version-matched, same coroutine model, same `Json` config as the server
  already on the classpath.
- `zeroconf>=0.132` in `pyproject.toml`, **lazily imported**.

DuckDB is **not** a declared dependency — phase 03 imports it lazily with a clear error message,
which is this repo's existing convention for optional tooling (`matplotlib`, `pyperclip`).

Anything else needs a STATUS.md note with justification and a licence check.

## Repo rules you will hit

- **`:core-engine` is pure and must stay pure.** `ClasspathPurityTest` enforces two things: the
  runtime classpath is chesslib + kotlin-stdlib only, and a source regex bans
  `\bsynchronized\b|\bAtomic[A-Z]|\bMutex\b|@Volatile` in `src/main/kotlin`. The engine has **no
  wall clock** — its only time is `FrameInput.timestampMs`. Phase 00's change is a *type* and a
  *visibility*: no import, no dependency, no primitive, no clock.
- **The analyzer thread has a 66 ms budget** (`AnalysisGate.FRAME_BUDGET_MS`). Nothing this pack
  adds may write to disk, take a clock, resolve a hostname or open a socket on it. The only
  operation permitted there is one non-suspending `Channel.trySend` on a bounded channel.
- **`data/` is gitignored — park, never delete.** That rule is about the *corpus*.
  `data/telemetry/` is derived diagnostic data with no reproduction cost and **is** deletable;
  phase 02 must say so in writing, or the taboo will freeze it and it will grow without bound.
- **Web read paths go through `manifest_cache.py`** (mtime-keyed aggregates). Relevant to a later
  read UI, not to this pack's write path.
- **`DEFAULT_WEB_HOST` is `127.0.0.1`** (`src/chesslab/config.py:632`). Do **not** change it.
  Binding an existing checkout to its LAN as a side effect of a logging feature is not acceptable.

## Off by default

`telemetryEnabled` defaults to **false**, like recording (`RecordingPrefs.enabled`) and the
spectator. A diagnostics feature that is on by default is a feature that ships a surprise.

## Definition of done, per phase

Your phase's tests pass (targeted, once), your module's ktlint/detekt or ruff is clean with zero new
findings, your commits are atomic and named as specced, and `STATUS.md` carries your session entry
including every discrepancy you found. **The orchestrator runs the full gate on the merged tree** —
`uv run pytest -q`, `uv run ruff check`, `uv run vulture`,
`gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest :core-engine:test`, and
`assembleDebug`.
