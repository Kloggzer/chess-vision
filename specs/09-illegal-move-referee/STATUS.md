# STATUS — 09 illegal-move referee & shadow-destination fix

Branch: `tracker-referee` (from `android-tracker` @ 8c30888 or later).
Execution: sequential (both phases edit `tracker.py`), delegated to
opencode/DeepSeek; supervisor (Claude) reviews and commits.

## Phases

| Phase | File | Status | Notes |
|---|---|---|---|
| 00 | `00-shadow-destination.md` | done | commits 242ea94 + 35f83be; supervisor fixed: shadow_veto was not passed to _generate_hypothesis (pair/endpoint filters were dead code), note now only on outcome change |
| 01 | `01-illegal-move-alarm.md` | todo | depends on 00 (done) |

## Discrepancies (spec vs code)

_none recorded yet_

## Blockers

_none_

## Session log

- 2026-07-09 — phase 00 — codewhale/deepseek-v4-pro implemented, hit max steps at start of
  phase 01; supervisor reviewed (fixed dead-code shadow_veto wiring), full gate green
  (389 passed, ruff clean) — commits 242ea94, 35f83be.
