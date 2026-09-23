"""Video -> Frames: Drehung bestimmen, strikt vorwaerts dekodieren, Frames streamen."""

from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import closing
from pathlib import Path
from typing import Any

import cv2

from ..recording import Recording
from .progress import PROGRESS_EVERY

#: Grid lines (of 18) a rotation probe may leave unread and still win — pieces hide a couple.
ROTATION_UNREAD_SLACK = 2


#: Probe frames tried before the rotation chooser gives up (a probe can land under a hand).
ROTATION_PROBES = 5


def _unread_grid_lines(frame, geometry: dict) -> int:
    """Unread grid lines after warping [frame] with the CANDIDATE's corners; 0 means the geometry's
    orientation.
    """
    import numpy as np

    from ..alignment import GRID_PAD_CELLS, grid_lines
    from ..calibration import compute_homography

    bs = int(geometry["board_size"])
    pad = int(round(GRID_PAD_CELLS * bs / 8.0))
    h = np.array(compute_homography(geometry["corners"], bs, geometry.get("margin", 0.0)), np.float64)
    t = np.array([[1.0, 0.0, pad], [0.0, 1.0, pad], [0.0, 0.0, 1.0]])
    warped = cv2.warpPerspective(frame, t @ h, (bs + 2 * pad, bs + 2 * pad))
    lines = grid_lines(warped, bs, pad=pad)
    return sum(1 for axis in lines for line in axis if line is None)


def detect_rotation(video: Path, candidate: dict, wanted: set[int]) -> int | None:
    """The `cv2.ROTATE_*` the decode needs so Python sees the frames Kotlin measured.

    cv2 does not reliably honour phone rotation metadata. The board's own grid through the STORED
    corners judges; a passing as-is read is never overridden — a 180° flip also aligns symmetric
    lines."""
    want_w, want_h = (int(v) for v in candidate["geometry"]["frame_size"])
    probes = sorted(wanted)[:ROTATION_PROBES]
    with closing(Recording(video).frames(wanted=set(probes))) as stream:
        best: tuple[int, int | None] | None = None
        for target in probes:
            frame = next((f for i, f in stream if i >= target), None)
            if frame is None:
                return best[1] if best else None
            got = (frame.shape[1], frame.shape[0])
            rotations: list[int | None] = (
                [None, cv2.ROTATE_180]
                if got == (want_w, want_h)
                else [cv2.ROTATE_90_COUNTERCLOCKWISE, cv2.ROTATE_90_CLOCKWISE]
            )
            scored = [
                (_unread_grid_lines(frame if r is None else cv2.rotate(frame, r), candidate["geometry"]), r)
                for r in rotations
            ]
            scored.sort(key=lambda s: (s[0], s[1] is not None))  # a passing as-is wins ties
            if scored[0][0] <= ROTATION_UNREAD_SLACK:
                return scored[0][1]
            if best is None or scored[0][0] < best[0]:
                best = scored[0]
        raise ValueError(
            f"{video.name}: no rotation reads the board grid through the stored corners "
            f"(best left {best[0] if best else '?'} of 18 lines unread) — geometry and decode disagree."
        )


def decode_frames(video: Path, wanted: set[int], out_dir: Path, rotate: int | None = None) -> set[int]:
    """Write the wanted frames as `frames/NNNNNN.png`, decoding STRICTLY forward: a seek lands next
    to the index, and off by one is a wrong LABEL. Returns the indices that arrived.

    Frames already on disk are kept, so re-running the export (the way to pick up exporter fixes)
    stays affordable. An empty file counts as absent."""
    out_dir.mkdir(parents=True, exist_ok=True)
    for orphan in out_dir.glob("tmp-*.png"):
        orphan.unlink(missing_ok=True)
    have = {i for i in wanted if (f := out_dir / f"{i:06d}.png").is_file() and f.stat().st_size > 0}
    todo = wanted - have
    if have:
        print(f"  {len(have)} frames already on disk, {len(todo)} to decode")
    if not todo:
        return have
    # Nothing in a PNG says whether the barrel was removed: a raw frame decoded into an undistorted
    # set makes a silently MIXED session. Refuse.
    marker = out_dir / "lens.json"
    if marker.is_file():
        raise ValueError(
            f"{out_dir} holds undistorted frames ({marker.name}) and {len(todo)} planned frames "
            f"are missing. Re-run `:desktop undistort <video> {out_dir} every=<n>` with an "
            f"`every` that covers them — never decode raw frames into an undistorted set."
        )
    last, decoded = max(todo), set()
    recording = Recording(video)
    if len(recording.segments) > 1:
        print(f"  recording is {len(recording.segments)} segments: "
              f"{', '.join(p.name for p in recording.segments)}")
    # Ein abgebrochener Encode hinterlaesst ein HALBES PNG, das `st_size > 0` besteht; daher erst
    # `tmp-<idx>.png` (Codec an der ENDUNG, `static_quad` globt `[0-9]*`), dann umhaengen.
    with closing(recording.frames(wanted=todo, rotate=rotate)) as stream:
        for idx, frame in stream:
            staged = out_dir / f"tmp-{idx:06d}.png"
            if not cv2.imwrite(str(staged), frame):
                staged.unlink(missing_ok=True)
                raise OSError(f"could not write frame {out_dir / f'{idx:06d}.png'}")
            os.replace(staged, out_dir / f"{idx:06d}.png")
            decoded.add(idx)
            # The card reads this from the log (`lib/progress.ts`); a silent step looks hung.
            if len(decoded) % PROGRESS_EVERY == 0:
                print(f"  decode {len(decoded)}/{len(todo)} frames", flush=True)
            if idx >= last:
                break
    arrived = have | decoded
    if len(arrived) < len(wanted):
        print(f"[WARN] {len(wanted) - len(arrived)} planned frames never arrived from {video}")
    return arrived


def stream_frames(video: Path, rows: list[dict], rotate: int | None) -> Iterator[tuple[dict, Any]]:
    """(row, frame) for every planned row, decoded STRICTLY forward, never touching the disk (3.3 MB
    a frame, 82 GB for 12.7 GB of video).
    """
    wanted = {int(Path(r["frame"]).stem): r for r in rows}
    if not wanted:
        return
    last = max(wanted)
    # `take`, not a filter: the decoder builds only the ~11 % of pictures asked for.
    with closing(Recording(video).take(set(wanted), rotate)) as stream:
        for idx, frame in stream:
            yield wanted[idx], frame
            if idx >= last:
                break


def disk_frames(session_dir: Path, rows: list[dict]) -> Iterator[tuple[dict, Any]]:
    """(row, frame) read from `frames/NNNNNN.png`: undistorted frames are Kotlin's output, and a raw
    re-decode would differ.
    """
    for row in rows:
        yield row, cv2.imread(str(session_dir / row["frame"]))


def static_quad(frames: list[Path], profile) -> list[list[float]]:
    """The board quad of an UNDISTORTED frame set: the per-corner MEDIAN over the frames, measured
    on the frames, never through the barrel of the source video.
    """
    import numpy as np

    from ..calibration import MarkerTracker, board_corners_for_frame

    tracker = MarkerTracker()
    seen = []
    for path in frames:
        img = cv2.imread(str(path))
        if img is None:
            continue
        quad = board_corners_for_frame(img, profile, tracker)
        if quad is not None:
            seen.append(quad)
    if not seen:
        raise ValueError("no frame yielded a board quad — are the markers visible?")
    median = np.median(np.array(seen, dtype=float), axis=0)
    print(f"  quad from {len(seen)}/{len(frames)} frames (per-corner median)")
    return [[float(x), float(y)] for x, y in median]
