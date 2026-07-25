package com.chesslab.tracker.service

import android.graphics.Bitmap
import android.util.Log
import androidx.camera.core.ImageProxy
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.pipeline.YuvToBgr
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.opencv.android.Utils
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

private const val TAG = "chesslabFrames"

/** ~5 fps. A preview and a calibration tap need freshness, not frame rate. */
private const val PUBLISH_INTERVAL_MS = 200L

/**
 * Drops instead of queueing.
 *
 * The single producer is the analyzer thread, so a plain flag is enough — and dropping is the
 * point: a queued preview conversion arrives late, holds a frame alive, and the backlog grows
 * exactly when the device is already too slow (commit 4a7609e).
 */
class InFlightGate {
    @Volatile
    private var busy = false

    fun tryEnter(): Boolean {
        if (busy) return false
        busy = true
        return true
    }

    fun leave() {
        busy = false
    }
}

/**
 * The ONLY way any screen gets pixels.
 *
 * 06a's calibration draws [rawPreview] and taps [latestCalibrationFrame]; it binds no camera of
 * its own. MEMORY (`android-single-camera-owner`): a second camera binding from the calibration
 * screen froze the analyzer feed on tab switch.
 *
 * Both outputs are throttled to [PUBLISH_INTERVAL_MS], so the conversion cost lands on one frame
 * in six rather than on every one.
 */
class CameraFrameBus(
    override val cameraHealth: StateFlow<CameraHealth>,
    private val scope: CoroutineScope,
    private val toBitmap: (Mat) -> Bitmap?,
    private val nowMs: () -> Long = System::currentTimeMillis,
) : CalibrationFrames,
    AutoCloseable {
    private val yuv = YuvToBgr()
    private val gate = InFlightGate()
    private val preview = MutableStateFlow<Bitmap?>(null)
    private val lock = Any()
    private var latest: Mat? = null
    private var lastMs = 0L

    override val rawPreview: StateFlow<Bitmap?> = preview.asStateFlow()

    /** Analyzer thread. The `ImageProxy` dies when this returns, so the copy has to happen here. */
    fun onFrame(image: ImageProxy) {
        val now = nowMs()
        if (now - lastMs < PUBLISH_INTERVAL_MS) return
        lastMs = now
        // `YuvToBgr` reuses its destination Mat, so what is kept must be a clone.
        val frame = yuv.convert(image).clone()
        synchronized(lock) {
            latest?.release()
            latest = frame
        }
        publishPreview()
    }

    /** A CLONE — the caller releases it. Null until the first frame arrives. */
    override fun latestCalibrationFrame(): Mat? = synchronized(lock) { latest?.clone() }

    override fun close() {
        synchronized(lock) {
            latest?.release()
            latest = null
        }
        yuv.close()
    }

    private fun publishPreview() {
        if (!gate.tryEnter()) return
        val frame =
            latestCalibrationFrame() ?: run {
                gate.leave()
                return
            }
        scope.launch {
            runCatching { preview.value = toBitmap(frame) }
                .onFailure { Log.w(TAG, "preview conversion failed", it) }
            frame.release()
            gate.leave()
        }
    }
}

/**
 * BGR `Mat` -> `Bitmap`, downscaled so the UI never uploads a 1080p texture at 5 fps.
 *
 * Runs off the analyzer thread (see [CameraFrameBus.publishPreview]); it is the one place that
 * touches Android graphics, which is also why it is untestable on the desktop JVM.
 */
fun bgrToBitmap(
    bgr: Mat,
    maxSide: Int,
): Bitmap? {
    val side = maxOf(bgr.cols(), bgr.rows())
    val scale = if (side > maxSide) maxSide.toDouble() / side else 1.0
    val rgba = Mat()
    Imgproc.cvtColor(bgr, rgba, Imgproc.COLOR_BGR2RGBA)
    if (scale < 1.0) Imgproc.resize(rgba, rgba, Size(), scale, scale, Imgproc.INTER_AREA)
    val bitmap = Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888)
    Utils.matToBitmap(rgba, bitmap)
    rgba.release()
    return bitmap
}

/** The seam 06a consumes. Pinned across both phases; 06a may not widen it. */
interface CalibrationFrames {
    fun latestCalibrationFrame(): Mat?

    val rawPreview: StateFlow<Bitmap?>

    val cameraHealth: StateFlow<CameraHealth>
}
