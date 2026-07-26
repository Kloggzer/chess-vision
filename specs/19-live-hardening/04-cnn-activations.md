# Phase 04 — The shipped CNN has no activation functions

## Why

`src/chesslab/training/model.py:32-41`:

```python
def _convert_bn_to_gn(module):
    for name, child in module.named_children():
        if isinstance(child, nn.BatchNorm2d):
            setattr(module, name, nn.GroupNorm(_gn_groups(child.num_features), child.num_features))
        else:
            _convert_bn_to_gn(child)
```

timm's `BatchNormAct2d` **is** an `nn.BatchNorm2d` subclass and it **contains the
activation**. Every replacement therefore deletes a ReLU along with the norm. Verified in the
shipped export: `android/app/src/main/assets/cnn_model/model.onnx` has the op set

```
Add, Constant, Conv, Flatten, Gemm, GlobalAveragePool, InstanceNormalization, Mul, Reshape, Shape
```

— **zero `Relu`**. 30 activations gone. The network's only nonlinearity is GroupNorm's
input-dependent statistics.

This sits upstream of every accuracy number in `specs/18-occupancy-model/`, including the
0.9422 whole-board occupancy figure, and it is a plausible contributor to the piece-type gap
that has been attributed to data. It costs performance three separate ways: ~286 of 337
graph nodes are the GroupNorm decomposition, it **blocks Conv+BN folding** (the single most
valuable optimisation for a conv net), and QNN cannot execute `InstanceNormalization`, which
is why the NPU is 227 ms against the CPU's 97.

The conversion exists as a MIOpen/ROCm-Windows batch-norm crash workaround (`model.py:24,32-35`).

## Design (decided — do not redesign)

### 1. Preserve the activation

`_convert_bn_to_gn` must replace only the NORM. For a `BatchNormAct2d` the result has to keep
`.drop` and `.act`. Two shapes, pick one and say which in `STATUS.md`:

- **(a)** Build an `nn.Sequential(GroupNorm, drop, act)` in its place, or
- **(b)** Mutate the timm module: swap its normalisation behaviour but leave the module
  object (and therefore its `act`) in the tree.

(a) is simpler and more obviously correct; (b) preserves timm's own forward. Prefer (a)
unless you find a reason.

Guard against the general case: the function must work for a plain `nn.BatchNorm2d` (no
activation) exactly as it does today.

### 2. Re-test whether GroupNorm is still needed at all

The workaround targets a MIOpen crash on ROCm-Windows. If BatchNorm now trains, the right
answer is BatchNorm — it folds into the preceding Conv at export, removing ~286 nodes and
unblocking both the CPU and the NPU.

Write a **minimal** probe: build the backbone with `norm="batchnorm"`, run a handful of
forward+backward steps on random data on the ROCm device, and report whether it raises
`miopenStatusUnknownError`. A few hundred steps at batch 8 — **not** a training run.

### 3. Verify the EXPORT, not just the model

The bug was invisible in the Python model and visible in the ONNX. Add a test that exports a
tiny model and asserts the graph contains `Relu` nodes. That is the regression test.

## Steps

1. `src/chesslab/training/model.py` — commit `fix(training): stop deleting timm's activations along with its BatchNorms`
2. `tests/test_training*.py` (find the right file via `grep -rln "_convert_bn_to_gn\|build_model" tests/`) — commit `test(training): the exported graph must contain activations`
3. `specs/19-live-hardening/STATUS.md` — commit `docs(specs): 19 phase 04 — activation fix and the ROCm BatchNorm probe`

## Tests (write, run once, targeted)

- `convertBnToGnKeepsTheActivation` — after conversion, a timm backbone still contains the
  same number of `nn.ReLU` (or the backbone's own activation class) as before. **Prove this
  test red against the current implementation** and report the mutation check — the measured
  before-value is 30 activations, 0 after.
- `convertBnToGnStillHandlesAPlainBatchNorm` — a bare `nn.BatchNorm2d` is still replaced.
- `theExportedGraphContainsActivations` — export a small model to ONNX in a tmp dir, load it
  with `onnx`, assert `Relu` is in the op set. This is the test that would have caught it.

Run once: `.venv/Scripts/python.exe -m pytest tests/test_training.py -q` (adjust the path to
the file you actually extended).

## Acceptance criteria

- `grep -n "BatchNormAct2d\|\.act" src/chesslab/training/model.py` shows the activation is
  explicitly handled.
- The export test asserts on the ONNX op set, not on the PyTorch module tree.
- `STATUS.md` records: which shape (a/b) you chose; the before/after activation counts; and
  the ROCm BatchNorm probe result as a plain yes/no with the error if it failed.
- `ruff check src/chesslab/training tests` clean.

## Do NOT / Out of scope

- **Do not launch a full retrain.** Heavy-compute contract: one worker, minimum size. A short
  convergence probe is in scope; hours of training is not. The retrain is the user's decision
  and needs the clip harness for evaluation.
- **Do not replace the model assets** under `android/app/src/main/assets/cnn_model/`. The
  shipped model stays until a retrained one is evaluated. Phase 01 owns those files.
- Do not change `specs/18-occupancy-model/` numbers. They were measured against the crippled
  network; note in `STATUS.md` that they are now suspect, but do not rewrite them — that is a
  re-evaluation, not an edit.
- Do not touch `src/chesslab/move_tracker/` or `src/chesslab/config.py`.
- Do not run the full `pytest`.
