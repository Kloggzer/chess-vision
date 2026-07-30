# Phase 01 — Domain-specific BatchNorm: one statistic per domain, shared weights

## Why

Every BatchNorm run in this project inherits one set of running statistics through a **sequential**
curriculum: synthetic isolates (`p1v4`) → synthetic boards (`p2v4`) → real (`occ-real5nd`). One
statistic is asked to describe three domains, and the real stage sees it only at the end.
GroupNorm has no such state, which is exactly why it transfers at `val_acc` 0.972 from epoch 0
while BatchNorm starts at 0.74.

Domain-Specific BatchNorm (Chang et al., CVPR 2019, `arxiv.org/pdf/1906.03950`) is the literature's
answer to this shape: keep the convolution weights shared, give **each domain its own running
statistics and its own affine parameters**, and train on both domains at once. The shared weights
are forced to learn domain-invariant features because the domain-specific part is already handled
elsewhere. At deployment only the real branch is kept — and it is an ordinary `BatchNorm2d`, so it
folds.

**This only works with JOINT training.** In a sequential chain DSBN degenerates to "reset the
statistics at each stage", which is strictly weaker than phase 00's "estimate them properly before
the stage". The joint loader is therefore not an optional convenience — it is the phase.

> Read phase 00's STATUS row before starting. If 00 reports that a correct warm start does **not**
> move the plateau, the statistics-at-resume mechanism is dead and this phase's expected value
> drops sharply. Record that in `STATUS.md` and ask the orchestrator before spending the GPU.

## Design (decided — do not redesign)

### New file `src/chesslab/training/norm_dsbn.py`

```python
class DomainSpecificBatchNorm2d(nn.Module):
    """One BatchNorm2d per domain, selected by a module-global domain index.

    Weights outside this module are shared; everything domain-specific (running statistics AND the
    affine parameters, as in the paper) lives in `self.branches[d]`. The index is global rather than
    a forward() argument because it must be settable without touching every call site in timm's
    block implementations — the training loop sets it once per batch.
    """

    def __init__(self, num_features: int, domains: int = 2) -> None: ...
    def forward(self, x: torch.Tensor) -> torch.Tensor: ...

    @staticmethod
    def set_domain(model: nn.Module, domain: int) -> None:
        """Point every DSBN in `model` at `domain`. Called once per batch by the training loop."""

    @staticmethod
    def collapse(model: nn.Module, domain: int) -> nn.Module:
        """Replace every DSBN with `branches[domain]` as a plain BatchNorm2d, in place, FOR EXPORT.

        The exported graph must contain no branch selection and no unused statistics — after this
        the model is byte-for-byte an ordinary batch-norm network and folds like one.
        """
```

Branch construction uses `model.batchnorm2d(num_features)` (`model.py:90`), **not**
`nn.BatchNorm2d` directly: on this ROCm box the stock training kernel does not compile and the
factory returns `PrimitiveBatchNorm2d`. `collapse` must call `model.stock_batchnorm` on its result
so the export path gets the real module (`model.py:99-115`).

Domain 0 = synthetic, domain 1 = real. Fixed, documented, never inferred.

### `model.py` — ONE branch, nothing else

Add `"dsbn"` to `_norm_layer` (`:118`) and to the four conversion sites in `build_model` /
`DecoupledModel` (`:344-347`, `:361-364`, `:427-430`, `:436-439`), mirroring how `groupnorm`
dispatches to `_convert_bn_to_gn`. The conversion function itself lives in `norm_dsbn.py`; it must
preserve timm's activation tail exactly as `_gn_replacement` does (`model.py:127-138`) — swapping a
whole `BatchNormAct2d` for a bare norm **deletes the block's ReLU**, and that bug shipped once
already, producing an entire family of models with no nonlinearity.

### `train.py` — the joint loader

Add `--synth-dataset NAME` (default `None`). When set:

- Build a second `SquareDataset`/`PackedSquareDataset` over that dataset's **train** split, with the
  same transform pipeline as the real one.
- Each step draws one batch from each loader. Forward and backward run **twice**, once per domain,
  with `DomainSpecificBatchNorm2d.set_domain(model, d)` before each; the two losses are summed
  before `optimizer.step()`. Do not concatenate the domains into one batch — the whole point is that
  their statistics never mix.
- The synthetic loader is the shorter one per epoch; cycle it, do not extend the epoch.
- Record `synth_dataset` and `domains` in the run's `config.json` next to `norm`.

`--norm dsbn` without `--synth-dataset` is a hard error with a message that says why (sequential
DSBN is meaningless).

### Export

`run_export` (`training/evaluate.py:161`) must call `collapse(model, 1)` before tracing when
`cfg["norm"] == "dsbn"`. The exported `config.json` records `"norm": "batchnorm"` — what ships *is*
a batch-norm model, and every consumer (Android `ModelSpec`, `serving.load_run`) must see the truth.

## Steps

### 1. `src/chesslab/training/norm_dsbn.py` (new) — commit `feat(training): domain-specific batch norm`

Module, conversion function, `set_domain`, `collapse`.

### 2. `src/chesslab/training/model.py` — commit `feat(training): --norm dsbn dispatches to the DSBN converter`

One branch in `_norm_layer` plus the four conversion sites, and one import. Nothing else.

### 3. `src/chesslab/training/train.py` — commit `feat(training): joint synth+real batches for DSBN`

`--synth-dataset`, the two-domain step, the config keys, the hard error.

### 4. `src/chesslab/training/evaluate.py` + `src/chesslab/cli.py` — commit `feat(training): collapse DSBN to the real branch at export`

`collapse` on the export path; `--norm` help text extended; `--synth-dataset` wired through the CLI.

### 5. Train, export, measure — no commit

GPU lock first. Real stage only — the pretrains stay as they are; DSBN's point is that the real
stage sees both domains:

```
.venv/Scripts/chesslab.exe train --dataset occ-real5nd --synth-dataset p2v4 \
    --out data/models/occ-v7dsbn --resume occ-v4bn-p2 --epochs 20 --lr 3e-5 --patience 25 \
    --backbone mobilenetv4_conv_small_035 --norm dsbn --batch-size 256 \
    --scales 48,64,80,96 --loss ce --num-workers 4 --seed 42 2>&1 | tee data/models/v7dsbn.log
.venv/Scripts/chesslab.exe export --run data/models/occ-v7dsbn --format torchscript --infer-size 80x80
.venv/Scripts/python.exe scripts/sweep_infer_size.py --runs occ-v7dsbn --dataset occ-real6 \
    --splits test --sizes 80 --paths a --log data/_perf/v7dsbn_real6.log
```

Resuming a DSBN model from a plain-BN checkpoint will not match every key. Load what matches, seed
**both** branches from the single source statistic, and print how many tensors were adopted — the
control adopted 278.

### 6. Report — commit `docs(specs): 25 phase 01 — DSBN, measured`

## Tests (write, run once, targeted)

New file `tests/test_norm_dsbn.py`:

1. `test_collapse_matches_selected_branch` — a DSBN model in eval mode and its `collapse(1)` result
   produce **identical** logits on the same input (`torch.allclose`, atol 1e-6). This is the export
   contract; if it fails, what ships is not what was measured.
2. `test_domains_keep_separate_statistics` — feed domain 0 and domain 1 batches with deliberately
   different means; assert the two branches' `running_mean` differ and each matches its own input.
3. `test_conversion_preserves_activations` — convert a `timm` block and assert the module tree still
   contains the activation that `BatchNormAct2d` carried (the ReLU-deletion regression).
4. `test_dsbn_without_synth_dataset_errors` — `--norm dsbn` alone raises with a message naming
   `--synth-dataset`.

```
.venv/Scripts/python.exe -m pytest -q tests/test_norm_dsbn.py tests/test_training.py
```

## Acceptance criteria

- [ ] `grep -n "dsbn" src/chesslab/training/model.py` shows **one** dispatch branch, no logic.
- [ ] `data/models/occ-v7dsbn/config.json` has `"norm": "batchnorm"` after export (collapsed) and
      records `synth_dataset`.
- [ ] The exported TorchScript contains no branch selection: `collapse` ran before tracing.
- [ ] `test_collapse_matches_selected_branch` passes — measured model == exported model.
- [ ] Path-A numbers on `occ-real6` recorded in STATUS with the six fields.
- [ ] Scoped `ruff` clean on the four touched files; no `# noqa` added.

## Do NOT / Out of scope

- Do **not** re-run the synthetic pretrains. This phase changes the real stage only.
- Do **not** touch `scripts/sweep_infer_size.py` — frozen, it is the measurement of record.
- Do **not** refactor `model.py`. One branch, one import; phase 02 is editing the same file on
  another branch and the merge must stay trivial.
- Do **not** concatenate synthetic and real crops into one batch. That is plain BN with mixed data
  and it is not what is being tested.
- Do **not** invent a third domain or a domain classifier. Two domains, fixed indices.
