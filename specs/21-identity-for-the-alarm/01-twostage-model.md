# Phase 01 — One backbone, two heads: occupancy that does not regress, identity that can be trusted

> **Depends on phase 00.** Do not start before its verdict is `GO` or `GO WITH A HIGHER THRESHOLD`.
> On `STOP`, this phase does not exist.

## Why

Two models would mean two forward passes. The CNN observation currently costs **44–70 ms** on the
device (measured 2026-07-28, XNNPACK, 64 crops), and the verify window is counted in observations —
doubling it doubles the time the tracker is blind. One backbone with two heads costs one pass.

`model.py:373` already builds it:

```python
self.head = HierarchicalHead(feat_dim, classes) if head == "twostage" else FactoredHead(feat_dim, classes)
```

`--head twostage` is a two-stage **occupancy → piece** head. That ordering is the point: occupancy is
the reliable axis and stays the trunk decision; identity is conditioned on it.

## Design (decided — do not redesign)

Train **one** run, `occ-id-<date>`, on `occ-real3` with the 14 classes, `--head twostage`, warm-started
from the matching pretrain, using the recipe that produced the shipped model wherever it does not
conflict:

```
--dataset occ-real3 --classes pieces --head twostage --scales 32,64,96,128
--backbone mobilenetv4_conv_small_035 --norm groupnorm --epochs 20 --batch-size 256
--lr 3e-05 --erase-p 0.25 --bg-p 0.15 --loss ce --num-workers 4 --seed 42
```

Note `--classes pieces`: `occ-real3` was built with `class_mode=occupancy`, which **collapses** the
labels at build time. A 14-class run needs the dataset built with `--classes pieces` over the same
session list. Build it under a new name (`id-real3`), never in place — a dataset is a snapshot and
`occ-real3` is the shipped model's baseline (`docs/data-pipeline.md` §5.9).

**Warm start:** `--resume` from a run whose norm and head match. If none exists, say so and start from
the synth pretrain that does (`p1-isolate` / `p2-boards` are 14-class). Record which and why —
warm-starting a GroupNorm run from a BatchNorm one collapses training (MEMORY:
`per-cell-cap-is-the-real-filter`).

## The acceptance bar — occupancy first, identity second

**Occupancy must not regress.** Derive occupancy from the 14-class output as `label != "empty"` and
compare against `occ-r3s-f3` on the same real holdout (9,728 crops, sessions `20260708-021722` and
`20260721-212830`):

| | occ-r3s-f3 (shipped) |
|---|---|
| per-square | 0.9727 |
| misses / phantoms | 95 / 171 |

A candidate is acceptable only if per-square is **within 0.005** and — this is the one that matters —
**misses do not increase**. A miss licenses a fabricated capture and cascades; that is the whole
lesson of the 2026-07-28 runaway (MEMORY: `occupancy-miss-vs-phantom`). Prefer errors in both
directions over a model that piles them into the miss direction, whatever the headline says.

**Identity must clear phase 00's bar** at the threshold phase 00 named.

Also run the 18-clip harness for both models and report it, stating in the same sentence that a clip
number is a pessimistic lower bound (31 px/square) and never a forecast.

## Steps

### 1. `chesslab dataset build id-real3 --sessions <the 20 of occ-real3> --classes pieces …` — commit `feat(dataset): id-real3, the 14-class view of occ-real3's sessions`
Read `occ-real3/dataset.yaml` for the exact session list and dedup/split params; keep them identical
so the only difference is the class mode.

### 2. Train — commit `feat(model): occ-id, one backbone with occupancy and identity heads`
ONE run. ONE worker at `--num-workers 4`. Hold `data/models/.train.lock`.

### 3. Evaluate — commit `docs(specs): 21 phase 01 — occupancy held, identity measured`
Both tables above, into STATUS.md.

## Tests

No new production code, so no new unit tests. The measurement **is** the deliverable, and it must be
reproducible: commit the evaluation script under `scripts/` if you wrote one worth keeping.

## Acceptance criteria

- `occ-r3s-f3` is untouched: `git status` shows no change under `data/models/occ-r3s-f3/`.
- STATUS.md carries per-square, misses, phantoms for both models on the SAME holdout, plus the
  identity table at phase 00's threshold.
- If occupancy regressed or misses rose: **say so and stop.** A model that reads pieces but loses
  squares is worse than silence, and this pack does not ship it.

## Do NOT / Out of scope

- Do not touch `android/**` — that is phase 02.
- Do not overwrite `occ-real3` or `occ-r3s-f3`.
- Do not train more than one run to "see what happens". If the first misses the bar, report the gap
  and propose the single next change with its reasoning.
- Do not export yet.
