# STATUS — 20 recovery honesty

Branch: `spec-20-recovery-honesty` (from `spec-19-live-hardening`).
This file is the ONLY hand-off between agents. Append to your own phase's row and to the session log;
never rewrite another phase's entry.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | Measure what recovery accepts and on what evidence | todo | — | Fixes nothing. Blocks 01. |
| 01 | A recovery move must be READ, not inferred from absence | todo | — | **Blocked by 00.** Parity-critical. |
| 02 | One played game is one stored record | todo | — | Android only, parallel. |
| 03 | The cleanest synthetic crops need a noise floor | todo | — | Synth only, parallel. No retrain. |

States: `todo` → `in progress` → `done` | `blocked`.

## Dependencies

- **01 depends on 00** and must not start before 00 is `done`. If 00 reports the
  inference-from-absence case as absent on the measured material, 01 does not proceed — record that
  decision here.
- 00, 02 and 03 are mutually independent; their file scopes are disjoint (see the ownership registry
  in `entry.md`, which overrides any phase file that disagrees).

## What is already true (do not re-establish)

- Shipped model is **`occ-r3s-f3`** (`46c16d6`), chosen after the miss-heavy `occ-r3bn2-f3` drove the
  runaway. Miss/phantom asymmetry over 1366 clip observations: **8826 vs 226**.
- `cnn_margin_squares` **cannot** be raised: a capture differs from its non-capture sibling by exactly
  one square (`tracker.py:2333`). Measured on the real clip — margin 2 loses `h4 h5`, margin 3 also
  loses `e5`.
- The seam no longer loses the plies that caused it (`12a4422`); the library still shows fragments,
  which is phase 02.
- Synth crops match real at the **median** for high-frequency energy (7.09 vs 7.29). Only the p10
  tail is too clean (3.19 vs 5.87).
- Device evidence is preserved at `data/_device/20260728-runaway/` — 23 sessions, 130 frames, 47 game
  records including the four runaway fragments.

## Session log

<!-- Append: date — phase — what was measured/changed — the numbers — what is left. -->

- 2026-07-28 — pack authored. Phases 00, 02, 03 ready to start; 01 gated on 00.
