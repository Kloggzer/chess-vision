"""Host-memory reserve checks, independent of torch and the GPU driver."""

import ctypes
import sys
from pathlib import Path


def available_ram() -> int:
    """Return available physical bytes (including reclaimable cache), or fail closed."""
    if sys.platform == "win32":
        class Status(ctypes.Structure):
            _fields_ = [("length", ctypes.c_uint32), ("load", ctypes.c_uint32)] + [
                (name, ctypes.c_uint64) for name in
                ("total", "available", "page_total", "page_available", "virtual_total",
                 "virtual_available", "extended")]

        status = Status()
        status.length = ctypes.sizeof(status)
        if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
            raise OSError("Cannot measure available RAM")
        return int(status.available)
    if sys.platform.startswith("linux"):
        for line in Path("/proc/meminfo").read_text().splitlines():
            if line.startswith("MemAvailable:"):
                return int(line.split()[1]) * 1024
    raise OSError("RAM reserve monitoring is supported on Windows and Linux only")


def check_ram(reserve_gb: float) -> None:
    if reserve_gb <= 0:
        return
    available = available_ram() / 2**30
    if available < reserve_gb:
        raise MemoryError(
            f"Training stopped: {available:.2f} GiB RAM available, below the "
            f"{reserve_gb:g} GiB reserve. The last completed epoch checkpoint is preserved. "
            "Free memory before continuing the run.")


def guarded_batches(loader):
    """Check before fetching and after constructing each host batch."""
    reserve = getattr(getattr(loader, "dataset", None), "ram_reserve_gb", 0)
    check_ram(reserve)
    iterator = iter(loader)
    while True:
        check_ram(reserve)
        try:
            batch = next(iterator)
        except StopIteration:
            return
        check_ram(reserve)
        yield batch
