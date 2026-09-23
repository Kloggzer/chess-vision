package com.chesslab.tracker.camera

/** Temporary: `restoreCaptureProfile` puts the game settings back — the game path may not move. */
data class CaptureProfile(
    val width: Int,
    val height: Int,
    val fps: Int,
) {
    /** Derived, never stored: the rate is a function of the picture (`BITS_PER_PIXEL`). */
    val bitRate: Int get() = bitRateFor(width, height, fps)
}

/** Measured, never wished for: it reaches `capture.json` beside the request. */
data class CaptureObserved(
    val requested: CaptureProfile,
    val delivered: DeliveredSize?,
    /** The AE range that was pinned, or null when the device advertised none — then it runs free. */
    val aeFpsRange: String?,
    val bitRate: Int,
    val notes: List<String>,
) {
    val deliveredSize: String? get() = delivered?.let { "${it.width}x${it.height}" }

    /** Both delivered edges as an unordered pair (rotated yes, cropped never): long side only let 3840x1644
     *  read as "exactly as asked". The frame RATE itself is never compared. */
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

interface CaptureProfilePort {
    fun applyCaptureProfile(profile: CaptureProfile)

    fun restoreCaptureProfile()

    val captureObserved: CaptureObserved?
}
