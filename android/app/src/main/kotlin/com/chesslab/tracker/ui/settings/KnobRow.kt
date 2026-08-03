package com.chesslab.tracker.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.ui.Card
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.TextAction
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.chesslabSwitchColors

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
    Card {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                text = if (knob.isDefault(config)) knob.key else "• ${knob.key}",
                style = MaterialTheme.typography.labelLarge,
                color = OnSurface,
            )
            // A figure, and the whole point of a knob list is comparing them down the column.
            Figure(knob.format(value), Accent)
        }
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(Space.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Note("default ${knob.format(knob.pythonDefault)}", OnSurfaceMuted)
            if (!knob.live) Note(if (restartPending) "restart required" else "restart to apply", Busy)
            if (!knob.isDefault(config)) TextAction("reset", onReset)
        }
        Text(knob.help, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
        if (knob.isFlag) {
            Switch(
                checked = value != 0.0,
                onCheckedChange = { onValue(if (it) 1.0 else 0.0) },
                colors = chesslabSwitchColors(),
            )
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

/** A word beside the value, not a [com.chesslab.tracker.ui.ChesslabChip] — nothing here is tappable. */
@Composable
private fun Note(
    text: String,
    color: Color,
) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall,
        color = color,
        modifier = Modifier.padding(end = Space.hair),
    )
}
