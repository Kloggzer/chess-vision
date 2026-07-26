package com.chesslab.tracker.pipeline

// Port of `tracker.py::_note_frame_size` (+ the request half of `_regenerate_profile`).
//
// The requested camera mode is only a wish: drivers silently fall back to their nearest
// supported mode, so the size of an actually delivered frame is the only trustworthy number.
// A changed frame size also invalidates the calibration profile, whose board corners are
// PIXEL coordinates — they must be re-detected, never rescaled by a requested/delivered
// ratio (that is commit a7dab73 verbatim).
//
// Deliberately OpenCV-free and Android-free so the decision is unit-testable.

/** A profile/camera size disagreement that the UI shows and the service must resolve. */
data class SizeMismatch(
    val note: String,
    val width: Int,
    val height: Int,
)

/**
 * Watches the delivered frame size.
 *
 * @param requested what the camera was asked for, for the log line only — never for geometry.
 * @param requestRegeneration asks the service (06c) to re-detect the board corners. It is a
 *   signal, not the work: ArUco must not run on the analyzer thread.
 */
class FrameSizeGuard(
    private val warn: (String) -> Unit = {},
    private val info: (String) -> Unit = {},
    private val requestRegeneration: () -> Unit = {},
) {
    private var requestedW = 0
    private var requestedH = 0
    private var actualW = 0
    private var actualH = 0
    private var profileName = ""
    private var profileW = 0
    private var profileH = 0

    /** Non-null while the active profile does not match the delivered size. */
    var mismatch: SizeMismatch? = null
        private set

    fun setRequested(
        width: Int,
        height: Int,
    ) {
        requestedW = width
        requestedH = height
    }

    /** The active calibration profile. Setting it re-arms the check on the next frame. */
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

    /**
     * One frame's delivered size.
     *
     * Runs its full body only when the size changed — EXCEPT while a mismatch is unresolved:
     * a regeneration can fail transiently (a hand covers the markers at the wrong moment), and
     * with the size latched there would never be a second attempt. So we retry every frame.
     */
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
        // Before the first calibration there IS no profile, and the stale-profile wording came out
        // as `profile '' was calibrated at 0x0` — a sentence about a profile that never existed.
        // The two cases need different words because they need different actions from the user.
        val calibrated = profileW > 0 && profileH > 0
        val text =
            if (calibrated) {
                "profile '$profileName' was calibrated at ${profileW}x$profileH, camera delivers ${width}x$height"
            } else {
                "not calibrated yet — tap Recalibrate and point the camera at the whole board"
            }
        mismatch = SizeMismatch(text, width, height)
        // Rate limit: the retry path must not spam the log every frame.
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
        val fellBack = requestedW > 0 && (requestedW != width || requestedH != height)
        if (fellBack) {
            warn(
                "camera mode requested ${requestedW}x$requestedH but the source delivers ${width}x$height " +
                    "(driver fell back to its nearest supported mode).",
            )
        } else {
            info("camera delivers ${width}x$height.")
        }
    }
}
