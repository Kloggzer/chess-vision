# Reaching 98% with minimal manual review

Independent assessment, 2026-09-11. Read-only inspection of existing runs; no training or
agent delegation was started for this assessment. This is an execution proposal, not a claim
that the target has been validated.

## Define the target before searching

Use **visible_piece_acc >= 0.98** for the exported checkpoint on an untouched test set.
This measures identity on visible occupied squares; it is not all-square accuracy, full-board
accuracy, or correct-move tracking. Report those separately, alongside per-class recall,
per-session results, coverage precision/recall and replay phantom/veto errors.

Use the same evaluation rows for cell and board models (`--boards-only` where needed).
Keep entire recording groups together, including derived variants of the same source video.
Audit existing test-set usage before treating any split as untouched. If it has already guided
architecture choices, reserve another group of recordings instead. Several independent sessions
and recording days are needed to assess generalization. More seeds do not replace more sessions.

## What is actually on disk

Numbers below are arithmetic means of the final 15 epoch records, not selected-checkpoint scores.

| Run | Completed epochs | Recipe | Visible piece accuracy |
| --- | ---: | --- | ---: |
| `_arch128v6-frac1/p4a-s42` | 60/60 | 128 px, fraction 1, no weight cap, head 128x2 | 98.602% |
| `_arch128v6-frac1/p4n-s42` | 60/60 | 128 px, fraction 1, no weight cap, no board head | 96.939% |
| `_arch128v6-frac1/p4c-s42` | 60/60 | 128 px, fraction 1, no weight cap, convolutional head | 90.846% |
| `_arch80v6-frac1/p4a-s42` | 60/60 | 80 px, fraction 1, no weight cap, head 128x2 | 94.250% |
| `_arch80v6/p4a-s42` | 60/60 | 80 px, fraction 0.35, weight cap 3, head 128x2 | 95.479% |

All of these use the same single validation session, `rg-2026-09-06-20-27-33`.
The 128 px attention run has 157 training sessions and two test sessions in its stored split;
there is no direct training/validation session-ID overlap. Source-level overlap still needs audit.
Its final 15 epoch scores range from 97.696% to 99.070%. It has `best.pt`, `best_piece.pt`,
`last.pt` and `state.pt`, but no stored `eval_*.json` or exported ONNX file in that directory.

Thus 98% is already plausible with the existing architecture. It is not yet a validated score
of a selected, exported model on independent recordings. The XL-head run was incomplete at
inspection and cannot be ranked yet.

## Small, sequential experiment programme

1. **Evaluate the existing 128 px candidate first.** Fix a checkpoint-selection rule using
   validation only; do not try every checkpoint on the final test set. Check identity, coverage
   and per-session behavior on development recordings before opening the final test set.
   This is cheaper than retraining to rediscover an existing candidate.
2. **Confirm 128 px under the preferred recipe.** Keep P4 and the 128x2 attention head, fraction
   0.35, weight cap 3, and the existing augmentation/optimizer schedule. Complete seeds 42/43/44
   with identical splits and budgets. Use low-memory mode and a RAM reserve; run one job at a
   time. Do not change fraction as a purported RAM cap: it changes optimization and data exposure.
3. **Use the already requested 80 px XL-head experiment as a separate comparison.** Pair it with
   complete 80 px standard-head runs under the same recipe and seeds. Width 256 and three layers
   change two capacity parameters together; this tests the package, not which parameter helped.
   Only try XL at 128 px if the standard head still misses the target or XL shows useful gains.
4. **If the preferred 128 px recipe loses the existing advantage**, compare it with the recorded
   fraction-1/no-cap recipe under the same safe I/O settings. Do not attribute the earlier
   +1.23 percentage points to the weight cap alone: fraction and weighting changed together.
5. **If a gap remains, choose one intervention from the error report.** Repeated class confusion
   suggests targeted balanced training examples; failures concentrated by session suggest
   lighting, camera or domain coverage; crop/geometry failures need pipeline investigation.
   These are hypotheses to test, not automatic diagnoses from one confusion matrix. Mine and
   oversample training errors only; do not train on final-test errors and keep calling it a test.
6. **Accept and stop searching** when the frozen exported model reaches the target on independent
   test recordings and passes the agreed runtime/coverage/replay constraints. Show uncertainty
   by recording group; correlated frames must not count as independent evidence. A stronger
   claim that the population accuracy exceeds 98% needs an uncertainty bound, not just a point
   estimate over 98%.

Keep batch size, class definitions, coverage thresholds and sample selection fixed within a
comparison. Report run-to-run variation separately from session variation. The range of three
seed means is not a standard deviation or a universal significance threshold. Tail epochs are
correlated and are not 15 independent replication runs.

## Automate execution and evaluation first

Use a bounded experiment manifest listing recipe, split/source fingerprints, seeds, output
directory and expected epoch count. Save code revision and effective low-memory settings too.

The sequential runner should perform:

1. Preflight: dataset/split compatibility, complete labels, available RAM, exclusive training slot.
2. Train or resume the exact existing recipe from `state.pt`; never silently replace partial runs.
3. On memory stop, crash, non-finite metrics or invalid data: stop the queue and report the reason.
4. Validate completion using exit status **and** unique contiguous epoch indices through the
   configured final epoch. Counting JSONL lines alone can accept duplicated/continued histories.
5. Evaluate development recordings, produce class/session metrics and group repeated mistakes
   into a small set of representative examples. Exclude partial, aborted and mismatched runs from
   the ranking rather than merely marking them with an asterisk.
6. Compare complete runs by paired seeds and a fixed tail window. Select checkpoints by the
   predeclared rule; evaluate the finalist as an actual checkpoint, not as a mean over checkpoints.
7. Export the finalist and compare ONNX predictions with PyTorch on representative data. Then
   measure phone latency and Kotlin replay behavior. Run final-test evaluation after selection.

Existing pieces: `scripts/sweep_arch_v6.ps1`, `scripts/compare_arms.py`, training `state.pt`,
`chesslab eval` (confusion matrices, confident confusions, per-session metrics), ONNX scoring
and desktop replay. These need integration and stricter eligibility checks, not a new ML stack.
Standalone `eval` must also receive a conservative loader policy before automating large
evaluations; the training low-memory option alone does not establish that for separate commands.

Manual work should be reserved for ambiguous labels/geometry and genuinely missing capture
conditions. Model disagreement must not automatically rewrite FEN-derived labels. Routine model
ranking, metric comparisons, export checks and known-clip replay can be automated.

## Why not immediately enable ASHA/Hyperband?

`scripts/train_watchdog.py` records a retrospective check on 33 completed runs: its proposed
early-score rule would have stopped 15, including eventual winners. It reports weak early/late
ranking correlation. That does not disprove every pruning algorithm, but it makes unvalidated
accuracy-based pruning a poor default for this project.

Before enabling pruning, replay the proposed rule on comparable completed runs, measure false
eliminations and savings, then validate it on another batch of runs. Until then, prune invalid
runs for operational reasons, not legitimate slow-learning candidates for early accuracy.
On one GPU, sequential orchestration also avoids multiplying memory pressure.

Hyperband allocates resources using early stopping; it does not guarantee early rankings are
faithful to final rankings ([paper](https://jmlr.org/papers/v18/16-558.html)). Repeated optimization
of one finite validation set also risks selection overfitting, which is why search and final
testing need separation ([Cawley and Talbot](https://jmlr.csail.mit.edu/beta/papers/v11/cawley10a.html)).
