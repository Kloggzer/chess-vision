# Phase 00 — Does width cost anything on this hardware?

## Why

If the network is overhead-bound rather than compute-bound, then widening it is nearly free in
wall-clock and buys capacity. If it is compute-bound after all, widening costs proportionally and
the whole idea dies. **That question needs no trained weights** — an untrained network has the same
shape, the same exported graph and the same latency as a trained one.

So this phase costs minutes and either justifies a training hour or saves it.

## Design (decided — do not redesign)

Export each candidate **untrained** through the repo's normal path, at 80×80, batch 64, GroupNorm,
2 classes — i.e. exactly the shipped configuration except for the backbone. Then measure on the
device.

### Candidates

Verified present in the installed `timm 1.0.27` (`timm.list_models('mobilenetv4*')` → 12 variants):

| # | backbone | why |
|---|---|---|
| A | `mobilenetv4_conv_small_035` | the shipped baseline, re-measured today, never quoted |
| B | `mobilenetv4_conv_small_050` | the next rung — makes it a curve, not two points |
| C | `mobilenetv4_conv_small` | same topology, **width 1.0** — the direct test of the hypothesis |
| D | `mobilenetv4_conv_medium` | a genuinely bigger model: how far does "width is cheap" hold? |
| E | C with a narrowed head | `conv_head` expands 336 → 1280 at 1×1 spatial for a 2-class decision; measure what removing that expansion costs and buys |

D is included because the user's question is *how expensive bigger models are*, not only whether
0.35 was the wrong rung. If the curve is flat from A to C and then turns steep at D, that inflection
is the most useful single number this pack can produce — it is the capacity budget.

For E, the repo already has the seam: `build_model(..., head="factored"|"twostage")` routes through
`DecoupledModel`, which calls `_create_timm_model(..., num_classes=0)` and attaches its own head on
the probed feature width (`src/chesslab/training/model.py:324-377`). Use that rather than editing
timm's model. If the feature width still comes back 1280, say so — `_timm_feature_dim` documents
that some variants report pre-head and some post-head features.

For C, the repo already has the seam: `build_model(..., head="factored"|"twostage")` routes through
`DecoupledModel`, which calls `_create_timm_model(..., num_classes=0)` and attaches its own head on
the probed feature width (`src/chesslab/training/model.py:324-377`). Use that rather than editing
timm's model. If the feature width still comes back 1280, say so — `_timm_feature_dim` documents
that some variants report pre-head and some post-head features.

### What to report per candidate

1. **Parameters and MMACs per crop at 80×80.** Count MACs with forward hooks on `nn.Conv2d`
   (`k*k * cin/groups * cout * H_out * W_out`), not with a third-party profiler — one number, one
   definition, comparable across candidates.
2. **Exported graph: node count and executing-node count.** They differ: ORT folds `Constant` and
   `Shape` away and XNNPACK *inserts* `Transpose`. Report both and say which is which.
3. **Device latency: median, p10, p90, min, max over ≥ 30 observations**, from a cooled device,
   battery temperature at start and end. The known spread is 2.1x and the known thermal drift is
   32 → 125 ms, either of which can swamp the effect being measured.

### The verdict this phase must reach

Plot latency against MACs across the candidates and answer one question: **is the slope flat?**

- **Flat or gentle** (B costs, say, under ~1.5x of A despite several times the MACs) → the model is
  overhead-bound, capacity is cheap here, **PROCEED** to phase 01.
- **Roughly proportional to MACs** → compute-bound, the hypothesis is wrong, **STOP**. Record it and
  the pack ends. That is a complete result and it closes the last open model-level idea.

## Steps

### 1. `scripts/arch_cost.py` (new) — commit `feat(scripts): parameters, MACs and graph size per backbone candidate`

Desktop only: builds each candidate through `build_model`, counts parameters and MACs at 80×80, and
exports. No device work, no training, no weights loaded.

### 2. Export the candidates and measure on the device — no commit

Take `data/_perf/.device-lock` as `28-00`, release it when the measurements end.

### 3. Report — commit `docs(specs): 28 phase 00 — what width costs on this hardware`

## Tests

`tests/test_arch_cost.py`:

1. `test_mac_count_matches_a_hand_computation` — on a single known `nn.Conv2d`, the counter returns
   `k*k * cin * cout * H_out * W_out`. The whole phase rests on this number being right.
2. `test_candidates_build_at_80` — each candidate forwards `[2, 3, 80, 80]` and returns
   `[2, num_classes]`.

```
.venv/Scripts/python.exe -m pytest -q tests/test_arch_cost.py
.venv/Scripts/python.exe -m ruff check scripts/arch_cost.py
```

## Acceptance criteria

- [ ] A table: candidate × (params, MMACs/crop, graph nodes, executing nodes, latency median/p10/p90).
- [ ] Baseline A **re-measured in this phase's own runs**, not quoted from specs/26.
- [ ] Battery temperature at start and end of every run; each candidate started from a cooled device.
- [ ] An explicit flat-or-proportional verdict with the numbers that support it, and PROCEED or STOP.
- [ ] No weights trained, no checkpoint written, nothing under `data/models/` other than throwaway
      export artefacts clearly named for this phase.

## Do NOT / Out of scope

- Do **not** train. Not one epoch. Untrained latency is the whole point.
- Do **not** measure accuracy — an untrained network has none, and reporting one would be noise
  presented as data.
- Do **not** change the norm, the resolution or the batch. GroupNorm, 80 px, batch 64; all three are
  settled and the pack's `entry.md` says why.
- Do **not** conclude from desktop x64 latency. The phone is attached; x64 has a different
  overhead-to-compute ratio and would answer a different question than the one asked.
