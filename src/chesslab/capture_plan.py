"""Aus gemessenen Korpusluecken werden Aufnahmeauftraege, aus Brettecken eine Kamerapose.

Das Band macht die LAMPE, nicht das Feld — dasselbe Feld mass 6 bis 207 (`docs/capture-axes.md`).
"""

from __future__ import annotations

import math
import statistics
from collections.abc import Sequence
from pathlib import Path
from typing import TypedDict

from .ioutil import iter_jsonl

#: Die Zieldomaene des Zell-Mittelwerts in fuenf gleich breiten Gruppen (92,8 % der sichtbaren
#: Figurenzellen). Nicht nach Quantilen: die wanderten mit jedem Datensatz.
BANDS: tuple[tuple[int, int, str], ...] = (
    (40, 68, "dunkel"), (68, 96, "halbdunkel"), (96, 124, "mittel"),
    (124, 152, "halbhell"), (152, 180, "hell"))
#: Die Raender werden GEMESSEN, nie beauftragt: unter 40 faellt der Kontrast auf 28,7 gegen 69,2,
#: ueber 180 liegen 0,4 % des Korpus.
OUTSIDE: tuple[tuple[int, int, str], ...] = ((0, 40, "zu dunkel"), (180, 256, "zu hell"))
PIECES = ("wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")
#: Ab hier gilt eine Zelle als belegt. 200 sichtbare Crops sind rund drei Verweil-Episoden.
THIN = 200
#: Ein Band, das ueber ALLE Klassen so selten ist, ist unter diesem Licht nicht erreichbar.
UNREACHABLE = 500
#: 45-Grad-Schritte: von Hand noch zuverlaessig zu setzen, und acht decken die Drehung ab.
ORIENTATION_STEPS = 8
#: Hoehenstufen als NAMEN — der Nutzer stellt keine Messlatte auf.
HEIGHTS = ("tief", "normal", "hoch")
#: Wie oft eine Figur im Kasten liegt — die Buendelgrenze: es gibt nur eine schwarze Dame.
SET_BUDGET = {"P": 8, "N": 2, "B": 2, "R": 2, "Q": 1, "K": 1}
#: Wie viele Felder EINER Farbe gleichzeitig in einer Gruppe liegen (p90 ueber 15 235 Bretter). Ohne
#: die Grenze verlangte der Plan Unmoegliches.
BAND_CAPACITY: dict[tuple[str, str], int] = {
    ("light", "dunkel"): 3, ("light", "halbdunkel"): 8, ("light", "mittel"): 11,
    ("light", "halbhell"): 16, ("light", "hell"): 14,
    ("dark", "dunkel"): 22, ("dark", "halbdunkel"): 16, ("dark", "mittel"): 8,
    ("dark", "halbhell"): 4, ("dark", "hell"): 2,
}
UNKNOWN = "unbekannt"


def band_of(value: float | None) -> str:
    """`None` ist NICHT dunkel: 376 640 Komposit-Zeilen tragen keine `brightness`. `or 0.0` waere
    geraten, also bekommen sie ein eigenes Band.
    """
    if value is None:
        return UNKNOWN
    for lo, hi, name in BANDS + OUTSIDE:
        if lo <= value < hi:
            return name
    return "?"


def band_middle(name: str) -> float:
    """Die Mitte eines Bandes; „am naechsten an der Mitte" ist fuer alle fuenf Baender
    entscheidbar.
    """
    lo, hi = band_range(name)
    return (lo + hi) / 2


def band_range(name: str) -> tuple[int, int]:
    """Die Grenzen reisen im Auftrag mit, weil die App gegen sie MISST."""
    for lo, hi, band in BANDS + OUTSIDE:
        if band == name:
            return lo, hi
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
    """Ein Vorschlag, kein Befehl: das Feld mit dem Median naechst am Band. Die App misst live und
    haengt um.
    """

    square: str
    piece: str
    band: str
    lo: int
    hi: int
    #: p5/p95 DIESES Feldes: erst die Spannweite sagt, ob es das Band je erreicht hat.
    seen_lo: float
    seen_hi: float


class SquareStat(TypedDict):
    color: str
    median: float
    p5: float
    p95: float
    n: int


class Shot(TypedDict):
    """Genau die Schluessel von `docs/capture-plan.schema.json`."""

    id: str
    reason: str
    place: list[Placement]
    height: str
    orientations: int
    closes: list[Gap]


class Pose(TypedDict):
    foreshorten: float
    edge_px: float


def slug(*parts: str) -> str:
    """Kleinbuchstaben mit Bindestrich. Das Band gehoert in jede `id`: 22 von 24 Paaren aus Figur
    und Feldfarbe kollidieren ueber die Baender.
    """
    return "-".join("-".join(p.lower().split()) for p in parts)


def square_colour(square: str) -> str:
    """`a1` ist dunkel: Feld und Reihe gleicher Paritaet."""
    return "dark" if (ord(square[0]) - 97 + int(square[1]) - 1) % 2 == 0 else "light"


def square_stats(manifest: Path | str) -> dict[str, SquareStat]:
    """Feld -> Median UND Spannweite, aus dem Manifest gestreamt; Zeilen ohne `brightness` zaehlen
    NICHT.
    """
    seen: dict[str, list[float]] = {}
    for row in iter_jsonl(Path(manifest)):
        value = row.get("brightness")
        if value is None:
            continue
        seen.setdefault(str(row["square"]), []).append(float(value))
    out: dict[str, SquareStat] = {}
    for sq, values in seen.items():
        values.sort()
        out[sq] = SquareStat(color=square_colour(sq), median=statistics.median(values),
                             p5=values[len(values) // 20], p95=values[len(values) * 19 // 20],
                             n=len(values))
    return out


def board_spread(bright: dict[str, float]) -> float:
    """Hellster minus dunkelster Feldmedian (gemessen 112). Die Lampe verschiebt alle Felder
    zusammen, der Abstand bleibt — deshalb eine Buendelgrenze.
    """
    return max(bright.values()) - min(bright.values()) if bright else 0.0


def bundles(gaps: Sequence[Gap], spread: float) -> list[list[Gap]]:
    """So viele Luecken je Aufnahme, wie `SET_BUDGET`, `BAND_CAPACITY` und die Brettspanne hergeben.
    Die Reihenfolge von `gaps()` bleibt.
    """
    rest = list(gaps)
    out: list[list[Gap]] = []
    while rest:
        used: dict[str, int] = {}
        filled: dict[tuple[str, str], int] = {}
        mids: list[float] = []
        taken: list[Gap] = []
        left: list[Gap] = []
        for gap in rest:
            piece, mid = gap["piece"], band_middle(gap["band"])
            cell = (gap["square_color"], gap["band"])
            reach = max(mids + [mid]) - min(mids + [mid]) <= spread
            room = filled.get(cell, 0) < BAND_CAPACITY.get(cell, len(gaps))
            if reach and room and used.get(piece, 0) < SET_BUDGET.get(piece[1], 1):
                used[piece] = used.get(piece, 0) + 1
                filled[cell] = filled.get(cell, 0) + 1
                mids.append(mid)
                taken.append(gap)
            else:
                left.append(gap)
        out.append(taken)
        rest = left
    return out


def _assign(
    group: Sequence[Gap], stats: dict[str, SquareStat],
) -> tuple[list[Placement], list[Gap]]:
    """Jede Luecke bekommt ihr EIGENES freies Feld, das der Bandmitte naechste. Zurueck kommt auch,
    was keinen Platz fand: nicht geschlossen, naechste Aufnahme.
    """
    out: list[Placement] = []
    missed: list[Gap] = []
    taken: set[str] = set()
    for gap in group:
        lo, hi = band_range(gap["band"])
        mid = band_middle(gap["band"])
        free = [sq for sq in stats
                if square_colour(sq) == gap["square_color"] and sq not in taken]
        if not free:
            missed.append(gap)
            continue
        # Erst Felder, deren Spannweite das Band WIRKLICH erreicht; sonst entscheidet der Median
        # allein.
        reaches = [sq for sq in free if stats[sq]["p5"] <= hi and stats[sq]["p95"] >= lo]
        square = min(reaches or free, key=lambda sq: abs(stats[sq]["median"] - mid))
        taken.add(square)
        out.append(Placement(square=square, piece=gap["piece"], band=gap["band"], lo=lo, hi=hi,
                             seen_lo=float(stats[square]["p5"]),
                             seen_hi=float(stats[square]["p95"])))
    return out, missed


def shots(gaps: Sequence[Gap], stats: dict[str, SquareStat], limit: int = 10) -> list[Shot]:
    """Luecken zu BUENDELN, in der Reihenfolge von `coverage_gaps.gaps()` — nicht umsortieren.

    `limit` schneidet Buendel, nicht Luecken. Die Hoehe rotiert, der Korpus kennt bisher nur
    eine.
    """
    if not stats:
        raise ValueError("keine gemessene Helligkeit — erst scripts/backfill_brightness.py")
    spread = board_spread({sq: s["median"] for sq, s in stats.items()})
    rest = list(gaps)
    out: list[Shot] = []
    while rest and len(out) < limit:
        group = bundles(rest, spread)[0]
        place, missed = _assign(group, stats)
        # Ein leerer Auftrag bestuende die Schema-Pruefung und hiesse nichts.
        if not place:
            break
        closes = [g for g in group if not any(g is m for m in missed)]
        bands = sorted({p["band"] for p in place}, key=lambda b: band_middle(b))
        out.append(Shot(
            id=f"{len(out) + 1:02d}-" + slug(*bands),
            reason=f"{len(place)} Figuren, Baender {', '.join(bands)}",
            place=place,
            height=HEIGHTS[len(out) % len(HEIGHTS)],
            orientations=ORIENTATION_STEPS,
            closes=closes,
        ))
        rest = [g for g in rest if not any(g is c for c in closes)]
    return out


def pose_of(corners: Sequence[Sequence[float]]) -> Pose:
    """Die Kamerapose aus den Brettecken `[a8, h8, h1, a1]` (`SessionRecorder.kt:70-72`).

    `foreshorten` = hintere Kante durch vordere, 1,0 heisst senkrecht; der Korpus liegt bei
    0,955-1,025.
    """
    a8, h8, h1, a1 = (tuple(map(float, c)) for c in corners)
    edges = [math.dist(a8, h8), math.dist(h8, h1), math.dist(h1, a1), math.dist(a1, a8)]
    front = math.dist(a1, h1)
    return Pose(foreshorten=round(edges[0] / front, 4) if front else 0.0,
                edge_px=round(sum(edges) / len(edges), 1))
