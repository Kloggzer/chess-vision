# 39 — Status

| Phase | State | Note |
|---|---|---|
| 00 — the questions the file cannot answer yet | `todo` | land first; the other two change behaviour it would measure |
| 01 — a standoff that ends | `done` | 2026-08-08; verified on real footage — see log |
| 02 — the vote that was never taken | `done` | 2026-08-07, plus two guards the phase text did not have — see log |

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

### 2026-08-08 — phase 01, forced by a real video

The motivating case arrived on its own: `rec-20260807-135238.mp4` ends with an ILLEGAL white
castling (O-O-O directly after white's Qh4 — two white moves in a row). The engine refused every
commit from there — correct — but never said why: a castling vacates TWO squares and fills TWO,
so `guessIllegalMove`'s 1-and-1 shape returned null and the standoff held silently to the end of
the video, exactly the structural hole this phase's Why section describes on the 2026-08-02
endgame.

Implemented as specified: `desyncStandoffObsN = 12` (0 = off; the KDoc says the number is an
unmeasured order-of-magnitude guess and names phase 00's query 3), the identity-gated no-guess
latch in `desyncEvidence` after the guess branch, knob rows in `ConfigKnobs.kt` (post-rework home:
`:tracker-runtime`) and `KnobCatalog.kt`, and the desktop label's `effective_config` records it.
All five prescribed tests written; `aStandoffOnOneSquareEventuallyAlarms` proven red first
(disabling the branch fails exactly that one test, 25 passed → 1 failed → reverted).

**Verified on the footage that forced it:** `:desktop replay rec-20260807-135238.mp4 quiet` now
ends with `REJECT … why=ALARM latched on e1,c4,a8` after the castling — the silent stall is a
loud one — with the 25 commits before it unchanged. Note the latched conflict list is the
DESYNC-STREAK's set, not the tidy a1/c1/d1/e1 a human would name: the streak's stability test
tolerates subsets, so the set it latches with is whichever stable core survived (here e1 plus two
chronically disagreeing squares). The card lists squares to CHECK, not a move — that is what
no-guess means.

### 2026-08-07 — phase 02, plus the clean-board gate

Implemented as specified, with two additions the review of a live frame forced
(`data/realgames/rec-20260807-135238/frames/007934.png`: a `cnn_recovery` commit at the exact
frame a finger sets the queen down — the observer is not motion-gated and the stuck arm needs no
stable board, so nothing kept a mid-move glance out of a bridge):

- **`RECOVERY_MIN_VOTES = 2`** (`EngineState.kt`), both construction sites through
  `maxOf(RECOVERY_MIN_VOTES, …)`, `recoveryVotes` exposed for the note (`CnnTick.kt`). Cost as
  budgeted: one `cnnCooldownS` (0.7 s today, the phase text still said 2.0) per bridge.
- **One snapshot, one vote** (`EngineState.lastRecoveryVoteSeq`) — not in the phase text; without
  it a re-fed snapshot would silently halve the defence.
- **The clean-board gate** (`CnnTick.recoveryVoteConfirmed`) — also not in the phase text: any
  square the observer itself reads as occluded (`pOccluded > P_OCCLUDED_THR`,
  `RECOVERY_OCCLUDED_LIMIT = 0`) refuses the vote AND resets the streak, exactly as an
  inconclusive read does. This is the half that addresses the finger-in-frame commit; the vote
  floor alone would not have (a stable wrong read votes the same twice — the phase text says so
  itself under "What this does NOT fix").

**The inverted test, as the phase demands it be recorded:** `EngineStateBuffersTest.kt:111`
asserted the single-shot behaviour in so many words ("the recovery confirmer moves with it") and
now asserts its negation plus the two-vote floor. 21 tests failed on the change — every one an
assertion that a single glance commits a bridge — and were moved to two-glance drives
(`RecoveryFixtures.recoveryGlances`, `TakenBackTest.observe` feeding two seqs); none was loosened.
New coverage: `aBridgeThatChangesBetweenGlancesNeverCommits` (the case the phase defends),
`aGlanceWithAHandInItBlocksTheVoteAndResetsTheStreak`, `oneSnapshotCannotVoteTwice`.

**The reset-set risk the phase flags:** `AnomalyPatcher.maybePatchAnomaly` cannot fire between two
votes — it refuses while `cnnStatus == "mismatch"` (`AnomalyPatcher.kt:69-70`), and `onMismatch`
sets exactly that before `onRecovery` runs. `VerifySingle.reject` needs a pending candidate, which
`detectGuards` refuses to raise while the tracker is stuck without a viable move. Empirically the
streak reaches 2 live: the post-change score runs still commit recovery bridges (rec: `Qf4`, `e5`;
VID: `Nc3`, `Nxd4` — all `cnn_recovery`).

**Measured effect, `:desktop replay <video> score` against the pre-change labels (2026-08-07):**

| video | before (found/missed/invented) | after |
|---|---|---|
| `VID_20260802` vs the Python 22-ply label | 17 / 5 / **3** | **20 / 2 / 0** |
| `rec-20260807` vs its 25-ply label | — (label = same engine) | 24 / 1 / 0 |
| `win-20260807` vs its 7-ply label | — | 4 / 3 / 0 — the 3 misses are exactly the suspected fabricated bridge (`Na3 Bxa3 Bf8`, all stamped label frame 1747) |

Two effects, both in the phantom-free direction: the fabrications are gone (VID's `Bxh6/Bg7/Rh6`
bridge and win's `Na3/Bxa3/Bf8` bridge no longer commit), and the VID run FOUND three plies it
used to lose (`h3, Nc6, Nc3` region) — the decider mix shifts from recovery-dominated to
`cnn_occupancy`-dominated, i.e. the tracker keeps step instead of repeatedly rewriting. The win
video still dies at ~frame 1750, now honestly stuck instead of confabulating — that open case is
unchanged and belongs to the 60 fps question (specs/52 STATUS).
