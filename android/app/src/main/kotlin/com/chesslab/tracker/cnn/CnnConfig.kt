package com.chesslab.tracker.cnn

/**
 * CNN safeguard tuning. Defaults mirror `config.TRACK_DEFAULTS`
 * (`config.py:455-499`) verbatim.
 */
data class CnnConfig(
    /** Square confidence "reliable" (`cnn_conf_thr`). */
    val confThr: Double = DEFAULT_CONF_THR,
    /** Recovery/verify agreement threshold (`cnn_min_agreement`). */
    val minAgreement: Double = DEFAULT_MIN_AGREEMENT,
    /** Recovery margin in SQUARES, not a fraction (`cnn_margin_squares`). */
    val marginSquares: Int = DEFAULT_MARGIN_SQUARES,
    /** Max CNN observations per pre-commit verify (`verify_window`). */
    val verifyWindow: Int = DEFAULT_VERIFY_WINDOW,
    /** Deep recovery: max half-moves bridged (`recovery_max_plies`). */
    val recoveryMaxPlies: Int = DEFAULT_RECOVERY_MAX_PLIES,
    /** Beam width of the conflict-guided search (`cnn_recovery.py:286`). */
    val recoveryBeam: Int = DEFAULT_RECOVERY_BEAM,
    /** Recovery stays operable under partial occlusion (`min_confident_recovery`). */
    val minConfidentRecovery: Int = DEFAULT_MIN_CONFIDENT_RECOVERY,
    /** Whole-board match needs plenty of clear view (`min_confident_board`). */
    val minConfidentBoard: Int = DEFAULT_MIN_CONFIDENT_BOARD,
    /** Minimum interval between recovery observations (`cnn_cooldown_s`). */
    val cooldownS: Double = DEFAULT_COOLDOWN_S,
    /** Periodic CNN check interval (`cnn_check_interval_s`). */
    val checkIntervalS: Double = DEFAULT_CHECK_INTERVAL_S,
) {
    companion object {
        const val DEFAULT_CONF_THR: Double = 0.85
        const val DEFAULT_MIN_AGREEMENT: Double = 0.97
        const val DEFAULT_MARGIN_SQUARES: Int = 1
        const val DEFAULT_VERIFY_WINDOW: Int = 8
        const val DEFAULT_RECOVERY_MAX_PLIES: Int = 4
        const val DEFAULT_RECOVERY_BEAM: Int = 8
        const val DEFAULT_MIN_CONFIDENT_RECOVERY: Int = 8
        const val DEFAULT_MIN_CONFIDENT_BOARD: Int = 32
        const val DEFAULT_COOLDOWN_S: Double = 2.0
        const val DEFAULT_CHECK_INTERVAL_S: Double = 10.0
    }
}
