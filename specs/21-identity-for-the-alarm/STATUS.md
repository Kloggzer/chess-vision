# STATUS — 21 identity for the alarm

Branch: `spec-21-identity-for-the-alarm` (from `spec-20-recovery-honesty`).
This file is the ONLY hand-off between agents. Append to your own phase's row and to the session log;
never rewrite another phase's entry.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | Is confident identity precise enough to arm the alarm? | todo | — | No training. **Gates the whole pack.** |
| 01 | One backbone, two heads; occupancy must not regress | todo | — | Blocked by 00. |
| 02 | Carry identity to the observation, Python then Kotlin | todo | — | Blocked by 01. Parity-critical. |
| 03 | Prove it fires when it should and stays quiet otherwise | todo | — | Blocked by 02. Owns the shipping decision. |

States: `todo` → `in progress` → `done` | `blocked`.

**This pack is strictly sequential.** Each phase's output is the next one's input.

## What is already established (do not re-establish)

- **The alarm cannot fire on the shipped model.** `tracker.py:1966` escalates only when
  `obs.label is not None` and `guess_illegal_move` names a move; `cnn_recovery.py:440` returns `None`
  when `obs.label is None`. All 25 `occ-*` runs are 2-class, so it has been dead since specs/18.
  Verified 2026-07-28.
- **The threshold route is closed.** specs/20 phase 00: 0 of 20 accepted recovery sequences were
  inferred from absence; a non-en-passant capture leaves its destination occupied before and after, so
  occupancy cannot tell a fabricated capture from a real one. Against `occ-r3bn2-f3` the recovery
  invents `Nxe4` with an evidence profile indistinguishable from four correct captures.
- **The architecture exists.** `model.py:373` `HierarchicalHead` (`--head twostage`, occupancy→piece);
  `OccupancyObservation.label/conf` already declared and already consumed.
- **Shipped baseline** `occ-r3s-f3`: real holdout (9,728 crops) per-square 0.9727, 95 misses / 171
  phantoms; device observation 44–70 ms, p50 53 (SM8650, XNNPACK).
- **Misses are the dangerous direction**: a miss licenses a fabricated capture and cascades. Never
  select on total accuracy alone (MEMORY: `occupancy-miss-vs-phantom`).
- **Pre-existing, not ours**: `tests/test_camera.py` 3 failures from `dba6f29` (2026-07-21).

## Session log

<!-- Append: date — phase — what was measured/changed — the numbers — what is left. -->

- 2026-07-28 — pack authored after specs/20 phase 00 cancelled its own phase 01 and surfaced the dead
  alarm. Phase 00 ready to start; everything else gated.
