"""How well aligned is the WHOLE corpus, session by session?

`check_alignment.py` answers this for one session. This walks every session that has a log with
corners and reports the same measurement per session, so a decision about re-aligning the corpus is
made on the corpus and not on the one session that happened to look wrong.

This fits against the RAW frame, not the board store: the grid search needs `GRID_PAD_CELLS`
of surround (29 px at board_size=928) and a stored board keeps 12. A parked session is therefore
named and skipped, not silently counted as clean.

Each session is measured through its OWN calibration profile, because `board_size` differs per rig
(800 on the desk camera, 1600 on the phone) and an offset in rectified pixels is only comparable to
a tolerance expressed in the same units. The `px/cell` column is what makes the rows commensurable.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import numpy as np  # noqa: E402

from chesslab import labeling, sessions  # noqa: E402
from chesslab.alignment import worst_offset  # noqa: E402


def _rows(sdir: Path) -> list[dict]:
    log = sdir / "log.jsonl"
    if not log.exists():
        return []
    return [json.loads(x) for x in log.read_text(encoding="utf-8").splitlines() if x.strip()]


def main() -> int:
    import cv2

    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--sample", type=int, default=40,
                    help="at most this many frames per session, spread evenly")
    ap.add_argument("--tol-frac", type=float, default=0.077,
                    help="bad above this fraction of a cell (0.077 = 7.7 px of a 100 px cell)")
    args = ap.parse_args()

    print(f"{'session':<24}{'frames':>7}{'px/cell':>9}{'tol':>7}"
          f"{'median':>8}{'p90':>7}{'max':>7}{'bad':>7}")
    print("-" * 76)
    total_bad = total_seen = 0
    for sid, sdir in sessions.all_sessions():
        rows = [r for r in _rows(sdir) if r.get("corners")]
        if not rows:
            continue
        try:
            prof = labeling._profile_for_session(labeling.read_session_meta(sdir), None)
        except Exception as exc:  # a session whose profile is gone is a finding, not a crash
            print(f"{sid:<24}{len(rows):>7}   no profile: {exc}")
            continue
        gone = sessions.missing_source_frames(sdir, rows)
        if gone:
            print(f"{sid:<24}{len(rows):>7}   {gone.split(' — ')[0]}")
            continue
        cell = prof.board_size / 8.0
        tol = cell * args.tol_frac
        step = max(1, len(rows) // args.sample)
        vals = []
        for r in rows[::step]:
            frame = cv2.imread(str(sdir / r["frame"]))
            if frame is None:
                continue
            w = worst_offset(frame, r["corners"], prof)
            if w == w:
                vals.append(w)
        if not vals:
            print(f"{sid:<24}{len(rows):>7}   nothing measurable")
            continue
        v = np.array(vals)
        bad = int((v > tol).sum())
        total_bad += bad
        total_seen += len(v)
        print(f"{sid:<24}{len(rows):>7}{cell:9.0f}{tol:7.1f}"
              f"{np.median(v):8.1f}{np.percentile(v, 90):7.1f}{v.max():7.1f}"
              f"{bad:>4}/{len(v):<3}")
    print("-" * 76)
    print(f"{'TOTAL':<24}{'':>7}{'':>9}{'':>7}{'':>8}{'':>7}{'':>7}"
          f"{total_bad:>4}/{total_seen:<3}"
          f"   ({100 * total_bad / max(1, total_seen):.0f} % over tolerance)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
