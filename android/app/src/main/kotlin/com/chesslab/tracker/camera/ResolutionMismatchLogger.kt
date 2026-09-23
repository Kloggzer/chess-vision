package com.chesslab.tracker.camera

/** Once per distinct pair: per frame it would be 30 identical WARN lines a second. It only REPORTS —
 *  `FrameSizeGuard` reacts; nothing in `camera/` scales geometry (that was `a7dab73`). */
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
