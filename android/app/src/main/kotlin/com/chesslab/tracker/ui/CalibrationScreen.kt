package com.chesslab.tracker.ui

import android.graphics.Bitmap
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chesslab.tracker.R
import com.chesslab.tracker.geometry.ArucoCornerDetector
import com.chesslab.tracker.geometry.BoardCorners
import com.chesslab.tracker.geometry.Point
import com.chesslab.tracker.ui.theme.BoardPalette
import kotlinx.coroutines.delay
import org.opencv.core.Mat

private val CORNER_LABELS = listOf("a8", "h8", "h1", "a1")
private const val CORNER_COUNT = 4
private const val CROSSHAIR_STROKE = 2f
private const val LIVE_ASSIST_INTERVAL_MS = 1000L
private const val DEFAULT_ASPECT = 4f / 3f

// Zoom loupe (real pixel magnifier).
private const val LOUPE_WINDOW_PX = 40 // source window (bitmap px) sampled around the finger
private const val LOUPE_DIAMETER_DP = 104 // on-screen magnifier circle diameter
private const val LOUPE_MARGIN_DP = 12 // inset from the board box edge
private const val LOUPE_RING_STROKE = 3f
private const val LOUPE_CENTER_RING_PX = 7f
private const val LOUPE_LABEL_SP = 11
private const val LOUPE_LABEL_GAP_PX = 6f
private const val ARUCO_HALO_ALPHA = 0.53f

/**
 * Manual 4-corner calibration with optional ArUco auto-detection.
 *
 * The user taps the corners in the enforced order **a8 → h8 → h1 → a1**
 * (project invariant, wrong a8 silently transposes every label). A magnifier
 * loupe assists precise placement.
 *
 * The preview is the service-owned [rawPreview] bitmap (no second CameraX
 * binding — that would fight the tracker for the shared camera provider). ArUco
 * detection runs on a full-resolution frame supplied by [frameProvider], which
 * returns a clone the caller must release.
 *
 * All calibration coordinates live in **rawPreview bitmap pixel space**: taps are
 * mapped from the displayed (canvas) coordinates and the saved profile records the
 * bitmap dimensions as its source resolution, so [BoardWarper] rescales them to the
 * live analysis resolution.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongMethod", "CyclomaticComplexMethod")
@Composable
fun CalibrationScreen(
    experimentalDetection: Boolean,
    onSuggest: () -> BoardCorners?,
    onSave: (BoardCorners, Boolean, Int, Int) -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
    rawPreview: Bitmap? = null,
    arucoDetector: ArucoCornerDetector? = null,
    arucoEnabled: Boolean = false,
    frameProvider: () -> Mat? = { null },
) {
    var taps by rememberSaveable(stateSaver = OffsetListSaver) { mutableStateOf(listOf<Offset>()) }
    var loupe by remember { mutableStateOf<Offset?>(null) }
    var confirming by rememberSaveable { mutableStateOf(false) }
    var canvasSize by rememberSaveable(stateSaver = OffsetSaver) { mutableStateOf(Offset.Zero) }
    var arucoNotFound by rememberSaveable { mutableStateOf(false) }

    // Live assist: detected marker centers (canvas coords) from periodic run.
    var liveMarkers by remember { mutableStateOf<Map<Int, Offset>>(emptyMap()) }

    val previewImage = remember(rawPreview) { rawPreview?.asImageBitmap() }
    val textMeasurer = rememberTextMeasurer()
    val zoomLabel =
        textMeasurer.measure(
            stringResource(R.string.calib_loupe_zoom),
            style = TextStyle(color = BoardPalette.ArucoDot, fontFamily = FontFamily.Monospace, fontSize = LOUPE_LABEL_SP.sp),
        )

    val aspect =
        if (rawPreview != null && rawPreview.height > 0) {
            rawPreview.width.toFloat() / rawPreview.height.toFloat()
        } else {
            DEFAULT_ASPECT
        }

    // Full-res frame → canvas coordinate scale (uniform: box aspect == bitmap aspect).
    fun frameToCanvasScale(matCols: Int): Float = if (matCols > 0 && canvasSize.x > 0f) canvasSize.x / matCols.toFloat() else 0f

    // Periodic ArUco detection for live-assist dots (~1/s).
    if (arucoDetector != null && arucoEnabled) {
        LaunchedEffect(arucoEnabled) {
            while (true) {
                delay(LIVE_ASSIST_INTERVAL_MS)
                val frame = frameProvider() ?: continue
                try {
                    val s = if (frame.empty()) 0f else frameToCanvasScale(frame.cols())
                    if (s > 0f) {
                        val raw = arucoDetector.detectRaw(frame)
                        val markerById = mutableMapOf<Int, Offset>()
                        for ((id, pt) in raw) {
                            if (id in 0..3) markerById[id] = Offset(pt.x * s, pt.y * s)
                        }
                        liveMarkers = markerById
                    }
                } finally {
                    frame.release()
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

        CornerStepIndicator(tapCount = taps.size, confirming = confirming)

        QuietButton(onClick = onCancel) {
            Text(stringResource(R.string.calib_back_to_tracking))
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Text(
                stringResource(R.string.calib_orientation_help),
                modifier = Modifier.padding(12.dp),
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        BoardFrame(modifier = Modifier.fillMaxWidth(), video = true) {
            Box(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .aspectRatio(aspect)
                        .onGloballyPositioned { canvasSize = Offset(it.size.width.toFloat(), it.size.height.toFloat()) }
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
                if (previewImage != null) {
                    Image(
                        bitmap = previewImage,
                        contentDescription = null,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Text(
                        stringResource(R.string.calib_aiming),
                        modifier = Modifier.fillMaxSize(),
                        textAlign = TextAlign.Center,
                    )
                }

                // Overlay canvas: user taps + live assist dots + zoom loupe.
                Canvas(modifier = Modifier.fillMaxSize()) {
                    // User-tapped corners.
                    taps.forEachIndexed { i, p ->
                        drawCircle(color = BoardPalette.TapCorner, radius = 14f, center = p)
                        if (i > 0) drawLine(BoardPalette.TapCorner, taps[i - 1], p, strokeWidth = 4f)
                    }
                    if (taps.size == 4) drawLine(BoardPalette.TapCorner, taps[3], taps[0], strokeWidth = 4f)

                    // Live-assist ArUco marker dots (accent circles with a soft halo).
                    if (arucoEnabled) {
                        liveMarkers.forEach { (_, pos) ->
                            drawCircle(color = BoardPalette.ArucoDot.copy(alpha = ARUCO_HALO_ALPHA), radius = 12f, center = pos)
                            drawCircle(color = BoardPalette.ArucoDot, radius = 6f, center = pos)
                        }
                    }

                    val img = previewImage
                    if (img != null) {
                        loupe?.let { drawMagnifier(img, it, canvasSize, BoardPalette.ArucoDot, zoomLabel) }
                    }
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            GhostButton(
                onClick = {
                    taps = emptyList()
                    confirming = false
                    arucoNotFound = false
                },
            ) { Text(stringResource(R.string.calib_clear)) }

            // Auto (ArUco) button — runs detection on the latest full-res frame.
            if (arucoDetector != null && arucoEnabled) {
                GhostButton(
                    onClick = {
                        val frame = frameProvider()
                        if (frame != null) {
                            try {
                                val s = frameToCanvasScale(frame.cols())
                                val corners = if (!frame.empty() && s > 0f) arucoDetector.detect(frame) else null
                                if (corners != null) {
                                    taps = corners.toList().map { Offset(it.x * s, it.y * s) }
                                    confirming = true
                                    arucoNotFound = false
                                } else {
                                    arucoNotFound = true
                                }
                            } finally {
                                frame.release()
                            }
                        } else {
                            arucoNotFound = true
                        }
                    },
                ) {
                    Text(
                        stringResource(
                            if (arucoNotFound) R.string.calib_aruco_not_found else R.string.calib_aruco_auto,
                        ),
                    )
                }
            }

            // Experimental suggest-corners (markerless) button.
            if (experimentalDetection) {
                GhostButton(
                    onClick = {
                        onSuggest()?.let { c ->
                            taps = c.toList().map { Offset(it.x, it.y) }
                            confirming = true
                        }
                    },
                ) { Text(stringResource(R.string.calib_suggest)) }
            }

            PrimaryButton(
                onClick = {
                    val (srcW, srcH) =
                        if (rawPreview != null) {
                            rawPreview.width to rawPreview.height
                        } else {
                            canvasSize.x.toInt().coerceAtLeast(1) to canvasSize.y.toInt().coerceAtLeast(1)
                        }
                    onSave(cornersOf(taps, canvasSize, srcW, srcH), true, srcW, srcH)
                },
                enabled = taps.size == 4 && !confirming,
            ) { Text(stringResource(R.string.calib_save)) }
        }
    }
}

/**
 * a8 → h8 → h1 → a1 step indicator: one pill per corner. A placed corner is a done pill
 * (accent outline), the corner being tapped is the current pill (filled accent), the rest
 * are pending (muted). Derived from [tapCount] + [confirming] — during orientation confirm
 * all four are placed, so all read done.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun CornerStepIndicator(
    tapCount: Int,
    confirming: Boolean,
    modifier: Modifier = Modifier,
) {
    val accent = MaterialTheme.colorScheme.primary
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        CORNER_LABELS.forEachIndexed { i, label ->
            val done = i < tapCount
            val current = i == tapCount && !confirming
            val textColor =
                when {
                    current -> MaterialTheme.colorScheme.onPrimary
                    done -> accent
                    else -> muted
                }
            Box(
                modifier =
                    Modifier
                        .weight(1f)
                        .clip(MaterialTheme.shapes.small)
                        .background(if (current) accent else Color.Transparent)
                        .border(1.dp, if (done || current) accent else muted, MaterialTheme.shapes.small)
                        .padding(vertical = 6.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    label,
                    style = MaterialTheme.typography.labelMedium,
                    fontFamily = FontFamily.Monospace,
                    color = textColor,
                )
            }
        }
    }
}

/** Map canvas-space taps into [srcW]×[srcH] bitmap pixel space and build [BoardCorners]. */
private fun cornersOf(
    taps: List<Offset>,
    canvasSize: Offset,
    srcW: Int,
    srcH: Int,
): BoardCorners {
    val sx = if (canvasSize.x > 0f) srcW.toFloat() / canvasSize.x else 1f
    val sy = if (canvasSize.y > 0f) srcH.toFloat() / canvasSize.y else 1f
    return BoardCorners.of(taps.map { Point(it.x * sx, it.y * sy) })
}

private fun reorderForA8(
    taps: List<Offset>,
    a8: Offset,
): List<Offset> {
    if (taps.size != CORNER_COUNT) return taps
    val start = taps.indices.minByOrNull { (taps[it] - a8).getDistanceSquared() } ?: 0
    return List(CORNER_COUNT) { taps[(start + it) % CORNER_COUNT] }
}

/**
 * Pure canvas→bitmap source-window mapping for the zoom loupe.
 *
 * Maps the [touch] point (canvas coords) into [bmpW]×[bmpH] bitmap-pixel space using the
 * same uniform `ContentScale.Fit` scale the taps use, then returns a [windowPx]²-sized
 * source rect centered on it, **clamped so it never leaves the bitmap** (tapping an edge or
 * corner must not crash `drawImage`). If the bitmap is smaller than the window, the window
 * shrinks to the bitmap. Extracted (internal) so the clamping is unit-testable.
 */
internal fun loupeSourceRect(
    touch: Offset,
    canvas: Offset,
    bmpW: Int,
    bmpH: Int,
    windowPx: Int,
): IntRect {
    if (bmpW <= 0 || bmpH <= 0) return IntRect(0, 0, 0, 0)
    val win = windowPx.coerceAtMost(minOf(bmpW, bmpH)).coerceAtLeast(1)
    val half = win / 2f
    val cx = if (canvas.x > 0f) touch.x * bmpW / canvas.x else 0f
    val cy = if (canvas.y > 0f) touch.y * bmpH / canvas.y else 0f
    val left = (cx - half).toInt().coerceIn(0, bmpW - win)
    val top = (cy - half).toInt().coerceIn(0, bmpH - win)
    return IntRect(IntOffset(left, top), IntSize(win, win))
}

/**
 * Real zoom loupe: a circular magnifier showing [image] pixels around the [touch] point so
 * the user can place a corner tap on the exact pixel. The circle sits at the top of the
 * board box, flipping left/right so the finger never covers it.
 */
private fun DrawScope.drawMagnifier(
    image: ImageBitmap,
    touch: Offset,
    canvasSize: Offset,
    accent: Color,
    zoomLabel: TextLayoutResult,
) {
    val src = loupeSourceRect(touch, canvasSize, image.width, image.height, LOUPE_WINDOW_PX)
    if (src.width <= 0 || src.height <= 0) return

    val radius = LOUPE_DIAMETER_DP.dp.toPx() / 2f
    val margin = LOUPE_MARGIN_DP.dp.toPx()
    val onLeft = touch.x < canvasSize.x / 2f
    val centerX = if (onLeft) canvasSize.x - margin - radius else margin + radius
    val center = Offset(centerX, margin + radius)
    val boxTopLeft = Offset(center.x - radius, center.y - radius)
    val diameter = radius * 2f
    val circle = Path().apply { addOval(Rect(boxTopLeft, Size(diameter, diameter))) }

    clipPath(circle) {
        drawImage(
            image = image,
            srcOffset = src.topLeft,
            srcSize = src.size,
            dstOffset = IntOffset(boxTopLeft.x.toInt(), boxTopLeft.y.toInt()),
            dstSize = IntSize(diameter.toInt(), diameter.toInt()),
        )
    }

    // Placement ring + accent crosshair marking the exact pixel the tap commits.
    drawCircle(color = accent, radius = radius, center = center, style = Stroke(width = LOUPE_RING_STROKE))
    drawLine(accent, Offset(center.x - radius, center.y), Offset(center.x + radius, center.y), strokeWidth = CROSSHAIR_STROKE)
    drawLine(accent, Offset(center.x, center.y - radius), Offset(center.x, center.y + radius), strokeWidth = CROSSHAIR_STROKE)
    drawCircle(color = accent, radius = LOUPE_CENTER_RING_PX, center = center, style = Stroke(width = CROSSHAIR_STROKE))

    // Mono zoom-factor label under the loupe (pre-measured by the caller).
    val labelX = center.x - zoomLabel.size.width / 2f
    drawText(zoomLabel, topLeft = Offset(labelX, center.y + radius + LOUPE_LABEL_GAP_PX))
}

private val OffsetSaver =
    listSaver<Offset, Float>(
        save = { listOf(it.x, it.y) },
        restore = { Offset(it[0], it[1]) },
    )

private val OffsetListSaver =
    listSaver<List<Offset>, Float>(
        save = { list -> list.flatMap { listOf(it.x, it.y) } },
        restore = { flat -> flat.chunked(2).map { Offset(it[0], it[1]) } },
    )
