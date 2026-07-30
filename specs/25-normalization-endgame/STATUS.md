# STATUS — 25 normalization endgame

Branch per phase, cut from the pack commit (`2120406` on `spec-24-frame-the-board`), NOT from
`main`: `spec-25-00-warm-start`, `spec-25-01-dsbn`, `spec-25-02-normalizer-free`.

**The pack is CLOSED. All three phases landed negative and the question is settled: GroupNorm ships,
and the speed is not in the normalization.** Do not reopen any of the three without new evidence —
what each one excluded is recorded below.

## Phases

| Phase | Concern | State | Result |
|---|---|---|---|
| 00 | Precise-BN warm start: real statistics before the finetune | **done** | 154 phantoms — 4.3x better than the control, 154 worse than the champion |
| 01 | DSBN: joint synth+real training, one statistic per domain | **done** | 356 phantoms — the strong form of 00's lever is *worse* than the weak one |
| 02 | Normalizer-free: ScaledStdConv2d + SkipInit | **done** | 267 phantoms / 326 misses — underfits; but 99 graph nodes |

## Results — path A, `occ-real6` test (110 boards / 7 040 crops / 2 353 occupied), 80 px

| Run | Mechanism | Phantoms | Misses | Anchor · Phone | Margin p99.9 / max | epoch 0 → plateau `val_acc` |
|---|---|---:|---:|---|---|---|
| `occ-v6-f5nd` | **GroupNorm — the champion** | **0** | 11 | 9/0 · 2/0 | **0.238 / 0.343** | 0.972 → 0.987 |
| `occ-v7bn-warm` | BN, statistics corrected once (00) | 154 | 69 | 26/110 · 43/44 | 0.951 / 0.973 | 0.7018 → 0.9453 |
| `occ-v7nf-f5nd` | Normalizer-free (02) | 267 | 326 | 208/152 · 118/115 | 0.909 / 0.933 | — → 0.805 |
| `occ-v7dsbn` | DSBN, a statistic per domain (01) | 356 | 52 | 18/303 · 34/53 | 0.971 / 0.983 | **0.8457** → 0.9486 |
| `occ-v6bn2-f5nd` | BN, sequential, no correction (control) | 660 | 44 | 21/530 · 23/130 | 0.972 / 0.994 | 0.7409 → 0.9258 |

Exported graph size at 80 px: **99 nodes** normalizer-free, **124** folded BatchNorm, **503**
GroupNorm (the champion, measured — the often-quoted 573 is the 128 px v4 graph).

## What is now excluded — do NOT re-run any of this

Each line is a measurement, not an argument.

1. **The data.** `occ-v6bn2-f5nd` trained on `occ-real5nd`, the exact corpus that produced the
   champion → 660 phantoms.
2. **The scale band.** The champion's `--scales 48,64,80,96` gave BatchNorm 660 phantoms.
3. **The statistics of the finished model.** AdaBN on `occ-v6bn2-f5nd`: shift only 0.034 σ, and
   installing the corrected statistics made it **worse** (660 → 1140, margin 1.000/1.000).
4. **Statistics at resume, weak form.** Phase 00: correcting them once moved phantoms 660 → 154 but
   moved neither the start (0.7018, *below* the control's 0.7409) nor the plateau.
5. **Statistics at resume, strong form.** Phase 01: keeping the domains' statistics apart for the
   whole run, from a total warm start (508/508 tensors adopted vs the control's 278/278), lands at
   **356** — between the control and the cheap one-shot fix. Whatever the 660 → 154 improvement was,
   it was **not** "keeping the domains apart", because doing that properly is worse.
6. **Removing normalization entirely.** Phase 02: the speed premise held completely (99 nodes, all
   30 ReLUs intact, SkipInit inserted 10 scalars) and the accuracy did not — `val_acc` plateaus at
   0.805. Stage 1 converged smoothly with no divergence, so the reduced learning rates were not the
   constraint. This is the papers' own caveat reproduced: normalizer-free matched BatchNorm only
   with added regularization and at ResNet scale.

**Residual, unexplained:** the BatchNorm real-finetune plateaus at `val_acc` 0.93–0.95 where
GroupNorm reaches 0.987, and nothing about statistics, data, or scale explains it. It is in the
convolution weights. Nobody has a mechanism for it, and this pack stops rather than guessing again.

## The lesson that cost the most: `val_acc` does not predict the veto metric

Not weakly — it ranked these runs in **reverse**. `occ-v7dsbn` had the best start of any BatchNorm
run in this project (epoch 0 **0.8457** against 0.7409 and 0.7018) and the best plateau (0.9486), and
produced **2.3x** phase 00's phantoms. Earlier the same day, `occ-v4bn-f3` reached `occ_acc` 0.982 in
training and 154 phantoms on test.

Only `scripts/sweep_infer_size.py --paths a --dataset occ-real6` decides anything. A conclusion
drawn from a training log is not a result.

## Traps this pack hit — each cost a run or nearly did

| Trap | What happens | Fix |
|---|---|---|
| `--patience` keyed to `occ_board_acc` | The metric needs all 64 squares right; at `val_acc` 0.93 that is 0.93^64 ≈ 1 %, i.e. structurally 0. A model that has not converged is early-stopped **and** its checkpoint chosen blindly ("best by occ_board_acc=0.0000"). Killed `occ-v6bn-f5nd` at epoch 9/20. | `--patience 25` on every run below `val_acc` 0.98 |
| Worktree trains the wrong source | A `git worktree` has no `data/` (gitignored) and no `.venv`, and the editable install makes `chesslab.exe` execute the **main** checkout's `src/`. An agent writes its own code and trains the old code — plausible, green, meaningless. | Junction `data/`, set `PYTHONPATH`, and **verify `chesslab.__file__` points into the worktree** before training |
| Branch cut from `main` | `main` has neither this pack nor `scripts/adabn_recalibrate.py`, and its `sweep_infer_size.py` has no `--dataset`. The mandated measurement command fails outright. | Cut from the pack commit |
| Rewriting only `config.json` at export | Every consumer rebuilds from the config and then loads `best.pt` **strictly**. A collapsed-norm run whose checkpoint was not rewritten is loadable by nothing, including the measurement script. Found by phase 01 before it cost a GPU hour. | `collapse_run` rewrites the checkpoint too; originals parked as `best.dsbn.pt` |
| `timm.layers.ScaledStdConv2d` on ROCm-Windows | Its `forward` standardizes the weight through `F.batch_norm(training=True)` — the MIOpen kernel this wheel cannot compile. One 32→64 conv did not return in 17 minutes. | `norm_nf.PrimitiveScaledStdConv2d`, same move as `model.PrimitiveBatchNorm2d` |
| `momentum=None` on `PrimitiveBatchNorm2d` | Reads as 0.1, not the cumulative average `nn.BatchNorm2d` gives. Statistics silently become an EMA. | Accumulate statistics explicitly (`adabn_recalibrate.py` does) |

Corrected pack errors: `resumed_from` **is** recorded in every `config.json` (the original claim
queried the key `resume`); the control's epoch-0 `val_acc` is 0.7409, not 0.7357 (that belonged to
the patience-killed run); `p2v4` is the **longer** loader, not the shorter; `evaluate.py` was missing
from the ownership registry and both 01 and 02 touched it.

## Where the speed actually is — under a hard quality floor

**Read this before the list.** This pack spent a day looking for speed and its one "success" was a
99-node graph attached to a model with 267 phantoms. That is not a result, it is a warning: a
decision made in 3 ms that could have been made with `random()` is worth nothing. **Quality is the
constraint, speed is the objective underneath it** — the reverse framing is what produced the
normalizer-free row.

The floor is the champion: **0 phantoms and margin ≤ 0.343** on `occ-real6` test at 80 px. Anything
that does not hold it is rejected however fast it is. Better quality is welcome and may cost time;
worse quality is not purchasable at any speed.

Everything below is **quality-neutral by construction** — the same weights, the same crops, the same
arithmetic — which is exactly why it is the list worth working. From the device logs:
`CNN observation 80 ms for 64 crops = 2 prep + 77 session`,
i.e. 1.2 ms per crop, and the graph is traced at a **fixed batch of 64**
(`training/evaluate.py:132`), with the Android classifier contracted to exactly 64 crops
(`core-cnn/SquareClassifier.kt:12`).

1. **Verify needs 4 crops, not 64.** A move hypothesis touches an origin and a destination square.
   Inference is linear in the batch, so ~8 % of the cost — 77 ms becomes single digits. The verify
   window counts in observations, so this is the wall clock between "moved" and "recognised". No
   training, no accuracy risk. Bigger than the 5.3x the fold would have bought, and far cheaper.
2. **Is the model even on the NPU?** 503 nodes for a 0.6 M-parameter network is a lot, GroupNorm
   exports as an `InstanceNormalization` decomposition, and nobody has logged the QNN partition. If
   half the graph falls back to the CPU, that is the 77 ms — and it is the real answer to "make
   GroupNorm faster". Costs nothing to measure.
3. **The 2.3x variance** (70–165 ms for identical work) is not a model property. Thermal throttling
   or contention with the camera path.

## Session log

| Date | Phase | What happened |
|---|---|---|
| 2026-07-30 | — | Pack written. Before it: BatchNorm excluded on data, scale band and finished-model statistics. |
| 2026-07-30 | 00 | 154 phantoms. Warm start does not move start or plateau but moves phantoms 4.3x. Recommended "reconsider" for 01. |
| 2026-07-30 | 02 | 267 phantoms / 326 misses, 99 nodes. Underfits. Found `ScaledStdConv2d` unusable on this box; needed an export hook in `evaluate.py`. |
| 2026-07-30 | 01 | Built and verified the mechanism, withheld the run, asked. Orchestrator said train. 356 phantoms — worse than 00. Found the export/checkpoint defect. |
