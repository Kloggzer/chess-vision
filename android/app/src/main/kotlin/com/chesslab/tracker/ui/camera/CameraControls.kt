package com.chesslab.tracker.ui.camera

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
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
    label: String,
    reading: String,
    value: Float,
    range: ClosedFloatingPointRange<Float>,
    active: Boolean,
    onValue: (Float) -> Unit,
) {
    var dragged by remember { mutableStateOf<Float?>(null) }
    val shown = dragged ?: value
    LaunchedEffect(dragged) {
        val next = dragged ?: return@LaunchedEffect
        delay(LIVE_APPLY_MS)
        onValue(next)
    }
    Column(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            Text(
                text = reading,
                style = MaterialTheme.typography.labelLarge,
                color = if (active) Accent else OnSurfaceMuted,
            )
        }
        Slider(
            value = shown.coerceIn(range.start, range.endInclusive),
            onValueChange = { dragged = it },
            onValueChangeFinished = {
                dragged?.let(onValue)
                dragged = null
            },
            valueRange = range,
        )
    }
}

/** A row of named choices. Camera apps offer modes as chips, not as a slider over a made-up scale. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun <T> CameraChoice(
    label: String,
    options: List<Pair<String, T>>,
    selected: T,
    onSelect: (T) -> Unit,
) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            options.forEach { (text, value) ->
                FilterChip(
                    selected = value == selected,
                    onClick = { onSelect(value) },
                    label = { Text(text, style = MaterialTheme.typography.labelMedium) },
                )
            }
        }
    }
}

/** The deck's section heading. */
@Composable
fun CameraDeckTitle(text: String) {
    Text(text, style = MaterialTheme.typography.titleSmall, color = OnSurface)
}
