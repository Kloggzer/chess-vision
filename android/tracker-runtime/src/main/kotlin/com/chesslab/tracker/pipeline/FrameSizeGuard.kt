package com.chesslab.tracker.pipeline

// The requested camera mode is only a wish: drivers fall back silently. A changed size invalidates the profile,
// whose corners are PIXELS — re-detect, never rescale by a ratio (commit a7dab73).

data class SizeMismatch(
    val note: String,
    val width: Int,
    val height: Int,
)

/** @param requestRegeneration a signal to re-detect, not the work: ArUco must not run on the analyzer thread. */
class FrameSizeGuard(
    private val warn: (String) -> Unit = {},
    private val info: (String) -> Unit = {},
    private val requestRegeneration: () -> Unit = {},
) {
    private var actualW = 0
    private var actualH = 0
    private var profileName = ""
    private var profileW = 0
    private var profileH = 0

    var mismatch: SizeMismatch? = null
        private set

    fun setProfile(
        name: String,
        width: Int,
        height: Int,
    ) {
        profileName = name
        profileW = width
        profileH = height
        actualW = 0
        actualH = 0
    }

    /** Retries every frame while a mismatch is unresolved: a regeneration can fail transiently (a hand over the
     *  markers), and a latched size would never try again. */
    fun note(
        width: Int,
        height: Int,
    ) {
        if (actualW == width && actualH == height && mismatch == null) return
        val firstSeen = actualW != width || actualH != height
        actualW = width
        actualH = height
        if (firstSeen) logDelivered(width, height)
        if (profileW == width && profileH == height) {
            mismatch = null
            return
        }
        // Before the first calibration there IS no profile; the two cases need different actions from the user.
        val calibrated = profileW > 0 && profileH > 0
        val text =
            if (calibrated) {
                "profile '$profileName' was calibrated at ${profileW}x$profileH, camera delivers ${width}x$height"
            } else {
                // Names no control: the one filled button is what the screen needs, and the text is also the
                // NOTIFICATION, where there is nothing to tap.
                "not calibrated yet — point the camera at the whole board"
            }
        mismatch = SizeMismatch(text, width, height)
        if (firstSeen) {
            val why = " — its board corners are pixel coordinates and no longer valid; re-detecting them."
            warn(if (calibrated) "$text$why" else "$text (camera delivers ${width}x$height)")
        }
        requestRegeneration()
    }

    private fun logDelivered(
        width: Int,
        height: Int,
    ) {
        // Requested vs delivered reports `camera/ResolutionMismatchLogger`; this guard REACTS.
        info("camera delivers ${width}x$height.")
    }
}
