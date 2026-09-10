# Training loader and metrics (2026-09-10)

CPU augmentation remains unchanged. `--epoch-frac` still controls sampler draws.
The training loader defaults to its existing worker count; validation now uses
`--eval-workers 2`, independently. Both use `--prefetch-factor 2` (formerly 4).
For example, add `--num-workers 10 --eval-workers 2 --prefetch-factor 2` to an
existing recipe to allocate more processes to training while retaining fewer
processes overall than the former 8+8 configuration. Measure throughput before
increasing further; this is not a measured optimum.

`t_data_s` measures wall time waiting for the training iterator, including its
first batch. It is part of `t_train_s`, not an additional duration. Use it to
check whether more workers actually improve data delivery.

## Metrics schema 2

Occlusion runs retain losses, visible piece accuracy, visible occupancy accuracy,
visible board accuracy, visible occupancy board accuracy, coverage MAE and
precision/recall, confidence on errors and confidence AUROC, learning rate and
timing. Unmasked identity/board metrics and redundant aggregates are omitted.
Full standalone evaluation remains available. Historical JSONL files are unchanged.
Board validation loss now counts crops in both numerator and denominator; old
board losses were inflated by 64. Do not compare old and new loss values directly.

`best.pt` selects the actual epoch with highest visible piece accuracy, with
visible occupancy and confidence AUROC as tie breakers. `best_piece.pt` retains
the first epoch reaching that accuracy. Early stopping follows this ordering,
without averaging scores across different checkpoints. Resume state is written
after checkpoint selection and patience updates.

New runs require a fresh output directory. `--continue` requires a compatible
checkpoint policy; old state files cannot be continued under the new policy.
Use a new output directory for the changed recipe. Existing artifacts are never
rewritten to migrate their metrics or checkpoint scores.

These changes address memory use, reporting and checkpoint selection. They do
not establish that BatchNorm causes the observed validation fluctuations, nor
do they change normalization or promise a higher accuracy ceiling.

## Throughput measurements

On the packed `real13-mix-v6-80` training boards, warm-cache feed throughput was:

| workers | old CPU path | optimized CPU path | worker private memory |
|---:|---:|---:|---:|
| 4 | 6,239 | 6,941 crops/s | 2.4 GiB |
| 8 | 9,202 | 10,578 crops/s | 4.6 GiB |
| 12 | 11,179 | 13,094 crops/s | 6.9 GiB |

The fast path keeps torchvision's operation order, values and random-number
consumption. It removes temporary CPU tensors and repeated normalization
constants; tests compare pixel/tensor output and both RNG states.

An isolated GPU step processed about 8,450 crops/s, with a per-step `loss.item()`
synchronization still present in the benchmark. This is a baseline for that
implementation, not a hardware compute ceiling. With eight workers and
overlapped host-to-device copies the measured pipeline reached about 7,819
crops/s, with only 0.035 s of data wait over the measured window. This means
the loader was no longer the dominant limit in this warm-cache measurement;
the benefit of twelve workers for the full training loop is not established. The training loop now
prefetches the next pinned batch on a separate CUDA stream and accumulates the
loss on-device, removing a per-batch synchronization from the hot path.

## GPU layout experiment

On RX 7900 XT, PyTorch 2.9.1 / ROCm 7.2.1, `boardattn:cellnet_p4`,
80-pixel inputs and 256 crops per step, the optional `--channels-last` flag
improved a warm, 120-step end-to-end benchmark from 7,900 crops/s (8 workers)
to 8,205 (8 workers) or 8,256 (6 workers). Six workers used about 3.4 GiB
private memory versus 4.6 GiB with eight. These short measurements exclude
validation, startup and checkpoint writing; they are not full-epoch forecasts.
The resident-input benchmark improved from 8,553 to 9,030 crops/s.

The flag changes tensor storage, preserving the CPU augmentation recipe.
For the saved p4a-v6-s42 model, 12 comparisons (1–4 boards, three seeds each)
produced exactly equal outputs, losses, parameter gradients and BatchNorm
buffers. This validates the measured model and stack, not every architecture.
The default remains off. Try `--channels-last --num-workers 6` with this recipe.

GPU event measurements placed forward/loss near 4.4 ms, backward near 20 ms,
and optimizer/scaler near 1.2 ms. Native BatchNorm was faster but changed
outputs/gradients; it was not adopted. Graph replay and convolution autotuning
did not improve the isolated forward/backward test. Fused AdamW changed
parameters slightly and saved too little total step time to adopt here.
Reproduce the isolated comparisons with `scripts/profile_training_gpu.py
--experiments`; use `scripts/benchmark_training_feed.py --gpu --channels-last`
for the complete feed comparison.

## Isolated Triton probe

`triton-windows==3.5.1.post24` was installed with `uv pip --target` into
`tmp/triton-probe`; the pinned training environment was not modified. With
`PYTHONPATH` pointing there, `CC` pointing to its bundled
`triton/runtime/tcc/tcc.exe`, and `ROCM_HOME` pointing to the existing
`.venv/Lib/site-packages/_rocm_sdk_devel`, Triton detected HIP/gfx1100.
A compiled elementwise smoke test passed with exactly equal output.

The actual model probe (`scripts/profile_training_gpu.py --compile-test`)
failed in Triton's AMD compilation pass with `PassManager::run failed`.
There is consequently no measured compiled-model speedup or quality result on
this stack. A newer matched stack (PyTorch 2.13 / ROCm 10 / Triton 3.7) does
compile the model; it is installed beside this one and measured in
`docs/training-stack-spike.md`. Nothing on the pinned stack changed.
