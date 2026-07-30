# Phase 02 — Normalizer-free: no normalization in the graph at all

## Why

Folding BatchNorm removes 449 nodes and 24 ms per 64 crops. A network that never had a
normalization layer removes them too — and brings no running statistics, hence none of the
synthetic-to-real transfer failure that killed every BatchNorm run in this project.

Scaled Weight Standardization (Brock et al., `arxiv.org/pdf/2101.08692`,
`arxiv.org/pdf/2102.06171`) standardizes the **weights** rather than the activations. The
standardization is a function of the weights alone, so it is computed once offline and baked into
the exported tensor; at inference the layer is a plain convolution. SkipInit (Fixup's simpler
sibling, `arxiv.org/pdf/2002.10444`) adds one learnable scalar at the end of each residual branch,
initialized to zero, which is what BatchNorm was implicitly providing — it biases residual blocks
toward the identity at initialization and is what makes deep nets trainable without a norm.

This is strictly better than a folded BatchNorm if it reaches the accuracy. The honest caveat, from
the same papers: normalizer-free ResNets matched their BN counterparts only **with added
regularization** (stochastic depth, dropout), and the published results are ResNet/RegNet-scale.
Nobody has shown it for a 0.6 M-parameter MobileNetV4 on 14-class square crops. A negative result
here is informative and is a complete deliverable.

`timm 1.0.27` is installed in `.venv` and already ships `timm.layers.ScaledStdConv2d` and the
`timm.models.nfnet` module — verified 2026-07-30. Do not vendor an implementation.

## Design (decided — do not redesign)

### New file `src/chesslab/training/norm_nf.py`

```python
def convert_to_normalizer_free(module: nn.Module, gamma: float = 1.7139) -> nn.Module:
    """Replace every Conv2d with ScaledStdConv2d and delete every norm, KEEPING the activations.

    `gamma` is the activation-specific gain that restores unit variance through the nonlinearity;
    1.7139 is the published value for ReLU (`arxiv.org/pdf/2101.08692`, Table 1). It is a property
    of the activation, not a tunable — if the backbone's activation is not ReLU, look the value up
    rather than guessing.
    """


def add_skip_init(module: nn.Module) -> int:
    """Insert a zero-initialized learnable scalar at the end of each residual branch.

    Returns how many were inserted, so the caller can FAIL LOUDLY on zero: a silent no-op here
    produces a network that trains badly for reasons nobody will find.
    """
```

**The activation trap.** timm's `BatchNormAct2d` *is* an `nn.BatchNorm2d` subclass and carries the
block's activation in `.act` (preceded by `.drop`). Replacing the whole module with `nn.Identity`
deletes the nonlinearity — that exact bug shipped in this repo and produced every model in
`specs/18`'s accuracy table with **zero ReLU nodes**. Mirror `_gn_replacement`'s handling
(`model.py:127-138`): keep the tail, drop only the normalization.

**Weight transfer.** `ScaledStdConv2d` subclasses `nn.Conv2d`, so copy the existing `weight`/`bias`
into it rather than re-initializing — the pretrain chain is worth keeping if it transfers. Verify by
asserting the state-dict keys match before and after conversion apart from the added scalars.

### `model.py` — ONE branch, nothing else

Add `"nf"` to `_norm_layer` (`:118`) and the four conversion sites (`:344-347`, `:361-364`,
`:427-430`, `:436-439`), dispatching to `norm_nf.py`. Phase 01 is editing the same lines on another
branch; keep the diff to that branch plus one import so the merge is mechanical.

### Training

Normalizer-free networks are **learning-rate sensitive** — the published work reduced the LR to
train Fixup/SkipInit stably. Run the full three-stage chain (the pretrains carry BatchNorm and
cannot be reused as-is; the conversion changes the architecture):

```
BASE="--backbone mobilenetv4_conv_small_035 --norm nf --batch-size 256 \
      --scales 48,64,80,96 --loss ce --num-workers 4 --seed 42 --patience 25"
chesslab train --dataset p1v4    --out data/models/occ-v7nf-p1  --epochs 20 --lr 1e-4 $BASE
chesslab train --dataset p2v4    --out data/models/occ-v7nf-p2  --resume occ-v7nf-p1 --epochs 20 --lr 5e-5 $BASE
chesslab train --dataset occ-real5nd --out data/models/occ-v7nf-f5nd --resume occ-v7nf-p2 --epochs 20 --lr 3e-5 $BASE
```

The learning rates are **one third of the champion's** (3e-4 / 1e-4 / 3e-5, `scripts/run_v6_lowres.sh`)
for exactly the reason above. If stage 1's loss diverges or plateaus above 1.0, halve the LR once
and record both attempts in `STATUS.md` — that is the one permitted deviation from the
heavy-compute contract, and it needs a STATUS note.

Copy `scripts/run_v6_lowres.sh` to `scripts/run_v7nf.sh` rather than typing three commands by hand.

## Steps

### 1. `src/chesslab/training/norm_nf.py` (new) — commit `feat(training): normalizer-free conversion (ScaledStdConv + SkipInit)`

### 2. `src/chesslab/training/model.py` — commit `feat(training): --norm nf dispatches to the normalizer-free converter`

### 3. `scripts/run_v7nf.sh` (new) — commit `chore(scripts): the normalizer-free chain`

### 4. Train the chain, export, measure — no commit

GPU lock for the whole chain (three stages, ~1 h), released once at the end.

```
.venv/Scripts/chesslab.exe export --run data/models/occ-v7nf-f5nd --format torchscript --infer-size 80x80
.venv/Scripts/python.exe scripts/sweep_infer_size.py --runs occ-v7nf-f5nd --dataset occ-real6 \
    --splits test --sizes 80 --paths a --log data/_perf/v7nf_real6.log
```

### 5. Report — commit `docs(specs): 25 phase 02 — normalizer-free, measured`

Report the node count of the exported graph alongside the accuracy — that is this phase's second
deliverable and the reason it exists. Compare against the two known figures: 573 nodes / 30.6 ms
(GroupNorm) and 124 nodes / 6.5 ms (folded BatchNorm).

## Tests (write, run once, targeted)

New file `tests/test_norm_nf.py`:

1. `test_conversion_preserves_activations` — after conversion the module tree still contains the
   activations that `BatchNormAct2d` carried. **Prove it red first**: assert it fails against a
   naive "replace the whole module with Identity" implementation, and say so in the report.
2. `test_no_norm_layers_remain` — no `nn.BatchNorm2d`, `nn.GroupNorm` or `nn.InstanceNorm*` anywhere
   in the converted tree.
3. `test_weights_transferred` — a converted conv's `weight` equals the original's.
4. `test_skip_init_inserted` — `add_skip_init` returns > 0 on the real backbone and each scalar is
   initialized to zero.
5. `test_forward_shape` — a converted model returns `[N, len(classes)]` at 48, 64, 80 and 96 px
   (the model must stay size-agnostic).

```
.venv/Scripts/python.exe -m pytest -q tests/test_norm_nf.py tests/test_training.py
```

## Acceptance criteria

- [ ] `grep -rn "BatchNorm\|GroupNorm" ` over a converted model's `named_modules()` output is empty
      (assert it in `test_no_norm_layers_remain`, not by hand).
- [ ] `add_skip_init` returned a non-zero count on `mobilenetv4_conv_small_035` — recorded in STATUS.
- [ ] The exported graph's node count is recorded next to the accuracy.
- [ ] Path-A numbers on `occ-real6` recorded in STATUS with the six fields.
- [ ] Scoped `ruff` clean; no `# noqa`; `vulture` finds nothing new in the two new files.

## Do NOT / Out of scope

- Do **not** reuse `occ-v4bn-p2` or `occ-v6-p2` as a resume parent. The architecture differs; a
  partial adoption would silently produce a hybrid nobody can interpret.
- Do **not** add stochastic depth or dropout in the first attempt. The papers needed them at
  ResNet-288 scale; adding them here confounds the one variable this phase is testing. If the chain
  underfits, say so — a second run with regularization is a separate decision.
- Do **not** touch `scripts/sweep_infer_size.py` or `train.py`. This phase needs no training-loop
  change; if you believe it does, STOP and record the blocker.
- Do **not** refactor `model.py` — phase 01 is editing the same lines on another branch.
- Do **not** benchmark on the device. The node count comes from the exported graph; the ms figures
  in the comparison were measured previously and are quoted, not reproduced.
