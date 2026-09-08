"""Compare cached and uncached export mesh construction on an existing session log.

Run with PYTHONPATH=src and the project's Python. Outputs go to a temporary directory;
the recording and its geometry are never updated. Timings include decode, warp and WebP.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import tempfile
import time
from pathlib import Path

from chesslab import calibration, realgames


def benchmark(name: str, limit: int = 0) -> dict:
    rows = [json.loads(line) for line in
            (realgames.game_dir(name) / "log.jsonl").read_text(encoding="utf-8").splitlines()]
    if limit:
        rows = rows[:limit]
    if not rows:
        raise ValueError("The session log contains no selected rows")
    video = realgames.video_path(name)
    wanted = {int(Path(row["frame"]).stem) for row in rows}
    rotation = realgames.detect_rotation(video, realgames.load_candidate(name), wanted)
    profile = calibration.load_profile(realgames.EXPORT_PROFILE)
    cached = calibration._crop_mesh_coordinates
    results, reference = {}, None
    try:
        for label, coordinates in (("uncached", cached.__wrapped__), ("cached", cached)):
            cached.cache_clear()
            calibration._crop_mesh_coordinates = coordinates
            planned = copy.deepcopy(rows)
            with tempfile.TemporaryDirectory(prefix="chesslab-warp-") as directory:
                destination = Path(directory)
                started = time.perf_counter()
                stats = realgames.rewarp_boards(
                    destination, planned, profile,
                    frames=realgames.stream_frames(video, planned, rotation), progress=lambda _: None,
                )
                seconds = time.perf_counter() - started
                hashes = {p.relative_to(destination).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                          for p in destination.rglob("*.webp")}
                outcome = planned, stats, hashes
                if reference is None:
                    reference = outcome
                elif outcome != reference:
                    raise AssertionError("Cached export differs in rows, statistics or encoded boards")
                results[label] = {"seconds": seconds, "boards": len(hashes), **stats}
                print(f"{label}: {seconds:.3f}s, {len(hashes)} boards", flush=True)
    finally:
        calibration._crop_mesh_coordinates = cached
    results["byte_identical"] = True
    results["session"] = name
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("session", help="Recording directory name")
    parser.add_argument("--limit", type=int, default=0, help="Limit log rows; 0 uses all")
    args = parser.parse_args()
    if args.limit < 0:
        parser.error("--limit must be nonnegative")
    print(json.dumps(benchmark(args.session, args.limit), indent=2))
