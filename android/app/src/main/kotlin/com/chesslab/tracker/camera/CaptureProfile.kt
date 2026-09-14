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

    /** True only when size, rate and bit rate all came back as asked. */
    val asAsked: Boolean
        get() =
            // TODO: the delivered check compares only the LONG side, so a 3840x1644 frame reads as
            // "exactly as asked" and capture.json claims a picture the device never delivered.
            notes.isEmpty() &&
                aeFpsRange != null &&
                bitRate == requested.bitRate &&
                delivered?.let { maxOf(it.width, it.height) == maxOf(requested.width, requested.height) } == true
}

/**
 * The capture mode's grip on the camera. Separate from [VideoRecorderPort] because that seam is the
 * recorder's; this one is a temporary profile, and its ONE implementation is `TrackerCamera`.
 */
interface CaptureProfilePort {
    fun applyCaptureProfile(profile: CaptureProfile)

    fun restoreCaptureProfile()

    val captureObserved: CaptureObserved?
}
