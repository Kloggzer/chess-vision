"""Which cell is a piece example — torch-free, so `labeling` and the loss read ONE rule.

`training.occlusion` loads torch; a copy in `labeling` could drift from it unnoticed.
"""

from __future__ import annotations

#: Above this coverage a crop stops being a piece example — measured, piece accuracy on occupied
#: cells falls 0.62 -> 0.41 between 0.10 and 0.20. It still trains the occlusion output.
PIECE_VISIBLE_MAX = 0.15

#: Darunter traegt die Zelle kein Signal mehr — das LABEL bleibt richtig (es kommt aus dem
#: Spielzustand), nur das Pixel ist nicht lesbar: a5 auf 20-41-33 liegt bei 20 von 255 und stellt
#: 38 von 58 Val-Fehlern. Am Bild gewaehlt (2026-09-09), ab 30-40 zeigen die Zellen wieder Details.
#: Wirksam erst mit einem Slice, der `brightness` schreibt — ohne die Spalte gilt jede Zelle als
#: hell, alte Packs rechnen also unveraendert weiter.
CELL_DARK_MIN = 25.0


def coverage_of(row: dict) -> float:
    """`coverage` als Zahl — ausgeschriebenes `null` zaehlt wie ein fehlender Schluessel.

    EINE Lesart mit `_target` und `occlusion.classification_eligible`. `float(r.get(..., 0.0))`
    starb an einem `null`, waehrend der Datei-Loader daneben weiterrechnete.
    """
    return float(row.get("coverage") or 0.0)


def brightness_of(row: dict) -> float:
    """Ausgeschriebenes `null` ist UNGEMESSEN, nicht dunkel — dieselbe Regel wie
    `occlusion.classification_eligible`. `float(None)` starb im Worker, und
    `np.array([None], dtype=float)` wurde zu `nan` und damit still zu einer zu dunklen Zelle.
    """
    value = row.get("brightness")
    return 255.0 if value is None else float(value)


def classification_eligible(row: dict, visible_max: float = PIECE_VISIBLE_MAX,
                            dark_min: float = CELL_DARK_MIN) -> bool:
    # `None` ist UNGEMESSEN, nicht dunkel — dieselbe Regel wie `capture_plan.band_of`.
    # Dass `or 0.0` auch SAMs Absage als sichtbar liest, ist seit `labeling.clean_frames`
    # (2026-09-18) fast leer: 64 von 1 337 936 Zellen bleiben `None`, keine davon in v7 oder
    # test-v1. Umstellen hiesse `coverage_of` mitziehen — `test_clean_frame_coverage.py`.
    return coverage_of(row) <= visible_max and brightness_of(row) >= dark_min
