package com.chesslab.tracker.camera

/**
 * Reports a requested-vs-delivered resolution mismatch once per distinct pair, mirroring the rate
 * limit of `tracker.py::_note_frame_size` (it logs only when the size actually changes; per frame
 * it would be 30 identical WARN lines a second and nobody reads those).
 *
 * It only REPORTS. Reacting to a size change — regenerating the calibration profile — is 05b's
 * `FrameSizeGuard`; nothing in `camera/` scales geometry, because that is exactly `a7dab73`.
 */
class ResolutionMismatchLogger(
    private val warn: (String) -> Unit,
) {
    private val reported = HashSet<String>()

    fun report(
        requestedWidth: Int,
        requestedHeight: Int,
        delivered: DeliveredSize,
    ) {
        if (requestedWidth == delivered.width && requestedHeight == delivered.height) return
        val pair = "${requestedWidth}x$requestedHeight/${delivered.width}x${delivered.height}"
        if (!reported.add(pair)) return
        warn(
            "camera mode ${requestedWidth}x$requestedHeight requested " +
                "but the device delivers ${delivered.width}x${delivered.height}",
        )
    }
}
