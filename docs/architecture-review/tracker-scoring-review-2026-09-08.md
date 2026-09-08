# Tracker scoring and performance review — 2026-09-08

The practical next step is a calibrated, cost-aware extension of the existing legal-move
scorer. Keep the geometric calibration, raw observations and conservative commit invariants.
Do not replace the tracker with a framewise majority vote or an uncalibrated HMM.

This review covers the classic engine's scoring/recovery path and selected integration points
in the stillness and changeset engines. It is not a complete audit of every tracker subsystem.
The code changes below affect the classic engine. Neither alternative engine was selected as
the new default. Historical replay results in other documents were read, not rerun here.

## Implemented findings

### Obsolete CNN snapshots consumed useful work and the next evaluation slot

In `android/core-engine/.../CnnTick.kt`, `cnnTick` previously called `identityRead` before
checking `snap.fen`. That call can search legal continuations on both identity and occupancy.
It then advanced `lastCnnTs` and `lastEvalEpoch`, even when the snapshot was rejected because
its position had already changed. The next fresh snapshot could consequently hit the cooldown.

The FEN check now precedes evaluation and schedule updates. Rejected snapshots still increment
`cnnReadsStale` and reset recovery confirmation; `cnnReadsTaken` now counts actual evaluations
only. No-evaluator and not-due dispatch behavior remains as before. The new regression test
checks that stale input does no evaluation and that fresh input at the same timestamp is due.

### Sequence scoring allocated sets and mutated positions at every leaf

`Scoring.kt` built a filtered legal-move list, boxed touched-square lists and set unions per
branch. Even terminal candidates were pushed and popped before recursion immediately returned.

The search now filters in place, carries the touched union in a 64-bit mask and skips leaf
push/pop. Nonterminal board mutations are restored with `try/finally`. Legal-move order,
endpoint gates, exchange-only third plies and search-limit policy remain unchanged. Bit iteration
sums in square order; floating-point accumulation order can differ from the old set insertion
order. Tests compare scores with tolerance and retain the existing golden scoring/replay gates.

`SequenceScoringTest` compares candidate sets and scores with the previous algorithm for the
starting position, castling, en passant, exchanges and promotions, at depths two and three.
It also checks restoration of FEN and the legal-move cache.

Local JDK 17 microbenchmark: starting position, all squares at z=10, two-ply search, 100 warmup
pairs followed by five batches of 200 searches each. Previous/optimized ratios were
6.56, 4.26, 5.63, 5.31 and 6.90. This intentionally dense input is a search stress case, not a
typical clean move. The harness is not JMH, runs the previous algorithm first and shows warmup/GC
variation. It supports a local speed improvement, not a phone FPS or end-to-end latency claim.

Reproduce from `android`:

```powershell
.\gradlew.bat :core-engine:test --tests com.chesslab.engine.SequenceScoringTest '-Pchesslab.profile=true'
```

## Further findings requiring behavioral evaluation

1. **Search budgets are not hard bounds.** Classic `loglikSequenceScores` checks `nodes > 4000`
   at recursion entry; ancestor sibling loops continue after exhaustion. `ChangeSearch.search`
   has a related entry-only check and counts recursive expansions rather than every generated
   candidate. Replacing `>` with `>=` alone is insufficient. Introduce an explicit result carrying
   `complete`, expanded/generated counts and an unresolved-alternative bound. A truncated search
   must not turn an unseen rival into apparent certainty. Changing the cutoff without this
   contract can reduce recall or produce unjustified commits, so it was not bundled with the
   equivalent-work optimization.
2. **Freshness checks are inconsistent.** `Hypothesis.capturesConfirmedColour` reads
   `cnnSnap?.obs` directly, unlike `cnnConfirmedUnchanged`, which checks freshness, position and
   occlusion. An obsolete confident color can therefore relax the quiet-capture destination gate.
   This is a candidate-admission risk; it is not evidence that the downstream verifier necessarily
   commits a wrong move. Centralize admission validity and add stale, occluded and wrong-position
   capture scenarios before changing that behavior.
3. **Changeset's two scoring stages are not a globally evaluated ranking.** `ChangeSearch.explain`
   prices only the first 12 raw candidates, sorts those and appends the unpriced tail. Objection
   penalties can lower a priced candidate below the tail, and capture credits can promote a
   candidate that was never priced. Treat the tail as unresolved bounds, not comparable calibrated
   evidence. A blanket final sort would still compare different score definitions. Evaluate
   alternatives until their upper bound cannot change the winner or common prefix.
4. **The classic scorer already has a null-relative score.** Summing changed-square logits is the
   Bernoulli log-likelihood ratio of a touched-set hypothesis against no change, under the model's
   assumptions. Null is implicitly zero, with floors applied later. Adding null explicitly helps
   explain decisions, but by itself adds no information. The current sigmoid mapping of z-scores
   is a heuristic, not an empirically demonstrated probability calibration.

## What the literature supports

| Primary source | Relevant result | Application and limits here |
|---|---|---|
| [Wölflein & Arandjelović, 2021, Determining Chess Game State From an Image](https://arxiv.org/abs/2104.14963) | Combines geometric rectification with separate occupancy and piece classification, trained using synthetic images. | Supports separating the occupancy and identity tasks. It concerns image-to-position recognition; its per-square accuracy does not establish live move-sequence precision or hand robustness. Retain ArUco/grid geometry. |
| [Guo et al., ICML 2017, On Calibration of Modern Neural Networks](https://proceedings.mlr.press/v70/guo17a.html) | Neural-network confidence can be miscalibrated; temperature scaling is an effective postprocessing baseline in their experiments. | Fit calibration on held-out sessions before interpreting CNN scores as evidence. Temperature scaling does not correct a persistent wrong argmax, nor prove robustness to a new camera or chess set. |
| [Srivastava, Plarre & Bullo, Adaptive Sensor Selection in Sequential Hypothesis Testing](https://www.egr.msu.edu/~vaibhav/papers/2011a-spb.pdf) | Studies sensor selection for time-efficient sequential decisions, trading information against observation time. | Motivates selecting the next useful measurement by expected discrimination per cost. Its statistical model does not justify treating our correlated image channels or adjacent frames as independent sensors. |
| [Viola & Jones, CVPR 2001, Rapid Object Detection using a Boosted Cascade of Simple Features](https://www.cs.utexas.edu/~grauman/courses/spring2007/395T/papers/viola_cvpr2001.pdf) | A cascade spends expensive computation only on candidates that survive cheaper stages. | Architectural analogy for cheap motion/geometry checks, legal hypotheses and selective CNN work. It is not a chess-tracking benchmark or evidence for particular thresholds here. |

The repository already contains stronger project-specific evidence against independent-frame
voting: `docs/emission-correlation.md` reports within-position error correlation of 0.901 across
20 recordings for model `comp13-occ-bn-lr1e2-bs512`. Those historical measurements are not current
model validation, but they make naive temporal likelihood accumulation an unsuitable default.
Repeated inference of almost the same image can amplify the same error. A cooldown saves cost;
it does not establish statistical independence.

## Proposed architecture

Use one immutable evidence snapshot per source frame: frame sequence, capture timestamp,
position/reference revision, geometry revision, raw per-square measurements and validity masks.
Keep raw classifier probabilities separate from probabilities conditioned on legal placement.
Recovery must not use its believed FEN as evidence that the same FEN is correct.

The decision pipeline should have four explicit steps:

1. **Validate evidence.** Reject incompatible frames/revisions and mark covered or unreadable
   squares unknown. Unknown is not empty. Retain hand, geometry, alarm and reference protections.
2. **Generate legal hypotheses.** Include no change, single moves and bounded short continuations.
   Carry expected before/after occupancy and color, plus touched squares. A touched-set union
   alone cannot express all evidence for occupied-to-occupied captures or moves that cancel.
3. **Score and expose alternatives.** Return per-channel contributions, best/runner-up margin,
   null margin and search completeness. Promotions use identity only when needed. Compare
   sequence hypotheses by their final expected observation while preserving legal ordering and
   common-prefix ambiguity.
4. **Commit or request useful evidence.** Request CNN evidence when it could distinguish remaining
   candidates; request a fresh observation when source validity failed; otherwise wait. Preserve
   a periodic full-board consistency check, since looking only at proposed endpoints misses desync.

As a first experimental scorer, use a small regularized candidate-level logistic model over
gray/Census evidence, expected occupancy/color transitions, visibility and disagreement features.
Train jointly so correlated channels are not simply counted twice. CNN identity should be a
separate optional feature. Bound each square's contribution, and include negative examples for
no-change, shadows, nudges and hands. Treat its output as a ranking score until calibrated.

An interpretable form for experiments is:

```text
S(h) = prior(h) + visual(gray, census, h)
                 + occupancy_color(raw_cnn, h)
                 + identity_when_needed(raw_cnn, h)
```

The functions and prior need held-out calibration; these terms are not assumed independent.
Use a uniform legal-move prior or calibrated sequence-length penalty, not Stockfish move quality:
players make mistakes, and an unlikely legal move still must be recorded correctly.

Do not sum the same frame or cached CNN snapshot again when a new video frame arrives. Within
one stable-position interval, initially replace/update evidence instead of indefinitely adding
votes. Sequential probability thresholds only deserve an error-rate interpretation once their
observation model has been validated on our data.

Sensor value should be evaluated by removing each channel and measuring the change in false
commits, missed plies, latency and compute. Report separately for captures, castling, promotions,
occlusion, exposure changes and unfamiliar setups. High per-square accuracy alone can reward an
almost useless always-empty sensor.

## Rollout and acceptance

First run the new scorer in shadow mode through the existing deterministic replay path. Log
its preferred move, alternatives, source IDs, feature contributions and requested extra work,
without changing the tracked game state. Then run a separate closed-loop replay: a scorer's own
commits change later references, so shadow agreement alone cannot certify a replacement.

Split training, calibration and final evaluation by recording/session; additionally hold out
camera/chess-set configurations. Tune only on development sessions. Freeze the selected model,
geometry and replay cadence for comparisons. Measure:

- matched, missed and invented plies, move precision/recall, first divergence and recovery;
- move-to-commit p50/p95 latency, with a defined timestamp for when a move becomes visibly complete;
- per-stage p50/p95 compute, CNN calls per committed ply and idle-board inference cost;
- calibration by condition, and sensor ablations under the same latency/false-commit budget.

Use `docs/android-performance.md`'s `workprofile` for repeated source work and copying, then
measure the final candidate on the physical phone. Do not accept a speed increase that merely
skips difficult moves. Predeclare the allowed recall/latency tradeoff and require no increase
in invented moves on the frozen regression set; quantify uncertainty across sessions before
claiming broader precision equivalence.

A production fusion replacement and selective crop inference remain experimental work requiring
that comparison. The patch in this review implements only the stale-evaluation fix and equivalent
sequence-search work reduction.

## Completed validation

- Seven Kotlin modules: `core-engine`, `core-cnn`, `core-geometry`, `tracker-runtime`, `desktop`,
  `engine-stillness`, `engine-changeset`; 1,009 test cases, zero failures/errors, three skipped.
- `:core-engine:ktlintCheck` and `:core-engine:detekt`: passed.
- `.venv/Scripts/python.exe -m pytest -q`: 875 passed, five skipped, 46 warnings.
- `.venv/Scripts/python.exe -m ruff check src tests synth scripts`: passed.
- `git diff --check` for the changed tracker code and review: passed.

The successful test runs used the existing local dependency caches outside the restricted shell.
No camera/UI changes were made. No new physical-phone benchmark or full real-recording A/B was
performed; the precision claim is limited to regression parity, not a measured field improvement.
