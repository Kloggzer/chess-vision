# Handoff: explore modern model techniques for reliable chess recognition

## User intent and constraints

Explore architectural and training ideas used in modern Transformer models, adapted to a small
vision classifier. **Do not build an LLM.** The target is a reproducible, practically meaningful
improvement over the current P4/128-pixel baseline, not a lucky validation maximum.

The user wants minimal manual evaluation and prioritizes machine stability over throughput.
Work without spawning additional agents. This handoff proposes staged experiments; it does not
authorize an unbounded search. Inspect active jobs before starting anything and coordinate with
the existing XL-head experiment instead of duplicating or interrupting it.

## Updated research shortlist (reviewed 2026-09-11)

The initial version leaned too heavily on 2021/2022 foundations. The following recent work
changes the proposed search order. Older techniques below remain useful controls, not the
complete state of the art. This is a targeted shortlist, not an exhaustive literature survey.
Read each primary source and its reference implementation before implementing an arm; record
paper version and code revision. Do not equate a preprint or author report with independent
replication, and do not copy published benchmark gains into expected chess gains.

### R1: gated SDPA — first modern attention experiment

[Gated Attention for Large Language Models: Non-linearity, Sparsity, and Attention-Sink-Free](https://arxiv.org/abs/2505.06708), May 2025 / NeurIPS 2025, studies gates applied after scaled
dot-product attention. Its reported language-model benefits include improved optimization
stability. This is **not** the same as the final-logit context gate proposed in Candidate 3.

For chess, replace only the existing attention sublayer with explicit bidirectional Q/K/V
attention and a query-dependent sigmoid gate on each head's output before the output projection.
Select the exact gate dimensionality/placement from the reference implementation and document it.
Keep width, layer count, local classifier and training recipe fixed. Establish a plain explicit
attention control first, with output/gradient agreement against the existing MHA implementation.
Compare gated versus plain explicit attention; report added parameters and device latency.

Hypothesis: context contributions become easier to suppress when unhelpful. Record gradient
norms, activation outliers and confident identity errors, but treat those as diagnostics, not
proof of causality. Use the existing ROCm math path initially. Better optimization does not fix
a driver or RAM-exhaustion bug. No causal mask or text-generation machinery is needed.

### R2: Differential Transformer V2 — second attention alternative

[Microsoft author report](https://huggingface.co/blog/microsoft/diff-attn-v2), January 20, 2026,
with [reference code](https://github.com/microsoft/unilm/tree/master/Diff-Transformer/Diff-Transformer-V2).
The consulted report explicitly describes experiments as ongoing; do not label it a completed,
peer-reviewed 2026 benchmark study. Its predecessor is
[Differential Transformer](https://arxiv.org/abs/2410.05258), October 2024 / ICLR 2025.

V2 combines two query-head outputs sharing keys/values by learned subtraction, with token/head
specific sigmoid coefficients. Transfer that operator into a separate bidirectional board-head
arm. Start from the published parameterization, not an improvised subtraction of unrelated heads.
Hypothesis: signed context contributions can reject distracting evidence. Compare independently
against the same explicit-attention baseline, rather than stacking R1 and R2 initially.

Published autoregressive decoding-speed observations do not predict 64-token Android inference.
Measure the additional query work, numerical stability, ONNX behavior and actual phone cost.

### R3: VECA / learned communication cores — for richer spatial tokens

[Elastic Attention Cores for Scalable Vision Transformers](https://arxiv.org/abs/2605.12491),
May 12, 2026, is a recent vision preprint. It routes communication through a fixed-size learned
core set while retaining and updating image tokens, avoiding all-pairs patch attention. The
paper also investigates an elastic compute/accuracy tradeoff.

This is a more current architectural reference for Candidate 1's spatial-token question.
A chess adaptation could retain four tokens per square and communicate through a small fixed
core set. Preserve square association and produce exactly 64 identity/coverage predictions.
Benchmark against A1 and the simple 64-query/256-key A2 control. Do not call A2 a reproduction
of VECA: its update structure differs. First verify that extra spatial information helps; then
compare communication mechanisms. At these small token counts, simpler attention may be faster
than a theoretically linear scheme. Do not begin with elastic/nested training as another variable.

### R4: modern visual teachers and dense-feature transfer

[DINOv3](https://arxiv.org/abs/2508.10104), August 2025, is relevant for dense visual features;
its Gram anchoring addresses degradation of dense representations during long pretraining.
The [official repository](https://github.com/facebookresearch/dinov3) also provides distillation
resources. First test an appropriately sized frozen visual encoder plus a supervised chess head
on development data, using source-separated splits. If promising, evaluate bounded adaptation.
Neither a frozen-probe failure nor a high ImageNet score settles its potential for this domain.

If a teacher actually wins, compare identity-logit distillation against feature distillation
into the compact chess model. Align the spatial coordinates and augmentation of both inputs;
projection layers belong in the training configuration. Consider pairwise feature-relation losses
only after simple feature transfer works. Do not rebrand an arbitrary Gram-matrix loss as the
paper's Gram-anchoring method, or reproduce foundation-scale pretraining on this machine.

[MobileCLIP2](https://arxiv.org/abs/2508.20691), August 2025, and
[Apple's implementation](https://github.com/apple/ml-mobileclip) provide a newer reference for
teacher-based reinforced datasets and temperature-sensitive distillation. Borrow the idea of
precomputing useful teacher supervision in bounded chunks; do not build caption generation or a
text encoder for a task with FEN labels. Its mobile latency claims use a different model, workload
and device, and cannot be applied directly to chesslab.

### Considered, but not first: changing residual connectivity

[mHC: Manifold-Constrained Hyper-Connections](https://arxiv.org/abs/2512.24880), December 31,
2025, explores constrained expanded residual connections. This is a genuine recent architectural
idea, but its motivation is less directly matched to a two/three-layer board head. Revisit only
if deeper heads show a measured optimization bottleneck. Do not add it merely because it is new.

### Revised execution order

1. Freeze/reproduce the 128 px baseline and build the verified explicit-attention control.
2. Complete the R1 gated-attention comparison over three paired seeds.
3. Choose one next question from results: R2 for attention behavior, or A1 then R3/A2 for spatial
   information. Do not automatically schedule every method listed here.
4. Evaluate a modern teacher as a separate route if further gains are needed. Dense-feature
   transfer is now a first-class option, not merely a historical DeiT reference.
5. Combine only independently useful changes and confirm finalists under the protocol below.

These entries supersede the earlier A1-first priority. Candidate 1–3 below explain the simpler
project-specific controls, which remain useful for attributing any gain.

## Starting evidence

Read `docs/accuracy-98-plan.md` for the evaluation plan and caveats. The existing
`data/models/_arch128v6-frac1/p4a-s42` completed 60 epochs with 98.602% mean
`val_visible_piece_acc` over its last 15 epochs. That is one seed and one validation session,
under fraction 1 and no weight cap. It is neither an independent-test result nor the score of
one deployed checkpoint. Do not combine it directly with results from fraction 0.35 / cap 3.

The working hypothesis is that **information available to the head matters more than head
width alone**. This is an architectural hypothesis, not a diagnosis already established by data.
P8 also changes channel widths, so its poor results do not isolate patch size as the sole cause.

## What the current model actually does

* `src/chesslab/training/model.py`: `CellNet.forward` computes convolutional spatial features,
  then averages over both spatial dimensions. With P4, the nominal total stride is 32; inspect
  actual feature shapes at 80 and 128 px rather than assuming them.
* `src/chesslab/training/boardnet.py`: `BoardNet` gives the board head one pooled vector per
  square. It adds local logits to a board-context correction.
* `BoardAttentionHead` already has pre-LayerNorm, residual connections, self-attention and GELU
  feed-forward blocks. It currently has no explicit spatial position representation.
* Preserve the external contract: `[B,64,3,H,W]` in, `[B*64,14]` out for 13 identity classes plus
  coverage. Square order remains `a1,b1,...,h8`. Labels and canonical classes stay unchanged.

CNN pooling can learn useful invariant features. We cannot assume spatial averaging is harmful;
the experiments below test whether exposing some spatial detail improves the residual errors.

## Candidate 1: retain within-square detail before board reasoning

Expose spatial features through a new `forward_features` method while preserving the current
`forward` path and checkpoint compatibility for the baseline. Keep the local classification
branch's existing global-average-pooled features initially.

Start with two deliberately separate variants:

**A1 — spatial detail without more board tokens.** Adaptive-pool each square's final feature
map to 2x2. Flatten those four vectors in a fixed order and project to one board token. Keep
the existing 64-token board attention. Compare against an approximately parameter-matched
projection from the original pooled vector. This separates some benefit of spatial information
from simply adding parameters. Report any remaining parameter/compute mismatch.

**A2 — board queries attending to spatial detail.** Retain four tokens per square as keys and
values (256 in total), with a small within-crop position embedding. Use 64 square queries,
initialized from the local square descriptors, to cross-attend to these spatial tokens. Produce
one correction per square. Keep the local branch and head dimensions as close to the baseline
as possible. Add a small local token-mixing stage only as a later ablation, not in the first arm.

This avoids immediately doing full self-attention over 256 tokens. At equal width/head count,
64x256 has four times the attention pairs of 64x64; 256x256 has sixteen times. Those ratios are
not end-to-end latency predictions: measure projections, feed-forward work and export overhead.

Success evidence: fewer identity confusions across held-out recording groups, with consistent
paired-seed gains. If A1 matches A2, prefer the simpler/faster model. If neither beats the baseline,
record the negative result rather than immediately increasing token count or feature resolution.

## Candidate 2: relative spatial relationships

Test this **first on the unmodified 64-token baseline** so it is a clean comparison.
Add a per-head attention-logit bias indexed by `(delta_rank, delta_file)` on the known 8x8 grid.
Offsets range from -7 through 7 on each axis, giving a small 15x15 table per head. Initialize
the bias to zero. Implement through an exportable explicit attention path if necessary; validate
equivalence of the zero-bias path against the baseline before training.

Hypothesis: knowing which fields are neighbors helps interpret overlap, occlusion and local
context. This is distinct from learning an absolute e1/d8 identity. Relative positions still
permit dataset shortcuts; test varied legal positions and unseen sessions. Preserve consistent
position indexing under every enabled board augmentation, and distinguish board coordinates
from camera-space directions. Do not infer visual adjacency solely from an unverified orientation.

The existing comment claiming a large loss from positional encoding is not sufficient evidence
to reject this arm; locate an actual comparable experiment before relying on that claim.

## Candidate 3: learn when to use context

Current behavior is `local_logits + context_delta`. Test a bounded, learned per-square gate:

    identity_logits = local_logits + sigmoid(gate(local_features, context_features)) * identity_delta

Keep the coverage path unchanged for the first experiment: coverage is a regression task and
must not silently inherit an identity-confidence heuristic. Keep zero-initialized residual output
and a finite gate bias; verify gradient flow rather than zero-initializing every factor in a
multiplicative path. Do not use a hard argmax or an uncalibrated confidence threshold as the gate.

Hypothesis: the board should help ambiguous local evidence without overriding clear observations.
Measure confident errors and unusual-but-valid positions, not just overall accuracy. Do not feed
ground-truth FEN, expected piece identities or future frames to the inference model.

## Later option: teacher-to-student distillation

This changes training, not necessarily the shipped architecture. Use a larger vision model only
if it first demonstrates better development-set performance. Train a small student with the
existing ground-truth loss plus a temperature-scaled identity distillation term. Keep coverage
supervision separate initially. Compare against the same student trained without distillation.

Teacher and student must use the same permitted training split. Cache teacher outputs in bounded
chunks if useful; ensure targets correspond to the exact transformed input (especially geometric
or color-changing augmentation). Never use final-test labels or final-test teacher predictions as
training data. A teacher run or checkpoint ensemble is not automatically a better teacher.

Do not begin with MoE, recurrent refinement, wholesale normalization/activation changes or a large
pretraining project. They remain possible later, but add moving parts without a demonstrated
connection to the current errors. Masked visual pretraining is a separate future option if diverse
unlabeled recordings and an observed transfer-learning bottleneck justify it.

## Exploration protocol

1. **Freeze the comparison.** Choose one dataset generation, 128 px input, identical source-group
   splits and a fixed recipe. The preferred fraction-0.35/cap-3 recipe needs a matching baseline.
   Do not launch all candidates at once. Inventory completed and active runs first.
2. **Run cheap engineering checks.** Shapes, square ordering, finite forward/backward results,
   baseline checkpoint loading, bounded host memory, ONNX export and numerical agreement. Use
   a tiny fixture for these, not a full-corpus compile attempt. Verify loss reduction/gradient
   flow; do not rank architectures by a few early epochs.
3. **Measure deployment cost early.** Compare with the baseline on the same phone/backend and
   input shape. Record warm median and tail latency, peak RAM/VRAM, parameters and exported size.
   MAC count alone is insufficient. Establish an acceptable latency budget from the actual tracker;
   until that is known, report the accuracy/latency tradeoff rather than inventing an acceptance cap.
4. **First accuracy round: explicit-attention baseline versus R1**, three paired seeds and complete
   schedules. Follow the revised research shortlist above for subsequent choices; A1/A2 and relative
   position bias remain controlled alternatives. Existing XL-head results provide a capacity control
   only if recipe, input and evaluated rows match.
5. **Combine only supported changes.** For two promising changes, compare baseline, each alone,
   and the combination; do not assume gains add. Avoid an unrestricted Cartesian sweep.
6. **Confirm finalists with two additional seeds** and independent recording groups. Development
   results drive selection; keep the final test set unopened until the rule and checkpoint are fixed.
   Bootstrap paired differences by independent recording group, not individual correlated crops.
   Report seed variability separately. If recording groups are too few, state that uncertainty
   cannot be estimated reliably and identify what additional recordings are needed.
7. **Final evaluation uses a real frozen export.** Tail means rank training recipes, but do not
   represent a deployable checkpoint. Check PyTorch/ONNX agreement, coverage behavior, actual
   phone runtime and Kotlin replay phantom/veto regressions before recommending replacement.

Proposed practical target: at least **25% relative reduction in identity errors** versus the
matched baseline, with a paired improvement interval above zero and no unacceptable degradation
of coverage/tracker behavior. If baseline accuracy were independently confirmed at 98.60%, the
point target would be 98.95%. Recompute from the actual baseline; these are not guaranteed scores.
Predeclare thresholds and analysis before examining final-test outcomes.

## Automation and safe operation

Use a bounded experiment manifest and the existing runner/evaluator wherever possible. Persist
code revision, actual architecture configuration, parameter counts, seed, dataset fingerprints,
effective I/O policy and checkpoint-selection rule. Store each new architecture under a distinct
identifier; do not silently change the baseline implementation or overwrite old results.

One heavy process at a time. Keep `--low-memory --ram-reserve-gb 4` and validate that separate
evaluation commands also use a conservative loader policy. Stop the queue on memory pressure,
crashes, invalid data or non-finite results; preserve checkpoints and logs. Inspect current code
because another contributor may have changed it since this handoff was written.

Do not enable accuracy-based ASHA/Hyperband pruning by default. The repository's retrospective
watchdog experiment would have eliminated eventual winners. Validate any proposed pruning rule
on completed, comparable learning curves first. An incomplete run is ineligible for final ranking.

Automatically produce a short report per arm: complete/failed status, matched-baseline deltas,
per-class/per-session errors, uncertainty, memory, latency and representative failure groups.
Deduplicate nearby frames. Manual inspection should be limited to ambiguous labels or geometry;
never automatically overwrite FEN-derived labels just because a model disagrees.

Deliver code/config, meaningful regression tests, the required repository checks, a reproducible
comparison report and an explicit keep/reject/inconclusive decision. Do not present a hypothesis
as the measured reason for a win or loss. Do not expand the experiment budget silently.

## Foundational references (supplementary to the recent shortlist)

These motivate transferable techniques, not predicted gains for this chess dataset:

* [Swin Transformer](https://arxiv.org/abs/2103.14030): local/hierarchical visual attention and
  relative position bias. A1/A2 above are project-specific proposals, not a reproduction of Swin.
* [DeiT](https://arxiv.org/abs/2012.12877): teacher/student distillation in vision.
* [Masked Autoencoders](https://arxiv.org/abs/2111.06377): masked visual pretraining, a later option.

The contextual gate is a proposed ablation for this residual model, not a claim about proprietary
GPT internals. No undocumented GPT architecture assumptions are required for this programme.
