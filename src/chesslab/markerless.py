"""Das Brett ohne ArUco finden — Takt aus den Linien, Lage aus der Paritaet.

Gemessen und begründet in `docs/markerless.md`: ArUco allein besteht `alignment_of` nie, die
Genauigkeit kommt aus dem Grid-Fit — markerlos braucht nur einen einfangbaren Startquad.
"""

from __future__ import annotations

import cv2
import numpy as np

#: Arbeitsbreite. Alles darunter kostet Rillen, alles darüber nur Zeit.
WORK_W = 960

MIN_SEG_LEN = 25.0
LINES, CELLS = 9, 8
SPACING_LO, SPACING_HI, SPACING_STEP = 24.0, 130.0, 0.25

#: Deckel je Rasterlinie. Ohne ihn trägt EINE lange Tischkante den ganzen Kamm.
LINE_CAP = 260.0

LINE_TOL = 3
SPACING_SLACK = 0.10
ANGLE_TOL = 12.0

#: Anteil einer Zelle, in dem ein Segment noch zu seiner Rasterlinie zählt.
FIT_WINDOW = 0.22

#: Wie schwer zählt, dass AUSSERHALB des Bretts noch eine Gitterlinie liegt.
OUTSIDE_WEIGHT = 2.0

#: Wie weit über die gefundenen Linien hinaus gesucht wird, in Vielfachen von [SPACING_HI].
SEARCH_PAD = 1.5

#: Pixel je Zelle, in denen die Lage geprüft wird. Grob genug, dass es nichts kostet.
PHASE_CELL = 32

#: Wie viele Zellen Versatz die Lagekorrektur durchsucht.
PHASE_RANGE = 1

#: Wie die Homographie ueber die 81 Schnittpunkte geschaetzt wird. Der Bauch ist SYSTEMATISCH,
#: kein Ausreisser — Konsens waehlt dann eine Bildregion aus, kleinste Quadrate mitteln ihn.
GRID_FIT, GRID_FIT_THR = cv2.LMEDS, 0.0

#: Der Ring, aus dem die Feldfarbe kommt, als Anteil der Zelle vom Rand nach innen.
#: Weiter aussen liegt die Rille und bei ungenauem Quad die Nachbarzelle, weiter innen die Figur.
PHASE_RING = (0.10, 0.32)


def _segments(bgr):
    scale = WORK_W / bgr.shape[1]
    small = cv2.resize(bgr, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    gray = cv2.GaussianBlur(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY), (0, 0), 1.2)
    segs = cv2.createLineSegmentDetector().detect(gray)[0]
    if segs is None:
        return small, np.empty((0, 4), np.float32), scale
    segs = segs.reshape(-1, 4)
    keep = np.hypot(segs[:, 2] - segs[:, 0], segs[:, 3] - segs[:, 1]) > MIN_SEG_LEN
    return small, segs[keep], scale


def grid_angle(segs) -> float:
    """Die Richtung des GITTERS, 0..90 Grad.

    VIERFACHER Winkel: ein Gitter hat zwei senkrechte Familien, und die legt der doppelte Winkel
    aufeinander — 0 und 90 werden beide zu 0. Mit `2θ` lag der Wert *zwischen* den Familien.
    """
    ang = (np.degrees(np.arctan2(segs[:, 3] - segs[:, 1], segs[:, 2] - segs[:, 0])) + 180) % 180
    w = np.hypot(segs[:, 2] - segs[:, 0], segs[:, 3] - segs[:, 1])
    r = np.radians(4 * ang)
    return float((np.degrees(np.arctan2((w * np.sin(r)).sum(), (w * np.cos(r)).sum())) / 4) % 90)


def _family(segs, theta):
    ang = (np.degrees(np.arctan2(segs[:, 3] - segs[:, 1], segs[:, 2] - segs[:, 0])) + 180) % 180
    return segs[np.abs((ang - theta + 90) % 180 - 90) < ANGLE_TOL]


def _offsets(segs, normal):
    mid = np.stack([(segs[:, 0] + segs[:, 2]) / 2, (segs[:, 1] + segs[:, 3]) / 2], 1)
    return mid @ normal, np.hypot(segs[:, 2] - segs[:, 0], segs[:, 3] - segs[:, 1])


def _axis(pos, weight, spacings=None):
    """Takt UND Lage einer Achse: neun Linien sollen tragen, die nullte und zehnte nicht.

    Das Karo kann den Takt bestimmen, aber nicht die Lage — verschoben ist es nur invertiert
    (`docs/markerless.md`). Wo das Gitter AUFHOERT, steht dagegen in den Linien selbst.
    """
    if len(pos) < LINES:
        return None
    lo = float(pos.min()) - SEARCH_PAD * SPACING_HI
    span = int(np.ceil(float(pos.max()) - lo + SEARCH_PAD * SPACING_HI))
    grid = np.zeros(span + 1)
    np.add.at(grid, np.clip((pos - lo).astype(int), 0, span), weight)
    grid = cv2.GaussianBlur(grid.reshape(-1, 1), (1, 2 * LINE_TOL + 1), 0).ravel() * (2 * LINE_TOL + 1)
    ks = np.arange(LINES)
    best = None
    for d in (spacings if spacings is not None else np.arange(SPACING_LO, SPACING_HI, SPACING_STEP)):
        starts = np.arange(d, span - LINES * d, 1.0)
        if not len(starts):
            continue
        idx = np.clip((starts[:, None] + d * ks[None, :]).astype(int), 0, span)
        inside = np.minimum(grid[idx], LINE_CAP).sum(1)
        out_lo = np.minimum(grid[np.clip((starts - d).astype(int), 0, span)], LINE_CAP)
        out_hi = np.minimum(grid[np.clip((starts + LINES * d).astype(int), 0, span)], LINE_CAP)
        sc = inside - OUTSIDE_WEIGHT * (out_lo + out_hi)
        k = int(np.argmax(sc))
        if best is None or sc[k] > best[0]:
            best = (float(sc[k]), float(starts[k] + lo), float(d))
    return best


def _fit_family(segs, normal, targets, d, along):
    """Die neun Linien der Familie, jede aus IHREN Segmenten angepasst statt aus dem Raster.

    Das Raster sagt nur, welche Segmente zusammengehören. Ein Parallelogramm kann keine
    Perspektive; geschnittene Linien schon.
    """
    mid = np.stack([(segs[:, 0] + segs[:, 2]) / 2, (segs[:, 1] + segs[:, 3]) / 2], 1)
    w = np.hypot(segs[:, 2] - segs[:, 0], segs[:, 3] - segs[:, 1])
    off = mid @ normal
    lines = []
    for target in targets:
        m = np.abs(off - target) < abs(d) * FIT_WINDOW
        if m.sum() < 2:
            return None
        pts = np.concatenate([segs[m][:, :2], segs[m][:, 2:]])
        ww = np.repeat(w[m], 2)
        c = (pts * ww[:, None]).sum(0) / ww.sum()
        cov = ((pts - c) * ww[:, None]).T @ (pts - c) / ww.sum()
        direction = np.linalg.eigh(cov)[1][:, -1]
        if direction @ along < 0:
            direction = -direction
        n = np.array([-direction[1], direction[0]])
        lines.append((n, float(n @ c)))
    return lines


def _intersect(l1, l2):
    (n1, c1), (n2, c2) = l1, l2
    a = np.array([n1, n2])
    return None if abs(np.linalg.det(a)) < 1e-6 else np.linalg.solve(a, np.array([c1, c2]))


def _quad_from_grid(la, lb):
    """Die Ecken aus ALLEN 81 Schnittpunkten, nicht aus den vier aeussersten.

    Die vier sind die am staerksten tonnenverzeichneten Punkte im Bild (roh 15-17 px Bauch);
    eine Homographie ueber das ganze Gitter mittelt den Bauch statt ihn dort abzulesen.
    """
    src, dst = [], []
    for i, a in enumerate(la):
        for j, b in enumerate(lb):
            p = _intersect(b, a)
            if p is not None:
                src.append(p)
                dst.append([j, i])
    if len(src) < 4 * LINES:
        return None
    h, _ = cv2.findHomography(np.array(dst, np.float32), np.array(src, np.float32), GRID_FIT, GRID_FIT_THR)
    if h is None:
        return None
    box = np.array([[[0, 0], [CELLS, 0], [CELLS, CELLS], [0, CELLS]]], np.float32)
    return list(cv2.perspectiveTransform(box, h)[0])


def _canonical(quad):
    """[a8, h8, h1, a1] — links oben zuerst, dann im Uhrzeigersinn.

    Die Rollen sind eine ANNAHME: welche Ecke a8 ist, sagt das Karo nicht (`docs/markerless.md`).
    """
    pts = np.array(quad, float)
    c = pts.mean(0)
    pts = pts[np.argsort(np.arctan2(pts[:, 1] - c[1], pts[:, 0] - c[0]))]
    start = int(np.argmin(pts.sum(1)))
    return [pts[(start + k) % 4] for k in range(4)]


def _ring_means(board, n):
    """Je Zelle das Mittel ihres AUSSENRINGS: in der Mitte steht die Figur, am Rand das Feld."""
    c = board.reshape(n, PHASE_CELL, n, PHASE_CELL).swapaxes(1, 2).astype(np.float32)
    lo, hi = (int(round(f * PHASE_CELL)) for f in PHASE_RING)
    outer, inner = c[:, :, lo:-lo, lo:-lo], c[:, :, hi:-hi, hi:-hi]
    n_out, n_in = (PHASE_CELL - 2 * lo) ** 2, (PHASE_CELL - 2 * hi) ** 2
    return (outer.sum((2, 3)) - inner.sum((2, 3))) / (n_out - n_in)


#: Karo-Vorzeichen: +1/-1 nach (i+j), das einzige Muster, dem ein Brettfeld folgen MUSS.
_PARITY = (np.indices((CELLS, CELLS)).sum(0) % 2) * 2 - 1


def _parity_fit(m, i, j, pad):
    """Wie gut die SCHWAECHSTE Reihe des 8x8 dem Karo folgt — vorzeichenrichtig.

    Der Betrag reicht nicht: ein beschrifteter Rand variiert von den Buchstaben ebenso stark,
    nur nicht im Takt (`docs/markerless.md`).
    """
    f = m[pad + i:pad + i + CELLS, pad + j:pad + j + CELLS]
    g = np.sign((f - f.mean()) * _PARITY).sum() or 1.0
    d = g * _PARITY * (f - f.mean(1, keepdims=True))
    e = g * _PARITY * (f - f.mean(0, keepdims=True))
    return float(min(d.mean(1).min(), e.mean(0).min()))


def fix_phase(bgr, quad, rng: int = PHASE_RANGE):
    """`quad` um ganze Zellen verschieben, bis keine Randreihe mehr drin liegt.

    Der Detektor trifft den Takt zuverlaessig, aber nicht immer die Lage — die verbleibenden
    Fehler sind fast alle genau eine Zelle. Gemessen in `docs/markerless.md`.
    """
    q = np.array(quad, float)
    du, dv = (q[1] - q[0]) / CELLS, (q[3] - q[0]) / CELLS
    pad, n = rng + 1, CELLS + 2 * (rng + 1)
    s = n * PHASE_CELL
    src = np.array([q[0] - pad * (du + dv), q[0] + (CELLS + pad) * du - pad * dv,
                    q[0] + (CELLS + pad) * (du + dv), q[0] - pad * du + (CELLS + pad) * dv], np.float32)
    dst = np.array([[0, 0], [s, 0], [s, s], [0, s]], np.float32)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    board = cv2.warpPerspective(gray, cv2.getPerspectiveTransform(src, dst), (s, s))
    m = _ring_means(board, n)
    i, j = max(((i, j) for i in range(-rng, rng + 1) for j in range(-rng, rng + 1)),
               key=lambda k: _parity_fit(m, k[0], k[1], pad))
    return [[float(x), float(y)] for x, y in q + i * dv + j * du]


def find_board(bgr, phase: bool = True):
    """Vier Feldecken in Bildpixeln, oder None."""
    small, segs, scale = _segments(bgr)
    if len(segs) < 2 * LINES:
        return None
    t1 = grid_angle(segs)
    fa, fb = _family(segs, t1), _family(segs, (t1 + 90) % 180)
    if len(fa) < LINES or len(fb) < LINES:
        return None
    u = np.array([np.cos(np.radians(t1)), np.sin(np.radians(t1))])
    t2 = (t1 + 90) % 180
    v = np.array([np.cos(np.radians(t2)), np.sin(np.radians(t2))])
    nu, nv = np.array([-u[1], u[0]]), np.array([-v[1], v[0]])
    a = _axis(*_offsets(fa, nu))
    b = _axis(*_offsets(fb, nv))
    if a is None or b is None:
        return None
    # Dieselbe Zellgroesse auf beiden Achsen: ein Brett ist quadratisch, und die Bedingung
    # verwirft die meisten Loesungen, die sich an einer Fremdkante festgehalten haben.
    d = (a[2] + b[2]) / 2
    near = np.arange(d * (1 - SPACING_SLACK), d * (1 + SPACING_SLACK), SPACING_STEP)
    a = _axis(*_offsets(fa, nu), near) or a
    b = _axis(*_offsets(fb, nv), near) or b
    d = (a[2] + b[2]) / 2
    la = _fit_family(fa, nu, [a[1] + k * a[2] for k in range(LINES)], a[2], u)
    lb = _fit_family(fb, nv, [b[1] + k * b[2] for k in range(LINES)], b[2], v)
    if la is None or lb is None:
        return None
    quad = _quad_from_grid(la, lb)
    if quad is None:
        return None
    out = [[float(p[0] / scale), float(p[1] / scale)] for p in _canonical(quad)]
    return fix_phase(bgr, out) if phase else out
