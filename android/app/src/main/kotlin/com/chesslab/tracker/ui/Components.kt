package com.chesslab.tracker.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.chesslab.engine.api.TrackerState
import com.chesslab.tracker.R
import kotlin.math.roundToInt

private val MinTouch = 48.dp

/** State label + colour for the tracking status chip. */
@Composable
private fun statusLabel(state: TrackerState): Pair<String, Color> =
    when (state) {
        TrackerState.WAITING_BOARD -> stringResource(R.string.status_waiting) to MaterialTheme.colorScheme.tertiary
        TrackerState.TRACKING -> stringResource(R.string.status_tracking) to MaterialTheme.colorScheme.primary
        TrackerState.OCCLUDED -> stringResource(R.string.status_occluded) to MaterialTheme.colorScheme.secondary
        TrackerState.STUCK -> stringResource(R.string.status_stuck) to MaterialTheme.colorScheme.error
        TrackerState.VERIFYING -> stringResource(R.string.status_verifying) to MaterialTheme.colorScheme.tertiary
    }

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun StatusChip(
    state: TrackerState,
    modifier: Modifier = Modifier,
) {
    val (label, color) = statusLabel(state)
    AssistChip(
        onClick = {},
        enabled = false,
        label = { Text(label) },
        colors = AssistChipDefaults.assistChipColors(disabledLabelColor = color, disabledLeadingIconContentColor = color),
        modifier =
            modifier
                .heightIn(min = MinTouch)
                .semantics { contentDescription = label },
    )
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongParameterList")
@Composable
fun SettingSlider(
    label: String,
    value: Double,
    range: ClosedFloatingPointRange<Float>,
    default: Double,
    modifier: Modifier = Modifier,
    steps: Int = 0,
    onChange: (Double) -> Unit,
) {
    Column(modifier = modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(label, style = MaterialTheme.typography.bodyLarge)
            Text(
                stringResource(R.string.value_and_default, format(value), format(default)),
                style = MaterialTheme.typography.bodySmall,
            )
        }
        androidx.compose.material3.Slider(
            value = value.toFloat(),
            onValueChange = { onChange(it.toDouble()) },
            valueRange = range,
            steps = steps,
            modifier =
                Modifier
                    .fillMaxWidth()
                    .heightIn(min = MinTouch)
                    .semantics { contentDescription = label },
        )
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun SettingSwitch(
    label: String,
    checked: Boolean,
    modifier: Modifier = Modifier,
    onChange: (Boolean) -> Unit,
) {
    Row(
        modifier = modifier.fillMaxWidth().heightIn(min = MinTouch).padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.clearAndSetSemantics {})
        Switch(
            checked = checked,
            onCheckedChange = onChange,
            modifier = Modifier.semantics { contentDescription = label },
        )
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun SectionHeader(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        textAlign = TextAlign.Start,
        modifier = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 4.dp),
    )
}

private const val ROUND_SCALE = 100.0

private fun format(v: Double): String = ((v * ROUND_SCALE).roundToInt() / ROUND_SCALE).toString()
