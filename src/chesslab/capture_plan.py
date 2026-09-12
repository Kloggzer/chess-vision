"""Aus gemessenen Korpusluecken werden Aufnahmeauftraege — und aus Brettecken eine Kamerapose.

`coverage_gaps.py` nennt die Luecken, aber nicht, wohin die Dame gehoert. Warum ein Auftrag ein
FELD nennt und kein Band zusagt, und warum der Kamerawinkel keine Achse ist: `docs/capture-axes.md`.
"""

from __future__ import annotations

import json
import math
import statistics
from collections.abc import Sequence
from pathlib import Path
from typing import TypedDict

#: Helligkeitsbaender des Zell-Mittelwerts. Die Grenzen folgen dem Lichtgradienten des Bretts
#: (h3 bei 156, a7 bei 20 auf 20-41-33), nicht einer runden Zahl. Hier und nicht in `scripts/`,
#: weil zwei Auswahlregeln daran haengen und `scripts/` kein Paket ist.
BANDS: tuple[tuple[int, int, str], ...] = (
    (0, 40, "sehr dunkel"), (40, 80, "dunkel"), (80, 130, "mittel"),
    (130, 180, "hell"), (180, 256, "sehr hell"))
PIECES = ("wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")
#: Ab hier gilt eine Zelle als belegt. 200 sichtbare Crops sind rund drei Verweil-Episoden.
THIN = 200
#: Ein Band, das ueber ALLE Klassen so selten ist, ist unter diesem Licht nicht erreichbar.
UNREACHABLE = 500
#: 45-Grad-Schritte: von Hand noch zuverlaessig zu setzen, und acht decken die Drehung ab.
ORIENTATION_STEPS = 8
#: Hoehenstufen als NAMEN — der Nutzer stellt keine Messlatte auf.
HEIGHTS = ("tief", "normal", "hoch")
UNKNOWN = "unbekannt"


def band_of(value: float | None) -> str:
    """`None` ist NICHT dunkel. 376 640 Komposit-Zeilen tragen keine `brightness`, und ein
    `or 0.0` warf sie geschlossen ins dunkelste Band — der Rest des Codes nimmt umgekehrt 255.0
    an (`training/data.py:186`). Beides waere geraten, also bekommen sie ein eigenes Band."""
    if value is None:
        return UNKNOWN
    for lo, hi, name in BANDS:
        if lo <= value < hi:
            return name
    return "?"


def band_middle(name: str) -> float:
    """Die Mitte eines Bandes. Die Auswahlregel fuer `place` und `reference_square` haengt daran:
    „das hellste bzw. dunkelste Feld" ist fuer `mittel` nicht entscheidbar, „am naechsten an der
    Mitte" fuer alle fuenf."""
    for lo, hi, band in BANDS:
        if band == name:
            return (lo + hi) / 2
    raise ValueError(f"unbekanntes Band: {name!r}")


class Gap(TypedDict):
    """Genau die Schluessel, die `coverage_gaps.gaps()` schreibt."""

    piece: str
    square_color: str
    band: str
    have: int
    fix: str
    corpus_in_band: int


class Placement(TypedDict):
    square: str
    piece: str


class Shot(TypedDict):
    """Genau die Schluessel von `docs/capture-plan.schema.json`."""

    id: str
    fix: str
    reason: str
    place: list[Placement]
    light: str | None
    reference_square: str
    height: str
    orientations: int
    closes: list[Gap]


class Pose(TypedDict):
    foreshorten: float
    edge_px: float


class CaptureStep(TypedDict):
    """Ein Schritt aus `capture.json`. Geschrieben wird sie von der Erfassungs-App, hier wird sie
    nur GELESEN — die Autoritaet ueber die Form ist `docs/capture-session.schema.json`."""

    ply: int
    orientation_deg: int
    shot_id: str


class CaptureSession(TypedDict):
    shot_id: str
    height: str
    steps: list[CaptureStep]


def slug(*parts: str) -> str:
    """`{piece}-{square_color}-{band}`. Das Band MUSS hinein: 58 Luecken verteilen sich auf nur
    24 Paare aus Figur und Feldfarbe, 22 davon kollidieren ueber die Baender."""
    return "-".join("-".join(p.lower().split()) for p in parts)


def square_colour(square: str) -> str:
    """`a1` ist dunkel. Feld und Reihe gleicher Paritaet heisst dunkel — dieselbe Regel wie
    ueberall sonst im Projekt, hier nur ohne Umweg ueber ein Brettobjekt."""
    return "dark" if (ord(square[0]) - 97 + int(square[1]) - 1) % 2 == 0 else "light"


def square_brightness(manifest: Path | str) -> dict[str, float]:
    """Feld -> MEDIAN der gemessenen Helligkeit, aus dem Manifest gestreamt.

    Zeilen ohne `brightness` zaehlen NICHT mit: 376 640 von 979 363 haben keine, und ein
    Mittelwert ueber eine Vorgabe waere eine erfundene Beleuchtung."""
    seen: dict[str, list[float]] = {}
    with open(manifest, encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            row = json.loads(line)
            value = row.get("brightness")
            if value is None:
                continue
            seen.setdefault(str(row["square"]), []).append(float(value))
    return {sq: statistics.median(v) for sq, v in seen.items()}


def _pick_square(colour: str, band: str, bright: dict[str, float]) -> str:
    """Das Feld der geforderten Farbe, dessen Median der Bandmitte am naechsten liegt."""
    mid = band_middle(band)
    options = [sq for sq in bright if square_colour(sq) == colour]
    if not options:
        raise ValueError(f"kein {colour}-Feld mit gemessener Helligkeit")
    return min(options, key=lambda sq: abs(bright[sq] - mid))


def shots(gaps: Sequence[Gap], bright: dict[str, float], limit: int = 10) -> list[Shot]:
    """Luecken zu Auftraegen, in der Reihenfolge, die `coverage_gaps.gaps()` schon liefert.

    Nicht umsortieren — dort steht `fix="Stellung"` vor `fix="Licht"` und darin aufsteigend nach
    `have`. `limit` schneidet nur ab. Die Hoehe rotiert, damit ueber die Auftraege alle drei
    Stufen vorkommen: der Korpus kennt bisher genau eine."""
    out: list[Shot] = []
    for i, gap in enumerate(gaps[:limit]):
        square = _pick_square(gap["square_color"], gap["band"], bright)
        stellung = gap["fix"] == "Stellung"
        out.append(Shot(
            id=slug(gap["piece"], gap["square_color"], gap["band"]),
            fix=gap["fix"],
            reason=f"{gap['piece']} auf {gap['square_color']}em Feld, Band "
                   f"'{gap['band']}': {gap['have']} Belege",
            place=[Placement(square=square, piece=gap["piece"])] if stellung else [],
            light=None if stellung else gap["band"],
            reference_square=square,
            height=HEIGHTS[i % len(HEIGHTS)],
            orientations=ORIENTATION_STEPS,
            closes=[gap],
        ))
    return out


def pose_of(corners: Sequence[Sequence[float]]) -> Pose:
    """Die Kamerapose aus den Brettecken `[a8, h8, h1, a1]` (`SessionRecorder.kt:70-72`).

    `foreshorten` ist die hintere Kante `a8-h8` durch die vordere `a1-h1`; 1,0 heisst senkrecht
    von oben. Gemessen ueber alle 24 Aufnahmen: 0,955 bis 1,025, Median 0,986 — der Korpus hat
    EINE Pose, und ohne diese Spalte ist das nicht nachpruefbar."""
    a8, h8, h1, a1 = (tuple(map(float, c)) for c in corners)
    edges = [math.dist(a8, h8), math.dist(h8, h1), math.dist(h1, a1), math.dist(a1, a8)]
    front = math.dist(a1, h1)
    return Pose(foreshorten=round(edges[0] / front, 4) if front else 0.0,
                edge_px=round(sum(edges) / len(edges), 1))
