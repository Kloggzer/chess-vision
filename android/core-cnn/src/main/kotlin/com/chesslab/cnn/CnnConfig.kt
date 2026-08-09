package com.chesslab.cnn

// Port of `cnn_recovery.py:125 CnnRecovery.__init__` defaults, cross-checked against
// `config.py TRACK_DEFAULTS` (which wins on conflict).
data class CnnConfig(
    // cnn_conf_thr
    val confThr: Double = 0.85,
    val minAgreement: Double = 0.97,
    // Margin in SQUARES, not a fraction: a capture differs from a non-capture at the
    // occupancy level by exactly ONE square (cnn_recovery.py:134-138). 1 == "strictly
    // better is enough"; a 0-square difference (promotion variants) yields NO answer.
    val marginSquares: Int = 1,
    // What one extra HALF-MOVE costs the deep search, in explained squares. Length used to be
    // free — `deriveMovesDeepFull` ranked by hits and broke ties by length, so a 4-ply fabrication
    // needed exactly ONE more square than the true 1-ply move to win, and the identity head's
    // documented B<->R confusion supplies that square. Measured on rec-20260807-135238 under dense
    // evaluation: all 12 phantoms were `cnn_recovery`, two bursts sitting ON a missed real ply
    // (Bd7 at 4770 -> Rc7/Kd1/Rd7/Ke1 at 4767; Qb4 at 6635 -> b4/Qxb4+ at 6641) — the same board
    // difference explained by a LONGER sequence, padded with a king round trip to fix parity.
    val plyCostSquares: Int = 0,
    val minConfidentBoard: Int = 32,
    val minConfidentRecovery: Int = 8,
    val recoveryMaxPlies: Int = 4,
    // cnn_recovery.py:286 derive_moves_deep(beam=8)
    val beam: Int = 8,
)
