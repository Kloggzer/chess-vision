"""Delete the memmaps of measured experiment datasets; keep every recipe (manifest, split, yaml).

The list is the 2026-09-05 decision (session packs landed): these pixels come back from the pool
or the board stores, their results live in docs/ and TODO.md. `--dry-run` only prints sizes.
"""
import sys
from pathlib import Path

NAMES = [
    "real13-mix-v4-128", "real13-mix-v4-96", "real13-mix-pad0", "real13-mix-v4-ff",
    "real13-mix-v4-ffbase", "real13-straight-80-v1", "real13-straight-80-v2", "real13-c8d1-r96",
    "abA-80", "abB-80", "ab-files-80", "comp13-v3-80", "comp13-v4-80", "sp-parity-pool",
]
PACK_FILES = ("packed_images.u8", "packed_meta.json", "packed_progress.json", "packed_images.u8.partial")


def main() -> None:
    dry = "--dry-run" in sys.argv
    freed = 0.0
    for name in NAMES:
        d = Path("data/datasets") / name
        if not d.is_dir():
            print(f"skip {name}: no such dataset")
            continue
        gb = 0.0
        for f in PACK_FILES:
            p = d / f
            if p.exists():
                gb += p.stat().st_size / 1e9
                if not dry:
                    p.unlink()
        freed += gb
        print(f"{'would free' if dry else 'freed'} {gb:6.2f} GB  {name}")
    print(f"total {freed:.1f} GB")


if __name__ == "__main__":
    main()
