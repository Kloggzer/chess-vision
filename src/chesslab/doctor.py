"""Stufe 0 — Pre-flight environment validation.

Validates (does NOT install) Python, app dependencies, the ROCm/PyTorch GPU stack
(AMD Radeon RX 7900 XTX) and the camera. Reports PASS/WARN/FAIL per check with
remediation hints. `validate_gpu()` is the reusable path Stage 5 (`train`) calls before
training so it aborts loudly instead of silently falling back to CPU.

Heavy/optional imports (cv2, torch) are done lazily inside functions so this module is
importable — and unit-testable — even when those packages are absent.
"""

from __future__ import annotations

import importlib
import os
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
    return Check("python.version", FAIL, f"{s} < 3.11 — Python 3.11+ erforderlich.")


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
            out.append(Check(f"dep.{dist}", FAIL, f"Import fehlgeschlagen: {e!r}. `uv add {dist}`."))
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
                f"torch nicht importierbar: {e!r}. ROCm-Build erwartet "
                "(Index download.pytorch.org/whl/rocm6.x) — NICHT automatisch installieren.",
            )
        )
        return checks

    ver = str(getattr(torch, "__version__", "?"))

    # 1. ROCm vs CUDA build (häufigster Stolperstein)
    if "+rocm" in ver:
        checks.append(Check("torch.rocm_build", PASS, ver))
    elif "+cu" in ver:
        checks.append(
            Check(
                "torch.rocm_build",
                FAIL,
                f"CUDA-Build installiert ({ver}) — FALSCHER Build. ROCm-Wheel von "
                "download.pytorch.org/whl/rocm6.x nötig (nur nach Rücksprache neu installieren).",
            )
        )
    else:
        checks.append(Check("torch.rocm_build", WARN, f"Version ohne +rocm/+cu Suffix ({ver}); Build unklar."))

    # 2. HIP confirms ROCm build
    hip = getattr(torch.version, "hip", None)
    cuda_ver = getattr(torch.version, "cuda", None)
    if hip:
        checks.append(Check("torch.version.hip", PASS, f"hip={hip} (cuda={cuda_ver})"))
    else:
        checks.append(
            Check("torch.version.hip", FAIL, f"torch.version.hip is None (cuda={cuda_ver}) -> kein ROCm-Build.")
        )

    # 3. is_available (ROCm reuses the torch.cuda.* API on purpose)
    try:
        avail = bool(torch.cuda.is_available())
    except Exception as e:  # noqa: BLE001
        avail = False
        checks.append(Check("torch.cuda.is_available", FAIL, f"Exception: {e!r}"))
    else:
        if avail:
            checks.append(Check("torch.cuda.is_available", PASS, "true (ROCm nutzt die torch.cuda-API bewusst wieder)"))
        else:
            checks.append(
                Check(
                    "torch.cuda.is_available",
                    FAIL,
                    "false — oft Treiber/Permissions (Gruppen render/video, Zugriff auf /dev/kfd & /dev/dri).",
                )
            )

    if not avail:
        checks.append(Check("gpu.compute", FAIL, "übersprungen — keine nutzbare GPU."))
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
            checks.append(Check("gpu.name", WARN, f"{name} (Name evtl. generisch je Treiber)."))
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
            Check("gpu.compute", PASS if ok else FAIL, f"matmul 2048x2048 -> sum={z:.3e}" if ok else "Ergebnis nicht endlich")
        )
    except Exception as e:  # noqa: BLE001
        checks.append(
            Check(
                "gpu.compute",
                FAIL,
                f"matmul crash: {e!r}. Häufig gfx-Mismatch — die 7900 XTX ist gfx1100 und in "
                "aktuellem ROCm offiziell unterstützt; HSA_OVERRIDE_GFX_VERSION nur als allerletzter Fallback.",
            )
        )

    # 8. Optionaler System-Check (nur Info)
    checks.extend(_rocm_system_info())
    return checks


def _rocm_system_info() -> list[Check]:
    import shutil
    import subprocess

    out: list[Check] = []
    for tool in ("rocm-smi", "rocminfo"):
        path = shutil.which(tool)
        if not path:
            out.append(Check(f"system.{tool}", WARN, "nicht gefunden (nur Info; PyTorch-Checks sind maßgeblich)."))
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


# --- C) Camera check (--camera N) -----------------------------------------------------

def camera_checks(index: int) -> list[Check]:
    out: list[Check] = []
    try:
        import cv2
    except Exception as e:  # noqa: BLE001
        return [Check("camera.cv2", FAIL, f"cv2 nicht importierbar: {e!r}")]

    if sys.platform.startswith("win") and hasattr(cv2, "CAP_DSHOW"):
        cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)  # stabileres Backend unter Windows
    else:
        cap = cv2.VideoCapture(index)

    try:
        if not cap.isOpened():
            out.append(
                Check(f"camera.open[{index}]", FAIL, "konnte nicht geöffnet werden — andere Indizes probieren (0,1,2…).")
            )
            return out
        ok, frame = cap.read()
        if not ok or frame is None:
            out.append(Check(f"camera.read[{index}]", FAIL, "geöffnet, aber kein Frame gelesen."))
        else:
            h, w = frame.shape[:2]
            out.append(Check(f"camera.read[{index}]", PASS, f"{w}x{h}"))
    finally:
        cap.release()

    # DISPLAY ist nur unter Linux relevant (cv2.imshow in Stufe 1/3 braucht GUI-Session).
    if sys.platform.startswith("linux"):
        disp = os.environ.get("DISPLAY")
        if disp:
            out.append(Check("camera.display", PASS, disp))
        else:
            out.append(
                Check("camera.display", WARN, "DISPLAY nicht gesetzt — Kalibrierung/Aufnahme braucht eine GUI-Session.")
            )
    else:
        out.append(Check("camera.display", PASS, f"GUI verfügbar ({sys.platform})"))
    return out


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


def run(gpu: bool = False, camera: int | None = None, json_out: bool = False) -> int:
    """Execute the requested checks, print the report, return an exit code (0 = all pass)."""
    checks: list[Check] = list(base_checks())
    if gpu:
        checks += gpu_checks()
    if camera is not None:
        checks += camera_checks(camera)

    ok = not any(c.status == FAIL for c in checks)
    print(render(checks))

    if json_out:
        import json

        print(json.dumps({"ok": ok, "checks": [asdict(c) for c in checks]}, indent=2))

    return 0 if ok else 1
