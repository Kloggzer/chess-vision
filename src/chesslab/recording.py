"""One phone recording, however many files the recorder split it into.

Since 2026-08-13 the Kotlin recorder closes its muxer once a minute, so a session directory holds
`video.mp4`, `video-001.mp4`, … — one continuous stream in several containers (the encoder never
stopped, only the container was swapped). Everything here keys its work by WHOLE-RECORDING frame
indices, which is what `candidate.json` carries, so a tool that opened only `video.mp4` would
label the first minute and call the recording done: healthy-looking counts over a truncated game.

`android/desktop/RecordingSource.kt` is the reference semantics — segments discovered on DISK, in
name order, indices running continuously across the boundary.
"""

from __future__ import annotations

from collections.abc import Iterator
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
        self._counts: list[int] | None = None

    def frames(self, start: int = 0) -> Iterator[tuple[int, Any]]:
        """Yield (whole-recording index, frame) from [start] to the end of the last segment.

        Decoding is forward within a segment and continues into the next one; only a [start] is
        seeked to, and for a single-file recording that is the plain `CAP_PROP_POS_FRAMES` the
        callers always used — one segment must behave exactly like the old code.
        """
        first, index = self._locate(start)
        for n, path in enumerate(self.segments[first:]):
            cap = cv2.VideoCapture(str(path))
            if not cap.isOpened():
                raise FileNotFoundError(f"cannot open video: {path}")
            try:
                if n == 0 and start > index:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, start - index)
                    index = start
                while True:
                    ok, frame = cap.read()
                    if not ok:
                        break
                    yield index, frame
                    index += 1
            finally:
                cap.release()

    def _locate(self, start: int) -> tuple[int, int]:
        """(index of the segment holding [start], whole-recording index of its first frame)."""
        if start <= 0 or len(self.segments) == 1:
            return 0, 0
        base = 0
        for i, count in enumerate(self._frame_counts()[:-1]):
            if start < base + count:
                return i, base
            base += count
        return len(self.segments) - 1, base

    def _frame_counts(self) -> list[int]:
        """Frames per segment, probed once — only a seek past segment 1 needs them.

        The container's count and a full forward decode agree on the segmented sessions this was
        measured against (204855: 1800 and 900), and a forward walk never consults them at all.
        """
        if self._counts is None:
            self._counts = [_frame_count(p) for p in self.segments]
        return self._counts


def _frame_count(path: Path) -> int:
    cap = cv2.VideoCapture(str(path))
    try:
        return max(0, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
    finally:
        cap.release()
