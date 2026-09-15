"""Reconstruct where each square actually sits and flag the frames whose squares drift off the grid.

A warp can be wrong without anything failing: `board_corners_for_frame` returns a quad, `slice`
produces 64 crops, and every count in the pipeline looks healthy while the grid sits a few degrees
off and every crop straddles two squares. That happened on 2026-07-31 — the `MarkerTracker`'s dead
zone and EMA lag differently per marker while the board rotates, so the quad came out sheared, and
only the calibration-pose frame rectified correctly. Nothing in the pipeline noticed.

**How it works.** On the RECTIFIED board the 7 interior grooves per axis must sit at multiples of
`board_size / 8`. Each groove is located as the sub-pixel centre of its notch, band by band, which
gives the board's REAL line positions AND their tilt. Those lines are then reassembled into the 64
actual cell rectangles and each is compared against its nominal one — so the output is not an
abstract score but "d4 is 11 px off", in the units the crops are cut in.

Measuring inside the warp is deliberate. An earlier version measured corner residuals on the raw
frame and drowned in barrel distortion (6 px of baseline noise) while saturating at the corner
refinement window, so a 40 px corner error moved the number less than the noise did.

**The flag.** A frame is flagged when any square's offset exceeds `--max-off` px, and the count of
bad squares is reported with their names. That is an ABSOLUTE criterion — unlike a
median-plus-MAD rule it also catches a session that is uniformly misaligned, which is exactly the
case a relative rule is blind to.

Usage:
    .venv/Scripts/python.exe scripts/check_alignment.py --session 20260731-102458
        [--max-off 6] [--sample 10] [--calibrate] [--montage out.png]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from chesslab import config, labeling, sessions  # noqa: E402
from chesslab.alignment import (  # noqa: E402
    correct_quad,
    frame_offsets,
)
from chesslab.calibration import warp_from_corners  # noqa: E402


def perturb(quad, dx: float, dy: float, slot: int = 0) -> list:
    q = [list(p) for p in quad]
    q[slot][0] += dx
    q[slot][1] += dy
    return q


def judge(off: dict[str, float], max_off: float) -> tuple[list[tuple[str, float]], float]:
    """(bad squares worst-first, worst offset) for one frame."""
    bad = sorted(((s, v) for s, v in off.items() if v > max_off), key=lambda t: -t[1])
    return bad, (max(off.values()) if off else float("nan"))


def scan(d: Path, rows: list, prof, max_off: float):
    out = []
    for n, (i, e) in enumerate(rows):
        frame = None if not e.get("corners") else cv2.imread(str(d / e["frame"]))
        if frame is None:
            out.append((i, None, [], float("nan"), 0))
            continue
        off, unread = frame_offsets(frame, e["corners"], prof)
        bad, worst = judge(off, max_off)
        out.append((i, off, bad, worst, unread))
        if (n + 1) % 50 == 0:
            print(f"  {n + 1}/{len(rows)}", flush=True)
    return out


def calibrate(d: Path, log: list, mid: int, prof, max_off: float) -> None:
    e = log[mid]
    frame = cv2.imread(str(d / e["frame"]))
    print(f"\n  calibration on frame {mid} — one corner shifted in the raw frame:")
    for px in (0, 2, 5, 10, 20, 40):
        q = perturb(e["corners"], px, px) if px else e["corners"]
        off, _ = frame_offsets(frame, q, prof)
        bad, worst = judge(off, max_off)
        names = ", ".join(s for s, _ in bad[:6]) + (" …" if len(bad) > 6 else "")
        print(f"    {px:3} px: worst {worst:5.1f} px, {len(bad):2} square(s) over {max_off:.0f} px"
              f"{'  ' + names if bad else ''}")


def apply_fix(d: Path, prof, flagged: list, max_off: float) -> None:
    """Re-fit the corners of the flagged frames and write them back, with a backup.

    Two rules keep this from doing harm. Only frames ALREADY over the threshold are touched — on a
    frame inside the noise band the fit chases measurement noise and makes it worse, which is
    visible in the numbers (a 5.9 px frame going to 8.0). And a correction is kept only if it
    actually improves that frame, so a fit that fails quietly leaves the original geometry alone.

    The rows are marked `corners_source: "auto-corrected"`, so `chesslab slice` and the review UI
    both keep showing which geometry was measured and which was computed.
    """
    import json
    import shutil
    import time

    path = d / "log.jsonl"
    rows = [json.loads(ln) for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    changed, refused = 0, 0
    for i, _off, _bad, worst, _u in flagged:
        e = rows[i]
        frame = cv2.imread(str(d / e["frame"]))
        if frame is None:
            continue
        q = correct_quad(frame, e["corners"], prof)
        if q is None:
            refused += 1
            continue
        off2, _ = frame_offsets(frame, q, prof)
        _bad2, worst2 = judge(off2, max_off)
        if not np.isfinite(worst2) or worst2 >= worst:
            refused += 1
            continue
        e["corners"] = q
        e["corners_source"] = "auto-corrected"
        changed += 1
    if not changed:
        print(f"\n  fix: nothing improved ({refused} refused) — log untouched")
        return
    backup = path.with_suffix(f".jsonl.bak-{time.strftime('%Y%m%d-%H%M%S')}")
    shutil.copy2(path, backup)
    path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows),
                    encoding="utf-8")
    print(f"\n  fix: corrected {changed} frame(s), refused {refused} (no improvement). "
          f"Backup: {backup.name}")
    print("     re-slice the session so the crops follow the new geometry")


def write_montage(d: Path, log: list, prof, flagged: list, out: str) -> None:
    tiles = []
    for i, _off, bad, worst, _u in flagged[:12]:
        e = log[i]
        w = cv2.resize(warp_from_corners(cv2.imread(str(d / e["frame"])), prof, e["corners"]),
                       (300, 300))
        cv2.putText(w, f"{i}  {worst:.0f}px  {len(bad)}sq", (6, 22), cv2.FONT_HERSHEY_SIMPLEX,
                    0.6, (0, 255, 255), 2)
        tiles.append(w)
    while len(tiles) % 4:
        tiles.append(np.zeros((300, 300, 3), np.uint8))
    grid = np.vstack([np.hstack(tiles[r:r + 4]) for r in range(0, len(tiles), 4)])
    cv2.imwrite(out, grid)
    print(f"\n  wrote {out}")


def levels_montage(d: Path, log: list, prof, res: list, out: str, n_levels: int = 6) -> None:
    """One row per offset level: what does 5 px look like, what does 12 px look like?

    A whole-board thumbnail cannot show a 6 px error on an 800 px board, so each tile is a 3x3
    square region at NATIVE rectified resolution, centred on the frame's worst square, with the
    NOMINAL grid drawn on top. The green lines are where the crops will be cut; the wood grooves
    are where the board actually is. The gap between them is the error, at the scale it matters.
    """
    ok = [(i, bad, worst) for i, off, bad, worst, _u in res if off is not None and np.isfinite(worst)]
    if not ok:
        return
    lo, hi = min(w for _i, _b, w in ok), max(w for _i, _b, w in ok)
    cell = prof.board_size / 8.0
    rows = []
    for lvl in np.linspace(lo, hi, n_levels):
        i, bad, worst = min(ok, key=lambda t: abs(t[2] - lvl))
        e = log[i]
        warped = warp_from_corners(cv2.imread(str(d / e["frame"])), prof, e["corners"])
        # Centre on the worst square, clamped so the 3x3 window stays on the board.
        sq = bad[0][0] if bad else "d4"
        f, r = ord(sq[0]) - 97, int(sq[1]) - 1
        cx = min(max(f, 1), 6)
        cy = min(max(7 - r, 1), 6)
        x0, y0 = int((cx - 1) * cell), int((cy - 1) * cell)
        tile = warped[y0:y0 + int(3 * cell), x0:x0 + int(3 * cell)].copy()
        for k in range(4):
            gx, gy = int(k * cell), int(k * cell)
            cv2.line(tile, (gx, 0), (gx, tile.shape[0]), (0, 255, 0), 1)
            cv2.line(tile, (0, gy), (tile.shape[1], gy), (0, 255, 0), 1)
        tile = cv2.copyMakeBorder(tile, 34, 6, 6, 6, cv2.BORDER_CONSTANT, value=(20, 20, 20))
        cv2.putText(tile, f"{worst:.1f}px  frame {i}  {len(bad)} sq", (8, 24),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        rows.append(tile)
    h = min(t.shape[0] for t in rows)
    cv2.imwrite(out, np.hstack([t[:h] for t in rows]))
    print(f"\n  wrote {out} — green is the nominal grid, the grooves are the board")


def before_after_montage(d: Path, log: list, prof, flagged: list, out: str, n: int = 4) -> None:
    """Per frame, the SAME 3x3 square region before and after the fix, at native resolution.

    Holding the region fixed across the pair is the whole point. A tile that picks its own worst
    square on each side compares two different squares and shows a win that is not there — that
    mistake has been made here once already. The region is chosen from the BEFORE quad and reused.
    """
    cell = prof.board_size / 8.0
    rows = []
    for i, _off, bad, worst, _u in sorted(flagged, key=lambda t: -t[3])[:n]:
        e = log[i]
        frame = cv2.imread(str(d / e["frame"]))
        fixed = correct_quad(frame, e["corners"], prof)
        if frame is None or fixed is None:
            continue
        sq = bad[0][0] if bad else "d4"
        cx = min(max(ord(sq[0]) - 97, 1), 6)
        cy = min(max(8 - int(sq[1]), 1), 6)
        x0, y0, side = int((cx - 1) * cell), int((cy - 1) * cell), int(3 * cell)
        tiles = []
        for label, quad in (("BEFORE", e["corners"]), ("AFTER", fixed)):
            w = warp_from_corners(frame, prof, quad)
            off2, _ = frame_offsets(frame, quad, prof)
            tile = w[y0:y0 + side, x0:x0 + side].copy()
            for k in range(4):
                p = int(k * cell)
                cv2.line(tile, (p, 0), (p, tile.shape[0]), (0, 255, 0), 1)
                cv2.line(tile, (0, p), (tile.shape[1], p), (0, 255, 0), 1)
            tile = cv2.copyMakeBorder(tile, 34, 6, 6, 6, cv2.BORDER_CONSTANT, value=(20, 20, 20))
            head = (f"frame {i} {label} {sq} {off2.get(sq, float('nan')):.1f}px" if not tiles
                    else f"{label} {sq} {off2.get(sq, float('nan')):.1f}px  (was {worst:.1f})")
            cv2.putText(tile, head, (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            tiles.append(tile)
        rows.append(np.hstack(tiles))
    if not rows:
        return
    w = min(r.shape[1] for r in rows)
    cv2.imwrite(out, np.vstack([r[:, :w] for r in rows]))
    print(f"\n  wrote {out} — same square on both sides, green is where the crop will be cut")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--session", required=True)
    ap.add_argument("--max-off", type=float, default=6.0,
                    help="a square is bad when any of its edges is this far off the grid, in "
                         "rectified pixels (default 6 of a 100 px square)")
    ap.add_argument("--min-bad", type=int, default=1,
                    help="flag the frame at this many bad squares (default 1)")
    ap.add_argument("--sample", type=int, default=0, help="check only every Nth frame (0 = all)")
    ap.add_argument("--fix", action="store_true",
                    help="re-fit the corners of the FLAGGED frames from their measured grid and "
                         "write them back (log.jsonl is backed up first). Frames under the "
                         "threshold are left alone, and a correction that does not improve its "
                         "frame is discarded. Re-slice afterwards.")
    ap.add_argument("--calibrate", action="store_true",
                    help="also report what a deliberate corner shift does to the offsets")
    ap.add_argument("--montage", default="", help="write the worst frames' warps here")
    ap.add_argument("--before-after", default="",
                    help="write a before/after montage of the worst flagged frames here — the "
                         "same square on both sides, at native rectified resolution")
    ap.add_argument("--levels", default="",
                    help="write a zoomed montage across the offset range here — the "
                         "picture that answers what a given number actually looks like")
    args = ap.parse_args()

    # Aufnahmen liegen seit dem Umzug unter `recordings/`; `session_dir` kennt nur den alten Baum.
    try:
        d, _ = sessions.session_dir(args.session)
    except FileNotFoundError:
        d = config.DATA.recordings / args.session
        if not d.is_dir():
            raise
    prof = labeling._profile_for_session(labeling.read_session_meta(d), None)
    log = labeling.read_log(d)
    gone = sessions.missing_source_frames(d, log)
    if gone:
        print(f"[FAIL] {args.session}: {gone}")
        return 1
    rows = list(enumerate(log))[::max(1, args.sample)]
    cell = prof.board_size / 8
    print(f"session {args.session}: {len(log)} frames, checking {len(rows)}, "
          f"one square = {cell:.0f} px, bad above {args.max_off:.0f} px "
          f"({100 * args.max_off / cell:.0f} % of a square)")

    res = scan(d, rows, prof, args.max_off)
    unreadable = [i for i, off, _b, _w, _u in res if off is None]
    ok = [(i, bad, worst, u) for i, off, bad, worst, u in res if off is not None]
    if not ok:
        raise SystemExit("no frame could be measured")
    flagged = [t for t in res if t[1] is not None and len(t[2]) >= args.min_bad]

    worst_all = np.array([w for _i, _b, w, _u in ok])
    print(f"\n  worst square offset per frame: median {np.median(worst_all):.1f} px  "
          f"p90 {np.percentile(worst_all, 90):.1f}  max {worst_all.max():.1f}")
    if unreadable:
        print(f"  {len(unreadable)} frame(s) without corners or unreadable: {unreadable[:12]}")
    print(f"  FLAGGED ({args.min_bad}+ squares over {args.max_off:.0f} px): "
          f"{len(flagged)} of {len(ok)}")
    for i, _off, bad, worst, unread in flagged[:20]:
        names = ", ".join(f"{s} {v:.0f}" for s, v in bad[:8]) + (" …" if len(bad) > 8 else "")
        note = f", {unread} line(s) unreadable" if unread else ""
        print(f"    frame {i:5} (UI {i + 1:5}): {len(bad):2} bad, worst {worst:5.1f} px{note}"
              f"  [{names}]")

    if args.fix and flagged:
        if args.sample > 1:
            print("\n  fix REFUSED: --sample only measured every "
                  f"{args.sample}th frame, so the unsampled ones would keep their old geometry "
                  "while their neighbours changed. Re-run without --sample to fix.")
        else:
            apply_fix(d, prof, flagged, args.max_off)
    if args.calibrate:
        calibrate(d, log, ok[len(ok) // 2][0], prof, args.max_off)
    if args.montage and flagged:
        write_montage(d, log, prof, flagged, args.montage)
    if args.before_after and flagged:
        before_after_montage(d, log, prof, flagged, args.before_after)
    if args.levels:
        levels_montage(d, log, prof, res, args.levels)


if __name__ == "__main__":
    main()
