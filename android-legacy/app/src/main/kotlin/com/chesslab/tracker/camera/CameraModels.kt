package com.chesslab.tracker.camera

import android.util.Size
import androidx.camera.core.CameraSelector
import org.opencv.core.Mat

/**
 * A single analysis frame ready for the detection pipeline.
 *
 * [mat] is a BGR [Mat] converted from the CameraX `ImageAnalysis` YUV output on the
 * analysis thread. [timestampNs] is the frame timestamp reported by CameraX.
 */
data class CameraFrame(
    val mat: Mat,
    val timestampNs: Long,
    val width: Int,
    val height: Int,
)

/**
 * User-facing capture configuration; every field is settings-backed (phase 04).
 */
data class CameraConfig(
    val lensFacing: Int = CameraSelector.LENS_FACING_BACK,
    val resolution: Resolution = Resolution.R720P,
    val dynamicResolution: Boolean = true,
)

/**
 * Discrete analysis resolutions offered in settings and used by the dynamic
 * escalation ladder ([DynamicResolutionController]).
 *
 * The concrete [Size] is built lazily via [size] so the enum can be referenced in
 * plain-JVM unit tests without initializing `android.util.Size`.
 */
enum class Resolution(
    val width: Int,
    val height: Int,
) {
    R720P(WIDTH_720, HEIGHT_720),
    R1080P(WIDTH_1080, HEIGHT_1080),
    R4K(WIDTH_4K, HEIGHT_4K),
    ;

    fun size(): Size = Size(width, height)

    /** Next higher rung on the ladder, or `this` when already at the top. */
    fun next(): Resolution {
        val values = entries
        val idx = ordinal
        return if (idx + 1 < values.size) values[idx + 1] else this
    }
}

private const val WIDTH_720 = 1280
private const val HEIGHT_720 = 720
private const val WIDTH_1080 = 1920
private const val HEIGHT_1080 = 1080
private const val WIDTH_4K = 3840
private const val HEIGHT_4K = 2160

/**
 * Seam for the analysis-resolution sink. Implemented by [TrackerCamera]; a fake is
 * injected in unit tests so [DynamicResolutionController] can be exercised without
 * CameraX or a device.
 */
interface ResolutionTarget {
    fun setResolution(res: Resolution)
}

/**
 * Minimal local seam for the engine's uncertainty signal.
 *
 * Phase 01 owns the real `TrackerEngine.uncertainty` API; it is not present in this
 * worktree yet. [DynamicResolutionController] observes this boolean stream
 * (`true` == uncertain: low move margin, STUCK state, or pending CNN verify) and
 * phase 04 reconciles the seam when it wires the real engine. See STATUS.md
 * discrepancies.
 */
interface UncertaintySource {
    val uncertainty: kotlinx.coroutines.flow.Flow<Boolean>
}
