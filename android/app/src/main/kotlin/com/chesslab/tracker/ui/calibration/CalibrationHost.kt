package com.chesslab.tracker.ui.calibration

import android.graphics.Bitmap
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import com.chesslab.geometry.BoardGeometry
import kotlinx.coroutines.flow.StateFlow
import org.opencv.core.Mat

// THE HARD RULE OF THIS SCREEN: it binds no camera.
//
// MEMORY (`android-single-camera-owner`): a second ProcessCameraProvider binding here froze the
// tracker feed on every tab switch. The service is the single owner; this screen only renders the
// frames it already has. There is no androidx.camera import anywhere under ui/.

/**
 * What the calibration screen needs from the tracker service. A value of lambdas rather than an
 * interface, so it is built FROM 06c's `TrackerBinder` (`CalibrationFrames` + `applyCalibration`)
 * without either phase having to implement the other's type.
 */
class CalibrationHost(
    /** `TrackerBinder.latestCalibrationFrame` — a CLONE; the callee releases it. */
    val latestCalibrationFrame: () -> Mat?,
    /** `TrackerBinder.rawPreview` — downscaled analyzer frames, the live picture. */
    val rawPreview: StateFlow<Bitmap?>,
    /** `TrackerBinder.previewRotation` — display-only, and it never touches the saved geometry. */
    val previewRotation: StateFlow<Int>,
    /**
     * `TrackerBinder.applyCalibration`. GEOMETRY ONLY.
     *
     * One member where there used to be two. `onRemeasured` existed solely to say "do NOT re-arm
     * the optics for this one", and with the automatic convergence removed (`OpticsLock`) there is
     * nothing to re-arm and nothing for the two call sites to disagree about.
     */
    val onCalibrated: (BoardGeometry, FloatArray, String) -> Unit,
)

val LocalCalibrationHost = staticCompositionLocalOf<CalibrationHost?> { null }

/** Provided by whoever owns the service binding, around the nav host. */
@Composable
fun ProvideCalibrationHost(
    host: CalibrationHost,
    content: @Composable () -> Unit,
) = CompositionLocalProvider(LocalCalibrationHost provides host, content = content)
