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

// ArUco costs 44-87 ms per frame, so at most ONE detection in flight, never on a UI or analyzer thread.

private const val MIN_MARKERS: Int = 2

private const val ALL_MARKERS: Int = 4

private const val CONFIRM_WARP_PX: Int = 512

data class CalibrationResult(
    val corners: FloatArray,
    val markerIds: List<Int>,
    /** From the `Mat` actually detected on — never a requested size (a7dab73). */
    val frameWidth: Int,
    val frameHeight: Int,
    val ok: Boolean,
    val reason: String?,
) {
    override fun equals(other: Any?): Boolean = this === other

    override fun hashCode(): Int = System.identityHashCode(this)
}

interface BoardDetector {
    suspend fun detect(): CalibrationResult?

    /** [margin] overrides the stored outsets, so the preview re-rectifies live while the user adjusts them. */
    suspend fun warp(
        corners: FloatArray,
        whitePov: Boolean,
        margin: List<Double>? = null,
    ): Bitmap?
}

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
