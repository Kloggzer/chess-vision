# Setup & GPU backends

chesslab trains with **PyTorch**. The code only uses the `torch.cuda.*` API, which both the CUDA
and the ROCm build serve (`torch.cuda.is_available()` is `True` on AMD too). What matters is
**which PyTorch build is installed**.

`pyproject.toml` pins the ROCm stack **only for Windows + Python 3.12** (AMD's `whl-next` index,
marker `sys_platform == 'win32'`) — this project's development machine. Everywhere else `uv sync`
installs **no** PyTorch; install the right build yourself.

Always validate after installing — no training without a passing `doctor --gpu`:

```bash
uv run chesslab doctor --gpu   # Python, deps, data dirs, device visible, probe tensor op
```

## What needs a GPU

Only `chesslab train`, and it refuses to start without one (`get_device(require_gpu=True)`).
Calibration, slicing/labeling, dataset building and inference with a trained model (64 crops in a
few hundred ms) run fine on CPU; Blender uses its own GPU stack.

## AMD (ROCm)

Reference setup: **Radeon RX 7900 XTX** (RDNA3, gfx1100, 24 GB). The CUDA build must **not** be
installed — it finds no GPU on AMD.

- **Linux:** `pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm6.4`
  (check the current version at <https://pytorch.org/get-started/locally/>); `rocminfo` must list
  the GPU. If RDNA3 is not detected, set `HSA_OVERRIDE_GFX_VERSION=11.0.0`.
- **Windows:** the repo pins torch 2.13.0+rocm10.0.0 (gfx1100) from AMD's
  `https://stable.repo.amd.com/rocm/whl-next/` plus `triton-windows` (needed by `--compile-model`
  and `--compile-batch-aug`); `uv sync` fetches it. Another GPU needs its own `*-device-gfx*` pins.
- `torch.__version__` must end in `+rocm...`; `+cu12x` means the wrong build.

## NVIDIA (CUDA)

Runs unchanged — the code has no ROCm specifics. Pick the CUDA version matching your driver:

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126
python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

On Linux the plain PyPI `pip install torch` ships CUDA as well. 8 GB VRAM is comfortable.

## CPU only

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
uv run chesslab doctor         # without --gpu
```

Train on a GPU machine and use only the exported model on the CPU device.
