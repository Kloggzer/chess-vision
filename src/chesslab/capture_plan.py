"""Aus gemessenen Korpusluecken werden Aufnahmeauftraege — und aus Brettecken eine Kamerapose.

Ein Auftrag ist ein BUENDEL, und das Band macht die LAMPE, nicht das Feld — dasselbe Feld mass 6
bis 207. Der Plan schlaegt Felder nur vor, die App misst. `docs/capture-axes.md`.
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
#: Wie oft eine Figur im Kasten liegt. Sie ist die Buendelgrenze: `bQ` fehlt in fuenf Baendern,
#: es gibt aber nur eine schwarze Dame — also braucht es fuenf Aufnahmen, nicht fuenf Auftraege.
SET_BUDGET = {"P": 8, "N": 2, "B": 2, "R": 2, "Q": 1, "K": 1}
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
    """Die Mitte eines Bandes. Die Feldwahl haengt daran: „das hellste bzw. dunkelste Feld" ist
    fuer `mittel` nicht entscheidbar, „am naechsten an der Mitte" fuer alle fuenf."""
    lo, hi = band_range(name)
    return (lo + hi) / 2


def band_range(name: str) -> tuple[int, int]:
    """Die Grenzen selbst. Sie reisen im Auftrag mit, weil die App gegen sie MISST — eine Mitte
    allein sagt nicht, ob ein Feld gerade drin liegt."""
    for lo, hi, band in BANDS:
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
    """Ein Vorschlag, kein Befehl: `square` ist das Feld, dessen Median dem Band am naechsten
    liegt, `lo`/`hi` das Band. Die App misst live und haengt um."""

    square: str
    piece: str
    band: str
    lo: int
    hi: int


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
    """Kleinbuchstaben mit Bindestrich. Das Band gehoert in jede `id`: 58 Luecken verteilen sich
    auf nur 24 Paare aus Figur und Feldfarbe, 22 davon kollidieren ueber die Baender."""
    return "-".join("-".join(p.lower().split()) for p in parts)


def square_colour(square: str) -> str:
    """`a1` ist dunkel. Feld und Reihe gleicher Paritaet heisst dunkel — dieselbe Regel wie
    ueberall sonst im Projekt, hier nur ohne Umweg ueber ein Brettobjekt."""
    return "dark" if (ord(square[0]) - 97 + int(square[1]) - 1) % 2 == 0 else "light"


def square_stats(manifest: Path | str) -> dict[str, SquareStat]:
    """Feld -> Median UND Spannweite, aus dem Manifest gestreamt.

    Der Median waehlt ein Feld, sagt aber nicht, ob das Band dort je erreicht wurde: `a8` mass 6
    bis 207, seine Bandlage haengt an der Lampe. Zeilen ohne `brightness` zaehlen NICHT mit —
    376 640 von 979 363 haben keine, und eine Vorgabe waere eine erfundene Beleuchtung."""
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
    out: dict[str, SquareStat] = {}
    for sq, values in seen.items():
        values.sort()
        out[sq] = SquareStat(color=square_colour(sq), median=statistics.median(values),
                             p5=values[len(values) // 20], p95=values[len(values) * 19 // 20],
                             n=len(values))
    return out


def board_spread(bright: dict[str, float]) -> float:
    """Wie weit das Brett bei EINER Lampeneinstellung spannt: hellster minus dunkelster Feldmedian.

    Gemessen 112 (a7 bei 45, g4 bei 157). Die Lampe verschiebt alle Felder zusammen, der Abstand
    zwischen ihnen ist der Gradient des Bretts und bleibt — das macht ihn zur Buendelgrenze."""
    return max(bright.values()) - min(bright.values()) if bright else 0.0


def bundles(gaps: Sequence[Gap], spread: float) -> list[list[Gap]]:
    """So viele Luecken je Aufnahme, wie Figurenset UND Lampe hergeben.

    Zwei Grenzen: eine Figur liegt nur so oft im Kasten (`SET_BUDGET`), und zwei Baender passen
    nur zusammen, wenn ihre Mitten naeher beieinander liegen als das Brett spannt — sonst stuende
    im selben Bild ein Feld auf 20 und eines auf 218. Die Reihenfolge von `gaps()` bleibt."""
    rest = list(gaps)
    out: list[list[Gap]] = []
    while rest:
        used: dict[str, int] = {}
        mids: list[float] = []
        taken: list[Gap] = []
        left: list[Gap] = []
        for gap in rest:
            piece, mid = gap["piece"], band_middle(gap["band"])
            reach = max(mids + [mid]) - min(mids + [mid]) <= spread
            if reach and used.get(piece, 0) < SET_BUDGET.get(piece[1], 1):
                used[piece] = used.get(piece, 0) + 1
                mids.append(mid)
                taken.append(gap)
            else:
                left.append(gap)
        out.append(taken)
        rest = left
    return out


def _assign(
    group: Sequence[Gap], bright: dict[str, float],
) -> tuple[list[Placement], list[Gap]]:
    """Jede Luecke bekommt ihr EIGENES Feld — das der Bandmitte naechste, das noch frei ist.
    Ohne die Sperre stuenden zwoelf Figuren auf demselben `a8`. Zurueck kommt auch, wofuer kein
    Feld mehr da war: diese Luecken sind NICHT geschlossen und gehoeren in die naechste Aufnahme."""
    out: list[Placement] = []
    missed: list[Gap] = []
    taken: set[str] = set()
    for gap in group:
        lo, hi = band_range(gap["band"])
        mid = band_middle(gap["band"])
        free = [sq for sq in bright
                if square_colour(sq) == gap["square_color"] and sq not in taken]
        if not free:
            missed.append(gap)
            continue
        square = min(free, key=lambda sq: abs(bright[sq] - mid))
        taken.add(square)
        out.append(Placement(square=square, piece=gap["piece"], band=gap["band"], lo=lo, hi=hi))
    return out, missed


def shots(gaps: Sequence[Gap], bright: dict[str, float], limit: int = 10) -> list[Shot]:
    """Luecken zu BUENDELN, in der Reihenfolge, die `coverage_gaps.gaps()` schon liefert.

    Nicht umsortieren — dort steht `fix="Stellung"` vor `fix="Licht"` und darin aufsteigend nach
    `have`. `limit` schneidet BUENDEL ab, nicht Luecken. Die Hoehe rotiert, damit ueber die
    Auftraege alle drei Stufen vorkommen: der Korpus kennt bisher genau eine."""
    if not bright:
        raise ValueError("keine gemessene Helligkeit — erst scripts/backfill_brightness.py")
    spread = board_spread(bright)
    rest = list(gaps)
    out: list[Shot] = []
    while rest and len(out) < limit:
        group = bundles(rest, spread)[0]
        place, missed = _assign(group, bright)
        # Nichts platzierbar heisst: die Felder dieser Farbe sind alle. Ein leerer Auftrag waere
        # `id='01-'` und „0 Figuren" — er bestuende die Schema-Pruefung und hiesse nichts.
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

    `foreshorten` ist die hintere Kante `a8-h8` durch die vordere `a1-h1`; 1,0 heisst senkrecht
    von oben. Gemessen ueber alle 24 Aufnahmen: 0,955 bis 1,025, Median 0,986 — der Korpus hat
    EINE Pose, und ohne diese Spalte ist das nicht nachpruefbar."""
    a8, h8, h1, a1 = (tuple(map(float, c)) for c in corners)
    edges = [math.dist(a8, h8), math.dist(h8, h1), math.dist(h1, a1), math.dist(a1, a8)]
    front = math.dist(a1, h1)
    return Pose(foreshorten=round(edges[0] / front, 4) if front else 0.0,
                edge_px=round(sum(edges) / len(edges), 1))
