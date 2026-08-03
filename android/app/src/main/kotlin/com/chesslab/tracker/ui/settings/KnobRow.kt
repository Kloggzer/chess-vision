package com.chesslab.tracker.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.SurfaceRaised

/**
 * One knob.
 *
 * The Python default sits beside the live value on purpose: a bare number tells nobody how far a
 * board has been tuned away from the reference the whole parity suite is built on.
 */
@Composable
fun KnobRow(
    knob: KnobUi,
    config: TrackerConfig,
    restartPending: Boolean,
    onValue: (Double) -> Unit,
    onReset: () -> Unit,
) {
    val value = knob.valueOf(config)
    Column(
        Modifier
            .fillMaxWidth()
            .background(SurfaceRaised, RoundedCornerShape(Radius.sm))
            .padding(horizontal = Space.md, vertical = Space.sm),
        verticalArrangement = Arrangement.spacedBy(Space.xs),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                text = if (knob.isDefault(config)) knob.key else "• ${knob.key}",
                style = MaterialTheme.typography.labelLarge,
                color = OnSurface,
            )
            Text(knob.format(value), style = MaterialTheme.typography.labelLarge, color = Accent)
        }
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(Space.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Chip("default ${knob.format(knob.pythonDefault)}", OnSurfaceMuted)
            if (!knob.live) Chip(if (restartPending) "restart required" else "restart to apply", Busy)
            if (!knob.isDefault(config)) {
                TextButton(onClick = onReset) {
                    Text("reset", style = MaterialTheme.typography.labelMedium, color = OnSurfaceMuted)
                }
            }
        }
        Text(knob.help, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
        if (knob.isFlag) {
            Switch(checked = value != 0.0, onCheckedChange = { onValue(if (it) 1.0 else 0.0) })
        } else {
            KnobSlider(knob, value, onValue)
        }
    }
}

/**
 * The slider's low end is one step BELOW the range for an optional knob: that position is `auto`
 * (`null` in `TrackerConfig`, i.e. Python's CNN-conditional fallback), which is a real setting and
 * not a value.
 */
@Composable
private fun KnobSlider(
    knob: KnobUi,
    value: Double,
    onValue: (Double) -> Unit,
) {
    val low = if (knob.isOptional) knob.min - knob.step else knob.min
    // No `steps`: the tick marks rendered as a dotted track that read as decoration, and with the
    // active track drawn as a separate pill the control looked like three unrelated pieces. The
    // value is snapped by `KnobUi.clamp` anyway, so the ticks bought nothing.
    Slider(
        value = (if (value.isNaN()) low else value).toFloat(),
        onValueChange = { onValue(it.toDouble()) },
        valueRange = low.toFloat()..knob.max.toFloat(),
    )
}

@Composable
fun Chip(
    text: String,
    color: Color,
) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall,
        color = color,
        modifier = Modifier.background(Color.Transparent).padding(end = Space.hair),
    )
}
