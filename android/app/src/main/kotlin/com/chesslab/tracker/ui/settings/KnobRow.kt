package com.chesslab.tracker.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextOverflow
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.Rule
import com.chesslab.tracker.ui.TextAction
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.chesslabSwitchColors

/** A dense developer preference: human name first, technical key and tuning context second. */
@Composable
fun KnobRow(
    knob: KnobUi,
    config: TrackerConfig,
    restartPending: Boolean,
    onValue: (Double) -> Unit,
    onReset: () -> Unit,
) {
    val value = knob.valueOf(config)
    var expanded by remember(knob.key) { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth().padding(top = Space.sm), verticalArrangement = Arrangement.spacedBy(Space.xs)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(knobTitle(knob.key), style = MaterialTheme.typography.bodyLarge, color = OnSurface, modifier = Modifier.weight(1f))
            if (knob.isFlag) {
                Switch(
                    checked = value != 0.0,
                    onCheckedChange = { onValue(if (it) 1.0 else 0.0) },
                    colors = chesslabSwitchColors(),
                )
            } else {
                Figure(knobDisplayValue(knob, value), Accent)
            }
        }
        Text(
            knob.help,
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
            maxLines = if (expanded) Int.MAX_VALUE else 1,
            overflow = TextOverflow.Ellipsis,
        )
        if (!knob.isFlag) KnobSlider(knob, value, onValue)
        if (expanded) {
            Figure(knob.key, OnSurfaceMuted)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Default ${knobDisplayValue(knob, knob.pythonDefault)}" + if (!knob.live) " · applies after restart" else "",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (!knob.live) Busy else OnSurfaceMuted,
                )
                if (!knob.isDefault(config)) TextAction("Reset", onReset)
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (restartPending) {
                Text("Restart required", style = MaterialTheme.typography.labelSmall, color = Busy)
            }
            TextAction(if (expanded) "Less" else "Details", { expanded = !expanded })
        }
        Rule(Modifier.padding(top = Space.xs))
    }
}

@Composable
private fun KnobSlider(
    knob: KnobUi,
    value: Double,
    onValue: (Double) -> Unit,
) {
    val low = if (knob.isOptional) knob.min - knob.step else knob.min
    // Waehrend des Ziehens nur lokal. `onValueChange` feuert je Compose-Frame, und jeder Wert war
    // ein DataStore-Schreibvorgang UND ein `UpdateConfig` in der Aktions-Queue der Engine.
    var dragged by remember(knob.key) { mutableStateOf<Float?>(null) }
    Slider(
        modifier = Modifier.testTag(KNOB_SLIDER_TAG),
        value = dragged ?: (if (value.isNaN()) low else value).toFloat(),
        onValueChange = { dragged = it },
        onValueChangeFinished = {
            dragged?.let { onValue(it.toDouble()) }
            dragged = null
        },
        valueRange = low.toFloat()..knob.max.toFloat(),
    )
}

/** Turns implementation keys into readable labels without hiding the searchable key underneath. */
internal fun knobTitle(key: String): String {
    val words = key.replace(Regex("([a-z0-9])([A-Z])"), "$1 $2").split(' ')
    return words
        .joinToString(" ") { word ->
            when (word.lowercase()) {
                "thr" -> "threshold"
                "px" -> "pixel"
                "cnn" -> "CNN"
                "iou" -> "IoU"
                "ms" -> "milliseconds"
                "s" -> "seconds"
                else -> word.lowercase()
            }
        }.replaceFirstChar(Char::uppercase)
}

/** Formats values in the unit a person tunes, while export keeps the raw machine value. */
internal fun knobDisplayValue(
    knob: KnobUi,
    value: Double,
): String {
    val raw = knob.format(value)
    if (knob.isFlag || value.isNaN()) return raw
    return when (knob.key) {
        "motionThr" -> "$raw %"
        in BYTE_SCALE_KEYS -> "$raw / 255"
        in PERCENT_KEYS -> "${knob.format(value * PERCENT_SCALE)} %"
        "maxChanged" -> "$raw squares"
        in BOARD_SQUARE_KEYS -> "$raw / 64 squares"
        in READING_KEYS -> "$raw readings"
        "recoveryMaxPlies" -> "$raw half-moves"
        "alignEvery" -> "every $raw frames"
        else -> knobValueWithSuffix(knob.key, raw)
    }
}

private fun knobValueWithSuffix(
    key: String,
    raw: String,
): String =
    when {
        key.endsWith("Px") -> "$raw px"
        key.endsWith("Ms") -> "$raw ms"
        key.endsWith("S") -> "$raw s"
        else -> raw
    }

private const val PERCENT_SCALE = 100.0
private val BYTE_SCALE_KEYS = setOf("motionPxThr", "darkLumaThr", "censusThr", "occlCensusThr")
private val PERCENT_KEYS = setOf("motionMargin", "minGridLineCoverage", "cnnConfThr", "cnnMinAgreement")
private val BOARD_SQUARE_KEYS = setOf("minConfidentBoard", "minConfidentRecovery")
private val READING_KEYS = setOf("verifyWindow", "desyncObsN", "verifyObsVotes")

/** Wie `EVAL_WHITE_TAG`: der Regler ist sonst nicht adressierbar (`KnobSliderThrottleTest`). */
internal const val KNOB_SLIDER_TAG = "knobSlider"
