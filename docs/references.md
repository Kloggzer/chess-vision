# References — where our claims come from

> The bibliography for the decisions this project encodes in code. A code comment names an anchor
> here; the entry carries title, authors, year and identifier. A reference lives in exactly one
> place, and this is it. Spec numbers (`specs/NN`) map via `docs/specs-index.md`.
>
> **Every entry was retrieved and confirmed on 2026-07-31.** Each says whether only the abstract or
> also the body was read. Nothing is cited from memory — fetch the source before adding an entry.
>
> §11 lists the decisions that have **no** published basis. That list is a finding, not a gap to be
> filled with the nearest plausible paper.

---

## 1. Normalization

<a id="ioffe-2015"></a>
**Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift**
Sergey Ioffe, Christian Szegedy · 2015 · [arXiv:1502.03167](https://arxiv.org/abs/1502.03167)

The definition of BN, nothing more: its stated mechanism is disputed by
[Santurkar 2018](#santurkar-2018). *Abstract only.*

<a id="wu-2018"></a>
**Group Normalization**
Yuxin Wu, Kaiming He · 2018 · [arXiv:1803.08494](https://arxiv.org/abs/1803.08494)

Per-group statistics, independent of the batch dimension. The body sets G=32 by default and
reports GN insensitive to G from 64 down to 2 (Table 3, ~0.6 pp spread). GN's per-sample statistic
cannot be folded into the preceding convolution — the export cost that ended GN here.
*Abstract, plus the Table 3 discussion via ar5iv.*

<a id="bjorck-2018"></a>
**Understanding Batch Normalization**
Johan Bjorck, Carla Gomes, Bart Selman, Kilian Q. Weinberger · 2018 ·
[arXiv:1806.02375](https://arxiv.org/abs/1806.02375)

BN's main benefit is that it permits **larger learning rates**. Why every BN-vs-GN comparison at
the inherited `lr 3e-4` (§11) tested BN without its benefit. *Abstract only.*

<a id="santurkar-2018"></a>
**How Does Batch Normalization Help Optimization?**
Shibani Santurkar, Dimitris Tsipras, Andrew Ilyas, Aleksander Madry · 2018 ·
[arXiv:1805.11604](https://arxiv.org/abs/1805.11604)

BN smooths the optimization landscape; input-distribution stability has little to do with it.
"BN reduces internal covariate shift" is therefore not a reason used here. *Abstract only.*

<a id="ulyanov-2016"></a>
**Instance Normalization: The Missing Ingredient for Fast Stylization**
Dmitry Ulyanov, Andrea Vedaldi, Victor Lempitsky · 2016 ·
[arXiv:1607.08022](https://arxiv.org/abs/1607.08022)

Relevant only mechanically: ONNX has no GroupNorm operator, so GN exports as
`InstanceNormalization` nodes — the nodes NNAPI and QNN break on. *Abstract only.*

<a id="brock-2021"></a>
**High-Performance Large-Scale Image Recognition Without Normalization**
Andrew Brock, Soham De, Samuel L. Smith, Karen Simonyan · 2021 ·
[arXiv:2102.06171](https://arxiv.org/abs/2102.06171)

Normalizer-free networks with adaptive gradient clipping. `--norm none` was measured here
(`specs/25`) **without** that clipping, so it is not a test of this paper's method.
*Abstract only.*

<a id="li-2016"></a>
**Revisiting Batch Normalization For Practical Domain Adaptation**
Yanghao Li, Naiyan Wang, Jianping Shi, Jiaying Liu, Xiaodi Hou · 2016 ·
[arXiv:1603.04779](https://arxiv.org/abs/1603.04779)

AdaBN: re-estimate every BN layer's statistics for the new domain, parameters untouched.
`scripts/adabn_recalibrate.py` applies it across *input resolutions* of one domain — an extension
the paper did not measure. *Abstract only.*

<a id="chang-2019"></a>
**Domain-Specific Batch Normalization for Unsupervised Domain Adaptation**
Woong-Gi Chang, Tackgeun You, Seonguk Seo, Suha Kwak, Bohyung Han · 2019 ·
[arXiv:1906.03950](https://arxiv.org/abs/1906.03950)

DSBN: one BN branch per domain, all else shared. Used here per training scale (`specs/25`); same
caveat as AdaBN — our domains are resolutions. *Abstract only.*

---

## 2. Learning rate, schedules and the optimizer

<a id="loshchilov-2017"></a>
**Decoupled Weight Decay Regularization**
Ilya Loshchilov, Frank Hutter · 2017 · [arXiv:1711.05101](https://arxiv.org/abs/1711.05101)

AdamW: decoupling weight decay from the gradient update improves Adam's generalization. The
project uses `torch.optim.AdamW`; without `--weight-decay` it runs PyTorch's 0.01, the value every
archived run had without anyone choosing it (§11). *Abstract only.*

<a id="loshchilov-2016"></a>
**SGDR: Stochastic Gradient Descent with Warm Restarts**
Ilya Loshchilov, Frank Hutter · 2016 · [arXiv:1608.03983](https://arxiv.org/abs/1608.03983)

The cosine schedule (Eq. 5): `η_t = η_min + ½(η_max − η_min)(1 + cos(π · T_cur / T_i))`.
PyTorch's `CosineAnnealingLR` cites it and anneals without restarts over `T_max`. **Consequence:**
`training/train_recipe.py` passes `T_max=epochs`, so a 60- and a 200-epoch run are different trajectories, not the
same run observed longer, and a late plateau may be the cosine floor rather than convergence.
*Body read (Eq. 5) via ar5iv; PyTorch documentation read separately.*

<a id="he-2018"></a>
**Bag of Tricks for Image Classification with Convolutional Neural Networks**
Tong He, Zhi Zhang, Hang Zhang, Zhongyue Zhang, Junyuan Xie, Mu Li · 2018 ·
[arXiv:1812.01187](https://arxiv.org/abs/1812.01187)

§5.1: cosine decay with **T = total batches of the run** — second confirmation that the schedule
is tied to a run length fixed in advance. *Body read (§5.1) via ar5iv.*

<a id="smith-2015"></a>
**Cyclical Learning Rates for Training Neural Networks**
Leslie N. Smith · 2015 · [arXiv:1506.01186](https://arxiv.org/abs/1506.01186)

The **LR range test**: raise the rate linearly over a few epochs, watch where accuracy stops
improving. `scripts/lr_range_test.py` implements it; no band is recorded in `docs/`, so whether
`3e-4` is right stays open. *Abstract only.*

<a id="smith-2018"></a>
**A disciplined approach to neural network hyper-parameters: Part 1 -- learning rate, batch size,
momentum, and weight decay**
Leslie N. Smith · 2018 · [arXiv:1803.09820](https://arxiv.org/abs/1803.09820)

Optimal weight decay is tightly coupled to learning rate and momentum. arXiv has no HTML for it and
the PDF did not fetch as text: any recipe attributed to it (one-cycle, numbers) is **unverified**
here. *Abstract only.*

<a id="defazio-2024"></a>
**The Road Less Scheduled**
Aaron Defazio, Xingyu Alice Yang, Harsh Mehta, Konstantin Mishchenko, Ahmed Khaled,
Ashok Cutkosky · 2024 · [arXiv:2405.15682](https://arxiv.org/abs/2405.15682)

Schedule-Free methods: no stopping time `T` in advance — the direct answer to the `T_max=epochs`
coupling. Not adopted; read [henheik-2025](#henheik-2025) first. *Abstract only.*

<a id="defazio-2023"></a>
**Learning-Rate-Free Learning by D-Adaptation**
Aaron Defazio, Konstantin Mishchenko · 2023 · [arXiv:2301.07733](https://arxiv.org/abs/2301.07733)

Sets the learning rate automatically; matches hand-tuned rates on a dozen problems.
*Abstract only.*

<a id="mishchenko-2023"></a>
**Prodigy: An Expeditiously Adaptive Parameter-Free Learner**
Konstantin Mishchenko, Aaron Defazio · 2023 · [arXiv:2306.06101](https://arxiv.org/abs/2306.06101)

Improves D-Adaptation; close to hand-tuned Adam without a set rate. *Abstract only.*

<a id="henheik-2025"></a>
**Revisiting Learning Rate Control**
Micha Henheik, Theresa Eimer, Marius Lindauer · 2 July 2025 ·
[arXiv:2507.01724](https://arxiv.org/abs/2507.01724)

Learning-rate control methods do well on selected tasks but **are not reliable across settings**.
Keeps the three methods above in "measure it here", not "known better". *Abstract only.*

<a id="micikevicius-2017"></a>
**Mixed Precision Training**
Paulius Micikevicius, Sharan Narang, Jonah Alben, Gregory Diamos, Erich Elsen, David Garcia,
Boris Ginsburg, Michael Houston, Oleksii Kuchaiev, Ganesh Venkatesh, Hao Wu · 2017 ·
[arXiv:1710.03740](https://arxiv.org/abs/1710.03740)

fp16 training with an fp32 master copy and **loss scaling** — `torch.amp.GradScaler` in
`training/train_recipe.py` (`--no-amp` disables it). *Abstract only.*

---

## 3. Multi-scale training and inference resolution

<a id="redmon-2016"></a>
**YOLO9000: Better, Faster, Stronger**
Joseph Redmon, Ali Farhadi · 2016 · [arXiv:1612.08242](https://arxiv.org/abs/1612.08242)

Multi-scale training: a new input size every few batches, so one set of weights serves any
resolution — what `train.py --scales` does. The claim is in the body, not the abstract.
*Body read via ar5iv.*

<a id="touvron-2019"></a>
**Fixing the train-test resolution discrepancy**
Hugo Touvron, Andrea Vedaldi, Matthijs Douze, Hervé Jégou · 2019 ·
[arXiv:1906.06423](https://arxiv.org/abs/1906.06423)

"FixRes": the deployment resolution must occur during training. Why `infer_size` must be one of a
run's `scales` — an untrained 80 px cost 133 misses, silently (`docs/data-pipeline.md` §11).
*Abstract only.*

<a id="cai-2019"></a>
**Once-for-All: Train One Network and Specialize it for Efficient Deployment**
Han Cai, Chuang Gan, Tianzhe Wang, Zhekai Zhang, Song Han · 2019 ·
[arXiv:1908.09791](https://arxiv.org/abs/1908.09791)

Precedent for "train once, serve at the size the device wants"; only the resolution axis is used
here. *Abstract only.*

<a id="tan-2019"></a>
**EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks**
Mingxing Tan, Quoc V. Le · 2019 · [arXiv:1905.11946](https://arxiv.org/abs/1905.11946)

Resolution is a first-class model dimension (compound scaling) — the premise of `specs/22`/`23`.
*Abstract only.*

<a id="he-2014"></a>
**Spatial Pyramid Pooling in Deep Convolutional Networks for Visual Recognition**
Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun · 2014 ·
[arXiv:1406.4729](https://arxiv.org/abs/1406.4729)

A fixed-length representation regardless of input size. Global average pooling
(`AdaptiveAvgPool2d(1)`) is its one-level case and what makes `--scales` possible at all.
*Abstract only.*

---

## 4. Class imbalance

<a id="lin-2017"></a>
**Focal Loss for Dense Object Detection**
Tsung-Yi Lin, Priya Goyal, Ross Girshick, Kaiming He, Piotr Dollár · 2017 ·
[arXiv:1708.02002](https://arxiv.org/abs/1708.02002)

Down-weights well-classified examples so training is not swamped by easy negatives —
`training/losses.py:FocalLoss` (`--loss focal`). Here the easy majority is `empty`.
*Abstract only.*

<a id="cui-2019"></a>
**Class-Balanced Loss Based on Effective Number of Samples**
Yin Cui, Menglin Jia, Tsung-Yi Lin, Yang Song, Serge Belongie · 2019 ·
[arXiv:1901.05555](https://arxiv.org/abs/1901.05555)

Raw inverse frequency over-corrects; weight by effective number `(1 − β^n)/(1 − β)` instead.
`dataset.compute_class_weights` uses plain inverse frequency — a recorded divergence, never
compared here, and it compounds with `max_empty_ratio`. *Abstract only.*

<a id="buda-2017"></a>
**A systematic study of the class imbalance problem in convolutional neural networks**
Mateusz Buda, Atsuto Maki, Maciej A. Mazurowski · 2017 ·
[arXiv:1710.05381](https://arxiv.org/abs/1710.05381)

Oversampling dominates and does not overfit; thresholding compensates for class priors.
`dataset.subsample_classes` **undersamples** instead — for disk and I/O on a corpus of millions of
near-identical `empty` crops, not for accuracy. *Abstract only.*

<a id="shrivastava-2016"></a>
**Training Region-based Object Detectors with Online Hard Example Mining**
Abhinav Shrivastava, Abhinav Gupta, Ross Girshick · 2016 ·
[arXiv:1604.03540](https://arxiv.org/abs/1604.03540)

OHEM selects hard examples per mini-batch. `scripts/mine_hard_empty.py` takes the idea, not the
method: it mines **offline** from a finished model into a keep-list — and a keep-list mined from
one model is a hidden variable in the next. *Abstract only.*

---

## 5. Augmentation, and the shortcuts it defends against

<a id="devries-2017"></a>
**Improved Regularization of Convolutional Neural Networks with Cutout**
Terrance DeVries, Graham W. Taylor · 2017 · [arXiv:1708.04552](https://arxiv.org/abs/1708.04552)

Masking out square regions of the input during training.

<a id="zhong-2017"></a>
**Random Erasing Data Augmentation**
Zhun Zhong, Liang Zheng, Guoliang Kang, Shaozi Li, Yi Yang · 2017 ·
[arXiv:1708.04896](https://arxiv.org/abs/1708.04896)

Erasing a random rectangle for robustness to occlusion. Both are `AugmentPolicy.erase_p` /
`erase_scale`. Forcing the model off the board and onto the piece is this project's own argument,
not either paper's. *Both abstract only.*

<a id="geirhos-2020"></a>
**Shortcut Learning in Deep Neural Networks**
Robert Geirhos, Jörn-Henrik Jacobsen, Claudio Michaelis, Richard Zemel, Wieland Brendel,
Matthias Bethge, Felix A. Wichmann · 2020 · [arXiv:2004.07780](https://arxiv.org/abs/2004.07780)

The name for the measured failure where a knight's prediction relied 8 % on the piece and 43 % on
the board. The border randomization built against it was removed unmeasured on 2026-08-21;
`chesslab reliance` still detects the shortcut. *Abstract only.*

<a id="beery-2018"></a>
**Recognition in Terra Incognita**
Sara Beery, Grant van Horn, Pietro Perona · 2018 ·
[arXiv:1807.04975](https://arxiv.org/abs/1807.04975)

Models generalize poorly to camera locations unseen in training. A fixed camera is a location:
the reason for the **per-session split**. *Abstract only.*

<a id="geirhos-2018"></a>
**ImageNet-trained CNNs are biased towards texture; increasing shape bias improves accuracy and
robustness**
Robert Geirhos, Patricia Rubisch, Claudio Michaelis, Matthias Bethge, Felix A. Wichmann,
Wieland Brendel · 2018 · [arXiv:1811.12231](https://arxiv.org/abs/1811.12231)

CNNs recognise by texture; the hypothesis behind the `sobel` input representations. The linear
probe agreed (0.994 against RGB 0.872), the trained network did not (1937 misses against 17). The
paper is why it was tried, not evidence that it works here. *Abstract only.*

---

## 6. Deduplication and near-duplicates

<a id="krawetz-2013"></a>
**dHash (difference hash)** — Neal Krawetz, "Kind of Like That", The Hacker Factor Blog

Greyscale, resize to 9x8, one bit per horizontal neighbour pair, 64 bits — `dataset_build.dhash`.
The primary source returned HTTP 403; confirmed via two secondary sources crediting it (Ben Hoyt,
benhoyt.com; Adrian Rosebrock, pyimagesearch.com, 2017-11-27). Measured here: at hamming 6 the
filter discarded 54.8 % of the corpus and **zero** of 3 432 collisions were pixel-identical; off by
default since 2026-07-30 (`docs/data-pipeline.md` §5.13).

<a id="broder-1997"></a>
**On the resemblance and containment of documents**
Andrei Z. Broder · SEQUENCES 1997, pages 21–29 ·
[DOI 10.1109/SEQUEN.1997.666900](https://doi.org/10.1109/SEQUEN.1997.666900)

Provenance of min-wise/LSH hashing. **Bibliographic record only (dblp), text not read** — so not
cited at the code site; the banding argument in `dedup_phash` is a pigeonhole proof in place.

<a id="barz-2019"></a>
**Do We Train on Test Data? Purging CIFAR of Near-Duplicates**
Björn Barz, Joachim Denzler · 2019 · [arXiv:1902.00423](https://arxiv.org/abs/1902.00423)

Duplicates across splits inflate accuracy by 9–14 %. A duplicate *across* splits is leakage; the
per-session split removes it structurally, a hash filter inside one split is only curation.
*Abstract only.*

---

## 7. Quantization and on-device deployment

<a id="krishnamoorthi-2018"></a>
**Quantizing deep convolutional networks for efficient inference: A whitepaper**
Raghuraman Krishnamoorthi · 2018 · [arXiv:1806.08342](https://arxiv.org/abs/1806.08342)

Per-channel weights plus per-layer activations. Tables 2–3: MobileNet-v1/v2 collapse to 0.001 under
per-layer weight quantization and recover to 0.704/0.698 per-channel, because BN leaves wildly
different dynamic ranges between the kernels of one layer. Hence `run_quantize(per_channel=True)`.
Measured here much milder (A16W8 per-tensor 1 phantom, per-channel 0) — on a GroupNorm model.
*Body read (Tables 2–3) via ar5iv.*

<a id="jacob-2017"></a>
**Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference**
Benoit Jacob, Skirmantas Kligys, Bo Chen, Menglong Zhu, Matthew Tang, Andrew Howard,
Hartwig Adam, Dmitry Kalenichenko · 2017 · [arXiv:1712.05877](https://arxiv.org/abs/1712.05877)

The integer-only scheme ONNX Runtime's QDQ export implements. It makes **no** per-channel claim
(that is [krishnamoorthi-2018](#krishnamoorthi-2018)); this project does post-training static
quantization, not the paper's quantization-aware training. *Abstract only.*

<a id="howard-2019"></a>
**Searching for MobileNetV3**
Andrew Howard, Mark Sandler, Grace Chu, Liang-Chieh Chen, Bo Chen, Mingxing Tan, Weijun Wang,
Yukun Zhu, Ruoming Pang, Vijay Vasudevan, Quoc V. Le, Hartwig Adam · 2019 ·
[arXiv:1905.02244](https://arxiv.org/abs/1905.02244)

Hardware-aware NAS; the torchvision `mobilenet_v3_small`. *Abstract only.*

<a id="qin-2024"></a>
**MobileNetV4 -- Universal Models for the Mobile Ecosystem**
Danfeng Qin, Chas Leichner, Manolis Delakis, Marco Fornoni, Shixin Luo, Fan Yang, Weijun Wang,
Colby Banbury, Chengxi Ye, Berkin Akin, Vaibhav Aggarwal, Tenghui Zhu, Daniele Moro,
Andrew Howard · 2024 · [arXiv:2404.10518](https://arxiv.org/abs/2404.10518)

The `mobilenetv4_conv_small_*` backbones via timm (the hand gate's first student; none ships in
the APK, `docs/training-speed.md` §5). The 0.35 width has no pretrained weights and trains from
random init — the paper's numbers are not this model's. *Abstract only.*

---

## 8. Interpretability

<a id="selvaraju-2016"></a>
**Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization**
Ramprasaath R. Selvaraju, Michael Cogswell, Abhishek Das, Ramakrishna Vedantam, Devi Parikh,
Dhruv Batra · 2016 · [arXiv:1610.02391](https://arxiv.org/abs/1610.02391)

Class gradients into the last conv layer give a localization map; the abstract lists finding
dataset bias as a use. `training/gradcam.py` and the "reliance" measurement (8 %/43 % knight).
*Abstract only.*

---

## 9. Prior art — chess position recognition

<a id="wolflein-2021"></a>
**Determining Chess Game State From an Image**
Georg Wölflein, Ognjen Arandjelović · 2021 · *J. Imaging* 7(6), 94 ·
[arXiv:2104.14963](https://arxiv.org/abs/2104.14963)

"chesscog": RANSAC board localization, then two CNNs (occupancy, piece), 0.23 % per-square error,
synthetic training data. Rectify-then-classify-per-square is independent convergence.
*Abstract only.*

<a id="masouris-2023"></a>
**End-to-End Chess Recognition**
Athanasios Masouris, Jan van Gemert · 2023 · [arXiv:2310.04086](https://arxiv.org/abs/2310.04086)

ChessReD (10 800 real photos) and the argument for predicting the whole board directly — the
published case **against** this architecture. The counter is labels, not accuracy: a fixed camera
plus a known FEN yields 64 labeled crops per photo for free. Re-read before proposing a
whole-board model. *Abstract only.*

---

## 10. Move classification — what was read at the source, taken, and refused

`specs/44`, 2026-08-03. Read **from source, not documentation — the two disagree, and the
documentation is wrong.**

<a id="lila-advice"></a>
**lila — `modules/tree/src/main/Advice.scala`** · AGPL-3.0 · lichess-org/lila

Blunder / Mistake / Inaccuracy at `.3 / .2 / .1` on `winningChances` (**-1..+1**), not on
`WinPercent` (0..100). Since `winPercent = 50 + 50 * winningChances`, **taken: 15 / 10 / 5
points, NOT 30 / 20 / 10** — the forum answer is wrong by a factor of two. chess.com's published
cutoffs (5 and 10 points) agree. Live in `Accuracy.kt` and `AccuracyTest.kt`.

<a id="lila-eval"></a>
**scalachess — `core/src/main/scala/eval.scala`**, constant fitted in lila PR #11148

`k = 0.00368208`, the win-expectancy logistic, **fitted for 2300+ players** (trends to -0.002 at
lower ratings) — a known, unfixed approximation for this project's users. Live as
`WIN_CHANCE_K` in `WinChance.kt`, with `Cp.CEILING = ±1000` and mates mapped onto it.
**Trap:** the blog post "Learn from your mistakes" prints the superseded `-0.004`.

<a id="lila-accuracy"></a>
**lila — `modules/analyse/src/main/AccuracyPercent.scala`** · AGPL-3.0

Per-move accuracy `103.1668100711649 * exp(-0.04354415386753951 * delta) - 3.166924740191411`,
plus lichess' `+ 1` bonus, clamped 0..100; the harmonic mean's `max(1, v)` guard from
`scalalib/.../Maths.scala`; colour bands >=85 / >=70 / >=55. Three details — the `+ 1`, the early
return of exactly `100d`, the ±1000 ceiling — are absent from the public accuracy page; a port from
the page would be wrong in three places.

### The licence position — settled, do not re-open

- A formula is not copyrightable; a verbatim code port would be. Formula plus attribution is what
  this project does.
- Even a port would combine: lila is AGPL-3.0, chesslab GPL-3.0-or-later, and **GPLv3 §13 permits
  the combination**.
- **chess.com is the one real limit:** CAPS2 is proprietary — approximate, never copy. Their
  presentation is free to learn from; only the published Expected-Points table was taken, as a
  cross-check.
- `lichess-org/chess-openings` is CC0. `specs/42` refused the accuracy percentage for scope, not
  licensing (user asked, 2026-08-03).

### Refused, with the reason

| Refused | Why |
|---|---|
| **Brilliant / Great / Miss** | chess.com's rule is unpublished and rating-dependent; shipping a guess under their word is invented authority |
| **Book** | no opening book ships; `MoveQuality.BOOK` could never be set and was deleted |
| **A "Best vs Good" threshold** | BEST is a fact (matched the engine's first choice); over 83 plies the 29 matches lost at most 1.56 points |
| **Lichess' full accuracy aggregation** | its volatility-weighted half leaks a decided finish (below); we ship the harmonic mean alone |
| **ACPL on screen** | a centipawn at +20 has ~5x the impact of one at +100; ACPL 50 can be many inaccuracies or one blunder |
| **A rating-dependent classifier** | we have no rating for anybody |
| **WintrChess / freechess** | third-party curve-fits to chess.com output |
| **Motif naming** ("Show Fork") | needs tactical classification we do not have |
| **Skeleton screens** | a replication found no significant difference to a spinner |
| **A percent bar as the only feedback** | the filling advantage chart *is* the progress indicator |

Why the aggregation half was refused: adding 15 mate-tail plies per side moves the losing side's
accuracy **69.1 -> 80.9**; counting them reads White 76.5 / Black 75.6, dropping them
**71.4 / 66.5**. The engine budget these bands run at is in `docs/android-performance.md`.

---

## 11. Decisions with no published basis

Load-bearing settings no source justifies — listed so nobody mistakes them for results. The
reasoning was in `specs/31` (`git show fd9c1908:specs/31-cite-what-we-rely-on/STATUS.md`).

| Decision | Where | Status |
|---|---|---|
| `lr = 3e-4` | `config.DEFAULT_LR` | Inherited; never swept, no range-test band recorded. Also the rate of every BN-vs-GN comparison — see [bjorck-2018](#bjorck-2018). |
| `weight_decay` at AdamW's default 0.01 | `training/train_recipe.py` (`--weight-decay`) | Never chosen ([loshchilov-2017](#loshchilov-2017)). |
| `epochs = 30`, `T_max = epochs` | `config.DEFAULT_EPOCHS` | The coupling is documented ([loshchilov-2016](#loshchilov-2016)), the number is not justified. |
| `batch_size = 256` | `config.DEFAULT_BATCH_SIZE` | Chosen to fit VRAM. |
| `max_empty_ratio = 1.5`, `max_class_ratio` | `dataset.subsample_classes` | [buda-2017](#buda-2017) recommends the opposite direction. |
| Inverse-frequency class weights | `dataset.compute_class_weights` | [cui-2019](#cui-2019) argues against exactly this. |
| Every augmentation magnitude | `config.AugmentPolicy` | Techniques cited in §5; numbers hand-set and unswept. |
| `per_cell_cap`, phash hamming threshold | `config.DedupDefaults` | Measured here (`docs/data-pipeline.md` §5.13), not cited. |
| `patience`, checkpoint metric | `config.DEFAULT_PATIENCE`, `CHECKPOINT_WEIGHTS` | This project's own invention. |
| GroupNorm group count capped at 8 | `training/model.py:_gn_groups` | [wu-2018](#wu-2018) reports insensitivity over 64…2; never varied here. |

---

## 12. State estimation and temporal filtering — located, never cited

**The tracker's temporal design is uncited.** Two sources were located on 2026-08-02 (`specs/39`)
and read only to the abstract, so under §13's rule neither became an entry:

- **An Algorithm for Tracking Multiple Targets** — Donald B. Reid, 1979, *IEEE Trans. Automatic
  Control* 24(6) 843–854, doi `10.1109/TAC.1979.1102177`. Origin of multiple-hypothesis tracking.
- **Continuous Inspection Schemes** — E. S. Page, 1954, *Biometrika* 41(1–2) 100–115, doi
  `10.1093/biomet/41.1-2.100`. CUSUM — what `desyncObs`/`anomalySince` do by hand in counts.

**Do not cite either from these lines — fetch it first.**

---

## 13. How to add an entry

1. Fetch the source. The arXiv `abs` page gives title, authors, year, id; use
   `ar5iv.labs.arxiv.org/html/<id>` when the claim is in the body.
2. Record what the source *actually* says — an abstract's claim is not the body's evidence.
3. Mark *Abstract only.* where that is all that was read. If nothing was readable, add no entry —
   add a line to §11 instead.
4. At the code site, one sentence and an anchor. The reference itself lives only here.
