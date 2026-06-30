"""Move-Tracker-Prototyp: Brett-Digitalisierung per Frame-Differenz + Legalitäts-Fusion.

Kein CNN, keine Trainingsdaten: ausgehend von der bekannten Startstellung wird jeder Zug aus den
GEÄNDERTEN Feldern (cv2.absdiff) + python-chess-Legalität eindeutig bestimmt. Reuse von chesslab
für Kalibrierung/Warp/Kamera. Siehe README.md.
"""
