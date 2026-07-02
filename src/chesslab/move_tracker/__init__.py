"""Move-Tracker-Prototyp: Brett-Digitalisierung per Frame-Differenz + Legalitäts-Fusion,
plus optionaler CNN-gestützter Occupancy-Recovery für festgefahrene Diff-Erkennung (Spec 09).

Kein Training, keine Trainingsdaten: ausgehend von der bekannten Startstellung wird jeder Zug aus den
GEÄNDERTEN Feldern (cv2.absdiff) + python-chess-Legalität eindeutig bestimmt; das CNN (cnn_recovery.py)
unterstützt optional bei mehrdeutigen/blockierten Situationen. Reuse von chesslab
für Kalibrierung/Warp/Kamera. Siehe README.md.
"""
