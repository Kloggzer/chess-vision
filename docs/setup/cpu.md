# Without a dedicated GPU (CPU)

Almost everything in chesslab runs without a GPU — only training is effectively
GPU-bound.

## Install

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

## What works on CPU

- Calibration, capture (`collect`), slicing/labeling, dataset building — pure
  OpenCV/NumPy pipelines.
- **Move tracker** (`chesslab track`): the diff/scoring method is CPU code; the
  optional CNN safeguard also runs on CPU (inference of a small CNN on 64
  crops), just with higher latency.
- **Inference** with a trained model (web UI/serving): usable; one board pass
  (64 crops) stays in the range of a few hundred milliseconds.

## What is not practical

- `chesslab train`: it does start (`--device cpu`), but epochs over hundreds of
  thousands of crops take hours on CPU instead of minutes. Recommendation:
  train on a GPU machine ([ROCm](gpu-rocm.md) / [CUDA](gpu-cuda.md)) and use
  only the exported model (TorchScript/ONNX) on the CPU device — this is
  exactly the deployment pattern intended for the planned mobile/on-device use
  anyway.

## Verify

```bash
uv run chesslab doctor        # without --gpu
```
