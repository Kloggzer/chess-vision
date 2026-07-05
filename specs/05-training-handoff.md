# Stage 5 — Training Handoff (`training/`)

## Purpose

Train a per-square classification model (13 classes) on the dataset,
evaluate it meaningfully and export it — runnable on the **AMD Radeon RX 7900 XTX
via ROCm**. The model is the actual deliverable artifact for the downstream inference app.

## GPU Prerequisite (ROCm)

- **Before every training run** invoke the GPU validation path from Stage 0
  (`doctor --gpu` logic). If the GPU is not usable -> **abort with a clear message**,
  **do not** silently fall back to CPU.
- Obtain the device handle via the normal `torch.cuda` API (`device = "cuda"`). Under the
  ROCm build this is correct and addresses the Radeon GPU.
- AMP/`torch.autocast` with `device_type="cuda"` is usable on RDNA3; if instability
  occurs, make it switchable via the `--no-amp` flag. `channels_last` can help, optional.
- 24 GB VRAM is plentiful for a small CNN with 96x128 crops -> generous batch sizes
  possible (default e.g. 256, adjustable via `--batch-size`).

## Model (`training/model.py`)

Two selectable backbones, same 13-class head:

1. **`smallcnn` (Default):** compact Conv net (e.g. 4–5 Conv blocks with BatchNorm +
   ReLU, GlobalAvgPool, Linear -> 13). Fast, usually sufficient for the task.
2. **`mobilenet_v3_small`:** torchvision backbone, head replaced for 13 classes.
   Optional ImageNet weights as starting point (fine-tuning).

Input: `out_size` from the dataset (e.g. 96x128, H>W). Document normalization and use
it **identically** for train/eval/export (the inference app must mirror it).

## Data (`training/data.py`)

- Reads `data/manifests/squares.jsonl` + `data/manifests/split.json`, filters crops by
  session membership of the respective split.
- Augmentation **on train only**, according to the policy from Stage 4 (brightness/contrast/gamma,
  light blur, small jitter; **no** flip/rotation). Val/Test only Resize+Normalize.
- Pass class weights from `split.json` to the loss; alternatively `WeightedRandomSampler`.
- Set `num_workers` sensibly; `pin_memory=True`.

## Training (`training/train.py`)

### CLI
```
chesslab train [--backbone smallcnn] [--epochs 30] [--batch-size 256] [--lr 3e-4]
               [--no-amp] [--seed 42] [--out data/models/run-<ts>]
```

### Loop
- Optimizer AdamW, Cross-Entropy with class weights, Cosine or Step LR schedule.
- Per epoch: log Train-Loss, Val-Loss, Val-Accuracy, **Val-Board-Accuracy** (see below).
- Save checkpoint based on best **Board-Accuracy** (not Square-Accuracy — it
  is inflated by `empty` and misleading).
- Early Stopping (configurable patience). Run directory contains: `best.pt`, `last.pt`,
  `metrics.jsonl`, `config.json` (all hyperparameters + class list + normalization).

## Evaluation (`training/evaluate.py`)

### CLI
```
chesslab eval --run data/models/run-<ts> [--split test]
```

Metrics — in this order, because they have different significance:

1. **Board-Accuracy (primary metric):** proportion of frames where **all 64 squares** were
   classified correctly. This is the number that counts in real operation — a single
   error makes the FEN wrong. Reconstruct crops per frame (via `session_id`+`frame`+`square`
   from the manifest).
2. **Per-class accuracy / recall** for all 13 classes.
3. **Confusion matrix**, with special attention to **King↔Queen** and piece↔`empty`
   (most common confusions). Save as text and as PNG.
4. Overall Square-Accuracy (for context only, not as target metric).

## Export (`training/` / `chesslab export`)

```
chesslab export --run data/models/run-<ts> [--format torchscript|onnx]
```
- Exports `best.pt` to **TorchScript** and/or **ONNX**.
- Places a `model_card.json` alongside: class list (ordered), input `out_size`,
  normalization parameters, training metrics, ROCm/Torch version, date.
- These artifacts are the clean handoff point to the inference app.

## Acceptance Criteria (Definition of Done)

- `train` aborts clearly without a usable ROCm GPU (no silent CPU fallback) and otherwise
  trains on the 7900 XTX (VRAM usage visible, e.g. via `rocm-smi`).
- `metrics.jsonl` contains Board-Accuracy per epoch; best checkpoint selected accordingly.
- `eval` outputs Board-Accuracy, per-class recall, and a confusion matrix (text + PNG).
- `export` produces loadable TorchScript/ONNX + `model_card.json` with correct
  class list and normalization.
- A smoke run (1–2 epochs on a few sessions) runs end-to-end without errors.

---

## Note: Downstream Inference App (NOT in this repo)

The model exported here + `model_card.json` are consumed by a separate live app.
Its core building blocks (for orientation, intentionally omitted here):

- Real-time webcam -> same homography/crops -> model -> 64 labels -> FEN.
- **Temporal stability:** only adopt a position when N consecutive frames
  agree (filters hands over board / jitter).
- **Legality fusion:** check new position against legal follow-up moves of the previous one;
  discard/correct inconsistent detections. Turns a "good classifier" into
  reliable game logging.
- **PGN / history export** + optional Stockfish analysis for joint post-mortem.

When building this repo, ensure that homography application, crop logic, and
normalization are provided as reusable functions so that the app can adopt them 1:1.
