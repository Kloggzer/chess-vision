"""A segmented phone recording is ONE stream — the seam every video consumer reads through.

Since 2026-08-13 the recorder rotates its container once a minute (`video.mp4`, `video-001.mp4`,
…) while the frame indices in `candidate.json` count the whole recording. Opening only the first
file truncates every export at minute one and the counts still look healthy, which is the failure
class this repo names the worst kind — so the boundary is pinned here, from both directions:
walking across it and seeking past it.
"""

import cv2
import numpy as np
import pytest

from chesslab.recording import Recording, recording_segments


def _write(path, values, size=(32, 16)):
    """A tiny mp4 whose frames are flat grey levels — the level identifies the frame."""
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), 10, size)
    for value in values:
        writer.write(np.full((size[1], size[0], 3), value, np.uint8))
    writer.release()
    return path


@pytest.fixture
def segmented(tmp_path):
    """`video.mp4` (4 frames, dark) + `video-001.mp4` (3 frames, bright)."""
    _write(tmp_path / "video.mp4", [10, 30, 50, 70])
    _write(tmp_path / "video-001.mp4", [150, 170, 190])
    return tmp_path / "video.mp4"


def _level(frame):
    return int(round(float(frame.mean()) / 10.0) * 10)


def test_segments_are_discovered_on_disk_in_order(segmented):
    """Never from metadata: the disk is what the Kotlin reader looks at too."""
    assert [p.name for p in recording_segments(segmented)] == ["video.mp4", "video-001.mp4"]

    _write(segmented.parent / "video-002.mp4", [200])
    assert len(recording_segments(segmented)) == 3

    # A gap ends the chain — `video-004.mp4` without `-003` is not part of this recording.
    _write(segmented.parent / "video-004.mp4", [210])
    assert len(recording_segments(segmented)) == 3


def test_indices_run_continuously_across_the_boundary(segmented):
    walked = [(i, _level(f)) for i, f in Recording(segmented).frames()]

    assert [i for i, _ in walked] == [0, 1, 2, 3, 4, 5, 6], "7 frames, one index space"
    assert [v for _, v in walked] == [10, 30, 50, 70, 150, 170, 190]


def test_a_seek_lands_in_the_second_segment(segmented):
    """Global index 5 is the second frame of `video-001.mp4` — the mapping the candidate's frame
    numbers demand, and the one a first-file-only reader cannot even express."""
    walked = [(i, _level(f)) for i, f in Recording(segmented).frames(5)]

    assert walked == [(5, 170), (6, 190)]


def test_a_seek_inside_the_first_segment_still_walks_into_the_second(segmented):
    walked = [(i, _level(f)) for i, f in Recording(segmented).frames(2)]

    assert [i for i, _ in walked] == [2, 3, 4, 5, 6]
    assert [v for _, v in walked] == [50, 70, 150, 170, 190]


def test_a_single_file_recording_is_the_old_behaviour(tmp_path):
    """One segment: a plain forward read, and a start that is a plain `CAP_PROP_POS_FRAMES` seek."""
    video = _write(tmp_path / "video.mp4", [10, 30, 50, 70])

    assert recording_segments(video) == [video]
    assert [i for i, _ in Recording(video).frames()] == [0, 1, 2, 3]
    assert [(i, _level(f)) for i, f in Recording(video).frames(2)] == [(2, 50), (3, 70)]


def test_an_unopenable_recording_raises(tmp_path):
    with pytest.raises(FileNotFoundError, match="cannot open video"):
        list(Recording(tmp_path / "no-such.mp4").frames())
