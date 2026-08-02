# 39 — Status

| Phase | State | Note |
|---|---|---|
| 00 — the questions the file cannot answer yet | `todo` | land first; the other two change behaviour it would measure |
| 01 — a standoff that ends | `todo` | independent of 00 and 02 |
| 02 — the vote that was never taken | `todo` | independent of 00 and 01 |

No phase shares a source file with another. They may run in parallel; 00 is worth landing first
because it is the only one that produces evidence.

## What this pack is, in one paragraph

The engine was surveyed for the question *"apart from undo, do other functions base their decisions
on previous decisions, and would that raise quality?"* The survey found that essentially nothing
does, that most ways of changing it make the tracker confidently wrong for longer, and that **two of
the three things worth fixing are not memory at all — they are safeguards the code documents and does
not have.** The third is instrumentation. The two large ideas the question really points at (a beam
over positions, conditioning the CNN on the believed position) are refused here for want of evidence,
and phase 00 is the evidence.

## Findings from the survey, recorded so they are not re-derived

Every line was verified against the tree on 2026-08-02.

**`decisionLog` is read in exactly four places, and none of them informs a decision.**
`api/TrackerEngine.kt:262-263` (undo trim), `:287` (setFen clear), `DecisionLog.kt:131` (the fold),
`DecisionLog.kt:177` (debug payload). A fifth egress is not a read: `DecisionLog.kt:61` fires the
sink on every `add`, which is how rows reach the diagnostics file. The log is write-only as evidence.

**The recovery confirmer is single-shot with the CNN attached.** `confirmFrames(cnnOn = true) = 1`
(`api/TrackerConfig.kt:76`, `:92`) → `Confirmer(1)` (`EngineState.kt:309-315`) → `feed` returns true
on the first key (`Confirmer.kt:26-28`). `EngineStateBuffersTest.kt:111` asserts it. The KDoc at
`CnnTick.kt:222-223` claiming otherwise is false, and the note at `:225` is unreachable. Phase 02.

**The standoff cannot escalate.** `desyncEvidence` (`Alarm.kt:68-86`) escalates only on a non-null
`guessIllegalMove`, which needs exactly one vacated **and** exactly one received square
(`core-cnn/AlarmGuess.kt:46-48`). A ~one-square conflict set — which is what `cnnAgree = 0.980` over
60 confident squares means — can never have that shape. `desyncObs` and `desyncSince` grow forever
and are read only into a note. Phase 01.

**A recovery bridge needs to beat the null hypothesis by ONE square.** `deriveMovesDeepFull` seeds the
empty sequence (`core-cnn/DeepSearch.kt:41-42`) — so unlike the diff channel it *does* rank "nothing
moved" — and then accepts on `(bestHits - secondHits) >= marginSquares` with
`cnnMarginSquares = 1` (`:62-66`, `api/TrackerConfig.kt:30`). One chronically-misread square is one
square. This is the fabrication mechanism and it is a margin question, not a memory question. Phase
00's query 4 is what would justify touching it.

**The diff channel never ranks the null hypothesis.** `loglikScores` scores only legal moves
(`Scoring.kt:48-67`); "nothing moved" is represented only indirectly by `commitLlFloor` and
`reanchorLlFloor`. Recorded because the two channels differ here and the difference is not
documented anywhere.

**One repetition-based mechanism already exists and it is the model for phase 01.**
`anomalySince` / `anomalyStart[64]` (`EngineState.kt:323-325`, `AnomalyPatcher.kt:53-56`): a square
persistently changed with no move to explain it gets healed into the reference on a per-square timer.
It is deliberately disabled while the CNN disagrees (`AnomalyPatcher.kt:69-70`), for exactly the
reason this pack refuses most memory proposals — healing a real desync into the reference makes the
tracker agree with the wrong position permanently.

**`stuckCount` saturates at its only consumer.** It counts repeats of the same stuck reason
(`Guards.kt:81-94`) and is read once, as `stuckCount >= settleFrames` in `CnnTick.evaluationDue`
(`:64`). Past 3 it does nothing. That is the mechanism behind "68 rejections, nothing escalates" —
and those 68 + 65 rows are *alternations* between two reasons, since `markStuck` writes only on a
reason transition (`Guards.kt:93`) and `recordRejection` folds the rest (`DecisionLog.kt:131`).

## The two big ideas, and why they are not spec'd here

**A beam over positions** is `specs/10-multi-hypothesis/DIRECTION.md` — approved, designed, parked
since 2026-07-09. It is the structurally correct tool for a discrete state space with a hard
transition constraint, and three of its four listed open questions have since been answered by
shipped work (per-ply provenance by `specs/37` phase 00, multi-ply undo by phase 01, undo across a
collapsed line by phase 03). What it does **not** do is fix these failures; its own text says
*"Does NOT fix illegal moves: no branch contains an illegal move."* The 2026-08-02 bridge was legal.
Re-read it after a week of phase 00 files, not before.

**Conditioning the CNN on the believed position** — logit prior, prior-as-input-channel, or two-crop
change detection — was assessed separately. All three improve the *verify* path and none helps
*recovery*, which is where 13 of 21 commits and every failure were; the first two actively hurt it,
because the prior is by construction wrong exactly when recovery runs. The corpus *can* supply
before/after pairs for the third (`labeling.py:364-377` retains `session_id`, `frame`, `ply`,
`square`, `fen` per crop row), and the mechanics are cheaper than expected on both sides, so it is
not refused on cost. It is refused on direction. Details in the assessment.

## References this pack would need if any of it is written up

`docs/references.md` has no section on state estimation or temporal filtering — the tracker's whole
temporal design is currently uncited. If a later pack builds on the ideas surveyed here, two entries
were located and confirmed on 2026-08-02 and should be fetched properly before being added, per
`docs/references.md` §10:

- **An Algorithm for Tracking Multiple Targets** — Donald B. Reid, 1979, *IEEE Trans. Automatic
  Control* 24(6) 843–854, doi `10.1109/TAC.1979.1102177`. The origin of multiple-hypothesis tracking;
  the direct ancestor of `specs/10`.
- **Continuous Inspection Schemes** — E. S. Page, 1954, *Biometrika* 41(1–2) 100–115, doi
  `10.1093/biomet/41.1-2.100`. CUSUM; the textbook form of "this has disagreed longer than noise
  explains", which is what phase 01 does by hand in observation counts.

Neither was read beyond its abstract. Do not cite either from this file.

## Session log

_(empty — no phase has been started)_
