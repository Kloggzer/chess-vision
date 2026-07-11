package com.chesslab.tracker.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chesslab.engine.api.TrackerState
import com.chesslab.tracker.R
import com.chesslab.tracker.ui.theme.BoardPalette
import kotlin.math.roundToInt

private val MinTouch = 48.dp

/**
 * Semantic status tone — a pure (non-Compose) mapping from tracker state to the colour
 * role used by [StatusPill]. Extracted so the mapping is unit-testable without a Compose
 * test harness (this module has no `ui-test-junit4` dependency).
 */
enum class StatusTone { INFO, LIVE, WARN, ERROR }

/** Tracker state → semantic tone. WAITING/VERIFYING→info, TRACKING→live, OCCLUDED→warn, STUCK→error. */
fun statusToneFor(state: TrackerState): StatusTone =
    when (state) {
        TrackerState.WAITING_BOARD -> StatusTone.INFO
        TrackerState.VERIFYING -> StatusTone.INFO
        TrackerState.TRACKING -> StatusTone.LIVE
        TrackerState.OCCLUDED -> StatusTone.WARN
        TrackerState.STUCK -> StatusTone.ERROR
    }

/** Colour token for a [StatusTone], from the brand [MaterialTheme.colorScheme]. */
@Composable
private fun statusColor(tone: StatusTone): Color =
    when (tone) {
        StatusTone.INFO -> MaterialTheme.colorScheme.secondary
        StatusTone.LIVE -> MaterialTheme.colorScheme.primary
        StatusTone.WARN -> MaterialTheme.colorScheme.tertiary
        StatusTone.ERROR -> MaterialTheme.colorScheme.error
    }

/** Localized label for a tracker state. */
@Composable
private fun statusLabel(state: TrackerState): String =
    when (state) {
        TrackerState.WAITING_BOARD -> stringResource(R.string.status_waiting)
        TrackerState.TRACKING -> stringResource(R.string.status_tracking)
        TrackerState.OCCLUDED -> stringResource(R.string.status_occluded)
        TrackerState.STUCK -> stringResource(R.string.status_stuck)
        TrackerState.VERIFYING -> stringResource(R.string.status_verifying)
    }

private const val PULSE_ALPHA_MIN = 0.3f
private const val PULSE_PERIOD_MS = 750
private const val DOT_SIZE_DP = 9
private const val PILL_BG_ALPHA = 0.14f

/**
 * Status pill — a coloured dot + label. Colour from [statusToneFor]; the dot pulses for
 * TRACKING and STUCK (live/alarm). Keeps the `contentDescription = label` and ≥48 dp
 * semantics the former `StatusChip` carried.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun StatusPill(
    state: TrackerState,
    modifier: Modifier = Modifier,
) {
    val label = statusLabel(state)
    val tone = statusToneFor(state)
    val color = statusColor(tone)
    val pulses = tone == StatusTone.LIVE || tone == StatusTone.ERROR

    val transition = rememberInfiniteTransition(label = "status-pulse")
    val pulseAlpha =
        transition
            .animateFloat(
                initialValue = 1f,
                targetValue = PULSE_ALPHA_MIN,
                animationSpec = infiniteRepeatable(animation = tween(PULSE_PERIOD_MS), repeatMode = RepeatMode.Reverse),
                label = "status-dot-alpha",
            ).value
    val dotAlpha = if (pulses) pulseAlpha else 1f

    Row(
        modifier =
            modifier
                .heightIn(min = MinTouch)
                .clip(MaterialTheme.shapes.small)
                .background(color.copy(alpha = PILL_BG_ALPHA))
                .padding(horizontal = 12.dp, vertical = 8.dp)
                .semantics { contentDescription = label },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(
            modifier =
                Modifier
                    .size(DOT_SIZE_DP.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = dotAlpha)),
        )
        Text(label, style = MaterialTheme.typography.labelLarge, color = color)
    }
}

/** Thin delegate kept for one commit so existing call sites build; phase 02 removes it. */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun StatusChip(
    state: TrackerState,
    modifier: Modifier = Modifier,
) {
    StatusPill(state = state, modifier = modifier)
}

/** Filled primary action button (emerald). ≥48 dp. */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun PrimaryButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable RowScope.() -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = MinTouch),
        content = content,
    )
}

/** Outlined (ghost) button. ≥48 dp. */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun GhostButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable RowScope.() -> Unit,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = MinTouch),
        content = content,
    )
}

/** Low-emphasis text button. ≥48 dp. */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun QuietButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable RowScope.() -> Unit,
) {
    TextButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = MinTouch),
        content = content,
    )
}

/** Error-tinted destructive button. ≥48 dp. */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun DangerButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable RowScope.() -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        colors =
            ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.error,
                contentColor = MaterialTheme.colorScheme.onError,
            ),
        modifier = modifier.heightIn(min = MinTouch),
        content = content,
    )
}

/**
 * Mono key–value readout row — label on the left (muted), value on the right in monospace
 * with tabular-figures (`tnum`) so numbers line up. [highlight] tints the value emerald.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun KeyValueRow(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    highlight: Boolean = false,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            value,
            style = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = "tnum"),
            fontFamily = FontFamily.Monospace,
            color = if (highlight) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
        )
    }
}

private const val SUBTAB_ON_ALPHA = 0.18f

/**
 * Segmented control — a pill group where the selected segment sits on an elevated
 * (`surfaceVariant`) background. The board-view primary switch (`Rendered | Video`,
 * phase 02). Each segment carries a `contentDescription` and a ≥48 dp target.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun SegmentedToggle(
    options: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier =
            modifier
                .clip(MaterialTheme.shapes.small)
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, MaterialTheme.colorScheme.outline, MaterialTheme.shapes.small)
                .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        options.forEachIndexed { index, option ->
            val selected = index == selectedIndex
            Box(
                modifier =
                    Modifier
                        .weight(1f)
                        .heightIn(min = MinTouch)
                        .clip(MaterialTheme.shapes.small)
                        .background(if (selected) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent)
                        .selectable(selected = selected, role = Role.Tab, onClick = { onSelect(index) })
                        .semantics { contentDescription = option }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    option,
                    style = MaterialTheme.typography.labelLarge,
                    color = if (selected) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
        }
    }
}

/**
 * Sub-tab chip row — the debug views under Video (phase 02). Mono labels, outlined when
 * off and filled-accent when on; [accentFor] tints an individual tab (e.g. Diff→magenta).
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun SubTabRow(
    labels: List<String>,
    selected: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
    accentFor: @Composable (Int) -> Color = { MaterialTheme.colorScheme.primary },
) {
    Row(
        modifier = modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        labels.forEachIndexed { index, label ->
            val on = index == selected
            val accent = accentFor(index)
            Box(
                modifier =
                    Modifier
                        .heightIn(min = MinTouch)
                        .clip(MaterialTheme.shapes.small)
                        .background(if (on) accent.copy(alpha = SUBTAB_ON_ALPHA) else Color.Transparent)
                        .border(1.dp, if (on) accent else MaterialTheme.colorScheme.outline, MaterialTheme.shapes.small)
                        .selectable(selected = on, role = Role.Tab, onClick = { onSelect(index) })
                        .semantics { contentDescription = label }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    label,
                    style = MaterialTheme.typography.labelLarge,
                    fontFamily = FontFamily.Monospace,
                    color = if (on) accent else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
        }
    }
}

/**
 * Board frame container — a rounded 12 dp [Box] with a warm-wood gradient border for the
 * rendered board (or a cool border when [video]). Phases 02/03 place the board/camera and
 * its floating overlays inside; it is a [Box] so overlays can absolutely-position.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun BoardFrame(
    modifier: Modifier = Modifier,
    video: Boolean = false,
    content: @Composable BoxScope.() -> Unit,
) {
    val borderBrush =
        if (video) {
            Brush.linearGradient(listOf(BoardPalette.MarkShadow, MaterialTheme.colorScheme.secondary))
        } else {
            Brush.linearGradient(listOf(BoardPalette.LightSquare, BoardPalette.DarkSquare))
        }
    Box(
        modifier =
            modifier
                .clip(MaterialTheme.shapes.medium)
                .border(2.dp, borderBrush, MaterialTheme.shapes.medium)
                .padding(3.dp),
        content = content,
    )
}

/** Shared card container for a settings row — themed `surface` background, hairline border. */
@Composable
private fun Modifier.settingCard(): Modifier =
    this
        .fillMaxWidth()
        .padding(vertical = 4.dp)
        .clip(MaterialTheme.shapes.medium)

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
    // Drag-local state: committing every tick through DataStore made the thumb
    // rubber-band against the async settings round-trip (unusable next to the 5fps
    // calibration preview). Track the drag locally, commit ONCE on release; the
    // remember(value) key resets the local state when the persisted value arrives.
    var dragValue by remember(value) { mutableStateOf<Float?>(null) }
    val shown = dragValue?.toDouble() ?: value
    Column(
        modifier =
            modifier
                .settingCard()
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, MaterialTheme.colorScheme.outline, MaterialTheme.shapes.medium)
                .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(label, style = MaterialTheme.typography.bodyLarge)
            Text(
                stringResource(R.string.value_and_default, format(shown), format(default)),
                style = MaterialTheme.typography.bodySmall,
                fontFamily = FontFamily.Monospace,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        androidx.compose.material3.Slider(
            value = dragValue ?: value.toFloat(),
            onValueChange = { dragValue = it },
            onValueChangeFinished = { dragValue?.let { onChange(it.toDouble()) } },
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
        modifier =
            modifier
                .settingCard()
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, MaterialTheme.colorScheme.outline, MaterialTheme.shapes.medium)
                .heightIn(min = MinTouch)
                .padding(horizontal = 14.dp, vertical = 10.dp),
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

private const val SECTION_HEADER_LETTER_SPACING_SP = 1.4f

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun SectionHeader(text: String) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.titleSmall.copy(letterSpacing = SECTION_HEADER_LETTER_SPACING_SP.sp),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Start,
        modifier = Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 6.dp),
    )
}

private const val ROUND_SCALE = 100.0

private fun format(v: Double): String = ((v * ROUND_SCALE).roundToInt() / ROUND_SCALE).toString()
