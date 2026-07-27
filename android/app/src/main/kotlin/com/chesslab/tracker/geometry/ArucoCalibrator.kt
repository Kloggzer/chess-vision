package com.chesslab.tracker.geometry

import android.graphics.Bitmap
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.cornersToFlat
import com.chesslab.geometry.detectBoardMarkers
import com.chesslab.geometry.resolveBoardCorners
import com.chesslab.geometry.warpFromCorners
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.opencv.android.Utils
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import java.util.concurrent.atomic.AtomicBoolean

// `:core-geometry` glue. Nothing here decodes a marker or solves a homography itself.
//
// ArUco costs 44-87 ms per frame (commit 4a7609e), so it runs on Dispatchers.Default with at most
// ONE detection in flight — never on a UI or analyzer thread.

/** The four board markers; two are enough to reconstruct the quad (`resolve_board_corners`). */
private const val MIN_MARKERS: Int = 2

private const val ALL_MARKERS: Int = 4

/** Preview size for the orientation-confirmation warp — big enough to read, cheap to warp. */
private const val CONFIRM_WARP_PX: Int = 512

data class CalibrationResult(
    /** 8 floats `[a8, h8, h1, a1]` in the DETECTED frame's pixels. Empty when `!ok`. */
    val corners: FloatArray,
    val markerIds: List<Int>,
    /** Taken from the `Mat` that was actually detected on — never from a requested size (a7dab73). */
    val frameWidth: Int,
    val frameHeight: Int,
    val ok: Boolean,
    /** Always set when fewer than 4 markers were seen, so a partial fit is never silent. */
    val reason: String?,
) {
    override fun equals(other: Any?): Boolean = this === other

    override fun hashCode(): Int = System.identityHashCode(this)
}

/** The seam the calibration screen talks to. Keeps OpenCV out of the UI and out of the tests. */
interface BoardDetector {
    suspend fun detect(): CalibrationResult?

    /**
     * Rectified board for the orientation confirmation, or null when it cannot be produced.
     *
     * [margin] overrides the stored per-corner outsets, so the preview re-rectifies live while the
     * user adjusts them — geometry you cannot see is geometry you are guessing at.
     */
    suspend fun warp(
        corners: FloatArray,
        whitePov: Boolean,
        margin: List<Double>? = null,
    ): Bitmap?
}

/**
 * @param frames the service's `latestCalibrationFrame()` — a CLONE, released here.
 * @param geometry the geometry to detect against (board size, margin, dictionary).
 */
class ArucoCalibrator(
    private val frames: () -> Mat?,
    private val geometry: () -> BoardGeometry,
    private val dispatcher: CoroutineDispatcher = Dispatchers.Default,
) : BoardDetector {
    private val inFlight = AtomicBoolean(false)

    override suspend fun detect(): CalibrationResult? {
        if (!inFlight.compareAndSet(false, true)) return null
        return try {
            withContext(dispatcher) { withFrame { detectOn(it) } }
        } finally {
            inFlight.set(false)
        }
    }

    override suspend fun warp(
        corners: FloatArray,
        whitePov: Boolean,
        margin: List<Double>?,
    ): Bitmap? =
        withContext(dispatcher) {
            withFrame { frame ->
                val base = geometry()
                val geom = base.copy(whitePov = whitePov, margin = margin ?: base.margin)
                val rect = warpFromCorners(frame, geom, cornersFromFlat(corners), CONFIRM_WARP_PX)
                try {
                    toBitmap(rect)
                } finally {
                    rect.release()
                }
            }
        }

    private inline fun <T : Any> withFrame(body: (Mat) -> T?): T? {
        val frame = frames() ?: return null
        return try {
            if (frame.empty()) null else body(frame)
        } finally {
            frame.release()
        }
    }

    private fun detectOn(frame: Mat): CalibrationResult {
        val geom = geometry()
        val points = detectBoardMarkers(frame, geom.markerDict)
        val ids = points.keys.sorted()
        val fail = { why: String -> CalibrationResult(FloatArray(0), ids, frame.cols(), frame.rows(), false, why) }
        if (points.size < MIN_MARKERS) return fail("only ${points.size} of $ALL_MARKERS markers visible")
        val resolved =
            resolveBoardCorners(points, geom.boardSize)
                ?: return fail("markers found but the quad is degenerate")
        return CalibrationResult(
            corners = cornersToFlat(resolved.first),
            markerIds = ids,
            frameWidth = frame.cols(),
            frameHeight = frame.rows(),
            ok = true,
            reason = if (ids.size < ALL_MARKERS) "only ${ids.size} of $ALL_MARKERS markers visible — quad reconstructed" else null,
        )
    }

    private fun toBitmap(bgr: Mat): Bitmap {
        val rgba = Mat()
        return try {
            Imgproc.cvtColor(bgr, rgba, Imgproc.COLOR_BGR2RGBA)
            Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888).also { Utils.matToBitmap(rgba, it) }
        } finally {
            rgba.release()
        }
    }
}
