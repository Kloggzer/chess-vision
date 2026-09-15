package com.chesslab.tracker.camera

/**
 * What targeted capture asks the ONE camera for while a shot is being recorded, and what the device
 * then actually did. A profile is temporary: `restoreCaptureProfile` puts the user's game settings
 * back, because the game path is not allowed to move (`plan/04-capture/02-erfassungs-modus.md`).
 */
data class CaptureProfile(
    val width: Int,
    val height: Int,
    val fps: Int,
) {
    /** Derived, never stored: the rate is a function of the picture (`BITS_PER_PIXEL`). */
    val bitRate: Int get() = bitRateFor(width, height, fps)
}

/**
 * Measured, never wished for: the request beside what the device delivered. It reaches
 * `capture.json` so a recording can be read back for what it really was.
 */
data class CaptureObserved(
    val requested: CaptureProfile,
    val delivered: DeliveredSize?,
    /** The AE range that was pinned, or null when the device advertised none — then it runs free. */
    val aeFpsRange: String?,
    /** What the encoder agreed to; 0 while nothing is armed. */
    val bitRate: Int,
    val notes: List<String>,
) {
    val deliveredSize: String? get() = delivered?.let { "${it.width}x${it.height}" }

    /**
     * True only when nothing was noted, an AE range was pinned at all, the bit rate matched and
     * BOTH delivered edges matched. The frame RATE itself is never compared.
     *
     * Long side only let 3840x1644 read as "exactly as asked" — a picture the device never gave.
     * Compared as an unordered pair, because a delivery may be rotated but never cropped.
     */
    val asAsked: Boolean
        get() =
            notes.isEmpty() &&
                aeFpsRange != null &&
                bitRate == requested.bitRate &&
                delivered?.let { edgesOf(it.width, it.height) == edgesOf(requested.width, requested.height) } == true
}

private fun edgesOf(
    width: Int,
    height: Int,
): Pair<Int, Int> = minOf(width, height) to maxOf(width, height)

/**
 * The capture mode's grip on the camera. Separate from [VideoRecorderPort] because that seam is the
 * recorder's; this one is a temporary profile, and its ONE implementation is `TrackerCamera`.
 */
interface CaptureProfilePort {
    fun applyCaptureProfile(profile: CaptureProfile)

    fun restoreCaptureProfile()

    val captureObserved: CaptureObserved?
}
