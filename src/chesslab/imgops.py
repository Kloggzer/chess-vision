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
