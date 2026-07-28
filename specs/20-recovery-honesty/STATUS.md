# STATUS — 20 recovery honesty

Branch: `spec-20-recovery-honesty` (from `spec-19-live-hardening`).
This file is the ONLY hand-off between agents. Append to your own phase's row and to the session log;
never rewrite another phase's entry.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | Measure what recovery accepts and on what evidence | done | agent-00 | No production file touched. **Verdict: the inference-from-absence case as 01 defines it is ABSENT (0 of 9 captures) — and 01's rule is vacuous on the shipped model. 01 must not proceed as drafted.** |
| 01 | A recovery move must be READ, not inferred from absence | todo | — | **Blocked by 00.** Parity-critical. |
| 02 | One played game is one stored record | done | agent-02 | `1711bb0..b278915`. A seam opens a `GameSegment`, not a record. |
| 03 | The cleanest synthetic crops need a noise floor | todo | — | Synth only, parallel. No retrain. |

States: `todo` → `in progress` → `done` | `blocked`.

## Dependencies

- **01 depends on 00** and must not start before 00 is `done`. If 00 reports the
  inference-from-absence case as absent on the measured material, 01 does not proceed — record that
  decision here.
  - **2026-07-28, recorded by phase 00: the case is absent, and the drafted rule is inert.** 0 of 9
    accepted captures had `dest_read_empty`; all 9 had the destination confidently OCCUPIED, which
    is what 01's `_capture_is_read` requires — so the predicate would have accepted every one of
    them, including the fabricated `Nxe4`. **01 as written must not be implemented.** The 01 row is
    left for the orchestrator to re-scope; the measurement and what would actually bite are in the
    session log below.
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

- 2026-07-28 — **00 done.** Measured only; `git diff HEAD -- src/ android/` is empty. Instrumentation
  is throwaway under `scratch/` (`recovery_audit.py`, `recovery_report.py`, `recovery_correctness.py`,
  `device_games.py`), not committed. `scratch/newclip.mp4` + `corners.json` copied off the temp path
  as `entry.md` instructs. Model `occ-r3s-f3`, `obs_s = 0.055`, one worker, no fan-out.

  **Method.** `CnnRecovery.derive_moves_deep`, `derive_moves_identity` **and `score_moves`** wrapped
  at class level (each `assert`ed to exist; the run `assert`s the wrapper fired), driven through
  `scripts/replay_clip_cnn.run`. Class level rather than the bound object because `run()` calls
  `_ensure_cnn()` before it hands control back through `on_event`, so a bound wrap would have missed
  the first observations. Callers are separated by walking the stack, because `score_moves` is
  reached from `_cnn_tick` (recovery) *and* from `_verify_tick` (the overrule rung, out of scope).

  ### The four numbers (`occ-r3s-f3`, `scratch/newclip.mp4` + all 21 clips `pytest -m clips` covers)

  | | newclip | 21 clips | pooled |
  |---|---|---|---|
  | `_cnn_tick` recovery evaluations | 11 | 58 | 69 |
  | **accepted sequences** | 4 | 16 | **20** |
  | ... committed as `cnn_recovery` | 4 | 0 | 4 |
  | **containing ≥1 capture** | 0 | 4 | **4** (4 individual captures) |
  | **`dest_read_empty and not dest_confident_occupied`** | 0 | 0 | **0 of 4** |
  | destination confidently OCCUPIED (01's test) | – | 4 | **4 of 4** |
  | destination occupancy actually *changed* | – | 0 | **0 of 4** |
  | origin confidently EMPTY (the absence) | – | 4 | **4 of 4** |

  1. **Accepted recoveries: 20, of which 4 contain a capture.** All four captures are on
     `blender-opera` (`Bxf3`, `cxb5`, `Rxd7`, `Bxd7+`).
  2. **Inference from absence, as 00 defines it: 0 of 4.** Not one accepted capture had its
     destination read confidently empty.
  3. **`best_hits − second_hits`: `{1: 8, 2: 12}` — 8 of 20 (40%) sit at exactly the margin of 1**,
     none above 2. `best` was **1.0000 in 20 of 20**: the accepted story explains *every* confident
     square, so agreement is not where the ambiguity lives — the runner-up is.
  4. **Cost of 01's rule: it rejects nothing and prevents nothing.** 0 of 20 sequences fail
     "every capture's destination confidently OCCUPIED". The only strengthening that bites —
     requiring the destination's occupancy to *change* — rejects 4 of 20, and **all four are
     correct** (they are the ground-truth moves in `blender-opera`'s `moves_uci`).

  ### Why: the drafted rule is aimed at a square that carries no information

  A non-en-passant capture leaves its destination **occupied before and occupied after**. On an
  occupancy observation the reading is therefore identical to the reading an *unmoved board*
  produces, so `_endpoints_read`'s "destination confidently OCCUPIED" (`tracker.py:109-115`) is
  satisfied by a fabricated capture exactly as reliably as by a real one. Measured: 4/4 of the real
  captures pass it, 1/1 of the fabricated one passes it (below). The only occupancy signal a capture
  emits is at its **origin** — which is the absence the rule exists to distrust. There is no
  occupancy test that separates the two, and 01 is a test on occupancy.

  This is structural on the shipped configuration: **`occ-r3s-f3` is a 2-class run,
  `classes: ["empty","occupied"]`** — as are all 25 `occ-*` runs under `data/models/` (26 of the 35
  runs there are 2-class). So
  `classes_have_identity` is False, `obs.label is None`, and `_cnn_tick` takes the occupancy branch
  (`tracker.py:2033-2041`) on every observation. The whole identity path — `board_matches_identity`,
  `derive_moves_identity`, `guess_illegal_move`, `has_occupancy_conflict`, the illegal-move alarm —
  is **dead code on the device today**. (9 identity runs exist, e.g. `p3-bleedfix`, `tiny-p3`; none is
  shipped.) Identity is the one axis on which a capture *is* readable: the destination's label
  changes from the captured piece to the capturing one.

  ### Correction: 01 patches the path that fires least

  Of the 20 accepted recovery sequences, **17 came from `score_moves` via `resync_check`**
  (`tracker.py:2034-2036`, the 1-ply occupancy path) and only **3 from `derive_moves_deep`**. 01's
  scope is `derive_moves_deep`'s `best_seq` only, so as written it would leave 85% of the acceptances
  untouched. On the clip suite the split is 16/0.

  ### Corrections to cited anchors

  - `00-measure-ambiguity.md` names `ChessCnnRecovery.recover`. **No such symbol.** The class is
    `CnnRecovery` and the entry points are `derive_moves_deep` / `derive_moves_identity` /
    `score_moves`; there is no `recover`.
  - "the deep search in `cnn_recovery.py:318-375`" — `derive_moves_deep` is **301-377**; the
    acceptance test is 374-377. `tracker.py:2333-2343` and `2341` are correct as cited.
  - `01-read-not-inferred.md`'s test 1 ("the *captured square* reads empty and the destination is NOT
    confidently occupied") is self-contradictory for a normal capture: the captured square **is** the
    destination.

  ### Were the accepted recoveries right?

  Checked against each clip's manifest `moves_uci` replayed from `start_fen`: **14 correct, 1 wrong,
  1 without ground truth** (`live-1244-fastplay`, the `known_failure` pin). The one wrong acceptance is
  `blender-stalemate` `Qb2` where the truth is `Qc7` — margin 2, agreement 1.000, **not a capture**,
  and it never committed. On `newclip.mp4` the committed line is
  `e4 e5 Nf3 Nc6 h4 h5 a4 Nf6 a5 a6` — the first four plies match the ground truth established
  2026-07-27 exactly, and `Nf3` came from `cnn_overrule`, not recovery.

  ### Device evidence (`data/_device/20260728-runaway/games/`, 47 records)

  123 plies replayed: **31 `cnn_recovery`, 7 of them captures (23%)** — against a 28% capture rate
  over all plies, i.e. recovery is *not* capture-biased across the corpus. Fragment `0052` is the
  outlier: 16 plies, 8 recovery, **4 of them captures**. Four records (`2143`, `2219`, `2311`, `0034`)
  are **not replayable from their own `startFen`** and break at plies 1/18/28/2. And the stored
  provenance carries `best = second = margin = cnnAgreement = 0.0` for **every** recovery ply, so the
  device dump cannot answer the evidence question at all — the Kotlin recovery path never fills them.
  Worth fixing whoever touches `core-engine` next; it is why this phase had to reconstruct the
  evidence by replay instead of reading it.

  ### Supplementary, clearly labelled: the model that caused the incident

  `entry.md` says to use `occ-r3s-f3` for every measurement, and every headline number above does.
  But measuring only on the model that was shipped *because* it ended the runaway cannot distinguish
  "recovery does not do this" from "this model no longer provokes it", and that distinction is the
  whole verdict. So the same audit was re-run on **`occ-r3bn2-f3`**, the miss-heavy run that drove the
  incident (`46c16d6`). 133 evaluations, **21 accepted, 5 with a capture** — and the profile is
  *identical*: **0 of 5** read-empty destinations, **5 of 5** confidently occupied, **5 of 5**
  uninformative, **5 of 5** resting on the origin's absence. Margin `{1: 14, 2: 7}` — 67% at the
  minimum margin, against 40% for the shipped model, which is where the extra risk actually shows.
  On `newclip` it commits `Nf3 e5 e4 Nc6 h4 h5 a4 Nf6 a5 Nxe4 a6`: the opening is **out of order**
  (truth is `e4 e5 Nf3 Nc6`) and it invents **`Nxe4`**, a capture `occ-r3s-f3` does not see on the
  same footage. `Nxe4`'s evidence profile is indistinguishable from the four correct captures on
  `blender-opera` — which is the finding, stated as sharply as the material allows. Neither model
  committed a single recovery on the 21-clip suite.

  ### What would actually bite (00 does not implement it — 01's call)

  1. **Identity at the destination.** The only axis on which a capture is readable. Requires shipping
     a 14-class run; none is shipped and 01 may not swap a model. Blocked, but it is the real answer.
  2. **The diff channel at the destination.** A real capture changes the destination's *pixels*; a
     fabricated one does not. The tracker already computes that (`z_eff`, census) and the recovery
     search ignores it entirely. This is occupancy-independent and needs no retrain.
  3. **Corroborate the origin over time** — require the origin's absence across N consecutive
     observations before a capture may be part of an accepted sequence. Cheap, and it attacks the
     miss that actually licenses the capture instead of the destination that cannot testify.

  Whatever 01 becomes, it must cover `score_moves`/`resync_check`, not `derive_moves_deep` alone.

  **Left for others:** `uv run ruff check src tests scripts synth` reports one finding, `I001` in
  `tests/test_synth_degrade.py` — phase 03's uncommitted file, not touched here.
