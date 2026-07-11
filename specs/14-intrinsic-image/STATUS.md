# STATUS — specs/14 intrinsic-image

Branch: `feat/14-intrinsic-image` (create from `main` at or after commit `b381890`).

| Phase | File | State | Depends on |
|---|---|---|---|
| 00 | `00-python-reference.md` | todo | — |
| 01 | `01-kotlin-port.md` | todo | 00 |
| 02 | `02-android-integration.md` | todo | 01 |

Phases are strictly sequential (01 consumes 00's golden JSON; 02 wires 01's class).

## Orchestrator gate (after all phases, NOT per phase)

- `uv run pytest -q` and `uv run pytest -q -m clips` (incl. the new intrinsic
  shadowsweep clip test)
- `uv run ruff check src tests synth`
- `cd android && ./gradlew :engine:test :app:testDebugUnitTest :app:assembleDebug`
- repo-wide ktlint/detekt/Android lint (zero new findings)
- On-device smoke test: DEFERRED — board packed away (2026-07-11); toggle stays
  default-off, so shipping without live validation is acceptable. First live
  session: enable toggle, wait for `intrinsic calibrated:` diag line, verify a
  hand-shadow sweep produces no `changed` squares, then play the castle + Be7
  regression moves.

## Discrepancies found by implementing agents

(record here: spec vs code mismatches, deliberate divergences, blockers)

## Session log

(empty — no implementation sessions yet)
