"""Kleine, geteilte Bild-Hilfsfunktionen ohne fachliche Abhängigkeiten.

Eigenes Modul, damit mehrere Module `resize_keep_aspect` importieren können, ohne über
`labeling` zu gehen und einen Import-Zyklus zu erzeugen. Headless, kein torch.
"""

from __future__ import annotations

import cv2
import numpy as np


def resize_keep_aspect(img, out_size: tuple[int, int]):
    """Auf out_size (W,H) skalieren OHNE Verzerrung: gleichmäßig skalieren, Rest mittig mit
    Schwarz auffüllen (Letterbox). Bei gleichem Seitenverhältnis ist das eine randlose Skalierung."""
    ow, oh = int(out_size[0]), int(out_size[1])
    h, w = img.shape[:2]
    if w == 0 or h == 0:
        return np.zeros((oh, ow, 3), dtype=np.uint8)
    s = min(ow / w, oh / h)
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    interp = cv2.INTER_AREA if s < 1 else cv2.INTER_LINEAR
    r = cv2.resize(img, (nw, nh), interpolation=interp)
    canvas = np.zeros((oh, ow, 3), dtype=np.uint8)
    x, y = (ow - nw) // 2, (oh - nh) // 2
    canvas[y:y + nh, x:x + nw] = r
    return canvas


#: Ein Feld gilt als von Hand bedeckt, wenn so viel seines Crops Hautfarbe trägt.
SKIN_PATCH_FRAC = 0.90


def skin_patch(board_bgr, cell_px: float, pad_frac: float = 0.05,
               frac: float = SKIN_PATCH_FRAC) -> bool:
    """Trägt eines der 64 Feld-Crops fast nur Hautfarbe?

    Zweiter Zeuge neben dem Rillen-Read (`grid_occlusion`), der die Hand am Brettrand nicht sieht.
    Gelesen an den RASTERPUNKTEN, nicht als Schiebefenster: ein feldgroßes Fenster passt ganz in
    ein helles Feld und liest dann 100 %, der Crop nimmt über das Pad immer Fugenrand mit.
    """
    b = board_bgr.astype(np.float32)
    blue, green, red = b[..., 0], b[..., 1], b[..., 2]
    mask = (((red - blue) > 25) & ((red - green) > 8) & (red > 90)).astype(np.float32)
    k = max(3, int(round(cell_px * (1.0 + 2.0 * pad_frac))))
    box = cv2.boxFilter(mask, -1, (k, k), normalize=True)
    centres = np.array([int(round((i + 0.5) * cell_px)) for i in range(8)])
    centres = np.clip(centres, 0, min(box.shape[:2]) - 1)
    return float(box[np.ix_(centres, centres)].max()) > frac


def cell_illumination(board_bgr, board_size: int, border: int) -> np.ndarray:
    """Relative Helligkeit je Feld als 8x8-Karte, aus den FeldRAENDERN und je Feldfarbe normiert.

    Nicht aus allen Pixeln: Figuren stehen mittig, also traegt der aeussere Ring einer Zelle fast
    immer Brettflaeche. Je Feldfarbe auf deren eigenen Mittelwert bezogen, sonst waere das
    Karomuster im Feld und die Korrektur loeschte genau den Kontrast, den die Figur braucht.
    """
    g = cv2.cvtColor(board_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    cell = board_size / 8.0
    ring = max(2, int(cell * 0.15))
    med = np.zeros((8, 8), np.float32)
    for f in range(8):
        for r in range(8):
            y0, x0 = int(border + r * cell), int(border + f * cell)
            c = g[y0:y0 + int(cell), x0:x0 + int(cell)]
            med[r, f] = np.median(np.concatenate([
                c[:ring].ravel(), c[-ring:].ravel(),
                c[ring:-ring, :ring].ravel(), c[ring:-ring, -ring:].ravel()])) if c.size else 1.0
    rel = np.ones_like(med)
    idx = np.add.outer(np.arange(8), np.arange(8)) % 2
    for colour in (0, 1):
        m = idx == colour
        rel[m] = med[m] / max(float(med[m].mean()), 1e-3)
    return rel


def illumination_field(board_bgr, board_size: int, border: int,
                       cells: np.ndarray | None = None) -> np.ndarray:
    """Die 8x8-Karte auf das ganze Raster INTERPOLIERT — nicht durch ein Polynom gefittet.

    Ein Polynom extrapoliert: ueber fuenf Sessions gemessen ging das Feld auf -0,36 bis 3,46 und
    machte zwei davon schlechter als roh. Bilineare Interpolation kann das nicht
    (`docs/flat-field.md`).
    """
    rel = cell_illumination(board_bgr, board_size, border) if cells is None else cells
    h, w = board_bgr.shape[:2]
    # Auf die ZELLMITTEN setzen und ueber den Rand fortsetzen, sonst sitzt die Karte um
    # eine halbe Zelle daneben.
    big = cv2.resize(rel, (board_size, board_size), interpolation=cv2.INTER_CUBIC)
    field = np.ones((h, w), np.float32)
    field[border:border + board_size, border:border + board_size] = big
    field[:border] = field[border:border + 1]
    field[border + board_size:] = field[border + board_size - 1:border + board_size]
    field[:, :border] = field[:, border:border + 1]
    field[:, border + board_size:] = field[:, border + board_size - 1:border + board_size]
    return field


def flat_field(board_bgr, board_size: int, border: int,
               cells: np.ndarray | None = None, lo: float = 0.5, hi: float = 2.0):
    """Das geschaetzte Feld herausdividieren. Eine Interpolation, eine Division.

    `cells` uebersteuert die Schaetzung — dafuer gedacht, EINE Karte je Session zu nehmen: die
    Kamera bewegt sich nicht, und je Frame geschaetzt schwankt das Feld mit der Stellung.
    """
    fld = illumination_field(board_bgr, board_size, border, cells)
    gain = 1.0 / np.clip(fld, lo, hi)
    return np.clip(board_bgr.astype(np.float32) * gain[..., None], 0, 255).astype(np.uint8)
