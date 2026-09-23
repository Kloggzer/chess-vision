package com.chesslab.tracker.ui.calibration

import android.graphics.Bitmap
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import com.chesslab.geometry.BoardGeometry
import kotlinx.coroutines.flow.StateFlow
import org.opencv.core.Mat

// THE HARD RULE: this screen binds no camera — a second binding froze the tracker feed on every tab switch.

/** Lambdas, not an interface, so it is built from `TrackerBinder` without either side implementing the other. */
class CalibrationHost(
    /** A CLONE; the callee releases it. */
    val latestCalibrationFrame: () -> Mat?,
    val rawPreview: StateFlow<Bitmap?>,
    /** Display-only; it never touches the saved geometry. */
    val previewRotation: StateFlow<Int>,
    /** GEOMETRY ONLY. */
    val onCalibrated: (BoardGeometry, FloatArray, String) -> Unit,
)

val LocalCalibrationHost = staticCompositionLocalOf<CalibrationHost?> { null }

/** [host] is NULLABLE and the provider unconditional: `content` must sit at ONE composition position, or
 *  binding discards the subtree — and with Home as start, "Start tracking" threw the user back to it. */
@Composable
fun ProvideCalibrationHost(
    host: CalibrationHost?,
    content: @Composable () -> Unit,
) = CompositionLocalProvider(LocalCalibrationHost provides host, content = content)
