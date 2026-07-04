# NVIDIA GPU (CUDA)

chesslab was developed on AMD/ROCm but runs unchanged on NVIDIA — the code uses
only the `torch.cuda.*` API and contains no ROCm specifics.

## Install

The ROCm pins in `pyproject.toml` only apply on this project's Windows
development machine (marker `sys_platform == 'win32'` + Python 3.12); other
systems get no PyTorch from `uv sync`. Install a CUDA build matching your
driver:

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126
```

(Pick the right CUDA version at <https://pytorch.org/get-started/locally/>;
on Linux the regular PyPI build `pip install torch` ships CUDA as well.)

## Verify

```bash
python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"
uv run chesslab doctor --gpu
```

`torch.__version__` should carry a `+cu12x` suffix (or be the PyPI default
build), and `doctor --gpu` must pass the probe tensor op.

## Nothing else changes

Training (`chesslab train`), evaluation and export (TorchScript/ONNX) behave
identically to ROCm. VRAM needs are moderate (per-square CNN on 128-px crops);
8 GB is comfortable.
