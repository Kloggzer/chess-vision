"""Move tracker prototype: board digitalization via frame difference + legality fusion,
plus optional CNN-supported occupancy recovery for stuck diff detection (Spec 09).

No training, no training data: starting from the known initial position, each move is uniquely
determined from the CHANGED squares (cv2.absdiff) + python-chess legality; the CNN (cnn_recovery.py)
optionally assists in ambiguous/blocked situations. Reuses chesslab
for calibration/warp/camera. See README.md.
"""
