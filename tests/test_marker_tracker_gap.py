"""`jump_confirm_frames` meint aufeinanderfolgende Bilder, auch im Python-Port."""
from __future__ import annotations

from chesslab.calibration import MarkerTracker


def _tracker():
    t = MarkerTracker()
    t.seed({0: [100.0, 100.0]})
    t.update({0: [100.0, 100.0]})  # Seed einloesen, Marker ist live
    return t


def test_a_candidate_does_not_survive_a_gap_in_the_detections():
    t = _tracker()

    t.update({0: [200.0, 100.0]})          # Sprung, Kandidat gesetzt
    for _ in range(500):
        t.update({})                        # Marker verdeckt
    t.update({0: [205.0, 100.0]})          # erstes Wiedersehen

    assert t.points()[0][0] == 100.0, (
        f"ein einziges Wiedersehen nach 500 blinden Bildern hat den Sprung bestaetigt: {t.points()[0]}")


def test_consecutive_sightings_still_confirm_the_jump():
    t = _tracker()

    for _ in range(t.p.jump_confirm_frames + 1):
        t.update({0: [200.0, 100.0]})

    assert t.points()[0][0] > 100.0, "ein echter, gehaltener Sprung muss weiterhin durchkommen"
