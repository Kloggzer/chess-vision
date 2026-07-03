"""Kurz-Check eines Videos: Auflösung, fps, Framezahl, erster/letzter Frame lesbar."""

import sys

import cv2

for p in sys.argv[1:]:
    c = cv2.VideoCapture(p)
    n = int(c.get(cv2.CAP_PROP_FRAME_COUNT))
    print(p, "open:", c.isOpened(), int(c.get(3)), "x", int(c.get(4)),
          "fps", round(c.get(5), 2), "frames", n)
    ok1, _ = c.read()
    c.set(cv2.CAP_PROP_POS_FRAMES, max(0, n - 2))
    ok2, _ = c.read()
    print("  erster Frame:", ok1, "| vorletzter Frame:", ok2)
    c.release()
