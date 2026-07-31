# References — where our claims come from

> The bibliography for the decisions this project encodes in code. A code comment names an
> anchor in this file; the entry here carries the exact title, the authors, the year and the
> identifier. A reference lives in exactly one place, and this is it.
>
> **Every entry below was retrieved and confirmed on 2026-07-31.** Where only the abstract was
> readable, the entry says so. Where a paper's body was read, the entry says which section.
> Nothing is cited from memory. If you add an entry, fetch the source first — a wrong reference
> outlives the person who wrote it, and this repo would carry it forever.
>
> §11 lists the decisions that turned out to have **no** published basis. That list is a
> finding, not a gap to be filled with the nearest plausible paper.

---

## 1. Normalization

<a id="ioffe-2015"></a>
**Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift**
Sergey Ioffe, Christian Szegedy · 2015 · [arXiv:1502.03167](https://arxiv.org/abs/1502.03167)

The original. The abstract claims BN allows higher learning rates and less careful
initialization, acts as a regularizer, and reaches a given accuracy in 14x fewer training steps.
What this project takes from it: nothing but the definition. The mechanism it proposes (internal
covariate shift) is disputed by [Santurkar 2018](#santurkar-2018), and its accuracy claims have
not reproduced here — see `specs/25-normalization-endgame/STATUS.md`.
*Abstract only.*

<a id="wu-2018"></a>
**Group Normalization**
Yuxin Wu, Kaiming He · 2018 · [arXiv:1803.08494](https://arxiv.org/abs/1803.08494)

GN divides channels into groups and computes mean and variance within each group, so its
statistic does not depend on the batch dimension. The abstract reports 10.6 % lower error than
BN at batch size 2, and comparable accuracy at ordinary batch sizes.
What this project takes from it: `training/model.py:_norm_layer` and `_convert_bn_to_gn`.
GN ships. Note what the paper does *not* claim and this project measured separately: GN's
per-sample statistic cannot be folded into the preceding convolution, which is the export cost
documented in `PrimitiveBatchNorm2d`'s docstring, and its per-sample nature turned out to be
load-bearing on this data (`specs/26-cheaper-at-the-same-quality`).
On the group count: the body sets G=32 by default and reports GN performing reasonably well for
every G studied, from 64 down to 2 (Table 3, roughly 0.6 pp spread). At G=1 GN is layer
normalization; at one channel per group it is instance normalization.
*Abstract, plus the body's §Table 3 discussion of G via the ar5iv HTML.*

<a id="bjorck-2018"></a>
**Understanding Batch Normalization**
Johan Bjorck, Carla Gomes, Bart Selman, Kilian Q. Weinberger · 2018 ·
[arXiv:1806.02375](https://arxiv.org/abs/1806.02375)

The abstract states that BN primarily enables training with larger learning rates, and that this
is the cause of the faster convergence and better generalization attributed to it; without
normalization, large gradient updates drive divergence and uncontrolled activation growth, which
is what bounds the usable learning rate.
**This is the paper that puts a question mark on every BN-vs-GN comparison in this repo.** All of
them ran at `lr 3e-4`, a rate inherited from the GroupNorm recipe (§11, and
`specs/31-cite-what-we-rely-on/STATUS.md`). If the paper is right, that setting removes the
benefit being measured. It does not overturn the GroupNorm decision — it means the decision was
never tested at the rate BN would need.
*Abstract only.*

<a id="santurkar-2018"></a>
**How Does Batch Normalization Help Optimization?**
Shibani Santurkar, Dimitris Tsipras, Andrew Ilyas, Aleksander Madry · 2018 ·
[arXiv:1805.11604](https://arxiv.org/abs/1805.11604)

The abstract argues that distributional stability of layer inputs has little to do with BN's
success, and that BN instead makes the optimization landscape significantly smoother, giving more
predictive and stable gradients.
Relevance here: it is why `[ioffe-2015]`'s stated mechanism is not repeated as fact anywhere in
this codebase, and why "BN reduces internal covariate shift" is not a reason to prefer it.
*Abstract only.*

<a id="ulyanov-2016"></a>
**Instance Normalization: The Missing Ingredient for Fast Stylization**
Dmitry Ulyanov, Andrea Vedaldi, Victor Lempitsky · 2016 ·
[arXiv:1607.08022](https://arxiv.org/abs/1607.08022)

Normalizing each sample independently, introduced for style transfer.
Relevance here is purely mechanical and downstream: ONNX has no GroupNorm operator, so the
exporter decomposes GN into `InstanceNormalization` nodes. The 46 `InstanceNormalization` nodes
that NNAPI and QNN break on are this operator. The project does not use instance normalization by
choice; it inherits the op as GroupNorm's export form.
*Abstract only.*

<a id="brock-2021"></a>
**High-Performance Large-Scale Image Recognition Without Normalization**
Andrew Brock, Soham De, Samuel L. Smith, Karen Simonyan · 2021 ·
[arXiv:2102.06171](https://arxiv.org/abs/2102.06171)

Normalizer-free networks with adaptive gradient clipping. The abstract names BN's cost as its
dependence on batch size and the interaction between examples, and reports that earlier
normalizer-free ResNets were often unstable at large learning rates or under strong augmentation.
Relevance here: `--norm none` exists and was measured (`specs/25` phase 02 — 99 graph nodes at
267 phantoms). That run used no adaptive gradient clipping, so it is **not** a test of this
paper's method, and the result should not be read as one.
*Abstract only.*

<a id="li-2016"></a>
**Revisiting Batch Normalization For Practical Domain Adaptation**
Yanghao Li, Naiyan Wang, Jianping Shi, Jiaying Liu, Xiaodi Hou · 2016 ·
[arXiv:1603.04779](https://arxiv.org/abs/1603.04779)

AdaBN: adapt to a new domain by re-estimating the statistics in every BN layer, leaving all
learned parameters untouched. The abstract calls it parameter-free and reports state-of-the-art
domain-adaptation results.
What this project takes from it: `scripts/adabn_recalibrate.py`, which re-estimates
`running_mean`/`running_var` at one deployment resolution. Note the difference in the setting —
the paper adapts across *domains*, this script adapts across *input resolutions* of one domain.
That is an extension of the idea, not something the paper measured.
*Abstract only.*

<a id="chang-2019"></a>
**Domain-Specific Batch Normalization for Unsupervised Domain Adaptation**
Woong-Gi Chang, Tackgeun You, Seonguk Seo, Suha Kwak, Bohyung Han · 2019 ·
[arXiv:1906.03950](https://arxiv.org/abs/1906.03950)

DSBN: separate BN layers per domain, all other parameters shared.
What this project takes from it: the DSBN run in `specs/25-normalization-endgame` (one BN branch
per training scale). Same caveat as AdaBN — the paper's domains are datasets, ours are input
resolutions.
*Abstract only.*

---

## 2. Learning rate, schedules and the optimizer

<a id="loshchilov-2017"></a>
**Decoupled Weight Decay Regularization**
Ilya Loshchilov, Frank Hutter · 2017 · [arXiv:1711.05101](https://arxiv.org/abs/1711.05101)

AdamW. The abstract states that L2 regularization and weight decay are equivalent for SGD but not
for adaptive methods such as Adam, that many Adam implementations conflate them, and that
decoupling them substantially improves Adam's generalization.
What this project takes from it: `torch.optim.AdamW` in `training/train.py`. Note that the
project passes **no** `weight_decay` argument, so it runs at PyTorch's default — the paper's
subject is a hyper-parameter this repo has never chosen (§11).
*Abstract only.*

<a id="loshchilov-2016"></a>
**SGDR: Stochastic Gradient Descent with Warm Restarts**
Ilya Loshchilov, Frank Hutter · 2016 · [arXiv:1608.03983](https://arxiv.org/abs/1608.03983)

The source of the cosine schedule. The abstract describes only the warm-restart technique; the
cosine form is Equation 5 of the body:
`η_t = η_min + ½(η_max − η_min)(1 + cos(π · T_cur / T_i))`, where `T_i` is the total number of
epochs of the current restart period and `T_cur` counts epochs since the last restart.
PyTorch's `CosineAnnealingLR` documentation cites this paper and states that `T_max` is the
maximum number of epochs in a cycle, and that the implementation anneals **without** restarts.
**The consequence for this repo:** `training/train.py` passes `T_max=epochs`, so `T_i` *is* the
run length. A 60-epoch and a 200-epoch run are different optimisation trajectories, not the same
run observed for longer, and a plateau in the last epochs may be the cosine floor rather than
convergence. Nothing in the paper is violated by this — it is simply what `T_max` means.
*Body read (Eq. 5) via the ar5iv HTML; PyTorch documentation read separately.*

<a id="he-2018"></a>
**Bag of Tricks for Image Classification with Convolutional Neural Networks**
Tong He, Zhi Zhang, Hang Zhang, Zhongyue Zhang, Junyuan Xie, Mu Li · 2018 ·
[arXiv:1812.01187](https://arxiv.org/abs/1812.01187)

Section 5.1 gives the cosine schedule in the form most implementations use,
`η_t = ½(1 + cos(π t / T)) η`, and is explicit that **T is the total number of batches** of the
run. It contrasts this with step decay and describes the shape: slow at the start, near-linear in
the middle, slow again at the end.
Relevance here: the second, independent confirmation that the schedule is defined relative to a
run length fixed in advance. The abstract does not mention cosine decay at all.
*Body read (§5.1) via the ar5iv HTML.*

<a id="smith-2015"></a>
**Cyclical Learning Rates for Training Neural Networks**
Leslie N. Smith · 2015 · [arXiv:1506.01186](https://arxiv.org/abs/1506.01186)

The origin of the **LR range test**: the abstract describes estimating the boundary values by
linearly increasing the learning rate over a few epochs and watching where accuracy stops
improving.
This project has never run one. It is the cheapest available answer to "is `3e-4` the right rate
for this recipe" and it costs a few epochs, not a sweep — see
`specs/31-cite-what-we-rely-on/STATUS.md`.
*Abstract only.*

<a id="smith-2018"></a>
**A disciplined approach to neural network hyper-parameters: Part 1 -- learning rate, batch size,
momentum, and weight decay**
Leslie N. Smith · 2018 · [arXiv:1803.09820](https://arxiv.org/abs/1803.09820)

The abstract covers how to raise and lower learning rate and momentum to speed up training, and
states that the optimal weight decay is tightly coupled to the learning rate and momentum.
**Retrieval note for the next person: this paper has no HTML rendering on arXiv — the abs page
serves the abstract and the PDF only, and the PDF does not fetch as text with the tools available
here.** Everything above is from the abstract. Any specific recipe attributed to this paper
(one-cycle, particular numbers) has *not* been verified here.

<a id="defazio-2024"></a>
**The Road Less Scheduled**
Aaron Defazio, Xingyu Alice Yang, Harsh Mehta, Konstantin Mishchenko, Ahmed Khaled,
Ashok Cutkosky · 2024 · [arXiv:2405.15682](https://arxiv.org/abs/2405.15682)

Schedule-Free methods, which need no stopping time `T` specified in advance and add no
hyper-parameter beyond a momentum optimizer's own. Schedule-Free AdamW won the self-tuning track
of the MLCommons 2024 AlgoPerf challenge.
Relevance here: this is the direct answer to the `T_max=epochs` coupling in `[loshchilov-2016]` —
a schedule-free run has no run length baked into its trajectory. Not adopted; see
`[henheik-2025]` before adopting it.
*Abstract only.*

<a id="defazio-2023"></a>
**Learning-Rate-Free Learning by D-Adaptation**
Aaron Defazio, Konstantin Mishchenko · 2023 · [arXiv:2301.07733](https://arxiv.org/abs/2301.07733)

Sets the learning rate automatically, achieving the optimal asymptotic rate for convex Lipschitz
problems with no line search; the abstract reports it matching hand-tuned rates on more than a
dozen problems.
*Abstract only.*

<a id="mishchenko-2023"></a>
**Prodigy: An Expeditiously Adaptive Parameter-Free Learner**
Konstantin Mishchenko, Aaron Defazio · 2023 · [arXiv:2306.06101](https://arxiv.org/abs/2306.06101)

Improves D-Adaptation's estimate of the distance to the solution; the abstract reports test
accuracy close to hand-tuned Adam without a specified learning rate.
*Abstract only.*

<a id="henheik-2025"></a>
**Revisiting Learning Rate Control**
Micha Henheik, Theresa Eimer, Marius Lindauer · 2 July 2025 ·
[arXiv:2507.01724](https://arxiv.org/abs/2507.01724)

Compares learning-rate control approaches — multi-fidelity hyper-parameter optimization, fixed
schedules, and hyper-parameter-free methods. The abstract's conclusion is that these methods often
do very well on selected tasks but **are not reliable across settings**, and that hyper-parameter
optimization becomes less effective as model and task complexity grow.
This is the caveat that keeps `[defazio-2024]`, `[defazio-2023]` and `[mishchenko-2023]` in the
"worth trying, measure it here" category rather than the "known better" one. Read it as: no
method in this section can be adopted on its published reputation; on this corpus the veto metric
decides, as always.
*Abstract only.*

<a id="micikevicius-2017"></a>
**Mixed Precision Training**
Paulius Micikevicius, Sharan Narang, Jonah Alben, Gregory Diamos, Erich Elsen, David Garcia,
Boris Ginsburg, Michael Houston, Oleksii Kuchaiev, Ganesh Venkatesh, Hao Wu · 2017 ·
[arXiv:1710.03740](https://arxiv.org/abs/1710.03740)

Half-precision training with an fp32 master copy of the weights and **loss scaling** to keep small
gradients representable; roughly 2x less memory.
What this project takes from it: `torch.amp.GradScaler` in `training/train.py` (`--no-amp`
disables it). The related trap this project hit independently — a variance reduction in fp16
overflowing to `+inf` — is documented in `model.py:PrimitiveBatchNorm2d.forward`, and is the same
class of problem the paper's fp32 master copy addresses.
*Abstract only.*

---

## 3. Multi-scale training and inference resolution

<a id="redmon-2016"></a>
**YOLO9000: Better, Faster, Stronger**
Joseph Redmon, Ali Farhadi · 2016 · [arXiv:1612.08242](https://arxiv.org/abs/1612.08242)

The multi-scale training section: every 10 batches the network picks a new input size from
multiples of 32 between 320 and 608, which forces it to predict well across input dimensions, so
that one set of weights trades speed against accuracy at inference by choosing a resolution.
This is exactly what `train.py --scales` does — one batch, one randomly drawn size, a
size-agnostic model. The abstract does not mention multi-scale training; the claim above is from
the body.
*Body read via the ar5iv HTML.*

<a id="touvron-2019"></a>
**Fixing the train-test resolution discrepancy**
Hugo Touvron, Andrea Vedaldi, Matthijs Douze, Hervé Jégou · 2019 ·
[arXiv:1906.06423](https://arxiv.org/abs/1906.06423)

"FixRes". The abstract states that standard augmentation creates a discrepancy between the
apparent object size at train and test time, that a *lower* train resolution than test resolution
can improve accuracy, and that fine-tuning at the test resolution fixes the rest.
What this project takes from it: the rule that the deployment resolution must occur during
training. It is why `infer_size` must be one of a run's `scales` — an untrained 80 px cost 133
misses, silently (`docs/data-pipeline.md` §11).
*Abstract only.*

<a id="cai-2019"></a>
**Once-for-All: Train One Network and Specialize it for Efficient Deployment**
Han Cai, Chuang Gan, Tianzhe Wang, Zhekai Zhang, Song Han · 2019 ·
[arXiv:1908.09791](https://arxiv.org/abs/1908.09791)

One network supporting many architectural settings, with sub-networks extracted for a given
device without retraining; the progressive-shrinking algorithm varies depth, width, kernel size
**and resolution**.
Relevance here: the published precedent for "train once, serve at the size the device wants".
This project uses only the resolution axis, and none of OFA's machinery.
*Abstract only.*

<a id="tan-2019"></a>
**EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks**
Mingxing Tan, Quoc V. Le · 2019 · [arXiv:1905.11946](https://arxiv.org/abs/1905.11946)

Compound scaling: depth, width and resolution scaled together by one coefficient.
Relevance here: resolution is a first-class model dimension, not a preprocessing detail — the
premise behind `specs/22-inference-resolution` and `specs/23-resolution-all-the-way-down`. The
project does no compound scaling of its own.
*Abstract only.*

<a id="he-2014"></a>
**Spatial Pyramid Pooling in Deep Convolutional Networks for Visual Recognition**
Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun · 2014 ·
[arXiv:1406.4729](https://arxiv.org/abs/1406.4729)

The abstract argues that the fixed input size CNNs require is artificial and may hurt accuracy,
and introduces a pooling layer producing a fixed-length representation regardless of input size.
What this project takes from it: the reason `AdaptiveAvgPool2d(1)` in
`training/model.py:SmallCNN` makes multi-scale training possible at all. Global average pooling
is the degenerate one-level case of the paper's pyramid.
*Abstract only.*

---

## 4. Class imbalance

<a id="lin-2017"></a>
**Focal Loss for Dense Object Detection**
Tsung-Yi Lin, Priya Goyal, Ross Girshick, Kaiming He, Piotr Dollár · 2017 ·
[arXiv:1708.02002](https://arxiv.org/abs/1708.02002)

Reshapes cross-entropy to down-weight well-classified examples, so training concentrates on a
sparse set of hard ones instead of being overwhelmed by easy negatives. The stated motivation is
extreme foreground-background class imbalance.
What this project takes from it: `training/losses.py:FocalLoss` (`--loss focal`, `--focal-gamma`).
The situation maps closely: after the 14 → 2 collapse most `empty` crops are trivially easy, and
they are the majority class.
*Abstract only.*

<a id="cui-2019"></a>
**Class-Balanced Loss Based on Effective Number of Samples**
Yin Cui, Menglin Jia, Tsung-Yi Lin, Yang Song, Serge Belongie · 2019 ·
[arXiv:1901.05555](https://arxiv.org/abs/1901.05555)

Argues that weighting by raw class frequency over-corrects, because each additional sample of a
class adds less than the last; proposes weighting by an "effective number" `(1 − β^n)/(1 − β)`
instead.
Relevance here: `dataset.compute_class_weights` uses plain inverse frequency, which is precisely
the scheme this paper argues against. That is a deliberate record of a divergence, not an
endorsement — and it compounds with `max_empty_ratio`, since the two act on the same imbalance
(see the pitfalls list in `CLAUDE.md`). No measurement here has compared the two schemes.
*Abstract only.*

<a id="buda-2017"></a>
**A systematic study of the class imbalance problem in convolutional neural networks**
Mateusz Buda, Atsuto Maki, Maciej A. Mazurowski · 2017 ·
[arXiv:1710.05381](https://arxiv.org/abs/1710.05381)

The abstract's conclusions: oversampling dominated in almost all scenarios and should eliminate
the imbalance completely; the best amount of undersampling depends on how extreme the imbalance
is; oversampling does not cause CNNs to overfit; and thresholding should be applied to compensate
for prior class probabilities when overall accuracy is what matters.
Relevance here: `dataset.subsample_classes` does the opposite — it **undersamples** the majority
class (`max_empty_ratio`, `max_class_ratio`). The reason is not accuracy but disk and I/O: the
`empty` class dominates a corpus that is already millions of near-identical crops. The paper's
thresholding point is also unused, and is a live idea for the occupancy reader.
*Abstract only.*

<a id="shrivastava-2016"></a>
**Training Region-based Object Detectors with Online Hard Example Mining**
Abhinav Shrivastava, Abhinav Gupta, Ross Girshick · 2016 ·
[arXiv:1604.03540](https://arxiv.org/abs/1604.03540)

OHEM. The abstract's premise is that detection datasets contain overwhelmingly many easy examples
and few hard ones, and that selecting the hard ones automatically trains better and removes
heuristics.
What this project takes from it: the idea, not the method. `scripts/mine_hard_empty.py` mines
hard `empty` crops **offline**, from a finished model, into a keep-list that survives the empty
cap (`dataset.subsample_classes(priority_paths=…)`). OHEM is *online* — it selects per mini-batch
inside the training loop. The offline variant is older and cruder, and it carries the failure mode
documented in `CLAUDE.md`: a keep-list mined from one model is a hidden variable in the next.
*Abstract only.*

---

## 5. Augmentation, and the shortcuts it defends against

<a id="devries-2017"></a>
**Improved Regularization of Convolutional Neural Networks with Cutout**
Terrance DeVries, Graham W. Taylor · 2017 · [arXiv:1708.04552](https://arxiv.org/abs/1708.04552)

Randomly masking out square regions of the input during training, as a regularizer complementary
to existing augmentation.

<a id="zhong-2017"></a>
**Random Erasing Data Augmentation**
Zhun Zhong, Liang Zheng, Guoliang Kang, Shaozi Li, Yi Yang · 2017 ·
[arXiv:1708.04896](https://arxiv.org/abs/1708.04896)

Erases a random rectangle with random values during training, generating varying levels of
occlusion; the stated benefit is robustness to occlusion, at no learned parameters.

What this project takes from both: `config.AugmentPolicy.erase_p` / `erase_scale`, applied by
`torchvision.transforms.RandomErasing` in `torch_data.build_transform`. The stated local reason —
forcing the model off the board and onto the piece — is this project's own argument; neither
abstract makes a claim about background shortcuts specifically.
*Both abstract only.*

<a id="geirhos-2020"></a>
**Shortcut Learning in Deep Neural Networks**
Robert Geirhos, Jörn-Henrik Jacobsen, Claudio Michaelis, Richard Zemel, Wieland Brendel,
Matthias Bethge, Felix A. Wichmann · 2020 · [arXiv:2004.07780](https://arxiv.org/abs/2004.07780)

Shortcuts are decision rules that do well on a benchmark and fail to transfer to harder testing
conditions. The paper is a framing and a set of recommendations, not a method.
What this project takes from it: the name and the diagnosis for the measured failure where a
knight's prediction relied 8 % on the piece and 43 % on the board around it. The defences
(`bg_p`, background randomization, Grad-CAM reliance measurement) are this project's own.
*Abstract only.*

<a id="beery-2018"></a>
**Recognition in Terra Incognita**
Sara Beery, Grant van Horn, Pietro Perona · 2018 ·
[arXiv:1807.04975](https://arxiv.org/abs/1807.04975)

Camera-trap images from twenty locations: algorithms do well at locations seen in training and
generalize poorly to new ones, classification worse than detection.
Relevance here twice over. First, it is the published form of "the background is the shortcut" —
the motivation for `randomize_border_bg`. Second, it is the same structure as this project's
**per-session split**: a fixed camera is a location, and splitting frames randomly instead of by
session measures the easy case, not the deployed one.
*Abstract only.*

<a id="geirhos-2018"></a>
**ImageNet-trained CNNs are biased towards texture; increasing shape bias improves accuracy and
robustness**
Robert Geirhos, Patricia Rubisch, Claudio Michaelis, Matthias Bethge, Felix A. Wichmann,
Wieland Brendel · 2018 · [arXiv:1811.12231](https://arxiv.org/abs/1811.12231)

CNNs trained on ImageNet recognise by texture rather than shape; training on a stylized version
shifts them toward shape and improves robustness to distortions.
Relevance here: the standing hypothesis behind the `sobel` input representations in
`torch_data.InputRepresentation` — a rectified gradient magnitude is a silhouette, i.e. shape. The
linear probe agreed (0.994 against RGB's 0.872) and the trained network did not (1937 misses
against 17). The paper is why the idea was worth trying; it is not evidence that it works here.
*Abstract only.*

---

## 6. Deduplication and near-duplicates

<a id="krawetz-2013"></a>
**dHash (difference hash)** — Neal Krawetz, "Kind of Like That", The Hacker Factor Blog

The algorithm in `dataset_build.dhash`: reduce to greyscale, resize to 9x8, emit one bit per
horizontally adjacent pixel pair, giving a 64-bit hash.
**Verification note: `hackerfactor.com` returned HTTP 403 in this session, so the primary source
was not read.** The attribution and the algorithm above are confirmed from two independent
secondary sources that both credit Krawetz's post by name: Ben Hoyt, *Duplicate image detection
with perceptual hashing in Python* (benhoyt.com), and Adrian Rosebrock, *Image hashing with OpenCV
and Python* (pyimagesearch.com, 27 November 2017). The pyimagesearch article gives the same 9x8
resize, the same horizontal-neighbour comparison and the same 64 bits as the code here; Hoyt's
128-bit variant additionally hashes the columns, which this project's implementation does not do.

What this project knows that no source states: at hamming 6 this filter discarded 54.8 % of the
corpus and **zero** of 3 432 collisions were pixel-identical. It is off by default since
2026-07-30 (`config.DedupDefaults.phash_enabled`). See `docs/data-pipeline.md` §5.13.

<a id="broder-1997"></a>
**On the resemblance and containment of documents**
Andrei Z. Broder · SEQUENCES 1997, pages 21–29 · [DOI 10.1109/SEQUEN.1997.666900](https://doi.org/10.1109/SEQUEN.1997.666900)

The origin of the resemblance/min-wise hashing line of work that locality-sensitive hashing grew
out of.
**Bibliographic record only — verified against dblp; the text was not retrieved in this session.**
It is therefore listed here as provenance and is deliberately *not* cited at the code site: the
banding argument in `dataset_build.dedup_phash` (if two 64-bit hashes differ in at most `k` bits,
then across `k+1` disjoint bands at least one band must match) is a pigeonhole argument that
stands on its own and is proved in place. The standard textbook treatment is chapter 3 of
Leskovec, Rajaraman and Ullman, *Mining of Massive Datasets*; `infolab.stanford.edu` and
`mmds.org` were both unreachable from here, so that book is **not** cited as a verified source.

<a id="barz-2019"></a>
**Do We Train on Test Data? Purging CIFAR of Near-Duplicates**
Björn Barz, Joachim Denzler · 2019 · [arXiv:1902.00423](https://arxiv.org/abs/1902.00423)

3.3 % of CIFAR-10 and 10 % of CIFAR-100 test images have duplicates in the training set;
re-testing on a de-duplicated set drops accuracy by 9–14 %.
Relevance here: the published measurement of why near-duplicates across a split matter — and the
reason this project's answer is a **per-session split** rather than a hash filter. A hash filter
inside one split is a curation choice; a duplicate *across* splits is leakage, and splitting by
session removes it structurally without deciding what "duplicate" means.
*Abstract only.*

---

## 7. Quantization and on-device deployment

<a id="krishnamoorthi-2018"></a>
**Quantizing deep convolutional networks for efficient inference: A whitepaper**
Raghuraman Krishnamoorthi · 2018 · [arXiv:1806.08342](https://arxiv.org/abs/1806.08342)

The abstract recommends per-channel quantization of weights together with per-layer quantization
of activations as the preferred scheme for hardware acceleration.
The body is emphatic about exactly this project's model family. Tables 2 and 3 report MobileNet-v1
and MobileNet-v2 collapsing to 0.001 accuracy (against 0.709 and 0.719 in float) under asymmetric
**per-layer** weight quantization, and recovering to 0.704 and 0.698 under asymmetric
**per-channel**. The stated cause is that batch normalization produces extreme variation in
dynamic range between the convolution kernels of a single layer, which a single per-layer scale
cannot represent; per-channel quantization sidesteps it by quantizing per kernel.
What this project takes from it: `training/quantize.py:run_quantize(per_channel=True)` as the
default. The measured effect here is far milder than the paper's (per-tensor A16W8: 1 phantom;
per-channel A16W8: 0), which is worth noting — this model is GroupNorm, not BatchNorm, so the
paper's stated mechanism does not apply to it unchanged.
*Body read (Tables 2–3 and surrounding text) via the ar5iv HTML.*

<a id="jacob-2017"></a>
**Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference**
Benoit Jacob, Skirmantas Kligys, Bo Chen, Menglong Zhu, Matthew Tang, Andrew Howard,
Hartwig Adam, Dmitry Kalenichenko · 2017 · [arXiv:1712.05877](https://arxiv.org/abs/1712.05877)

The integer-only inference scheme underlying TFLite-style quantization, with quantization-aware
training to recover the accuracy lost; demonstrated on MobileNets.
Relevance here: it is the scheme ONNX Runtime's QDQ export implements. Note that the abstract
makes **no** per-channel claim — that is `[krishnamoorthi-2018]`. This project does post-training
static quantization with a calibration set, not the paper's quantization-aware training.
*Abstract only.*

<a id="howard-2019"></a>
**Searching for MobileNetV3**
Andrew Howard, Mark Sandler, Grace Chu, Liang-Chieh Chen, Bo Chen, Mingxing Tan, Weijun Wang,
Yukun Zhu, Ruoming Pang, Vijay Vasudevan, Quoc V. Le, Hartwig Adam · 2019 ·
[arXiv:1905.02244](https://arxiv.org/abs/1905.02244)

Hardware-aware NAS plus NetAdapt; MobileNetV3-Small is 4.6 % more accurate than MobileNetV2 at
5 % lower latency on ImageNet.
What this project takes from it: `--backbone mobilenet_v3_small` (torchvision).
*Abstract only.*

<a id="qin-2024"></a>
**MobileNetV4 -- Universal Models for the Mobile Ecosystem**
Danfeng Qin, Chas Leichner, Manolis Delakis, Marco Fornoni, Shixin Luo, Fan Yang, Weijun Wang,
Colby Banbury, Chengxi Ye, Berkin Akin, Vaibhav Aggarwal, Tenghui Zhu, Daniele Moro,
Andrew Howard · 2024 · [arXiv:2404.10518](https://arxiv.org/abs/2404.10518)

Claims Pareto-optimal performance across mobile CPUs, DSPs, GPUs and dedicated accelerators.
What this project takes from it: the `mobilenetv4_conv_small_*` backbones loaded through timm,
including the 0.35-width variant that ships. Note that the width the project actually uses has no
pretrained weights in timm and is trained from random init — the paper's numbers are not this
model's numbers.
*Abstract only.*

---

## 8. Interpretability

<a id="selvaraju-2016"></a>
**Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization**
Ramprasaath R. Selvaraju, Michael Cogswell, Abhishek Das, Ramakrishna Vedantam, Devi Parikh,
Dhruv Batra · 2016 · [arXiv:1610.02391](https://arxiv.org/abs/1610.02391)

Uses the gradients of a target class flowing into the final convolutional layer to produce a
coarse localization map; applies to a wide range of CNNs without retraining or architectural
change. The abstract explicitly lists identifying dataset bias among its uses.
What this project takes from it: `training/gradcam.py`, hooking the deepest `Conv2d`, and the
derived "reliance" measurement (share of attention mass on the piece versus the board) that
produced the 8 %/43 % knight result.
*Abstract only.*

---

## 9. Prior art — chess position recognition

<a id="wolflein-2021"></a>
**Determining Chess Game State From an Image**
Georg Wölflein, Ognjen Arandjelović · 2021 · *J. Imaging* 7(6), 94 ·
[arXiv:2104.14963](https://arxiv.org/abs/2104.14963)

"chesscog". A RANSAC-based board localization computing a projective transformation onto a regular
grid, then **two CNNs: one for occupancy, one for piece classification**. Reports 0.23 % error per
square, and 99.83 % per-square accuracy on an unseen chess set after few-shot transfer from two
photographs of the starting position. Trained on a synthetic dataset.
What this project takes from it: the two-stage decomposition. `model.py:HierarchicalHead` is named
after it in the code ("the chesscog principle") — the piece head receives gradient only on
occupied squares. The wider architectural agreement (rectify the board first, classify per square,
train on synthetic data) is independent convergence rather than borrowing.
*Abstract only.*

<a id="masouris-2023"></a>
**End-to-End Chess Recognition**
Athanasios Masouris, Jan van Gemert · 2023 · [arXiv:2310.04086](https://arxiv.org/abs/2310.04086)

Introduces ChessReD, 10 800 real smartphone photographs with annotations, and argues for
predicting the whole board configuration directly instead of a pipeline of modules, to avoid
error accumulation and intermediate annotations; reports roughly 7x better performance than prior
work on that benchmark.
Relevance here: it is the published argument **against** this project's architecture. The counter
this project relies on is not accuracy but labels — a fixed camera plus a known FEN yields 64
labeled crops per photograph for free, which is what makes a per-square classifier trainable here
at all. Worth re-reading before anyone proposes a whole-board model.
*Abstract only.*

---

## 10. How to add an entry

1. Fetch the source. The arXiv `abs` page is enough for title, authors, year and identifier; use
   `ar5iv.labs.arxiv.org/html/<id>` when the claim is in the body.
2. Record what the source *actually* says. "Is associated with" is not "causes"; an abstract's
   claim is not the body's evidence.
3. If only the abstract was readable, write *Abstract only.* If nothing was readable, do not add
   the entry — add a line to §11 instead.
4. At the code site, one sentence and an anchor. The reference itself lives only here.

---

## 11. Decisions with no published basis

These are load-bearing settings that no source justifies. They are listed so nobody mistakes them
for results. The reasoning behind each, and what it would take to settle it, is in
`specs/31-cite-what-we-rely-on/STATUS.md`.

| Decision | Where | Status |
|---|---|---|
| `lr = 3e-4` | `config.DEFAULT_LR`, every run on record | No source verified. Inherited; never swept, never range-tested. It is also the rate at which every BatchNorm-vs-GroupNorm comparison ran — see `[bjorck-2018]`. |
| `weight_decay` left at PyTorch's AdamW default | `training/train.py` | Never chosen. `[loshchilov-2017]` is about this parameter and the project does not set it. |
| `epochs = 30` as the default, and `T_max = epochs` | `config.DEFAULT_EPOCHS`, `training/train.py` | The coupling is documented (`[loshchilov-2016]`), the number is not justified by anything. |
| `batch_size = 256` | `config.DEFAULT_BATCH_SIZE` | No source. Chosen to fit VRAM. |
| `max_empty_ratio = 1.5`, `max_class_ratio` | `config.DEFAULT_MAX_EMPTY_RATIO`, `dataset.subsample_classes` | No source. `[buda-2017]` recommends the opposite direction (oversample rather than undersample). |
| Inverse-frequency class weights | `dataset.compute_class_weights` | `[cui-2019]` argues against exactly this scheme. Never compared here. |
| Every augmentation magnitude (`brightness` 0.35, `gamma` (0.6, 1.8), `noise_std` 0.03, `erase_p` 0.25, `bg_p` 0.60, `neighbour_p` 0.30, …) | `config.AugmentPolicy` | The *techniques* are cited above; the numbers are hand-set and unswept. |
| `per_cell_cap = 4`, phash hamming threshold | `config.DedupDefaults` | No source. Both are measured here instead (`docs/data-pipeline.md` §5.13) — which is the better kind of justification, but it is not a citation. |
| `patience`, and `occ_board_acc` as the checkpoint metric | `training/train.py` | This project's own invention. See the `CLAUDE.md` pitfall about the metric being structurally floored. |
| The occupancy reader `1 − P(empty) − P(occluded)` and its bias toward "occupied" | `move_tracker/cnn_recovery.py` | This project's own arithmetic, measured here. No source and none needed — but it is not a standard technique either. |
| GroupNorm group count capped at 8 | `training/model.py:_gn_groups` | No source. `[wu-2018]` sets G=32 by default and reports GN insensitive to G over 64…2 (about 0.6 pp spread), so 8 is probably harmless — but it was never varied here, and on narrow layers the divisor rule silently drops it further. |
