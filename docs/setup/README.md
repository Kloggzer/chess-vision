# Setup & GPU backends

chesslab trains with **PyTorch**. The code is backend-agnostic — it only uses the
`torch.cuda.*` API, which is served by both the CUDA and the ROCm build.
The only thing that matters is **which PyTorch build is installed**. Pick the
page for your hardware:

| Hardware | Guide |
|---|---|
| AMD GPU (Radeon, e.g. RX 7900 XTX) | [gpu-rocm.md](gpu-rocm.md) |
| NVIDIA GPU | [gpu-cuda.md](gpu-cuda.md) |
| No dedicated GPU | [cpu.md](cpu.md) |

Always validate after installing:

```bash
uv run chesslab doctor --gpu
```

`doctor` checks the Python version, dependencies, the PyTorch backend (device
visible, probe tensor op on the GPU) and the camera. Do not start training
(stage 5) without a passing `doctor --gpu`.

## What needs a GPU, what doesn't?

- **GPU required:** `chesslab train` (stage 5) — technically possible on CPU,
  but impractically slow (see [cpu.md](cpu.md)).
- **GPU irrelevant:** calibration, capture (`collect`), slicing/labeling, dataset
  building, the move tracker (`track` runs on CPU with OpenCV; only the optional
  CNN safeguard benefits from a GPU), synthetic rendering (Blender uses its own
  GPU stack, independent of PyTorch).

## Note on `pyproject.toml`

The dependencies pin the **ROCm training stack only for Windows + Python 3.12**
(local wheels in `wheels/`, marker `sys_platform == 'win32'`) — that is this
project's development machine. On all other platforms `uv sync` installs **no**
PyTorch; install the right build yourself following the pages above.
