# specs/31 — cite what we rely on

> **Status:** open. One phase, one agent, one branch.
> **Owner branch:** `spec-31-citations`, cut from `spec-24-frame-the-board` (NOT from `main` —
> `main` is 45 commits behind and has none of the current work).

## Why

This codebase makes a lot of decisions that are really claims about how neural networks behave, and
almost none of them say where the claim comes from. Some are load-bearing, some were inherited
defaults nobody chose, and from the outside they are indistinguishable — which is exactly how a
default gets mistaken for a result.

Two examples found on 2026-07-31, both of which changed what we did next:

- `training/train.py` uses `CosineAnnealingLR(T_max=epochs)`. That couples the schedule to the epoch
  count, so "the same run but longer" is not the same run at all — a 60-epoch and a 200-epoch run
  are different optimisation trajectories, and a plateau near the end of a run may be the cosine
  floor rather than convergence. Nothing in the file says this.
- BatchNorm has been evaluated throughout at `lr 3e-04`, a rate inherited from the GroupNorm recipe.
  Bjorck et al. (2018) report that BN's primary benefit *is* tolerating larger learning rates. So
  every BN-vs-GN comparison on record may have been run under a setting that removes BN's advantage.
  Nothing in the file says that either.

The job is to make the difference visible: where a choice rests on published work, cite it; where it
does not, say so plainly.

## The one rule that matters

**Every citation must be fetched and verified in this session before it is written down.** Record
the exact title, the author list, the year and the arXiv (or DOI) identifier as they appear on the
source page. If a paper cannot be retrieved and confirmed, **do not cite it** — write "no source
verified" instead. A fabricated or misattributed reference is far worse than an honest gap, and this
repo would carry it forever.

Where a claim is summarised, it must be a claim the abstract or body actually makes. Do not upgrade
"is associated with" into "causes". If only the abstract could be read, say so — the entry for
`1803.09820` should record that its PDF does not fetch as text, because the next person will hit the
same wall.

Do not reproduce more than a short phrase from any paper. Summarise in your own words.

## Scope

**In scope — documentation only. No behaviour changes.**

1. **`docs/references.md`** (new) — the bibliography. One entry per work: exact title, authors,
   year, link, and two or three lines on *what this project takes from it*. Group by topic
   (normalization, learning rate and schedules, multi-scale/resolution, class imbalance, dedup and
   augmentation, quantization and deployment). This file is the single place a reference lives; code
   comments point at it rather than repeating it.

2. **Docstrings and comments at the decision sites.** Find the places where the code encodes a
   published idea and add a short pointer — one sentence plus a `docs/references.md` anchor. Do not
   turn source files into essays; this repo's convention is that comments explain *why*, and a
   citation is a why. Known starting points, not an exhaustive list — go and look:
   - `training/train.py` — AdamW, the cosine schedule and its `T_max` coupling, multi-scale
     `--scales`, class weighting, focal loss, the augmentation knobs (`erase_p`, `bg_p`)
   - `training/` normalization handling — GroupNorm vs BatchNorm, `PrimitiveBatchNorm2d`
   - `training/quantize.py` — per-channel vs per-tensor weight quantization
   - `dataset_build.py` — perceptual hashing (dhash), the empty-class cap
   - `torch_data.py` — the augmentation pipeline

3. **The open questions, written down where they can be acted on.** Add to
   `specs/31-cite-what-we-rely-on/STATUS.md`: what the literature says about picking a learning rate
   (the LR range test), about learning-rate-free and schedule-free optimizers, and the caveat that a
   2025 comparison finds none of them reliable across settings. Enough that the next person can
   decide, not a literature survey for its own sake.

**Out of scope — do not touch:**
- Any behaviour. No new flags, no changed defaults, no "while I was there" fixes. If you find a bug,
  write it in STATUS.md and leave it.
- **Do not run training, export or any GPU work.** A learning-rate sweep is running on the single
  GPU for the whole of your task and a second run would fail on the lock, or worse, win the race.
- `data/` is gitignored — never commit anything under it, never delete anything there.
- `CLAUDE.md`'s pitfalls list is curated and load-bearing; propose additions in STATUS.md rather than
  editing it.

## Places where this repo already got it right

`docs/data-pipeline.md` and the pitfalls in `CLAUDE.md` are the standard to match: a claim, the
measurement behind it, the date, and what it invalidates. Read a few sections before writing
anything — the register is plain declarative prose, no hedging, no marketing, and a negative result
is stated as plainly as a positive one.

Memory of past reference-gathering that should be folded in rather than re-derived: the
multi-resolution training decision was taken with YOLOv2, Once-for-All, FixRes and EfficientNet in
mind, and the transfer-learning direction was rejected on a geometry argument. Those belong in
`docs/references.md` with their sources verified like everything else.

## Deliverable

1. `docs/references.md`, every entry verified.
2. Pointers at the decision sites in the code.
3. `specs/31-cite-what-we-rely-on/STATUS.md` — what you cited, what you could NOT verify and why,
   which decisions turned out to have no published basis at all (that is a finding, not a failure),
   and the open questions from §3 above.
4. A line in `README.md` or `CLAUDE.md`'s conventions pointing at `docs/references.md` so it is
   findable.

## Gates

```
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m ruff check src scripts tests
.venv/Scripts/python.exe -m vulture
```

`uv run` fails while the web server holds the venv; use `.venv/Scripts/python.exe -m …`. All three
green before you report done. Commit on your branch; do not merge.
