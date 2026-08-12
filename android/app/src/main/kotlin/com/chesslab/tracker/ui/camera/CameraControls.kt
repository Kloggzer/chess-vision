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
import kotlinx.coroutines.delay

/**
 * How long a drag has to stand still before the camera is told.
 *
 * The first version had none: `Slider(onValueChange = …)` fires on every pixel of a drag and each
 * call rebuilt the whole repeating capture request. Measured on the phone, a handful of short drags
 * issued **165 capture-request reconfigurations in nine seconds** — around sixty a second — and the
 * picture lagged the finger visibly. A full 900 ms drag now issues one.
 */
private const val LIVE_APPLY_MS = 120L

/**
 * One axis of the picture, as the deck offers it: a tile you tap to open ONE slider.
 *
 * The torch is deliberately not a member. It is a switch, not a value, and it has no panel to open
 * — folding it in here would give it a slider it cannot use.
 */
enum class CameraAxis(
    /** Short enough to survive a fifth of a phone's width at arm's length. */
    val label: String,
) {
    FOCUS("Focus"),
    ZOOM("Zoom"),
    EXPOSURE("EV"),
    WHITE_BALANCE("Colour"),
}

/** Whether this device offers the axis at all — an absent control beats a dead one. */
fun CameraAxis.availableOn(abilities: CameraAbilities): Boolean =
    when (this) {
        CameraAxis.FOCUS -> abilities.canFocus
        CameraAxis.ZOOM -> abilities.zoom != null
        CameraAxis.EXPOSURE -> abilities.exposure != null
        CameraAxis.WHITE_BALANCE -> abilities.canWhiteBalance
    }

/** Whether the axis has been moved off the device's automatic — what the tile highlights. */
fun CameraAxis.isSet(look: CameraLook): Boolean =
    when (this) {
        CameraAxis.FOCUS -> look.focus != null
        CameraAxis.ZOOM -> look.zoomRatio != 1f
        CameraAxis.EXPOSURE -> look.evIndex != 0
        CameraAxis.WHITE_BALANCE -> look.whiteBalance != WhiteBalance.AUTO
    }

/**
 * The value the tile carries, in the axis's own units.
 *
 * On the tile and not in a labelled row beneath the picture: the whole reason to look at a camera
 * setting is the picture next to it, and a reading you have to scroll to is a reading you compare
 * from memory.
 */
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

/** "Daylight · 5500 K" where the illuminant has a nominal temperature, the bare name where not. */
fun WhiteBalance.kelvinLabel(): String = kelvin?.let { "$label · $it K" } ?: label

/**
 * One tile of the deck: what the axis is called, and what it is set to.
 *
 * Sized by the caller (`weight`), so the row divides the width evenly and every tile is the same
 * thumb-sized target wherever it sits. [open] is the tile whose slider is showing — exactly one,
 * ever, which is the rule the stacked-slider version broke.
 */
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

/**
 * One continuous control, the shape every slider on the camera screen uses.
 *
 * Two values are kept apart here, and the version this replaces conflated them: the one under the
 * FINGER and the one the CAMERA holds. The finger drives the thumb every frame so the control feels
 * alive; the camera is told once the finger has stood still for [LIVE_APPLY_MS], and once more when
 * it lifts. Without the second, the last position of a fast drag would never be applied; without the
 * first, the picture would only move after the drag ended — and watching the picture while you drag
 * is the entire point of the screen.
 */
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
        // The reading sits ABOVE the slider and away from the tiles, because the finger dragging
        // the slider is over the bottom of the screen: a number under the thumb is a number you
        // lift your hand to read, on the one screen where the picture must not be let go of.
        DialReading(caption, reading)
        // Inset from the screen edge. A slider whose track runs to the bezel puts its end stops
        // where the palm rests and where an edge-swipe gesture lives, so the last part of the
        // travel is the part you cannot reach comfortably — on a phone that is being held over a
        // board with one hand, that is most of the time.
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

/** Snap both dragging and button nudges to meaningful camera increments. */
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
        modifier = Modifier.size(48.dp),
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

/**
 * A row of named choices, scrolled rather than wrapped.
 *
 * Wrapping was the old shape and it cost four rows of the screen for seven illuminants. One line
 * that scrolls keeps the deck a strip, which is the whole point of the rebuild.
 */
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

/**
 * A line of explanation over the viewfinder — the consequence of the control, not its name.
 *
 * It carries the same scrim `ChromeBanner` does, and for the same reason. This screen is dark in
 * BOTH themes (`Chrome = InkPalette`); over the pale letterbox of a portrait clip in the light
 * scheme, muted ink on cream was measured unreadable — `screenshots/light/02-camera.png`, bottom
 * line. A note the eye cannot find is a note that is not there.
 */
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

/** Distance from the screen edge to a slider's end stop — see the comment at its use site. */
private val SLIDER_INSET = 20.dp

private const val TILE_MIN = 56
private const val TILE_CORNER = 12
