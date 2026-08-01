# 34 — Telemetry uplink · STATUS

Branch: **`feat-telemetry-sink`** (cut from `spec-24-frame-the-board`).
Read `entry.md` completely before your phase file.

## Phases

| Phase | Concern | Depends on | Runs | State |
|---|---|---|---|---|
| 00 | `decisionSink` carries `DebugDecision` | — | **alone, first** | todo |
| 01 | phone: spool, uploader, discovery, settings, golden fixture | 00 | ∥ 02 | todo |
| 02 | PC: ingest router, mDNS advertise, paths | — | ∥ 01 | todo |
| 03 | `scripts/why.py` — the one query | 02 | after 02 | todo |
| 04 | session ZIP upload | 01, 02 | last | todo |

## The bar

Slice 1 is phases 00–03. It is done when a move that did not commit can be explained from the PC,
with no cable, in one command — including **which config and which model** were in force.

Slice 2 is phase 04: an uploaded phone session is indistinguishable from a `collect`ed one.

## Discrepancies found (append; do not edit others' entries)

_none yet_

## Session log

_none yet_

---

### For the orchestrator

Per-agent green lights are measured against partial trees and are not trustworthy. Re-run the full
gate on the merged tree before any merge:

```
uv run pytest -q
uv run ruff check src tests synth scripts
uv run vulture
cd android && gradlew.bat :core-engine:test :app:testDebugUnitTest :app:ktlintCheck :app:detekt :core-geometry:testDebugUnitTest
cd android && gradlew.bat :app:assembleDebug
```
