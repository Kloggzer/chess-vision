"""Das Brett ohne ArUco finden — Takt aus den Linien, Lage aus dem Karo.

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


def _canonical(quad):
    """[a8, h8, h1, a1] — links oben zuerst, dann im Uhrzeigersinn.

    Die Rollen sind eine ANNAHME: welche Ecke a8 ist, sagt das Karo nicht (`docs/markerless.md`).
    """
    pts = np.array(quad, float)
    c = pts.mean(0)
    pts = pts[np.argsort(np.arctan2(pts[:, 1] - c[1], pts[:, 0] - c[0]))]
    start = int(np.argmin(pts.sum(1)))
    return [pts[(start + k) % 4] for k in range(4)]


def find_board(bgr):
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
    quad = [_intersect(lb[0], la[0]), _intersect(lb[-1], la[0]),
            _intersect(lb[-1], la[-1]), _intersect(lb[0], la[-1])]
    if any(q is None for q in quad):
        return None
    return [[float(p[0] / scale), float(p[1] / scale)] for p in _canonical(quad)]


def board_candidates(bgr, shifts: int = 1):
    """Der gefundene Quad und seine Nachbarn, je eine Zelle versetzt — Vorschlag, keine Loesung.

    Ein um eine Zelle verschobenes Gitter liegt GENAUSO auf Rillen, und `alignment_of` bevorzugt
    es sogar. Wer hieraus auswaehlt, braucht ein anderes Kriterium — `docs/markerless.md`.
    """
    quad = find_board(bgr)
    if quad is None:
        return []
    q = np.array(quad, float)
    du, dv = (q[1] - q[0]) / CELLS, (q[3] - q[0]) / CELLS
    out = [
        [[float(x), float(y)] for x, y in q + i * du + j * dv]
        for i in range(-shifts, shifts + 1)
        for j in range(-shifts, shifts + 1)
    ]
    # Die Mitte zuerst: bei Gleichstand gewinnt der ungeschobene Vorschlag.
    out.sort(key=lambda c: float(np.linalg.norm(np.array(c) - q)))
    return out
