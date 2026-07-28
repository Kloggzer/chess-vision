# STATUS — 20 recovery honesty

Branch: `spec-20-recovery-honesty` (from `spec-19-live-hardening`).
This file is the ONLY hand-off between agents. Append to your own phase's row and to the session log;
never rewrite another phase's entry.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | Measure what recovery accepts and on what evidence | todo | — | Fixes nothing. Blocks 01. |
| 01 | A recovery move must be READ, not inferred from absence | todo | — | **Blocked by 00.** Parity-critical. |
| 02 | One played game is one stored record | done | agent-02 | `1711bb0..b278915`. A seam opens a `GameSegment`, not a record. |
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
- 2026-07-28 — **02 done** (`1711bb0`, `28e7bb5`, `d770131`, `b278915`). A seam now opens a
  `GameSegment` inside the running record instead of closing it: `StoredGame.segments` holds the
  legal lines, `moves` stays the flattened list every existing reader uses, ply numbers run across
  segments. `openedBySeam` (12a4422) removed and migrated on read in `decodeStoredGame` — both
  pre-segment shapes are covered by tests, including the one actually on the device
  (`data/_device/20260728-runaway/games/`), which has neither `openedBySeam` nor `segments`.
  PGN emits one `[Event]` block per segment with its own `[FEN]` and a seam comment on the first
  move; the games row says `rebuilt N×` from a new `GameSummary.seams`; the detail screen renders
  the seam between the segments. Red-first proven twice: writing the tests against the splitting
  controller failed 5 of them (`aCommitThatLeftTheRecordsLineOpensASegmentNotANewRecord` at
  `store.list().isEmpty()`, `anUndoRightAfterASeamRemovesTheSegmentItEmptied` at `moveCount == 2`),
  and re-mutating `openSegment` back to `endAndSave()` + `LiveGame(...)` reproduced the same 5;
  deleting only the empty-segment removal in `LiveGame.onFen` reproduced test 4 alone. Gate:
  `:app:testDebugUnitTest` green on a `--rerun-tasks` run (356 tests, 37 of them in
  `com.chesslab.tracker.games`),
  `:app:ktlintCheck` and `:app:detekt` clean, no `@Suppress` and no baseline additions.
  **Deviation from the phase file, deliberate:** its steps 1 and 2 are one commit, because a commit
  that adds `segments` while `LiveGame` still writes `openedBySeam` does not compile. Every commit
  here builds on its own.
  **Note for whoever reads the fragments:** this changes future records only; the four files already
  on disk stay four files.
