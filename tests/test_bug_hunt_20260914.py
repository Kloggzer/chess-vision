"""Red regression proofs from a repository audit."""

from __future__ import annotations

from pathlib import Path

from chesslab.recording import recording_segments

ROOT = Path(__file__).resolve().parents[1]


def test_a_numbering_gap_deliberately_ends_the_chain(tmp_path):
    """WIDERLEGT: der Abbruch an der Luecke ist Absicht — ein Segment hinter einer Luecke gehoert
    NICHT zu dieser Aufnahme, sonst verschoebe sich der Gesamt-Index gegen jeden frueheren Lauf.
    """
    video = tmp_path / "video.mp4"
    later = tmp_path / "video-002.mp4"
    video.touch()
    later.touch()

    assert recording_segments(video) == [video]


def test_refine_quad_no_longer_offers_a_knob_nobody_turns():
    """`max_frac` wurde nur an `alignment_of` durchgereicht; kein Aufrufer setzte ihn je.

    Ein Parameter, der immer seinen Default traegt, liest sich wie eine Stellschraube und ist
    keine. Wer ihn zurueckholt, schreibt den Aufrufer dazu, der ihn braucht.
    """
    import inspect

    from chesslab.alignment import refine_quad

    assert "max_frac" not in inspect.signature(refine_quad).parameters
