"""Compare prompts on suspicious cells, NOT against occlusion ground truth.

settle_dev already depends on SAM and measures appearance changes on visible pixels.
Only sufficiently visible cells are eligible proxies. Report extra coverage too:
covering every square would maximize proxy recall without improving the matte.

    uv run python scripts/prompt_probe.py --session rg-2026-09-06-20-27-33 --frames 010917,006078,016461
"""

from __future__ import annotations

import argparse
import json

import cv2

from chesslab.labeling import MATTE_DIRTY, SETTLE_SEEN_MIN, all_squares
from chesslab.sessions import session_dir

SQUARES = all_squares()

#: Prompt-Saetze, die verglichen werden. Der erste ist der heutige Stand.
SETS = {
    "heute": ("person", "hand", "arm", "sleeve", "wristwatch"),
    "+blurry": ("person", "hand", "arm", "sleeve", "wristwatch", "blurry object", "motion blur"),
    "+finger": ("person", "hand", "arm", "sleeve", "wristwatch", "finger", "forearm", "cuff"),
    "+alles": ("person", "hand", "arm", "sleeve", "wristwatch", "blurry object", "motion blur",
               "finger", "forearm", "cuff", "chess piece in hand"),
}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--session", required=True)
    ap.add_argument("--frames", required=True, help="Comma-separated frame numbers.")
    ap.add_argument("--settle-min", type=float, default=30.0,
                    help="Minimum deviation for a suspicious proxy cell; not an occlusion label.")
    args = ap.parse_args()

    from chesslab import matte as matte_mod
    from chesslab.labeling import _profile_for_session, read_session_meta

    rec, _ = session_dir(args.session)
    profile = _profile_for_session(read_session_meta(rec), None)
    log = {}
    for line in (rec / "log.jsonl").read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        r = json.loads(line)
        if "settle_dev" in r:
            log[str(r.get("frame") or "").split("/")[-1].split(".")[0]] = r

    wanted = [f.strip() for f in args.frames.split(",") if f.strip()]
    targets = {}
    for f in wanted:
        r = log.get(f)
        if r is None:
            print(f"  {f}: kein settle_dev — uebersprungen")
            continue
        dev = dict(zip(SQUARES, r["settle_dev"], strict=False))
        seen = dict(zip(SQUARES, r.get("settle_seen") or [], strict=False))
        targets[f] = ({s for s, v in dev.items() if v is not None
                       and v >= args.settle_min and (seen.get(s) or 0) >= SETTLE_SEEN_MIN}, r)
        print(f"  {f}: proxy cells (not truth) = {sorted(targets[f][0])}")

    for name, concepts in SETS.items():
        matte_mod.CONCEPTS = concepts
        got = miss = 0
        for f, (target, entry) in targets.items():
            board = cv2.imread(str(rec / entry["board"]))
            if board is None:
                raise FileNotFoundError(rec / entry["board"])
            alpha, found = matte_mod.alpha_sam3(board)
            cov = matte_mod.coverage_of(alpha, entry, profile)
            covered = {s for s, v in cov.items() if v > MATTE_DIRTY}
            hit = target & covered
            got += len(hit); miss += len(target - hit)
            score = f"{len(hit)}/{len(target)}" if target else "N/A (no eligible proxy cells)"
            print(f"     [{name}] {f}: {score}, extra covered={len(covered - target)}, "
                  f"concepts={sorted(found)}")
        total = got + miss
        score = f"{got}/{total} ({100 * got / total:.0f} %)" if total else "N/A"
        print(f"  == {name:9s} proxy coverage {score}; not an accuracy measurement\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
