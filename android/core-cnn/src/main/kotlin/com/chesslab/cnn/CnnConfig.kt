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
    val minConfidentBoard: Int = 32,
    val minConfidentRecovery: Int = 8,
    val recoveryMaxPlies: Int = 4,
    // cnn_recovery.py:286 derive_moves_deep(beam=8)
    val beam: Int = 8,
)
