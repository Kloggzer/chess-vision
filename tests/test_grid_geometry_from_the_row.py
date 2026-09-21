"""Wer `missing_edges` fuettert, nimmt die Geometrie aus der LOG-ZEILE, nicht aus dem Bild.

`scripts/matte_audit.py` uebergab `board_size=gray.shape[0]` und `pad=0`. Das gespeicherte Brett
traegt seinen Rand aber MIT: 952 px bei `board_size` 928 und `board_border` 12. Der Sensor rasterte
damit mit 119 px Zellweite statt 116 und ohne Rand-Offset — und benannte Felder daneben.

Gemessen an 120 echten Brettern von `2026-09-19-15-50-28`: **31 (26 %) nennen andere Felder**,
darunter ein erfundenes `a8` und verlorene `c7`/`g1`. Geprueft wird hier die FORM, weil ein
synthetisches Brett den Unterschied nicht zuverlaessig erzeugt.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN = (ROOT / "scripts", ROOT / "src" / "chesslab")

# `board_size=` aus einer Bildform statt aus der Zeile — genau der Fehler von 2026-09-21.
_FROM_IMAGE = re.compile(r"board_size\s*=\s*[A-Za-z_][\w.]*\.shape\[")


def test_no_caller_takes_the_grid_geometry_from_the_image():
    treffer = [
        f"{p.relative_to(ROOT).as_posix()}:{i}"
        for base in SCAN
        for p in base.rglob("*.py")
        for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1)
        if _FROM_IMAGE.search(line)
    ]

    assert treffer == [], "Brettgroesse gehoert aus der Log-Zeile, nicht aus der Bildform: " + "; ".join(treffer)


def test_the_guard_sees_a_planted_violation(tmp_path):
    """Eine Ratsche ohne Gegenprobe ist eine Behauptung."""
    assert _FROM_IMAGE.search("missing_edges(gray, board_size=gray.shape[0], pad=0)")
    assert not _FROM_IMAGE.search('missing_edges(gray, board_size=entry["board_size"], pad=entry["board_border"])')
