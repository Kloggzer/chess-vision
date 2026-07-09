# STATUS — 11 streaming CNN observer

Branch: `streaming-observer` (from `main` @ d318689 or later).
Execution: sequential (both phases edit `tracker.py`), one agent session;
delegated to codewhale/DeepSeek **flash**; supervisor (Claude) reviews and commits.

## Phases

| Phase | File | Status | Notes |
|---|---|---|---|
| 00 | `00-observer-loop.md` | done | commits 35e3ff3 (feat), f10f1a6 (test) |
| 01 | `01-consumer-contract.md` | done | commits e065051 (feat), a098c05 (refactor), test commit follows; alias `_last_cnn_obs` fully removed (no remaining readers) |

## Discrepancies (spec vs code)

- **`CnnSnapshot` gained a `fen` field** (not in the spec's dataclass). Reason: the
  old `_cnn_tick` captured the board FEN under lock *before* observing and discarded
  the result if the FEN changed during inference (pinned by
  `test_tracker_cnn_tick_discards_on_board_change`). With the observation moved into
  the worker, `_cnn_tick` can no longer capture a pre-observation FEN itself — the
  snapshot carries it (game-state signature at observation start), preserving the
  pack-09 discard-on-board-change semantics.
- **Observation-failure backoff:** the old flow throttled failed observations via
  `_last_cnn_ts` (cooldown). Free-running with `observer_interval_s=0`, a persistent
  `recovery.observe` failure would retry+log at loop rate; `_observe_snapshot` now
  holds the next spawn for 1 s after a failure (`_observer_started_ts = now + 1.0`).
- **`test_tracker_cnn_tick_respects_cooldown` re-pinned:** the observation is now
  unconditional (that is the point of the pack), so the test asserts
  `observe_calls == 1` + a stored seq-tagged snapshot + *no evaluation* (no vote/note)
  under cooldown, instead of the old `observe_calls == 0`.
- **Desync cadence note:** `_cnn_tick`'s stuck/periodic conditions stay as evaluation
  gates exactly as spec 00 §3 orders, so "desync ticks per observation" holds for every
  observation that *reaches evaluation* (stuck path: every `cnn_cooldown_s`, i.e. alarm
  in ~3·2 s instead of the old 10 s periodic ticks); phase 01's `_desync_last_seq`
  dedup additionally guarantees one count per distinct frame.

## Blockers

_none_

## Session log

_(append one line per agent session: date — phase — result — commits)_

- 2026-07-09 — phases 00+01 — done (Claude fable session; 185 targeted tests green,
  scoped ruff clean) — 35e3ff3, f10f1a6, e065051, a098c05 + final test/docs commit.
