package com.chesslab.tracker.geometry

import android.graphics.Bitmap
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.cornersToFlat
import com.chesslab.geometry.detectBoardMarkers
import com.chesslab.geometry.gridCorrection
import com.chesslab.geometry.improveQuad
import com.chesslab.geometry.resolveBoardCorners
import com.chesslab.geometry.warpFromCorners
import com.chesslab.geometry.worstOffset
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

/**
 * Leave the quad alone below this offset, as a fraction of one square.
 *
 * The measurement's noise floor on a bare board is ~1.3 % of a square and the re-aligned Python
 * corpus sits at 2-3 %; the 18 recorded clips sit at 8.8-8.9 %, which is the band this exists for.
 */
private const val REFINE_TOLERANCE_CELLS: Double = 0.02

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

/**
 * What a refinement pass measured, and whether it moved the quad.
 *
 * The offsets are in rectified pixels; [cellPx] is there so a caller can express them as a fraction
 * of a square, which is the only scale-free way to talk about this — 4 px means something different
 * at `boardSize` 800 than at 1600.
 */
class QuadRefinement(
    /** The corrected quad, or the input verbatim when nothing was applied. */
    val corners: FloatArray,
    val beforePx: Double,
    val afterPx: Double,
    val cellPx: Double,
    val applied: Boolean,
    /**
     * The same correction as a RECTIFIED-space 3x3, or null when nothing was applied.
     *
     * The corrected corners alone do not survive: live alignment re-derives the quad from the
     * markers every few frames and would overwrite them within ~0.2 s. This is the form that can be
     * carried and re-applied to each freshly detected quad for free.
     */
    val correction: DoubleArray? = null,
) {
    override fun equals(other: Any?): Boolean = this === other

    override fun hashCode(): Int = System.identityHashCode(this)
}

/** The seam the calibration screen talks to. Keeps OpenCV out of the UI and out of the tests. */
interface BoardDetector {
    suspend fun detect(): CalibrationResult?

    /**
     * Measure where the board's grooves really sit under [corners], and pull the quad onto them.
     *
     * Returns null when nothing was measurable (no frame, or a board whose grid cannot be found).
     * Never called from the aim poll: at `boardSize` 1600 a full pass is ~80 ms on a desktop and it
     * belongs to the moment the quad is accepted, not to a preview that runs on a timer.
     */
    suspend fun refine(corners: FloatArray): QuadRefinement?

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

    /**
     * Runs at the moment the quad is accepted, so the orientation preview the user then eyeballs is
     * the corrected geometry — they confirm what they will actually get.
     *
     * Below [REFINE_TOLERANCE_CELLS] the quad is left alone. The measurement's own noise floor on a
     * bare board is ~1.3 % of a square, and the re-aligned Python corpus sits at 2-3 %; inside that
     * band the fit would be chasing its own noise. `improveQuad` additionally refuses to hand back a
     * quad it did not improve, so this gate is about not doing pointless work, not about safety.
     */
    override suspend fun refine(corners: FloatArray): QuadRefinement? =
        withContext(dispatcher) {
            withFrame { frame ->
                val geom = geometry()
                val quad = cornersFromFlat(corners)
                val before = worstOffset(frame, quad, geom)
                when {
                    !before.isFinite() -> null
                    before <= REFINE_TOLERANCE_CELLS * geom.cell ->
                        QuadRefinement(corners, before, before, geom.cell, applied = false)
                    else -> applyRefinement(frame, quad, corners, geom)
                }
            }
        }

    private fun applyRefinement(
        frame: Mat,
        quad: List<DoubleArray>,
        original: FloatArray,
        geom: BoardGeometry,
    ): QuadRefinement {
        val result = improveQuad(frame, quad, geom)
        val fixed = result.quad
        return QuadRefinement(
            corners = if (fixed == null) original else cornersToFlat(fixed),
            beforePx = result.before,
            afterPx = if (fixed == null) result.before else result.after,
            cellPx = geom.cell,
            applied = fixed != null,
            correction = fixed?.let { gridCorrection(quad, it, geom) },
        )
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
