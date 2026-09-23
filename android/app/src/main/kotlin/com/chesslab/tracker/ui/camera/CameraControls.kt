package com.chesslab.tracker.ui.camera

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.camera.CameraAbilities
import com.chesslab.tracker.camera.CameraLook
import com.chesslab.tracker.camera.WhiteBalance
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Touch
import kotlinx.coroutines.delay

/** `Slider.onValueChange` fires per pixel, and each call rebuilt the repeating request: 165 reconfigurations
 *  in nine seconds, the picture lagging the finger. A 900 ms drag now issues one. */
private const val LIVE_APPLY_MS = 120L

/** The torch is not a member: a switch has no slider to open. */
enum class CameraAxis(
    val label: String,
) {
    FOCUS("Focus"),
    ZOOM("Zoom"),
    EXPOSURE("EV"),
    WHITE_BALANCE("Colour"),
}

/** An absent control beats a dead one. */
fun CameraAxis.availableOn(abilities: CameraAbilities): Boolean =
    when (this) {
        CameraAxis.FOCUS -> abilities.canFocus
        CameraAxis.ZOOM -> abilities.zoom != null
        CameraAxis.EXPOSURE -> abilities.exposure != null
        CameraAxis.WHITE_BALANCE -> abilities.canWhiteBalance
    }

fun CameraAxis.isSet(look: CameraLook): Boolean =
    when (this) {
        CameraAxis.FOCUS -> look.focus != null
        CameraAxis.ZOOM -> look.zoomRatio != 1f
        CameraAxis.EXPOSURE -> look.evIndex != 0
        CameraAxis.WHITE_BALANCE -> look.whiteBalance != WhiteBalance.AUTO
    }

fun CameraAxis.reading(
    look: CameraLook,
    abilities: CameraAbilities,
): String =
    when (this) {
        CameraAxis.FOCUS -> look.focus?.let { "%.1f%%".format((1f - it) * PERCENT) } ?: AUTO
        CameraAxis.ZOOM -> "%.1f×".format(look.zoomRatio)
        CameraAxis.EXPOSURE -> abilities.exposure?.takeIf { look.evIndex != 0 }?.let { "%+.1f".format(it.ev(look.evIndex)) } ?: AUTO
        CameraAxis.WHITE_BALANCE -> look.whiteBalance.label
    }

fun WhiteBalance.kelvinLabel(): String = kelvin?.let { "$label · $it K" } ?: label

/** [open] is the tile whose slider shows — exactly one, ever. */
@Composable
fun CameraTile(
    label: String,
    value: String,
    active: Boolean,
    open: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .heightIn(min = TILE_MIN.dp)
            .clip(RoundedCornerShape(TILE_CORNER.dp))
            .background(if (open) Chrome.selection else ChromeScrim)
            .clickable(onClick = onClick)
            .padding(horizontal = Space.xs, vertical = Space.sm),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = Chrome.onSurfaceMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = value,
            style = MaterialTheme.typography.labelLarge,
            color = if (active) Chrome.accent else Chrome.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
    }
}

/** FINGER and CAMERA values are kept apart: the thumb follows every frame; the camera is told after
 *  [LIVE_APPLY_MS] of stillness and once more on lift, or a fast drag's last position is never applied. */
@Composable
fun CameraDial(
    caption: String,
    reading: String,
    value: Float,
    range: ClosedFloatingPointRange<Float>,
    step: Float,
    onValue: (Float) -> Unit,
) {
    var dragged by remember { mutableStateOf<Float?>(null) }
    val shown = snapDialValue(dragged ?: value, range, step)
    LaunchedEffect(dragged) {
        val next = dragged ?: return@LaunchedEffect
        delay(LIVE_APPLY_MS)
        onValue(next)
    }
    Column(Modifier.fillMaxWidth()) {
        // ABOVE the slider: the dragging finger covers the bottom of the screen.
        DialReading(caption, reading)
        // Inset: a track to the bezel puts its end stops under the palm and on the edge-swipe gesture.
        Row(
            Modifier.fillMaxWidth().padding(horizontal = SLIDER_INSET),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Space.xs),
        ) {
            DialNudge("−", shown > range.start) { onValue(snapDialValue(shown - step, range, step)) }
            Slider(
                modifier = Modifier.weight(1f),
                value = shown,
                onValueChange = { dragged = snapDialValue(it, range, step) },
                onValueChangeFinished = {
                    dragged?.let(onValue)
                    dragged = null
                },
                valueRange = range,
                colors =
                    SliderDefaults.colors(
                        thumbColor = Chrome.accent,
                        activeTrackColor = Chrome.accent,
                        inactiveTrackColor = Chrome.outline,
                    ),
            )
            DialNudge("+", shown < range.endInclusive) { onValue(snapDialValue(shown + step, range, step)) }
        }
    }
}

internal fun snapDialValue(
    value: Float,
    range: ClosedFloatingPointRange<Float>,
    step: Float,
): Float {
    require(step > 0f)
    val stepsFromStart = kotlin.math.round((value - range.start) / step)
    return (range.start + stepsFromStart * step).coerceIn(range.start, range.endInclusive)
}

@Composable
private fun DialNudge(
    label: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    FilledTonalButton(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.size(Touch.min),
        contentPadding =
            androidx.compose.foundation.layout
                .PaddingValues(0.dp),
    ) {
        Text(label, style = MaterialTheme.typography.headlineSmall)
    }
}

@Composable
internal fun DialReading(
    caption: String,
    reading: String,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(caption, style = MaterialTheme.typography.bodySmall, color = Chrome.onSurfaceMuted)
        Text(reading, style = MaterialTheme.typography.titleMedium, color = Chrome.accent)
    }
}

@Composable
fun <T> CameraChoice(
    options: List<Pair<String, T>>,
    selected: T,
    onSelect: (T) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        options.forEach { (text, value) ->
            FilterChip(
                selected = value == selected,
                onClick = { onSelect(value) },
                label = { Text(text, style = MaterialTheme.typography.labelMedium, maxLines = 1) },
                colors = chromeChipColors(),
                border = null,
            )
        }
    }
}

@Composable
private fun chromeChipColors() =
    FilterChipDefaults.filterChipColors(
        containerColor = ChromeScrim,
        labelColor = Chrome.onSurface,
        selectedContainerColor = Chrome.selection,
        selectedLabelColor = Chrome.accent,
    )

/** The same scrim as `ChromeBanner`: muted ink over the pale letterbox of a portrait clip was measured unreadable. */
@Composable
fun CameraNote(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.bodySmall,
        color = Chrome.onSurfaceMuted,
        modifier =
            Modifier
                .clip(RoundedCornerShape(NOTE_CORNER))
                .background(ChromeScrim)
                .padding(horizontal = Space.sm, vertical = Space.hair),
    )
}

private val NOTE_CORNER = 8.dp

private const val PERCENT = 100f
private const val AUTO = "Auto"

private val SLIDER_INSET = 20.dp

private const val TILE_MIN = 56
private const val TILE_CORNER = 12
