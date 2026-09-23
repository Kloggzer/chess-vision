"""One phone recording, however many files the recorder split it into.

The recorder swaps its container once a minute (`video.mp4`, `video-001.mp4`, …); indices run
continuously across segments, as in `android/desktop/RecordingSource.kt`.
"""

from __future__ import annotations

from collections.abc import Container, Iterator
from pathlib import Path
from typing import Any

import cv2


def recording_segments(video: Path) -> list[Path]:
    """`video.mp4` and every `video-NNN.mp4` beside it, in order. Always at least the file itself."""
    rest, i = [], 1
    while (part := video.with_name(f"{video.stem}-{i:03d}{video.suffix}")).is_file():
        rest.append(part)
        i += 1
    return [video, *rest]


class Recording:
    """The segments of one recording, read as a single stream of (whole-recording index, frame)."""

    def __init__(self, video: Path):
        self.segments = recording_segments(video)
        self._counts: list[int] = []

    def frames(self, start: int = 0, wanted: Container[int] | None = None,
               rotate: int | None = None) -> Iterator[tuple[int, Any]]:
        """Yield (whole-recording index, frame) from [start] to the end of the last segment.

        Forward decode; only [start] is seeked. `wanted` pays the decode for only those pictures,
        `rotate` combines with metadata rotation.
        """
        first, index = self._locate(start)
        for n, path in enumerate(self.segments[first:]):
            cap = cv2.VideoCapture(str(path))
            if not cap.isOpened():
                raise FileNotFoundError(f"cannot open video: {path}")
            try:
                rotation = _combined_rotation(cap, rotate)
                if n == 0 and start > index:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, start - index)
                    index = start
                while True:
                    # `grab` advances, `retrieve` is what costs (YUV->BGR plus an 11 MB allocation):
                    # `read` 10.4 ms against `grab` 1.96 ms per frame. Bit-identical.
                    if wanted is None:
                        ok, frame = cap.read()
                    elif not cap.grab():
                        break
                    elif index in wanted:
                        ok, frame = cap.retrieve()
                    else:
                        index += 1
                        continue
                    if not ok:
                        break
                    yield index, frame if rotation is None else cv2.rotate(frame, rotation)
                    index += 1
            finally:
                cap.release()

    def take(self, wanted: Container[int], rotate: int | None = None) -> Iterator[tuple[int, Any]]:
        """Exactly these indices from the latest SEEK-FREE start, rotated once. `wanted` must be
        non-empty and support `min`.
        """
        return self.frames(self.segment_base(min(wanted)), wanted=wanted, rotate=rotate)

    def segment_base(self, index: int) -> int:
        """The first whole-recording index of the segment holding [index] — a SEEK-FREE start.

        A seek is not exact on this material: 2 of 7 probes returned other pixels while
        `CAP_PROP_POS_FRAMES` reported the asked index. Walking costs 1.3 ms a frame.
        """
        return self._locate(index)[1]

    def _locate(self, start: int) -> tuple[int, int]:
        """(index of the segment holding [start], whole-recording index of its first frame)."""
        if start <= 0 or len(self.segments) == 1:
            return 0, 0
        base = 0
        for i, path in enumerate(self.segments[:-1]):
            if i == len(self._counts):
                self._counts.append(_frame_count(path))
            count = self._counts[i]
            if start < base + count:
                return i, base
            base += count
        return len(self.segments) - 1, base

def _frame_count(path: Path) -> int:
    """Ein unlesbarer Container ist ein Fehler, keine Laenge 0: sonst zeigt jeder spaetere Index auf
    die falsche Log-Zeile — ein falsches FEN.
    """
    cap = cv2.VideoCapture(str(path))
    try:
        count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    finally:
        cap.release()
    if count <= 0:
        raise FileNotFoundError(f"{path}: kein lesbarer Frame-Zaehler — abgeschnitten oder kein Atom")
    return count


def _combined_rotation(cap, rotate: int | None) -> int | None:
    """Cancel redundant metadata/user rotations without resampling.

    The angles ADD: `ROTATE_90_CLOCKWISE` on the raw frame reproduces what `ORIENTATION_META`
    calls 90 (measured directly — our 90 + 270 recordings cancel and cannot tell conventions
    apart)."""
    angles = {cv2.ROTATE_90_CLOCKWISE: 90, cv2.ROTATE_180: 180,
              cv2.ROTATE_90_COUNTERCLOCKWISE: 270}
    if rotate is None or rotate not in angles or not cap.get(cv2.CAP_PROP_ORIENTATION_AUTO):
        return rotate
    metadata = int(cap.get(cv2.CAP_PROP_ORIENTATION_META)) % 360
    if metadata not in (0, 90, 180, 270) or not cap.set(cv2.CAP_PROP_ORIENTATION_AUTO, 0):
        return rotate
    return {angle: code for code, angle in angles.items()}.get((metadata + angles[rotate]) % 360)
