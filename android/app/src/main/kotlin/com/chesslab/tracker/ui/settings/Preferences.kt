package com.chesslab.tracker.ui.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import com.chesslab.tracker.ui.Rule
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.chesslabSwitchColors

/** The single visual grammar for an Android-style settings row. */
@Composable
fun PreferenceRow(
    title: String,
    summary: String? = null,
    value: String? = null,
    enabled: Boolean = true,
    onClick: (() -> Unit)? = null,
) {
    Column {
        val action = if (onClick == null) Modifier else Modifier.clickable(enabled = enabled, onClick = onClick)
        Row(
            action.fillMaxWidth().padding(vertical = Space.md),
            horizontalArrangement = Arrangement.spacedBy(Space.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Space.hair)) {
                Text(title, style = MaterialTheme.typography.bodyLarge, color = if (enabled) OnSurface else OnSurfaceMuted)
                summary?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted) }
            }
            value?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Accent,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.End,
                    modifier = Modifier.weight(0.4f),
                )
            }
        }
        Rule()
    }
}

/** The whole row toggles, while the trailing switch remains the familiar Android affordance. */
@Composable
fun SwitchPreference(
    title: String,
    summary: String? = null,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Column {
        Row(
            Modifier
                .fillMaxWidth()
                .toggleable(checked, role = Role.Switch, onValueChange = onCheckedChange)
                .padding(vertical = Space.md),
            horizontalArrangement = Arrangement.spacedBy(Space.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Space.hair)) {
                Text(title, style = MaterialTheme.typography.bodyLarge, color = OnSurface)
                summary?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted) }
            }
            Switch(checked = checked, onCheckedChange = null, colors = chesslabSwitchColors())
        }
        Rule()
    }
}

/** A preference whose choices belong in a radio dialog rather than a permanent wall of chips. */
@Composable
fun <T> ValuePreference(
    title: String,
    summary: String? = null,
    options: List<Pair<String, T>>,
    selected: T,
    onSelect: (T) -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    val selectedLabel = options.firstOrNull { it.second == selected }?.first.orEmpty()
    PreferenceRow(title, summary ?: selectedLabel, value = if (summary == null) null else selectedLabel, onClick = { open = true })
    if (open) {
        AlertDialog(
            onDismissRequest = { open = false },
            title = { Text(title) },
            text = {
                Column {
                    options.forEach { (label, option) ->
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clickable {
                                    onSelect(option)
                                    open = false
                                }.padding(vertical = Space.sm),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            RadioButton(selected = option == selected, onClick = null)
                            Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(start = Space.sm))
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { open = false }) { Text("Cancel") } },
        )
    }
}

/** Continuous values stay inline, but use a compact preference row instead of a containing card. */
@Composable
fun SliderPreference(
    title: String,
    summary: String? = null,
    value: String,
    position: Float,
    range: ClosedFloatingPointRange<Float>,
    onChange: (Float) -> Unit,
) {
    Column(Modifier.fillMaxWidth().padding(top = Space.md), verticalArrangement = Arrangement.spacedBy(Space.xs)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Space.hair)) {
                Text(title, style = MaterialTheme.typography.bodyLarge, color = OnSurface)
                summary?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted) }
            }
            Text(value, style = MaterialTheme.typography.bodyMedium, color = Accent)
        }
        Slider(value = position, onValueChange = onChange, valueRange = range)
        Rule()
    }
}
