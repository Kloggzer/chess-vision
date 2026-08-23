# From camera frame to committed move

The tracker runs on the phone and, through `:desktop`, on a PC — the same modules either way.
This is the shape of one frame's journey, at the level where you can point at a stage and ask
"did it happen". For the numbers each stage costs, see `chesslabPerf`; for what it decided, the
`chesslabDecision` row.

Two paths leave the pipeline and only one of them is per-frame. The **diff path** is synchronous:
every frame goes through it and a move can be committed inside that call. The **CNN path** is
asynchronous and sparse: it is asked for a reading a few times a second at most, off the frame
thread, and its answer arrives later as a snapshot the engine drains on some subsequent frame.

```mermaid
flowchart TD
    CAM["camera frame<br/>(ImageProxy on the phone, Mat from a file or webcam)"]
    CONVERT["convert — YUV → BGR<br/><i>host-specific; the only typed seam</i>"]
    LENS["Stage.LENS — undistort<br/><i>off unless a calibration matches</i>"]
    PUBLISH["publish frame<br/>→ preview, calibration tap, live align"]
    WARP["detection warp<br/><i>boardSize × detectScale</i>"]
    DARK["dark gate<br/><i>luma before CLAHE</i>"]
    GRAY["gray + CLAHE"]
    MOTION["ROI motion<br/><i>board quad + margin</i>"]
    GRID["grid coverage"]
    INPUT(["FrameInput"])

    CAM --> CONVERT --> LENS --> PUBLISH --> WARP --> DARK
    DARK -->|too dark| SKIP["skipped — no detection this frame"]
    DARK -->|usable| GRAY --> MOTION --> GRID --> INPUT

    INPUT --> ENGINE

    subgraph ENGINE["engine — synchronous, same frame"]
        DIFF["per-square evidence z<br/><i>gray + census, fused</i>"]
        VETO["vetoes<br/>shadow · occlusion · CNN conflict"]
        HYPO["score hypotheses<br/><i>which legal move explains the changed set</i>"]
        GATES["commit gates<br/>settle · confirm · evidence floor · motion recency"]
        COMMIT["board.push(move)"]
        REJECT["rejected — reason recorded"]
        DIFF --> VETO --> HYPO --> GATES
        GATES -->|passes| COMMIT
        GATES -->|fails| REJECT
    end

    COMMIT --> RESULT(["MoveCommitted<br/>new FEN, decider, SAN"])
    REJECT --> ROW(["chesslabDecision row"])
    COMMIT --> ROW

    WARP -.->|"only when asked"| CROPS["crop store<br/><i>bordered full-res warp</i>"]

    subgraph CNNPATH["CNN — asynchronous, a few times a second"]
        CROPS --> OBS["CnnObserver<br/><i>64 crops → ONNX</i>"]
        OBS --> SNAP["CnnSnapshot<br/><i>per-square occupancy + identity</i>"]
        SNAP --> QUEUE["snapshot queue"]
    end

    QUEUE -.->|drained on a later frame| ROUTE{"pending candidate?"}
    ROUTE -->|yes| VERIFY["VerifySingle / pair ladder"]
    ROUTE -->|no| TICK["cnnTick<br/><i>evaluator? due?</i>"]
    VERIFY --> GATES
    TICK --> VETO

    classDef broken fill:#5a1a1a,stroke:#ff6b6b,stroke-width:2px,color:#fff
    class CROPS,OBS,SNAP,QUEUE broken
```

## Where it is currently broken

The red band is measured, not suspected. On `rec-20260807-135238.mp4`, 8,820 frames, with the
classifier attached and verified (`CNN EP verified: CPU, classes=13`):

```
cnn=run  cnnAgree=0.000  cnnReads=0/0  cnnSnaps=0/0/0/0
```

`cnnSnaps` counts snapshots as they arrive and splits them by where they go — to the verify
ladder, to a missing evaluator, to a closed schedule gate. All four are zero, so in **this
measurement** no snapshot ever reached the engine. Neither engine-side gate closed; nothing got
that far.

That places the break in the dotted edge from the detection warp to the crop store, or in the
observer behind it — not in the engine, which is where six earlier rounds looked.

> **Not confirmed for live.** `specs/53` later measured `CnnSnapshot.gridOccluded` reaching the
> verify ladder in REPLAY, which the reading above says is impossible. One of the two measurements
> does not describe the live path. Re-measure before quoting either as the state of the tracker —
> the rest of this section is written as if the break still stands, and it may not.

## What the diff path does without it

Everything, minus arbitration. With no snapshot the occlusion filter falls through to a
">2 changed squares = a hand" heuristic instead of asking the model per square, and the pair
ladder has nothing to verify against. On the same footage the engine reads the first move
perfectly — `changed=[e2, e4]`, `best=e2e4`, no stuck reason — and the position never advances.

## Reading a run

```bash
./gradlew :desktop:run --args="replay <video> quiet lens"        # numbers only
./gradlew :desktop:run --args="replay <video> dump=10 lens"      # + annotated board PNGs
./gradlew :desktop:run --args="replay <video> nocnn"             # the diff path alone
```

Without `quiet` or `dump` a window opens showing the rectified board with each square tinted by
what the engine did with it, and it STOPS when the engine gets stuck.

---

# The engine's binding rules

Everything below moved out of the retired spec tree (`docs/specs-index.md`) because it is still
true and was recorded nowhere else. Each row names the spec it came from, so
`git show fd9c1908:specs/<pack>/…` still reaches the original. What holds today across the whole
project is in `CLAUDE.md`; the turning points and the measured dead ends are in
`docs/how-we-got-here.md`.

## The 14 correctness invariants (`specs/17`)

The traps that broke the first Kotlin port. Violating one is silent and fatal. Each has a named
test; the anchors below were re-checked against the tree on 2026-08-20.

| # | Invariant | Anchor today |
|---|---|---|
| 1 | **Two warps per frame.** Detection runs at `detSize = boardSize × detectScale` = 1600 × 0.5 = **800**. CNN crops come from a *separate* full-resolution **bordered** warp (`cropBorderPx`). `refGray`, `refBgr` and every `CnnSnapshot.warped/gray` are at `detSize`. | `api/TrackerConfig.detSize` |
| 2 | **Shadow veto removes a square from `changed` but PRESERVES its z.** Vacate evidence must survive — a vacated square very often reads as uniform darkening to the HSV test. **Occlusion veto ZEROES z.** Swapping them breaks everything quietly. | `Vetoes.applyVetoes` (preserve) vs `Taint.kt` (zero) |
| 3 | The `>2 → occluded` state gate counts the **raw undilated** occluded core, never the dilated set. | `BaselineOcclusion.core` |
| 4 | **Tainted/latched squares count toward `maxChanged`** (`blockedN = tainted.countOneBits()`) even though their z is zeroed. | `Hypothesis.kt` |
| 5 | **Anchoring is path-specific — do not generalise it.** *Recovery* anchors on `snap.gray` / `snap.warped`, the frame the CNN actually looked at. *Verify* anchors on `pending.cur` / `pending.curBgr`, the averaged frame the candidate was raised from. **Neither may anchor on `lastCur`** — that is the bug class this invariant exists for. | `CnnTick.kt` vs `VerifySingle.kt` / `VerifyPair.kt` |
| 6 | `setRef(fromCommit = true)` must **NOT** rebuild the colour gamut. Only the quiet re-anchor may. | `Commit.setRef`: `if (!fromCommit) markGamutStale(curBgr)` |
| 7 | Census `eps` stays **0**, padding is **BORDER_REPLICATE**, never a wrap/roll. Any `eps > 0` breaks monotone-brightness invariance; a roll compares row 0 against the last row. | `Census.kt` |
| 8 | `censusThr` (**40.0**) compares against the **RAW** census channel, not the median-normalized one — keep a raw copy (`censRaw`). The normalized channel lets normalization pull a structurally changed destination square under the threshold: the phantom-shadow-as-destination class. | `Vetoes.kt`, `censForVeto` |
| 9 | **The alarm freezes noise learning AND blocks every commit, re-anchor and pending candidate.** Release only via explicit user correction or a verified restore — otherwise the alarm "heals" by drift instead of by correction. | `NoiseLearning.kt`: `if (alarm != null) return` |
| 10 | **`cnn_overrule` must be expressible**: the verify verdict carries a *replacement move*. Legacy D3 could not — the real move landed a cycle late. | decider `cnn_overrule`, `core-cnn/Recovery.kt` |
| 11 | Corner order is `[a8, h8, h1, a1]` for all geometry. CNN crop order is `all_squares()` = `a1,b1,…,h1,a2,…,h8` (rank-major from rank 1). Do not confuse them. | `api/TrackerStatus.kt`, `Bitboard.kt` |
| 12 | **`src/chesslab/config.py` is the only source of truth for the Python-side defaults.** *Partly obsolete:* the two documents this invariant named as stale — `docs/move-tracker-flow.md` and `src/chesslab/move_tracker/README.md` — were deleted with the Python tracker on 2026-08-07. The rule survives; its examples do not. | `src/chesslab/config.py` |
| 13 | Every terminal in the verify ladder passes the multi-glance vote (`verifyObsVotes = 2` consecutive identical outcomes) — never act on one glance. | `api/TrackerConfig.verifyObsVotes` |
| 14 | **`LatestFrame` semantics:** the frame source must **never** deliver the same frame twice. A repeated frame diffs to zero and reads as "stable" while a hand is waving. | `STRATEGY_KEEP_ONLY_LATEST`, `TrackerCamera.kt` |

Three of these numbers appear nowhere else in `docs/`: `censusThr = 40.0`, `maxChanged = 6` and
`occlCensusThr = 24.0`. They live in `api/TrackerConfig.kt`, and there alone since 2026-08-21 —
`config.py`'s `TRACK_DEFAULTS` was the Python tracker's copy and had no reader left after that
tracker went.

## What the engine remembers — the survey (`specs/39`, verified against the tree 2026-08-02)

The pack answered *"apart from undo, do other functions base decisions on previous decisions?"*
Answer: **almost nothing does, and mostly it should stay that way** — most ways of adding memory
here make the tracker confidently wrong for longer, which is the failure it already has.

| Finding | Detail |
|---|---|
| **`decisionLog` is write-only as evidence** | Read in exactly four places, none of which informs a decision: the undo trim (`api/TrackerEngine.kt`), the `setFen` clear, the fold in `DecisionLog.kt`, and the debug payload. A fifth egress is not a read — `DecisionLog` fires the sink on every `add`, which is how rows reach the diagnostics file. |
| **The diff channel never ranks the null hypothesis** | `loglikScores` scores only legal moves (`Scoring.kt`); "nothing moved" exists only indirectly, as `commitLlFloor` / `reanchorLlFloor`. The **recovery** channel does rank it — `deriveMovesDeepFull` seeds the empty sequence. The two channels differ here and the difference is documented nowhere else. |
| **`stuckCount` saturates at 3** | It counts repeats of the same stuck reason (`Guards.kt`) and is read exactly once, as `stuckCount >= settleFrames` in `CnnTick.evaluationDue`. `SETTLE_FRAMES_CNN = 3`, so past 3 it does nothing. That is the mechanism behind "68 rejections, nothing escalates". |
| **`cnnMarginSquares = 1` IS the fabrication mechanism** | A recovery bridge is accepted on `(best − second) >= marginSquares`, with the null hypothesis among the rivals. **One chronically-misread square is one square** — enough to buy a whole fabricated bridge. It is a margin question, not a memory question. |
| **One repetition mechanism already exists** | `anomalySince` / `anomalyStart[64]`: a square persistently changed with no move to explain it is healed into the reference on a per-square timer, and it is **deliberately disabled while the CNN disagrees** (`AnomalyPatcher.kt`). Healing a real desync into the reference makes the tracker agree with the wrong position permanently. |

Two counters from the same survey: the standoff of 2026-08-02 could not escalate because
`guessIllegalMove` returns non-null only for **exactly one** vacated **and exactly one** received
square, while a 0.980-agreement conflict set over ~60 confident squares is about one square — never
1-and-1. Closed by `desyncStandoffObsN = 12` (0 = off). And the recovery confirmer was single-shot
with the CNN attached (`confirmFrames(cnnOn) = 1`) until `RECOVERY_MIN_VOTES = 2` landed
(`EngineState.kt`).

## The refusal table (`specs/39` entry, `specs/10`)

Recorded so nobody re-proposes them without new evidence. `docs/how-we-got-here.md` lists the
dead ends that died on a *measurement*; these were refused on **structure**.

| Idea | Why it was refused |
|---|---|
| Beam / multi-hypothesis over positions | Structurally the right tool, **and it does not address these failures**: its own text says *"Does NOT fix illegal moves: no branch contains an illegal move."* The 2026-08-02 bridge was legal. Approved, never built — see below. |
| HMM / Viterbi smoothing over the position chain | Smoothing assumes conditionally independent observation noise. Here the error is **systematic per square** (`f4` misread in 90 of 186 observations); correlated noise makes a smoother *more* confident in the wrong answer over time. |
| Lower a gate when a candidate keeps failing it | It manufactures phantoms, and phantoms are the veto metric. |
| Suppress a chronically-conflicting square in the recovery channel | Plausible — it is the exact fabrication driver (`cnnMarginSquares = 1`). But the same square is also the only evidence that a real desync happened, so suppressing it cuts both ways. **Undecidable** without the diagnostics query "which squares are chronically wrong". |
| Condition the CNN on the believed position (logit prior · prior-as-input-channel · two-crop change detection) | All three improve the *verify* path and none helps *recovery*, which is where 13 of 21 commits and every failure were. The first two actively **hurt** recovery: the prior is by construction wrong exactly when recovery runs. Refused on direction, not on cost — the corpus can supply before/after pairs for the third. |

The logit-prior part of that last refusal was superseded on 2026-08-23: the snapshot now carries
both the conditioned view and the pixels-only view, plus raw probability mass on labels forbidden
by the context as an explicit `invalid` outcome. Verify alone sees the conditioned view; recovery,
resync, hand gates and the illegal-move alarm receive raw. A confident invalid outcome withholds the
forced allowed label. A crop sweep alone could not establish a default because the conditioned
argmax was identical while `invalid` deliberately withheld more observations. The subsequent
end-to-end replay A/B therefore scored confirmed SAN sequences rather than frames: across four
fully swept videos (111 reference plies), lambda 4 with raw/invalid safety found 73, missed 38 and
invented 4, versus 71/40/6 at lambda 0. Lambda 1 and 2 each regressed to 68/43/5. Lambda 4 was equal
on three sessions and better on one, never worse, and is consequently the runtime default. The
reproducible runner is `scripts/replay-prior-ab.ps1`; the partial-corpus report is
`data/reports/prior-video-sequence-partial.json`.

The first frame-level audit of the weak 67-ply session then exposed an integration bug rather than
a coverage failure: on its clean `Kxf3` frame the new model had 0 occupancy errors and 9 identity
errors. The alarm was occupancy-triggered but required exact identity on every diagnostic conflict
square before accepting recovery, so unrelated N/B/R mistakes made the alarm permanent. Recovery
now resolves alarm conflicts on occupancy only. A focused repeat of that session under the selected
safe lambda-4 arm improved **36 found / 31 missed / 2 invented** to **48 / 19 / 2**: +12 found,
-12 missed, with the phantom count unchanged.

The 19 that still went missing were one starvation, not nineteen failures. From ply 51 the tracker
fell silent for 1 800 frames while the CNN read the right move on every glance: `c3e4` at agreement
1.000, then `c3e4 c8b8`, then `c3e4 c8b8 h1e1` — always at vote 1 of 2. `dispatch` cleared the
recovery confirmer the moment a candidate became PENDING, and the diff channel re-proposed the same
phantom `a2a4` (a shadow on the a-file, rejected as a ghost every time) once per cycle. Two votes
were never reachable. Entering verification is not evidence against what the CNN reads — a commit
is, and `clearStuck` already resets there — so the reset is gone and the streak now freezes for the
duration of a verification instead of restarting. Same session, same arm: **48 / 19 / 2** to
**65 / 2 / 2**. The two remaining misses are `Nbc3`/`Bf3` committed transposed, which the scorer
counts twice — as both the misses and the two phantoms. Over all six confirmed recordings the arm
went from 134 found / 53 missed to 153 / 34, with no session worse and no new phantom.

The next session down the list, 2026-08-08-11-59-12, broke on a different mechanism at ply 47. On a
STILL board — motion 0.0074, nothing changed — the coverage head reported a ten-square occlusion
band over `d3`-`g3`, exactly where `f2f4` was being played, so the diff commit was vetoed, the
candidate `d2d1` was rejected as a ghost and the alarm latched on fourteen squares. Recovery had the
answer one glance later: `f2f4 e5c4` at agreement 1.000. It stood at vote 1 of 2, and the second
glance arrived 98 frames — 3.3 s — later, because `evaluationDue` holds the stuck arm behind
`cnnCooldownS`. Two plies had been played by then, the key never repeated, and once the gap outgrew
`recoveryMaxPlies` the search returned `[]` for the remaining 2 500 frames.

A vote wants two looks at the SAME board; a cooldown between them delivers two looks at a board that
had seconds to change. An open recovery vote is therefore due unconditionally. The two-vote floor is
untouched — only the waiting between the votes is gone. 11-59-12 went **45 / 27 / 1** to
**51 / 21 / 1** and 11-55-19 **13 / 2 / 2** to **15 / 0 / 0**, both phantoms included; the other four
sessions are unchanged. Over the six confirmed recordings: 153 found / 34 missed / 5 invented to
**161 / 26 / 3**.

What remains on 11-59-12 is upstream of the engine: a coverage head that paints a hand-sized band
across a quiet board is what starts the whole chain, and no gate downstream can un-see it.

The 21 that still go missing there are **not a gate to open**, and the number should not be spent
chasing one. Two independent reasons, both measured on 2026-08-23:

*The reference tail is unverified.* `candidate.json` carries `reviewed_plies` 1..51 and 72 plies in
total. The 21 missed plies are exactly plies 52..72 — the ones no human ever checked. The recording
labelled itself `"Position lost — tracking paused. Open the app to fix it."`, so that tail is the
2026-08 tracker's own unconfirmed output being used to grade the 2026-08-23 tracker. Of the six
confirmed recordings only this one has a tail worth the caveat (13-52-38 has a single unreviewed
ply and finds it anyway); the other four are fully reviewed.

*The break is occupancy, at full confidence, and terminal.* At the latching read (seq 5262, after
the reviewed `Bxe4`) the model disagrees on seven squares: five are identity at 0.90–1.00 —
`e3 wB->wN`, `h3 wP->wB`, `e4 bB->bP`, `g7 bB->bP`, `b8 bR->bP`, the model reading bishops and rooks
as pawns — and two are occupancy at conf 1.00: `d7 wN->empty` and `f8 bR->empty`. One occupancy
error is all the alarm needs, and it then latches on all seven. The board raster `boards/005241.webp`
sides with the MODEL on those two squares: seven of the eight ranks match the believed position
exactly, and `d7` and `f8` are visibly empty. Afterwards `deriveMovesDeep` returns `[]` on **725
consecutive reads** — the gap has outgrown `recoveryMaxPlies = 4` and nothing can bridge it. The auto
arm does not help either: `set:autoResyncObsN=3` scores 51/21/1, identical, which is what the kings
guard already predicted for this recording in `resyncVoteFen`'s own comment.

2026-08-14-20-35-52 then turned out to be measuring the harness, not the tracker. `replay` wound the
decoder to `session.yaml`'s `video_pre_roll_ns` less a fixed two-second lead — on that recording to
3.3 s, which is 0.7 s before the first move. That is not enough runway to acquire a quiet reference,
so `e2e4` never registered as a CHANGE: the engine's first reference already had the pawn on e4, it
entered `cnn_desync` on its first read and stayed there. `Nf3` was then rejected three times as a
ghost with the reason `board contradicts post-move position: e4`.

Sweeping the lead on that video shows how arbitrary the two seconds were — 2.0 s and 2.5 s score
1/4, 3.0 s scores 2/4, and from 3.5 s on it scores 3/4. Rather than pick a better constant, the skip
is gone: the phone tracks from its first frame, so a replay that skips is measuring a tracker the
device never runs. `start=` remains as the explicit instrument. Only this one recording in the
corpus ever skipped anything. Both models gain: comp13 1/3/0 to **3/1/0**, id35-80 2/2/1 to 3/1/0.

Corpus after the three changes of 2026-08-23, comp13 at lambda 4 with the safe prior:

| recording | before | after |
| --- | --- | --- |
| 2026-08-08-00-39-57 | 48 / 19 / 2 | 65 / 2 / 2 |
| 2026-08-07-13-52-38 | 23 / 2 / 0 | 25 / 0 / 0 |
| 2026-08-08-11-55-19 | 13 / 2 / 2 | 15 / 0 / 0 |
| 2026-08-08-11-59-12 | 45 / 27 / 1 | 51 / 21 / 1 |
| 2026-08-13-12-46-24 | 4 / 0 / 0 | 4 / 0 / 0 |
| 2026-08-14-20-35-52 | 1 / 3 / 0 | 3 / 1 / 0 |
| **total** | 134 / 53 / 5 | **163 / 24 / 3** |

21 of the 24 remaining misses are 11-59-12's unreviewed tail.

### Seven plies the labels had lost (2026-08-23)

Checking every `candidate.json` against python-chess found three whose SAN list cannot be played
from `start_fen`, and each broke on a `cnn_pair` commit — the signature of the bug `9f08b117` fixed
on 2026-08-09, where a pair commit wrote one row for two moves. The label therefore carried the ply
in its `fen_after` chain and nowhere in its SAN list. All three were `confirmed: true`; the human
had been checking positions, not SAN bookkeeping.

Reconstruction had no freedom in it: for each break exactly ONE legal move pair leads from the
previous position to the stored `fen_after`. On 11-59-12 it is also visible in the board rasters —
`001365.webp` has a white pawn on d4 and a black one on c5, `001539.webp` has d4 empty, a white pawn
on c5 and the queen on a5. That is `dxc5`, and the scorer was charging it to the tracker as its only
phantom on that recording.

| recording | plies | inserted |
| --- | --- | --- |
| 2026-08-08-11-59-12 | 72 → 73 | `dxc5` at ply 15 |
| VID_20260726_233432 | 18 → 21 | `Nf3` ply 1, `Ng5` ply 8, `Qxg4` ply 20 |
| VID_20260802_222741 | 25 → 28 | `e4` ply 1, `Bh4` ply 17, `Bf2` ply 27 |

No existing SAN changed — the repair only inserts. Ply numbers were renumbered 1..n, `reviewed_plies`
shifted with them, and the inserted plies were deliberately NOT marked reviewed: nobody checked them
individually. `log.jsonl`, `matte.jsonl` and `interval-check.jsonl` carry a ply per row and were
shifted the same way; the invariant that a log row's `fen` equals its ply's `fen_after` held before
the repair (1 344 rows) and holds after it. Originals sit beside each file as `.bak.dropped-ply`.
`tests/test_candidate_move_chains.py` now guards both invariants over every recording.

11-59-12 rescored **51 / 21 / 1 → 52 / 21 / 0**, so the corpus stands at **164 / 24 / 2** — and the
two remaining phantoms are 00-39-57's `Nbc3`/`Bf3`, committed transposed but reconverging three
plies later. By the phantom veto the corpus now carries no fabrication at all.

**The approved-but-never-built beam** (`specs/10/DIRECTION.md`, 2026-07-09, user idea): keep K
candidate boards, score each frame's evidence against each branch's legal moves, merge branches
reaching the same FEN, collapse when one branch dominates — possibly several plies later. Bounded
by design: **K ≤ 4 live branches, divergence depth ≤ 4 plies**, branching gated by the existing
`z >= zThr/2` soft gate. Branches share the reference image and diverge only in FEN; the
quiet-board re-anchor may run only on the **consensus** of all live branches; noise-learning
exclusion is the **union** of all branches' candidate squares; the CNN identity observation is the
arbiter that collapses the beam. While the illegal-move alarm is latched the beam is **frozen**. It
is **explicitly not a replacement for the alarm.**

## The frame-seq contract (`specs/11`)

**A decision made at frame N may only be verified or arbitrated by an observation with
`seq >= N`.** Before it, the pairing was implicit in call order — a candidate raised at frame N was
verified by whatever observation happened next, "usually-but-not-provably" from a later frame. That
"usually" is how the `lastCur` anchoring bug (invariant 5) happened.

| Consumer | Rule |
|---|---|
| Pending candidates | Carry the seq of the newest frame in the averaged buffer that produced them. |
| Verify, single and pair | Return immediately — no evaluation, no frame count — when `snap.seq < pending.seq`. A stale observation must neither confirm nor reject a newer candidate. |
| Occlusion filter | A freshness bound rather than a seq: fall back to the no-CNN heuristic when the cached observation is older than `_OBS_MAX_AGE_S = 3.0`. |
| Alarm / desync counting | Counts **distinct observations**, not evaluations — one snapshot counts once. `desyncObsN` means "persistent over seconds", not "evaluated three times". |

`android/core-engine/.../Alarm.kt` cites this pack by name ("Spec 11 seq contract") on
`advanceDesyncStreak`; that citation resolves here. One Kotlin-side refinement the Python spec did
not have: an unstable conflict set restarts the streak at **one**, never at zero — this observation
is itself evidence.

The premise the contract rests on: steady-state inference ~30 ms against a 25–40 fps loop, so "the
result is already there" is the common case and `seq >= N` waits are rare.

## Resync: the auto arm (`specs/37` phase 02, measured in `specs/52`)

`autoResyncObsN` = consecutive clean CNN looks that adopt the observed board while the alarm is
latched. **0 = off, and 0 is the phone default** — the phone keeps the show-then-press door. Three
measured iterations, each disproving a design guess:

| n | Result |
|---|---|
| **12** | Never fired. 2 914 of 3 069 snapshots discarded as not-due (evaluations run every 0.7–3 s, not at observation rate); 12 consecutive anything does not exist at blitz pace. |
| **3** | Never fired either — the gate failed **binarily**. Of 699 alarmed evaluations, 222 were hand-free and **221 of those failed the kings guard**: deep in the drift the believed king square confidently reads empty while the real king square is not confidently a king → kingless → null. Exactly **one** clean adoptable read existed, early, near the divergence point — carrying the true position. |
| **1** | Fires, and it is the largest single gain since the cadence: rec-20260808-115912 **61 → 87 plies**, 13 alarms each resolved by a resync instead of killing the game; **85 of 87** committed plies match the reference PGN by LCS, zero fabrications-from-nothing. Guards clean (rec-20260807 stays 25/0/0; 003957 stays 67 plies — the arm is inert where it is not needed). |

Two consequences survived the ladder: hand reads now **pause** the streak instead of resetting it (a
covered board is a non-observation), and the auto arm can only fire **near the divergence point** —
deep-drift adoption needs composite reads. n=1 under the standing gates (standoff/illegal alarm +
full identity axis + hand-free + kings-guarded minimal edit + position ≠ believed) is the working
**replay** setting.

### Reachability, not playability (`specs/53`)

A blitz run died at ply 70: `MoveGeneratorException … ArrayIndexOutOfBoundsException: Index 64`,
out of `DeepSearch.expand → legalMoves → generateCastleMoves → isKingAttacked →
getPawnAttacks(Square.NONE)`. Cause: **an auto-resync had adopted a position where the side NOT to
move stood in check.** `cnnAdoptedFen` only counted kings, and such a board generates moves
perfectly well — so the guard passed it, the deep search then captured the exposed king with a legal
move, and the *next* generator call on the kingless result threw, four call layers and dozens of
plies from the adoption that caused it.

The guard is now **reachability**: flip the side to move on a probe board and refuse the adoption if
the opponent is in check (`TrackerEngine.reachable`, plus
`ResyncTest.aPositionWithTheOpponentInCheckIsNeverAdopted`, which reproduces the exact board).
**The first guard written — "can it generate moves" — passed the crashing position**; only writing
the failing test proved it. The defect predates the 14-class model and is not occluded-specific; it
needed a model that steered the search there.

## Dense evaluation is not a default (`specs/52`, `specs/53`)

Dense evaluation = `cnnCheckIntervalS 0.15` + `cnnCooldownS 0.07` (the *engine's* evaluation
cadence, not the observer's), on top of `autoResyncObsN = 1`.

| video | n=1 alone | n=1 + dense |
|---|---|---|
| rec-20260808-115912 (blitz, 237 plies) | 87 plies, 85 real | **229 plies, 229 real (LCS vs PGN), 0 invented, 4 alarms** |
| rec-20260807 (calm) | 25 / 0 / 0 | **14 / 11 / 6 — six phantoms, 9 alarms: VETO** |
| rec-20260808-003957 (night) | 67 plies | 33 plies, 34 alarms |

Dense sampling hits exactly the mid-hand moments the sparse cadence skips. With `pOccluded ≡ 0.0`
on every bundled model those reads are indistinguishable from clean ones until an engine taint
latches → false mismatches → false alarms → n=1 adopts hand-distorted positions → phantoms.

**`specs/52` predicted an `occluded` class would close this; `specs/53` refuted the prediction as
stated.** With `occl14-80` served the safeguards *did* fire (772 and 2 789 non-zero `occl=` reads)
and the dense arm got **worse on both videos** — rec-20260807 17/8/**12**, and the blitz video
reached 106 of the blind model's 229. 229/229 is what dense evaluation can reach; nothing yet buys
it without the phantoms.

## The 12-phantom autopsy (`specs/53`, 2026-08-09)

The dense arm's 12 phantoms on rec-20260807-135238. Two named suspects — resync adoptions of
hand-distorted positions, and verify-ladder commits — are **both wrong**: **all 12 are
`cnn_recovery`.** The 7 resyncs in the same pass invented nothing; the ladder contributed none.

They arrive in bursts at one frame (4103 ×2, 4519 ×1, 4767 ×4, 6641 ×2, 8437 ×3), and two bursts
sit **on** a missed real ply:

| missed, label frame | invented, run frame |
|---|---|
| `Bd7` 4770 | `Rc7 Kd1 Rd7 Ke1` 4767 |
| `Qb4` 6635 | `b4 Qxb4+` 6641 |

The same board difference explained by a **longer** sequence. `Kd1` then `Ke1` is a round trip that
changes nothing — parity filler, because the observation demands two consecutive BLACK moves. The
placement-keyed dedup cannot collapse it: there is no shorter legal path to that placement.

**Mechanism: `deriveMovesDeepFull` ranked on hits first, with length only as a tiebreak**, at
`marginSquares = 1`. One extra explained square bought four plies — and B↔R is the identity head's
documented top confusion, so that square is exactly what a misread supplies. *The diagnosis is
historical:* the ranking now prices length (`cnnPlyCostSquares`, default 1 since 2026-08-09; the
0/1/2 sweep is in `docs/how-we-got-here.md`), and the margin compares the **scores**, not raw hits.

Refuted in the same autopsy: `P_OCCLUDED_THR` is **not** involved. At four of the five phantom
frames the head reads `occl = 0` across the eight preceding observations; at 4767 a hand of 20–21
cells had just cleared. **No lower threshold prevents any of the 12.** The per-observation
distribution is sharply bimodal — 3 638 of 4 410 at zero, then a broad hump at 13–20 cells, max 27
— a hand and forearm, not a jittery threshold. Do not spend a round retuning it.

## Holds and deadlines (`specs/19`)

### `motion_hold_s` — the ladder (§7.1)

Cited by `src/chesslab/config.py` at `"motion_hold_s"`, which names `specs/19 … section 7`.
Latency is `motion_hold_s + 0.05…0.07` at 30 fps in **every** run of the sweep, so the latency
column needs no separate experiment. All measurements deterministic (virtual clock, every frame).

| # | Configuration | Diff-path latency @30 fps | + CNN verify, 1 vote | Gives up | Evidence |
|---|---|---|---|---|---|
| 0 | was shipped: `hold 0.40`, `max_changed 6`, `cnn_verify` on | 0.47 | ~0.68 | — | clips 20/20 |
| 1 | **Python ships this**: `hold 0.34` | 0.41 | ~0.62 | nothing any instrument sees | clips 21/21; 0.32 loses `blender-scholars` |
| 2 | `hold 0.30` + `max_changed 7` | 0.37 | ~0.58 | occlusion gate widened 17 % | clips 20/20 |
| 3 | `hold 0.15` + `max_changed 7` | **0.22** | ~0.43 | same, plus 2 quiet frames of settling | clips 20/20 |
| 4 | rung 3 with `cnn_verify` **off** | **0.22** | **0.22** | the pre-commit ghost filter, entirely | clips 20/20 |
| 5 | shipped thresholds, `cnn_verify` off | 0.47 | 0.47 | the ghost filter | clips 20/20 |

`max_changed 7` is what unlocks everything below `hold 0.34`. The phantom question was answered as
asked: `Kd2` does **not** return at mc7 — the mc6 and mc7 runs on `VID_20260726_155132` are
identical move for move and score for score at both holds — and the five clips whose expected list
is empty still commit nothing.

**Why mc7 is still not proposed as a default:** on real recordings the committed move list is **not
a smooth function of any parameter**. Sweeping the geometry inset alone on `vid1244` (ground truth
`d4 d5 Nf3 Nf6 Nc3`): 0.040 right, 0.045 wrong, 0.050 right, 0.055 overshoots, 0.060 — the device
profile — wrong. Alternating, not a plateau. `motion_hold_s` behaves the same way: committed plies
go 0.40 → 9, 0.35 → 18, 0.30 → 6, 0.25 → 14, 0.15 → **0**. A single-run A/B on this material cannot
support a threshold decision in either direction.

**Kotlin's 0.20 is a physical choice, not a measured one** — the time a hand needs to leave the
board after releasing a piece. The 0.34 floor is *Python's* measurement at 30 fps; the 18-clip
Kotlin simulation runs at 12 fps and never reads that default at all, so it can neither reproduce
nor refute it.

### `verifyTimeoutS = 1.5` and the latency identity (§14)

Cited by `android/core-engine/.../api/TrackerConfig.kt` on both `verifyTimeoutS` and `motionHoldS`.
`verifyWindow` counts **observations**, and what one costs is set by the CNN — unbounded if the
observer stalls. The seconds deadline is what bounds the dead time, and it guards a **stalled
observer**, which no model speed fixes.

Over 66 pending candidates across 15 clips + 3 real recordings:

| population | n | local agreement | observations to verdict |
|---|---|---|---|
| pairs that commit | 6 | **1.000** (6/6) | **1** |
| singles that commit | 55 | **1.000** (55/55) | 2 (one lost to the seq gate) |
| shadow (correctly, no move) | 1 | 0.000 | 3 |
| pairs discarded | 3 (+1 at EOF) | 0.500 / 0.500 / 0.667–0.75 / 0.75 | 8 (the whole window) |

- **The two populations separate completely.** `cnnMinAgreement = 0.97` sits inside a 0.25-wide
  empty gap: the threshold is not the problem and does not need tuning.
- **Local agreement never rises inside a window** — in none of the 66 traces. Max, first and latest
  are the same number, so *"weight the first observation over the later ones" is a NO-OP*, and for
  a better reason than decay: the later observations carry no information at all.
- **Why 1.5 s:** the slowest terminal verdict in all 66 traces was a 3-observation shadow = 0.9 s at
  device rate, and the worst single observation on the phone was 544 ms, so two of them is 1.1 s.
- **Why expiry discards rather than commits:** at expiry a candidate has, in 66/66 traces, local
  agreement flat at or below 0.75. Discarding cannot manufacture a commit; it can only remove a late
  one, and no late commit exists in the data.
- The unbounded pending and the pair failure were **the same defect from two ends**, which is why
  one constant fixes both: the ladder's own window end, plus a frame-loop watchdog for a candidate
  whose ticks stopped entirely.

The figures the timeout was written against (146 ms and 290 ms per observation) were the wide
GroupNorm model's; `id35-80` measures 16 ms median for 64 crops live.

## Two engine cache keys, not one (`specs/46`)

They answer different questions and are both tested. The pack asked for one key; the implementation
shipped two, deliberately.

| | FEN fields kept | Symbol |
|---|---|---|
| Engine cache | placement, side, castling, en passant, **halfmove clock** (5) — the fullmove number is dropped | `canonicalEnginePosition`, `analysis/ReviewStore.kt` |
| Opening name | placement, side, castling (3) | `openingPositionKey`, `analysis/OpeningBook.kt`; `position_key` in `android/scripts/generate_opening_book.py` |

The fifty-move clock stays in the **engine** key against the pack's own "the move counters do not
belong": it changes what the engine may claim, so a shared draw score across different clocks would
be a wrong answer rather than a missed hit. It is correctly absent from the **opening** key, where a
name cannot depend on it. The budget is *in* the key, not beside it — `cacheIdentity` folds nodes,
cap, threads, hash and MultiPV into the hashed name.

## Still open

**The diff reference re-anchors only on a commit, so a replay that never commits never recovers.**
It used to jam at ply 0; it now jams at **ply 22** (`specs/40`, `specs/41`). On the 2026-08-02 game
the terminal note is *"Much change (18 squares + 0 occluded) — occluded/unstable, no move committed
(base truth unchanged)"*, with the last commit at **t = 130.37 s of a 319 s video** — 22 plies of a
game that ran 83 plies live. That is not "the CNN got 22 and the rest were hard"; it is the same
deadlock, entered later. With the geometry fixed (`specs/41`) both the diff evidence and the CNN
observations are good at that point, so the failure is in how they are **combined**, not in what
they see.
