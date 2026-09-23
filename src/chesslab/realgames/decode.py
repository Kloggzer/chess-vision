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
    """Unread grid lines after warping [frame] with the CANDIDATE's stored corners — 0 says the
    decoded orientation is the one the geometry was measured in."""
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
    """The `cv2.ROTATE_*` the decode needs so Python sees the frames the Kotlin side measured.

    cv2 does not reliably honour a phone recording's rotation metadata (measured 2026-08-10:
    portrait 1080x1920 delivered for a landscape-measured candidate, and one video needing 180°
    despite `CAP_PROP_ORIENTATION_AUTO`), while the candidate's corners live in the Kotlin
    reader's view. The judge is the board's own grid through the STORED corners: the right
    orientation reads all 18 lines, a wrong one almost none. An as-is read that passes is never
    overridden — for a centred board a 180° flip also aligns the (symmetric) lines, and flipping
    a good session would transpose a1<->h8 in every label.
    """
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
    """Write the wanted source frames as `frames/NNNNNN.png`, decoding STRICTLY forward.

    Never `CAP_PROP_POS_FRAMES`: seeking a long clip lands next to the requested index (the
    2026-08-06 stale-index defect class), and an index that is off by one here is a wrong LABEL,
    not a blurry picture. The walk runs through `Recording`, so a segmented recording is decoded
    to its end instead of stopping at the first minute. Returns the indices that actually arrived.
    [rotate] is `detect_rotation`'s verdict, applied to every written frame.

    **Frames already on disk are kept, not decoded again.** A re-export is otherwise a full
    forward decode of the whole video for pixels that cannot have changed, which made re-running
    the export unaffordable in practice — and that is how two sessions came to sit on a log
    written before `unknown_squares` existed while the code that writes it was already in the
    tree (found 2026-08-09: 760 of 760 dirty rows unprotected). The plan is a pure function of
    the candidate, so re-running it is the intended way to pick up an exporter fix; only the
    decode was in the way. An empty file counts as absent so a truncated write still repairs.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    for orphan in out_dir.glob("tmp-*.png"):
        orphan.unlink(missing_ok=True)
    have = {i for i in wanted if (f := out_dir / f"{i:06d}.png").is_file() and f.stat().st_size > 0}
    todo = wanted - have
    if have:
        print(f"  {len(have)} frames already on disk, {len(todo)} to decode")
    if not todo:
        return have
    # Nothing in a PNG says whether the barrel was taken out of it, so a set written by
    # `:desktop undistort` carries a receipt — and decoding one raw frame into it would make a
    # silently MIXED session, which is the exact failure mode specs/52 measured from the other
    # side (lens-corrected inference against a distorted corpus: 003957 67 -> 15 plies). Refuse,
    # and name the command that fills the gap properly.
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
    # `st_size > 0` war der ganze Resume-Test, aber ein abgebrochener Encode hinterlaesst ein
    # HALBES PNG, das ihn besteht und nie wieder geschrieben wird. Die Pixel gehen deshalb neben
    # den Zielnamen und werden erst umgehaengt, wenn sie ganz da sind. `tmp-<idx>.png`, nicht
    # `<idx>.png.tmp`: `imwrite` waehlt den Codec an der ENDUNG, und `static_quad` globt `[0-9]*`.
    with closing(recording.frames(wanted=todo, rotate=rotate)) as stream:
        for idx, frame in stream:
            staged = out_dir / f"tmp-{idx:06d}.png"
            if not cv2.imwrite(str(staged), frame):
                staged.unlink(missing_ok=True)
                raise OSError(f"could not write frame {out_dir / f'{idx:06d}.png'}")
            os.replace(staged, out_dir / f"{idx:06d}.png")
            decoded.add(idx)
            # The card reads this out of the log (`lib/progress.ts`): a step that prints
            # nothing for half an hour is indistinguishable from a hung one.
            if len(decoded) % PROGRESS_EVERY == 0:
                print(f"  decode {len(decoded)}/{len(todo)} frames", flush=True)
            if idx >= last:
                break
    arrived = have | decoded
    if len(arrived) < len(wanted):
        print(f"[WARN] {len(wanted) - len(arrived)} planned frames never arrived from {video}")
    return arrived


def stream_frames(video: Path, rows: list[dict], rotate: int | None) -> Iterator[tuple[dict, Any]]:
    """(row, frame) for every planned row, decoded STRICTLY forward out of the recording.

    The frame never touches the disk: `video -> webp -> labeling -> crop -> training` (User,
    2026-08-16). Writing it out first cost 3.3 MB per frame — 82 GB of session tree for 12.7 GB of
    video — to hand the very next step a picture it already had in memory. Forward only, for the
    reason `decode_frames` gives: a seek lands NEXT to the asked-for index, and an index off by one
    here is a wrong label rather than a blurry crop.
    """
    wanted = {int(Path(r["frame"]).stem): r for r in rows}
    if not wanted:
        return
    last = max(wanted)
    # `take` and not a filter here: the export asks for 11 % of the frames and paid the full
    # colour conversion for the other 89 %, twice over (this streams once for the fit and once
    # for the warp). The decoder now only builds the pictures that are asked for.
    with closing(Recording(video).take(set(wanted), rotate)) as stream:
        for idx, frame in stream:
            yield wanted[idx], frame
            if idx >= last:
                break


def disk_frames(session_dir: Path, rows: list[dict]) -> Iterator[tuple[dict, Any]]:
    """(row, frame) read from `frames/NNNNNN.png` — the source for a set the video cannot make.

    The sibling of `stream_frames`. Undistorted frames are Kotlin's output and a re-decode of the
    raw video would produce a different picture, so those rows come off the disk; everything else
    streams. One exporter, two sources, chosen by the caller.
    """
    for row in rows:
        yield row, cv2.imread(str(session_dir / row["frame"]))


def static_quad(frames: list[Path], profile) -> list[list[float]]:
    """The board quad of an UNDISTORTED frame set: the per-corner MEDIAN over the frames.

    A single frame's quad is hostage to whichever marker the hand happens to cover; the median over
    the whole recording is not. Measured on the FRAMES, never on the source video — they are
    undistorted and the video is not, and a quad fitted through the barrel does not fit without it.
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
