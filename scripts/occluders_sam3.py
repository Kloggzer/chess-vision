"""Cut the occluder plates' alpha with SAM 3 instead of the chroma/Otsu split.

`occluders.extract` separates hand from background by CHROMA distance to the clip's temporal
median, with Otsu picking the threshold per clip. That works because the stage is one flat colour,
and it fails exactly where a stage is not: a dark sleeve against a dark fold, a shadow band that
morphology re-annexes, a lamp sweeping the cloth (`docs/occluder-plates.md`). SAM 3 does not care
about the background's colour at all — it is asked for `person`/`hand`/`arm`/`sleeve`/`wristwatch`
and unions what it finds, which is the same call the session mattes already trust.

Review first, apply second, because 1 435 plates are 1 435 chances to make the synth data worse:

    uv run python scripts/occluders_sam3.py --sample 24        # a sheet, nothing is written
    uv run python scripts/occluders_sam3.py --apply            # every plate, parked beforehand

`MAX_ZONE_FRAC` is deliberately not applied. It exists to refuse an arm that covers most of a
BOARD; on a plate the hand is supposed to fill the frame.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from chesslab import config  # noqa: E402

PARK = "occluders-vor-sam3"
#: Neutral grey behind a cut-out, so a hole in the alpha shows and a soft edge does not read as one.
BACKDROP = 128


def tiles(root: Path) -> list[Path]:
    return sorted(root.glob("*.webp"))


def spread(items: list[Path], n: int) -> list[Path]:
    """`n` plates spread over the whole set, so one bad clip cannot fill the sheet."""
    if n >= len(items):
        return items
    return [items[round(i * (len(items) - 1) / (n - 1))] for i in range(n)]


def alpha_of(plate_bgr, alpha_sam3):
    """SAM 3's union for one plate, as uint8. The plate's own RGB still carries the stage."""
    alpha, hits = alpha_sam3(plate_bgr)
    return (np.clip(alpha, 0.0, 1.0) * 255.0).astype(np.uint8), hits


def over(bgr, alpha) -> np.ndarray:
    a = (alpha.astype(np.float32) / 255.0)[..., None]
    return (bgr.astype(np.float32) * a + BACKDROP * (1.0 - a)).astype(np.uint8)


def panel(path: Path, bgra, new_alpha, width: int) -> np.ndarray:
    """RGB | old cut | new cut | new alpha — one row of the review sheet."""
    bgr, old = bgra[..., :3], bgra[..., 3]
    tiles = [bgr, over(bgr, old), over(bgr, new_alpha),
             cv2.cvtColor(new_alpha, cv2.COLOR_GRAY2BGR)]
    scale = width / (4 * bgr.shape[1])
    row = np.hstack([cv2.resize(t, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
                     for t in tiles])
    bar = np.zeros((22, row.shape[1], 3), np.uint8)
    covered = f"{(old > 127).mean():.2f} -> {(new_alpha > 127).mean():.2f}"
    cv2.putText(bar, f"{path.name}    Flaeche {covered}", (6, 16),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    return np.vstack([bar, row])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sample", type=int, default=24, help="how many plates the sheet shows")
    ap.add_argument("--apply", action="store_true",
                    help="rewrite EVERY plate's alpha in place; the old ones are parked first")
    ap.add_argument("--root", type=Path, default=None, help="the plate directory")
    ap.add_argument("--out", type=Path, default=Path("data/reports/occluders-sam3"))
    args = ap.parse_args()

    root = args.root or config.DATA.occluders
    found = tiles(root)
    if not found:
        print(f"[FAIL] no plates under {root}")
        return 1
    from chesslab.matte import alpha_sam3

    todo = found if args.apply else spread(found, args.sample)
    print(f"{len(found)} plates in {root}, {len(todo)} to cut")

    if args.apply:
        park = config.DATA.root / "_parked" / PARK
        if park.exists():
            print(f"[FAIL] {park} already exists — move it away before writing a second time")
            return 1
        shutil.copytree(root, park)
        print(f"  parked the old plates under {park}")

    args.out.mkdir(parents=True, exist_ok=True)
    rows, changed = [], []
    for n, path in enumerate(todo, 1):
        bgra = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
        if bgra is None or bgra.shape[2] != 4:
            print(f"  [skip] {path.name}: not an RGBA plate")
            continue
        new_alpha, _hits = alpha_of(bgra[..., :3], alpha_sam3)
        changed.append(float((new_alpha > 127).mean() - (bgra[..., 3] > 127).mean()))
        if args.apply:
            cv2.imwrite(str(path), np.dstack([bgra[..., :3], new_alpha]),
                        [cv2.IMWRITE_WEBP_QUALITY, 95])
        elif len(rows) < args.sample:
            rows.append(panel(path, bgra, new_alpha, 1400))
        if n % 25 == 0:
            print(f"  {n}/{len(todo)}", flush=True)

    if rows:
        sheet = args.out / "vorher-nachher.png"
        cv2.imwrite(str(sheet), np.vstack(rows))
        print(f"  sheet -> {sheet}")
    d = np.array(changed)
    print(f"covered area change: median {np.median(d):+.3f}, p10 {np.percentile(d, 10):+.3f}, "
          f"p90 {np.percentile(d, 90):+.3f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
