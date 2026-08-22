# Cross-labeling — what the literature says about the two-halves audit

> Written 2026-08-15 for the plan in `TODO.md` ("Datensatz-Qualität per Zwei-Hälften-Kreuztest"):
> split the corpus into two session halves, train one model per half, let each model score the
> other half, and turn model-vs-label disagreements into re-labeling flags.
>
> **Every source below was retrieved on 2026-08-15.** Where a paper's body was read, the entry says
> which section or table. Where a claim is mine and not in a paper, it is marked *(inference)*.
> Numbers quoted from papers are the papers' numbers, not measurements on this corpus — nothing in
> here has been run against `data/`.

---

## 0. Short answer

**Yes, the method is established — but not in the shape the plan states it.** Three changes, and one
limit that no change fixes:

1. **Two folds is the weakest usable setting, not the canonical one.** The canonical version is
   k-fold out-of-fold prediction with k = 4 (Northcutt et al.) or 5 (cleanlab's default). At k = 2
   each model trains on half the corpus and every extra model error becomes a false flag.
2. **Argmax disagreement is the baseline the field measured and then beat.** Confident learning's
   per-class thresholds raised precision from 56 % to 65–70 % over argmax disagreement on CIFAR-10
   at 20 % noise (Northcutt et al. 2021, Table 4). The `probs` the proposer already stores are
   enough to do it right.
3. **Split by session is correct and the literature backs it** — but it buys non-circularity at the
   price of domain shift, and the flags will contain that shift.

The limit no fold count fixes: the method assumes label noise depends on the **class**, not on the
**image** (Angluin & Laird's class-conditional noise process, the stated assumption of confident
learning). A mis-set quad is the opposite of that — it is image-dependent, session-correlated, and
*learnable*. Where a systematic error sits in **one** session, session-grouped folds will light it
up brilliantly. Where the same error runs through **all** sessions — same camera, same lighting,
same quad drift — both halves learn it and neither flags it. The audit cannot see its own blind
spot, and this corpus's correlated sessions are exactly the situation where that matters.

Expect roughly **half your flags to be false alarms** — that is the measured rate when confident
learning's flags met human validators on ten benchmark datasets (Northcutt, Athalye & Mueller 2021).

---

## 1. Is this established, and under what names?

**Yes, under at least four names, and one of them is the two-halves split literally.**

<a id="brodley-1999"></a>
**Identifying Mislabeled Training Data** · Carla E. Brodley, Mark A. Friedl · 1999 ·
JAIR 11:131–167 · [arXiv:1106.0219](https://arxiv.org/abs/1106.0219)

The ancestor. Learning algorithms are used as *noise filters* for the training data: single-algorithm
filter, **majority vote filter**, **consensus filter**. The abstract reports filtering significantly
improves classification accuracy "for noise levels up to 30 percent". §3.3 defines the two detection
errors that any flagging scheme has: **E1**, a correct instance tagged as mislabeled and discarded;
**E2**, a mislabeled instance tagged as correct. Consensus filters are conservative (fewer E1, more
E2 retained); majority filters detect more bad data at the cost of throwing away good data — the
paper's own recommendation is consensus when data is scarce, majority when data is abundant.
*Body read: §3.2 (filter types), §3.3 (E1/E2), §5 (noise-level tables).*

<a id="northcutt-2021-cl"></a>
**Confident Learning: Estimating Uncertainty in Dataset Labels** · Curtis G. Northcutt, Lu Jiang,
Isaac L. Chuang · 2021 · JAIR 70:1373–1411 · [arXiv:1911.00068](https://arxiv.org/abs/1911.00068)

The canonical modern version, and the one to copy. Its shape:

- **Out-of-sample predicted probabilities from k-fold cross-validation.** The paper is explicit that
  k is the method's only practical hyper-parameter and that it fixes **k = 4** across all
  cross-validation experiments ("in our paper k = 4 is fixed in the experiments using
  cross-validation"; §5: "we compute out-of-sample predicted probabilities … using four-fold
  cross-validation").
- **Per-class thresholds, not argmax.** The threshold `t_j` is the *expected (average)
  self-confidence for each class*: the mean of `p̂(ỹ=j; x)` over the examples whose given label is
  `j` (Eqn. 2). An example labeled `i` is counted in bin `(i, j)` only when `p̂(ỹ=j; x) ≥ t_j`
  (Eqn. 1). The paper's stated reason is robustness to (1) heterogeneous class probability
  distributions and (2) class imbalance — if the model is overconfident about class `i`, `t_i` rises
  with it.
- **The confident joint** `C_ỹ,y*`, a class × class count matrix, calibrated into an estimate of the
  joint distribution of noisy and true labels.
- **Five pruning methods**: the argmax baseline `C_confusion`, the confident joint `C_ỹ,y*`
  (the default: "we use CL:C_ỹ,y* because it matches the conditions of Thm. 2 exactly"), prune-by-class
  (PBC), prune-by-noise-rate (PBNR), and their intersection C+NR.
- **Ranking** the found errors by the **normalized margin** `p̂(ỹ=i) − max_{j≠i} p̂(ỹ=j)`.

The measured cost of skipping the thresholds (Table 4, CIFAR-10, 20 % noise, sparsity 0.0):

| method | precision | recall |
|---|---|---|
| `C_confusion` (argmax disagreement) | 56 % | 98 % |
| `C_ỹ,y*` (thresholded confident joint) | 67 % | 86 % |
| PBNR | 65 % | 93 % |

*Body read: §2 (assumptions), §3.1 (Eqns. 1–2, thresholds), §3.2 (five methods), §4 (Thm. 2), §5
(fold count, Tables 4–5).*

<a id="chen-2019"></a>
**Understanding and Utilizing Deep Neural Networks Trained with Noisy Labels** · Pengfei Chen,
Benben Liao, Guangyong Chen, Shengyu Zhang · ICML 2019 ·
[code + paper](https://github.com/chenpf1025/noisy_label_understanding_utilizing)

**This is the plan, published.** Their INCV ("Iterative Noisy Cross-Validation") splits the noisy
dataset into two halves, trains on one, tests on the other, and treats agreement as clean /
disagreement as noisy — then *iterates*, growing the clean set each round. Northcutt et al. discuss
INCV as their nearest relative and name its weakness (§7, "Comparison of the INCV Method and
Confident Learning"): INCV finds errors by argmax — "any example with a different given label than
its argmax prediction is considered a label error" — which "fails to properly count errors for class
imbalance or when a model is more confident … for certain class than others". So the two-halves
design is not exotic; the field's critique of it is specifically the argmax part, not the halving.

<a id="han-2018"></a>
**Co-teaching: Robust Training of Deep Neural Networks with Extremely Noisy Labels** · Bo Han,
Quanming Yao, Xingrui Yu, Gang Niu, Miao Xu, Weihua Hu, Ivor Tsang, Masashi Sugiyama · NeurIPS 2018 ·
[proceedings](https://papers.nips.cc/paper/8072-co-teaching-robust-training-of-deep-neural-networks-with-extremely-noisy-labels)

Two networks trained in tandem, each feeding its peer the small-loss (probably clean) examples of
each mini-batch. Related: Yu et al. 2019, *How does disagreement help generalization against label
corruption?*. This is the disagreement family, but note the difference from the plan: co-teaching
uses disagreement **during training to avoid noise**, not afterwards to produce a human worklist.
It does not give you flags. *Abstract and secondary summaries only.*

<a id="northcutt-2021-pervasive"></a>
**Pervasive Label Errors in Test Sets Destabilize Machine Learning Benchmarks** · Curtis G.
Northcutt, Anish Athalye, Jonas Mueller · NeurIPS 2021 Datasets & Benchmarks ·
[arXiv:2103.14749](https://arxiv.org/abs/2103.14749)

The audit at scale, and the source of the only good precision number in the literature: candidates
flagged by confident learning were sent to crowd workers, and **51 % of the algorithmically-flagged
candidates were confirmed as genuinely mislabeled**, averaged across ten datasets. Test sets carry
at least 3.3 % errors on average; ImageNet's validation set at least 6 %. *Abstract only.*

<a id="peters-2023"></a>
**Generalizable Error Modeling for Human Data Annotation** · Heinrich Peters, Alireza Hashemi,
James Rae · 2023 · [arXiv:2310.05286](https://arxiv.org/abs/2310.05286)

The industry version of the same loop, and the closest thing to a "cross-training audit" citation: a
model predicts which annotations are wrong, the audit queue is sorted by that prediction. Reported
detector quality is modest (AUC 0.65–0.75) and the payoff is stated as throughput, not certainty —
"40 % efficiency gains" in corrected errors per audited task for one application. *Abstract only.*

**Canonical form, summarised:** k = 4–5 out-of-fold, calibrated **per-class** thresholds rather than
argmax, ranking by normalized margin, and a human pass over the ranked list. Two folds and raw
argmax are both the *weak end* of every axis the field has measured.

---

## 2. Known limits

### 2.1 The assumption this corpus violates

Confident learning states its assumption plainly (§2, *Assumptions*): a **class-conditional**
classification noise process (Angluin & Laird 1988) maps the true label to the observed one, "such
that every label in class j may be independently mislabeled as class i with probability
p(ỹ=i|y*=j)" — noise "depending only on the latent true class, **not the data**"
([Northcutt et al. 2021](https://arxiv.org/abs/1911.00068), §1 and §2).

This corpus's four named noise sources are not that. A wrong quad alignment mislabels crops as a
function of **where they are in the image**; a hand over a square mislabels as a function of **what
the pixels contain**; a transposed bridge mislabels as a function of **which session and which
ply**. All are instance-dependent.

- **Beyond Class-Conditional Assumption: A Primary Attempt to Combat Instance-Dependent Label
  Noise** · Chen et al. · AAAI 2021 · [arXiv:2012.05458](https://arxiv.org/abs/2012.05458) — argues
  from hypothesis testing that noise in real datasets is unlikely to be class-conditional, and that
  the CCN assumption must be gone beyond. *Abstract and secondary summary only.*

The practical consequence is not that the method returns garbage — it is that its **guarantees stop
applying** and its recall becomes unknown. It still flags what the model disagrees with; it no
longer estimates *how much* it missed. *(inference, from the assumption above)*

### 2.2 Both halves blind the same way — named in 1999, still true

Brodley & Friedl saw this and wrote it down (§3.2):

> "learning from noisy data is difficult because it is hard to distinguish between noise and
> exceptions, especially if the noise is systematic. Ideally, the biases of at least one of the
> learning algorithms will enable it to learn the exception."

Their filters were built from **different learning algorithms** (decision tree, linear machine,
k-NN) precisely so the biases would not coincide. The two-halves plan uses **the same architecture,
the same preprocessing, the same camera, the same lighting** on both sides. That is a consensus of
clones: it satisfies non-circularity of *data* while leaving circularity of *bias* fully intact.
*(inference — Brodley states the requirement; the mismatch with this plan is mine.)*

Two more sources sharpen why systematic noise is the hard case:

- **Robustness to Label Noise Depends on the Shape of the Noise Distribution in Feature Space** ·
  Diane Oyen, Michal Kucer, Nick Hengartner, Har Simrat Singh · 2022 ·
  [arXiv:2206.01106](https://arxiv.org/abs/2206.01106) — uniform, feature-independent noise is
  survivable up to roughly (c−1)/c of samples, but noise **concentrated near the decision boundary**
  degrades classification "even at a small scale of noise". Shape beats scale. *Abstract only.*
- **Deep Learning is Robust to Massive Label Noise** · David Rolnick, Andreas Veit, Serge Belongie,
  Nir Shavit · 2017 · [arXiv:1705.10694](https://arxiv.org/abs/1705.10694) — the flip side, and the
  reason the plan works at all for *random* noise: with 100 randomly-labeled examples diluting each
  clean one, MNIST test accuracy stays above 90 %. Random noise gets averaged away, so the
  out-of-fold model still predicts the true class and the disagreement is a real flag.
  *Abstract only.*

Read together: **random label noise is exactly what this method finds, and systematic label noise is
exactly what it learns.** *(inference from the two above.)*

The most instructive precedent is ImageNet's own systematic errors:

- **From ImageNet to Image Classification: Contextualizing Progress on Benchmarks** · Dimitris
  Tsipras, Shibani Santurkar, Logan Engstrom, Andrew Ilyas, Aleksander Mądry · ICML 2020 ·
  [proceedings](https://proceedings.mlr.press/v119/tsipras20a.html) — systematic annotation issues
  pervade ImageNet and trace back to **design choices in the collection pipeline** (annotators
  validated one candidate label instead of classifying); over a fifth of images contain objects of
  multiple classes. These errors were not found by models disagreeing with labels — models
  *exploited* them. *Abstract and gradientscience summary only.*

A mis-set quad is a design-choice error of exactly that family.

### 2.3 Noise-rate ceilings

- Brodley & Friedl: filtering "significantly improves classification accuracy for noise levels up to
  30 percent"; their §5 tables show that at **40 % noise filtering ceases to improve accuracy**,
  because there is no longer enough clean data to build an accurate filter.
- Confident learning's Theorem 2 (per-example robustness) requires "each diagonal entry of Q_ỹ|y*
  maximizes its row" — in words, for every class the **correct label must still be the most likely
  observed label**. Past that point the confident joint's diagonal is no longer the diagonal.

Both ceilings are far above any plausible rate for FEN-derived labels, so this is a non-issue here
unless one session is catastrophically misaligned — in which case that *session* exceeds the ceiling
locally even if the corpus does not. *(inference)*

### 2.4 Low-prevalence classes (`occluded`)

The literature's position is that thresholding **helps** imbalance, not that it solves scarcity:

- Northcutt et al. §3.1 and Thm. 2 claim robustness to class imbalance, and §5.3 demonstrates it on
  Amazon Reviews with a 9 % / 12 % / 79 % prior. But that is imbalance in *proportion*, with millions
  of examples per class.
- cleanlab exposes `min_examples_per_class` (default 1) in `find_label_issues`, described as a floor
  "to avoid deleting excessive data from rare classes when pruning"
  ([cleanlab.filter docs](https://docs.cleanlab.ai/stable/cleanlab/filter.html)).

The threshold `t_j` is an **average over the examples labeled j**. For a class with few examples in
a fold, that average is itself a noisy statistic, and it is estimated from the very labels being
audited. *(inference — the formula is the paper's, the small-sample consequence is mine.)*

For this project there is a harder, non-statistical version of the same problem, already recorded in
`CLAUDE.md`: models without an `occluded` head return `pOccluded = 0.0`. Such a half-model cannot
flag a single `occluded` label, in either direction, at any threshold.

### 2.5 Calibration

CL's thresholds are explicitly framed as "a form of calibration" (§3.1, citing Elkan 2001 and
Hendrycks & Gimpel 2017), introduced because neural networks are overconfident (the paper cites Guo
et al. 2017 for that). So the requirement is not "the model must be calibrated" but "you must not use
raw argmax on an uncalibrated model" — the per-class threshold absorbs per-class over-confidence.
What Thm. 2 still requires is that each example's probability error stay inside the gap between the
ideal probability and the threshold; the paper's worked example allows errors of ±0.4 and ±0.1 in
its two classes. Large, *class-correlated* probability error is tolerated; large, *example-specific*
probability error is not.

### 2.6 Flag precision, i.e. the re-labeling budget

The one measured, real-world number is **51 % of flags confirmed** by human validators across ten
datasets ([Northcutt, Athalye & Mueller 2021](https://arxiv.org/abs/2103.14749)). CIFAR-10 precision
in the controlled setting was 56–70 % depending on method (Table 4 above). Peters et al. 2023 report
their industrial detector at AUC 0.65–0.75 with a 40 % efficiency gain over unsorted auditing.

Plan for **one wasted human decision per genuine error found**, and treat anything better than that
as a pleasant surprise. *(inference from the 51 % figure.)*

---

## 3. Practical guidance

### 3.1 Fold count: 2 is defensible, 4–5 is the default, and the difference is real

- Northcutt et al. fix **k = 4** and tune nothing.
- cleanlab's `CleanLearning` defaults to **`cv_n_folds=5`**
  ([docs](https://docs.cleanlab.ai/stable/cleanlab/classification.html)); the docs give no explicit
  trade-off discussion for the parameter.
- Kohavi's classic study recommends **ten-fold stratified** CV for model selection, "even if
  computation power allows using more folds" · Ron Kohavi · 1995 · IJCAI-14, 1137–1145 ·
  [ACM DL](https://dl.acm.org/doi/10.5555/1643031.1643047). *Different task* — accuracy estimation,
  not label-error detection — so treat it as evidence on the bias of small k, not as a
  recommendation for this pipeline.

The mechanism that matters here: at k = 2 each model trains on **half** the corpus, and every point
of accuracy it loses to data starvation arrives as a false flag on the other half. At k = 5 each
model sees 80 %. There is no paper measuring flag precision as a function of k that I found, so the
strength of the effect on this corpus is unmeasured. *(inference)*

### 3.2 Split by session — yes, and the literature has the argument on both sides

- **The need to approximate the use-case in clinical machine learning** · Sohrab Saeb, Luca Lonini,
  Arun Jayaraman, David C. Mohr, Konrad P. Kording · GigaScience 6(5), 2017, gix019 ·
  [oup](https://academic.oup.com/gigascience/article/6/5/gix019/3071704) — record-wise CV lets a
  model exploit the identity of the subject and reports unrealistically high accuracy; subject-wise
  CV is what mirrors deployment on new subjects. *Title/authors confirmed at the DOI; argument read
  through the perspective piece below, which quotes it.*
- **Using and understanding cross-validation strategies. Perspectives on Saeb et al.** · Max A.
  Little, Gael Varoquaux, Sohrab Saeb, Luca Lonini, Arun Jayaraman, David C. Mohr, Konrad P. Kording
  · GigaScience 6(5), 2017 ·
  [oup](https://academic.oup.com/gigascience/article/6/5/gix020/3073663) — the counterpoint, worth
  reading before treating group-wise folds as automatically correct. Little argues subject-wise CV
  "does not produce a consistent estimate of the out-of-sample prediction error" under identity
  clustering, and that mandating it "could make things worse" by introducing a train/test
  distribution mismatch. Varoquaux: whether a clustering effect is a confound "depends on the
  scientific or clinical question". All three parties agree on one thing — the CV scheme must match
  the use case. *Full perspective piece read.*

For this project the two goals point the same way: session-grouped folds are **required** for
non-circularity (a model must never have trained on a crop from a session it scores) and they
**match the use case** (the tracker meets unseen sessions). But Little's objection lands as a
warning about what the flags will contain: with session-grouped folds, every flag is a mix of *label
error* and *domain shift between sessions*. A session shot under different light will draw flags for
being different, not for being wrong. *(inference from Little's argument.)*

### 3.3 Scores beyond disagreement

In descending order of what the literature supports:

1. **Per-class threshold + confident joint** (`C_ỹ,y*`) — CL's own default, Eqns. 1–2 above.
2. **Normalized margin** `p̂(given) − max_{other} p̂` for **ranking** the found errors; CL says
   ordering by it "works well" (§3.2, crediting Wei et al. 2018).
3. **Self-confidence** `p̂(given)` and **confidence-weighted entropy** `entropy(P)/p̂(given)` — the
   three scores cleanlab ships ([rank docs](https://docs.cleanlab.ai/stable/cleanlab/rank.html)).
   Their guidance: `normalized_margin` is better for "class conditional label errors, i.e. examples
   for which another label is appropriate but the given label is not"; `self_confidence` is better
   for examples that belong to **no** class or to two — which is the `occluded` situation.
4. **Argmax disagreement** — the `C_confusion` baseline. Highest recall, lowest precision.

One recent benchmark disagrees with part of the orthodoxy and should be read before over-engineering:
**Benchmarking noisy label detection methods** · Henrique Pickler, Jorge K. S. Kamassury, Danilo
Silva · 2025 · [arXiv:2510.16211](https://arxiv.org/abs/2510.16211) — decomposes detectors into
agreement function × aggregation × in-sample vs out-of-sample information, and reports that
**in-sample** gathering with average-probability aggregation and a **logit margin** agreement
function won across most of their scenarios. They also propose the right metric for this exercise:
false negative rate at an operating point equal to the dataset's noise rate. *Abstract only — the
in-sample result contradicts the out-of-fold orthodoxy above and I have not read their setup, so
treat it as a reason to measure rather than a reason to change the design.*

### 3.4 Aggregate the flags before showing them to a human

CL's Table 5 uses the largest off-diagonal entries of the confident joint for "ontological issue
discovery" on ImageNet — it recovers `projectile`↔`missile`, `tub`↔`bathtub`, and a genuinely
duplicated class. The lesson transfers: the **structure** of the flags carries information the
individual flags do not. A mis-set quad should announce itself as a dense, spatially coherent block
of flags in one session, not as 40 unrelated crops. *(inference — the technique is the paper's, the
quad application is mine.)*

---

## 4. The human loop after flagging

The literature is thinner here, and none of it is prescriptive. What exists:

- **Are we done with ImageNet?** · Lucas Beyer, Olivier J. Hénaff, Alexander Kolesnikov, Xiaohua
  Zhai, Aäron van den Oord · 2020 · [arXiv:2006.07159](https://arxiv.org/abs/2006.07159) — the most
  directly copyable protocol. They picked 6 strong models, **hand-annotated only the images where
  those models disagreed**, and **discarded the 3 163 images where the human labelers themselves
  disagreed**. The second half is the part usually skipped: human disagreement is a signal, and the
  answer to it was to remove the example, not to force a label. Their conclusion also bears on this
  project's premise — after re-annotation, the original labels were no longer the best predictors of
  the independently collected ones. *Abstract and secondary summaries only.*
- **Northcutt, Athalye & Mueller 2021** — flags went to crowd validation before anything was
  believed; 51 % survived. The takeaway is procedural: **measure your own flag precision on the
  first batch** instead of assuming it.
- **Pickler et al. 2025** propose FNR-at-noise-rate as the evaluation metric for detectors. You
  cannot compute an FNR from flagged items alone; it requires labeled ground truth on items the
  detector did **not** flag. *(inference: that means a random spot-check of unflagged crops is not
  optional if you want to know your recall.)*
- **Brodley & Friedl 1999** §3.3 gives the vocabulary to report results in: E1 (good data thrown
  away) and E2 (bad data retained). A flag review measures E1 directly; only a random audit measures
  E2.

No source I found prescribes a sample size for the unflagged spot-check.

---

## 5. Recommendation for this corpus

Mapping onto the plan in `TODO.md`. Every item is a judgement call informed by the above, not a
quotation from it.

1. **Keep the cross-testing spine, drop the "two".** Run **k = 4 or 5 session-grouped folds**, not
   two halves. The non-circularity property the plan is built on is preserved exactly — no model
   ever scores a session it trained on — and each model trains on 75–80 % of the corpus instead of
   50 %. `check_not_circular` already sees through the variant prefixes, so the bookkeeping cost is
   the fold assignment, nothing more. If compute forces two folds, run two, but expect the extra
   false flags and do not read the flag rate as a noise rate.
2. **Group by session, and record which flags are shift.** Sessions are the grouping unit; the
   literature's subject-wise argument is the same argument. But add one diagnostic before the human
   queue: per-session flag density. A session whose flag rate is far above the corpus median is
   either misaligned (a geometry bug worth fixing at the source, once, for all 64 crops per frame)
   or merely different (domain shift, and the flags are noise). Those two look identical crop by
   crop and completely different in aggregate.
3. **Score with per-class thresholds, not argmax.** `probs` are already carried on proposals. Compute
   `t_j` as the mean self-confidence per class within each scoring fold, build the confident joint,
   and rank the flags by normalized margin. This is a few dozen lines over what the plan already
   stores, and the measured gain over argmax is roughly +10 pp precision at −10 pp recall.
4. **Budget one wasted decision per real error.** At 51 % precision, a re-labeling queue of *n*
   flags yields about *n*/2 corrections. Size the first batch small enough to measure that ratio on
   this corpus — a few hundred flags — before committing a sitting to the full queue. The labeling
   stream in `docs/labeling-ux/CONCEPT.md` is the right surface: flags are a stream, and the flag's
   rank is its sort key.
5. **Handle `occluded` separately or not at all.** Any half-model without the `occluded` head has
   `pOccluded = 0.0` and is structurally incapable of auditing that class. Either every fold model
   carries the 14-class head, or `occluded` is excluded from the audit and stated as excluded.
   A per-class threshold estimated from a handful of examples is a weak instrument in any case.
6. **Spot-check the unflagged.** Draw a random sample of *unflagged* crops per class, re-label them
   blind, and report the miss rate next to the hit rate. Without it the audit reports E1 only and the
   most dangerous errors — the systematic ones both models learned — are invisible by construction.

### The two limits most likely to bite this corpus

- **Correlated sessions produce shared blindness.** Same camera, same room, same quad-fitting code.
  A geometry error present in *one* session will be found; the same error present in *all* sessions
  is learned by every fold model and produces **zero flags**. The audit will come back clean and
  that will not mean the corpus is clean. The only instrument that sees this class of error is one
  the audit does not contain: a ground truth built by a different mechanism than the one under
  audit — a handful of hand-placed boards, or the geometry re-derived independently and compared.
  *(inference, from Brodley §3.2 and Tsipras et al. 2020.)*
- **`occluded` is both rare and the class the project most needs audited.** It is the class whose
  labels came from hand-painting rather than from FEN, the class the 14er model is currently too
  aggressive on, and the class where per-class thresholds are least reliable. Everything the audit
  says about `wP`..`bK` will be more trustworthy than what it says about `occluded`, and the project
  needs the reverse.

---

## 6. Where the literature contradicts the plan

Stated plainly, so it is not lost in the recommendations:

- **"Two halves" is the configuration the field moved away from.** INCV halves and then *iterates*
  to recover what one pass misses; confident learning does not halve at all, it uses k = 4. The plan
  as written picks the weakest point of both.
- **"Disagreement is the flag" is the baseline, not the method.** Northcutt et al. measured argmax
  disagreement (`C_confusion`) explicitly and built the thresholded confident joint because argmax
  mis-counts under class imbalance and per-class over-confidence — both of which this corpus has.
- **"Never circular by construction" is true of the data and false of the bias.** Non-circularity of
  the training split does not deliver independence of errors; Brodley & Friedl built their filters
  from *different algorithms* for exactly this reason. Two identical architectures on two halves of
  one camera's output is one detector run twice.
- **The method's stated assumption does not hold here.** Class-conditional noise is what confident
  learning assumes; quad misalignment, hands, and transposed bridges are instance-dependent. The
  audit remains useful — it will find real errors — but it cannot bound what it missed, and its
  clean bill of health is not evidence.

---

## 7. Narrowing a foreign proposer (measured 2026-08-21)

The first corpus-wide audit did not use folds. It used the composite pretrain
`comp13-occ-bn-lr1e2-bs512` — the only model on disk that trained on **none** of the 20
recordings, so `check_not_circular` passes for every one of them. It read all 470 016 cells
(`realgames model-read`, ~35 min on the GPU).

Unnarrowed it produced **84 800 flags, 18.0 % of the corpus**. That number is not a measure of
label quality; it is a measure of what the proposer cannot do. Two cuts, both now options on
`realgames audit-flags`:

| | flags | share |
|---|---:|---:|
| everything (`--all --any-coverage`) | 84 800 | 18.0 % |
| `--occupancy` | 18 260 | 3.9 % |
| `--occupancy --visible` | **4 359** | **0.9 %** |

**`--occupancy` — 72 % of the flags disputed the piece TYPE at the right colour** (`wP→wB`,
`bN→bP`, `bB→bP`), concentrated on the bishop and knight home squares. A model trained on
rendered pieces has never seen this physical set's shapes. Occupancy is a question the picture
answers; type, from this proposer, is the proposer's own gap. This is the concrete form of §6's
"one detector run twice": a foreign proposer trades circularity for a domain gap, and the gap has
to be cut out by hand because Eqn. 2 will not do it. It does the opposite — `t_j` is the mean
self-confidence of the cells labelled `j`, so a class the model reads *badly* gets a *low*
threshold and therefore attracts more flags. `empty → piece` rose from 2.3 % of the raw argmax
disagreements to 14.7 % of the confident-learning flags for exactly this reason.

**`--visible` — 78 % of what remained sat on cells the matte had measured as covered.** Those are
not label questions at all: `OcclusionLoss` masks every cell over `PIECE_VISIBLE_MAX` out of the
class loss, so the label never reaches a model and a human ruling on it changes nothing. The audit
could not see this because coverage lives in `matte.jsonl` and `model-reads.jsonl` never carried
it; `audit_flags.visible_cells` reads the matte directly.

What survives is worth a human: 4 359 cells on **685 `(session, square)` pairs** — a lifted piece
stays lifted, so one verdict clears 6 cells on average and up to 244 in the largest nest. Split
1 613 `piece → empty` (high precision: of 286 sampled at p ≥ 0.99, 281 were genuine and only 5
showed the piece on a neighbouring square, which rules out a systematic geometry offset) and
2 746 `empty → piece` (mixed: real pieces, hands the matte missed entirely at `coverage 0.0`, and
the model hallucinating on dark squares in shadow).

The three defects behind the `piece → empty` half, from the frame each cell sits on:

| frame says | crop shows | n | what it is |
|---|---|---:|---|
| `occluded` | empty square | 115 | the FEN lags — the piece is already lifted, the matte correctly reports the origin square as barely covered |
| `occluded` | skin | 65 | the matte missed the hand on a frame known to carry one |
| `clean` | empty square | 65 | the FEN is simply wrong |
| `clean` | skin | 41 | `framescan` missed the hand entirely — `coverage 0.0`, the trap CLAUDE.md §1 names |

**282 of those 286 are not named by the row's `unknown_squares`**, which is the gate that exists to
catch a lagging FEN. That gate, not the labels, is the thing to fix.
