# AMD GPU (ROCm)

Reference setup of this project: **Radeon RX 7900 XTX** (RDNA3, gfx1100, 24 GB VRAM).

## The one thing to get right

The ROCm build of PyTorch exposes **the same `torch.cuda.*` API** as the CUDA
build — `torch.cuda.is_available()` returns `True` on AMD too. But the **CUDA
build must not be installed** (it won't find a GPU on AMD); the ROCm build comes
from its own index:

## Linux

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm6.4
```

(Check the current ROCm version of the index at
<https://pytorch.org/get-started/locally/>.) Prerequisite: ROCm driver stack
installed (`rocminfo` lists the GPU).

## Windows

This repo pins a Windows ROCm stack (torch 2.9.1+rocm7.2.1) in `pyproject.toml`
to **local wheels in `wheels/`** — the wheels themselves are not part of the
repo. To reproduce the setup: get TheRock/ROCm Windows wheels matching your GPU,
drop them into `wheels/`, run `uv sync`. Alternatively remove the pins and
install your own build.

## Known pitfalls

- **RDNA3 on Linux:** if the architecture is not detected, set
  `HSA_OVERRIDE_GFX_VERSION=11.0.0`.
- `torch.__version__` must carry a `+rocm...` suffix. If it says `+cu12x`,
  the wrong build is installed.

## Validate

```bash
uv run chesslab doctor --gpu
```
