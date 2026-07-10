package com.chesslab.tracker.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.R
import com.chesslab.tracker.geometry.ArucoCornerDetector
import com.chesslab.tracker.geometry.BoardCorners
import com.chesslab.tracker.geometry.Point
import kotlinx.coroutines.delay
import org.opencv.core.Mat

private val CORNER_LABELS = listOf("a8", "h8", "h1", "a1")
private const val CORNER_COUNT = 4
private const val LOUPE_RADIUS = 60f
private const val LOUPE_ALPHA = 0.3f
private const val CROSSHAIR_STROKE = 2f
private const val LIVE_ASSIST_INTERVAL_MS = 1000L

/**
 * Manual 4-corner calibration with optional ArUco auto-detection.
 *
 * The user taps the corners in the enforced order **a8 → h8 → h1 → a1**
 * (project invariant, wrong a8 silently transposes every label). A magnifier
 * loupe assists precise placement.
 *
 * When [arucoDetector] is provided and [arucoEnabled] is true:
 * - An "Auto (ArUco)" button runs the detector once on the current frame and
 *   fills the four corners (user still confirms orientation by tapping a8).
 * - A live-assist overlay runs detection ~1/s and shows found marker centers
 *   as dots on the preview.
 *
 * The [autoFrameRef] must be the same [MutableState] passed to [CameraPreview],
 * providing the latest BGR [Mat] for ArUco detection.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongMethod", "CyclomaticComplexMethod")
@Composable
fun CalibrationScreen(
    experimentalDetection: Boolean,
    onSuggest: () -> BoardCorners?,
    onSave: (BoardCorners, Boolean, Int, Int) -> Unit,
    modifier: Modifier = Modifier,
    arucoDetector: ArucoCornerDetector? = null,
    arucoEnabled: Boolean = false,
    arucoFrameRef: MutableState<Mat?>? = null,
) {
    var taps by remember { mutableStateOf(listOf<Offset>()) }
    var loupe by remember { mutableStateOf<Offset?>(null) }
    var confirming by remember { mutableStateOf(false) }
    var canvasSize by remember { mutableStateOf(Offset.Zero) }
    var arucoNotFound by remember { mutableStateOf(false) }

    // Live assist: detected marker centers from periodic run.
    var liveMarkers by remember { mutableStateOf<Map<Int, Offset>>(emptyMap()) }

    // Periodic ArUco detection for live-assist dots (~1/s).
    if (arucoDetector != null && arucoEnabled && arucoFrameRef != null) {
        LaunchedEffect(arucoEnabled) {
            while (true) {
                delay(LIVE_ASSIST_INTERVAL_MS)
                val frame = arucoFrameRef.value
                if (frame != null && !frame.empty()) {
                    val raw = arucoDetector.detectRaw(frame)
                    val markerById = mutableMapOf<Int, Offset>()
                    for ((id, pt) in raw) {
                        if (id in 0..3) {
                            markerById[id] = Offset(pt.x, pt.y)
                        }
                    }
                    liveMarkers = markerById
                }
            }
        }
    }

    Column(modifier = modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        val instruction =
            when {
                confirming -> stringResource(R.string.calib_confirm_orientation)
                taps.size < 4 -> stringResource(R.string.calib_tap_corner, CORNER_LABELS[taps.size])
                else -> stringResource(R.string.calib_ready)
            }
        Text(instruction, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)

        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .pointerInput(confirming) {
                        detectTapGestures(
                            onPress = { pos ->
                                loupe = pos
                                tryAwaitRelease()
                                loupe = null
                            },
                            onTap = { pos ->
                                canvasSize = Offset(size.width.toFloat(), size.height.toFloat())
                                if (confirming) {
                                    taps = reorderForA8(taps, pos)
                                    confirming = false
                                } else if (taps.size < 4) {
                                    taps = taps + pos
                                }
                            },
                        )
                    }.semantics { contentDescription = instruction },
        ) {
            // Camera preview (with optional ImageAnalysis for frame capture).
            CameraPreview(
                modifier = Modifier.fillMaxWidth().aspectRatio(1f),
                latestFrameRef = arucoFrameRef,
            )

            // Overlay canvas: user taps + live assist dots.
            Canvas(modifier = Modifier.fillMaxSize()) {
                // User-tapped corners.
                taps.forEachIndexed { i, p ->
                    drawCircle(color = Color(0xFFFF00FF), radius = 14f, center = p)
                    if (i > 0) drawLine(Color(0xFFFF00FF), taps[i - 1], p, strokeWidth = 4f)
                }
                if (taps.size == 4) drawLine(Color(0xFFFF00FF), taps[3], taps[0], strokeWidth = 4f)

                // Live-assist ArUco marker dots (small green circles).
                if (arucoEnabled) {
                    liveMarkers.forEach { (id, pos) ->
                        drawCircle(
                            color = Color(0x8800FF00),
                            radius = 12f,
                            center = pos,
                        )
                        drawCircle(
                            color = Color(0xFF00FF00),
                            radius = 6f,
                            center = pos,
                        )
                        // Labels skipped: native Canvas text requires a non-Compose
                        // canvas reference. The dot positions alone are sufficient.
                    }
                }

                loupe?.let { drawLoupe(it) }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(
                onClick = {
                    taps = emptyList()
                    confirming = false
                    arucoNotFound = false
                },
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text(stringResource(R.string.calib_clear)) }

            // Auto (ArUco) button — runs detection on the latest frame.
            if (arucoDetector != null && arucoEnabled && arucoFrameRef != null) {
                OutlinedButton(
                    onClick = {
                        val frame = arucoFrameRef.value
                        if (frame != null && !frame.empty()) {
                            val corners = arucoDetector.detect(frame)
                            if (corners != null) {
                                taps = corners.toList().map { Offset(it.x, it.y) }
                                confirming = true
                                arucoNotFound = false
                            } else {
                                arucoNotFound = true
                            }
                        } else {
                            arucoNotFound = true
                        }
                    },
                    modifier = Modifier.heightIn(min = 48.dp),
                    enabled = arucoFrameRef?.value != null && !arucoFrameRef.value!!.empty(),
                ) {
                    Text(
                        stringResource(
                            if (arucoNotFound) {
                                R.string.calib_aruco_not_found
                            } else {
                                R.string.calib_aruco_auto
                            },
                        ),
                    )
                }
            }

            // Experimental suggest-corners (markerless) button.
            if (experimentalDetection) {
                OutlinedButton(
                    onClick = {
                        onSuggest()?.let { c ->
                            taps = c.toList().map { Offset(it.x, it.y) }
                            confirming = true
                        }
                    },
                    modifier = Modifier.heightIn(min = 48.dp),
                ) { Text(stringResource(R.string.calib_suggest)) }
            }

            Button(
                onClick = {
                    val w = canvasSize.x.toInt().coerceAtLeast(1)
                    val h = canvasSize.y.toInt().coerceAtLeast(1)
                    onSave(cornersOf(taps), true, w, h)
                },
                enabled = taps.size == 4 && !confirming,
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text(stringResource(R.string.calib_save)) }
        }
    }
}

private fun cornersOf(taps: List<Offset>): BoardCorners = BoardCorners.of(taps.map { Point(it.x, it.y) })

private fun reorderForA8(
    taps: List<Offset>,
    a8: Offset,
): List<Offset> {
    if (taps.size != CORNER_COUNT) return taps
    val start = taps.indices.minByOrNull { (taps[it] - a8).getDistanceSquared() } ?: 0
    return List(CORNER_COUNT) { taps[(start + it) % CORNER_COUNT] }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawLoupe(center: Offset) {
    val r = LOUPE_RADIUS
    drawCircle(color = Color.White.copy(alpha = LOUPE_ALPHA), radius = r, center = center)
    drawLine(Color.White, Offset(center.x - r, center.y), Offset(center.x + r, center.y), strokeWidth = CROSSHAIR_STROKE)
    drawLine(Color.White, Offset(center.x, center.y - r), Offset(center.x, center.y + r), strokeWidth = CROSSHAIR_STROKE)
}
