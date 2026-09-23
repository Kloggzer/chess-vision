package com.chesslab.cnn

// Python's `cnn_recovery.py` and `TRACK_DEFAULTS` are deleted: these values stand on their own and on the parity fixtures.
data class CnnConfig(
    val confThr: Double = 0.85,
    val minAgreement: Double = 0.97,
    // SQUARES, not a fraction: a capture differs from a non-capture by exactly ONE occupancy square. 1 means
    // "strictly better is enough"; a 0-square difference (promotion variants) yields NO answer.
    val marginSquares: Int = 1,
    // Extra half-moves are PRICED in explained squares: free length let a 4-ply fabrication beat the true move
    // on one B<->R misread (12 phantoms on rec-20260807-135238). At 0, 003957 lost 29 plies to a 3-ply bridge;
    // at 2 recovery commits nothing at all (003957: 67 -> 14 plies).
    val plyCostSquares: Int = 1,
    val minConfidentBoard: Int = 32,
    val minConfidentRecovery: Int = 8,
    val recoveryMaxPlies: Int = 4,
    val beam: Int = 8,
    /** COLOUR instead of piece type: on the 4K recordings occupancy-plus-colour reads 0.97 and type 0.81, so a
     *  rook read as a knight made a clear move unexplainable. An experiment arm, off by default. */
    val colorAxis: Boolean = false,
)
