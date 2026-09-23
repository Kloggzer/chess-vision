"""A segmented phone recording reads as ONE stream: walking across and seeking past a
segment boundary."""

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


def test_wanted_yields_the_same_pictures_it_would_have_decoded(segmented):
    """The whole point of the cheap walk: identical indices, identical pixels.

    `grab` skips the colour conversion, so a wrong pairing here would not look broken — it would
    hand the exporter frame 3's picture under frame 2's label and the crops would carry the wrong
    class. Pinned across the segment boundary, where the index arithmetic is easiest to get wrong.
    """
    want = {0, 2, 5, 6}
    full = {i: f for i, f in Recording(segmented).frames() if i in want}
    cheap = dict(Recording(segmented).frames(wanted=want))

    assert sorted(cheap) == sorted(want)
    assert sorted(cheap) == sorted(full)
    for i in want:
        assert np.array_equal(cheap[i], full[i]), f"frame {i} differs"
    # 5 and 6 live in the second segment: the walk must have crossed it, not stopped short.
    assert _level(cheap[5]) == 170


def test_wanted_that_asks_for_nothing_decodes_nothing(segmented):
    """An empty set is a legitimate plan (every frame already on disk), not a full pass."""
    assert list(Recording(segmented).frames(wanted=set())) == []


def test_wanted_combines_with_start(segmented):
    """`start` seeks, `wanted` filters — a caller that wants both must not get the seek twice."""
    got = dict(Recording(segmented).frames(start=2, wanted={2, 5}))
    assert sorted(got) == [2, 5]
    assert _level(got[2]) == 50


def test_segment_base_is_the_seek_free_start(segmented):
    """A worker starting part-way through must land on a container boundary, never mid-segment.

    `video.mp4` holds 0..3 and `video-001.mp4` holds 4..6, so anything in the second segment bases
    at 4. `frames(start=<a base>)` then takes the `start == index` branch and never seeks.
    """
    rec = Recording(segmented)
    assert [rec.segment_base(i) for i in (0, 3, 4, 6)] == [0, 0, 4, 4]

    walked = dict(rec.frames())
    from_base = dict(rec.frames(start=rec.segment_base(5), wanted={5, 6}))
    assert sorted(from_base) == [5, 6]
    for i in (5, 6):
        assert np.array_equal(from_base[i], walked[i]), f"frame {i} differs from the full walk"


def test_take_is_the_one_way_to_read_a_sparse_set(segmented):
    """Segment base, `wanted` filter and rotation in one call — the three every caller needs.

    They were written out by hand in five places, and each of the three is a wrong label when it
    is wrong: a seek lands beside the index, an unfiltered walk pays for pictures nobody asked
    for, and a rotation applied twice turns the board.
    """
    rec = Recording(segmented)
    walked = dict(rec.frames())
    got = dict(rec.take({5, 6}))
    assert sorted(got) == [5, 6]
    for i in (5, 6):
        assert np.array_equal(got[i], walked[i])

    # A range works too — that is what the scanners hand in — and so does a dict's keys.
    assert sorted(dict(rec.take(range(0, 7, 3)))) == [0, 3, 6]
    assert sorted(dict(rec.take({2: "a", 4: "b"}))) == [2, 4]


def test_take_rotates_once_and_only_once(segmented):
    """The rotation rides with the read, so no caller can apply a second one by mistake."""
    rec = Recording(segmented)
    plain = dict(rec.take({1}))[1]
    turned = dict(rec.take({1}, cv2.ROTATE_90_CLOCKWISE))[1]
    assert turned.shape[:2] == plain.shape[:2][::-1]
    assert np.array_equal(turned, cv2.rotate(plain, cv2.ROTATE_90_CLOCKWISE))
