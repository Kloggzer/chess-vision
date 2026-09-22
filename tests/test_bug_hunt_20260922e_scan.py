"""Punkt 43: ein Intervall ohne Zeugen nannte seine ruhigen Frames `clean`.

Gemessen ueber 27 Aufnahmen mit `scan.jsonl` (1 173 Intervalle, 65 671 Frames in Intervallen):
14 Intervalle tragen hoechstens drei ruhige Frames und erklaerten 24 davon zu `clean`.
"""

from chesslab import framescan as fs

SEG = {"start": 0, "end": 120, "ply": 3}


def _scan(hands=(), stride=3, end=120):
    """Eine Scan-Zeile je `stride`, sauber ausser in `hands`."""
    return [{"idx": idx, "person": 0.9 if idx in hands else 0.11, "skin": False,
             "grid": [], "cells": [10.0] * 64}
            for idx in range(0, end, stride)]


def test_an_interval_without_a_reference_calls_nothing_clean():
    """Drei ruhige Frames bauen keine Referenz — das Brett wurde also nie geprueft."""
    quiet = {105, 111, 117}
    scan = _scan(hands=[i for i in range(0, 120, 3) if i not in quiet])
    out = fs.classify(SEG, scan)
    assert "clean" not in out.values()
    assert all(v == "occluded" for v in out.values())


def test_a_measured_interval_still_has_its_clean_stock():
    """Die Gegenprobe: vier ruhige Frames reichen, und der Vorrat bleibt."""
    quiet = {102, 105, 111, 117}
    scan = _scan(hands=[i for i in range(0, 120, 3) if i not in quiet])
    out = fs.classify(SEG, scan)
    assert {out[i] for i in quiet} == {"clean"}
