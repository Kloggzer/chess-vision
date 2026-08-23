"""Stage 0 — Pre-flight environment validation.

Validates (does NOT install) Python, app dependencies, the ROCm/PyTorch GPU stack
(AMD Radeon RX 7900 XTX) and the lens state. Reports PASS/WARN/FAIL per check with
remediation hints. `validate_gpu()` is the reusable path Stage 5 (`train`) calls before
training so it aborts loudly instead of silently falling back to CPU.

Heavy/optional imports (cv2, torch) are done lazily inside functions so this module is
importable — and unit-testable — even when those packages are absent.
"""

from __future__ import annotations

import importlib
import sys
from dataclasses import asdict, dataclass

PASS = "pass"
WARN = "warn"
FAIL = "fail"


@dataclass
class Check:
    name: str
    status: str  # PASS | WARN | FAIL
    detail: str


# --- A) Base checks (always) ----------------------------------------------------------

def check_python() -> Check:
    v = sys.version_info
    s = f"{v.major}.{v.minor}.{v.micro}"
    if (v.major, v.minor) >= (3, 11):
        return Check("python.version", PASS, s)
    return Check("python.version", FAIL, f"{s} < 3.11 — Python 3.11+ required.")


# (import-name, distribution-name) for the mandatory app dependencies.
_APP_DEPS: list[tuple[str, str]] = [
    ("cv2", "opencv-python"),
    ("numpy", "numpy"),
    ("PIL", "Pillow"),
    ("chess", "python-chess"),
    ("typer", "typer"),
    ("yaml", "pyyaml"),
]


def check_app_deps() -> list[Check]:
    out: list[Check] = []
    for mod, dist in _APP_DEPS:
        try:
            m = importlib.import_module(mod)
            ver = getattr(m, "__version__", "?")
            out.append(Check(f"dep.{dist}", PASS, str(ver)))
        except Exception as e:  # noqa: BLE001 - report, never raise
            out.append(Check(f"dep.{dist}", FAIL, f"Import failed: {e!r}. `uv add {dist}`."))
    return out


def check_data_dirs() -> Check:
    from . import config

    created = config.ensure_dirs()
    return Check("data.dirs", PASS, ", ".join(str(p) for p in created))


def base_checks() -> list[Check]:
    return [check_python(), *check_app_deps(), check_data_dirs()]


# --- B) GPU / ROCm checks (--gpu) -----------------------------------------------------

def gpu_checks() -> list[Check]:
    checks: list[Check] = []

    try:
        import torch
    except Exception as e:  # noqa: BLE001
        checks.append(
            Check(
                "torch.import",
                FAIL,
                f"torch not importable: {e!r}. ROCm build expected "
                "(Index download.pytorch.org/whl/rocm6.x) — do NOT install automatically.",
            )
        )
        return checks

    ver = str(getattr(torch, "__version__", "?"))

    # 1. ROCm vs CUDA build (most common pitfall)
    if "+rocm" in ver:
        checks.append(Check("torch.rocm_build", PASS, ver))
    elif "+cu" in ver:
        checks.append(
            Check(
                "torch.rocm_build",
                FAIL,
                f"CUDA build installed ({ver}) — WRONG build. ROCm wheel from "
                "download.pytorch.org/whl/rocm6.x needed (only reinstall after consultation).",
            )
        )
    else:
        checks.append(Check("torch.rocm_build", WARN, f"Version without +rocm/+cu suffix ({ver}); build unclear."))

    # 2. HIP confirms ROCm build
    hip = getattr(torch.version, "hip", None)
    cuda_ver = getattr(torch.version, "cuda", None)
    if hip:
        checks.append(Check("torch.version.hip", PASS, f"hip={hip} (cuda={cuda_ver})"))
    else:
        checks.append(
            Check("torch.version.hip", FAIL, f"torch.version.hip is None (cuda={cuda_ver}) -> no ROCm build.")
        )

    # 3. is_available (ROCm reuses the torch.cuda.* API on purpose)
    try:
        avail = bool(torch.cuda.is_available())
    except Exception as e:  # noqa: BLE001
        avail = False
        checks.append(Check("torch.cuda.is_available", FAIL, f"Exception: {e!r}"))
    else:
        if avail:
            checks.append(Check("torch.cuda.is_available", PASS, "true (ROCm knowingly reuses the torch.cuda API)"))
        else:
            checks.append(
                Check(
                    "torch.cuda.is_available",
                    FAIL,
                    "false — often driver/permissions (groups render/video, access to /dev/kfd & /dev/dri).",
                )
            )

    if not avail:
        checks.append(Check("gpu.compute", FAIL, "skipped — no usable GPU."))
        return checks

    # 4. device_count
    try:
        n = int(torch.cuda.device_count())
        checks.append(Check("torch.cuda.device_count", PASS if n >= 1 else FAIL, str(n)))
    except Exception as e:  # noqa: BLE001
        checks.append(Check("torch.cuda.device_count", FAIL, repr(e)))

    # 5. device name (generic name -> WARN, not FAIL)
    try:
        name = str(torch.cuda.get_device_name(0))
        if any(k in name for k in ("7900", "Radeon", "AMD")):
            checks.append(Check("gpu.name", PASS, name))
        else:
            checks.append(Check("gpu.name", WARN, f"{name} (name may be generic per driver)."))
    except Exception as e:  # noqa: BLE001
        checks.append(Check("gpu.name", WARN, repr(e)))

    # 6. total memory (~24 GB erwartet, >= 20 GB Schwelle)
    try:
        total = int(torch.cuda.get_device_properties(0).total_memory)
        gib = total / (1024 ** 3)
        checks.append(Check("gpu.memory", PASS if gib >= 20 else WARN, f"{gib:.1f} GiB"))
    except Exception as e:  # noqa: BLE001
        checks.append(Check("gpu.memory", WARN, repr(e)))

    # 7. Echter Compute-Test (der entscheidende)
    try:
        import math

        x = torch.randn(2048, 2048, device="cuda")
        y = torch.randn(2048, 2048, device="cuda")
        z = (x @ y).sum().item()
        torch.cuda.synchronize()
        ok = math.isfinite(z)
        checks.append(
            Check("gpu.compute", PASS if ok else FAIL, f"matmul 2048x2048 -> sum={z:.3e}" if ok else "result not finite")
        )
    except Exception as e:  # noqa: BLE001
        checks.append(
            Check(
                "gpu.compute",
                FAIL,
                f"matmul crash: {e!r}. Often gfx mismatch — the 7900 XTX is gfx1100 and officially "
                "supported in current ROCm; HSA_OVERRIDE_GFX_VERSION only as last resort.",
            )
        )

    # 8. Optional system check (info only)
    checks.extend(_rocm_system_info())
    return checks


def _rocm_system_info() -> list[Check]:
    import shutil
    import subprocess

    out: list[Check] = []
    for tool in ("rocm-smi", "rocminfo"):
        path = shutil.which(tool)
        if not path:
            out.append(Check(f"system.{tool}", WARN, "not found (info only; PyTorch checks are authoritative)."))
            continue
        try:
            args = [path, "--version"] if tool == "rocm-smi" else [path]
            res = subprocess.run(args, capture_output=True, text=True, timeout=10)
            text = (res.stdout or res.stderr).strip().splitlines()
            out.append(Check(f"system.{tool}", PASS, text[0] if text else "vorhanden"))
        except Exception as e:  # noqa: BLE001
            out.append(Check(f"system.{tool}", WARN, repr(e)))
    return out


def validate_gpu() -> tuple[bool, list[Check]]:
    """Reusable GPU validation path for Stage 5. Returns (usable, checks)."""
    checks = gpu_checks()
    ok = not any(c.status == FAIL for c in checks)
    return ok, checks


# --- Reporting ------------------------------------------------------------------------

_GLYPH = {PASS: "[PASS]", WARN: "[WARN]", FAIL: "[FAIL]"}


def render(checks: list[Check]) -> str:
    lines = [f"{_GLYPH[c.status]} {c.name} — {c.detail}" for c in checks]
    n_pass = sum(c.status == PASS for c in checks)
    n_warn = sum(c.status == WARN for c in checks)
    n_fail = sum(c.status == FAIL for c in checks)
    verdict = "OK" if n_fail == 0 else "FAIL"
    lines.append(f"--- {verdict}: {n_pass} pass, {n_warn} warn, {n_fail} fail ---")
    return "\n".join(lines)


def run(gpu: bool = False, json_out: bool = False) -> int:
    """Execute the requested checks, print the report, return an exit code (0 = all pass)."""
    checks: list[Check] = list(base_checks())
    if gpu:
        checks += gpu_checks()

    ok = not any(c.status == FAIL for c in checks)
    print(render(checks))

    if json_out:
        import json

        print(json.dumps({"ok": ok, "checks": [asdict(c) for c in checks]}, indent=2))

    return 0 if ok else 1
