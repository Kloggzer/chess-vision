# STATUS — 20 recovery honesty

Branch: `spec-20-recovery-honesty` (from `spec-19-live-hardening`).
This file is the ONLY hand-off between agents. Append to your own phase's row and to the session log;
never rewrite another phase's entry.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | Measure what recovery accepts and on what evidence | done | agent-00 | No production file touched. **Verdict: the inference-from-absence case as 01 defines it is ABSENT (0 of 9 captures) — and 01's rule is vacuous on the shipped model. 01 must not proceed as drafted.** |
| 01 | A recovery move must be READ, not inferred from absence | **will not proceed** | — | Killed by 00: the rule is vacuous (0 of 20 acceptances inferred from absence; 4/4 real captures already pass it) and it patches the path that fires least (3 of 20). See the decision below. |
| 02 | One played game is one stored record | done | agent-02 | `1711bb0..b278915`. A seam opens a `GameSegment`, not a record. |
| 03 | The cleanest synthetic crops need a noise floor | done | agent-03 | `625a83a..889111a`. σ 2–6 → **16–22**, calibrated at crop level. **The median gap is not the finding** — the p10 tail is. Nothing re-rendered; `occ-synth` untouched. |

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
  - **2026-07-28, phase 03 re-measured with a committed tool (`synth/measure_noise.py`).** The real
    column reproduces (5.62 / 7.44 / 9.16 — and the reference is identified: the 20260630/20260722
    sessions, *not* all of `data/squares`). The synth p50 does **not**: 5.90, not 7.09, i.e. synth
    sits ~20 % *under* real rather than level with it. **The p10 finding stands either way** (3.72
    vs 5.62) and is the one the fix is aimed at; in neither reading is raising the median the goal,
    and the calibrated range deliberately leaves p50 *below* real.
- Device evidence is preserved at `data/_device/20260728-runaway/` — 23 sessions, 130 frames, 47 game
  records including the four runaway fragments.

## Session log

<!-- Append: date — phase — what was measured/changed — the numbers — what is left. -->

- 2026-07-28 — pack authored. Phases 00, 02, 03 ready to start; 01 gated on 00.

- 2026-07-28 — **DECISION: phase 01 is cancelled as drafted, and the pack's premise is replaced.**
  Phase 00 measured the drafted rule to be vacuous, and in verifying its reasoning the orchestrator
  confirmed a larger finding that explains the live behaviour better than the recovery search does:

  **The illegal-move alarm is dead code on the shipped model, and has been since specs/18.**
  `_desync_evidence` escalates to `_raise_alarm` only when `snap.obs.label is not None` AND
  `guess_illegal_move(...)` names a move (`tracker.py:1966-1969`), and `guess_illegal_move` itself
  returns `None` immediately when `obs.label is None` (`cnn_recovery.py:440`). The shipped
  `occ-r3s-f3` — like all 25 `occ-*` runs — is 2-class `["empty", "occupied"]`, so `obs.label` is
  always `None`. **The alarm cannot fire.** With it die `board_matches_identity`,
  `derive_moves_identity` and `guess_illegal_move`.

  That is the whole shape of the live complaint. The system kept the half that INVENTS a legal story
  (recovery needs occupancy only) and silently lost the half that STOPS and asks (the alarm needs
  piece identity). The user's report — *"das illegaler zug gemacht klappt immernoch net … das hatte
  das spiel wesentlich beruhigt auf dem pc"* — is exactly this: on the PC the tracker ran a 14-class
  model, so the alarm worked.

  Phase 00 reached the same conclusion from its own side ("identity is the one axis on which a
  capture is readable") and additionally showed 01 would have patched the wrong path: 17 of 20
  acceptances came from `score_moves` via `resync_check`, only 3 from `derive_moves_deep`.

  **Next step is NOT an acceptance-rule change.** It is restoring piece identity to the observation,
  and that is a model/architecture decision (a 14-class model, or occupancy plus a best-effort
  identity head used ONLY to let the alarm name a move, never to commit). It needs its own spec and
  the user's call — recorded here, not improvised.

  Corrections from 00, kept: `ChessCnnRecovery.recover` does not exist; `derive_moves_deep` is
  301-377, not 318-375; 01's drafted test 1 was self-contradictory (the captured square IS the
  destination); the device dump stores `best = second = cnnAgreement = 0.0` for every recovery ply
  and so cannot answer the evidence question.
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
  *(03: fixed and committed in `ca820e3`; `ruff check src tests scripts synth` is clean.)*

- 2026-07-28 — **03 done** (`625a83a`, `ca820e3`, `889111a`). No retrain, no re-render; `occ-synth`
  and every render under `data/synth_occ_v1/` are byte-identical to before. All work on copies in
  `scratch/`, one worker.

  ### The headline is negative, and it is the point

  **The median gap this phase was commissioned to close does not exist.** Whether you take the
  pack's numbers (synth 7.09 vs real 7.29) or this re-measurement (5.90 vs 7.44), "synthetic
  material needs camera noise" is the wrong summary: in the first reading there is nothing to
  close, in the second the deficit is 20 % and would be *worsened* by the tool as it stood. The
  calibrated range is therefore aimed at the **p10 tail** — 3.72 against a real floor of 5.62 — and
  lands the p50 deliberately 4–6 % **below** real, never above. Nothing here should be read as
  "we added camera noise."

  ### What was measured (`synth/measure_noise.py`, `empty` crops, std of the residual after a
  σ=1.2 blur, at CROP level)

  | crop-level HF energy | p10 | p50 | p90 |
  |---|---:|---:|---:|
  | real reference (`occ-real3`, sessions 20260630/20260722, n=400) | 5.62 | 7.44 | 9.16 |
  | synth as shipped (`occ-synth`, n=1500) | 3.72 | 5.90 | 7.88 |
  | 24-render sample re-cut as-is (908 empty crops) | 4.06 | 5.84 | 7.72 |
  | the same sample, **old** σ 2–6 | 3.33 | 5.21 | 6.76 |
  | the same sample, **calibrated** σ 16–22 | 6.06 | 7.12 | 8.24 |
  | held-out sample (shard-2, 1011 crops), σ 16–22 | 5.74 | 7.00 | 8.50 |

  ### Three corrections to the phase file's premises

  1. **"Do not run `degrade.py` over `data/synth_occ_v1/` — those renders are already degraded."**
     They are **not**. `occ-synth`'s packed crops measure identical to crops re-cut from those
     renders (3.72/5.90/7.88 vs 4.06/5.84/7.72), every shard measures the same (no partial pass),
     and each `.jpg` carries the same mtime as its `.json` sibling — an in-place rewrite would have
     moved it. The corpus is undegraded material and `degrade.py` is a manual step wired into
     nothing (it appears nowhere in `src/`, and was documented nowhere at all until this phase).
     *The instruction was still honoured*: the originals were never opened for writing.
  2. **"`degrade.py` adds σ 2–6 and enough survives the warp."** It makes crops **cleaner**:
     4.06 → 3.33 at p10. Steps 1–3 and 5 (contrast ×0.88, defocus, JPEG q70–88) remove more
     high-frequency energy than σ 2–6 restores, and the EEVEE render's own grain (~7.2 at board
     level) already dwarfs σ 2–6. Applying the tool as it stood made the very tail this phase
     exists for *worse*.
  3. **Board σ ≠ crop σ.** Only ~0.26 of the injected σ reaches the crop: the warp maps 1280 framed
     render px onto an 1100 px board and `crop_square` letterboxes a 165 px box into 128 px. That
     is why σ had to go to 16–22 and why the docstring pins the range to the current
     `--res 1600` / `--frame-frac 0.80` / `warp_board_size 1100` geometry.

  ### The real reference had to be pinned down first

  `data/squares/empty` spans p50 3.60 (the dim 0708/0709 sessions) to 9.45 (the 21.07 ones) — a
  2.6× spread, so an unfiltered "real" number is meaningless. The pack's 5.87/7.29/9.30 reproduces
  as the **20260630 (+20260722)** sessions: measured 5.51/7.36/9.29 and 5.62/7.44/9.16. That subset
  is what `measure_noise.py --sessions` exists for and what the calibration targets.

  ### Red then green

  `tests/test_synth_degrade.py`, 3 tests, measured through a flat-patch equivalent of the warp/crop
  chain (validated against the real `warp_board_for_crops` + `crop_square` on a flat 1600×1600
  render: min 3.93 vs 3.97, median 4.79 vs 4.77 over 40 seeds; ~30× faster).
  **RED** — `NOISE_SIGMA` mutated back to `(2.0, 6.0)` by a script that `assert`s its target
  string: `2 failed, 1 passed`; test 1 `cleanest of 200 degraded crops has hf 0.26 < 3.5`, test 2
  `noise-only median 0.95 outside [3.5, 6.4]`.
  **GREEN** — restored to `(16.0, 22.0)`: `3 passed in 1.99s`.
  `uv run ruff check synth tests` clean (and `src scripts` with it).

  ### The visual probe says something the numbers do not

  `docs/synth-pipeline-noise.png` (1304×786, 848 KB) — four rows over the same eight squares at
  native 128×128: real, render as-is, old σ 2–6, calibrated σ 16–22, hf under each crop. Row
  medians 7.55 / 5.93 / 5.07 / 7.41. **The scalar now matches; the character does not.** Real
  crops carry directional **wood grain**; the injected energy is per-channel speckle. A finer board
  texture at render scale, or luminance-only noise instead of independent per-channel noise, is the
  next lever — both are design changes the phase file forbids ("do not redesign"), so they are
  recorded here rather than done. Also worth knowing for anyone reading the montage: the corpus
  randomizes board colour hard (magenta boards on green backgrounds are normal), so the probe picks
  the render closest in colour to the real board, to compare grain and not palette.

  ### Left for the user's decision

  The new range only takes effect on renders degraded **after** this commit. Whether to spend a
  re-render of the 256k-crop corpus on a p10 floor — knowing the character caveat above — is
  explicitly not this phase's call.
