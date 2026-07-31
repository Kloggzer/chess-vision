# specs/31 — STATUS

> **Done** 2026-07-31, branch `spec-31-citations` (cut from `spec-24-frame-the-board`).
> Documentation only: no default changed, no flag added, no behaviour touched.
> Gates: `pytest -q`, `ruff check src scripts tests`, `vulture` — all green.

## What shipped

- `docs/references.md` — 42 entries in nine topic sections, plus §10 (how to add one) and §11 (the
  decisions with no published basis). 40 were confirmed at the source; two carry their verification
  failure in the entry (§2 below).
- 25 pointers at decision sites across 11 files in `src/` and `scripts/`, each a sentence or two
  plus an anchor.
- A pointer from `README.md`'s Development section.

## 1. What was cited

Every entry was fetched in this session and confirmed against the source page. The table records
how far into each source the verification actually went, because that is the part a later reader
cannot reconstruct.

| Work | Identifier | Depth verified |
|---|---|---|
| Ioffe & Szegedy, *Batch Normalization…* | arXiv:1502.03167 | abstract |
| Wu & He, *Group Normalization* | arXiv:1803.08494 | abstract + body (G=32 default, Table 3 sensitivity) |
| Bjorck et al., *Understanding Batch Normalization* | arXiv:1806.02375 | abstract |
| Santurkar et al., *How Does Batch Normalization Help Optimization?* | arXiv:1805.11604 | abstract |
| Ulyanov et al., *Instance Normalization…* | arXiv:1607.08022 | abstract |
| Brock et al., *…Without Normalization* | arXiv:2102.06171 | abstract |
| Li et al., *Revisiting Batch Normalization For Practical Domain Adaptation* | arXiv:1603.04779 | abstract |
| Chang et al., *Domain-Specific Batch Normalization…* | arXiv:1906.03950 | abstract |
| Loshchilov & Hutter, *Decoupled Weight Decay Regularization* | arXiv:1711.05101 | abstract |
| Loshchilov & Hutter, *SGDR…* | arXiv:1608.03983 | abstract + body (Eq. 5) + PyTorch's `CosineAnnealingLR` docs |
| He et al., *Bag of Tricks…* | arXiv:1812.01187 | abstract + body (§5.1 cosine formula, T = total batches) |
| Smith, *Cyclical Learning Rates…* | arXiv:1506.01186 | abstract |
| Smith, *A disciplined approach…Part 1* | arXiv:1803.09820 | abstract only — see §2 |
| Defazio et al., *The Road Less Scheduled* | arXiv:2405.15682 | abstract |
| Defazio & Mishchenko, *Learning-Rate-Free Learning by D-Adaptation* | arXiv:2301.07733 | abstract |
| Mishchenko & Defazio, *Prodigy…* | arXiv:2306.06101 | abstract |
| Henheik et al., *Revisiting Learning Rate Control* | arXiv:2507.01724 | abstract |
| Micikevicius et al., *Mixed Precision Training* | arXiv:1710.03740 | abstract |
| Redmon & Farhadi, *YOLO9000…* | arXiv:1612.08242 | body (multi-scale section) — the abstract does not mention it |
| Touvron et al., *Fixing the train-test resolution discrepancy* | arXiv:1906.06423 | abstract |
| Cai et al., *Once-for-All…* | arXiv:1908.09791 | abstract |
| Tan & Le, *EfficientNet…* | arXiv:1905.11946 | abstract |
| He et al., *Spatial Pyramid Pooling…* | arXiv:1406.4729 | abstract |
| Lin et al., *Focal Loss for Dense Object Detection* | arXiv:1708.02002 | abstract |
| Cui et al., *Class-Balanced Loss…* | arXiv:1901.05555 | abstract |
| Buda et al., *A systematic study of the class imbalance problem…* | arXiv:1710.05381 | abstract |
| Shrivastava et al., *…Online Hard Example Mining* | arXiv:1604.03540 | abstract |
| DeVries & Taylor, *…Cutout* | arXiv:1708.04552 | abstract |
| Zhong et al., *Random Erasing Data Augmentation* | arXiv:1708.04896 | abstract |
| Geirhos et al., *Shortcut Learning in Deep Neural Networks* | arXiv:2004.07780 | abstract |
| Beery et al., *Recognition in Terra Incognita* | arXiv:1807.04975 | abstract |
| Geirhos et al., *ImageNet-trained CNNs are biased towards texture…* | arXiv:1811.12231 | abstract |
| Barz & Denzler, *Do We Train on Test Data?…* | arXiv:1902.00423 | abstract |
| Krishnamoorthi, *Quantizing deep convolutional networks…* | arXiv:1806.08342 | abstract + body (Tables 2–3, MobileNet per-layer collapse) |
| Jacob et al., *…Integer-Arithmetic-Only Inference* | arXiv:1712.05877 | abstract |
| Howard et al., *Searching for MobileNetV3* | arXiv:1905.02244 | abstract |
| Qin et al., *MobileNetV4…* | arXiv:2404.10518 | abstract |
| Selvaraju et al., *Grad-CAM…* | arXiv:1610.02391 | abstract |
| Wölflein & Arandjelović, *Determining Chess Game State From an Image* | arXiv:2104.14963 | abstract |
| Masouris & van Gemert, *End-to-End Chess Recognition* | arXiv:2310.04086 | abstract |

Four claims were checked in a paper's **body** because the abstract does not carry them, and each
one is load-bearing:

- **SGDR Eq. 5** — the cosine's period is `T_i`, the run length. Confirmed independently by
  PyTorch's own documentation, which cites SGDR and defines `T_max` as the maximum number of
  epochs in a cycle, annealing without restarts. This is the whole basis of the `T_max=epochs`
  finding, so an abstract-level citation would not have been enough.
- **YOLO9000's multi-scale section** — a new input size every 10 batches, drawn from multiples of
  32 between 320 and 608. `--scales` is described in the code as "YOLO-Stil"; now it says where.
- **The quantization whitepaper's Tables 2–3** — MobileNet v1/v2 at 0.001 top-1 under per-layer
  weight quantization against ~0.70 per-channel. The abstract only states the recommendation; the
  numbers are what make it the largest single lever, and the stated cause (batch norm leaving
  wildly different per-kernel ranges within a layer) is also why it should **not** be expected to
  transfer to this GroupNorm model — which is exactly what the milder measurement here shows.
- **Group Normalization's Table 3** — G=32 is the paper's default and GN is reported insensitive
  across G from 64 down to 2. This project caps G at 8 and has never varied it, so the paper is
  the only reason to think the cap is harmless.

## 2. What could not be verified, and why

- **Smith 2018, arXiv:1803.09820** — the abs page serves the abstract and a PDF; there is no HTML
  or ar5iv rendering, and the PDF does not fetch as text with the tools available here. The
  reference is cited at abstract level only and the entry says so. The next person will hit the
  same wall: to use anything specific from this paper (one-cycle, concrete ranges), read the PDF
  by hand. Nothing in this repo currently depends on it.
- **Neal Krawetz's dHash post** — `hackerfactor.com` returns HTTP 403 to this fetcher, on both
  URL forms. The algorithm and the attribution are confirmed from two independent secondary
  sources that name the post (pyimagesearch 2017-11-27 and benhoyt.com), and the described
  algorithm matches `dataset_build.dhash` exactly: greyscale, 9x8, horizontal neighbours, 64 bits.
  Cited with the failure recorded in the entry rather than dropped, because the algorithm's
  properties are the reason perceptual dedup is off by default.
- **LSH banding** — `infolab.stanford.edu` and `mmds.org` were both unreachable (connection
  refused / certificate mismatch), and the VLDB PDF of Gionis-Indyk-Motwani downloaded but could
  not be converted to text here. Broder 1997 is listed with its dblp-verified bibliographic record
  and a note that its text was **not** read, and it is deliberately **not** cited at the code
  site: `dedup_phash`'s pigeonhole argument is proved in place and needs no authority.
- **`3e-4` as a learning rate** — no source. It is folklore, and the search for one is what
  produced §3 below.

## 3. Open questions on learning-rate selection

This is the section to act on. Three separate things are unknown, and they are not equally hard.

**a) Is `3e-4` right for this recipe?** Never tested. The cheap answer is the **learning-rate
range test** (Smith 2015, arXiv:1506.01186): raise the rate linearly over a few epochs and watch
where the loss stops improving and where it diverges. It costs a few epochs, not a sweep, and it
would produce the first evidence-based number this project has had for this constant. Do it before
any sweep.

**b) Every BatchNorm-vs-GroupNorm comparison ran at the GroupNorm recipe's rate.** Bjorck et al.
(arXiv:1806.02375) claim BN's primary benefit *is* tolerating larger rates, and that without
normalization large updates diverge. If that holds here, the comparisons in `specs/25` measured BN
with its advantage removed. Note carefully what this does and does not say:

- It does **not** overturn the GroupNorm decision. The exclusion chain in
  `specs/25-normalization-endgame/STATUS.md` rests on five measured causes, and at least two of
  them (the multi-scale statistic; finished-model statistics) are not learning-rate artefacts.
- It **does** mean no run on record tested BN at a rate BN would need. A proper test is a range
  test per normalizer, then BN at *its* rate against GroupNorm at *its* rate, scored on
  `scripts/sweep_infer_size.py --paths a` like everything else. Anything less is not evidence
  either way.
- Before spending the GPU on it, weigh it against the other pitfall: `val_acc` has ranked runs in
  reverse here, so a BN run that trains beautifully at a higher rate still proves nothing until
  the phantom count is measured.

**c) Should the schedule have a run length at all?** `CosineAnnealingLR(T_max=epochs)` makes the
epoch count part of the optimisation trajectory. Two consequences, both live:

- Runs of different lengths are not comparable, and this repo compares them.
- `--patience` truncates a schedule planned for `epochs`, so an early-stopped run ends at a
  learning rate the schedule never intended to stop at.

The published alternative is schedule-free optimisation (Defazio et al., arXiv:2405.15682), which
needs no stopping time and won the AlgoPerf 2024 self-tuning track; the learning-rate-free line is
D-Adaptation (arXiv:2301.07733) and Prodigy (arXiv:2306.06101). **The caveat is Henheik et al.
2025 (arXiv:2507.01724): comparing these approaches, they conclude such methods often do very well
on selected tasks but are not reliable across settings, and that hyper-parameter optimisation gets
weaker as model and task complexity grow.** So none of them can be adopted on reputation. The
honest framing for this repo: they are candidates to *measure*, at the same cost as any other
candidate, and the veto metric decides.

A cheap intermediate that needs no new dependency: fix `T_max` to a constant independent of
`epochs`, so that run length and schedule stop being the same knob. That is a behaviour change and
therefore out of scope here — noted, not done.

## 4. Decisions with no published basis

Full table in `docs/references.md` §11. The short version: the learning rate, the weight decay
(never set, so PyTorch's AdamW default), the epoch count, the batch size, `max_empty_ratio`,
inverse-frequency class weights (which one paper argues *against*), every augmentation magnitude,
`per_cell_cap`, the phash threshold, `patience`, `occ_board_acc` as the checkpoint metric, the
occupancy reader arithmetic, and the GroupNorm group cap of 8.

Two of these are better off than the rest and should not be lumped in: `per_cell_cap` and the
phash threshold have no citation but do have a measurement on this corpus, which is the stronger
justification. The rest have neither.

The pattern worth naming: **this project's measured results are consistently better documented
than its inherited defaults.** Everything that was ever measured here — the alignment fix, the
dedup discard rate, the resolution finding, the quantization audit — is written down with its
numbers and its date. Everything that arrived as a default has never been questioned in writing at
all. From the outside the two are indistinguishable, which is how a default gets mistaken for a
result.

## 5. Proposed additions to CLAUDE.md's pitfalls

Not applied — that list is curated. Two candidates, both from today:

1. **The cosine schedule is keyed to `--epochs`.** `CosineAnnealingLR(T_max=epochs)` means "the
   same run but longer" is a different optimisation trajectory from the first batch, and a
   plateau in the final epochs may be the cosine floor rather than convergence. Runs of different
   lengths are not directly comparable, and `--patience` cuts a schedule planned for `epochs`.
2. **Every BN-vs-GN comparison on record ran at the GroupNorm recipe's `lr 3e-4`.** Bjorck et al.
   (2018) report that tolerating larger learning rates is BN's primary benefit. The GroupNorm
   decision stands on other measured causes, but no run has tested BN at a rate chosen for BN.

## 6. Bugs and oddities noticed, not touched

Found while reading; none were fixed, per scope.

- **`training/train.py` passes no `weight_decay` to AdamW.** The optimizer is named for decoupled
  weight decay and the run does not set the parameter, so it uses PyTorch's default. Whether that
  is intended is undocumented; the run's `config.json` does not record it either, so no finished
  run can be inspected for what it used.
- **`train.py`'s recorded `config.json` omits the schedule.** It records `epochs` and `lr` but
  nothing about `CosineAnnealingLR` or `T_max`, so a run's trajectory is only reconstructible if
  the reader knows the code version. Every other preprocessing decision *is* recorded there.
- **Indentation oddities in `train.py`.** Three comment blocks are indented eight spaces inside a
  four-space body (before `resumed_from = None`, before `first_row = manifest[0]`, and before
  `best_score = …`). Cosmetic, ruff-clean, left alone.
- **`training/model.py:DecoupledModel.__init__` raises `ValueError` from a bare `except
  Exception`** without `from e`, losing the traceback of a genuine timm failure. Two places, the
  same pattern as `build_model`.
- **Mixed-language docstrings.** `train.py:run_train`, `model.py:_gn_groups`, `FactoredHead`,
  `HierarchicalHead` and parts of `torch_data` are German, while the convention in `CLAUDE.md` is
  English for code, comments and docs. New text added by this spec is English; the surrounding
  German was left as found.
