"""Which cell is a piece example — torch-free, so `labeling` and the loss read ONE rule.

`training.occlusion` loads torch; a copy in `labeling` could drift from it unnoticed.
"""

from __future__ import annotations

#: Above this coverage a crop stops being a piece example — measured, piece accuracy on occupied
#: cells falls 0.62 -> 0.41 between 0.10 and 0.20. It still trains the occlusion output.
PIECE_VISIBLE_MAX = 0.15

#: Darunter traegt die Zelle kein lesbares Signal, das LABEL bleibt richtig (a5 auf 20-41-33: 20 von
#: 255, 38 von 58 Val-Fehlern). Ohne `brightness`-Spalte gilt jede Zelle als hell.
CELL_DARK_MIN = 25.0


def coverage_of(row: dict) -> float:
    """`coverage` als Zahl — ausgeschriebenes `null` zaehlt wie ein fehlender Schluessel."""
    return float(row.get("coverage") or 0.0)


def brightness_of(row: dict) -> float:
    """Ausgeschriebenes `null` ist UNGEMESSEN, nicht dunkel: `np.array([None], dtype=float)` wird
    still zu `nan` und damit zu einer zu dunklen Zelle.
    """
    value = row.get("brightness")
    return 255.0 if value is None else float(value)


def classification_eligible(row: dict, visible_max: float = PIECE_VISIBLE_MAX,
                            dark_min: float = CELL_DARK_MIN) -> bool:
    # `None` ist UNGEMESSEN; dass `or 0.0` SAMs Absage als sichtbar liest, trifft nur noch 64 von 1
    # 337 936 Zellen (`test_clean_frame_coverage.py`).
    return coverage_of(row) <= visible_max and brightness_of(row) >= dark_min
