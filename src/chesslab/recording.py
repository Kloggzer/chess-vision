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

        Decoding is forward within a segment and continues into the next one; only a [start] is
        seeked to, and for a single-file recording that is the plain `CAP_PROP_POS_FRAMES` the
        callers always used — one segment must behave exactly like the old code.

        `wanted`: yield ONLY these indices, and pay the decode for only those pictures.
        `rotate`: rotate the usual output, combining with metadata rotation when supported.
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
                    # `grab` advances the container, `retrieve` is what costs: measured 2026-09-08
                    # on 20260830-162019 (1440x2560), `read` 10.4 ms per frame against `grab`
                    # 1.96 ms — the YUV-to-BGR conversion and its 11 MB allocation dominate, not
                    # the decoding. Bit-identical, since `retrieve` decodes the frame `grab` took.
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
        """Exactly these indices, from the latest SEEK-FREE start, turned the right way up once.

        Every caller that wants a sparse set had been writing the same three steps by hand — find
        the segment base, filter to `wanted`, rotate — and each of them is a wrong label when it
        is wrong. `wanted` must be non-empty and support `min` (a set, a dict or a range).
        """
        return self.frames(self.segment_base(min(wanted)), wanted=wanted, rotate=rotate)

    def segment_base(self, index: int) -> int:
        """The first whole-recording index of the segment holding [index] — a SEEK-FREE start.

        `frames(start=...)` seeks when [start] is inside a segment, and a seek is not exact on this
        material: 2 of 7 probes came back with different pixels while `CAP_PROP_POS_FRAMES`
        reported the asked-for index (2026-09-08). A worker that must begin part-way through a
        recording therefore opens the containing segment and walks — `grab` costs 1.3 ms a frame.
        """
        return self._locate(index)[1]

    def _locate(self, start: int) -> tuple[int, int]:
        """(index of the segment holding [start], whole-recording index of its first frame)."""
        if start <= 0 or len(self.segments) == 1:
            return 0, 0
        base = 0
        for i, path in enumerate(self.segments[:-1]):
            # A start in minute two needs no decoder probes for the rest of the game.
            if i == len(self._counts):
                self._counts.append(_frame_count(path))
            count = self._counts[i]
            if start < base + count:
                return i, base
            base += count
        return len(self.segments) - 1, base

# TODO: ein unlesbarer oder atomloser Container liefert 0.0, und `max(0, ...)` macht daraus
# eine gueltig aussehende Laenge. `_locate` addiert die 0 nicht auf `base`, also zeigt jeder
# spaetere Index auf die falsche Log-Zeile — ein falsches FEN, kein fehlender Frame.
def _frame_count(path: Path) -> int:
    cap = cv2.VideoCapture(str(path))
    try:
        return max(0, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
    finally:
        cap.release()


def _combined_rotation(cap, rotate: int | None) -> int | None:
    """Cancel redundant metadata/user rotations without resampling or changing orientation.

    The two angles ADD, which holds only because both turn the same way: measured 2026-09-08 on
    three phone recordings, `cv2.rotate(raw, ROTATE_90_CLOCKWISE)` reproduces the auto-oriented
    frame that `ORIENTATION_META` calls 90. Our recordings all cancel (90 + 270), and a
    cancellation cannot tell the two conventions apart — hence the direct measurement.
    """
    angles = {cv2.ROTATE_90_CLOCKWISE: 90, cv2.ROTATE_180: 180,
              cv2.ROTATE_90_COUNTERCLOCKWISE: 270}
    if rotate is None or rotate not in angles or not cap.get(cv2.CAP_PROP_ORIENTATION_AUTO):
        return rotate
    metadata = int(cap.get(cv2.CAP_PROP_ORIENTATION_META)) % 360
    if metadata not in (0, 90, 180, 270) or not cap.set(cv2.CAP_PROP_ORIENTATION_AUTO, 0):
        return rotate
    return {angle: code for code, angle in angles.items()}.get((metadata + angles[rotate]) % 360)
