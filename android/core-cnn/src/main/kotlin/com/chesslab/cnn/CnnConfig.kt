package com.chesslab.cnn

// Ported from `cnn_recovery.py` when Python still carried the tracker. Both it and
// `TRACK_DEFAULTS` are deleted, so these values stand on their own and on the parity fixtures.
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
    //
    // Default 1 since 2026-08-09. It shipped at 0 on "the served configuration has no phantoms to
    // buy back" (specs/53 table) — refuted the same day by the first reference-PGN confirm:
    // 003957's served replay fabricated a 3-ply bridge at ply 39 (g4/Bxg4/Kg3, frame 005489, truth
    // Kxf3) and never found back, losing the remaining 29 plies. At 1, every extra half-move must
    // pay for itself in explained squares: parity filler loses, a genuine pair recovery (2 plies,
    // 4 squares) still wins. NOT 2 — at 2 recovery commits nothing at all (0 of 17 deciders,
    // 003957 collapses 67 -> 14 plies).
    val plyCostSquares: Int = 1,
    val minConfidentBoard: Int = 32,
    val minConfidentRecovery: Int = 8,
    val recoveryMaxPlies: Int = 4,
    // cnn_recovery.py:286 derive_moves_deep(beam=8)
    val beam: Int = 8,
    /**
     * Search on COLOUR (empty / white / black) instead of the exact piece type.
     *
     * The two axes fail apart, and measurably so: on the 4K recordings of 2026-08-24 the model
     * reads occupancy-plus-colour of an unobstructed start position at 0.97 and the piece type at
     * 0.81 (`TODO.md`), so a rook read as a knight makes an otherwise unambiguous move
     * unexplainable. Off by default — this is an experiment arm, not a retuning.
     */
    val colorAxis: Boolean = false,
)
