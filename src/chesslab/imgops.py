"""Kleine, geteilte Bild-Hilfsfunktionen ohne fachliche Abhängigkeiten.

Eigenes Modul, damit `labeling.py` und `geometry3d.py` beide `resize_keep_aspect`
importieren können, ohne einen Import-Zyklus zu erzeugen (vorher: `geometry3d` importierte
lazy aus `labeling`, während `labeling` `geometry3d` top-level importiert). Headless, kein torch.
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
