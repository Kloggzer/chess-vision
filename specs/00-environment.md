# Stage 0 — Pre-flight: Environment Validation (`doctor.py`)

## Purpose

The environment is **already set up** per the user (Linux, ROCm, PyTorch-ROCm-build,
AMD Radeon RX 7900 XTX). This stage **installs nothing** and changes nothing — it only
**validates** and clearly reports PASS/FAIL with remediation hints. Goal: before
training (Stage 5), ensure the GPU is actually usable instead of assuming it.

> Important for Claude Code: **Do not** run `pip install` / `uv add` of torch. If
> a mandatory check fails, report the finding and consult — do not
> attempt to „fix" ROCm/PyTorch on your own. Pure app dependencies
> (opencv, python-chess, typer, pyyaml) may be installed normally.

## CLI

```
chesslab doctor [--gpu] [--camera 0] [--json]
```

- without flags: base checks (Python, app deps, config paths).
- `--gpu`: additionally runs the full ROCm/PyTorch GPU validation (mandatory before Stage 5).
- `--camera N`: camera check for index N (open + read one frame).
- `--json`: machine-readable report in addition to human-readable output.

Exit code: `0` only if **all requested** mandatory checks pass, otherwise `!= 0`.

## Checks

### A) Base (always)
1. Python `>= 3.11`.
2. Import app deps: `cv2`, `numpy`, `PIL`, `chess`, `typer`, `yaml`. Log versions.
3. Data/config directories exist or are created (`data/...`).

### B) GPU / ROCm (`--gpu`, mandatory before training)
Ordered so diagnostics can narrow down the error:

1. `import torch` succeeds; log `torch.__version__`. **Expected:** contains `+rocm`
   (e.g. `2.x.y+rocm6.2`). If it instead contains `+cu...`, the **wrong
   (CUDA) build** is installed -> FAIL with clear hint.
2. `torch.version.hip is not None` -> confirms ROCm build. (`torch.version.cuda` is
   typically `None` in a ROCm build.) FAIL if `hip` is None.
3. `torch.cuda.is_available()` is `True`. (Under ROCm the `torch.cuda.*` API is
   deliberately reused — this is correct, not NVIDIA.) FAIL otherwise.
4. `torch.cuda.device_count() >= 1`.
5. Log `torch.cuda.get_device_name(0)`. **Expected:** contains `7900`, `Radeon` or
   `AMD`. Otherwise WARN (name may be generic depending on driver), not a hard FAIL.
6. Log `torch.cuda.get_device_properties(0).total_memory`. **Expected:** ~24 GB
   (>= 20 GB threshold). Below that WARN.
7. **Real compute test (the decisive one):**
   ```python
   x = torch.randn(2048, 2048, device="cuda")
   y = torch.randn(2048, 2048, device="cuda")
   z = (x @ y).sum().item()        # forces sync + transfer back
   torch.cuda.synchronize()
   ```
   If this runs without exception and `z` is finite -> PASS. If it crashes (common with
   gfx mismatch) -> FAIL with hint about gfx target (see below).
8. Optional system check via `subprocess` (not mandatory, info only): run `rocm-smi`
   and/or `rocminfo`, log ROCm version and the agent's `gfx` target. If the
   binary is missing -> WARN, not FAIL (PyTorch checks are authoritative).

### C) Camera (`--camera N`)
1. `cv2.VideoCapture(N)` opens (standard V4L2 backend on Linux).
2. At least one `read()` frame returns a non-empty image; log resolution.
3. Output a hint about whether `DISPLAY` is set (needed for `cv2.imshow` in Stage 1/3).
   If `DISPLAY` is missing -> WARN: calibration/capture needs a GUI session.

## 7900 XTX / gfx1100 — Diagnostic Hints (embed in FAIL messages)

- The 7900 XTX is **gfx1100** and officially supported in current ROCm versions —
  `HSA_OVERRIDE_GFX_VERSION` should **not** be necessary. Setting an override on a
  supported card can actually cause harm. Mention only as a last-resort fallback
  (e.g. `HSA_OVERRIDE_GFX_VERSION=11.0.0`), do not set it automatically.
- Wrong PyTorch build (CUDA instead of ROCm) is the most common stumbling block:
  recognizable by `+cu` in the version or `torch.version.hip is None`. Remediation hint:
  reinstall the ROCm wheel from the `rocm` index — but **only after consulting**,
  not automatically.
- `torch.cuda.is_available() == False` despite ROCm build: often a driver/permissions
  issue (user not in `render`/`video` group, or `/dev/kfd` & `/dev/dri` not accessible).
  Output as a hint, do not fix it yourself.

## Report Format

Human-readable, one line per check: `[PASS] / [WARN] / [FAIL] <Check> — <Detail>`.
A summary line at the end. With `--json` additionally:

```json
{
  "ok": true,
  "checks": [
    {"name": "torch.rocm_build", "status": "pass", "detail": "2.4.1+rocm6.2"},
    {"name": "torch.cuda.is_available", "status": "pass", "detail": "true"},
    {"name": "gpu.compute", "status": "pass", "detail": "matmul 2048x2048 ok"},
    {"name": "gpu.name", "status": "pass", "detail": "AMD Radeon RX 7900 XTX"}
  ]
}
```

## Acceptance Criteria (Definition of Done)

- `chesslab doctor` (without `--gpu`) runs without GPU/camera and checks base deps.
- `chesslab doctor --gpu` prints a separate PASS/WARN/FAIL line for each GPU check,
  including the real matmul compute test, and exits with the correct code.
- If the wrong (CUDA) build is detected, a **clear** FAIL message appears that names
  the build as the cause — no generic stacktrace.
- `chesslab doctor --camera 0` opens the camera and reads a frame, or cleanly reports
  the reason.
- Stage 5 (`train`) internally calls the same GPU validation path and aborts with a
  clear message if the GPU is not usable (instead of silently falling back to CPU).
